import { readFile } from 'fs/promises';
import path from 'path';
import { query } from '../db';

export async function runMigrations() {
  const schemaPath = path.resolve(__dirname, '..', '..', 'sql', 'schema.sql');
  const sql = await readFile(schemaPath, 'utf8');
  await query(sql);
  console.log('[migrate] schema.sql applied');
}

export default runMigrations;
