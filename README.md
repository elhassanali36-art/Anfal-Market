# الأنفال ماركت — White-label Supermarket Web App

**Current checkpoint:** v2.2.0 — white-label Android build profiles are prepared; production API deployment, EAS build, and external release tests are still pending.

Arabic-first RTL supermarket ordering application that can be rebranded for multiple stores. Includes product/category browsing, cart, checkout, order management, stock validation, configurable payment options, and distance-based delivery pricing.

## Requirements
- Node.js 20 or newer
- npm

## Run locally
1. Copy `.env.example` to `.env`.
2. Set `ADMIN_PASSWORD` to a strong unique password and set `SESSION_SECRET` to a long random secret.
3. Install dependencies: `npm install`
4. Start: `npm start`
5. Visit `http://localhost:3000`.

The SQLite database is created automatically as `anfal-market.db` on first run. Demo products are seeded only if the products table is empty. Back up the database before deploying updates.

## Native Android app

An Expo / React Native customer app is included in `mobile-app/`. It connects to this existing API and is not a WebView. Read `mobile-app/README.md` for API configuration and EAS build instructions; `mobile-app/ANDROID_RELEASE_CHECKLIST.md` lists required external device tests. An installable APK has not yet been built.

## Admin
Select **الإدارة** in the store header and sign in with `ADMIN_PASSWORD`. Admin features include product add/edit/archive, stock updates, category create/edit/delete, order status workflow, per-order delivery-fee override, and store/delivery/payment settings. Cancelling an order restores its reserved stock exactly once; cancelled orders are terminal. Products referenced by historical orders are archived rather than physically deleted.

## Delivery pricing
The checkout only offers fulfillment methods enabled by the store. For delivery orders, the customer enters an estimated distance in kilometres. The fee is calculated as:

`delivery fee = distance_km × price_per_km`

The admin can configure price per km, a minimum fee, and an optional maximum fee. Set maximum to `0` for no maximum. Pickup orders have no delivery fee. The current release does **not** calculate route distance automatically with GPS/maps; the customer-entered distance is an estimate. The admin can also adjust the final delivery fee for an individual delivery order; the order total is recalculated automatically.

## White-label configuration
Change store name, tagline, currency, phone, WhatsApp number, address, business hours, theme colour, delivery price, fee bounds, minimum order, and payment options from the admin panel. For each new store, use a separate deployment/database and unique secrets. For more advanced multi-tenant hosting, implement tenant isolation before sharing a single database across stores.

## Payment handling
Cash, Bankak, Okash, and Fawry are configurable as display/selection options. This release does not integrate with payment-provider APIs or verify digital payments. Add provider-approved payment integration before advertising online payment as automated.

## Security and deployment notes
- Set `NODE_ENV=production`, `ADMIN_PASSWORD`, and a strong `SESSION_SECRET` in the hosting provider's environment settings.
- Use HTTPS in production. Session cookies are marked secure when `NODE_ENV=production`.
- Keep the SQLite database on persistent storage; ephemeral serverless filesystems can lose data. Use a persistent Node host or migrate to managed PostgreSQL for serverless deployment.
- Environment variables are loaded from `.env` with dotenv. Sessions are stored in the same SQLite database, so they survive application restarts when the database is on durable storage. This remains a single-instance SQLite deployment model; use a managed shared session/database architecture for multiple instances. Admin mutation routes reject cross-site browser requests and mismatched Origin headers when supplied. Admin login and public order creation have basic in-process rate limits; use an edge/WAF rate limit for internet-facing production.
- Configure automated backups and restore drills, monitoring, and an external email/SMS notification channel before high-volume use.
- Never commit `.env` or database files.

## Tests
Run `npm test` for the delivery fee unit tests. Release verification is intentionally deferred to the final external environment stage; follow `EXTERNAL_RELEASE_TEST_PLAN.md` after installing dependencies and launching the app.

## Database backup
Set optional `BACKUP_DIR` to a protected persistent directory, then run `npm run backup` to create a consistent SQLite backup. Copy backups off-host and periodically perform a restore drill; a backup that has never been restored is not a verified recovery plan.

## Legal policy templates
The `/privacy.html`, `/terms.html`, `/delivery-policy.html`, and `/returns-policy.html` pages are editable templates, not legal advice or launch-ready policies. Replace all placeholders and verify the content against the store's real practices and local law before accepting public orders.


### Catalog management (v1.9.0)
- Create unlimited categories and products through the admin interface.
- Search products and filter by category and visibility.
- Edit product images, descriptions, units, prices, stock, category, and visibility.
- Set category images and display order. A category cannot be deleted while products remain assigned to it.
- External release tests are deferred until implementation freeze; see `EXTERNAL_RELEASE_TEST_PLAN.md`.

The catalog/backend implementation checkpoint was frozen at v1.9.0 before external verification. The native Android and white-label build-profile additions are documented in `PROJECT_STATE.md`; see `EXTERNAL_RELEASE_TEST_PLAN.md` and `mobile-app/ANDROID_RELEASE_CHECKLIST.md` for the final external verification stage.


## White-label Android apps

The Expo customer app supports store-specific build profiles under `mobile-app/brands/`. See `mobile-app/WHITE_LABEL_ANDROID.md` to create a second store without editing React Native source code. Store name/logo inside the app can be changed from the web admin; the Android launcher label/icon require a new APK build for each separately branded app. Each store uses its own deployment/database in this version.

## Standalone web / APK mode (docs/)
`docs/` is a server-free build of the storefront for GitHub Pages and for the bundled Android app:
- `shim.js` activates only when `/api/*` is unreachable; it serves `demo-data.json` for browsing and
  computes checkout totals locally (same delivery formula), then offers a WhatsApp order message.
- Set `settings.whatsapp_number` in `docs/demo-data.json` to receive those orders on WhatsApp.
- Admin panel and automated order storage require the real server (`npm start`).
Live: https://elhassanali36-art.github.io/Anfal-Market/

## Local admin (offline mode)
In the standalone build the full admin panel works locally on the device:
- Open **الإدارة**, password: `anfal2026`
- Products: add / edit / delete / archive, assign to any category, stock, unit, price
- Categories: add / rename / delete (blocked while products reference it)
- Settings: store name, phone/WhatsApp, delivery pricing, payment options
- Orders placed on the device appear in the admin orders list and stock is decremented
- Everything persists in localStorage on the device; the catalog is seeded with 20 products across
  4 categories. Reset from the browser console with `anfalLocalReset()`.

## Storage & image uploads (v1.8)
- Catalog lives in **IndexedDB** (multi-MB quota) with a compact **localStorage mirror** (images stripped) and an
  automatic backup copy. Small edits never fail because of the 5MB localStorage cap any more.
- Product/category photos are **downscaled in the browser** (max 760px, JPEG, target <260KB) before storing;
  uploads up to 25MB are accepted and compressed automatically.
- `anfalExport()` in the console downloads a full JSON backup; `anfalLocalReset()` wipes local data.
