# Anfal Market White-Label Setup

## Change store branding without coding

1. Sign in to the existing web admin panel.
2. Open **Settings / إعدادات المتجر**.
3. Change **اسم المتجر**, tagline, primary HEX color, contact details, and currency.
4. Under **شعار المتجر**, choose a PNG, JPEG, WebP, or GIF image up to 4 MiB, then save. You can replace or remove the logo later from the same screen.
5. The web storefront and connected Android app fetch the store name, logo, tagline, and primary header color from `/api/store`; no app source edit is needed for those in-app branding changes.

## Selling another branded store

This release is a **single-store deployment per database**. To launch another shop as a separate customer/store, deploy another isolated instance with its own database and admin credentials, then set that instance's name, logo, color, products, delivery rules, and payment options in its admin settings. This avoids one store accidentally seeing another store's orders or catalogue. A multi-tenant SaaS control panel that hosts many stores in one shared deployment is not implemented in this release.

## Important Android distinction

- **Logo/name inside the shopping app:** dynamic from store settings and can be changed without programming.
- **Android launcher icon and app label shown on the phone home screen / Settings:** embedded in the APK. Changing these requires generating and distributing a new branded APK (and changing the Android application ID for separately published white-label apps). This is an Android packaging limitation, not a store-settings limitation.
- Existing installations will not automatically become a different store's APK just because the in-app logo changes. For each customer store, create a separately branded build before distribution.

## Image size and API

The admin accepts image data as a data URL up to 4 MiB; the API settings payload allows this larger field while ordinary settings remain length-limited. Keep logos square or near-square with a transparent/white background for best fit.

## Verification status

This change updates source and documentation. It does not claim runtime, browser, device, EAS, or APK verification. Run the external release test plan after the implementation is frozen.


## Preparing a separately branded Android app

The native app now uses store profiles in `mobile-app/brands/`. Copy `store-template.json`, set the store identity, API URL, unique Android package ID, app version/version code, and asset paths, then use `npm run build:apk -- --store=<store-id>`. This removes the need to edit React Native source for each customer brand. The APK still has to be rebuilt and redistributed when its launcher label/icon changes. See `mobile-app/WHITE_LABEL_ANDROID.md`.
