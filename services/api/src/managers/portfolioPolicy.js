// Import only the reviewed metadata phase. Financial postings remain unsupported.
export class PortfolioValidationError extends Error {}
const fail = () => {
  throw new PortfolioValidationError('Invalid reviewed portfolio batch');
};
function text(value, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail();
  return value.trim();
}
function id(value) {
  if (typeof value !== 'string' || !/^[A-Z0-9][A-Z0-9_-]{0,79}$/.test(value))
    fail();
  return value;
}
function date(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail();
  const parsed = new Date(value + 'T00:00:00Z');
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    fail();
  return value;
}
function positiveCents(value) {
  if (!Number.isSafeInteger(value) || value <= 0) fail();
  return value;
}
function empty(value) {
  if (!Array.isArray(value) || value.length) fail();
}
function missing(record, keys) {
  for (const key of keys) if (record[key] !== null) fail();
}
function sourceIds(values) {
  if (!Array.isArray(values) || values.length > 30) fail();
  return values.map(id);
}
function list(value, maximum = 100) {
  if (!Array.isArray(value) || value.length > maximum) fail();
  return value;
}
export function normalizePortfolio(batch) {
  if (!batch || batch.schema_version !== 1) fail();
  empty(batch.new_charges);
  empty(batch.payment_postings);
  empty(batch.notices);
  const assets = list(batch.assets).map((a) => {
    if (!['rental', 'seller_finance_collateral'].includes(a.category)) fail();
    if (a.automatic_charges !== false) fail();
    missing(a, [
      'monthly_rent',
      'asking_rent',
      'current_tenant',
      'purchase_price',
      'purchase_date',
      'bedrooms',
      'bathrooms',
      'area_sqft',
      'year_built'
    ]);
    if (
      a.category === 'rental' &&
      !['occupied', 'vacant_marketing_for_rent'].includes(a.occupancy)
    )
      fail();
    if (a.category !== 'rental' && a.occupancy !== 'not_a_rental') fail();
    const address = a.address || {};
    return {
      id: id(a.id),
      name: text(a.name),
      category: a.category,
      occupancy: a.occupancy,
      address: {
        street1: text(address.street1),
        city: text(address.city),
        state: text(address.state, 32),
        zipCode: text(address.zipCode, 16),
        country: text(address.country, 3)
      },
      current_tenant: null,
      monthly_rent: null,
      asking_rent: null,
      automatic_charges: false,
      missing_evidence: list(a.missing_evidence || [], 20).map((v) => text(v)),
      source_evidence: list(a.source_evidence || [], 30).map((s) => ({
        ...(s.id ? { id: id(s.id) } : {}),
        ...(s.path ? { source_name: text(s.path.split('/').pop()) } : {}),
        ...(s.sheet ? { sheet: text(s.sheet) } : {}),
        ...(Number.isSafeInteger(s.row) && s.row > 0 ? { row: s.row } : {})
      }))
    };
  });
  const ids = assets.map((a) => a.id);
  if (new Set(ids).size !== ids.length) fail();
  const notes = list(batch.notes).map((n) => {
    if (n.status !== 'active_terms_confirmed_ledger_unreconciled') fail();
    if (n.automated_fees !== false || n.sending_enabled !== false) fail();
    missing(n, [
      'outstanding_principal_cents',
      'accrued_interest_cents',
      'past_due_cents',
      'paid_through',
      'maturity_date'
    ]);
    empty(n.posted_payments);
    if (
      typeof n.annual_rate !== 'string' ||
      !/^(0(?:\.\d{1,8})?|1(?:\.0{1,8})?)$/.test(n.annual_rate)
    )
      fail();
    if (
      !assets.some(
        (a) =>
          a.id === n.collateral_id && a.category === 'seller_finance_collateral'
      )
    )
      fail();
    if (
      ![
        'owner_confirmed',
        'document_candidate_needs_execution_evidence'
      ].includes(n.first_due_status)
    )
      fail();
    if (n.first_due_status !== 'owner_confirmed' && n.first_due_date !== null)
      fail();
    return {
      id: id(n.id),
      collateral_id: id(n.collateral_id),
      status: n.status,
      borrower_name: text(n.borrower_name),
      original_principal_cents: positiveCents(n.original_principal_cents),
      annual_rate: n.annual_rate,
      monthly_payment_cents: positiveCents(n.monthly_payment_cents),
      first_due_date: date(n.first_due_date),
      first_due_status: n.first_due_status,
      maturity_date: null,
      source_maturity_candidate: date(n.source_maturity_candidate ?? null),
      source_first_due_candidate: date(n.source_first_due_candidate ?? null),
      outstanding_principal_cents: null,
      accrued_interest_cents: null,
      past_due_cents: null,
      paid_through: null,
      posted_payments: [],
      automated_fees: false,
      sending_enabled: false,
      source_ids: sourceIds(n.source_ids)
    };
  });
  const cases = list(batch.reconciliation_cases).map((c) => {
    if (
      c.type !== 'loan_reconciliation' ||
      c.status !== 'unresolved_terms' ||
      c.sending_enabled !== false
    )
      fail();
    missing(c, ['borrower_name', 'principal_cents', 'monthly_payment_cents']);
    return {
      id: id(c.id),
      title: text(c.title || 'Loan reconciliation'),
      type: c.type,
      status: c.status,
      borrower_name: null,
      principal_cents: null,
      monthly_payment_cents: null,
      source_ids: sourceIds(c.source_ids),
      sending_enabled: false
    };
  });
  const allIds = [...ids, ...notes.map((n) => n.id), ...cases.map((c) => c.id)];
  if (new Set(allIds).size !== allIds.length) fail();
  const excluded = sourceIds(batch.excluded || []);
  const held = sourceIds(batch.held || []);
  if ([...excluded, ...held].some((v) => allIds.includes(v))) fail();
  return {
    schema_version: 1,
    as_of: date(batch.as_of),
    assets,
    notes,
    reconciliation_cases: cases,
    excluded,
    held,
    historical_references: list(batch.historical_references || [], 100).map(
      (v) => text(v)
    ),
    new_charges: [],
    payment_postings: [],
    notices: []
  };
}
