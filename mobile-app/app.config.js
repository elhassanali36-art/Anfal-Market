const fs = require('node:fs');
const path = require('node:path');

const brandPath = path.join(__dirname, 'brand.config.json');
const brand = JSON.parse(fs.readFileSync(brandPath, 'utf8'));
const required = ['storeId', 'displayName', 'slug', 'scheme', 'androidPackage', 'apiBaseUrl', 'appVersion', 'primaryColor', 'icon', 'adaptiveIconForeground', 'splashImage'];
for (const key of required) {
  if (typeof brand[key] !== 'string' || !brand[key].trim()) throw new Error(`Missing required brand setting: ${key}`);
}
if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,62}$/.test(brand.androidPackage) || !brand.androidPackage.includes('.')) {
  throw new Error('androidPackage must be a reverse-DNS Android application ID, e.g. com.company.shop');
}
if (!/^#[0-9a-fA-F]{6}$/.test(brand.primaryColor)) throw new Error('primaryColor must be a HEX color such as #16794b');
for (const key of ['icon', 'adaptiveIconForeground', 'splashImage']) {
  if (!fs.existsSync(path.resolve(__dirname, brand[key]))) throw new Error(`Brand asset not found (${key}): ${brand[key]}`);
}

module.exports = ({ config }) => ({
  ...config,
  name: brand.displayName,
  version: brand.appVersion,
  slug: brand.slug,
  scheme: brand.scheme,
  icon: brand.icon,
  android: {
    ...config.android,
    package: brand.androidPackage,
    versionCode: Number.isInteger(brand.androidVersionCode) && brand.androidVersionCode > 0 ? brand.androidVersionCode : 1,
    adaptiveIcon: {
      ...(config.android?.adaptiveIcon || {}),
      backgroundColor: brand.primaryColor,
      foregroundImage: brand.adaptiveIconForeground,
    },
  },
  splash: {
    ...(config.splash || {}),
    image: brand.splashImage,
    backgroundColor: brand.primaryColor,
    resizeMode: 'contain',
  },
  extra: {
    ...(config.extra || {}),
    apiBaseUrl: brand.apiBaseUrl,
    whiteLabel: {
      storeId: brand.storeId,
      displayName: brand.displayName,
      primaryColor: brand.primaryColor,
    },
  },
});
