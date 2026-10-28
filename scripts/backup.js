'use strict';
require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(process.env.DB_PATH || path.join(__dirname, '..', 'anfal-market.db'));
if (!fs.existsSync(source)) {
  console.error(`Database file not found: ${source}`);
  process.exitCode = 1;
} else {
  const dir = path.resolve(process.env.BACKUP_DIR || path.join(path.dirname(source), 'backups'));
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = path.join(dir, `anfal-market-${stamp}.db`);
  const db = new Database(source, { readonly: true, fileMustExist: true });
  db.backup(destination).then(() => {
    console.log(`SQLite backup created: ${destination}`);
    db.close();
  }).catch((err) => {
    console.error(`Backup failed: ${err.message}`);
    try { db.close(); } catch {}
    process.exitCode = 1;
  });
}
