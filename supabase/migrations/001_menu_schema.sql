-- =============================================================================
-- 001_menu_schema.sql
-- Menu categories and items with dietary tags
-- Run this in Supabase SQL Editor
-- =============================================================================

-- ── Menu Categories ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE,
  slug          TEXT        NOT NULL UNIQUE,
  display_order INTEGER     NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Menu Items ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID        NOT NULL REFERENCES public.menu_categories(id) ON DELETE RESTRICT,
  name            TEXT        NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url       TEXT,
  dietary_tags    TEXT[]      NOT NULL DEFAULT '{}',
  is_available    BOOLEAN     NOT NULL DEFAULT true,
  display_order   INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS menu_items_updated_at ON public.menu_items;
CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items      ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read active menu
DROP POLICY IF EXISTS "public_read_categories" ON public.menu_categories;
CREATE POLICY "public_read_categories" ON public.menu_categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "public_read_menu_items" ON public.menu_items;
CREATE POLICY "public_read_menu_items" ON public.menu_items
  FOR SELECT USING (is_available = true);

-- Only owner can write (INSERT/UPDATE/DELETE) — backend uses service role key
-- Service role key bypasses RLS, so no explicit owner policy needed for backend

-- ── Seed Data ────────────────────────────────────────────────────────────
INSERT INTO public.menu_categories (name, slug, display_order) VALUES
  ('Coffee',      'coffee',      1),
  ('Cold Drinks', 'cold-drinks', 2),
  ('Food',        'food',        3),
  ('Pastries',    'pastries',    4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.menu_items (category_id, name, description, price, dietary_tags, display_order)
SELECT c.id, i.name, i.description, i.price, i.dietary_tags, i.display_order
FROM (VALUES
  ('coffee', 'Signature Espresso',  'Double shot of our house blend, rich and velvety.',            180.00, ARRAY[]::TEXT[],           1),
  ('coffee', 'Oat Flat White',      'Silky oat milk with a smooth espresso base.',                  210.00, ARRAY['Vegan'],             2),
  ('coffee', 'Cappuccino',          'Classic espresso with equal parts steamed and frothed milk.',  190.00, ARRAY[]::TEXT[],           3),
  ('coffee', 'Matcha Latte',        'Ceremonial grade matcha with your choice of milk.',             200.00, ARRAY['Vegan'],             4),
  ('cold-drinks', 'Cold Brew Float','House cold brew topped with vanilla bean ice cream.',           220.00, ARRAY[]::TEXT[],           1),
  ('cold-drinks', 'Mango Iced Tea', 'Chilled green tea with fresh mango purée.',                   160.00, ARRAY['Vegan'],             2),
  ('cold-drinks', 'Classic Lemonade','Freshly squeezed lemon with a hint of mint.',                 140.00, ARRAY['Vegan'],             3),
  ('food', 'Avocado Toast',         'Smashed avo on sourdough with chili flakes.',                  320.00, ARRAY['Vegan'],             1),
  ('food', 'Egg & Cheese Bagel',    'Toasted bagel with scrambled eggs and cheddar.',               280.00, ARRAY[]::TEXT[],           2),
  ('food', 'Grilled Chicken Wrap',  'Herb-marinated chicken with greens and aioli.',                350.00, ARRAY[]::TEXT[],           3),
  ('pastries', 'Almond Croissant',  'Buttery croissant filled with almond frangipane.',             160.00, ARRAY['Gluten-Free'],       1),
  ('pastries', 'Blueberry Muffin',  'Moist muffin packed with wild blueberries.',                  140.00, ARRAY['Vegan'],             2),
  ('pastries', 'Chocolate Brownie', 'Dense, fudgy brownie with sea salt topping.',                  150.00, ARRAY[]::TEXT[],           3)
) AS i(slug, name, description, price, dietary_tags, display_order)
JOIN public.menu_categories c ON c.slug = i.slug
ON CONFLICT DO NOTHING;
