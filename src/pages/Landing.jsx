import { Link } from 'react-router-dom';
import { ArrowRight, Star, Coffee, Clock, MapPin } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const FEATURES = [
  { icon: Coffee, title: 'Order Online', desc: 'Browse our menu and place your order for quick pickup.' },
  { icon: Clock,  title: 'Reserve a Table', desc: 'Book your favourite spot in advance — no waiting.' },
  { icon: Star,   title: 'Loyalty Rewards', desc: 'Every 9 orders earns you a free item on us.' },
];

const MENU_HIGHLIGHTS = [
  { name: 'Signature Espresso', price: '₹180', tag: 'Best Seller', emoji: '☕' },
  { name: 'Avocado Toast',      price: '₹320', tag: 'Vegan',       emoji: '🥑' },
  { name: 'Cold Brew Float',    price: '₹220', tag: 'New',         emoji: '🧋' },
  { name: 'Almond Croissant',   price: '₹160', tag: 'Gluten-Free', emoji: '🥐' },
];

export default function Landing() {
  const { user } = useAuthStore();
  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background gradient blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,134,11,0.12) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(92,51,23,0.25) 0%, transparent 70%)' }} />
        </div>

        <div className="container animate-fade-in-up" style={{ textAlign: 'center', position: 'relative' }}>
          <span className="badge badge-amber" style={{ marginBottom: '1.25rem', fontSize: '0.8rem', letterSpacing: '0.06em' }}>
            ☕ Specialty Coffee · Artisan Food
          </span>
          <h1 className="font-display" style={{ fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', fontWeight: 900, lineHeight: 1.05, marginBottom: '1.25rem' }}>
            Where Every Cup<br />
            <span className="text-gradient">Tells a Story</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', color: 'rgba(245,230,211,0.7)', maxWidth: 540, margin: '0 auto 2rem', lineHeight: 1.7 }}>
            Freshly roasted beans, hand-crafted drinks, and a warm corner that feels like home. Order online or book your table today.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/menu" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
              Browse Menu <ArrowRight size={18} />
            </Link>
            <Link to="/reserve" className="btn btn-secondary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
              Reserve a Table
            </Link>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', marginTop: '3.5rem', flexWrap: 'wrap' }}>
            {[['500+', 'Happy Customers'], ['12', 'Specialty Drinks'], ['4.9★', 'Average Rating']].map(([val, lbl]) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <p className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-amber)', margin: 0 }}>{val}</p>
                <p style={{ fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)', margin: 0 }}>{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => {
              // Loyalty Rewards card links to /account if logged in, /auth if not
              const isLoyalty = title === 'Loyalty Rewards';
              const cardContent = (
                <div key={title} className="card" style={{ padding: '2rem', textAlign: 'center', cursor: isLoyalty ? 'pointer' : 'default', transition: 'transform 0.2s' }}
                  onMouseEnter={isLoyalty ? (e) => e.currentTarget.style.transform = 'translateY(-3px)' : undefined}
                  onMouseLeave={isLoyalty ? (e) => e.currentTarget.style.transform = '' : undefined}>
                  <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: 'rgba(212,134,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <Icon size={24} style={{ color: 'var(--color-amber)' }} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(245,230,211,0.6)', margin: 0 }}>{desc}</p>
                  {isLoyalty && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-amber)', marginTop: '0.75rem', marginBottom: 0 }}>
                      {user ? 'View my stamps →' : 'Sign up to start earning →'}
                    </p>
                  )}
                </div>
              );
              return isLoyalty
                ? <Link key={title} to={user ? '/account' : '/auth'} style={{ textDecoration: 'none', color: 'inherit' }}>{cardContent}</Link>
                : cardContent;
            })}
          </div>
        </div>
      </section>

      {/* ── Menu Highlights ──────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 className="font-display" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', marginBottom: '0.5rem' }}>Today's Favourites</h2>
            <p style={{ color: 'rgba(245,230,211,0.6)' }}>Handpicked by our baristas</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {MENU_HIGHLIGHTS.map(({ name, price, tag, emoji }) => (
              <div key={name} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '2.5rem', textAlign: 'center' }}>{emoji}</div>
                <div>
                  <span className="badge badge-amber" style={{ fontSize: '0.7rem', marginBottom: '0.4rem' }}>{tag}</span>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{name}</h4>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-amber)' }}>{price}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/menu" className="btn btn-secondary">View Full Menu <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* ── About / Location ─────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="card" style={{ padding: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center' }}>
            <div>
              <span className="badge badge-cream" style={{ marginBottom: '1rem' }}>Our Story</span>
              <h2 className="font-display" style={{ fontSize: '2rem', marginBottom: '1rem' }}>A Café Born from Passion</h2>
              <p style={{ color: 'rgba(245,230,211,0.7)', lineHeight: 1.8, marginBottom: '1.25rem' }}>
                Brew & Co started as a tiny home kitchen experiment and grew into the neighbourhood's favourite gathering spot. Every bean is sourced with care. Every cup is made with love.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(245,230,211,0.6)', fontSize: '0.9rem' }}>
                <MapPin size={16} style={{ color: 'var(--color-amber)' }} />
                12 Brew Lane, Mumbai 400001
              </div>
            </div>
            {/* Map embed placeholder */}
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: 260, background: 'rgba(44,24,16,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212,134,11,0.15)' }}>
              <div style={{ textAlign: 'center', color: 'rgba(245,230,211,0.4)' }}>
                <MapPin size={32} style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Google Maps will load here</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ background: 'linear-gradient(135deg, var(--color-brew-700) 0%, var(--color-brew-600) 100%)', borderRadius: 'var(--radius-xl)', padding: '3rem 2rem', textAlign: 'center', border: '1px solid rgba(212,134,11,0.2)' }}>
            {user ? (
              <>
                <h2 className="font-display" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Welcome back, {user.name?.split(' ')[0]}! ☕</h2>
                <p style={{ color: 'rgba(245,230,211,0.7)', marginBottom: '1.5rem' }}>Check your loyalty stamps and order history in your account.</p>
                <Link to="/account" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2.25rem' }}>
                  View My Stamps <ArrowRight size={18} />
                </Link>
              </>
            ) : (
              <>
                <h2 className="font-display" style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Ready for Your First Stamp?</h2>
                <p style={{ color: 'rgba(245,230,211,0.7)', marginBottom: '1.5rem' }}>Sign up and start earning loyalty rewards with every order.</p>
                <Link to="/auth" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2.25rem' }}>
                  Join Brew & Co — It's Free
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
