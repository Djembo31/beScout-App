-- =============================================================================
-- Slice 251 Wave 2 Track F — user_wildcards Composite-PK pro Liga
--
-- Source-of-truth: supabase/migrations/20260326_wildcards.sql (initial schema)
-- Applied patches:
--   2026-05-04 SO-5: 2 SQL-Bugs gefixt (Original-Body wurde nie applied — siehe v1):
--     #1 INSERT...SELECT bs.* FROM balance_splits → FROM balance_splits AS bs (alias-Bug)
--     #2 DROP CONSTRAINT user_wildcards_pkey muss VOR INSERT (sonst PK-Konflikt)
--
--   Applied 2026-05-04 via mcp__supabase__apply_migration mit Anil-go.
--
-- Verify-SQL post-apply:
--   -- 1. PK-Check (muss 2 Rows liefern: user_id + league_id)
--   SELECT a.attname
--   FROM pg_index i
--   JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
--   WHERE i.indrelid = 'public.user_wildcards'::regclass
--     AND i.indisprimary
--   ORDER BY a.attnum;
--   -- Expected: user_id, league_id
--
--   -- 2. RLS-Policies post-apply:
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_wildcards';
--   -- Expected: 4 Policies (SELECT, INSERT, UPDATE, DELETE)
--
--   -- 3. Sum-Smoke: Balance-Summe pro User muss identisch bleiben
--   --    PRE-apply: SELECT user_id, SUM(balance) FROM user_wildcards GROUP BY user_id;
--   --    POST-apply: SELECT user_id, SUM(balance) FROM user_wildcards GROUP BY user_id;
--   --    → Differenz muss 0 sein (AC-24)
--
--   -- 4. League-Distribution-Smoke:
--   SELECT uw.user_id, COUNT(uw.league_id) AS league_rows
--   FROM user_wildcards uw
--   GROUP BY uw.user_id
--   ORDER BY league_rows DESC
--   LIMIT 10;
--   -- Expected: jeder User hat N Rows (N = Anzahl aktiver Ligen beim Backfill)
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: ADD league_id column (NULLABLE initial für Backfill)
-- =============================================================================
ALTER TABLE public.user_wildcards
  ADD COLUMN league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE;

-- =============================================================================
-- STEP 1b (Bug #2 fix 2026-05-04 SO-5): DROP alte single-column PK
-- ZUERST, sonst blockt sie das INSERT in STEP 2 mit duplicate-key error.
-- =============================================================================
ALTER TABLE public.user_wildcards DROP CONSTRAINT user_wildcards_pkey;

-- =============================================================================
-- STEP 2: Backfill — split existing balance across active leagues
--
-- Logic:
-- - Cascade-Default-Liga = profile.favorite_club_id → clubs.league_id
--   (falls kein favorite_club: erste aktive Liga alphabetisch)
-- - balance pro Liga = FLOOR(balance / N)
-- - Modulo-Rest (balance % N) geht in Cascade-Default-Liga
-- - earned_total / spent_total: gleiche Floor-Split-Logic
-- =============================================================================

-- a) First insert a row per (existing user, active league) combination
-- using CTE for clarity + correctness
WITH
active_leagues AS (
  SELECT id, name, ROW_NUMBER() OVER (ORDER BY name ASC) AS rn
  FROM public.leagues
  WHERE is_active = true
),
league_count AS (
  SELECT COUNT(*) AS n FROM active_leagues
),
user_default_league AS (
  -- Cascade-Default: user.favorite_club.league_id, fallback = first active league alphabetically
  SELECT
    p.id AS user_id,
    COALESCE(c.league_id, (SELECT id FROM active_leagues WHERE rn = 1)) AS default_league_id
  FROM public.profiles p
  LEFT JOIN public.clubs c ON c.id = p.favorite_club_id
),
balance_splits AS (
  SELECT
    uw.user_id,
    al.id AS league_id,
    -- Modulo-Rest in Cascade-Default-Liga, alle anderen bekommen FLOOR
    CASE
      WHEN al.id = udl.default_league_id THEN
        FLOOR(uw.balance::numeric / lc.n)::int
        + (uw.balance % lc.n::int)
      ELSE
        FLOOR(uw.balance::numeric / lc.n)::int
    END AS final_balance,
    -- Fix #9 (P2): Modulo-Rest auch für earned_total/spent_total in Cascade-Default-Liga
    -- Sum-Invariant: SUM(earned_total) post-Migration == pre-Migration per User
    CASE
      WHEN al.id = udl.default_league_id THEN
        FLOOR(uw.earned_total::numeric / lc.n)::int + (uw.earned_total % lc.n::int)
      ELSE
        FLOOR(uw.earned_total::numeric / lc.n)::int
    END AS final_earned,
    CASE
      WHEN al.id = udl.default_league_id THEN
        FLOOR(uw.spent_total::numeric / lc.n)::int + (uw.spent_total % lc.n::int)
      ELSE
        FLOOR(uw.spent_total::numeric / lc.n)::int
    END AS final_spent
  FROM public.user_wildcards uw
  CROSS JOIN active_leagues al
  CROSS JOIN league_count lc
  LEFT JOIN user_default_league udl ON udl.user_id = uw.user_id
  -- Exclude the sentinel row where league_id IS NULL (= current single-PK row)
  WHERE uw.league_id IS NULL
)
-- b) Insert new (user_id, league_id) rows with split balances
INSERT INTO public.user_wildcards (user_id, league_id, balance, earned_total, spent_total, updated_at)
SELECT
  bs.user_id,
  bs.league_id,
  bs.final_balance,
  bs.final_earned,
  bs.final_spent,
  now()
