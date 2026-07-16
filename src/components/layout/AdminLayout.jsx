import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, ClipboardList, CalendarDays, Coffee, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const ADMIN_NAV = [
  { to: '/admin',              label: 'Dashboard',   Icon: LayoutDashboard, end: true },
  { to: '/admin/menu',         label: 'Menu Manager',Icon: UtensilsCrossed },
  { to: '/admin/orders',       label: 'Order Queue', Icon: ClipboardList },
  { to: '/admin/reservations', label: 'Reservations',Icon: CalendarDays },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-brew-900)' }}>
      {/* Sidebar */}
      <aside className="admin-sidebar glass" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '1.5rem 0', borderRight: '1px solid rgba(212,134,11,0.12)', borderRadius: 0 }}>
        {/* Logo */}
        <div style={{ padding: '0 1.5rem 1.5rem', borderBottom: '1px solid rgba(212,134,11,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Coffee size={22} style={{ color: 'var(--color-amber)' }} />
            <span className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Brew <span style={{ color: 'var(--color-amber)' }}>&</span> Co
            </span>
          </div>
          <div className="badge badge-amber" style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>
            {user?.role === 'owner' ? '👑 Owner' : '🍳 Staff'}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {ADMIN_NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.15s',
                background: isActive ? 'rgba(212,134,11,0.12)' : 'transparent',
                color: isActive ? 'var(--color-amber)' : 'rgba(245,230,211,0.7)',
              })}>
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(212,134,11,0.1)' }}>
          <p style={{ fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
          <button onClick={handleLogout} className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#f87171' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
