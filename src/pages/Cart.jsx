import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, Tag, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useCartStore, selectSubtotal, selectDiscount, selectTotal } from '@/store/cartStore';

import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { createOrder, createPaymentOrder, verifyPayment } from '@/lib/api';

const PICKUP_SLOTS = ['ASAP (20 min)', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM'];

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, removeItem, updateQty, promoCode, setPromoCode, clearPromo, pickupTime, setPickupTime, clearCart, setNote } = useCartStore();
  const subtotal = useCartStore(selectSubtotal);
  const discount = useCartStore(selectDiscount);
  const total = useCartStore(selectTotal);


  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  // Guest details state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const handleApplyPromo = async () => {
    setPromoError('');
    setPromoSuccess('');
    if (!promoInput.trim()) return;

    if (!user) {
      setPromoError('Log in to use promo codes!');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoInput.trim().toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setPromoError('Invalid or expired promo code.');
        return;
      }

      if (subtotal < parseFloat(data.min_order_value)) {
        setPromoError(`Minimum order value of ₹${data.min_order_value} required.`);
        return;
      }

      if (data.max_uses && data.uses_count >= data.max_uses) {
        setPromoError('This promo code limit has been reached.');
        return;
      }

      const val = parseFloat(data.value);
      const discountAmount = data.discount_type === 'flat'
        ? val
        : Math.round(subtotal * val / 100);

      setPromoCode(data.code, discountAmount);
      setPromoSuccess(`Code ${data.code} applied! Saved ₹${discountAmount}`);
    } catch (err) {
      console.error(err);
      setPromoError('Error verifying promo code.');
    }
  };

  const handleCheckout = async () => {
    setCheckoutError('');
    
    if (!pickupTime) {
      setCheckoutError('Please select a pickup time.');
      return;
    }

    if (!user) {
      if (!guestName.trim() || !guestPhone.trim()) {
        setCheckoutError('Please enter your name and phone number for guest checkout.');
        return;
      }
    }

    try {
      setLoading(true);
      
      const orderPayload = {
        items: items.map((i) => ({
          menu_item_id: i.id,
          quantity: i.quantity,
          customisation_note: i.customisation_note || null,
        })),
        pickup_time: pickupTime,
        promo_code: promoCode,
      };

      if (!user) {
        orderPayload.guest_name = guestName.trim();
        orderPayload.guest_phone = guestPhone.trim();
      }

      // 1. Create order in database
      const orderRes = await createOrder(orderPayload);
      const orderId = orderRes.order_id;

      // If guest, skip Razorpay online payment (pay on pickup)
      if (!user) {
        localStorage.setItem(`brewco-guest-order-${orderId}`, JSON.stringify({
          id: orderId,
          status: 'pending',
          pickup_time: pickupTime,
          total: total,
          items: items.map((i) => ({ name: i.name, quantity: i.quantity, unit_price: i.price })),
        }));
        clearCart();
        navigate(`/orders/${orderId}`);
        return;
      }

      // 2. Initiate Razorpay Flow for authenticated users
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setCheckoutError('Failed to load payment gateway. Please try again.');
        setLoading(false);
        return;
      }

      const paymentOrder = await createPaymentOrder(orderId);

      const options = {
        key: paymentOrder.key_id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Brew & Co Café',
        description: `Order #${orderId}`,
        order_id: paymentOrder.razorpay_order_id,
        handler: async function (response) {
          try {
            setLoading(true);
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              brew_order_id: orderId,
            });
            clearCart();
            navigate(`/orders/${orderId}`);
          } catch (err) {
            console.error('Payment verification failed:', err);
            // If verification fails, redirect to confirmation page so they see pending status
            clearCart();
            navigate(`/orders/${orderId}`);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setCheckoutError('Payment was cancelled. Your cart is still intact — retry when ready.');
          }
        },


        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || '',
        },
        theme: {
          color: '#D4860B',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      setCheckoutError(err.message || 'Checkout failed. Please try again.');
      setLoading(false);  // Only reset loading here on error — on success the handler/ondismiss resets it
    }
  };


  if (items.length === 0) {
    return (
      <div className="section container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <ShoppingBag size={56} style={{ margin: '0 auto 1rem', color: 'rgba(212,134,11,0.4)' }} />
        <h2 className="font-display" style={{ marginBottom: '0.75rem' }}>Your cart is empty</h2>
        <p style={{ color: 'rgba(245,230,211,0.5)', marginBottom: '1.5rem' }}>Add some items from our menu to get started.</p>
        <Link to="/menu" className="btn btn-primary">Browse Menu <ArrowRight size={16} /></Link>
      </div>
    );
  }

  return (
    <div className="section container" style={{ paddingTop: '1.5rem' }}>
      <h1 className="font-display" style={{ fontSize: '2.25rem', marginBottom: '2rem' }}>Your Cart</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>

        {/* Items list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '2rem', lineHeight: 1 }}>{item.emoji || '☕'}</div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem' }}>{item.name}</h4>
                <p style={{ margin: 0, color: 'var(--color-amber)', fontWeight: 600, fontSize: '0.9rem' }}>₹{item.price}</p>
                <input
                  type="text"
                  placeholder="Add customisation notes (e.g. extra hot, no sugar)"
                  value={item.customisation_note || ''}
                  onChange={(e) => setNote(item.id, e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(245,230,211,0.1)',
                    color: 'rgba(245,230,211,0.6)',
                    fontSize: '0.75rem',
                    width: '100%',
                    marginTop: '0.4rem',
                    padding: '0.2rem 0'
                  }}
                />
              </div>
              {/* Qty controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button id={`qty-minus-${item.id}`} className="btn btn-ghost" style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }} onClick={() => updateQty(item.id, item.quantity - 1)}><Minus size={14} /></button>
                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                <button id={`qty-plus-${item.id}`} className="btn btn-ghost" style={{ padding: '0.3rem', borderRadius: 'var(--radius-sm)' }} onClick={() => updateQty(item.id, item.quantity + 1)}><Plus size={14} /></button>
              </div>
              <button id={`remove-${item.id}`} className="btn btn-ghost" style={{ color: '#f87171', padding: '0.3rem' }} onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="card" style={{ padding: '1.75rem', position: 'sticky', top: '6rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Order Summary</h3>

          {/* Guest Checkout Fields if not authenticated */}
          {!user && (
            <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'rgba(212,134,11,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(212,134,11,0.15)' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-amber)' }}>Guest Checkout</h4>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'rgba(245,230,211,0.7)' }}>Your Name</label>
                <input id="guest-name" className="input" placeholder="Rohan Mehta" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: 'rgba(245,230,211,0.7)' }}>Phone Number</label>
                <input id="guest-phone" className="input" placeholder="9876543210" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
              </div>
            </div>
          )}

          {/* Pickup time */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Clock size={15} style={{ color: 'var(--color-amber)' }} /> Pickup Time
            </label>
            <select id="pickup-time" className="input"
              value={pickupTime || ''} onChange={(e) => setPickupTime(e.target.value)}>
              <option value="">Select a time…</option>
              {PICKUP_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Promo */}
          {user && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <Tag size={15} style={{ color: 'var(--color-amber)' }} /> Promo Code
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input id="promo-code" className="input" placeholder="Enter code…" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} disabled={!!promoCode} />
                {promoCode ? (
                  <button className="btn btn-ghost" style={{ flexShrink: 0, fontSize: '0.85rem', color: '#f87171' }} onClick={clearPromo}>Remove</button>
                ) : (
                  <button className="btn btn-secondary" style={{ flexShrink: 0, fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={handleApplyPromo}>Apply</button>
                )}
              </div>
              {promoError && <p style={{ color: '#f87171', fontSize: '0.78rem', marginTop: '0.3rem' }}>{promoError}</p>}
              {promoSuccess && <p style={{ color: '#4ade80', fontSize: '0.78rem', marginTop: '0.3rem' }}>{promoSuccess}</p>}
            </div>
          )}

          <div className="divider" />

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {[
              ['Subtotal', `₹${subtotal}`],
              ...(discount > 0 ? [['Discount', `-₹${discount}`]] : []),
              ['Taxes (5%)', `₹${total - Math.max(0, subtotal - discount)}`],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'rgba(245,230,211,0.65)' }}>
                <span>{lbl}</span><span>{val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', marginTop: '0.25rem' }}>
              <span>Total</span><span style={{ color: 'var(--color-amber)' }}>₹{total}</span>
            </div>
          </div>

          {checkoutError && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>
              <AlertCircle size={14} />
              <span>{checkoutError}</span>
            </div>
          )}

          <button id="checkout-btn" className="btn btn-primary" style={{ width: '100%', fontSize: '1rem', padding: '0.8rem' }} onClick={handleCheckout} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Processing…
              </>
            ) : (
              <>
                Proceed to Checkout <ArrowRight size={16} />
              </>
            )}
          </button>
          <Link to="/menu" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.85rem', color: 'rgba(245,230,211,0.5)' }}>
            ← Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
