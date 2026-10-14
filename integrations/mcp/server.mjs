import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RentalReader } from './client.mjs';

const api = new RentalReader({
  baseUrl: process.env.MRE_URL || 'http://gateway:8080',
  clientId: process.env.MCP_CLIENT_ID,
  clientSecret: process.env.MCP_CLIENT_SECRET,
  organizationId: process.env.MCP_ORGANIZATION_ID
});
const server = new McpServer({
  name: '3nity-property-manager',
  version: '0.1.0'
});
function tool(name, description, schema, path) {
  server.registerTool(
    name,
    {
      description,
      inputSchema: schema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      }
    },
    async (args) => {
      try {
        const data = await api.get(
          typeof path === 'function' ? path(args) : path
        );
        return { content: [{ type: 'text', text: JSON.stringify(data) }] };
      } catch {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Rental read failed. Check service health, credentials, scope, and organization binding.'
            }
          ]
        };
      }
    }
  );
}
tool(
  'list_properties',
  'Read properties in the configured 3nity organization.',
  {},
  '/properties'
);
tool(
  'list_tenants',
  'Read tenant records in the configured organization.',
  {},
  '/tenants'
);
tool(
  'list_leases',
  'Read lease records in the configured organization.',
  {},
  '/leases'
);
tool(
  'get_rents',
  'Read rent balances for a specified calendar month.',
  {
    year: z.number().int().min(1900).max(2999),
    month: z.number().int().min(1).max(12)
  },
  ({ year, month }) => `/rents/${year}/${month}`
);
tool(
  'get_dashboard',
  'Read the rental dashboard in the configured organization.',
  {},
  '/dashboard'
);
tool(
  'get_portfolio',
  "Read the configured organization's imported assets, note metadata and reconciliation cases. Unknown balances are not zero and do not establish delinquency.",
  {},
  '/portfolio'
);
await server.connect(new StdioServerTransport());
