# Private staging deployment

One Compose project operates the application, local MongoDB, Redis and persistent document volumes. It contains several containers. This is internal staging, not approved live servicing. Source starts at the retained MIT baseline; application images are built locally from the feature branch.

```sh
python3 deploy/init-env.py
docker compose --parallel 1 --env-file deploy/.env -f deploy/compose.yaml build api landlord tenant
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --no-build
python3 deploy/bootstrap.py
docker compose --env-file deploy/.env -f deploy/compose.yaml --profile mcp build mcp
```

Secrets are generated on the host, never committed. Bootstrap refuses to overwrite an existing organization or credential file. Public signup and external sending are disabled. No SMTP credentials are provided. Operator credentials live in `../operator-credentials.json` outside the Git checkout with mode 0600; read them locally through SSH. Rotate the initial operator password in the app before active use.

The gateway binds only to `127.0.0.1:8088`. The installed browser link uses Tailscale Serve, so an authorized device with Tailscale connected can open it without an SSH tunnel. The databases remain inside Docker.

Set these nonsecret values in the host-only `deploy/.env`, using the node's actual Tailscale DNS name:

```dotenv
APP_DOMAIN=node.tailnet.ts.net
APP_PROTOCOL=http
PUBLIC_APP_URL=http://node.tailnet.ts.net
```

Apply the origin without rebuilding the images:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml config --quiet
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --no-build
tailscale serve --bg --http=80 http://127.0.0.1:8088
```

Visit `http://node.tailnet.ts.net/landlord`. This HTTP browser origin is accessible over the encrypted Tailscale connection, not the public internet. The browser does not display an HTTPS lock. Public Funnel is not configured. Verify `tailscale serve status --json` before changing routes; preserve any existing services.

For HTTPS, the CG tailnet administrator must first enable HTTPS certificates using the consent page produced by `tailscale serve --bg --https=443 http://127.0.0.1:8088`. The initial attempt found HTTPS disabled; the admin browser session required sign-in, so HTTPS was not enabled. After enabling certificates, set `APP_PROTOCOL=https`, set `PUBLIC_APP_URL=https://node.tailnet.ts.net`, recreate the app, verify login and session refresh through HTTPS, then disable the temporary HTTP route with `tailscale serve --http=80 off`. No Vercel project or new paid service was created.

The original SSH tunnel remains a recovery option. Match its browser hostname to the configured `APP_DOMAIN`, or restore the localhost origin first:


```sh
ssh -N -L 8088:127.0.0.1:8088 cg-hermes
```

With the localhost origin defaults, visit `http://3nity.localhost:8088/landlord`. Use the verified CG host; SSH alias names alone do not prove company identity. There is no public website or database port.

For private MCP stdio access, launch through SSH with an agent/client that supports a subprocess transport:

```sh
ssh cg-hermes 'cd /opt/3nity/property-manager && docker compose --env-file deploy/.env -f deploy/compose.yaml --profile mcp run --rm --no-deps -T mcp'
```

Current MCP tools are read-only. The API's machine-reader role rejects writes, configuration, email and document routes before controller execution. Tool output is bounded and the configured organization is verified at sign-in. MCP writes, draft/approval workflows and loan servicing are future work; this transport has not been wired into the existing fleet automatically.

Stop/start with `docker compose ... stop` / `start`. Never use `down -v` on data you intend to retain. Named volumes preserve MongoDB, Redis, templates, uploads and generated documents across container recreation. Keep backups separately and prove restore before importing real records.

Node 22 replaces the obsolete Node 20 runtime in this deployment. Next.js is patched to 14.2.35, with selected backend dependency patches. This is not a completed dependency/security audit; broader framework and legacy dependency maintenance remains a production gate.

## Reviewed basic-record import

See [portfolio-import.md](../documentation/3nity/portfolio-import.md). Back up the dedicated database first. Keep the reviewed JSON, credentials and receipts outside the source checkout. Import only after explicit owner authorization, using the digest of that exact private artifact:

```sh
python3 deploy/import-portfolio.py --batch /private/reviewed-batch.json \
  --expected-sha256 REVIEWED_DIGEST --credentials /private/operator-credentials.json \
  --approved-by OWNER --approval-date YYYY-MM-DD --approval-evidence 'Exact owner authorization' \
  --receipt /private/import-receipt.json
```

The script verifies the batch digest before sending, signs in with the host-only human operator, imports through the organization-scoped API and reads back the result. It never prints credentials or record content. The API rejects machine import, changed/repeated-content conflicts, payments, charges, fee automation and guessed balances. Keep existing source/batch evidence and dated backups for recovery.
