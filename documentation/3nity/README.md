# 3nity Ventures development fork

This folder defines the rental-management and seller-finance servicing extension to MicroRealEstate. [Runtime status](runtime-status.md) records the installed private rental staging and read-only MCP. The loan and notice specifications remain future work. No tenant, borrower, bank, contract, or payment data belongs in this public repository.

## Current state

- Base: MicroRealEstate `master`, commit `479d0ad703436071b64dfdf4e48321c121d8efb5`, December 9, 2025.
- License: MIT at that exact commit; the original `LICENSE` is retained.
- Fork was initially reset to this MIT commit. `main` now contains the rental/MCP foundation from merged PR #1 (`063ff76ff5f6e010f22145a085d4088cdf189abe`).
- Newer upstream `main` uses the Sustainable Use License and must not be merged into this fork without a separate licensing decision.
- GitHub Actions are disabled until inherited workflows have been reviewed.
- Development now includes a private Compose deployment, runtime/dependency compatibility fixes, API read-only enforcement, a stdio MCP adapter, bootstrap and acceptance checks. PR #1 was merged by the repository account on October 13; browser-access follow-up work is on the feature branch in a separate review.

## Documents

- [Selection and tradeoffs](selection.md)
- [MCP, servicing, and collection workflows](architecture.md)
- [Implementation sequence and acceptance criteria](implementation.md)
- [VPS deployment plan](deployment.md)

## Ownership of records

3nity is a separate legal and operating context. Sharing a host with CG does not grant CG agents access to 3nity. Use a dedicated database, network, service credentials, backups, and restricted document store. The source documents live in a separate Google account; connection and migration are deferred at the owner's request. Historical copies in another company's Drive must not seed production.

QuickBooks remains the accounting source during migration. Verify the connected company's identity and reconcile posted payments before deriving delinquency. Open invoices alone do not establish an unpaid obligation. Choose one system to issue each recurring charge before enabling billing, so the new app does not duplicate QuickBooks invoices.

## Development starting point

The repository contains the upstream code and developer instructions at the pinned MIT revision. Its Dockerfiles and dependencies require security and compatibility review before production. Build from this source, rather than using upstream `latest` container images. See [deployment.md](deployment.md) before running any installer or Compose stack on a shared host.
