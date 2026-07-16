-- =============================================================================
-- 005_reviews_schema.sql
-- Customer reviews and ratings (linked to completed orders)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id    UUID        REFERENCES public.orders(id) ON DELETE SET NULL,
  rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_visible  BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible reviews
DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews" ON public.reviews
  FOR SELECT USING (is_visible = true);

-- Users can insert their own reviews
DROP POLICY IF EXISTS "users_insert_own_review" ON public.reviews;
CREATE POLICY "users_insert_own_review" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own review
DROP POLICY IF EXISTS "users_update_own_review" ON public.reviews;
CREATE POLICY "users_update_own_review" ON public.reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =============================================================================
-- 006_promo_codes_schema.sql is already handled in 002_orders_schema.sql
-- This file intentionally left minimal
-- =============================================================================
