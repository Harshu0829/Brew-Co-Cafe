const express  = require('express');
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const { requireAuth, supabaseAdmin } = require('../middleware/auth');

const router = express.Router();

// Lazy-initialise Razorpay so missing keys don't crash the server at startup
let _razorpay = null;
function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID) {
    throw Object.assign(new Error('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env'), { status: 503 });
  }
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}


// ── POST /api/payments/create-order ───────────────────────────────────────
// Creates a Razorpay order for the given Brew & Co order.
// The frontend uses the razorpay_order_id to open the Razorpay checkout widget.
router.post('/create-order', requireAuth, async (req, res, next) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id is required.' });

    // Fetch order from DB (server-side price — never trust client-side amount)
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, total, user_id, payment_status')
      .eq('id', order_id)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Order not found.' });
    if (order.user_id !== req.user.id)
      return res.status(403).json({ error: 'Access denied.' });
    if (order.payment_status === 'paid')
      return res.status(400).json({ error: 'Order already paid.' });

    // Amount in paise (Razorpay uses smallest currency unit)
    // parseFloat() needed: Supabase returns NUMERIC columns as strings in JS
    const amountPaise = Math.round(parseFloat(order.total) * 100);

    const razorpayOrder = await getRazorpay().orders.create({
      amount:   amountPaise,
      currency: 'INR',
      receipt:  order_id,
      notes:    { brew_order_id: order_id },
    });

    res.json({
      razorpay_order_id: razorpayOrder.id,
      amount:            amountPaise,
      currency:          'INR',
      key_id:            process.env.RAZORPAY_KEY_ID,  // safe to expose (public key)
    });
  } catch (err) { next(err); }
});

// ── POST /api/payments/verify ─────────────────────────────────────────────
// HMAC-SHA256 signature verification — called after Razorpay payment succeeds.
// If valid, marks the order as paid in DB.
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      brew_order_id,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !brew_order_id)
      return res.status(400).json({ error: 'Missing payment verification fields.' });

    // Compute expected signature
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    // Timing-safe comparison to prevent HMAC timing attacks on payment verification
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(razorpay_signature, 'hex');
    const isValid = expectedBuf.length === signatureBuf.length &&
      crypto.timingSafeEqual(expectedBuf, signatureBuf);
    if (!isValid)
      return res.status(400).json({ error: 'Payment signature verification failed.' });

    // Mark order as paid
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        payment_id:     razorpay_payment_id,
        payment_status: 'paid',
        status:         'confirmed',
      })
      .eq('id', brew_order_id)
      .eq('user_id', req.user.id)   // extra guard
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, order_id: data.id, status: data.status });
  } catch (err) { next(err); }
});

module.exports = router;
