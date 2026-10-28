const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { existsSync, readFileSync } = require('node:fs');
const root = path.resolve(__dirname, '..');
const storeArg = process.argv.slice(2).find(v => v.startsWith('--store='));
const profileArg = process.argv.slice(2).find(v => v.startsWith('--profile='));
const storeId = storeArg ? storeArg.slice('--store='.length) : 'anfal';
const profile = profileArg ? profileArg.slice('--profile='.length) : 'preview';
if (!['preview', 'production'].includes(profile)) {
  console.error('Profile must be preview or production.'); process.exit(2);
}
const select = spawnSync(process.execPath, [path.join(root, 'scripts/select-brand.js'), `--store=${storeId}`], { cwd: root, stdio: 'inherit' });
if (select.status !== 0) process.exit(select.status || 2);
const brand = JSON.parse(readFileSync(path.join(root, 'brand.config.json'), 'utf8'));
if (!brand.apiBaseUrl || !/^https:\/\//i.test(brand.apiBaseUrl) || /YOUR-|example/i.test(brand.apiBaseUrl)) {
  console.error('Build blocked: set the real HTTPS API URL in mobile-app/brands/' + storeId + '.json before building a customer-ready APK.');
  process.exit(2);
}
if (!existsSync(path.join(root, 'app.json'))) { console.error('app.json not found.'); process.exit(2); }
const appConfig = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8'));
if (!appConfig.expo?.extra?.eas?.projectId || /REPLACE_WITH_EAS_PROJECT_ID/i.test(appConfig.expo.extra.eas.projectId)) {
  console.error('Build blocked: run `npx eas-cli init` and set the real EAS project ID in app.json before building.');
  process.exit(2);
}
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['--yes', 'eas-cli', 'build', '--platform', 'android', '--profile', profile];
console.log(`Starting EAS Android ${profile} build for ${brand.displayName} (${brand.androidPackage})`);
const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
