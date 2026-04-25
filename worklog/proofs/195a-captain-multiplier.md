# Slice 195a Proof — Captain-Multiplier 1.1×

**Datum:** 2026-04-25
**Migration:** `slice_195a_captain_multiplier_1p1x` (applied via mcp__supabase__apply_migration)
**Funktion:** `public.score_event(uuid)` (CREATE OR REPLACE)

## Verify Live (post-apply)

```sql
SELECT
  pg_get_functiondef('public.score_event(uuid)'::regprocedure) ILIKE '%v_gw_score * 1.1%'  AS has_default_1p1,
  pg_get_functiondef('public.score_event(uuid)'::regprocedure) ILIKE '%v_gw_score * 1.25%' AS has_chip_1p25,
  pg_get_functiondef('public.score_event(uuid)'::regprocedure) ILIKE '%v_gw_score * 3.0%'  AS has_old_3p0,
  pg_get_functiondef('public.score_event(uuid)'::regprocedure) ILIKE '%v_gw_score * 1.5%'  AS has_old_1p5,
  obj_description('public.score_event(uuid)'::regprocedure) AS function_comment;
```

**Result:**
```json
[{
  "has_default_1p1": true,
  "has_chip_1p25":   true,
  "has_old_3p0":     false,
  "has_old_1p5":     false,
  "function_comment": "Slice 195a (2026-04-25): Captain 1.1x default, 1.25x with captain_boost chip"
}]
```

## Body-Patch (vorher / nachher)

**Vorher (`20260407190000_score_event_no_lineups_handling.sql:120-126`):**
```sql
-- Captain bonus: 3.0x with triple_captain chip, 1.5x default
IF v_captain_slot IS NOT NULL AND v_captain_slot = v_slot_key THEN
  IF v_has_triple_captain THEN
    v_gw_score := LEAST(300, ROUND(v_gw_score * 3.0));
  ELSE
    v_gw_score := LEAST(150, ROUND(v_gw_score * 1.5));
  END IF;
END IF;
```

**Nachher (Slice 195a):**
```sql
-- Slice 195a: Captain bonus 1.1x default (+10%), 1.25x with captain_boost chip
-- (BeScout-eigene Multiplier — Skill-Reward, kein Gambling-Variance)
IF v_captain_slot IS NOT NULL AND v_captain_slot = v_slot_key THEN
  IF v_has_triple_captain THEN
    v_gw_score := LEAST(150, ROUND(v_gw_score * 1.25));
  ELSE
    v_gw_score := LEAST(150, ROUND(v_gw_score * 1.1));
  END IF;
END IF;
```

**Bonus-Compliance-Fix:**
- `'Kein Gewinner'` → `'Keine Top-Platzierung'` (Lines 258 + 351 in 0-Lineup-Branch + Final-Return)
- Verletzt nicht mehr business.md Glossar (`Gewinner → Top-Platzierung`)

## CEO-Decision Reference
Anil 2026-04-25 (Chat):
> "captain mulitplier x 1,1, das soll 10% bonus geben, und der triple chip soll den auf 1,25 boosten können."

## Impact-Berechnung (Worst-Case-Test)

Bei Base-Score 100, Captain-Slot:
- **Vorher:** `LEAST(150, 100 * 1.5)` = 150 (Cap-getriggered)
- **Nachher Default:** `LEAST(150, 100 * 1.1)` = 110 (kein Cap)
- **Nachher Boost-Chip:** `LEAST(150, 100 * 1.25)` = 125

Cap-Limit (150) bleibt unverändert — wirkt jetzt nur bei extreme Base-Scores (>136 für Boost, >137 für Default). Realistisch fast nie.

## CTO-Notes / Self-Review (D35: trivial 2-Konstanten-Change)

- **Scope:** Nur 2 Multiplier-Konstanten + 1 Cap-Wert (300→150) + 2 Compliance-Strings.
- **Logik unverändert:** v_has_triple_captain Branch + v_captain_slot Match-Logic identisch.
- **Migration-Header:** Source-of-truth ist `20260407190000` (latest score_event Body) — patches preserved (auth.uid()-Guard, club_admin-Check, scored_at-Guard).
- **Risk:** Niedrig. Reviewer-Agent kann später Cold-Context-Pass machen falls gewünscht.
- **Tests:** Keine bestehenden Tests fuer score_event Captain-Bonus existieren. Sollte in 195d (Bench+Auto-Sub) Test-Suite mit reinkommen.
- **Money-Path:** Score-Reduktion bei Captain-Slot → niedrigere Reward-Auszahlung. Aber: BeScout ist pre-Beta, keine User-Earnings tangiert.

## Related Files

- Migration: `supabase/migrations/20260425_slice_195a_captain_multiplier_1p1x.sql` (via apply_migration)
- Spec: `worklog/specs/195-fantasy-mechanics-overhaul.md`
- Phase A Source: `worklog/audits/2026-04-25/fantasy.md` Finding F-03

## Stage-Chain

SPEC → IMPACT skipped (RPC-Body-Patch only) → BUILD (apply_migration) → REVIEW self per D35 → PROVE (this file) → LOG pending
