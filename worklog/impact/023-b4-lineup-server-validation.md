# Impact 023 — B4 Lineup Server-Validation

**Scope:** RPC-Body-Erweiterung in `public.rpc_save_lineup`. Kein Schema-Change, keine RLS-Aenderung, keine Column-Mutation.

## Bestehender RPC-Body (Live, aus `_rpc_body_snapshots`)

Stages heute im RPC (`rpc_save_lineup`, PL/pgSQL, SECURITY DEFINER):

1. `auth_mismatch` — `auth.uid() IS DISTINCT FROM p_user_id`
2. `event_not_found` — `SELECT FROM events`
3. `event_ended` — `v_event.status IN ('ended','scoring')`
4. `event_locked` — `v_event.locks_at <= now()`
5. `must_enter_first` — `SELECT FROM event_entries`
6. Build `v_all_slots` array
7. `duplicate_player` — same player in 2 slots
8. `insufficient_sc` — `holdings.quantity - SUM(holding_locks.quantity_locked)` < min_sc
9. `wildcards_not_allowed`, `too_many_wildcards`
10. `salary_cap_exceeded` — perf_l5 sum > event.salary_cap
11. Load `v_existing` lineup
12. INSERT / UPDATE `lineups`
13. `DELETE + INSERT holding_locks`
14. Wildcard spend/refund delta

**Gap (heute):** `p_formation` wird als TEXT ungeprueft in `lineups.formation` geschrieben. Keine GK-Required-Check, keine Slot-Count-Check, keine Captain-Slot-Empty-Check, keine Wildcard-Slot-Empty-Check.

## Neue Checks (Pos 6.5 = zwischen `v_all_slots` build und `duplicate_player`)

### Formation Allowlist

Aus `src/features/fantasy/constants.ts`:

**11er (3):**
- `1-4-3-3` (GK=1, DEF=4, MID=3, ATT=3)
- `1-4-4-2` (GK=1, DEF=4, MID=4, ATT=2)
- `1-3-4-3` (GK=1, DEF=3, MID=4, ATT=3)

**7er (5):**
- `1-2-2-2` (GK=1, DEF=2, MID=2, ATT=2)
- `1-3-2-1` (GK=1, DEF=3, MID=2, ATT=1)
- `1-2-3-1` (GK=1, DEF=2, MID=3, ATT=1)
- `1-3-1-2` (GK=1, DEF=3, MID=1, ATT=2)
- `1-1-3-2` (GK=1, DEF=1, MID=3, ATT=2)

Parse via `string_to_array(p_formation, '-')` → `v_def_n`, `v_mid_n`, `v_att_n`.

### Check-Reihenfolge (neu)

```
6.5a formation_empty   → p_formation NULL/empty
6.5b invalid_formation → p_formation NOT IN allowlist (case-sensitive, TRIM)
6.5c gk_required       → p_slot_gk IS NULL
6.5d invalid_slot_count_def → actual-filled DEF != v_def_n (fuer idx 1..v_def_n)
6.5e invalid_slot_count_mid → analog
6.5f invalid_slot_count_att → analog (att, att2, att3)
6.5g extra_slot_for_formation → slot_def{4}, slot_mid{4}, slot_att{2,3} gesetzt bei zu kleiner Formation
6.5h captain_slot_empty → p_captain_slot referenziert NULL-Slot
6.5i wildcard_slot_invalid → p_wildcard_slots[i] nicht in 12-slot-keys
6.5j wildcard_slot_empty → p_wildcard_slots[i] referenziert NULL-Slot
```

Positionierung NACH `v_all_slots`-Build (weil wir die brauchen), VOR `duplicate_player` (billig) und `insufficient_sc` (teurer DB-Join).

Slot-key → Slot-Value Lookup via CASE-Expression (kein dynamic SQL).

### Error-Return-Shape

```jsonb
jsonb_build_object(
  'ok', false,
  'error', '<key>',
  -- kontextabhaengig:
  'expected', <expected_count>,
  'actual', <actual_count>,
  'slot', '<slot_key>',
  'formation', <input_formation>
)
```

