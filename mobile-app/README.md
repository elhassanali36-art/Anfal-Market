# Anfal Market — Native Android app

This is a real Expo / React Native client for the existing Anfal Market Express API. It is **not** a WebView wrapper. The existing web storefront and admin panel remain in place and continue to use the same SQLite-backed API.

## Current mobile scope

- Arabic-first RTL storefront with store name/tagline/logo/primary header color from `/api/store`. Store name and in-app logo are dynamically white-label branded through admin settings without editing mobile source.
- Dynamic categories and product counts, product search, stock/unit/price display, product images, and refresh.
- Cart with fractional increments for units labelled in kg/kilo, bounded by stock.
- Checkout to the existing `POST /api/orders` endpoint: customer details, delivery/pickup, manual estimated distance, configured payment choice, notes, and order confirmation.
- API URL can be set in-app and is persisted locally on the device.
- Android APK EAS profile (`preview`) and Android App Bundle profile (`production`).

## Important boundaries

- The server must be deployed and reachable from the phone over HTTPS before the app can place real orders.
- `app.json` deliberately contains a placeholder API URL and placeholder EAS project ID. Replace the API URL with the actual deployed server URL. Run `eas init` to attach this app to your EAS project and replace the project ID before cloud builds.
- The app does not include an embedded backend, map/GPS route calculation, real payment gateway, push notifications, order tracking, or customer account/login in this phase. Delivery distance is a customer-entered estimate, matching the current server contract.
- Admin catalog/order management remains in the web admin panel. This Android app is the customer shopping app.
- No APK has been built or installed as part of this checkpoint. Cloud EAS build and device/runtime tests remain external verification tasks.

## Configure and run

1. Install Node.js 20+ and npm.
2. From `mobile-app`, install dependencies: `npm install`.
3. Start the app: `npx expo start`.
4. In the app's settings, enter the deployed API base URL (for example `https://shop.your-domain.com`, without a trailing slash).
5. Ensure `/api/health` returns a healthy response from that server and `/api/store` returns the configured store catalogue.

## White-label profiles and Android builds

The app configuration is generated from `brands/<store-id>.json` by `app.config.js`. The starter profile is `brands/anfal.json`; `brands/store-template.json` is a copy-ready template. This lets you change the launcher name, package ID, launcher icon, adaptive icon, splash image, brand color, and API URL without editing React Native source. See `WHITE_LABEL_ANDROID.md`.

1. Install dependencies: `npm install`.
2. Copy `brands/store-template.json` to `brands/<store-id>.json` and configure the store identity, unique Android package ID, HTTPS API URL, and brand asset paths.
3. Put the store-specific icon, adaptive icon, and splash files under `brands/assets/`.
4. Log in to EAS: `npx eas-cli login`.
5. Initialize/link this Expo project: `npx eas-cli init`, then replace the placeholder EAS project ID in `app.json`.
6. Build an installable APK: `npm run build:apk -- --store=<store-id>`. The script selects the profile and blocks if the API URL or EAS project ID is still a placeholder.
7. For Google Play, build an AAB: `npm run build:aab -- --store=<store-id>`.
8. Download, install, and test the generated artifact on a physical Android phone before release.

Store name/logo inside the app can still be changed dynamically through the web admin settings. The launcher name/icon are embedded in the APK and require a new branded build to change.

## Network note

Android devices cannot normally reach a developer computer's `localhost`. Use a deployed HTTPS URL for reliable real-device testing. A local LAN IP can be used only when the phone and development machine are on the same network and the firewall permits access.

A simple branded shopping-basket icon, Android adaptive icon foreground, and green splash image are included. The in-app logo can be changed from web admin settings; the launcher icon and Android app label are embedded in the APK and require a new branded build when changing them. See `../WHITE_LABEL_SETUP.md`.


## Production build

Follow `EAS_BUILD_RUNBOOK.md` after the API has been deployed to a stable HTTPS URL. The EAS account/project ID must be linked and the actual APK must be installed and checked on a physical Android device before release approval.
