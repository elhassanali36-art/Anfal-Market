# White-label Android builds without editing application source

The app now reads its launcher identity and API target from a store profile under `brands/<store-id>.json`. Each store can have its own Android application ID, app label, icon/adaptive icon/splash image, brand color, and API base URL.

## What can change without a new APK?

- Store name, in-app logo, tagline, and theme color are fetched dynamically from that store's `/api/store` settings and can be changed in the web admin panel.
- The Android launcher label/icon and Android application ID are embedded in the APK. To ship a separately branded app, create/select that store profile and build a new APK. This does not require editing React Native source code, but it does require a build and distribution step.

## Create a profile for another store

1. Copy `brands/store-template.json` to `brands/<store-id>.json`, where `<store-id>` uses lowercase letters, numbers, and hyphens.
2. Update `storeId`, `displayName`, `slug`, `scheme`, `androidPackage`, `apiBaseUrl`, `primaryColor`, `appVersion`, and `androidVersionCode`.
3. Put that store's PNG icon, adaptive foreground icon, and splash image in `brands/assets/`, and update the three paths. Use unique Android package IDs for separately published stores (e.g. `com.yourcompany.storeone`). Increase `androidVersionCode` for every update published to the same Android application ID.
4. Deploy a separate backend/database for that store and configure its store name/logo/settings in the web admin. This release uses one isolated deployment/database per store; it is not a shared multi-tenant SaaS admin.
5. Select the profile: `npm run select-brand -- --store=store-id`.
6. Build installable APK: `npm run build:apk -- --store=store-id`.
7. For Google Play AAB: `npm run build:aab -- --store=store-id`.

The build script refuses to start when the profile still has a placeholder or non-HTTPS API URL. Before building, sign in to EAS and initialize/link the project using `npx eas-cli login` and `npx eas-cli init` from `mobile-app`. EAS credentials, account access, and cloud build remain external requirements.

## Anfal profile

`brands/anfal.json` is the starter profile for the existing Anfal Market backend. It intentionally uses a placeholder HTTPS URL until the actual production API is deployed. Do not publish an APK while that placeholder remains.
