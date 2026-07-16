-- =============================================================================
-- 004_reservations_schema.sql
-- Table reservations
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reservations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name      TEXT        NOT NULL,
  guest_email     TEXT        NOT NULL,
  guest_phone     TEXT        NOT NULL,
  date            DATE        NOT NULL,
  time_slot       TEXT        NOT NULL,
  guest_count     INTEGER     NOT NULL CHECK (guest_count BETWEEN 1 AND 12),
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','confirmed','cancelled','no_show')),
  special_request TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS reservations_updated_at ON public.reservations;
CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Users see only their own reservations
DROP POLICY IF EXISTS "users_read_own_reservations" ON public.reservations;
CREATE POLICY "users_read_own_reservations" ON public.reservations
  FOR SELECT USING (auth.uid() = user_id);

-- Staff/owner see all
DROP POLICY IF EXISTS "staff_read_all_reservations" ON public.reservations;
CREATE POLICY "staff_read_all_reservations" ON public.reservations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff','owner'))
  );

-- Anyone can insert (guest bookings + authenticated)
DROP POLICY IF EXISTS "anyone_insert_reservation" ON public.reservations;
CREATE POLICY "anyone_insert_reservation" ON public.reservations
  FOR INSERT WITH CHECK (true);
