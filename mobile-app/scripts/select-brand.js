const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const arg = process.argv.slice(2).find(value => value.startsWith('--store='));
const storeId = arg?.slice('--store='.length).trim();
if (!storeId || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(storeId)) {
  console.error('Usage: node scripts/select-brand.js --store=anfal');
  process.exit(2);
}
const source = path.join(root, 'brands', `${storeId}.json`);
if (!fs.existsSync(source)) {
  console.error(`No brand profile found: brands/${storeId}.json`);
  console.error('Copy brands/store-template.json to brands/<store-id>.json and update its settings/assets.');
  process.exit(2);
}
let brand;
try { brand = JSON.parse(fs.readFileSync(source, 'utf8')); }
catch (error) { console.error(`Invalid JSON in ${source}: ${error.message}`); process.exit(2); }
if (brand.storeId !== storeId) { console.error(`storeId in ${source} must equal "${storeId}"`); process.exit(2); }
const target = path.join(root, 'brand.config.json');
fs.writeFileSync(target, `${JSON.stringify(brand, null, 2)}\n`, 'utf8');
console.log(`Selected white-label brand: ${brand.displayName} (${brand.storeId})`);
console.log(`Android package: ${brand.androidPackage}`);
console.log(`API URL configured: ${brand.apiBaseUrl}`);
console.log('Launcher name/icon are embedded in the APK; rebuild and redistribute after changing this profile.');
