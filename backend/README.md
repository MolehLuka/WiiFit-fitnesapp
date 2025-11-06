# Backend (Express + TypeScript + PostgreSQL + JWT)

This is a minimal Express TypeScript backend template wired for PostgreSQL and JWT authentication.

## Features

- Express + TypeScript with dev hot-reload
- PostgreSQL client via `pg`
- JWT auth with `jsonwebtoken`
- Password hashing with `bcryptjs`
- CORS, Helmet, and Morgan pre-configured
- Basic auth routes: `POST /api/auth/register`, `POST /api/auth/login`
- Sample protected route: `GET /api/protected/me`
- Health check: `GET /healthz`

## Quick start (Windows PowerShell)

1. Copy env file and fill values:

```powershell
Copy-Item .env.example .env
# Then edit .env to set DATABASE_URL and JWT_SECRET
```

2. Install dependencies:

```powershell
cd backend
npm install
```

3. Create database schema (choose one):

- One-off command:

  ```powershell
  npm run db:migrate
  ```

- Or manually in your DB client:
  - Ensure your `DATABASE_URL` database exists
  - Apply `sql/schema.sql` to create the `users` table

Example (psql):

```powershell
# Optional: only if you use psql locally
# psql "$env:DATABASE_URL" -f .\sql\schema.sql
```

4. Optional: auto-run migrations on server boot

```powershell
$env:MIGRATE_ON_BOOT="true"; npm run dev
```

5. Start the dev server:

```powershell
npm run dev
```

Server runs on `http://localhost:4000` by default.

## Endpoints

- `GET /healthz` -> `{ status: "ok" }`
- `POST /api/auth/register` -> `{ token, user }`
  - Body: `{ "email": "user@example.com", "password": "secret", "name": "Jane" }`
- `POST /api/auth/login` -> `{ token, user }`
  - Body: `{ "email": "user@example.com", "password": "secret" }`
- `GET /api/protected/me` -> requires `Authorization: Bearer <token>`

## Project structure

```
src/
  app.ts           # Express app and middleware
  server.ts        # Bootstrap and listen
  db.ts            # pg Pool and query helper
  controllers/
    authController.ts
  middleware/
    auth.ts        # JWT Bearer validator
  routes/
    index.ts       # Mount all routes under /api
    auth.ts        # /auth endpoints
    protected.ts   # /protected endpoints (requires JWT)
  types/
    user.ts
sql/
  schema.sql       # Create users table
```

## Notes

- Set a strong `JWT_SECRET` in `.env`.
- In production, ensure your `DATABASE_URL` SSL settings match your provider. The pool uses SSL when `NODE_ENV=production`.
- Scripts:
  - `npm run dev` -> Start in watch mode (ts-node-dev)
  - `npm run build` -> Emit JS to `dist`
  - `npm start` -> Run compiled build
