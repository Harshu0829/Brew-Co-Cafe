import { useState, useEffect } from 'react';
import { Coffee, Clock, Loader2, AlertCircle } from 'lucide-react';
import { getOrders, updateOrderStatus } from '@/lib/api';

const STATUS_COLORS = { pending: '#facc15', confirmed: '#f0a832', preparing: '#60a5fa', ready: '#4ade80' };
const NEXT_STATUS = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready' };

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchActiveOrders = async () => {
    try {
      setError(null);
      // Fetch orders and filter active kitchen statuses locally
      const data = await getOrders();
      const activeKitchenOrders = (data || []).filter((o) =>
        ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
      );
      setOrders(activeKitchenOrders);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to refresh kitchen orders.');
    } finally {
      setActionError(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
    // Poll every 10 seconds for live updates
    const t = setInterval(() => {
      fetchActiveOrders();
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const advance = async (id, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    try {
      await updateOrderStatus(id, next);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: next } : o)).filter((o) =>
          ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
        )
      );
      setActionError(null);
    } catch (err) {
      setActionError('Failed to advance order status: ' + err.message);
    }
  };

  const getCustomerName = (order) => {
    if (order.guest_name) return order.guest_name;
    return 'Registered Customer';
  };

  if (loading && orders.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-brew-900)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'rgba(245,230,211,0.6)' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-amber)' }} />
        <p>Initializing kitchen feed…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-brew-900)', padding: '1.5rem', fontFamily: 'var(--font-body)' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', padding: '1rem 1.5rem', background: 'rgba(44,24,16,0.7)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(212,134,11,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Coffee size={28} style={{ color: 'var(--color-amber)' }} />
          <div>
            <h1 className="font-display" style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-cream-100)' }}>
              Brew <span style={{ color: 'var(--color-amber)' }}>&</span> Co — Kitchen Display
            </h1>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(245,230,211,0.4)' }}>Live order queue · Auto-refresh every 10s</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-amber)', fontSize: '1.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          <Clock size={20} />
          {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', marginBottom: '1.75rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {actionError && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', marginBottom: '1.75rem' }}>
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Pending',   count: orders.filter((o) => o.status === 'pending').length,   color: '#facc15' },
          { label: 'Preparing', count: orders.filter((o) => o.status === 'preparing').length, color: '#60a5fa' },
          { label: 'Ready',     count: orders.filter((o) => o.status === 'ready').length,     color: '#4ade80' },
          { label: 'Total Active', count: orders.length, color: 'var(--color-amber)' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ flex: '1 1 140px', background: 'rgba(44,24,16,0.5)', border: `1px solid ${color}28`, borderRadius: 'var(--radius-md)', padding: '0.9rem 1.25rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.2rem', fontSize: '2rem', fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{count}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(245,230,211,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Order cards grid */}
      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'rgba(245,230,211,0.3)' }}>
          <Coffee size={52} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ fontSize: '1.2rem' }}>All caught up! No active orders.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {orders.map((order) => {
            const color = STATUS_COLORS[order.status] || 'var(--color-amber)';
            return (
              <div key={order.id} style={{ background: 'rgba(44,24,16,0.6)', border: `2px solid ${color}`, borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backdropFilter: 'blur(12px)' }}>
                {/* Order header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 0.2rem', fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-cream-100)' }}>#{order.id.slice(0, 8)}…</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(245,230,211,0.55)' }}>{getCustomerName(order)}</p>
                  </div>
                  <span style={{ padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 800, background: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.05em', border: `1px solid ${color}40` }}>
                    {order.status}
                  </span>
                </div>

                {/* Items */}
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {order.items?.map((item) => (
                    <li key={item.id} style={{ fontSize: '1rem', color: 'var(--color-cream-200)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color, fontSize: '0.7rem' }}>▶</span> {item.name} × {item.quantity}
                      </div>
                      {item.customisation_note && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-amber)', marginLeft: '1.2rem', fontStyle: 'italic' }}>
                          ↳ "{item.customisation_note}"
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Pickup + action */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'rgba(245,230,211,0.5)' }}>
                    <Clock size={13} style={{ color }} /> {order.pickup_time}
                  </div>
                  {NEXT_STATUS[order.status] && (
                    <button id={`kitchen-advance-${order.id}`}
                      onClick={() => advance(order.id, order.status)}
                      style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-full)', border: `1.5px solid ${color}`, background: `${color}18`, color, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-body)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${color}35`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${color}18`; }}>
                      → {NEXT_STATUS[order.status].charAt(0).toUpperCase() + NEXT_STATUS[order.status].slice(1)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