FROM balance_splits AS bs;
-- Bug #1 fix 2026-05-04 SO-5: alias `bs` muss explizit, sonst missing FROM-clause für `bs.*`.

-- c) Delete the original single-PK rows (those without league_id)
DELETE FROM public.user_wildcards WHERE league_id IS NULL;

-- =============================================================================
-- STEP 3: Add composite PK (alte PK wurde in STEP 1b bereits gedropped)
-- =============================================================================
ALTER TABLE public.user_wildcards ALTER COLUMN league_id SET NOT NULL;
ALTER TABLE public.user_wildcards
  ADD CONSTRAINT user_wildcards_pkey PRIMARY KEY (user_id, league_id);

-- =============================================================================
-- STEP 4: Add index for league-only lookups (RPC: balance per league)
-- =============================================================================
CREATE INDEX idx_user_wildcards_league ON public.user_wildcards (league_id);

-- =============================================================================
-- STEP 5: RLS — update existing + add missing policies for composite PK
-- =============================================================================

-- Drop existing policies (they referenced user_id which still works, but rewrite for clarity)
DROP POLICY IF EXISTS "Users see own wildcard balance" ON public.user_wildcards;

-- SELECT: user can read own rows (any league)
CREATE POLICY "user_wildcards_select_own"
  ON public.user_wildcards FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: SECURITY DEFINER RPCs only — authenticated can NOT insert directly
-- (Table is access via REVOKE ALL, only SERVICE DEFINER RPCs write to it)
-- No INSERT RLS policy needed for direct client access (RPCs handle it)
-- But we need one for RLS completeness with REVOKE ALL below:
CREATE POLICY "user_wildcards_insert_own"
  ON public.user_wildcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: own rows only (RPCs use SECURITY DEFINER, but defense-in-depth)
CREATE POLICY "user_wildcards_update_own"
  ON public.user_wildcards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: blocked for all clients (only CASCADE on user delete is allowed)
CREATE POLICY "user_wildcards_delete_cascade_only"
  ON public.user_wildcards FOR DELETE
  USING (false);

-- Ensure RLS is enabled (was already enabled, but explicit is safe)
ALTER TABLE public.user_wildcards ENABLE ROW LEVEL SECURITY;

-- Maintain existing GRANT pattern (SELECT only for authenticated)
-- REVOKE ALL + re-GRANT keeps consistent with original migration
REVOKE ALL ON public.user_wildcards FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.user_wildcards TO authenticated;

COMMIT;
