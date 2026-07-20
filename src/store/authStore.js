import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, signOut, fetchUserProfile } from '@/lib/supabase';

/**
 * AUTH STORE — Source of truth for user identity in the React app.
 *
 * WHERE THIS DATA LIVES:
 * ─────────────────────────────────────────────────────────────────
 * 1. Supabase localStorage  ('sb-<ref>-auth-token')
 *    → Raw JWT access token + refresh token (managed by @supabase/supabase-js)
 *    → Auto-refreshed 5 min before expiry. You never touch this directly.
 *
 * 2. Zustand + localStorage ('brewco-auth')
 *    → Lightweight user object: { id, name, email, role, loyalty_stamps }
 *    → access_token stored here for attaching to Express API calls
 *    → Persisted across page refreshes via zustand/persist
 *
 * 3. Supabase Postgres (cloud)
 *    → auth.users    : email, provider, raw_user_meta_data, created_at
 *    → public.users  : id (FK→auth.users), name, role, phone, loyalty_stamps
 *
 * SYNC STRATEGY:
 *   supabase.auth.onAuthStateChange fires on:
 *     - SIGNED_IN  (email login, OAuth callback, session restore on page load)
 *     - SIGNED_OUT (logout or expired refresh token)
 *     - TOKEN_REFRESHED (silent access token refresh)
 *   We subscribe to this in initAuthListener() called once from main.jsx.
 */

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:      null,
      token:     null,
      isLoading: true,   // true until the first onAuthStateChange fires

      /** Called by AuthCallback and by the onAuthStateChange listener */
      setAuth: (user, token) => set({ user, token, isLoading: false }),

      /** Clear everything on logout — clears UI state first, then kills the session */
      logout: async () => {
        // Clear Zustand immediately so the UI reacts at once (navbar, guards, etc.)
        set({ user: null, token: null, isLoading: false });
        // Then clear the Supabase localStorage session (scope:'local' = always clears locally)
        try { await signOut(); } catch { /* session already cleared above */ }
      },

      /** Patch specific user fields (e.g. after loyalty stamp added) */
      updateUser: (partial) =>
        set({ user: { ...get().user, ...partial } }),

      setLoading: (v) => set({ isLoading: v }),
    }),
    {
      name: 'brewco-auth',
      // Only persist user object + token — isLoading is transient
      partialize: (s) => ({ user: s.user, token: s.token }),
      // After rehydration from localStorage, isLoading can be resolved
      // immediately if we already have a persisted token
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If we have a persisted token, mark loading as done
          // The onAuthStateChange listener will re-validate + refresh the token
          state.isLoading = !state.token;
        }
      },
    }
  )
);

/**
 * initAuthListener()
 *
 * Subscribe to Supabase auth state changes.
 * Call this ONCE in main.jsx before rendering <App />.
 *
 * Why here and not inside a component?
 * → Components mount/unmount — the listener must live for the app's lifetime.
 * → Avoids double-subscription in React StrictMode.
 *
 * Returns the unsubscribe function (call on app teardown if needed).
 */
export function initAuthListener() {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        useAuthStore.setState({ user: null, token: null, isLoading: false });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        const supaUser = session.user;

        // ── Step 1: set token + basic user immediately ─────────────────────
        // This unblocks waitForAuth() in Auth.jsx so navigation happens at once
        // instead of waiting for the profile DB round-trip.
        const basicUser = {
          id:             supaUser.id,
          email:          supaUser.email,
          name:           supaUser.user_metadata?.full_name
                          || supaUser.email?.split('@')[0],
          phone:          null,
          role:           'customer',
          loyalty_stamps: 0,
        };
        useAuthStore.setState({
          user:      basicUser,
          token:     session.access_token,
          isLoading: false,
        });

        // ── Step 2: fetch extended profile in background ────────────────────
        // Updates name, role, loyalty_stamps, phone once the DB responds.
        fetchUserProfile(supaUser.id).then(({ profile }) => {
          if (!profile) return;
          useAuthStore.setState({
            user: {
              ...basicUser,
              name:           profile.name           || basicUser.name,
              phone:          profile.phone          || null,
              role:           profile.role           || 'customer',
              loyalty_stamps: profile.loyalty_stamps ?? 0,
            },
          });
        }).catch(() => { /* profile fetch failed — basicUser still works */ });
      }
    }
  );

  return () => subscription.unsubscribe();
}

// ── Selector helpers — use these in components ────────────────────────────
// e.g. const isStaff = useAuthStore(selectIsStaff);
export const selectIsAuthenticated = (s) => !!s.token;
export const selectIsOwner   = (s) => s.user?.role === 'owner';
export const selectIsStaff   = (s) => ['owner', 'staff'].includes(s.user?.role);
export const selectIsCustomer= (s) => s.user?.role === 'customer';

