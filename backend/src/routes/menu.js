const express = require('express');
const { supabaseAdmin, requireOwner } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/menu/categories ──────────────────────────────────────────────
router.get('/categories', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('menu_categories')
      .select('id, name, slug, display_order')
      .eq('is_active', true)
      .order('display_order');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// ── GET /api/menu/items?category=coffee&dietary=Vegan&q=espresso ──────────
router.get('/items', async (req, res, next) => {
  try {
    let query = supabaseAdmin
      .from('menu_items')
      .select(`
        id, name, description, price, image_url,
        dietary_tags, is_available, display_order,
        category:menu_categories(id, name, slug)
      `)
      .order('display_order');

    if (req.query.category) {
      // Filter by category slug
      const { data: cat } = await supabaseAdmin
        .from('menu_categories')
        .select('id')
        .eq('slug', req.query.category)
        .single();
      if (cat) query = query.eq('category_id', cat.id);
    }

    if (req.query.dietary) {
      // dietary is comma-separated: Vegan,Gluten-Free
      const tags = req.query.dietary.split(',').map((t) => t.trim());
      query = query.contains('dietary_tags', tags);
    }

    if (req.query.q) {
      const sanitizedQ = req.query.q.replace(/[%_]/g, '\\$&');
      query = query.ilike('name', `%${sanitizedQ}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// ── GET /api/menu/items/:id ───────────────────────────────────────────────
router.get('/items/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .select('*, category:menu_categories(id,name,slug)')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Item not found.' });
    res.json(data);
  } catch (err) { next(err); }
});

// ── POST /api/menu/items (owner only) ─────────────────────────────────────
router.post('/items', requireOwner, async (req, res, next) => {
  try {
    const { name, description, price, category_id, dietary_tags, image_url } = req.body;
    if (!name || !price || !category_id)
      return res.status(400).json({ error: 'name, price, and category_id are required.' });

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .insert({ name, description, price, category_id, dietary_tags: dietary_tags || [], image_url })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// ── PATCH /api/menu/items/:id (owner only) ────────────────────────────────
router.patch('/items/:id', requireOwner, async (req, res, next) => {
  try {
    const allowed = ['name','description','price','dietary_tags','is_available','image_url','display_order'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    if (!Object.keys(updates).length)
      return res.status(400).json({ error: 'No valid fields to update.' });

    const { data, error } = await supabaseAdmin
      .from('menu_items')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// ── DELETE /api/menu/items/:id → soft delete (owner only) ─────────────────
router.delete('/items/:id', requireOwner, async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('menu_items')
      .update({ is_available: false })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Item hidden from menu.' });
  } catch (err) { next(err); }
});

module.exports = router;
