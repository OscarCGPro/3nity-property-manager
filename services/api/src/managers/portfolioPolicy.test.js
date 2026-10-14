import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePortfolio } from './portfolioPolicy.js';

function fixture() {
  return {
    schema_version: 1,
    as_of: '2026-10-14',
    new_charges: [],
    payment_postings: [],
    notices: [],
    assets: [
      {
        id: 'SYNTHETIC-COLLATERAL',
        name: 'Fictional collateral',
        category: 'seller_finance_collateral',
        occupancy: 'not_a_rental',
        address: {
          street1: '123 Example Street',
          city: 'Example',
          state: 'TX',
          zipCode: '00000',
          country: 'US'
        },
        automatic_charges: false,
        monthly_rent: null,
        asking_rent: null,
        current_tenant: null,
        purchase_price: null,
        purchase_date: null,
        bedrooms: null,
        bathrooms: null,
        area_sqft: null,
        year_built: null
      }
    ],
    notes: [
      {
        id: 'SYNTHETIC-NOTE',
        collateral_id: 'SYNTHETIC-COLLATERAL',
        borrower_name: 'Fictional Borrower',
        status: 'active_terms_confirmed_ledger_unreconciled',
        original_principal_cents: 100000,
        annual_rate: '0.10',
        monthly_payment_cents: 10000,
        first_due_date: null,
        first_due_status: 'document_candidate_needs_execution_evidence',
        maturity_date: null,
        outstanding_principal_cents: null,
        accrued_interest_cents: null,
        past_due_cents: null,
        paid_through: null,
        posted_payments: [],
        automated_fees: false,
        sending_enabled: false,
        source_ids: []
      }
    ],
    reconciliation_cases: []
  };
}
test('unknown balances remain null, cents and rates exact; hidden extra fields are not stored', () => {
  const b = fixture();
  b.notes[0].bankPassword = 'synthetic-not-a-secret';
  const n = normalizePortfolio(b).notes[0];
  assert.equal(n.outstanding_principal_cents, null);
  assert.equal(n.monthly_payment_cents, 10000);
  assert.equal(n.annual_rate, '0.10');
  assert.equal(n.bankPassword, undefined);
});
test('rejects any posting, guessed balance, fee automation or fractional cents', () => {
  for (const mutate of [
    (b) => b.new_charges.push({}),
    (b) => (b.notes[0].outstanding_principal_cents = 0),
    (b) => (b.notes[0].automated_fees = true),
    (b) => (b.notes[0].monthly_payment_cents = 100.5)
  ]) {
    const b = fixture();
    mutate(b);
    assert.throws(() => normalizePortfolio(b));
  }
});
test('rejects duplicate IDs, wrong collateral and unconfirmed first due dates', () => {
  for (const mutate of [
    (b) => b.assets.push(b.assets[0]),
    (b) => (b.notes[0].collateral_id = 'OTHER'),
    (b) => (b.notes[0].first_due_date = '2026-02-01')
  ]) {
    const b = fixture();
    mutate(b);
    assert.throws(() => normalizePortfolio(b));
  }
});
test('retains occupied-with-missing-lease state without a tenant or zero rent', () => {
  const b = fixture();
  b.notes = [];
  b.assets[0].category = 'rental';
  b.assets[0].occupancy = 'occupied';
  const a = normalizePortfolio(b).assets[0];
  assert.equal(a.occupancy, 'occupied');
  assert.equal(a.current_tenant, null);
  assert.equal(a.monthly_rent, null);
});
