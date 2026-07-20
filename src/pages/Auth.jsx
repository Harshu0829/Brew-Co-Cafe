import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Coffee, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

/* ── Zod schemas ────────────────────────────────────────────────────────── */
const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
});

const registerSchema = z.object({
  name:            z.string().min(2, 'Name must be at least 2 characters'),
  email:           z.string().email('Enter a valid email'),
  password:        z.string().min(8, 'Minimum 8 characters')
                             .regex(/[A-Z]/, 'Include at least one uppercase letter')
                             .regex(/[0-9]/, 'Include at least one number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/* ── Small reusable field wrapper ───────────────────────────────────────── */
function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: 'rgba(245,230,211,0.85)' }}>
        {label}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

/* ── Google button ──────────────────────────────────────────────────────── */
function GoogleButton({ onClick, disabled }) {
  return (
    <button
      id="auth-google"
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn btn-secondary"
      style={{ width: '100%', padding: '0.7rem', gap: '0.6rem', opacity: disabled ? 0.6 : 1 }}
    >
      {/* Google logo SVG */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>
  );
}

/* ── Divider ────────────────────────────────────────────────────────────── */
function OrDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(212,134,11,0.15)' }} />
      <span style={{ fontSize: '0.78rem', color: 'rgba(245,230,211,0.35)', fontWeight: 500 }}>OR</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(212,134,11,0.15)' }} />
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function AuthPage() {
  const [mode, setMode]         = useState('login');   // 'login' | 'register'
  const [showPass, setShowPass] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  // Wait for the auth listener to populate the token in Zustand
  const waitForAuth = () =>
    new Promise((resolve) => {
      const unsub = useAuthStore.subscribe((state) => {
        if (state.token) { unsub(); resolve(); }
      });
      // If token already set (e.g. session restored), resolve immediately
      if (useAuthStore.getState().token) { unsub(); resolve(); }
      // Timeout safety — don't block forever
      setTimeout(() => { unsub(); resolve(); }, 5000);
    });

  const schema = mode === 'login' ? loginSchema : registerSchema;
  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  /* ── Email / Password submit ──────────────────────────────────────────── */
  const onSubmit = async (data) => {
    setServerErr('');
    setVerifyMsg('');

    if (mode === 'login') {
      /* ── SIGN IN ──────────────────────────────────────────────────────
         Calls:   supabase.auth.signInWithPassword()
         Stores:  JWT in localStorage ('sb-<ref>-auth-token')
         Then:    onAuthStateChange(SIGNED_IN) fires in authStore listener
                  → fetches public.users profile → sets Zustand state
         Result:  user lands on /account
      ──────────────────────────────────────────────────────────────── */
      const { error } = await signInWithEmail({ email: data.email, password: data.password });
      if (error) {
        setServerErr(error.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : error.message);
        return;
      }
      // Wait for onAuthStateChange → authStore to sync, THEN navigate
      await waitForAuth();
      navigate('/account', { replace: true });

    } else {
      /* ── REGISTER ─────────────────────────────────────────────────────
         Calls:   supabase.auth.signUp()
         Stores:  creates row in auth.users immediately
                  + Postgres trigger creates row in public.users
                  + sends confirmation email (Supabase email templates)
         If email confirmation is enabled:
                  user must click email link before they can log in
                  We show a "check your inbox" message.
         If email confirmation is disabled (dev mode):
                  onAuthStateChange(SIGNED_IN) fires immediately
      ──────────────────────────────────────────────────────────────── */
      const { data: signUpData, error } = await signUpWithEmail({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (error) {
        // 'User already registered' means they should log in instead
        if (error.message?.includes('already registered')) {
          setServerErr('An account with this email already exists. Please sign in.');
        } else {
          setServerErr(error.message);
        }
        return;
      }

      // Email confirmation required (Supabase default)
      if (signUpData?.user && !signUpData?.session) {
        setVerifyMsg('✅ Check your inbox! We sent a confirmation link to ' + data.email);
        reset();
        setMode('login');
        return;
      }

      // Email confirmation disabled — signed in immediately
      await waitForAuth();
      navigate('/account', { replace: true });
    }
  };

  /* ── Google OAuth ─────────────────────────────────────────────────────── */
  const handleGoogle = async () => {
    setServerErr('');
    setGoogleLoading(true);
    try {
      // Save the intended redirect destination
      sessionStorage.setItem('auth_redirect', '/account');
      // This REDIRECTS the browser — no return value to handle here.
      // Browser will land on /auth/callback after Google consent.
      await signInWithGoogle();
    } catch (err) {
      setServerErr(err.message || 'Google sign-in failed. Try again.');
      setGoogleLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setServerErr('');
    setVerifyMsg('');
    reset();
  };

  return (
    <div className="section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', paddingTop: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Coffee size={36} style={{ color: 'var(--color-amber)', margin: '0 auto 0.75rem' }} />
          <h1 className="font-display" style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>
            {mode === 'login' ? 'Welcome Back' : 'Join Brew & Co'}
          </h1>
          <p style={{ color: 'rgba(245,230,211,0.55)', fontSize: '0.9rem' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your free account and start earning rewards'}
          </p>
        </div>

        {/* Verify success message */}
        {verifyMsg && (
          <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(26,127,55,0.12)', border: '1px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <CheckCircle size={16} style={{ color: '#4ade80', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '0.875rem', color: '#4ade80', lineHeight: 1.5 }}>{verifyMsg}</span>
          </div>
        )}

        {/* Mode tabs */}
        <div style={{ display: 'flex', background: 'rgba(44,24,16,0.5)', borderRadius: 'var(--radius-full)', padding: '4px', marginBottom: '1.75rem' }}>
          {[
            { id: 'login',    label: 'Sign In' },
            { id: 'register', label: 'Register' },
          ].map(({ id, label }) => (
            <button key={id} id={`auth-tab-${id}`}
              onClick={() => switchMode(id)}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-full)',
                border: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.875rem', transition: 'all 0.2s',
                background: mode === id ? 'var(--color-amber)' : 'transparent',
                color: mode === id ? 'var(--color-brew-900)' : 'rgba(245,230,211,0.55)',
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* ── Google button (always first — reduces friction) ── */}
          <GoogleButton onClick={handleGoogle} disabled={googleLoading || isSubmitting} />
          {googleLoading && (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(245,230,211,0.5)', margin: '-0.25rem 0' }}>
              Redirecting to Google…
            </p>
          )}

          <OrDivider />

          {/* ── Server error ── */}
          {serverErr && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(192,0,0,0.1)', border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: '0.85rem', color: '#f87171', lineHeight: 1.5 }}>{serverErr}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} noValidate>

            {/* Name (register only) */}
            {mode === 'register' && (
              <Field label="Full Name" error={errors.name?.message}>
                <input id="auth-name" className="input" placeholder="Rohan Mehta" autoComplete="name" {...register('name')} />
              </Field>
            )}

            {/* Email */}
            <Field label="Email" error={errors.email?.message}>
              <input id="auth-email" className="input" type="email" placeholder="you@example.com"
                autoComplete={mode === 'login' ? 'username' : 'email'} {...register('email')} />
            </Field>

            {/* Password */}
            <Field label="Password" error={errors.password?.message}>
              <div style={{ position: 'relative' }}>
                <input id="auth-password" className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Min 8 chars, 1 upper, 1 number' : '••••••••'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: '2.75rem' }}
                  {...register('password')} />
                <button type="button" aria-label={showPass ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,230,211,0.4)', padding: 0 }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {/* Confirm Password (register only) */}
            {mode === 'register' && (
              <Field label="Confirm Password" error={errors.confirmPassword?.message}>
                <input id="auth-confirm-password" className="input" type="password" placeholder="••••••••"
                  autoComplete="new-password" {...register('confirmPassword')} />
              </Field>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
                <button type="button" onClick={() => alert('Password reset coming soon. Contact us at support@brewandco.in for help.')}
                  style={{ fontSize: '0.8rem', color: 'var(--color-amber)', opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Forgot password?
                </button>
              </div>

            )}

            {/* Submit */}
            <button id="auth-submit" type="submit" className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', fontSize: '1rem', marginTop: '0.25rem' }}
              disabled={isSubmitting || googleLoading}>
              {isSubmitting
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign In with Email' : 'Create Account')}
            </button>

            {/* Terms (register) */}
            {mode === 'register' && (
              <p style={{ fontSize: '0.75rem', color: 'rgba(245,230,211,0.4)', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
                By creating an account you agree to our{' '}
                <span style={{ color: 'var(--color-amber)', opacity: 0.8, cursor: 'pointer' }}>Privacy Policy</span>
                {' '}and{' '}
                <span style={{ color: 'var(--color-amber)', opacity: 0.8, cursor: 'pointer' }}>Terms of Service</span>.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
