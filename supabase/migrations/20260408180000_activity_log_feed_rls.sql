-- Following Feed RLS Fix (B2)
--
-- Problem: activity_log RLS only allowed users to read their OWN logs
-- (auth.uid() = user_id). This made getFollowingFeed() always return []
-- because users couldn't read activity_log entries of followed users —
-- the Following Feed could never render populated state.
--
-- Fix: Add a second SELECT policy that allows reading feed-relevant
-- actions of users the current user follows. Restricted to the 12
-- FEED_ACTIONS used by the Following Feed widget (never page_view or
-- other private actions).
--
-- Context: Session 2026-04-08, B2 Following Feed E2E audit.

CREATE POLICY "Users read feed activity of followed users"
ON activity_log
FOR SELECT
USING (
  user_id IN (
    SELECT following_id
    FROM user_follows
    WHERE follower_id = (SELECT auth.uid())
  )
  AND action = ANY (ARRAY[
    'trade_buy',
    'trade_sell',
    'research_create',
    'post_create',
    'lineup_submit',
    'follow',
    'bounty_submit',
    'bounty_create',
    'offer_create',
    'offer_accept',
    'poll_create',
    'vote_create'
  ])
);
