import 'dotenv/config';
import { query } from '../src/db';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8');
    await query(sql);
    console.log('[migrate] schema.sql applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('[migrate] error:', err);
    process.exit(1);
  }
}

migrate();
