-- =============================================================================
-- Migration: 003_user_trigger.sql
--
-- PURPOSE:
--   When Supabase creates a row in auth.users (email signup OR Google OAuth),
--   automatically create a matching row in public.users with default values.
--
-- WHY THIS IS NEEDED:
--   auth.users is Supabase-managed — you can't customise it directly.
--   public.users is YOUR table — it has role, loyalty_stamps, phone, etc.
--   The trigger bridges the two so you never have to manually create a profile.
--
-- DATA WRITTEN HERE:
--   public.users.id             ← copied from auth.users.id (UUID, FK)
--   public.users.email          ← copied from auth.users.email
--   public.users.name           ← from raw_user_meta_data->>'full_name' (set on signUp)
--                                  Google OAuth sets this automatically
--   public.users.role           ← default 'customer' (owner changes via admin)
--   public.users.loyalty_stamps ← default 0
--   public.users.created_at     ← now()
-- =============================================================================

-- ── 1. Ensure the public.users table exists ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL UNIQUE,
  name            TEXT,
  phone           TEXT,
  role            TEXT        NOT NULL DEFAULT 'customer'
                              CHECK (role IN ('customer', 'staff', 'owner')),
  loyalty_stamps  INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Enable Row Level Security ──────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read only their own row
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update only their own row (name, phone only — not role)
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Staff and owner can see all users
DROP POLICY IF EXISTS "staff_select_all_users" ON public.users;
CREATE POLICY "staff_select_all_users"
  ON public.users FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('staff', 'owner')
  );

-- ── 3. Trigger function ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                    -- runs with DB owner privileges
SET search_path = public            -- prevent search_path injection
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, loyalty_stamps)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',   -- set by signUp options.data
      NEW.raw_user_meta_data->>'name',         -- set by Google OAuth
      split_part(NEW.email, '@', 1)            -- fallback: email prefix
    ),
    'customer',
    0
  )
  ON CONFLICT (id) DO NOTHING;       -- idempotent — safe to run multiple times
  RETURN NEW;
END;
$$;

-- ── 4. Attach trigger to auth.users ──────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 5. Grant necessary permissions ───────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
