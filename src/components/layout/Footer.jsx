import { Link } from 'react-router-dom';
import { Coffee, MapPin, Phone, Mail, Share2, Globe, MessageCircle } from 'lucide-react';

const QUICK_LINKS = [
  { to: '/',        label: 'Home' },
  { to: '/menu',    label: 'Menu' },
  { to: '/reserve', label: 'Reserve a Table' },
  { to: '/cart',    label: 'Order Online' },
  { to: '/auth',    label: 'Sign In / Register' },
];

const HOURS = [
  { day: 'Mon – Fri', time: '7:00 AM – 9:00 PM' },
  { day: 'Saturday',  time: '8:00 AM – 10:00 PM' },
  { day: 'Sunday',    time: '9:00 AM – 8:00 PM' },
];

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(212,134,11,0.15)', paddingTop: '3.5rem', paddingBottom: '1.5rem', marginTop: '4rem' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>

          {/* Brand */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Coffee size={22} style={{ color: 'var(--color-amber)' }} />
              <span className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Brew <span style={{ color: 'var(--color-amber)' }}>&</span> Co
              </span>
            </Link>
            <p style={{ fontSize: '0.875rem', color: 'rgba(245,230,211,0.6)', lineHeight: 1.7, maxWidth: 220 }}>
              Specialty coffee, artisan food, and a cosy corner for every mood.
            </p>
            {/* Social */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              {[Share2, Globe, MessageCircle].map((Icon, i) => (
                <a key={i} href="#" aria-label="Social link"
                  style={{ color: 'rgba(245,230,211,0.5)', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-amber)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,230,211,0.5)'}>
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-amber)', marginBottom: '1rem' }}>Quick Links</h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {QUICK_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} style={{ fontSize: '0.9rem', color: 'rgba(245,230,211,0.65)', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-cream-100)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,230,211,0.65)'}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-amber)', marginBottom: '1rem' }}>Hours</h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {HOURS.map(({ day, time }) => (
                <li key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'rgba(245,230,211,0.65)', gap: '1rem' }}>
                  <span>{day}</span><span style={{ color: 'var(--color-cream-200)' }}>{time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-amber)', marginBottom: '1rem' }}>Contact</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { Icon: MapPin, text: '12 Brew Lane, Mumbai 400001' },
                { Icon: Phone, text: '+91 98765 43210' },
                { Icon: Mail,  text: 'hello@brewandco.in' },
              ].map(({ Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'rgba(245,230,211,0.65)' }}>
                  <Icon size={15} style={{ color: 'var(--color-amber)', flexShrink: 0 }} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'rgba(245,230,211,0.4)', margin: 0 }}>
            © {new Date().getFullYear()} Brew & Co. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            {['Privacy Policy', 'Terms of Service'].map((t) => (
              <a key={t} href="#" style={{ fontSize: '0.8rem', color: 'rgba(245,230,211,0.4)', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-cream-200)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,230,211,0.4)'}>
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
