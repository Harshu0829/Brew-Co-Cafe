import { useAuthStore } from '@/store/authStore';
import { User, Coffee, ClipboardList, Star, Trash2, LogOut, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getOrders } from '@/lib/api';

const STAMP_TOTAL = 9;

export default function AccountPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getOrders()
      .then((data) => setOrders(data || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="section container" style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(245,230,211,0.6)', marginBottom: '1rem' }}>Please sign in to view your account.</p>
        <button className="btn btn-primary" onClick={() => navigate('/auth')}>Sign In</button>
      </div>
    );
  }

  // stamps directly from store — no hardcoded fallback
  const stamps = user?.loyalty_stamps ?? 0;

  return (
    <div className="section container" style={{ maxWidth: 700, paddingTop: '1.5rem' }}>
      <h1 className="font-display" style={{ fontSize: '2rem', marginBottom: '2rem' }}>My Account</h1>

      {/* Profile */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(212,134,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={28} style={{ color: 'var(--color-amber)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 0.2rem' }}>{user.name}</h3>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: 'rgba(245,230,211,0.55)' }}>{user.email}</p>
          <span className="badge badge-amber" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{user.role || 'Customer'}</span>
        </div>
        <button className="btn btn-ghost" style={{ color: '#f87171', fontSize: '0.85rem', gap: '0.4rem' }} onClick={() => { logout(); navigate('/'); }}>
          <LogOut size={15} /> Logout
        </button>
      </div>

      {/* Loyalty Card */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(44,24,16,0.7) 0%, rgba(92,51,23,0.4) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Star size={18} style={{ color: 'var(--color-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Loyalty Card</h3>
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)' }}>{stamps}/{STAMP_TOTAL} stamps</span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {Array.from({ length: STAMP_TOTAL }).map((_, i) => (
            <div key={i} style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: `2px solid ${i < stamps ? 'var(--color-amber)' : 'rgba(212,134,11,0.2)'}`, background: i < stamps ? 'rgba(212,134,11,0.12)' : 'transparent', transition: 'all 0.2s' }}>
              {i < stamps ? '☕' : ''}
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)', marginTop: '0.75rem', marginBottom: 0 }}>
          {stamps >= STAMP_TOTAL ? '🎉 You have a free item! Redeem at the counter.' : `${STAMP_TOTAL - stamps} more orders until a free item!`}
        </p>
      </div>

      {/* Order History */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <ClipboardList size={18} style={{ color: 'var(--color-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Order History</h3>
        </div>
        {ordersLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(245,230,211,0.4)' }}>
            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-amber)', margin: '0 auto' }} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(245,230,211,0.4)', fontSize: '0.875rem' }}>
            No orders yet. <Link to="/menu" style={{ color: 'var(--color-amber)' }}>Browse the menu →</Link>
          </div>
        ) : orders.slice(0, 5).map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid rgba(212,134,11,0.08)', cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>#{order.id.slice(0, 8)}…</span>
                  <span className="badge badge-green" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>{order.status}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)' }}>
                  {order.items?.map(i => i.name).join(', ') || '—'} · {new Date(order.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--color-amber)' }}>₹{Math.round(order.total)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Delete account */}
      <div className="card" style={{ padding: '1.25rem', border: '1px solid rgba(192,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <p style={{ fontWeight: 600, margin: '0 0 0.2rem', fontSize: '0.9rem' }}>Delete Account</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)' }}>Permanently removes your data. This action cannot be undone.</p>
        </div>
        <button className="btn btn-danger" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          onClick={() => {
            if (window.confirm('Are you sure? This will permanently delete your account and cannot be undone.')) {
              logout();
              navigate('/');
            }
          }}>
          <Trash2 size={15} /> Delete
        </button>
      </div>
    </div>
  );
}
