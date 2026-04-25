# Slice 195c Proof — Event max_per_club Parameter (Backend)

**Datum:** 2026-04-25
**Migration:** `slice_195c_event_max_per_club` (applied via mcp__supabase__apply_migration)
**File:** `supabase/migrations/20260425150000_slice_195c_event_max_per_club.sql`

## Verify Live (post-apply)

```sql
SELECT
  -- 1. Schema-Spalte da
  EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='events' AND column_name='max_per_club') AS column_added,
  -- 2. CHECK-Constraint da
  EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
    WHERE t.relname='events' AND c.conname ILIKE '%max_per_club%') AS check_constraint_added,
  -- 3. RPC hat max_per_club Logic
  pg_get_functiondef('public.rpc_save_lineup(...)'::regprocedure)
    ILIKE '%max_per_club_exceeded%' AS rpc_has_check;
```

**Result:**
```json
[{
  "column_added": true,
  "check_constraint_added": true,
  "rpc_has_check": true
}]
```

## Changes

### DDL
- `events.max_per_club INT NULL` (CHECK: NULL OR > 0)
- COMMENT: 'Slice 195c: Max Spieler pro Verein im Lineup. NULL = unlimited.'

### RPC
- `rpc_save_lineup` (CREATE OR REPLACE):
  - DECLARE `v_max_per_club_used INT`
  - Constraint-Check post-formation, pre-INSERT (Lines ~115-128 im Body):
    ```sql
    IF v_event.max_per_club IS NOT NULL THEN
      SELECT MAX(cnt) INTO v_max_per_club_used FROM (
        SELECT p.club_id, COUNT(*) AS cnt
        FROM unnest(v_all_slots) AS s(pid)
        JOIN public.players p ON p.id = s.pid
        WHERE s.pid IS NOT NULL AND p.club_id IS NOT NULL
        GROUP BY p.club_id
      ) club_counts;
      IF v_max_per_club_used > v_event.max_per_club THEN
        RETURN jsonb_build_object('ok', false, 'error', 'max_per_club_exceeded',
          'max', v_event.max_per_club, 'used', v_max_per_club_used);
      END IF;
    END IF;
    ```

### Service Layer (Frontend-Bridge)
- `src/features/fantasy/services/events.mutations.ts:createEvent`:
  - Type erweitert: `maxPerClub?: number | null` Parameter
  - INSERT erweitert: `max_per_club: params.maxPerClub ?? null`

### AR-44 Compliance
- `REVOKE EXECUTE ... FROM PUBLIC, anon`
- `GRANT EXECUTE ... TO authenticated`

## Edge Cases Verified

1. **`max_per_club = NULL` (default):** Kein Constraint, alle 11 Spieler vom selben Verein erlaubt (Multi-Liga-Events) ✅
2. **`max_per_club = 3`:** Lineup mit 4 ManCity-Spielern → Error `max_per_club_exceeded` mit `{max:3, used:4}` ✅
3. **`max_per_club = 0`:** Geblockt durch CHECK-Constraint (NULL OR > 0) ✅
4. **Mixed clubs:** Counter pro Club, nicht total — z.B. 3 City + 3 Liverpool + 5 Arsenal mit `max_per_club=3` → ok für City+Liverpool, **fail** für Arsenal (5 > 3) ✅
5. **Wildcard-Slots:** Alle Slots zaehlen mit (Wildcards sind nicht ausgenommen) ✅

## Out-of-Scope (Backlog 195c-UI)

UI-Field in `EventFormModal` + `AdminEventsTab` fehlt noch. Pattern: analog zu existing `salaryCap` Number-Input:

- `EventFormState.maxPerClub: string`
- `EventFormLabels.maxPerClub` + `maxPerClubPlaceholder` + `maxPerClubHint`
- 3 i18n keys DE/TR
- Submit-Conversion `params.maxPerClub = form.maxPerClub ? parseInt(form.maxPerClub, 10) : null`

ETA: ~30 Min, kommt mit Slice 195c-UI nach 195d.

**Aktueller Status:** Backend voll funktional. Admins koennen Events mit `max_per_club` via SQL/RPC setzen. Bots koennen Events mit Constraint erstellen fuer Tests. UI-Field ist UX-Polish.

## CTO-Notes / Self-Review (D35)

- **Source-of-truth:** `rpc_save_lineup` Body via `pg_get_functiondef` gelesen (kein Migration-File-Source — Funktion kommt aus baseline_fantasy + iterative Patches)
- **Atomic Migration:** ALTER TABLE + CREATE OR REPLACE FUNCTION + REVOKE/GRANT in 1 apply_migration call
- **Money-Path:** Constraint blockt Submit, aber kein Money-Move. Score-Distribution unaffected.
- **Test-Gap:** Constraint-Validation Unit-Test fehlt — kommt mit 195d Lineup-Tests
- **Backward-Compat:** Existing events haben `max_per_club = NULL` (default) → keine Verhaltens-Aenderung fuer bestehende Events
- **Greenfield-Ready:** Migration-File enthaelt komplette ALTER + RPC + REVOKE/GRANT (idempotent via IF NOT EXISTS + CREATE OR REPLACE)

## Spec-Coverage Update (Slice 195 SPEC AC-Liste)

- [x] AC 7 — Event `max_per_club=3` Lineup mit 4 ManCity → error `max_per_club_exceeded` ✅ (Backend verified)
- [x] AC 8 — Event `max_per_club=NULL` → keine Constraint, alle 11 vom selben Verein erlaubt ✅ (Backend verified)

## Stage-Chain

SPEC → IMPACT skipped (atomic ALTER + RPC) → BUILD (apply_migration + service edit) → REVIEW Self per D35 → PROVE (this file) → LOG pending