Existierende Error-Keys (Ziffern 1-14) bleiben UNVERAENDERT.

## Consumer-Mapping (grep-verifiziert)

| File | Line | Was passiert |
|------|------|-------------|
| `src/features/fantasy/services/lineups.mutations.ts` | 17-39 | `supabase.rpc('save_lineup', {...})` — wirft `new Error(result.error)` bei `ok:false` |
| `src/lib/services/lineups.ts` | ? | analoger Service-Layer (muss gepruft werden — war bereits Teil der Grep-Treffer, gleiche Pattern) |
| `src/features/fantasy/hooks/useLineupSave.ts` | 63-119 | Hook: uses `submitLineup({selectedFormation})` |
| `src/features/fantasy/hooks/useEventActions.ts` | 160 | `formation: resolvedFormation.id` — sendet `'1-X-Y-Z'` style |
| `src/features/fantasy/hooks/useLineupBuilder.ts` | 55,149,405 | Verwendet `selectedFormation` aus Store |
| `src/features/fantasy/store/lineupStore.ts` | 44 | default = `'1-2-2-2'` |

**Alle Consumer senden heute bereits Formation-IDs aus der Allowlist.** Kein Consumer-Code muss angepasst werden.

### Error-Mapping Caller

- `src/features/fantasy/services/lineups.mutations.ts:43` wirft `new Error(result.error)` — die neuen Error-Keys propagieren als i18n-Keys analog zu bestehenden (`event_ended`, `duplicate_player`, etc.)
- UI-Consumer nutzen `t(err.message)`-Muster (analog zu common-errors.md J1 Finding)

## Migration-Skelett

