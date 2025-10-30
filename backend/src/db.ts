import { Pool, type QueryResultRow } from 'pg';

function buildConnectionString(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (url && url.trim().length > 0) return url;

  const user = process.env.DB_USER;
  const host = process.env.DB_HOST;
  const name = process.env.DB_NAME;
  const pass = process.env.DB_PASS ?? '';
  const port = process.env.DB_PORT ?? '5432';

  if (user && host && name) {
    const encUser = encodeURIComponent(user);
    const encPass = pass ? `:${encodeURIComponent(pass)}` : '';
    return `postgres://${encUser}${encPass}@${host}:${port}/${name}`;
  }
  return undefined;
}

const connectionString = buildConnectionString();

if (!connectionString) {
  // Note: dotenv is loaded in server.ts; this warning is helpful during tests or misconfigurations
  console.warn('[db] DATABASE_URL or DB_* variables are not set. Define them in your .env file.');
}

export const pool = new Pool({
  connectionString,
  // Use SSL in production environments if your provider requires it
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[],
): Promise<{ rows: T[] }> {
  const res = await pool.query<T>(text, params);
  return { rows: res.rows };
}

export default pool;
