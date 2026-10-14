# Private rental MCP

An official-SDK stdio MCP server exposes six read tools: `list_properties`, `list_tenants`, `list_leases`, `get_rents`, and `get_dashboard`. It authenticates with a dedicated `read_only` application principal and verifies its server-returned organization ID against the configured ID. No write or delivery tools are implemented.

Install/test locally with `npm ci` and `npm test`. Configuration uses `MRE_URL`, `MCP_CLIENT_ID`, `MCP_CLIENT_SECRET` and `MCP_ORGANIZATION_ID`, all supplied outside Git. Use the private Compose profile and SSH command in `deploy/README.md` for VPS access. There is no unauthenticated public HTTP endpoint.

The API enforcement is in the shared organization middleware and applies beyond the MCP tool list. Tests cover rejected configuration/write paths, organization mismatch, bounded responses, and token refresh retry. Live acceptance must also check the actual backend and complete the MCP initialize/list/call handshake.

SDK `@modelcontextprotocol/sdk` 1.32.1 is a maintained compatibility line for the 2025-11-25 protocol. Before wider production rollout, review migration to the v2 SDK and current protocol. Agent fleet registration, write approvals, servicing and notices are separate work; installing this package does not prove any agent is connected.

`get_portfolio` reads imported rental/collateral metadata, note headers and reconciliation cases. It does not read source documents or authorize importing. Unknown note balances stay unreconciled and must not drive notices.
