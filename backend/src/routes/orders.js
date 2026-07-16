const express = require('express');
const { requireAuth, requireStaff, supabaseAdmin } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/orders — create a new order ─────────────────────────────────
// Auth optional — supports both logged-in and guest orders
router.post('/', async (req, res, next) => {
  try {
    const {
      items,           // [{ menu_item_id, quantity, customisation_note }]
      pickup_time,
      promo_code,
      guest_name,
      guest_phone,
    } = req.body;

    if (!items?.length)
      return res.status(400).json({ error: 'Order must contain at least one item.' });

    // ── Validate and price each item from DB ─────────────────────────────
    const itemIds = items.map((i) => i.menu_item_id);
    const { data: dbItems, error: itemsErr } = await supabaseAdmin
      .from('menu_items')
      .select('id, name, price, is_available')
      .in('id', itemIds);
    if (itemsErr) throw itemsErr;

    if (dbItems.length !== itemIds.length) {
      return res.status(400).json({ error: 'One or more items in the order do not exist.' });
    }

    const unavailable = dbItems.filter((i) => !i.is_available);
    if (unavailable.length)
      return res.status(400).json({
        error: `These items are currently unavailable: ${unavailable.map((i) => i.name).join(', ')}`
      });

    // Build priced line items
    const lineItems = items.map((item) => {
      const dbItem = dbItems.find((d) => d.id === item.menu_item_id);
      if (!dbItem) throw Object.assign(new Error(`Item ${item.menu_item_id} not found`), { status: 400 });
      return {
        menu_item_id: item.menu_item_id,
        name:         dbItem.name,
        unit_price:   dbItem.price,
        quantity:     item.quantity,
        customisation_note: item.customisation_note || null,
      };
    });

    let subtotal = lineItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    let discount = 0;

    // ── Validate promo code ───────────────────────────────────────────────
    if (promo_code) {
      const { data: promo } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('code', promo_code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (promo && subtotal >= promo.min_order_value) {
        if (!promo.max_uses || promo.uses_count < promo.max_uses) {
          discount = promo.discount_type === 'flat'
            ? promo.value
            : Math.round(subtotal * promo.value / 100);
          // Increment usage
          await supabaseAdmin
            .from('promo_codes')
            .update({ uses_count: promo.uses_count + 1 })
            .eq('id', promo.id);
        }
      }
    }

    // Clamp before computing tax to prevent negative values
    const taxable = Math.max(0, subtotal - discount);
    const tax   = Math.round(taxable * 0.05 * 100) / 100;
    const total = taxable + tax;

    // Determine user_id from auth token (optional)
    let user_id = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.split(' ')[1]);
      if (user) user_id = user.id;
    }

    // ── Insert order ──────────────────────────────────────────────────────
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id, guest_name, guest_phone,
        pickup_time, promo_code: promo_code?.toUpperCase() || null,
        subtotal, discount, tax, total,
      })
      .select()
      .single();
    if (orderErr) throw orderErr;

    // ── Insert order items ────────────────────────────────────────────────
    const { error: itemsInsertErr } = await supabaseAdmin
      .from('order_items')
      .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));
    if (itemsInsertErr) {
      // Rollback order creation to prevent orphaned order
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      throw itemsInsertErr;
    }

    res.status(201).json({
      order_id: order.id,
      status:   order.status,
      total:    order.total,
      pickup_time: order.pickup_time,
    });
  } catch (err) { next(err); }
});

// ── GET /api/orders/:id ───────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`*, items:order_items(id, name, unit_price, quantity, customisation_note, menu_item_id)`)
      .eq('id', req.params.id)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Order not found.' });

    // Ensure requester owns the order or is staff
    const isOrderOwner = order.user_id === req.user.id;
    const isStaff = ['staff', 'owner'].includes(req.user.role);
    if (!isOrderOwner && !isStaff)
      return res.status(403).json({ error: 'Access denied.' });

    res.json(order);
  } catch (err) { next(err); }
});

// ── GET /api/orders (staff sees all, customer sees own) ───────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const isStaff = ['staff', 'owner'].includes(req.user.role);
    let query = supabaseAdmin
      .from('orders')
      .select(`
        id, status, total, pickup_time, created_at, guest_name, user_id, payment_status,
        items:order_items(id, name, quantity, customisation_note)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!isStaff) query = query.eq('user_id', req.user.id);

    if (req.query.status) query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// ── PATCH /api/orders/:id/status (staff only) ─────────────────────────────
router.patch('/:id/status', requireStaff, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending','confirmed','preparing','ready','completed','cancelled'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
