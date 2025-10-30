/* Simple migration runner: applies sql/schema.sql */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function buildConnectionString() {
  const url = process.env.DATABASE_URL;
  if (url && url.trim().length > 0) return url;
  const user = process.env.DB_USER;
  const host = process.env.DB_HOST;
  const name = process.env.DB_NAME;
  const pass = process.env.DB_PASS || '';
  const port = process.env.DB_PORT || '5432';
  if (user && host && name) {
    const encUser = encodeURIComponent(user);
    const encPass = pass ? `:${encodeURIComponent(pass)}` : '';
    return `postgres://${encUser}${encPass}@${host}:${port}/${name}`;
  }
  return undefined;
}

async function run() {
  const connectionString = buildConnectionString();
  if (!connectionString) {
    console.error('[migrate] DATABASE_URL or DB_* env vars are missing');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const schemaPath = path.resolve(__dirname, '..', 'sql', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  await pool.end();
  console.log('[migrate] schema.sql applied');
}

run().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
