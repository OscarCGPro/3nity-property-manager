# Reviewed portfolio import

Oscar authorized loading the reviewed basic-record batch on October 14, 2026. This phase stores asset/current-state metadata, confirmed note headers and reconciliation cases. It does not implement payment servicing, calculate outstanding balances or generate charges/notices.

`GET /api/v2/portfolio` reads the selected organization's imported portfolio. `POST /api/v2/portfolio/import` requires a human organization administrator, approval evidence and a reviewed source-file digest. Machine readers are denied writes by the common policy and the controller. All lookups and derived rental properties are scoped to the live authenticated organization.

An organization has one immutable approved import document. Repeating the same normalized batch/source digest returns the same import. A changed batch returns HTTP 409; it never overwrites approved history. If projection fails, the import stays `importing`; retry resumes missing rental projections using insert-only updates. Once ready, retry does not recreate records an operator later removes or overwrite edited properties.

Only rental assets create standard rental property records. Note collateral stays outside the rental ledger. An explicit occupancy override represents occupied properties with missing lease evidence without creating a tenant. Missing rent remains null and displays as "Rent not set". No former tenant or borrower is installed as a current tenant.

The importer accepts only this metadata phase: exact integer-cent note principal/payments, decimal rate strings, explicit null opening balances and empty charge/payment/notice arrays. Automation must remain disabled. Unconfirmed dates are retained as document candidates, not active maturity or first-due dates. It discards unknown fields and private local source paths. Excluded/held IDs cannot become live assets or notes in the batch.

The Portfolio menu displays rentals, note headers and reconciliation cases separately. `get_portfolio` is the sixth private MCP read tool. It exposes metadata, not a financial ledger or document-download route. The scoped reader must not use unknown balances or worksheet Paid-on annotations to infer delinquency.

Run `node --test services/api/src/managers/portfolioPolicy.test.js integrations/mcp/client.test.mjs` for the metadata/security checks. Before live import: back up the dedicated database, verify the private batch hash and operator organization, import through the API, read back exact fields, check idempotency/reader denial and verify that tenant, charge, document and email collections remain unchanged. Keep receipts and source records outside public Git and outside unrelated company brains.

The broader dependency/operational hardening and full servicing engine remain open. Current import is an owner-authorized private staging dataset, not permission for public exposure or automated billing.
