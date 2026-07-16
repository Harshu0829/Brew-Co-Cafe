-- =============================================================================
-- 002_orders_schema.sql
-- Orders, order items, and promo codes
-- =============================================================================

-- ── Promo Codes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT        NOT NULL UNIQUE,
  discount_type   TEXT        NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  value           NUMERIC(10,2) NOT NULL CHECK (value > 0),
  min_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses        INTEGER,
  uses_count      INTEGER     NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Orders ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name      TEXT,
  guest_phone     TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','confirmed','preparing','ready','completed','cancelled')),
  pickup_time     TEXT,
  subtotal        NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax             NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  promo_code      TEXT,
  payment_id      TEXT,
  payment_status  TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (payment_status IN ('pending','paid','failed','refunded')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Order Items ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id        UUID        NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  name                TEXT        NOT NULL,  -- snapshot of name at time of order
  unit_price          NUMERIC(10,2) NOT NULL,
  quantity            INTEGER     NOT NULL CHECK (quantity > 0),
  customisation_note  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────────────────
ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Customers see only their own orders
DROP POLICY IF EXISTS "users_read_own_orders" ON public.orders;
CREATE POLICY "users_read_own_orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

-- Staff/owner see all orders
DROP POLICY IF EXISTS "staff_read_all_orders" ON public.orders;
CREATE POLICY "staff_read_all_orders" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff','owner'))
  );

-- Order items visible if the parent order is visible
DROP POLICY IF EXISTS "read_own_order_items" ON public.order_items;
CREATE POLICY "read_own_order_items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('staff','owner'))
  );

-- Anyone authenticated can read active promo codes (to validate on frontend)
DROP POLICY IF EXISTS "authenticated_read_promos" ON public.promo_codes;
CREATE POLICY "authenticated_read_promos" ON public.promo_codes
  FOR SELECT TO authenticated USING (is_active = true);

-- ── Loyalty stamp trigger ─────────────────────────────────────────────────
-- When an order is marked 'completed', increment the customer's loyalty_stamps
CREATE OR REPLACE FUNCTION public.handle_order_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.user_id IS NOT NULL THEN
    UPDATE public.users
    SET loyalty_stamps = CASE
      WHEN loyalty_stamps >= 9 THEN 1   -- reset after free drink earned, starting at 1 for this new order
      ELSE loyalty_stamps + 1
    END
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_completed ON public.orders;
CREATE TRIGGER on_order_completed
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_completed();

-- ── Seed promo codes ──────────────────────────────────────────────────────
INSERT INTO public.promo_codes (code, discount_type, value, min_order_value) VALUES
  ('BREW10',    'percent', 10,  200),
  ('WELCOME50', 'flat',    50,  150),
  ('COFFEE20',  'percent', 20,  400)
ON CONFLICT (code) DO NOTHING;
