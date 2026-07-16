import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Layouts
import PublicLayout  from '@/components/layout/PublicLayout';
import AdminLayout   from '@/components/layout/AdminLayout';

// Auth guard
import { useAuthStore } from '@/store/authStore';

// Pages — lazy loaded for code splitting
const Landing           = lazy(() => import('@/pages/Landing'));
const Menu              = lazy(() => import('@/pages/Menu'));
const Cart              = lazy(() => import('@/pages/Cart'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const Reserve           = lazy(() => import('@/pages/Reserve'));
const Auth              = lazy(() => import('@/pages/Auth'));
const Account           = lazy(() => import('@/pages/Account'));
const Kitchen           = lazy(() => import('@/pages/Kitchen'));
const AuthCallback      = lazy(() => import('@/pages/AuthCallback'));

// Admin pages
const AdminDashboard    = lazy(() => import('@/pages/admin/Dashboard'));
const MenuManager       = lazy(() => import('@/pages/admin/MenuManager'));
const OrderQueue        = lazy(() => import('@/pages/admin/OrderQueue'));
const AdminReservations = lazy(() => import('@/pages/admin/Reservations'));

/** Loading spinner shown during lazy-load */
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          border: '3px solid rgba(212,134,11,0.2)',
          borderTop: '3px solid var(--color-amber)',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 0.75rem',
        }} />
        <p style={{ color: 'rgba(245,230,211,0.4)', fontSize: '0.875rem', margin: 0 }}>Loading…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/** Protect admin routes — redirect to /auth if not staff/owner */
function RequireAdmin({ children }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null; // wait for auth to resolve before redirecting
  const isStaff = user?.role === 'staff' || user?.role === 'owner';
  if (!isStaff) return <Navigate to="/auth" replace />;
  return children;
}

/** Protect customer-only routes */
function RequireAuth({ children }) {
  const { token, isLoading } = useAuthStore();
  if (isLoading) return null; // wait for auth to resolve before redirecting
  if (!token) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Public routes (Navbar + Footer) ─────────── */}
          <Route element={<PublicLayout />}>
            <Route index              element={<Landing />} />
            <Route path="menu"        element={<Menu />} />
            <Route path="cart"        element={<Cart />} />
            <Route path="orders/:id"  element={<OrderConfirmation />} />
            <Route path="reserve"     element={<Reserve />} />
            <Route path="auth"          element={<Auth />} />
            <Route path="auth/callback" element={<AuthCallback />} />
            <Route path="account"       element={<RequireAuth><Account /></RequireAuth>} />
          </Route>

          {/* ── Kitchen display (standalone — no navbar) ─ */}
          <Route path="kitchen" element={<RequireAdmin><Kitchen /></RequireAdmin>} />


          {/* ── Admin routes (sidebar layout) ────────────  */}
          <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
            <Route index              element={<AdminDashboard />} />
            <Route path="menu"        element={<MenuManager />} />
            <Route path="orders"      element={<OrderQueue />} />
            <Route path="reservations"element={<AdminReservations />} />
          </Route>

          {/* ── 404 fallback ─────────────────────────────── */}
          <Route path="*" element={
            <div style={{ textAlign: 'center', padding: '6rem 1.5rem' }}>
              <p style={{ fontSize: '5rem', margin: '0 0 0.5rem' }}>☕</p>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '0.75rem' }}>Page Not Found</h1>
              <p style={{ color: 'rgba(245,230,211,0.5)', marginBottom: '1.5rem' }}>Looks like this page wandered off for a coffee break.</p>
              <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.75rem', borderRadius: '9999px', background: 'linear-gradient(135deg,#D4860B,#F0A832)', color: '#1A0F0A', fontWeight: 700, textDecoration: 'none' }}>
                Back to Home
              </a>
            </div>
          } />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
