import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, Coffee, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';

const NAV_LINKS = [
  { to: '/',        label: 'Home' },
  { to: '/menu',    label: 'Menu' },
  { to: '/reserve', label: 'Reserve' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
      <nav className="glass" style={{ margin: '0.75rem 1.5rem', borderRadius: 'var(--radius-xl)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Coffee size={26} style={{ color: 'var(--color-amber)' }} />
          <span className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cream-100)' }}>
            Brew <span style={{ color: 'var(--color-amber)' }}>&</span> Co
          </span>
        </Link>

        {/* Desktop nav */}
        <ul style={{ display: 'flex', gap: '0.25rem', listStyle: 'none', margin: 0, padding: 0 }} className="hide-mobile">
          {NAV_LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink to={to} end={to === '/'} className="btn btn-ghost"
                style={({ isActive }) => isActive ? { color: 'var(--color-amber)', fontWeight: 600 } : {}}>
                {label}
              </NavLink>
            </li>
          ))}
          {['owner', 'staff'].includes(user?.role) && (
            <>
              <li><NavLink to="/admin" className="btn btn-ghost" style={({ isActive }) => isActive ? { color: 'var(--color-amber)' } : {}}>Admin</NavLink></li>
              <li><NavLink to="/kitchen" className="btn btn-ghost" style={({ isActive }) => isActive ? { color: 'var(--color-amber)' } : {}}>Kitchen</NavLink></li>
            </>
          )}
        </ul>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Cart */}
          <Link to="/cart" className="btn btn-ghost" style={{ position: 'relative' }} aria-label="View cart">
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18,
                background: 'var(--color-amber)', color: 'var(--color-brew-900)',
                borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px'
              }}>{itemCount}</span>
            )}
          </Link>

          {/* User */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Link to="/account" className="btn btn-ghost" aria-label="My account"><User size={20} /></Link>
              <button onClick={handleLogout} className="btn btn-ghost" aria-label="Log out"><LogOut size={18} /></button>
            </div>
          ) : (
            <Link to="/auth" className="btn btn-secondary" style={{ padding: '0.45rem 1.1rem', fontSize: '0.875rem' }}>Sign In</Link>
          )}

          {/* Mobile menu toggle */}
          <button className="btn btn-ghost show-mobile" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="glass" style={{ margin: '0 0.75rem', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem' }}>
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
              style={{ display: 'block', padding: '0.6rem 0', fontSize: '1rem', borderBottom: '1px solid rgba(212,134,11,0.1)' }}>
              {label}
            </NavLink>
          ))}
          {!user && <Link to="/auth" onClick={() => setOpen(false)} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>Sign In</Link>}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </header>
  );
}
