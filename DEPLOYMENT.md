# Deployment guide

## Recommended initial hosting
Use a persistent Node.js host that supports Express and a persistent writable disk (for example, a small VPS or a platform with persistent volumes). SQLite requires a durable filesystem. If deploying on an ephemeral/serverless filesystem, migrate the database to managed PostgreSQL before launch.

## Steps
1. Upload the project or push it to a private Git repository.
2. Configure Node.js 20+ and build/start command `npm install` / `npm start`.
3. Add environment variables:
   - `NODE_ENV=production`
   - `PORT` (usually provided by the host)
   - `ADMIN_PASSWORD` (strong, unique password)
   - `SESSION_SECRET` (long random value)
   - Optional `DB_PATH` (absolute path on persistent storage, e.g. `/data/anfal-market.db`)
   - `TRUST_PROXY=true` only if hosted behind a trusted reverse proxy that correctly sets forwarded headers
   - Optional `BACKUP_DIR` for a protected persistent backup directory
4. Attach persistent storage and set `DB_PATH` to a file on it. The database stores products, orders, settings, and admin sessions, so it must persist across deploys.
5. Enable HTTPS and verify `/api/health` returns `{"ok":true,"service":"anfal-market"}`.
6. Log into the admin panel, replace demo products, configure delivery/payment/store details, and test an end-to-end order.
7. Run `npm run backup` to create a SQLite backup, copy it off-host, and verify restoration before accepting real customers.
8. Replace the placeholders in `/privacy.html`, `/terms.html`, `/delivery-policy.html`, and `/returns-policy.html`; obtain appropriate legal review before public launch.

## Release verification checklist (run only at the final external-environment stage)
- [ ] `npm install` completes successfully on the target host.
- [ ] `npm test` passes.
- [ ] Production server starts and `/api/health` succeeds.
- [ ] Admin login rejects an incorrect password.
- [ ] Admin product CRUD and stock validation work.
- [ ] Delivery fee checked against known distances and configured min/max.
- [ ] Pickup checkout has zero delivery fee.
- [ ] Order is persisted, stock decreases, cancellation restores stock once, and a cancelled order cannot be reactivated.
- [ ] WhatsApp link is tested with the actual store number.
- [ ] Database persistence and restore are verified.
- [ ] Privacy policy, terms, delivery policy, and return/refund policy are published before public launch.


### Catalog images and weighted products (v1.8.0)
- Product/category image uploads are stored as data URLs in SQLite. Back up the database regularly and monitor its growth; for large catalogs, migrate image storage to object storage before high-volume production use.
- The JSON request body limit is 8 MiB, while individual image uploads are limited to 4 MiB.
- For weighted products, set the sale unit label to include `كيلو`, `كجم`, or `kg` to enable 0.5-unit increments. This heuristic must be verified during external tests.

## Render Blueprint (persistent SQLite)

A deployment blueprint is provided in `render.yaml`; see `RENDER_DEPLOYMENT_RUNBOOK.md` before creating resources. It uses a Node web service with a persistent disk mounted at `/data`, `DB_PATH=/data/anfal-market.db`, and an explicit health check at `/api/health`. A persistent disk requires a paid plan. Review the current price in Render before approving the service. Do not use an ephemeral/free filesystem with SQLite.

The Render blueprint leaves `ADMIN_PASSWORD` as a secret to enter during setup and generates `SESSION_SECRET`. Keep both out of source control. The blueprint disables automatic deployments until the owner chooses to enable them.
