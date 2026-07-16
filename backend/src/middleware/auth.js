/**
 * middleware/auth.js
 *
 * Verifies that the incoming request carries a valid Supabase JWT.
 * Attaches the decoded user to req.user for use in route handlers.
 *
 * Usage:
 *   const { requireAuth, requireStaff, requireOwner } = require('../middleware/auth');
 *   router.get('/protected', requireAuth, handler);
 *   router.patch('/admin-only', requireOwner, handler);
 */

const { createClient } = require('@supabase/supabase-js');

// Admin client — uses SERVICE ROLE key (bypasses RLS for server-side operations)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/**
 * requireAuth — verifies the Bearer JWT, fetches full user profile
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Supabase validates the token and returns the user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // Fetch the full profile (role, loyalty_stamps) from public.users
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, loyalty_stamps')
      .eq('id', user.id)
      .single();

    if (profErr) {
      // Profile not found — very rare (trigger race condition on first signup)
      console.warn('[auth] Profile not found for user', user.id);
    }

    req.user = {
      id:             user.id,
      email:          user.email,
      name:           profile?.name || user.user_metadata?.full_name,
      role:           profile?.role || 'customer',
      loyalty_stamps: profile?.loyalty_stamps ?? 0,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireStaff — requireAuth + role must be 'staff' or 'owner'
 */
function requireStaff(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (!['staff', 'owner'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Staff access required.' });
    }
    next();
  }).catch(next);
}

/**
 * requireOwner — requireAuth + role must be 'owner'
 */
function requireOwner(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user?.role !== 'owner') {
      return res.status(403).json({ error: 'Owner access required.' });
    }
    next();
  }).catch(next);
}

module.exports = { requireAuth, requireStaff, requireOwner, supabaseAdmin };
