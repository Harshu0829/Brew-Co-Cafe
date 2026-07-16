/**
 * src/pages/AuthCallback.jsx — debug build
 * Shows all URL params + detailed error info to diagnose auth issues.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, fetchUserProfile } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Coffee, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const [status, setStatus]   = useState('loading');
  const [errMsg, setErrMsg]   = useState('');
  const [debugInfo, setDebug] = useState({});
  const { setAuth }           = useAuthStore();
  const navigate              = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      // ── Collect debug info ─────────────────────────────────────────────────
      const params     = new URLSearchParams(window.location.search);
      const hash       = window.location.hash;
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const debug = {
        href:         window.location.href,
        code:         params.get('code')      || '(none)',
        error:        params.get('error')     || '(none)',
        errorDesc:    params.get('error_description') || '(none)',
        hashToken:    hashParams.get('access_token') ? '(present)' : '(none)',
        hashError:    hashParams.get('error') || '(none)',
        supabaseUrl:  import.meta.env.VITE_SUPABASE_URL || '(not set)',
        hasAnonKey:   import.meta.env.VITE_SUPABASE_ANON_KEY ? 'yes' : 'no',
      };
      setDebug(debug);
      console.log('[AuthCallback] Debug:', debug);

      // ── Check for OAuth errors ─────────────────────────────────────────────
      const oauthError = params.get('error') || hashParams.get('error');
      if (oauthError) {
        const desc = params.get('error_description') || hashParams.get('error_description') || oauthError;
        setErrMsg(`OAuth error: ${desc}`);
        setStatus('error');
        return;
      }

      // ── Try getSession first (in case detectSessionInUrl already handled it) 
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('[AuthCallback] getSession result:', { session: !!sessionData?.session, error: sessionError?.message });

      if (sessionData?.session) {
        await handleSuccess(sessionData.session);
        return;
      }

      // ── Try manual PKCE code exchange if ?code= is present ────────────────
      const code = params.get('code');
      if (code) {
        console.log('[AuthCallback] Attempting manual code exchange...');
        const { data, error: exchError } = await supabase.auth.exchangeCodeForSession(code);
        console.log('[AuthCallback] Exchange result:', { session: !!data?.session, error: exchError?.message });

        if (exchError) {
          setErrMsg(`Exchange failed: ${exchError.message}`);
          setStatus('error');
          return;
        }
        if (data?.session) {
          await handleSuccess(data.session);
          return;
        }
      }

      // ── No code or session ─────────────────────────────────────────────────
      setErrMsg(
        code
          ? 'Code exchange returned no session. Session error: ' + (sessionError?.message || 'unknown')
          : 'No code or token in URL. Check your Supabase Redirect URL settings.'
      );
      setStatus('error');
    }

    async function handleSuccess(session) {
      const supaUser = session.user;
      const { profile } = await fetchUserProfile(supaUser.id);
      const appUser = {
        id:             supaUser.id,
        email:          supaUser.email,
        name:           profile?.name || supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0],
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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1.25rem' }}>
        <Coffee size={36} style={{ color: 'var(--color-amber)' }} className="animate-pulse-amber" />
        <h2 className="font-display" style={{ fontSize: '1.5rem', margin: 0 }}>Signing you in…</h2>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(212,134,11,0.2)', borderTop: '3px solid var(--color-amber)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error state with debug info ────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1rem', padding: '2rem' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(192,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertCircle size={28} style={{ color: '#f87171' }} />
      </div>
      <h2 className="font-display" style={{ fontSize: '1.5rem', margin: 0 }}>Sign-in Failed</h2>
      <p style={{ color: 'rgba(245,230,211,0.55)', textAlign: 'center', maxWidth: 400, margin: 0 }}>{errMsg}</p>

      {/* Debug panel */}
      <details style={{ width: '100%', maxWidth: 520, marginTop: '0.5rem' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'rgba(245,230,211,0.4)', marginBottom: '0.5rem' }}>
          🔍 Debug info (share this to diagnose)
        </summary>
        <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: 8, fontSize: '0.72rem', color: 'rgba(245,230,211,0.7)', overflowX: 'auto', textAlign: 'left', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </details>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button className="btn btn-primary" onClick={() => navigate('/auth')}>Try Again</button>
        <button className="btn btn-ghost"   onClick={() => navigate('/')}>Go Home</button>
      </div>
    </div>
  );
}
