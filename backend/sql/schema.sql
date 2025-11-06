-- Basic schema for authentication and gym user profile
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  gender TEXT,
  date_of_birth DATE,
  height_cm INTEGER,
  weight_kg NUMERIC(5,2),
  goal TEXT,
  membership_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Make the schema additive/idempotent in case the table already existed
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS height_cm INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_users_plan_id ON users (plan_id);
-- Add FK if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'users' AND c.conname = 'fk_users_plan_id_plans'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_plan_id_plans FOREIGN KEY (plan_id)
      REFERENCES plans(id) ON DELETE SET NULL;
  END IF;
END $$;
-- Keep backwards compatibility if 'name' existed previously
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    EXECUTE 'ALTER TABLE users RENAME COLUMN name TO full_name';
  END IF;
END $$;

-- Table to blacklist JWTs upon logout (stores JTI and expiry)
CREATE TABLE IF NOT EXISTS jwt_blacklist (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  blacklisted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_expires_at ON jwt_blacklist (expires_at);

-- Membership plans (publicly visible)
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Ensure Stripe columns exist on plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Seed default plans (idempotent)
INSERT INTO plans (name, price, currency, description, features, highlighted)
VALUES
  (
    'Basic',
    19.00,
    'USD',
    'Essential access to gym equipment and facilities. Perfect for beginners or those on a budget.',
    ARRAY['Gym floor access','Locker rooms','Open 6am – 10pm'],
    FALSE
  ),
  (
    'Plus',
    39.00,
    'USD',
    'Everything in Basic plus group classes and extended hours. Ideal for regulars who enjoy variety.',
    ARRAY['All Basic features','Unlimited group classes','Open 24/7','1 free PT intro session'],
    TRUE
  ),
  (
    'Pro',
    59.00,
    'USD',
    'For dedicated athletes. Includes personal coaching credits and advanced recovery amenities.',
    ARRAY['All Plus features','2 PT sessions/month','Sauna & recovery tools','Priority support'],
    FALSE
  )
ON CONFLICT (name) DO NOTHING;

-- Group classes (publicly visible)
CREATE TABLE IF NOT EXISTS group_classes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  blurb TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default classes (idempotent)
INSERT INTO group_classes (title, blurb)
VALUES
  (
    'HIIT Blast',
    'Fast-paced, high-intensity intervals designed to burn calories and build endurance in under 45 minutes.'
  ),
  (
    'Strength Circuit',
    'Coach-led circuits focused on compound movements to increase strength, mobility, and confidence.'
  ),
  (
    'Yoga Flow',
    'A mindful session combining breathwork and dynamic poses to improve flexibility and reduce stress.'
  ),
  (
    'Ride & Rhythm',
    'Indoor cycling with music-driven intervals to power cardio fitness and have fun while you sweat.'
  )
ON CONFLICT (title) DO NOTHING;

-- Class sessions (schedule)
CREATE TABLE IF NOT EXISTS class_sessions (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES group_classes(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  capacity INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, starts_at)
);
CREATE INDEX IF NOT EXISTS idx_class_sessions_starts_at ON class_sessions (starts_at);

-- Seed sessions for next 7 days at 08:00 and 18:00 (idempotent)
WITH days AS (
  SELECT generate_series(0,6) AS d
), times AS (
  SELECT unnest(ARRAY['08:00', '18:00'])::time AS t
)
INSERT INTO class_sessions (class_id, starts_at, duration_min, capacity)
SELECT gc.id,
       ((CURRENT_DATE + d)::timestamp + t)::timestamptz AS starts_at,
       60,
       20
FROM group_classes gc
CROSS JOIN days
CROSS JOIN times
ON CONFLICT (class_id, starts_at) DO NOTHING;

-- Ensure Stripe columns exist on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
