# Changelog

## 1.4.0 — Business Rules, Store Policies, and Operational Readiness
- Enforced explicit order status transitions and retained terminal cancellation behavior.
- Added validation for delivery address, payment method identifiers, product inputs, categories, image URL schemes, and core store settings.
- Added generic API error handling and login-throttle cleanup.
- Added opt-in trusted reverse-proxy setting for HTTPS deployments.
- Added a consistent SQLite backup command and backup/restore guidance.
- Added Arabic privacy, terms, delivery, and returns/refunds policy templates and linked them in the storefront.
- Updated project state and release test plan.
- External tests intentionally deferred until implementation freeze.

## 1.2.0
- Persistent SQLite-backed sessions, production secret guards, login throttling, cancellation stock restoration, historical product archiving, category management, and stronger settings validation.

## 1.1.0
- Per-order delivery-fee adjustment and recalculation.

## 1.0.0
- Initial Arabic RTL supermarket storefront, admin management, SQLite order workflow, and configurable distance-based delivery fees.


## 1.5.0 — Security and configuration hardening
- Added cross-origin protections for admin mutation requests using Fetch Metadata and Origin validation.
- Added periodic cleanup for expired persisted sessions.
- Bounded admin password input length and public numeric settings.
- Rejected invalid checkout fulfillment values instead of defaulting to delivery.
- Added configurable business hours to store settings and storefront footer.
- Updated release documentation; runtime and integration tests remain deferred to the final external stage.


## 1.6.0 — Checkout reliability and fulfillment UX
- Checkout now reflects enabled delivery and pickup options.
- Store settings cannot disable both fulfillment methods.
- Prevented repeated checkout submission while the request is pending and restored the button on errors.
- Expanded WhatsApp order handoff with order lines, fulfillment/address, subtotal, delivery fee, and total.
- Tests remain deferred to the final external stage.


## 1.7.0 — Order workflow interface and freeze preparation
- Admin status controls now expose only legal next transitions plus the current state.
- Order list refreshes after status change attempts to prevent stale visual state.
- Updated checkpoint documentation; all application tests remain deferred.


## 1.8.0 — Dynamic catalog and weighted product units
- Added a forward-compatible SQLite migration for category images and product unit labels.
- Added category image upload support and product image upload support from device files (PNG/JPEG/WebP/GIF, maximum 4 MiB).
- Added configurable sale-unit labels displayed under product names and prices.
- Added an initial four-product view with a show-more control; product/category counts are not hard-coded.
- Added half-unit increments for products whose unit label indicates kilo/kg, plus decimal stock quantities up to three decimal places.
- Fresh databases now seed vegetables, fruits, grocery, and cleaning-supplies categories. Existing categories are preserved.
- External runtime/integration/browser testing remains deferred by project-owner instruction.


## [1.9.0] - 2026-10-28
### Added
- Product catalog search and filters for category and visibility.
- Full product edit form with image replace/remove, description, unit, price, stock, category, and visibility.
- Category image replacement/removal and display-order editing.
- Category deletion protection when products are still assigned.
### Verification
- External runtime, database, browser, and integration tests are intentionally deferred until implementation freeze.
- Follow-up correction: storefront/admin category payload now includes display order; admin product endpoint includes category names for accurate filtering/listing.


## 2.0.0 — Native Android client checkpoint
- Added an Expo / React Native customer app using the existing Anfal Market API.
- Added product discovery, categories/search, cart with fractional kilogram quantities, delivery/pickup checkout, and order submission.
- Added EAS APK/AAB build profiles and Android release checklist.
- No APK build or runtime test is claimed; API URL and EAS project ID must be configured first.


## [2.1.0] - White-label branding

- Added editable store logo to admin settings with upload/replace/remove actions.
- Exposed logo through existing store settings and displayed it in the web storefront and Expo Android app.
- Android in-app header now reflects the configured primary color.
- Documented per-store deployment model and Android launcher icon/app-label rebuild limitation.
- Verification is static/source-level only; runtime and APK build remain external.


## 2.2.0 — White-label Android build profiles
- Added profile-driven Expo configuration for store-specific launcher names, Android package IDs, launcher/adaptive icons, splash artwork, API URLs, and primary colors.
- Added store selection and guarded APK/AAB build scripts.
- Added a reusable store template and white-label Android instructions.
- Real HTTPS API deployment, EAS project ID/account, cloud build, and physical-device verification remain outstanding.


## v2.3.0 — Hosting and Android build readiness

- Added Render Blueprint configuration for persistent SQLite hosting with `/data` storage, health checks, generated session secret, and secret admin-password input.
- Added deployment and EAS build runbooks.
- Preserved SQLite for the initial single-store launch and documented safe migration triggers for PostgreSQL.
- No remote service was provisioned and no APK was built in this checkpoint.
