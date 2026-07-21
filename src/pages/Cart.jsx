import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Minus, Plus, Trash2, ShoppingBag, Tag, Clock,
  ArrowRight, Loader2, AlertCircle, ChevronRight,
  Coffee, Shield, Zap, Gift, User, Phone,
} from 'lucide-react';
import { useCartStore, selectSubtotal, selectDiscount, selectTotal } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { createOrder, createPaymentOrder, verifyPayment } from '@/lib/api';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const PICKUP_SLOTS = [
  'ASAP (~20 min)', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM',
];

const STEPS = ['Your Cart', 'Details', 'Payment'];

/* ─── Razorpay dynamic script loader ─────────────────────────────────────── */

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) { resolve(true); return; }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StepIndicator({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '2.5rem' }}>
      {STEPS.map((label, i) => {
        const active  = i === step;
        const done    = i < step;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.875rem',
                background: done
                  ? 'linear-gradient(135deg,#D4860B,#F0A832)'
                  : active
                    ? 'rgba(212,134,11,0.15)'
                    : 'rgba(44,24,16,0.6)',
                border: active
                  ? '2px solid var(--color-amber)'
                  : done
                    ? 'none'
                    : '2px solid rgba(212,134,11,0.2)',
                color: done ? '#1A0F0A' : active ? 'var(--color-amber)' : 'rgba(245,230,211,0.3)',
                transition: 'all 0.3s ease',
                boxShadow: active ? '0 0 0 4px rgba(212,134,11,0.12)' : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: active ? 700 : 400,
                color: active ? 'var(--color-amber)' : done ? 'rgba(245,230,211,0.7)' : 'rgba(245,230,211,0.3)',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 64, height: 2, margin: '0 0.25rem', marginBottom: '1.2rem',
                background: i < step
                  ? 'linear-gradient(90deg,#D4860B,#F0A832)'
                  : 'rgba(212,134,11,0.15)',
                transition: 'background 0.4s ease',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CartItemCard({ item, onRemove, onUpdateQty, onSetNote }) {
  const [noteOpen, setNoteOpen] = useState(!!item.customisation_note);

  return (
    <div
      className="card animate-fade-in-up"
      style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Emoji / image */}
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--radius-md)',
          background: 'rgba(212,134,11,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.75rem', flexShrink: 0,
        }}>
          {item.emoji || '☕'}
        </div>

        {/* Name + price */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-cream-100)', lineHeight: 1.3 }}>
            {item.name}
          </p>
          <p style={{ margin: '0.15rem 0 0', color: 'var(--color-amber)', fontWeight: 700, fontSize: '0.9rem' }}>
            ₹{item.price}
          </p>
        </div>

        {/* Qty controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <button
            id={`qty-minus-${item.id}`}
            onClick={() => onUpdateQty(item.id, item.quantity - 1)}
            style={{
              width: 30, height: 30, borderRadius: '50%', border: '1.5px solid rgba(212,134,11,0.3)',
              background: 'rgba(44,24,16,0.6)', color: 'var(--color-cream-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            <Minus size={12} />
          </button>
          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}>
            {item.quantity}
          </span>
          <button
            id={`qty-plus-${item.id}`}
            onClick={() => onUpdateQty(item.id, item.quantity + 1)}
            style={{
              width: 30, height: 30, borderRadius: '50%', border: '1.5px solid rgba(212,134,11,0.3)',
              background: 'rgba(44,24,16,0.6)', color: 'var(--color-cream-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Item total + delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: 52, textAlign: 'right' }}>
            ₹{item.price * item.quantity}
          </span>
          <button
            id={`remove-${item.id}`}
            onClick={() => onRemove(item.id)}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: 'rgba(192,0,0,0.1)', color: '#f87171',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Customisation note toggle */}
      <div>
        {!noteOpen ? (
          <button
            onClick={() => setNoteOpen(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', color: 'rgba(212,134,11,0.7)',
              padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            + Add customisation note
          </button>
        ) : (
          <input
            type="text"
            placeholder="e.g. extra hot, no sugar, oat milk…"
            value={item.customisation_note || ''}
            onChange={(e) => onSetNote(item.id, e.target.value)}
            style={{
              width: '100%', background: 'rgba(44,24,16,0.4)',
              border: '1px solid rgba(212,134,11,0.15)', borderRadius: 'var(--radius-sm)',
              color: 'rgba(245,230,211,0.8)', fontSize: '0.8rem',
              padding: '0.45rem 0.75rem', outline: 'none', fontFamily: 'var(--font-body)',
            }}
          />
        )}
      </div>
    </div>
  );
}

function TrustBadges() {
  const badges = [
    { Icon: Shield, label: 'Secure Payment' },
    { Icon: Zap,    label: 'Quick Pickup'   },
    { Icon: Gift,   label: 'Earn Rewards'   },
  ];
  return (
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
      {badges.map(({ Icon, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'rgba(245,230,211,0.45)' }}>
          <Icon size={13} style={{ color: 'rgba(212,134,11,0.5)' }} />
          {label}
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { items, removeItem, updateQty, promoCode, setPromoCode, clearPromo,
    pickupTime, setPickupTime, clearCart, setNote } = useCartStore();

  const subtotal = useCartStore(selectSubtotal);
  const discount = useCartStore(selectDiscount);
  const total    = useCartStore(selectTotal);
  const tax      = Math.round(Math.max(0, subtotal - discount) * 0.05);

  /* step: 0 = cart, 1 = details, 2 = payment (handled by Razorpay modal) */
  const [step, setStep] = useState(0);

  /* Promo */
  const [promoInput,   setPromoInput]   = useState('');
  const [promoError,   setPromoError]   = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  /* Guest */
  const [guestName,  setGuestName]  = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  /* Global */
  const [loading,       setLoading]       = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  /* ── Promo ──────────────────────────────────────────────────────────── */

  const handleApplyPromo = useCallback(async () => {
    setPromoError(''); setPromoSuccess('');
    if (!promoInput.trim()) return;
    if (!user) { setPromoError('Please log in to use promo codes.'); return; }

    setPromoLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoInput.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) { setPromoError('Invalid or expired promo code.'); return; }

      if (subtotal < parseFloat(data.min_order_value)) {
        setPromoError(`Minimum order of ₹${data.min_order_value} required.`);
        return;
      }
      if (data.max_uses && data.uses_count >= data.max_uses) {
        setPromoError('This code has reached its usage limit.');
        return;
      }

      const val  = parseFloat(data.value);
      const disc = data.discount_type === 'flat' ? val : Math.round(subtotal * val / 100);
      setPromoCode(data.code, disc);
      setPromoSuccess(`${data.code} applied — you saved ₹${disc}!`);
      setPromoInput('');
    } catch { setPromoError('Error verifying promo code.'); }
    finally  { setPromoLoading(false); }
  }, [promoInput, user, subtotal, setPromoCode]);

  /* ── Step 0 → 1 validation ──────────────────────────────────────────── */

  const goToDetails = () => {
    setCheckoutError('');
    if (items.length === 0) { setCheckoutError('Your cart is empty.'); return; }
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Final checkout (step 1 → Razorpay or guest) ────────────────────── */

  const handleCheckout = async () => {
    setCheckoutError('');

    if (!pickupTime) { setCheckoutError('Please select a pickup time.'); return; }

    if (!user) {
      if (!guestName.trim() || !guestPhone.trim()) {
        setCheckoutError('Please enter your name and phone number.');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(guestPhone.trim())) {
        setCheckoutError('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
    }

    try {
      setLoading(true);
      setStep(2);

      const orderPayload = {
        items: items.map((i) => ({
          menu_item_id: i.id,
          quantity: i.quantity,
          customisation_note: i.customisation_note || null,
        })),
        pickup_time: pickupTime,
        promo_code:  promoCode,
      };
      if (!user) {
        orderPayload.guest_name  = guestName.trim();
        orderPayload.guest_phone = guestPhone.trim();
      }

      const orderRes = await createOrder(orderPayload);
      const orderId  = orderRes.order_id;

      /* Guest — skip Razorpay, pay on pickup */
      if (!user) {
        localStorage.setItem(`brewco-guest-order-${orderId}`, JSON.stringify({
          id: orderId, status: 'pending', pickup_time: pickupTime, total,
          items: items.map((i) => ({ name: i.name, quantity: i.quantity, unit_price: i.price })),
        }));
        clearCart();
        navigate(`/orders/${orderId}`);
        return;
      }

      /* Auth user — Razorpay flow */
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setCheckoutError('Failed to load payment gateway. Check your connection and try again.');
        setLoading(false); setStep(1);
        return;
      }

      const paymentOrder = await createPaymentOrder(orderId);

      const options = {
        key:         paymentOrder.key_id,
        amount:      paymentOrder.amount,
        currency:    paymentOrder.currency,
        name:        'Brew & Co Café',
        description: `Order #${orderId.slice(0, 8)}`,
        image:       '', // optional logo URL
        order_id:    paymentOrder.razorpay_order_id,
        handler: async (response) => {
          try {
            setLoading(true);
            await verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              brew_order_id:       orderId,
            });
          } catch (err) {
            console.error('Payment verification failed:', err);
          } finally {
            clearCart();
            navigate(`/orders/${orderId}`);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStep(1);
            setCheckoutError('Payment was cancelled. Your cart is still saved — retry when ready.');
          },
        },
        prefill: {
          name:    user.name    || '',
          email:   user.email   || '',
          contact: user.phone   || '',
        },
        theme: { color: '#D4860B' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      setCheckoutError(err.message || 'Checkout failed. Please try again.');
      setLoading(false);
      setStep(1);
    }
  };

  /* ── Empty cart ─────────────────────────────────────────────────────── */

  if (items.length === 0 && step === 0) {
    return (
      <div className="section container" style={{ textAlign: 'center', paddingTop: '5rem', maxWidth: 480 }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%', margin: '0 auto 1.5rem',
          background: 'rgba(212,134,11,0.08)', border: '2px dashed rgba(212,134,11,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShoppingBag size={40} style={{ color: 'rgba(212,134,11,0.4)' }} />
        </div>
        <h1 className="font-display" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
          Your cart is empty
        </h1>
        <p style={{ color: 'rgba(245,230,211,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
          Looks like you haven't added anything yet.<br />
          Browse our menu and find something delicious.
        </p>
        <Link to="/menu" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
          <Coffee size={16} /> Browse Menu
        </Link>
      </div>
    );
  }

  /* ── Order Summary panel (shared across steps) ─────────────────────── */

  const OrderSummaryPanel = () => (
    <div className="card" style={{ padding: '1.75rem', position: 'sticky', top: '6.5rem' }}>
      <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Coffee size={16} style={{ color: 'var(--color-amber)' }} />
        Order Summary
      </h3>

      {/* Mini item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
        {items.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'rgba(245,230,211,0.7)' }}>
              {item.name}
              <span style={{ color: 'rgba(212,134,11,0.6)', marginLeft: '0.3rem' }}>×{item.quantity}</span>
            </span>
            <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Promo (only shown to logged-in users on step 0) */}
      {user && step === 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'rgba(245,230,211,0.7)' }}>
            <Tag size={13} style={{ color: 'var(--color-amber)' }} /> Promo Code
          </label>
          {promoCode ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.85rem', background: 'rgba(26,127,55,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(26,127,55,0.2)' }}>
              <span style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 600 }}>🎉 {promoCode}</span>
              <button onClick={() => { clearPromo(); setPromoSuccess(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '0.75rem', padding: 0 }}>
                Remove
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="promo-code"
                className="input"
                placeholder="Enter code…"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
              />
              <button
                onClick={handleApplyPromo}
                disabled={promoLoading}
                className="btn btn-secondary"
                style={{ flexShrink: 0, fontSize: '0.82rem', padding: '0.5rem 1rem' }}
              >
                {promoLoading ? <Loader2 size={13} className="animate-spin" /> : 'Apply'}
              </button>
            </div>
          )}
          {promoError   && <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.3rem' }}>{promoError}</p>}
          {promoSuccess  && <p style={{ color: '#4ade80', fontSize: '0.75rem', marginTop: '0.3rem' }}>{promoSuccess}</p>}
        </div>
      )}

      <div className="divider" style={{ margin: '0.75rem 0' }} />

      {/* Price breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
        {[
          ['Subtotal',  `₹${subtotal}`],
          ...(discount > 0 ? [['Discount', `-₹${discount}`]] : []),
          ['GST (5%)', `₹${tax}`],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgba(245,230,211,0.55)' }}>
            <span>{lbl}</span>
            <span style={{ color: lbl === 'Discount' ? '#4ade80' : 'inherit' }}>{val}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', marginTop: '0.4rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(212,134,11,0.12)' }}>
          <span>Total</span>
          <span style={{ color: 'var(--color-amber)' }}>₹{total}</span>
        </div>
      </div>

      {/* CTA */}
      {step === 0 && (
        <button
          id="go-to-details-btn"
          className="btn btn-primary"
          onClick={goToDetails}
          style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
        >
          Proceed <ChevronRight size={16} />
        </button>
      )}

      {step === 1 && (
        <button
          id="checkout-btn"
          className="btn btn-primary"
          onClick={handleCheckout}
          disabled={loading}
          style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
        >
          {loading
            ? <><Loader2 className="animate-spin" size={16} /> Processing…</>
            : user
              ? <><Shield size={15} /> Pay ₹{total} Securely</>
              : <><ArrowRight size={15} /> Place Order</>
          }
        </button>
      )}

      {step === 2 && (
        <div style={{ textAlign: 'center', padding: '0.5rem', color: 'rgba(245,230,211,0.6)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Loader2 size={15} className="animate-spin" style={{ color: 'var(--color-amber)' }} />
          Awaiting payment…
        </div>
      )}

      {/* Error */}
      {checkoutError && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', color: '#f87171', fontSize: '0.78rem', marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(192,0,0,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(192,0,0,0.2)' }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{checkoutError}</span>
        </div>
      )}

      <TrustBadges />
    </div>
  );

  /* ── Main render ─────────────────────────────────────────────────────── */

  return (
    <div className="section container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* Page title + back link */}
      <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {step > 0 && (
          <button
            onClick={() => { setStep(step - 1); setCheckoutError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,230,211,0.5)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: 0 }}
          >
            ← Back
          </button>
        )}
      </div>

      <h1 className="font-display" style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>
        {step === 0 ? 'Your Cart' : step === 1 ? 'Order Details' : 'Processing…'}
      </h1>
      <p style={{ color: 'rgba(245,230,211,0.4)', fontSize: '0.875rem', marginBottom: '2rem' }}>
        {items.length} item{items.length !== 1 ? 's' : ''} · ₹{total} total
      </p>

      {/* Step indicator */}
      <StepIndicator step={step} />

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>

        {/* LEFT — varies by step */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* ── STEP 0: Cart items ── */}
          {step === 0 && (
            <>
              {items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onRemove={removeItem}
                  onUpdateQty={updateQty}
                  onSetNote={setNote}
                />
              ))}
              <Link
                to="/menu"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'rgba(245,230,211,0.45)', marginTop: '0.5rem' }}
              >
                <Coffee size={14} /> Add more items
              </Link>
            </>
          )}

          {/* ── STEP 1: Details ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Guest fields */}
              {!user && (
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Contact Details</h3>
                  <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: 'rgba(245,230,211,0.45)' }}>
                    We'll use this to identify your order at pickup.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'rgba(245,230,211,0.7)' }}>
                        <User size={13} style={{ color: 'var(--color-amber)' }} /> Full Name
                      </label>
                      <input
                        id="guest-name"
                        className="input"
                        placeholder="Rohan Mehta"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: 'rgba(245,230,211,0.7)' }}>
                        <Phone size={13} style={{ color: 'var(--color-amber)' }} /> Mobile Number
                      </label>
                      <input
                        id="guest-phone"
                        className="input"
                        placeholder="9876543210"
                        type="tel"
                        maxLength={10}
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(212,134,11,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212,134,11,0.12)', fontSize: '0.78rem', color: 'rgba(245,230,211,0.5)' }}>
                    💡 Guest orders are pay-on-pickup (cash or card). <Link to="/auth" style={{ color: 'var(--color-amber)' }}>Sign in</Link> to pay online and earn loyalty stamps.
                  </div>
                </div>
              )}

              {/* Pickup time */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Pickup Time</h3>
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.8rem', color: 'rgba(245,230,211,0.45)' }}>
                  Choose when you'd like to collect your order.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.6rem' }}>
                  {PICKUP_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setPickupTime(slot)}
                      style={{
                        padding: '0.6rem 0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${pickupTime === slot ? 'var(--color-amber)' : 'rgba(212,134,11,0.18)'}`,
                        background: pickupTime === slot ? 'rgba(212,134,11,0.12)' : 'rgba(44,24,16,0.4)',
                        color: pickupTime === slot ? 'var(--color-amber)' : 'rgba(245,230,211,0.65)',
                        fontSize: '0.8rem', fontWeight: pickupTime === slot ? 700 : 400,
                        cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
                      }}
                    >
                      <Clock size={12} />
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order recap for auth users */}
              {user && (
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Paying As</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(212,134,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={18} style={{ color: 'var(--color-amber)' }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(245,230,211,0.45)' }}>{user.email}</p>
                    </div>
                    {user.loyalty_stamps > 0 && (
                      <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>
                        🎯 {user.loyalty_stamps}/10 stamps
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Processing ── */}
          {step === 2 && (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-amber)', margin: '0 auto 1rem' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>Processing your order…</h3>
              <p style={{ color: 'rgba(245,230,211,0.45)', fontSize: '0.85rem' }}>
                Please complete the payment in the popup window.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — sticky order summary */}
        <OrderSummaryPanel />
      </div>
    </div>
  );
}
