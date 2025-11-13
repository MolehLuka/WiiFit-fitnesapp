# WiiFit Fitness App (Monorepo)

Full-stack app with a TypeScript Express backend (PostgreSQL, JWT, Stripe) and a React + Vite + Tailwind frontend.

## Folders

- `backend/` — API server (Express + TS + PG + JWT + Stripe)
- `frontend/` — Web app (React + Vite + TS + Tailwind)

## Dev quick start (Windows PowerShell)

1) Backend

```powershell
cd backend
Copy-Item .env.example .env
# Edit .env to set DATABASE_URL, JWT_SECRET, STRIPE_* and APP_BASE_URL
npm install
npm run db:migrate
npm run dev
```

2) Frontend

```powershell
cd ../frontend
Copy-Item .env.example .env  # optional; defaults proxy to http://localhost:4000
npm install
npm run dev
```

Open http://localhost:5173

## Stripe (Test mode)

1) Get test API key: Dashboard → Developers → API keys → Secret key → set `STRIPE_SECRET_KEY` in `backend/.env`.

2) Create Products and recurring Prices. Copy each Price ID into the DB `plans.stripe_price_id` (Basic/Plus/Pro) using your DB client or psql.

3) Webhooks locally:

```powershell
# New terminal
stripe listen --forward-to localhost:4000/api/billing/webhook
# Copy the whsec_ secret and set STRIPE_WEBHOOK_SECRET in backend/.env, then restart backend
```

4) Login → Plans → Choose → complete Checkout (use test card 4242 4242 4242 4242). The webhook will set your membership to active.

See `backend/README.md` and `frontend/README.md` for details.