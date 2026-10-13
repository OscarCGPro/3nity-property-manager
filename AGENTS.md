# Development instructions for the 3nity fork

Read `documentation/3nity/README.md` before changing this fork. The source baseline is the MIT-licensed MicroRealEstate revision `479d0ad703436071b64dfdf4e48321c121d8efb5`; retain its license and attribution. Newer upstream `main` has a different license. Do not automatically merge or deploy it or pull upstream application images tagged `latest`.

This is public source code. Do not place tenant, borrower, property portfolio, bank, executed contract, payment-history, credential, confidential Drive-link or production backup data here. Synthetic fixtures must be clearly fictional. Keep 3nity, CG and Vindex data and credentials separate even on shared hosting.

Read `documentation/3nity/runtime-status.md` for implemented and verified behavior. Five read-only MCP tools and private rental staging are implemented. Loan servicing, MCP writes, notices and data import remain proposed. Enforce read/write scopes on the server, not only in the tool list. Use separate READ and ACT credentials. No arbitrary database, HTTP or shell tools. Record state-changing acts with source evidence, idempotency and actor identity; correct financial history with reversals rather than overwrites.

Do not infer financial/legal terms from generic templates. Use executed documents and approved opening balances. Compute money with exact arithmetic, validate against independent fixtures, and preserve effective dates and schedule versions. Do not send notices, change contractual terms, spend, create external accounts, publish a deployment or import uncertain records without authorized scope. Oscar authorized source builds and private VPS staging on October 13, 2026. Oscar subsequently authorized a browser test link; a private Tailscale Serve route is installed. HTTPS enablement is pending the CG tailnet administrator. Connection/import work and external communications remain deferred.

Use feature branches and reviewable pull requests. The author does not merge their own change. Update the relevant documentation in the same change. Report separately what was implemented, tested, deployed, imported and verified end to end.
