import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, ChefHat, Package, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getOrder } from '@/lib/api';

const STATUSES = [
  { key: 'pending',   label: 'Order Placed',  Icon: CheckCircle },
  { key: 'confirmed', label: 'Confirmed',     Icon: CheckCircle },
  { key: 'preparing', label: 'Preparing',      Icon: ChefHat },
  { key: 'ready',     label: 'Ready for Pickup',Icon: Package },
  { key: 'completed', label: 'Completed',     Icon: CheckCircle },
];

export default function OrderConfirmation() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrderDetails = async () => {
    try {
      let currentOrder = null;
      if (user) {
        currentOrder = await getOrder(id);
        setOrder(currentOrder);
      } else {
        // Fallback to local storage for guests
        const localData = localStorage.getItem(`brewco-guest-order-${id}`);
        if (localData) {
          currentOrder = JSON.parse(localData);
          setOrder(currentOrder);
        } else {
          setError('Order not found. Guest checkouts can only be viewed on the device they were placed.');
        }
      }
      return currentOrder;
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch order details.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    const init = async () => {
      const initialOrder = await fetchOrderDetails();
      // Poll every 10 seconds for live updates if authenticated and not terminal
      if (user && id && initialOrder && initialOrder.status !== 'completed' && initialOrder.status !== 'cancelled') {
        interval = setInterval(async () => {
          const updatedOrder = await fetchOrderDetails();
          if (updatedOrder && (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled')) {
            clearInterval(interval);
          }
        }, 10000);
      }
    };
    init();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, user]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'rgba(245,230,211,0.6)' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-amber)' }} />
        <p>Loading order details…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: '#f87171', fontSize: '1.1rem' }}>{error || 'Order not found.'}</p>
        <Link to="/menu" className="btn btn-primary">Back to Menu</Link>
      </div>
    );
  }

  // Get index for tracking progress
  let currentStep = STATUSES.findIndex((s) => s.key === order.status);
  // Default to first step if state is not in the tracked list
  if (currentStep === -1) {
    currentStep = 0; // pending or other
  }

  return (
    <div className="section container" style={{ maxWidth: 640, paddingTop: '1.5rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(26,127,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <CheckCircle size={36} style={{ color: '#4ade80' }} />
        </div>
        <h1 className="font-display" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Order Confirmed!</h1>
        <p style={{ color: 'rgba(245,230,211,0.6)' }}>Order <strong style={{ color: 'var(--color-amber)' }}>#{order.id}</strong></p>
      </div>

      {/* Status tracker */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Live Status</h3>
          {user && (
            <button className="btn btn-ghost" style={{ padding: '0.2rem', gap: '0.3rem', fontSize: '0.75rem' }} onClick={fetchOrderDetails}>
              <RefreshCw size={12} /> Sync
            </button>
          )}
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {/* Line */}
          <div style={{ position: 'absolute', top: 20, left: '10%', right: '10%', height: 2, background: 'rgba(212,134,11,0.15)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 20, left: '10%', width: `${(currentStep / (STATUSES.length - 1)) * 80}%`, height: 2, background: 'var(--color-amber)', zIndex: 1, transition: 'width 0.5s ease' }} />

          {STATUSES.map(({ key, label, Icon }, i) => {
            const done = i <= currentStep;
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1, zIndex: 2 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'rgba(212,134,11,0.15)' : 'rgba(44,24,16,0.8)', border: `2px solid ${done ? 'var(--color-amber)' : 'rgba(212,134,11,0.2)'}`, transition: 'all 0.3s' }}>
                  <Icon size={18} style={{ color: done ? 'var(--color-amber)' : 'rgba(245,230,211,0.3)' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: done ? 'var(--color-cream-200)' : 'rgba(245,230,211,0.35)', textAlign: 'center', fontWeight: done ? 600 : 400 }}>{label}</span>
              </div>
            );
          })}
        </div>
        
        {order.status === 'completed' && (
          <div style={{ textAlign: 'center', margin: '1rem 0', color: '#4ade80', fontWeight: 600, fontSize: '0.9rem' }}>
            🎉 Order completed! Thank you for dining with us.
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(245,230,211,0.6)', fontSize: '0.875rem' }}>
          <Clock size={15} style={{ color: 'var(--color-amber)' }} />
          Estimated pickup: <strong style={{ color: 'var(--color-cream-100)' }}>{order.pickup_time}</strong>
        </div>
      </div>

      {/* Order items */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Order Details</h3>
        {order.items?.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '0.6rem 0', borderBottom: '1px solid rgba(212,134,11,0.08)', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(245,230,211,0.75)' }}>{item.name} × {item.quantity}</span>
              <span style={{ color: 'var(--color-cream-100)', fontWeight: 600 }}>₹{Math.round(item.unit_price * item.quantity)}</span>
            </div>
            {item.customisation_note && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-amber)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                Note: "{item.customisation_note}"
              </span>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontWeight: 700 }}>
          <span>Total Amount</span>
          <span style={{ color: 'var(--color-amber)' }}>₹{Math.round(order.total)}</span>
        </div>
        {order.payment_status && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)' }}>
            <span>Payment Status</span>
            <span style={{ color: order.payment_status === 'paid' ? '#4ade80' : 'var(--color-amber)', textTransform: 'uppercase', fontWeight: 600 }}>
              {order.payment_status === 'paid' ? 'Paid Online' : 'Pay on Pickup'}
            </span>
          </div>
        )}
      </div>

      {!user && (
        <div style={{ padding: '1rem', background: 'rgba(212,134,11,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(212,134,11,0.15)', marginBottom: '1.5rem', fontSize: '0.82rem', color: 'rgba(245,230,211,0.65)' }}>
          📌 Guest order successfully placed! Pay cash or card at pickup. To get live status tracking and unlock free drinks via loyalty stamps, please <Link to="/auth" style={{ color: 'var(--color-amber)', textDecoration: 'underline' }}>create an account</Link>.
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link to="/menu" className="btn btn-secondary" style={{ flex: 1 }}>Order Again</Link>
        {user && <Link to="/account" className="btn btn-ghost" style={{ flex: 1 }}>View History</Link>}
      </div>
    </div>
  );
}
