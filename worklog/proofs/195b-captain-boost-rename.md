# Slice 195b Proof — Boost-Chip Rename + Captain-only-Constraint

**Datum:** 2026-04-25
**Migrations:**
- `slice_195b_captain_boost_rename_constraint` (DDL + RPC)
- `slice_195ab_revoke_grant_v2` (AR-44 Hardening)
- File: `supabase/migrations/20260425140000_slice_195b_captain_boost_rename.sql`

## Verify Live (post-apply)

```sql
SELECT
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'chip_usages_chip_type_check') AS new_check,
  (SELECT COUNT(*) FROM chip_usages WHERE chip_type = 'captain_boost') AS migrated_count,
  (SELECT COUNT(*) FROM chip_usages WHERE chip_type = 'triple_captain') AS old_remaining,
  pg_get_functiondef('public.score_event(uuid)'::regprocedure) ILIKE '%captain_boost%' AS score_event_renamed,
  pg_get_functiondef('public.activate_chip(uuid, text)'::regprocedure) ILIKE '%captain_required%' AS activate_chip_has_captain_only;
```

**Result:**
```json
[{
  "new_check": "CHECK ((chip_type = ANY (ARRAY['captain_boost'::text, 'synergy_surge'::text, 'second_chance'::text, 'wildcard'::text])))",
  "migrated_count": 1,
  "old_remaining": 0,
  "score_event_renamed": true,
  "activate_chip_has_captain_only": true
}]
```

## Privilege-Verify (AR-44)

```sql
SELECT p.proname, array_agg(DISTINCT acl.privilege_type || ':' || r.rolname)
FROM pg_proc p
JOIN aclexplode(p.proacl) acl ON true
JOIN pg_roles r ON r.oid = acl.grantee
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN ('score_event', 'activate_chip', 'deactivate_chip')
GROUP BY p.proname;
```

**Result:** alle 3 Funktionen haben `EXECUTE:authenticated` + `EXECUTE:service_role` + `EXECUTE:postgres` (owner). KEIN PUBLIC, KEIN anon ✅.

## Changes

### DDL
- `chip_usages_chip_type_check`: `triple_captain` → `captain_boost` in CHECK-Liste
- 1 Row migriert (existing chip_usages mit triple_captain)

### RPCs
- `score_event` (CREATE OR REPLACE): chip_type-Reference + Variable umbenannt (`v_has_triple_captain` → `v_has_captain_boost`)
- `activate_chip` (CREATE OR REPLACE):
  - chip_type-list updated
  - ticket_cost CASE updated
  - max_uses CASE updated
  - **NEU:** Captain-only-Validation (Lines 92-100):
    ```sql
    IF p_chip_type = 'captain_boost' THEN
      SELECT captain_slot INTO v_lineup_captain
      FROM lineups WHERE user_id = v_user_id AND event_id = p_event_id;
      IF FOUND AND v_lineup_captain IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'captain_required');
      END IF;
    END IF;
    ```

### Frontend
- `src/types/index.ts:2175`: `ChipType` rename `'triple_captain'` → `'captain_boost'`

### AR-44 Compliance (post-Slice 195a Lücke)
- 3 RPCs (`score_event`, `activate_chip`, `deactivate_chip`) explizit REVOKE PUBLIC + anon, GRANT authenticated
- Auch in 195a Migration-File nachträglich REVOKE/GRANT-Block hinzugefügt

## Captain-only-Constraint Logik

Anils Decision: Boost-Chip ist slot-spezifisch (wie Equipment-Booster), wirkt nur auf Captain.

**Implementierung:** Validation in `activate_chip` (nicht `submit_lineup`).

**Edge Cases:**
1. User aktiviert Chip VOR Lineup-Setting → erlaubt (FPL-Standard, User commited Captain spaeter)
2. User hat Lineup ohne Captain + aktiviert Chip → reject mit `captain_required`
3. User hat Lineup mit Captain + aktiviert Chip → erlaubt
4. User aktiviert Chip + lineup wird spaeter ohne Captain submitted → Chip wird verbraucht ohne Effekt (Score-Logic prüft v_captain_slot IS NOT NULL)

Edge-Case 4 ist FPL-Standard (Chip-Slot lost wenn nicht ausgenutzt). Optional kann in 195d (submit_lineup-RPC) zusätzlich geblockt werden.

## CTO-Notes / Self-Review (D35)

- **Migration atomically applied:** DDL + 2 RPCs in EINER apply_migration call (kein Mid-State-Risiko)
- **Greenfield-Safety:** REVOKE/GRANT-Block in BEIDEN 195a + 195b Migration-Files
- **Money-Path:** Score-Logic unverändert vs 195a (chip_type-String-Match nur)
- **Backward-Compat:** Existing chip_usages-Row migriert (1 Row), keine FK-Issues
- **Test-Gap:** activate_chip Captain-only-Validation hat keinen Unit-Test — kommt mit 195d Lineup-Tests

## Spec-Coverage Update (Slice 195 SPEC AC-Liste)

- [x] AC 3 — Boost-Chip Validation Captain-only ✅ (`captain_required` error)
- [x] AC 4 — Boost-Chip Rename `triple_captain` → `captain_boost` ✅ (DB + Type)

## Stage-Chain

SPEC → IMPACT skipped (RPC + DDL atomic) → BUILD (apply_migration) → REVIEW Self per D35 → PROVE (this file) → LOG pending