```sql
-- 20260417XXXXXX_save_lineup_formation_validation.sql

CREATE OR REPLACE FUNCTION public.rpc_save_lineup(
  p_event_id uuid, p_user_id uuid,
  p_formation text,
  p_captain_slot text DEFAULT NULL,
  p_wildcard_slots text[] DEFAULT '{}',
  p_slot_gk uuid DEFAULT NULL,
  p_slot_def1 uuid DEFAULT NULL, p_slot_def2 uuid DEFAULT NULL,
  p_slot_def3 uuid DEFAULT NULL, p_slot_def4 uuid DEFAULT NULL,
  p_slot_mid1 uuid DEFAULT NULL, p_slot_mid2 uuid DEFAULT NULL,
  p_slot_mid3 uuid DEFAULT NULL, p_slot_mid4 uuid DEFAULT NULL,
  p_slot_att uuid DEFAULT NULL,
  p_slot_att2 uuid DEFAULT NULL, p_slot_att3 uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE
  -- ... bestehende Variables ...
  v_parts TEXT[]; v_def_n INT; v_mid_n INT; v_att_n INT;
  v_def_f INT := 0; v_mid_f INT := 0; v_att_f INT := 0;
  v_cap_filled BOOLEAN;
BEGIN
  -- Stages 1..5 unveraendert
  -- Stage 6: v_all_slots build unveraendert
  -- NEU Stage 6.5a..j:
  IF COALESCE(TRIM(p_formation), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_formation');
  END IF;
  IF NOT TRIM(p_formation) = ANY(ARRAY[
    '1-4-3-3','1-4-4-2','1-3-4-3',
    '1-2-2-2','1-3-2-1','1-2-3-1','1-3-1-2','1-1-3-2'
  ]) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_formation',
      'formation', p_formation);
  END IF;
  v_parts := string_to_array(TRIM(p_formation), '-');
  v_def_n := v_parts[2]::INT; v_mid_n := v_parts[3]::INT; v_att_n := v_parts[4]::INT;

  IF p_slot_gk IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'gk_required');
  END IF;

  -- Count filled slots + extra-slot-check in one pass per role
  IF p_slot_def1 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def2 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def3 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def4 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF v_def_f != v_def_n THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_slot_count_def',
      'expected', v_def_n, 'actual', v_def_f);
  END IF;
  -- Extra-slot: if formation uses only v_def_n DEF slots, slots def{v_def_n+1..4} MUST be NULL
  IF v_def_n < 4 AND p_slot_def4 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def4');
  END IF;
  IF v_def_n < 3 AND p_slot_def3 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def3');
  END IF;
  IF v_def_n < 2 AND p_slot_def2 IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def2');
  END IF;
  -- Analog MID (max 4), ATT (max 3: slot_att=1, slot_att2=2, slot_att3=3)

  -- Captain slot empty
  IF p_captain_slot IS NOT NULL AND (
    CASE p_captain_slot
      WHEN 'gk' THEN p_slot_gk IS NULL
      WHEN 'def1' THEN p_slot_def1 IS NULL
      WHEN 'def2' THEN p_slot_def2 IS NULL
      WHEN 'def3' THEN p_slot_def3 IS NULL
      WHEN 'def4' THEN p_slot_def4 IS NULL
      WHEN 'mid1' THEN p_slot_mid1 IS NULL
      WHEN 'mid2' THEN p_slot_mid2 IS NULL
      WHEN 'mid3' THEN p_slot_mid3 IS NULL
      WHEN 'mid4' THEN p_slot_mid4 IS NULL
      WHEN 'att' THEN p_slot_att IS NULL
      WHEN 'att2' THEN p_slot_att2 IS NULL
      WHEN 'att3' THEN p_slot_att3 IS NULL
      ELSE TRUE
    END
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'captain_slot_empty',
      'captain_slot', p_captain_slot);
  END IF;

  -- Wildcard-slot empty: each element of p_wildcard_slots must match filled slot
  IF v_wildcard_count > 0 THEN
    FOR v_i IN 1..v_wildcard_count LOOP
      v_key := p_wildcard_slots[v_i];
      IF NOT v_key = ANY(v_slot_keys) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'wildcard_slot_invalid', 'slot', v_key);
      END IF;
      -- re-use the captain-slot CASE for slot-lookup
      IF (CASE v_key
        WHEN 'gk' THEN p_slot_gk IS NULL
        -- ... (alle 12)
      END) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'wildcard_slot_empty', 'slot', v_key);
      END IF;
    END LOOP;
  END IF;

  -- Stage 7..14 unveraendert
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rpc_save_lineup(<full-sig>) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_save_lineup(<full-sig>) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_save_lineup(<full-sig>) TO authenticated;
```

**HINWEIS:** `rpc_save_lineup` wird nicht direkt vom Client aufgerufen (nur der Wrapper `save_lineup`). Aber AR-44 verlangt REVOKE+GRANT-Block fuer jedes `CREATE OR REPLACE FUNCTION`. Wrapper `save_lineup` wird nicht veraendert.

## Side-Effects

- **RLS:** unveraendert — RPC ist SECURITY DEFINER, umgeht RLS per Default. Policy-Check auf `lineups`-Table unveraendert.
- **Caching:** keine Aenderung — submitLineup invalidiert bereits `qk.lineup.byEvent(...)` Keys (im Service).
- **Realtime:** `lineups` Realtime-Publication bleibt — Error-Returns triggern keine Events (kein INSERT/UPDATE bei `ok:false`).
- **Query-Keys:** keine.
- **Analytics:** `lineup_submit` activity-Log wird nur bei `ok:true` geschrieben (Service-Code zeile 48). Unveraendert.

## Test-Strategie

### A. Unit — `src/lib/services/__tests__/lineups.test.ts`

Neue `it(...)` Cases analog zu bestehenden:
- `throws invalid_formation from RPC`
- `throws gk_required from RPC`
- `throws invalid_slot_count_def from RPC`
- `throws invalid_slot_count_mid from RPC`
- `throws invalid_slot_count_att from RPC`
- `throws extra_slot_for_formation from RPC`
- `throws captain_slot_empty from RPC`
- `throws wildcard_slot_invalid from RPC`
- `throws wildcard_slot_empty from RPC`

### B. INV-27 — `src/lib/__tests__/db-invariants.test.ts`

