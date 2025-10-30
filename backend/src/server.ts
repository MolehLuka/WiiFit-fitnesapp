import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { runMigrations } from './utils/migrate';

async function main() {
  if (process.env.MIGRATE_ON_BOOT === 'true') {
    try {
      await runMigrations();
    } catch (err) {
      console.error('[migrate] failed:', err);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }

  const PORT = Number(process.env.PORT) || 4000;
  const server = app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
  });

  // Graceful shutdown helpers
  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down...');
    server.close(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down...');
    server.close(() => process.exit(0));
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
