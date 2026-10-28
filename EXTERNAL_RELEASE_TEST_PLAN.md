# External Release Test Plan — Run at the end only

This plan is intentionally deferred until design and implementation are frozen. Use a clean Node.js 20+ environment with network access and persistent writable storage.

## A. Setup and boot
- [ ] Confirm Node.js version is 20 or newer.
- [ ] Copy `.env.example` to `.env`; set a unique `ADMIN_PASSWORD` (14+ characters) and `SESSION_SECRET` (32+ characters).
- [ ] Install dependencies using `npm install`.
- [ ] Start the app and confirm `/api/health` returns `ok: true`.
- [ ] Restart the app and confirm data and admin session persistence on the configured durable database.

## B. Authentication/security
- [ ] Admin endpoints reject unauthenticated requests.
- [ ] Wrong password is rejected; repeated failed logins are rate-limited.
- [ ] Successful login creates a session; logout invalidates it.
- [ ] Production mode refuses weak/missing secrets and sends Secure session cookies over HTTPS.

## C. Product/category admin
- [ ] Create, edit, deactivate, and delete/archive products.
- [ ] Create, rename, and delete categories; products become uncategorized if their category is deleted.
- [ ] Confirm product history remains available when a referenced product is archived.
- [ ] Invalid price, stock, category, and image URL inputs are handled safely.

## D. Checkout and inventory
- [ ] Add products to cart and create a delivery order.
- [ ] Confirm server-calculated prices are used, not client-submitted prices.
- [ ] Verify subtotal, distance fee, min/max bounds, and final total.
- [ ] Confirm insufficient stock and unavailable payment methods are rejected.
- [ ] Confirm successful order decreases inventory exactly by ordered quantities.
- [ ] Cancel the order; verify inventory is restored exactly once.
- [ ] Attempt to reactivate a cancelled order; confirm rejection.
- [ ] Verify pickup orders have zero delivery fee and reject per-order delivery-fee changes.
- [ ] Override a delivery fee and confirm total recalculation.

## E. Settings and white-label
- [ ] Invalid delivery min/max combinations are rejected without partially saving settings.
- [ ] Invalid theme color is rejected.
- [ ] Store name, currency, phone, WhatsApp, address, delivery, pickup, and payment settings persist.
- [ ] Repeat the deployment with a separate DB and unique secrets to validate single-store white-label reuse.

## F. Browser/mobile responsive checks
- [ ] Test storefront and admin flows in desktop and mobile browsers.
- [ ] Check Arabic RTL layout, keyboard navigation, validation messages, empty states, and error recovery.
- [ ] Confirm WhatsApp order link uses the configured store number and correct order details.

## G. Release gate
- [ ] Run `npm test`; all tests pass.
- [ ] Add/run API integration and browser end-to-end tests for all sections above.
- [ ] Review logs for uncaught errors and inspect database after order/cancel flows.
- [ ] Back up the database and verify a restore.
- [ ] Configure published privacy, terms, delivery, and return/refund policies.
- [ ] Record exact PASS/FAIL/BLOCKED evidence and produce final deployment-ready ZIP.

## H. Phase 4 regression gates
- [ ] Order status transitions reject invalid jumps (e.g. new directly to completed) and allow only documented transitions.
- [ ] Repeating cancellation does not restore stock twice; cancelled orders cannot be reactivated.
- [ ] Delivery checkout rejects missing/too-short address; pickup accepts no delivery address and has zero fee.
- [ ] Unknown or disabled payment method IDs are rejected server-side.
- [ ] Product create/update rejects invalid IDs, missing categories, out-of-range price/stock, and unsafe image URL schemes.
- [ ] Settings reject blank store name/currency and reject configurations with every payment method disabled.
- [ ] Malformed JSON and oversized JSON produce controlled 400/413 responses.
- [ ] Reverse-proxy cookie behavior is verified with `TRUST_PROXY=true` only behind the actual trusted proxy.
- [ ] `npm run backup` creates a consistent backup; restore to a separate path and compare critical records.
- [ ] Policy pages are reviewed after replacing placeholders; no placeholder remains on the public site.

- [ ] Verify public order creation is rate-limited by IP and the limit resets after its window.
- [ ] Verify cancelled orders reject delivery-fee override attempts.


## I. Phase 5 regression gates
- [ ] Admin mutation with a mismatched Origin is rejected with 403.
- [ ] Browser requests marked `Sec-Fetch-Site: cross-site` cannot mutate admin state.
- [ ] Same-origin admin requests work correctly through the actual HTTPS reverse proxy configuration.
- [ ] Expired SQLite sessions are removed by periodic cleanup and expired sessions cannot authenticate.
- [ ] Password inputs above the configured maximum are rejected without server errors.
- [ ] Unknown checkout fulfillment values are rejected; only `delivery` and `pickup` are accepted.
- [ ] Business hours can be saved and display in the storefront footer.
- [ ] Overlong store branding/contact settings and out-of-range numeric settings are rejected without partial writes.


## J. Phase 6 checkout UX gates
- [ ] Delivery disabled / pickup enabled: checkout only offers pickup and submits a valid pickup order.
- [ ] Pickup disabled / delivery enabled: checkout only offers delivery and requires distance/address.
- [ ] Admin cannot disable both delivery and pickup.
- [ ] Rapid repeated submit attempts while the request is pending do not create duplicate orders.
- [ ] Failed checkout re-enables the submit button and preserves entered details.
- [ ] WhatsApp handoff contains correct order lines, fulfillment/address, subtotal, delivery fee, and total.


## K. Phase 7 order workflow UI gates
- [ ] Status selector only offers valid next states plus the current state.
- [ ] Successful status changes refresh the order list and show persisted state.
- [ ] Rejected status changes refresh the order list to the server's actual state.


## Dynamic catalog and weighted units (v1.8.0)
- [ ] Upgrade an existing v1.7 database and confirm existing products/orders remain intact.
- [ ] On a fresh database, confirm the four initial categories are created.
- [ ] Add a new category (e.g. ready meals), upload its image, rename it, and confirm the storefront reflects the change.
- [ ] Add more than four products to a category; confirm the initial four and the show-more control work on desktop and mobile.
- [ ] Upload product images in each supported format and reject files larger than 4 MiB or unsupported formats.
- [ ] Confirm product cards show image, name, price, and unit label.
- [ ] Confirm kilo/kg products add in 0.5-unit increments, subtotal is correct, and checkout rejects invalid increments or insufficient fractional stock.
- [ ] Confirm regular item/package products continue to add in whole-unit increments.
- [ ] Confirm category/product deletion and editing preserve historical order records.


## Catalog management final pass (v1.9.0)
1. Create more than 20 products in one category; verify the customer catalog remains responsive and all items are reachable.
2. Search by product name/description and filter by category and active/hidden state in admin.
3. Edit name, description, price, unit, fractional stock, category, and visibility; reload and confirm persistence.
4. Replace a product image, remove it, and confirm the fallback state.
5. Create a category with an image, edit its name/image/order, and verify storefront ordering.
6. Attempt category deletion while products are assigned; expect HTTP 409 and no product changes. Move products and retry deletion.
7. Test on a narrow mobile viewport and desktop viewport.

## Native Android client (v2.0.0)

The Expo / React Native client has a separate checklist at `mobile-app/ANDROID_RELEASE_CHECKLIST.md`. After the server is deployed and the EAS project/API URL are configured, build an installable APK with `eas build --platform android --profile preview`. Do not mark Android release-ready until the APK is installed and the end-to-end shopping/checkout scenarios are verified on a physical Android device. The APK has not been built in this source checkpoint.
