import { useState, useEffect } from 'react';
import { Clock, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { getOrders, updateOrderStatus } from '@/lib/api';

const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
const STATUS_COLORS = { pending: '#facc15', confirmed: '#f0a832', preparing: '#60a5fa', ready: '#4ade80', completed: 'rgba(245,230,211,0.3)', cancelled: '#f87171' };
const NEXT_STATUS = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'completed' };

export default function OrderQueue() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load order queue.');
    } finally {
      setActionError(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Poll every 10 seconds for live updates
    const t = setInterval(() => {
      fetchQueue();
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const advance = async (id, currentStatus) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    try {
      await updateOrderStatus(id, next);
      // Optimistic state update or full reload
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: next } : o))
      );
      setActionError(null);
    } catch (err) {
      setActionError('Failed to update status: ' + err.message);
    }
  };

  const cancelOrder = async (id) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await updateOrderStatus(id, 'cancelled');
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o))
      );
      setActionError(null);
    } catch (err) {
      setActionError('Failed to cancel order: ' + err.message);
    }
  };

  const filtered = orders.filter((o) =>
    filter === 'all'
      ? true
      : filter === 'active'
      ? !['completed', 'cancelled'].includes(o.status)
      : o.status === filter
  );

  const getCustomerName = (order) => {
    if (order.guest_name) return order.guest_name;
    return 'Registered Customer';
  };

  if (loading && orders.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem', color: 'rgba(245,230,211,0.6)' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-amber)' }} />
        <p>Loading active orders…</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '1.75rem', marginBottom: '0.2rem' }}>Order Queue</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(245,230,211,0.5)' }}>Live updates every 10s · Manage customer pick-ups</p>
        </div>
        <button className="btn btn-ghost" style={{ gap: '0.4rem', fontSize: '0.875rem' }} onClick={fetchQueue}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {actionError && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {['active', 'pending', 'preparing', 'ready', 'completed', 'all'].map((f) => (
          <button key={f} id={`filter-${f}`}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', textTransform: 'capitalize' }}
            onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* Order cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {filtered.map((order) => (
          <div key={order.id} className="card" style={{ padding: '1.25rem', borderLeft: `3px solid ${STATUS_COLORS[order.status]}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.95rem' }}>#{order.id.slice(0, 8)}…</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(245,230,211,0.55)' }}>{getCustomerName(order)}</p>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-full)', background: `${STATUS_COLORS[order.status]}18`, color: STATUS_COLORS[order.status], textTransform: 'capitalize' }}>
                {order.status}
              </span>
            </div>

            <ul style={{ listStyle: 'none', margin: '0 0 0.75rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
              {order.items?.map((item) => (
                <li key={item.id} style={{ fontSize: '0.85rem', color: 'rgba(245,230,211,0.75)' }}>
                  <div>• {item.name} × {item.quantity}</div>
                  {item.customisation_note && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-amber)', marginLeft: '0.6rem', fontStyle: 'italic' }}>
                      ↳ "{item.customisation_note}"
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)', marginBottom: '0.75rem' }}>
              <Clock size={13} style={{ color: 'var(--color-amber)' }} />
              Pickup: {order.pickup_time || ''}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--color-amber)' }}>₹{Math.round(order.total)}</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {!['completed', 'cancelled'].includes(order.status) && (
                  <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', color: '#f87171' }} onClick={() => cancelOrder(order.id)}>
                    Cancel
                  </button>
                )}
                {NEXT_STATUS[order.status] && (
                  <button id={`advance-${order.id}`} className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
                    onClick={() => advance(order.id, order.status)}>
                    Mark {NEXT_STATUS[order.status].charAt(0).toUpperCase() + NEXT_STATUS[order.status].slice(1)}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'rgba(245,230,211,0.35)' }}>No orders in this view.</div>
        )}
      </div>
    </div>
  );
}
