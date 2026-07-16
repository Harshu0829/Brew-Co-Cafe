const express = require('express');
const { requireOwner, requireStaff, supabaseAdmin } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/admin/stats — dashboard summary ──────────────────────────────
router.get('/stats', requireStaff, async (req, res, next) => {
  try {
    const today = req.query.date || new Date().toISOString().split('T')[0];

    const [
      { count: ordersToday },
      { data: revenueData },
      { count: pendingReservations },
      { count: activeMenuItems },
    ] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`),
      supabaseAdmin.from('orders').select('total')
        .gte('created_at', `${today}T00:00:00Z`)
        .eq('payment_status', 'paid'),
      supabaseAdmin.from('reservations').select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabaseAdmin.from('menu_items').select('id', { count: 'exact', head: true })
        .eq('is_available', true),
    ]);

    const revenueToday = (revenueData || []).reduce((s, o) => s + parseFloat(o.total), 0);

    res.json({
      orders_today:         ordersToday || 0,
      revenue_today:        Math.round(revenueToday * 100) / 100,
      pending_reservations: pendingReservations || 0,
      active_menu_items:    activeMenuItems || 0,
    });
  } catch (err) { next(err); }
});

// ── GET /api/admin/users — list all users (owner only) ────────────────────
router.get('/users', requireOwner, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, loyalty_stamps, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// ── PATCH /api/admin/users/:id/role — change user role (owner only) ───────
router.patch('/users/:id/role', requireOwner, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['customer','staff','owner'].includes(role))
      return res.status(400).json({ error: 'role must be customer, staff, or owner.' });

    // Prevent owner from accidentally removing their own owner role
    if (req.params.id === req.user.id && role !== 'owner')
      return res.status(400).json({ error: 'Cannot change your own role.' });

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', req.params.id)
      .select('id, name, email, role')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// ── GET /api/admin/promo-codes (owner only) ───────────────────────────────
router.get('/promo-codes', requireOwner, async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// ── POST /api/admin/promo-codes (owner only) ──────────────────────────────
router.post('/promo-codes', requireOwner, async (req, res, next) => {
  try {
    const { code, discount_type, value, min_order_value, max_uses, expires_at } = req.body;
    if (!code || !discount_type || !value)
      return res.status(400).json({ error: 'code, discount_type, and value are required.' });

    const { data, error } = await supabaseAdmin
      .from('promo_codes')
      .insert({ code: code.toUpperCase(), discount_type, value, min_order_value: min_order_value || 0, max_uses, expires_at })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

module.exports = router;
