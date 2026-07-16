import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, CalendarDays, DollarSign, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAdminStats, getOrders } from '@/lib/api';

const QUICK_ACTIONS = [
  { to: '/admin/menu',         label: 'Manage Menu',        emoji: '🍽️' },
  { to: '/admin/orders',       label: 'View Order Queue',   emoji: '📋' },
  { to: '/admin/reservations', label: 'View Reservations',  emoji: '📅' },
  { to: '/kitchen',            label: 'Kitchen Display',    emoji: '👨‍🍳' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, ordersData] = await Promise.all([
        getAdminStats(),
        getOrders()
      ]);
      setStats(statsData);
      // Take only the 5 most recent orders
      setRecentOrders((ordersData || []).slice(0, 5));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'rgba(245,230,211,0.6)' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-amber)' }} />
        <p>Loading dashboard metrics…</p>
      </div>
    );
  }

  const statItems = [
    { label: 'Orders Today',          value: stats?.orders_today ?? 0,          icon: ShoppingBag,  color: '#60a5fa' },
    { label: 'Revenue Today',         value: `₹${Math.round(stats?.revenue_today ?? 0)}`, icon: DollarSign,   color: '#4ade80' },
    { label: 'Pending Reservations',  value: stats?.pending_reservations ?? 0,  icon: CalendarDays, color: 'var(--color-amber)' },
    { label: 'Menu Items Active',     value: stats?.active_menu_items ?? 0,     icon: TrendingUp,   color: '#c084fc' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>Dashboard</h1>
          <p style={{ color: 'rgba(245,230,211,0.5)', margin: 0 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={loadDashboardData}>
          Reload
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 'var(--radius-md)', color: '#f87171', marginBottom: '2rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {statItems.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)', fontWeight: 500 }}>{label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-cream-100)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'rgba(245,230,211,0.7)' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {QUICK_ACTIONS.map(({ to, label, emoji }) => (
            <Link key={to} to={to} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{label}</span>
              <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'rgba(245,230,211,0.3)' }} />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Recent Orders</h2>
          <Link to="/admin/orders" style={{ fontSize: '0.8rem', color: 'var(--color-amber)' }}>View all →</Link>
        </div>
        {recentOrders.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(245,230,211,0.4)', fontSize: '0.85rem' }}>
            No recent orders today.
          </div>
        ) : (
          recentOrders.map((o) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0', borderBottom: '1px solid rgba(212,134,11,0.08)', fontSize: '0.85rem' }} className="recent-order-row">
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>#{o.id.slice(0, 8)}…</span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)', marginLeft: '0.5rem' }}>
                  {o.guest_name || 'Customer'} · {o.items?.length || 0} items
                </span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-amber)' }}>₹{Math.round(o.total)}</span>
              <span className={`badge status-${o.status}`} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', textTransform: 'capitalize' }}>
                {o.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
