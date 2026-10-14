# Implementation sequence

Status: phased implementation started. Private rental staging, API read-only controls, six MCP read tools and the approved basic portfolio import are verified; see [runtime-status.md](runtime-status.md). Production hardening, financial migration, write/approval workflows and seller-finance servicing remain open.

## 1. Harden and prove the rental baseline

- Meet the owner's local-database and simple-Docker deployment requirement. Resolve and document literal single-container packaging versus a single Compose project before implementation; do not imply that upstream already supplies an all-in-one image. Persist data independently of container recreation.

- Retain the MIT source revision and copyright notice. Build app images from fork source with commit/digest provenance; never pull current upstream app images as `latest`.
- Upgrade unsupported runtime/dependencies after reviewing and testing license-compatible changes. Scan container and application dependencies; fix or explicitly disposition material findings before real data.
- Add a dedicated local/staging environment, generated secrets, disabled mail transport, closed registration after authorized provisioning, limited network bindings, health checks and tested backups.
- Verify USD, America/Chicago dates, property/tenant/lease creation, rent scheduling, partial payment, receipt generation, arrears display and organization boundaries using synthetic fixtures.
- Acceptance: end-to-end synthetic rental workflow passes; no unauthenticated or cross-organization record access; a clean backup restores to a separate test instance; existing CG services remain healthy.

## 2. Implement API scopes and MCP

- Introduce server-side read, draft, servicing-write and delivery scopes. Separate READ and ACT principals and secrets.
- Implement the tool contracts in [architecture.md](architecture.md), starting with read tools and internal followup/draft operations.
- Add idempotency, expected-version checks and append-only audit events for permitted writes. Archive records instead of exposing destructive delete tools.
- Acceptance: a READ credential fails on every existing write route, including `/emails` and rent-payment patches; another organization's header/record IDs fail; retries do not duplicate acts; synthetic MCP calls read and create a permitted internal followup end to end.

## 3. Implement seller-finance servicing

- Add note, schedule, servicing-event, escrow, draft and followup models; dedicated API endpoints; and a focused owner UI.
- Implement contract-specific schedules and allocation with exact-money arithmetic. Add statement, delinquency and draft payoff views.
- Use a verified opening position and imported history, never a guessed balance. Preserve reversals and modified schedule versions.
- Acceptance: independently calculated fixtures cover zero-interest, fixed-rate amortization, interest-only, balloon, partial and extra payments, unapplied cash, reversals, backdating, rounding, month-end and leap-year dates. Duplicate imports cannot double-post. Ledger and statements agree after recomputation. An authorized reviewer reconciles sample notes before live servicing.

## 4. Add followup and notice control

- Add a deterministic due/arrears scan, followup ownership, escalation and owner review queue.
- Render notices from versioned, approved templates and evidence-backed ledger positions.
- Bind approvals to recipients, exact rendered content and ledger version; recheck receipts before send. Add dispatch idempotency and delivery evidence.
- Acceptance: no unapproved send occurs; a new payment invalidates a stale approval; uncertain payment state suppresses the demand; retries do not duplicate delivery; failures remain assigned until resolved.

## 5. Connect 3nity data and reconcile

The separate Google account connection remains deferred. Owner-provided local files were reviewed on October 13; the owner authorized the basic-record batch and it was imported on October 14. Financial reconciliation and document migration remain open. Do not use the historical folder found in CG's Drive.

- Connect the correct account or accept an owner-provided export into restricted storage outside this repository.
- Inventory executed leases/notes, amendments, tenant/borrower contacts, property/collateral records and payment evidence. Maintain source IDs, hashes and dates.
- Stage proposed records with `CONFIRMED`, `INFERRED` and `GAP` status and show a complete import/reconciliation preview.
- Verify the accounting company and establish balances at an explicit cutoff date. Only approved, reconciled records enter active collection workflows.
- Acceptance: source-to-record links are complete; the owner signs off each opening position; totals match the approved source; no sensitive documents or identifiers enter Git; one representative rental and note pass a supervised full workflow before wider rollout.

## Operational owner

Assign an authorized 3nity operator and a scoped agent for routine monitoring. Use the CG VPS as hosting infrastructure only. No CG finance or operations agent inherits 3nity permissions by being on the same machine. Each exception needs a named owner, next action and due date. External notices, changes to legal/financial terms, and spending remain owner-controlled.
