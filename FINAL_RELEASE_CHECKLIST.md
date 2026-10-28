# Final Release Checklist — Anfal Market 1.8.0

## Implementation checkpoint
- [x] Arabic-first responsive storefront and admin panel retained.
- [x] Delivery fee calculation and per-order override retained.
- [x] Persistent SQLite-backed admin sessions and production secret guards.
- [x] Login and public order-request throttling with expired-entry cleanup.
- [x] Product/category/settings validation strengthened.
- [x] Order transition graph, terminal cancellation, and stock restoration.
- [x] API error handling and optional reverse-proxy configuration.
- [x] SQLite backup command and operational guidance.
- [x] Arabic policy templates linked from storefront.
- [x] External test plan updated; no application tests run during implementation.

## Final external environment gate — NOT YET EXECUTED
- [ ] Install dependencies on a clean Node.js 20+ environment.
- [ ] Run static syntax checks and `npm test`.
- [ ] Start in development and production configurations; verify health endpoint.
- [ ] Verify login/logout, rate limiting, session persistence, and HTTPS cookie behavior behind the actual proxy.
- [ ] Verify product/category CRUD, invalid inputs, and image URL validation.
- [ ] Verify delivery/pickup checkout, payment option enforcement, stock concurrency, cancellation/restoration, and every order-state transition.
- [ ] Verify fee overrides and totals.
- [ ] Verify desktop/mobile browser flows and RTL accessibility basics.
- [ ] Run `npm run backup`, copy backup off-host, and verify database restore.
- [ ] Replace and review legal policy placeholders.
- [ ] Record evidence for each PASS/FAIL/BLOCKED item and fix/retest all failures.
- [ ] Only then issue the final production-readiness decision and deployment ZIP.

- [ ] Verify same-origin admin mutation protection against the actual deployment URL and proxy settings.
- [ ] Verify business-hours configuration is saved and displayed correctly.
- [ ] Verify disabled fulfillment methods are not selectable and at least one method remains enabled.
- [ ] Verify double-clicking checkout creates no duplicate order from a single in-flight form submission.
- [ ] Verify WhatsApp handoff contains correct products, fulfillment, address, subtotal, fee, and total.
- [ ] Verify order status selector exposes only allowed next transitions and refreshes after both success and failure.

- [ ] Verify dynamic category and product image workflows in the external environment.
- [ ] Verify weighted quantity increments, decimal stock, and totals in the external environment.


## Catalog freeze criteria added in v1.9.0
- [ ] Verify product create/edit/archive behavior in external runtime.
- [ ] Verify image upload, replacement, and removal on phone and desktop.
- [ ] Verify category create/edit/order and safe delete guard.
- [ ] Verify search and category/visibility filters with a large catalog.
- [ ] Verify fractional stock and unit price display.
- [ ] Run the complete `EXTERNAL_RELEASE_TEST_PLAN.md` only after implementation is frozen.


## White-label Android release (v2.2.0)
- [ ] Create/confirm one isolated backend and database per customer store.
- [ ] Complete `mobile-app/brands/<store-id>.json` with a real HTTPS API URL and unique package ID.
- [ ] Add/verify store-specific launcher/adaptive icons and splash artwork.
- [ ] Link EAS project and build APK using `npm run build:apk -- --store=<store-id>`.
- [ ] Install on a physical Android device and verify store branding and order flow.
- [ ] Verify launcher label/icon and in-app name/logo independently.


## Deployment / APK gates (v2.3.0)
- [ ] Review Render's current paid persistent-disk pricing and approve resource creation.
- [ ] Push this exact checkpoint to a private GitHub repository and connect it to Render.
- [ ] Deploy with `render.yaml`; confirm `/api/health` and `/data` persistence after redeploy.
- [ ] Run external release tests and a verified backup/restore.
- [ ] Connect the Expo account, initialize the EAS project, and set the real HTTPS URL in `mobile-app/brands/anfal.json`.
- [ ] Complete EAS preview build and download a real APK artifact.
- [ ] Install the APK on a physical Android phone and complete the Android release checklist.
