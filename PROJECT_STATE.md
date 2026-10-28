# Project State — Anfal Market

- Version: 1.8.0
- Current checkpoint: `anfal-market-release-v1.8.0.zip`
- Status: Implementation checkpoint; external runtime/integration/browser tests intentionally deferred until the implementation is frozen.

## Scope completed in v1.8.0
- Categories remain data-driven and can be added without a fixed category count.
- Categories support optional uploaded images.
- Products support optional uploaded images from a phone or computer (PNG/JPEG/WebP/GIF, up to 4 MiB).
- Product cards show image, name, price, and configurable unit label (e.g. per kg, item, or package).
- The storefront initially shows four products in the current filter, with a show-more control for the remaining products. There is no fixed database limit on product count; the API still caps a single order at 100 distinct cart lines.
- Products labelled with kg/kilo units support half-unit cart increments and fractional stock quantities, subject to the final external test plan.
- Initial seed categories are vegetables, fruits, grocery, and cleaning supplies for a fresh database. Existing databases are preserved and not renamed automatically.
- SQLite schema migration adds the category image and product unit columns without deleting existing data.

## Verification status
- Source/archive inspection and documentation updates completed.
- No runtime, integration, browser, or test-suite PASS is claimed for this checkpoint.
- The external release test plan must cover image uploads, dynamic category CRUD, products beyond four, weighted quantities, stock consistency, checkout, backup/restore, and security before production release.


## v1.9.0 — Catalog management and design freeze candidate
- Product management now has text search, category filtering, active/hidden filtering, image thumbnail, category, unit price, fractional stock, and full edit form.
- Product edit supports image replacement or removal, description edits, category reassignment, unit, stock, visibility, and price.
- Category management supports image replacement/removal and explicit display ordering.
- Category deletion is blocked while products remain assigned, preventing accidental loss of catalog grouping; move products first.
- Runtime/integration/browser tests remain deferred by user instruction to the final external verification stage. This checkpoint is not production-approved.


## Implementation freeze — v1.9.0
**Status:** implementation/design checkpoint frozen for final external verification.

### Catalog management completed in this checkpoint
- Product administration supports search, category filtering, active/hidden filtering, full edit form, image replacement/removal, description, price, unit, fractional stock, category assignment, and visibility.
- Category administration supports create/edit, image replacement/removal, and display ordering.
- Category deletion is rejected when products remain assigned; administrators must reassign those products first.
- Public store category data now includes `sort_order`; admin product data includes category names for catalog filtering and display.

### Verification policy
- No runtime, browser, database integration, or automated test suite was run during this implementation pass, by explicit user instruction.
- Archive integrity only will be checked for packaging. Run `EXTERNAL_RELEASE_TEST_PLAN.md` in the external environment after this freeze, fix defects, then rerun affected checks.
- Not yet approved for production.


## v2.0.0 — Native Android client implementation checkpoint

- Added `mobile-app/`, an Expo / React Native customer shopping app. It is a native client, not a WebView wrapper.
- Connected the mobile client to the existing API contracts: `GET /api/store` and `POST /api/orders`.
- Added Arabic RTL storefront, dynamic category filtering/counts, product search, product image/price/unit/stock display, cart quantities including half-kilo steps, checkout, delivery/pickup, configured payment choices, and persisted API URL configuration.
- Added EAS profiles for an installable Android APK (`preview`) and Android App Bundle (`production`), plus Android release documentation/checklist.
- Existing web storefront and web admin remain the catalog and order management interface.

### Android verification status
- Source files and release configuration were authored and packaged; this is not a claim that the Expo app was compiled or run.
- No APK/AAB has been generated in this checkpoint. The app still requires a real deployed HTTPS API URL and an EAS project ID; both placeholders are documented.
- Runtime, emulator, device, API integration, and EAS build tests remain deferred until the implementation is frozen, per project workflow.
- Not approved for production until the external Android checklist and the existing server release test plan are completed.


## v2.1.0 — White-label branding controls

- Added persistent `store_logo_url` setting, including migration-safe default initialization for existing databases.
- Web admin Settings now supports uploading, replacing, or removing a store logo (PNG/JPEG/WebP/GIF, up to 4 MiB) without editing source code.
- Web storefront header and native Android storefront render the configured logo.
- Native Android header uses the configured store name, tagline, and primary color from the API.
- Added `WHITE_LABEL_SETUP.md` documenting single-store-per-deployment isolation and the distinction between dynamic in-app branding and APK-embedded launcher branding.
- No runtime, browser, device, API integration, or EAS build test is claimed.


## v2.2.0 — Repeatable white-label Android build profiles

- Added `mobile-app/app.config.js`, driven by a selected store profile rather than hard-coded launcher branding.
- Added `mobile-app/brands/anfal.json` and a copy-ready `brands/store-template.json`; each profile carries store display name, slug/scheme, unique Android application ID, API URL, primary color, launcher icon, adaptive icon, and splash artwork.
- Added `scripts/select-brand.js` and build wrappers for APK (`preview`) and AAB (`production`) so another store can be prepared without editing React Native source code.
- Build wrapper blocks when the API URL or EAS project ID is still a placeholder. EAS account login, project initialization, a real production API URL, cloud build, and device installation are still required externally.
- Dynamic in-app store name/logo/tagline/color remain editable in the web admin; launcher name/icon changes require rebuilding and redistributing that store's APK.
- This remains one isolated deployment/database per store, not a multi-tenant SaaS control plane.

### v2.2.0 verification boundary
- Static file/JSON/syntax checks and archive integrity are performed for this package.
- No runtime app, API integration, EAS build, APK install, or device test is claimed. The build script intentionally stops on unresolved deployment/EAS placeholders.


## v2.3.0 — Persistent hosting and EAS release preparation

- Added `render.yaml` for a single-instance Node service with a 1 GB persistent disk at `/data`, SQLite database path `/data/anfal-market.db`, backup directory `/data/backups`, HTTPS proxy handling, generated session secret, and a secret admin password prompt. Automatic deploys are disabled by default.
- Added `RENDER_DEPLOYMENT_RUNBOOK.md` documenting the deployment path, paid persistent disk requirement, backup/restore expectations, and SQLite scale limits.
- Added `mobile-app/EAS_BUILD_RUNBOOK.md` documenting EAS linking, HTTPS API configuration, APK build, and physical-device release checks.
- The existing SQLite architecture is retained for the first single-store deployment. PostgreSQL migration is recommended before multi-instance scaling, high availability, or a shared multi-tenant SaaS.

### Verification and blockers

- Source/configuration and archive checks are the only local verification performed for this checkpoint.
- `npm ping --fetch-timeout=8000` timed out against `registry.npmjs.org`; dependency installation and EAS CLI execution are therefore blocked in this environment.
- No Render service or persistent disk was created: a Git repository/connected Render account is not yet available in this working context, and paid infrastructure must be explicitly reviewed before creation.
- No EAS project ID, EAS authentication, real deployed API URL, APK artifact, or physical-device test exists yet. Do not report the app as deployed or the APK as built.
