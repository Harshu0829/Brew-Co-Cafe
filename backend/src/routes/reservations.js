const express = require('express');
const { supabaseAdmin } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/reservations ────────────────────────────────────────────────
// Public — supports both guest and logged-in bookings
router.post('/', async (req, res, next) => {
  try {
    const { guest_name, guest_email, guest_phone, date, time_slot, guest_count, special_request } = req.body;

    // Basic validation
    if (!guest_name || !guest_email || !guest_phone || !date || !time_slot || !guest_count)
      return res.status(400).json({ error: 'All required fields must be provided.' });

    if (guest_count < 1 || guest_count > 12)
      return res.status(400).json({ error: 'Guest count must be between 1 and 12.' });

    // Check for duplicate booking in same slot (max 4 simultaneous bookings)
    const { count, error: countErr } = await supabaseAdmin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('date', date)
      .eq('time_slot', time_slot)
      .not('status', 'eq', 'cancelled');

    if (countErr) throw countErr;  // don't silently allow bookings if the check fails
    if ((count ?? 0) >= 4)
      return res.status(409).json({ error: 'This time slot is fully booked. Please choose another.' });

    // Resolve user_id if authenticated
    let user_id = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.split(' ')[1]);
      if (user) user_id = user.id;
    }

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .insert({ user_id, guest_name, guest_email, guest_phone, date, time_slot, guest_count: parseInt(guest_count), special_request })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({
      reservation_id: data.id,
      status: data.status,
      message: `Reservation confirmed for ${guest_name} on ${date} at ${time_slot}.`,
    });
  } catch (err) { next(err); }
});

// ── GET /api/reservations (staff only) ───────────────────────────────────
const { requireStaff } = require('../middleware/auth');

router.get('/', requireStaff, async (req, res, next) => {
  try {
    let query = supabaseAdmin
      .from('reservations')
      .select('*')
      .order('date')
      .order('time_slot');

    if (req.query.date)   query = query.eq('date', req.query.date);
    if (req.query.status) query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// ── PATCH /api/reservations/:id/status (staff only) ──────────────────────
router.patch('/:id/status', requireStaff, async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['pending','confirmed','cancelled','no_show'];
    if (!valid.includes(status))
      return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });

    const { data, error } = await supabaseAdmin
      .from('reservations')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
