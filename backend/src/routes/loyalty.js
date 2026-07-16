const express = require('express');
const { requireAuth, requireOwner, supabaseAdmin } = require('../middleware/auth');

const router = express.Router();

const STAMP_GOAL = 9;

// ── POST /api/loyalty/stamp ───────────────────────────────────────────────
// Called by staff after a completed order to add a loyalty stamp manually.
// (Auto-stamp via DB trigger on order completion is the primary method.)
router.post('/stamp', requireOwner, async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required.' });

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, loyalty_stamps')
      .eq('id', user_id)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User not found.' });

    const newStamps = user.loyalty_stamps >= STAMP_GOAL ? 1 : user.loyalty_stamps + 1;
    const earnedFreeItem = newStamps === STAMP_GOAL;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('users')
      .update({ loyalty_stamps: newStamps })
      .eq('id', user_id)
      .select('id, name, loyalty_stamps')
      .single();
    if (updateErr) throw updateErr;

    res.json({
      ...updated,
      earned_free_item: earnedFreeItem,
      message: earnedFreeItem
        ? `🎉 ${user.name} has earned a free item!`
        : `Stamp added. ${STAMP_GOAL - newStamps} more to go.`,
    });
  } catch (err) { next(err); }
});

// ── GET /api/loyalty/status — customer views their own loyalty card ────────
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, loyalty_stamps')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;

    res.json({
      loyalty_stamps:   data.loyalty_stamps,
      stamps_goal:      STAMP_GOAL,
      stamps_remaining: Math.max(0, STAMP_GOAL - data.loyalty_stamps),
      has_free_item:    data.loyalty_stamps >= STAMP_GOAL,
    });
  } catch (err) { next(err); }
});

module.exports = router;
