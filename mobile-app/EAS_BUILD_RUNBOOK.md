# Expo EAS Android build runbook

This project targets a native Expo / React Native Android app. The APK must be built after the backend has a stable HTTPS URL.

## Prerequisites

- A reachable production backend URL such as `https://<render-service-host>` with `/api/health` returning the expected healthy JSON.
- An Expo account and access to the EAS Build service.
- The repository contents pushed to GitHub or available in a local environment with Node.js and npm registry access.

## One-time setup (from `mobile-app/`)

1. Run `npm install`.
2. Authenticate: `npx eas-cli login`.
3. Initialize/link the project: `npx eas-cli init`. This creates/sets the real EAS project ID in Expo configuration; do not leave `REPLACE_WITH_EAS_PROJECT_ID`.
4. Edit `brands/anfal.json` and replace `apiBaseUrl` with the actual deployed HTTPS service URL. Keep the `androidPackage` stable for future updates to this app.
5. Run `npm run select-brand -- --store=anfal` and inspect the resulting `brand.config.json`.
6. Run `npx expo config --type public` and confirm the resolved app name, package ID, assets, API URL, and EAS project ID. This is configuration verification, not a device test.

## Build installable APK

Run:

```sh
npm run build:apk -- --store=anfal
```

The script selects the store profile, rejects placeholder/non-HTTPS API URLs, and checks the EAS project ID before invoking the EAS `preview` profile. EAS returns a build page and an APK artifact link when the remote build succeeds.

For Google Play, run:

```sh
npm run build:aab -- --store=anfal
```

This uses the `production` profile and produces an Android App Bundle, not an installable APK.

## Final device verification

1. Download the actual `.apk` from the completed EAS build.
2. Install it on a physical Android phone.
3. Confirm it loads products/categories from the deployed API over HTTPS.
4. Test search, images, stock, fractional weight quantities, delivery/pickup, order creation, and admin order receipt.
5. Confirm the in-app store logo/name can be changed from admin settings; the launcher name/icon are embedded and require a new branded build to change.
6. Record the EAS build ID, artifact URL, Android package ID, version/versionCode, device model, Android version, and results. Do not mark PASS based on a queued or successful cloud build alone.

## Current blocker

No Expo account/project is linked in this working copy, no real backend URL exists yet, and this execution environment cannot reach `registry.npmjs.org` at present. Therefore this runbook is prepared, but no EAS build or APK is claimed.