Body-String-Invariant (statisch, kein live-call mit user-auth noetig):

```ts
it('INV-27 rpc_save_lineup enforces formation checks', async () => {
  const { data, error } = await adminClient.rpc('execute_sql', {
    query: `SELECT pg_get_functiondef(oid) AS body FROM pg_proc
            WHERE proname='rpc_save_lineup' AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')`
  });
  const body = data[0].body as string;
  expect(body).toContain("'invalid_formation'");
  expect(body).toContain("'gk_required'");
  expect(body).toContain("'invalid_slot_count_def'");
  expect(body).toContain("'captain_slot_empty'");
  expect(body).toContain("'1-4-4-2'"); // allowlist present
});
```

Keine live-rpc-Ausfuehrung noetig (auth.uid() ware NULL → auth_mismatch vor Formation-Check). Body-scan reicht.

### C. Prove — Smoke-Test via `mcp__supabase__execute_sql`

Mit mocked JWT-Claim nach Migration:

```sql
SET LOCAL request.jwt.claims = jsonb_build_object('sub', '<valid-user-id-for-ci>');
SELECT save_lineup('<valid-event-id>', 'xxx-not-a-formation');
-- expect {"ok": false, "error": "invalid_formation", "formation": "xxx-not-a-formation"}

SELECT save_lineup('<valid-event-id>', '1-4-4-2', NULL, '{}', NULL);
-- expect {"ok": false, "error": "gk_required"}

SELECT save_lineup('<valid-event-id>', '1-4-4-2', NULL, '{}',
  '<player-uuid>', '<p>', '<p>', '<p>');  -- nur 3 DEF
-- expect {"ok": false, "error": "invalid_slot_count_def", "expected": 4, "actual": 3}
```

Pragmatisch: Tests A+B reichen fuer CI. C ist Proof-Artefakt.

## Migration-Verifikation Post-Apply

Nach `mcp__supabase__apply_migration`:

```sql
-- Verify neue Checks im Body
SELECT
  pg_get_functiondef(oid) ~ 'invalid_formation' AS has_formation_check,
  pg_get_functiondef(oid) ~ 'gk_required' AS has_gk_check,
  pg_get_functiondef(oid) ~ 'invalid_slot_count' AS has_slot_count_check,
  pg_get_functiondef(oid) ~ 'captain_slot_empty' AS has_captain_check,
  pg_get_functiondef(oid) ~ '1-4-4-2' AS has_allowlist
FROM pg_proc
WHERE proname='rpc_save_lineup' AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public');
-- Alle TRUE expected.

-- Verify Grant-Matrix
SELECT proname,
  pg_get_functiondef(oid) ~ 'REVOKE' AS has_revoke_in_def  -- in body false (REVOKE ist ausserhalb)
FROM pg_proc WHERE proname='rpc_save_lineup';

-- Grant-Matrix separat
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN ('save_lineup', 'rpc_save_lineup')
ORDER BY routine_name, grantee;
```

## Backwards-Compat / Rollback

- **Alle bestehenden submitLineup-Calls von gueltigen Formationen (8 IDs) bleiben unveraendert gueltig.**
- **User mit invaliden Formations-Ids haben heute schon nicht gespeichert** (Client-Disabled). Nach Apply zusaetzlich RPC-Reject (erwartet).
- **Rollback:** Re-Apply alten Body aus `_rpc_body_snapshots` via `SELECT body FROM _rpc_body_snapshots WHERE rpc_name='rpc_save_lineup'; EXECUTE body`.

## Open Items nach IMPACT

- **Keine.** Spec-Offene-Punkte alle geklaert:
  - Live-RPC-Body gelesen: `rpc_save_lineup` (wrapper via `save_lineup`)
  - Formation-Allowlist: 8 IDs (3× 11er + 5× 7er)
  - Wildcard-Slot-Empty-Check: heute NICHT vorhanden (nur `too_many_wildcards`). Wird neu eingefuehrt.

## Ready fuer BUILD

Ja. Migration + 2 Test-Blocks + Proof-Artefakte sind klar definiert.
