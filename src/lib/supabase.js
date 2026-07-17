/**
 * src/lib/supabase.js
 *
 * Single shared Supabase client for the entire frontend.
 *
 * AUTH FLOW OVERVIEW
 * ──────────────────
 * Email/Password:
 *   signUp  → supabase.auth.signUp()    → Supabase creates user in auth.users
 *   signIn  → supabase.auth.signInWithPassword()
 *   Both return { data: { session, user }, error }
 *
 * Google OAuth (PKCE):
 *   1. signInWithOAuth({ provider:'google' })
 *      → Supabase redirects browser to Google consent screen
 *      → Google redirects back to VITE_SITE_URL/auth/callback with ?code=
 *   2. AuthCallback.jsx calls supabase.auth.exchangeCodeForSession(code)
 *      → Supabase returns session + user
 *   3. onAuthStateChange fires → authStore syncs
 *
 * SESSION STORAGE (where tokens live)
 * ─────────────────────────────────────
 *   • Supabase stores the JWT access token + refresh token in
 *     localStorage key: 'sb-<project-ref>-auth-token'
 *   • Access token: short-lived (1 hour), signed JWT
 *   • Refresh token: long-lived, rotated on every refresh
 *   • The Supabase client auto-refreshes the access token silently
 *     5 minutes before expiry — no manual handling needed.
 *
 * WHERE ALL DATA IS STORED (full map)
 * ─────────────────────────────────────
 *   auth.users        → Supabase managed Postgres table (email, provider, metadata)
 *   public.users      → Your custom users table (name, role, loyalty_stamps, phone)
 *   public.orders     → All orders (linked to user_id, nullable for guest)
 *   public.order_items→ Line items per order
 *   public.menu_items → Menu catalogue
 *   public.reservations→ Table bookings
 *   public.reviews    → Ratings + comments
 *   public.promo_codes→ Discount codes
 *   Supabase Storage  → Menu item images (bucket: 'menu-images')
 *   localStorage      → JWT session (managed by Supabase client automatically)
 *   Zustand (memory + localStorage['brewco-auth']) → App-level user object + role
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY= import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.\n' +
    'Copy .env.example → .env and fill in your project credentials.\n' +
    'Auth features will not work until these are set.'
  );
}

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      // false → AuthCallback is the ONLY place that calls exchangeCodeForSession.
      // Prevents initAuthListener() in main.jsx from consuming the one-time
      // PKCE code before AuthCallback mounts (race condition / double-fire fix).
      detectSessionInUrl: false,
    },
  }
);

// ─── Auth helpers ────────────────────────────────────────────────────────────

/**
 * Sign up with email + password.
 * After signup, Supabase sends a confirmation email.
 * The user row in auth.users is created immediately.
 * Your public.users row is created via a Postgres trigger (see migrations).
 */
export async function signUpWithEmail({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },           // stored in auth.users.raw_user_meta_data
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

/**
 * Sign in with email + password.
 * Returns { session, user } on success.
 */
export async function signInWithEmail({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/**
 * Initiate Google OAuth (PKCE).
 * This REDIRECTS the browser — no return value to await.
 * After Google consent, browser lands on /auth/callback.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',   // request refresh token from Google
        prompt: 'consent',        // always show consent (ensures refresh token)
      },
    },
  });
  if (error) throw error;
  // Browser is now redirecting — nothing to return
}

/**
 * Exchange the ?code= from Google redirect for a Supabase session.
 * Called from AuthCallback.jsx only.
 */
export async function exchangeCodeForSession(code) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  return { data, error };
}

/**
 * Sign out — clears Supabase localStorage session + revokes refresh token.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the currently active session (reads from localStorage — synchronous).
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session, error };
}

/**
 * Fetch the extended user profile from public.users table.
 * This has role, loyalty_stamps, phone — not available in auth.users.
 */
export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, role, loyalty_stamps, created_at')
    .eq('id', userId)
    .single();
  return { profile: data, error };
}
