# Android release checklist

## Configuration
- [ ] Select the intended store profile in `brands/<store-id>.json`; ensure package ID is unique for each separately published store.
- [ ] Confirm profile icon/adaptive icon/splash files exist and are the intended store artwork.
- [ ] Deploy the existing Express API with durable SQLite storage and HTTPS.
- [ ] Verify `/api/health` and `/api/store` from a phone-accessible network.
- [ ] Replace the placeholder API URL in `brands/<store-id>.json` with the real deployed HTTPS API URL.
- [ ] Run `npx eas-cli init`, set the real EAS project ID in `app.json`, and confirm the permanent Android package ID.
- [ ] Select the store profile and run `npm run build:apk -- --store=<store-id>` for the preview APK.
- [ ] Configure app icon, adaptive icon artwork, splash screen, and final store branding before publishing.

## External verification (deferred until implementation is frozen)
- [ ] Install the EAS preview APK on a physical Android phone.
- [ ] Confirm Arabic text, RTL alignment, status bar, category scrolling, and product layout.
- [ ] Confirm API errors are readable when the server is unavailable.
- [ ] Test category filters, product search, image loading, pull-to-refresh, and stock display.
- [ ] Test regular and half-kilogram cart increments, stock limits, and removal from cart.
- [ ] Test delivery and pickup checkout, all enabled payment options, minimum order, delivery fee bounds, and server-side total calculation.
- [ ] Confirm order appears in the existing web admin and stock changes correctly.
- [ ] Test duplicate taps / weak network behavior and ensure users can recover from failed requests.
- [ ] Test on the oldest supported Android version and at least one current Android version.
- [ ] Review privacy policy, app permissions, data handling, store identity, and release signing.
- [ ] Record actual device, OS version, APK version, API environment, results, and any defects.

No items in the external verification section are claimed passed by this source checkpoint.
