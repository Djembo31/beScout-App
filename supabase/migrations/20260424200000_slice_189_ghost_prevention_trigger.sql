-- Slice 189 — Ghost-Prevention Player-Insert-Trigger
-- Date: 2026-04-24
-- Scope: Data-Integrity (no money, no schema change — trigger only)
--
-- Prevents DB-level creation of:
--   INV-39 (Cross-Club-Contamination): same-name player with appearances at another club
--   INV-40 (Same-Club Duplicates): case-insensitive name match within same club
--
-- Covers ALL insert pathways (scripts, future crons, manual SQL).
-- Does NOT block UPDATEs (transfers/renames remain valid).
-- Bypass for legitimate bulk-migrations: SET LOCAL bescout.allow_player_ghost_insert = 'true' (D28 pattern).
--
-- Namesvetter exception: same-name+different-club+both-inactive allowed (rare but valid).

CREATE OR REPLACE FUNCTION public.prevent_player_ghost_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Escape hatch for legitimate bulk-imports (D28 GUC pattern)
  IF current_setting('bescout.allow_player_ghost_insert', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Skip if critical fields are NULL — let other constraints handle that
  IF NEW.first_name IS NULL OR NEW.last_name IS NULL OR NEW.club_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check 1: Same-Club Duplicate (INV-40)
  IF EXISTS (
    SELECT 1 FROM public.players
    WHERE id != NEW.id
      AND club_id = NEW.club_id
      AND lower(trim(first_name)) = lower(trim(NEW.first_name))
      AND lower(trim(last_name)) = lower(trim(NEW.last_name))
  ) THEN
    RAISE EXCEPTION 'ghost_same_club: player % % already exists in club %',
      NEW.first_name, NEW.last_name, NEW.club_id
      USING ERRCODE = 'unique_violation';
  END IF;

  -- Check 2: Cross-Club-Contamination (INV-39)
  -- Block INSERT if same-name player with appearances exists at another club.
  -- Namesvetter (both inactive, last_appearance_gw = 0) remain allowed.
  IF EXISTS (
    SELECT 1 FROM public.players
    WHERE id != NEW.id
      AND club_id IS NOT NULL
      AND club_id != NEW.club_id
      AND lower(trim(first_name)) = lower(trim(NEW.first_name))
      AND lower(trim(last_name)) = lower(trim(NEW.last_name))
      AND last_appearance_gw > 0
  ) THEN
    RAISE EXCEPTION 'ghost_cross_club: player % % exists with appearances at different club (use SET LOCAL bescout.allow_player_ghost_insert = true for legitimate transfers)',
      NEW.first_name, NEW.last_name
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_player_ghost_insert() IS
  'Slice 189: DB-Level Ghost-Prevention (INV-39 Cross-Club + INV-40 Same-Club). Bypass: SET LOCAL bescout.allow_player_ghost_insert = true.';

-- Trigger: BEFORE INSERT only (UPDATE allowed for transfers/renames)
DROP TRIGGER IF EXISTS prevent_player_ghost_insert ON public.players;

CREATE TRIGGER prevent_player_ghost_insert
  BEFORE INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_player_ghost_insert();
