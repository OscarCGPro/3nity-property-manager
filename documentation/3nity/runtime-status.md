# Private staging status

Verified October 13, 2026. This is an internal test installation, not live loan servicing. No real tenant, borrower, property or payment history was imported.

## Implemented

- One Docker Compose project with source-built backend and landlord/tenant images, local authenticated MongoDB, password-protected Redis and persistent document/template/upload volumes. Databases have no published host ports. The gateway alone publishes to host loopback. Tailscale Serve proxies the browser interface privately; SSH remains the administration/MCP transport.
- Configurable browser origin and matching cookie scope; the installed link uses the VPS Tailscale DNS name; USD, English (`en`, the supported UI locale) and America/Chicago operating timezone.
- Closed public registration, host-generated operator credentials and a dedicated machine `read_only` principal. Secrets stay outside Git and are not printed in chat.
- Five private stdio MCP tools: properties, tenants, leases, monthly rents and dashboard. The backend rejects reader mutation and sensitive configuration/document routes. The adapter verifies the configured organization, bounds responses and refreshes expired access tokens.
- Node 22 runtime; Next 14.2.35 and selected dependency patches; separate application/plugin TypeScript versions; bounded build memory. The Next standalone runtime disables experimental require-module behavior to match its traced dependency files.
- Production mode now respects `ALLOW_SENDING_EMAILS=false`; the previous upstream code enabled sending solely because it was in production. Staging has no delivery credentials and the mailer stays on the isolated network.

## Verification

- All ten application/data containers healthy; gateway and landlord health endpoints respond successfully.
- Direct Tailscale DNS link opened the sign-in page in the Mac browser. Requests from the Mac verified operator sign-in, matching refresh-cookie domain, session renewal, primary property reads, closed registration and reader mutation denial after changing the origin. Browser form submission on this hostname was not separately automated; existing browser login verification below was performed on the earlier localhost origin.
- Browser operator login, correct organization/route, dashboard, property listing and opening the property editor verified. The primary organization has no property records. Synthetic API fixtures are isolated in a clearly named acceptance organization.
- Seven focused policy/client tests pass: write/configuration denial, enumerated reads, disabled mail in production, organization mismatch, fixed paths, token retry and response bounds.
- Live API acceptance: operator creates/reads a synthetic property, unauthenticated access fails, registration is closed, reader writes/configuration fail, foreign organization reads fail, and the primary data remains unchanged.
- MCP initialize/list/call over SSH passed for all five tools. No agent fleet configuration was changed.
- Mongo recreation preserved the complete staging document snapshot. A gzip backup restored with the same snapshot into a separate network-isolated Mongo container. Verification containers were removed; dated backups were retained. This checks Mongo backup only, not a full document-volume disaster recovery procedure.
- A network-isolated Chromium probe rendered a synthetic Letter-size PDF. Full lease/receipt/legal-template flows remain unverified.

## Remaining work

This fork is not production hardened. The legacy dependency inventory contains advisory candidates requiring version/reachability review, including historical/development entries. The old Yarn audit endpoint returned HTTP 400; a registry bulk-advisory inventory was collected instead. The separate MCP package's npm audit reported no known vulnerabilities across its installed dependency tree. Neither result is a completed security assessment of the full app.

Before real records: complete applicable dependency remediation, validate U.S. templates and full rent/receipt workflows, prove document-volume backups, review the release independently, and decide the accounting charge/reconciliation boundary.

Next modules: separate loan ledger, contract-specific schedules/allocation, reversals, balloon and escrow behavior, independent financial fixtures, statements/payoffs, followup ownership and approval-bound notices. MCP write tools and audit/approval events are not implemented. Connect the separate 3nity Google/accounting accounts only when the owner resumes data work.

## Access

Use the Tailscale browser link and MCP launch commands in [deploy/README.md](../../deploy/README.md). The link works without an SSH tunnel while Tailscale is connected. HTTPS certificate enablement requires the CG tailnet administrator; currently the browser uses HTTP over Tailscale encryption. No Funnel or Vercel deployment was created. Operator login details are in a private host file outside the checkout. Do not commit them, put them in a skill or copy them into a chat. PR #1 was merged by the repository account on October 13. `main` includes the installed rental/MCP foundation; browser-access changes remain on `build/private-staging` for separate review. This agent has not performed a merge.
