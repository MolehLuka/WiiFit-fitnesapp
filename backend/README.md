# Backend (Express + TypeScript + PostgreSQL + JWT + Stripe)

Express + TypeScript backend wired for PostgreSQL, JWT authentication, public content, schedule, and Stripe subscriptions (Checkout + webhooks).

## Features

- Express + TypeScript with dev hot-reload
- PostgreSQL client via `pg`
- JWT auth with `jsonwebtoken` and logout blacklist
- Password hashing with `bcryptjs`
- CORS, Helmet, and Morgan pre-configured
- Public content: plans and group classes from DB
- Schedule API: upcoming class sessions with filters
- Stripe: create subscription Checkout session and webhook to sync membership
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

3. Create/refresh database schema (choose one):

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

6. (Optional) Auto-apply schema on boot

```powershell
$env:MIGRATE_ON_BOOT="true"; npm run dev
```

## Endpoints

- Health
  - `GET /healthz` -> `{ status: "ok" }`

- Auth
  - `POST /api/auth/register` -> `{ token, user }`
  - `POST /api/auth/login` -> `{ token, user }`
  - `POST /api/auth/logout` -> `{ message }` (blacklists the current JWT)
  - `GET /api/protected/me` -> `{ user, plan|null }`

- Public
  - `GET /api/public/plans` -> `{ plans: Plan[] }`
  - `GET /api/public/classes` -> `{ classes: GroupClass[] }`

- Schedule (requires auth)
  - `GET /api/protected/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD` -> `{ sessions: ClassSession[] }`

- Subscription (requires auth)
  - `POST /api/protected/subscribe-plan` -> App-managed subscription (non-Stripe) for testing
  - `POST /api/billing/create-checkout-session` -> `{ url }` (Stripe Checkout for subscriptions)
  - `POST /api/billing/webhook` -> Stripe webhook (raw body)

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
    public.ts      # /public endpoints (plans & classes)
    billing.ts     # /billing endpoints (Stripe Checkout & webhook)
  types/
    user.ts
sql/
  schema.sql       # All tables: users, jwt_blacklist, plans, group_classes, class_sessions, stripe cols
```

## Stripe setup (Test mode)

1) Keys in `.env`

```powershell
# Required
$env:STRIPE_SECRET_KEY = "sk_test_..."      # Dashboard > Developers > API keys (Test)
$env:APP_BASE_URL = "http://localhost:5173"  # Frontend URL for success/cancel redirects

# For webhook signature verification (see step 3)
$env:STRIPE_WEBHOOK_SECRET = "whsec_..."
```

2) Link your plans to Stripe Prices

Create Products and recurring Prices in Stripe (Test mode). Then set the `stripe_price_id` on each plan row. Example SQL:

```sql
-- Replace price_XXX with your test price IDs from Stripe
UPDATE plans SET stripe_price_id = 'price_basic_123' WHERE name = 'Basic';
UPDATE plans SET stripe_price_id = 'price_plus_456'  WHERE name = 'Plus';
UPDATE plans SET stripe_price_id = 'price_pro_789'   WHERE name = 'Pro';
```

Use your DB client or psql:

```powershell
# psql "$env:DATABASE_URL" -c "UPDATE plans SET stripe_price_id = 'price_...' WHERE name = 'Basic';"
```

3) Run and forward webhooks locally

- Start the backend: `npm run dev`
- Start the frontend: see frontend README, typically `npm run dev` on port 5173
- Install Stripe CLI (https://stripe.com/docs/stripe-cli)
- In a new terminal, forward events to your webhook and capture the secret:

```powershell
stripe listen --forward-to localhost:5000/api/billing/webhook
# Copy the "webhook signing secret" it prints (whsec_...), then set STRIPE_WEBHOOK_SECRET in .env
```

4) Test the flow

- Register/login in the app
- Go to Plans and choose a plan (it calls `/api/billing/create-checkout-session`)
- Complete Checkout with a test card (e.g., 4242 4242 4242 4242)
- Webhook updates `users.membership_status` to `active` and saves `stripe_customer_id`/`stripe_subscription_id`
- `/api/protected/me` now returns your plan details

Troubleshooting:
- If you get `Stripe not configured`, ensure STRIPE_SECRET_KEY is set and the process was restarted
- If `Webhook not configured`, ensure STRIPE_WEBHOOK_SECRET is set and Stripe CLI is forwarding
- If `Plan is not configured for Stripe`, set `stripe_price_id` for that plan in DB
- Verify webhook raw body: route is mounted via `express.raw` in `src/app.ts` before `express.json()`

## Notes

- Set a strong `JWT_SECRET` in `.env`.
- In production, ensure your `DATABASE_URL` SSL settings match your provider. The pool uses SSL when `NODE_ENV=production`.
- Scripts:
  - `npm run dev` -> Start in watch mode (ts-node-dev)
  - `npm run build` -> Emit JS to `dist`
  - `npm start` -> Run compiled build
