/**
 * src/pages/AuthCallback.jsx
 *
 * Handles Google OAuth redirect (PKCE flow).
 *
 * KEY DESIGN DECISIONS:
 * ─────────────────────
 * • detectSessionInUrl is set to FALSE in supabase.js so the Supabase client
 *   does NOT auto-consume the ?code= on init. This component is the ONLY
 *   place that calls exchangeCodeForSession — preventing the race condition
 *   where initAuthListener() (main.jsx) consumed the one-time code first.
 *
 * • We do NOT subscribe to onAuthStateChange here. The global listener in
 *   authStore (initAuthListener) picks up the SIGNED_IN event automatically
 *   after a successful exchange and syncs the Zustand store.
 *
 * • React StrictMode double-invokes effects in dev. We guard against the
 *   second call by checking if a session already exists before exchanging.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, fetchUserProfile } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Coffee, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const [status, setStatus] = useState('loading');
  const [errMsg, setErrMsg] = useState('');
  const { setAuth }         = useAuthStore();
  const navigate            = useNavigate();
  // Guard against React StrictMode double-invoke
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);

      // ── OAuth error from Google (user denied, etc.) ────────────────────────
      const oauthError = params.get('error');
      if (oauthError) {
        const desc = params.get('error_description') || oauthError;
        setErrMsg(`Google sign-in error: ${desc}`);
        setStatus('error');
        return;
      }

      // ── If we already have a session (StrictMode re-run or direct nav) ─────
      const { data: existing } = await supabase.auth.getSession();
      if (existing?.session) {
        await handleSuccess(existing.session);
        return;
      }

      // ── Get the PKCE code from the URL ─────────────────────────────────────
      const code = params.get('code');
      if (!code) {
        setErrMsg('No authorisation code found. Please try signing in again.');
        setStatus('error');
        return;
      }

      // ── Exchange code → session (single call, one-time-use code) ───────────
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[AuthCallback] Exchange error:', error.message);
        setErrMsg(`Sign-in failed: ${error.message}`);
        setStatus('error');
        return;
      }

      if (!data?.session) {
        setErrMsg('No session returned. Please try again.');
        setStatus('error');
        return;
      }

      await handleSuccess(data.session);
    }

    async function handleSuccess(session) {
      const supaUser = session.user;

      // Fetch extended profile (role, loyalty_stamps) from public.users
      const { profile } = await fetchUserProfile(supaUser.id);

      const appUser = {
        id:             supaUser.id,
        email:          supaUser.email,
        name:           profile?.name
                        || supaUser.user_metadata?.full_name
                        || supaUser.email?.split('@')[0],
        phone:          profile?.phone || null,
        role:           profile?.role  || 'customer',
        loyalty_stamps: profile?.loyalty_stamps ?? 0,
      };

      setAuth(appUser, session.access_token);

      const redirectTo = sessionStorage.getItem('auth_redirect') || '/account';
      sessionStorage.removeItem('auth_redirect');
      navigate(redirectTo, { replace: true });
    }

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1.25rem' }}>
        <Coffee size={36} style={{ color: 'var(--color-amber)' }} className="animate-pulse-amber" />
        <h2 className="font-display" style={{ fontSize: '1.5rem', margin: 0 }}>Signing you in…</h2>
        <p style={{ color: 'rgba(245,230,211,0.5)', margin: 0, fontSize: '0.9rem' }}>
          Verifying your Google account
        </p>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(212,134,11,0.2)', borderTop: '3px solid var(--color-amber)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1rem', padding: '2rem' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(192,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertCircle size={28} style={{ color: '#f87171' }} />
      </div>
      <h2 className="font-display" style={{ fontSize: '1.5rem', margin: 0 }}>Sign-in Failed</h2>
      <p style={{ color: 'rgba(245,230,211,0.55)', textAlign: 'center', maxWidth: 360, margin: 0 }}>{errMsg}</p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button className="btn btn-primary" onClick={() => navigate('/auth')}>Try Again</button>
        <button className="btn btn-ghost"   onClick={() => navigate('/')}>Go Home</button>
      </div>
    </div>
  );
}
