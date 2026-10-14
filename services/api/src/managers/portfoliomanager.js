import { Collections, ServiceError } from '@microrealestate/common';
import { createHash } from 'node:crypto';
import {
  normalizePortfolio,
  PortfolioValidationError
} from './portfolioPolicy.js';

const db = Collections.Property.db;
const Portfolio = db.model(
  'PortfolioImport',
  new db.base.Schema(
    {
      realmId: { type: String, required: true, unique: true },
      digest: { type: String, required: true },
      sourceSha256: { type: String, required: true },
      state: { type: String, enum: ['importing', 'ready'], required: true },
      batch: { type: db.base.Schema.Types.Mixed, required: true },
      approval: { type: db.base.Schema.Types.Mixed, required: true },
      actorEmail: { type: String, required: true },
      completedAt: Date
    },
    { timestamps: true }
  )
);

export async function all(req, res) {
  const document = await Portfolio.findOne({ realmId: req.realm._id }).lean();
  if (!document)
    return res.json({
      state: 'empty',
      assets: [],
      notes: [],
      reconciliation_cases: []
    });
  const properties = await Collections.Property.find({
    realmId: req.realm._id,
    portfolioSourceId: { $exists: true }
  }).lean();
  const links = new Map(
    properties.map((p) => [p.portfolioSourceId, String(p._id)])
  );
  return res.json({
    ...document.batch,
    state: document.state,
    importedAt: document.completedAt,
    assets: document.batch.assets.map((a) => ({
      ...a,
      rental_property_id: links.get(a.id) || null
    }))
  });
}

export async function importReviewed(req, res) {
  // A live human organization administrator is required; no machine key may import.
  if (req.user.type !== 'user' || req.user.role !== 'administrator')
    return res.sendStatus(403);
  let batch;
  try {
    batch = normalizePortfolio(req.body.batch);
  } catch (error) {
    if (error instanceof PortfolioValidationError)
      throw new ServiceError(error.message, 422);
    throw error;
  }
  const approval = req.body.approval;
  if (
    !approval ||
    typeof approval.owner !== 'string' ||
    !approval.owner.trim() ||
    approval.owner.length > 120 ||
    typeof approval.evidence !== 'string' ||
    !approval.evidence.trim() ||
    approval.evidence.length > 1000 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(approval.date) ||
    !/^[a-f0-9]{64}$/.test(req.body.sourceSha256 || '')
  )
    throw new ServiceError('Import approval evidence required', 422);
  const digest = createHash('sha256')
    .update(JSON.stringify(batch))
    .digest('hex');
  await Portfolio.init();
  // One immutable approved batch per organization. Retrying can resume projections,
  // but neither the approved batch nor existing operator-edited properties is overwritten.
  let document;
  try {
    document = await Portfolio.findOneAndUpdate(
      { realmId: req.realm._id },
      {
        $setOnInsert: {
          realmId: req.realm._id,
          digest,
          sourceSha256: req.body.sourceSha256,
          state: 'importing',
          batch,
          approval: {
            owner: approval.owner.trim(),
            date: approval.date,
            evidence: approval.evidence.trim()
          },
          actorEmail: req.user.email
        }
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    document = await Portfolio.findOne({ realmId: req.realm._id });
  }
  if (
    document.digest !== digest ||
    document.sourceSha256 !== req.body.sourceSha256
  )
    throw new ServiceError(
      'An approved batch already exists; reconcile changes separately',
      409
    );
  if (document.state !== 'ready')
    for (const asset of batch.assets.filter((a) => a.category === 'rental')) {
      await Collections.Property.findOneAndUpdate(
        { realmId: req.realm._id, portfolioSourceId: asset.id },
        {
          $setOnInsert: {
            realmId: req.realm._id,
            portfolioSourceId: asset.id,
            type: 'house',
            name: asset.name,
            address: asset.address,
            price: null,
            occupancyOverride:
              asset.occupancy === 'occupied' ? 'occupied' : 'vacant',
            description:
              asset.occupancy === 'occupied'
                ? 'Occupied; current lease details pending.'
                : 'Vacant; being marketed for rent.'
          }
        },
        { upsert: true, new: true }
      );
    }
  if (document.state !== 'ready') {
    document.state = 'ready';
    document.completedAt = new Date();
    await document.save();
  }
  return res.json({
    state: 'ready',
    digest,
    assets: batch.assets.length,
    notes: batch.notes.length,
    reconciliation_cases: batch.reconciliation_cases.length,
    charges: 0,
    payments: 0,
    notices: 0
  });
}
