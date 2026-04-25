# Backend Journal: Slice 195e — Differentials RPC + Captain Pick-Rate

## Gestartet: 2026-04-25

### Verstaendnis
- Was: 2 SECURITY DEFINER RPCs `get_event_captain_distribution` + `get_event_player_pick_rates` die anonymisierte Aggregate ueber `lineups` zurueckgeben.
- Betroffene Tabellen: `lineups` (READ-only)
- Betroffene Services: `src/features/fantasy/services/scoring.queries.ts`
- Betroffene Hooks: `src/features/fantasy/queries/fantasyPicker.ts`
- Risiken:
  - Anonymisierungs-Pflicht: keine user_id/handle/display_name returnen
  - AR-44 REVOKE/GRANT muss am Migration-Ende stehen
  - captain_slot ist TEXT-Mapping auf Slot-Column → 12 CASE-Branches
  - Empty-Event: `[]` statt NULL/Error
  - Slice 195d hat 12 Starting-Slots: gk, def1..4, mid1..4, att, att2, att3 (PLUS bench_gk, bench_o1..3 die wir NICHT mitzählen)

### Entscheidungen

| # | Entscheidung | Warum |
|---|-------------|-------|
| 1 | Field-Name `count` statt `pick_count` | Konsistenz Captain ↔ PickRate, CTO-Prompt explicit `count` (Spec sagt `pick_count` aber Prompt-Code `count` — Prompt gewinnt) |
| 2 | RPC apply via Migration-File, NICHT MCP-direct | Agent hat keine MCP-Supabase-Tools — File schreiben, Parent-CTO appliziert via `mcp__supabase__apply_migration` |
| 3 | Captain-Mapping via CASE statt JOIN | 12 statische Slot-Columns, CASE ist klarer + indexable |
| 4 | Pick-Rate via `unnest(ARRAY[...12 slots...])` | Idiomatisch fuer Variance ueber statische Spalten |
| 5 | `ORDER BY` direkt im `jsonb_agg` | Korrekt sortierte JSON-Array-Ausgabe |
| 6 | `COALESCE(jsonb_agg(...), '[]'::jsonb)` | Empty-Event gibt sauberes `[]` (jsonb_agg returnt sonst NULL) |
| 7 | Hook-File: erweitern `fantasyPicker.ts` (NICHT scoring.ts) | Spec verweist explizit auf fantasyPicker, passt zum Picker-UI-Use-Case |

### Fortschritt
- [x] Migration-File schreiben (`supabase/migrations/20260425180000_slice_195e_differentials_rpcs.sql`)
- [x] queryKeys erweitern (`qk.fantasy.captainDistribution` + `qk.fantasy.pickRates`)
- [x] Service-Functions in scoring.queries.ts (`getEventCaptainDistribution`, `getEventPlayerPickRates` + Types)
- [x] React-Query-Hooks in fantasyPicker.ts (`useEventCaptainDistribution`, `useEventPlayerPickRates`)
- [x] tsc clean (`npx tsc --noEmit` exit 0)
- [ ] Verify (Migration-Apply via Parent-CTO)

### Runden-Log

#### Runde 1 — Setup + File-Writing
- Knowledge geladen: SKILL, LEARNINGS, database.md, business.md, common-errors.md, errors-db.md
- Lineups-Schema verifiziert: 12 starting slots (`gk`, `def1..4`, `mid1..4`, `att`, `att2`, `att3`) + bench_*
- Lineups PK: `id UUID DEFAULT gen_random_uuid()` (baseline_fantasy.sql:191)
- Project-Ref: `skzjfhvgccaeplydsunz` (CTO-Prompt hat Tippfehler `skzjfhvgczlydsunz` — wird beim Apply korrigiert)
- AR-44 Pattern aus Slice 195a ueberprueft → REVOKE PUBLIC + anon, GRANT authenticated

#### Runde 2 — Migration-Refinement
- Erste Version hatte duplizierte SELECT (v_total + v_result separat) → refactored zu single CTE-Chain mit `totals` + `ranked` + CROSS JOIN.
- Empty-Event-Edge: `jsonb_agg` returnt NULL bei 0 rows → COALESCE zu `'[]'::jsonb` (zwei Layer: in jsonb_agg + RETURN).
- NULLIF(total, 0) als Defense-in-Depth gegen ÷0 (sollte durch CTE-Logic unmoeglich sein, aber keine Kosten).

#### Runde 3 — Verification
- `npx tsc --noEmit` → exit 0, alles clean.
- Self-Review 8-Punkt + Backend-Specific durchlaufen.
- Service-Functions throw on error (lib/services-Pattern, NICHT features/fantasy/services-swallow-Pattern — diese Services werfen).

### AFTER-Phase Self-Review

**8-Punkt Checkliste:**
- [x] Types propagiert: `EventCaptainPick`, `EventPlayerPickRate` exportiert in scoring.queries.ts; React-Query infers correctly.
- [x] i18n komplett: KEINE neuen Strings (Pct ist locale-neutral, Spec AC9).
- [x] Column-Names korrekt: alle slot_* + captain_slot + event_id + id verifiziert gegen baseline_fantasy.sql + slice 195d.
- [x] Alle Consumers aktualisiert: NEUE Funktionalitaet, keine Consumers existing.
- [x] UI-Text passt zum Kontext: N/A (Frontend-Agent baut UI).
- [x] Keine Duplikate nach Merge: grep `getEventCaptainDistribution|getEventPlayerPickRates|captainDistribution|pickRates` clean.
- [x] Service Layer: Component → Service → supabase.rpc. Hooks use Service.
- [x] Edge Cases: empty-event `[]`, NULL captain_slot ignoriert, captain_slot pointing zu NULL slot ignoriert (filtered CTE), Total=0 NULLIF-protected.

**Backend-Specific:**
- [x] CHECK Constraints: captain_slot ∈ {'gk','def1',...,'att3'} (database.md:91) — meine 12 CASE-WHENs decken alle, ELSE NULL fuer Defense.
- [x] AR-44 REVOKE/GRANT: Beide RPCs am Ende (PUBLIC + anon revoke, authenticated grant).
- [x] Anonymization: Body enthaelt KEINE Reference auf user_id, handle, display_name als Output. Verified.
- [x] KEIN `::TEXT` auf UUID. ✓
- [x] Empty: jsonb_agg NULL → COALESCE `[]`. ✓
- [x] STABLE-Marker fuer Read-only RPCs (Performance-Hint fuer Postgres-Planner).

### Hinweise an Parent-CTO (Apply-Step)

Der Agent kann KEIN `mcp__supabase__apply_migration` aufrufen (Tool nicht im Worktree-Agent-Toolset). Apply-Schritte fuer CTO:

```
mcp__supabase__apply_migration({
  project_id: "skzjfhvgccaeplydsunz",   // <-- KORREKT, CTO-Prompt hatte 'skzjfhvgczlydsunz' (Tippfehler)
  name: "20260425180000_slice_195e_differentials_rpcs",
  query: <Inhalt von supabase/migrations/20260425180000_slice_195e_differentials_rpcs.sql>
})
```

**Verify-Queries fuer CTO:**

```sql
-- 1. Empty-Event Test:
SELECT public.get_event_captain_distribution('00000000-0000-0000-0000-000000000000'::uuid);
-- expected: []

SELECT public.get_event_player_pick_rates('00000000-0000-0000-0000-000000000000'::uuid);
-- expected: []

-- 2. Real-Event Test (sucht ein Event mit lineups):
SELECT id FROM public.events WHERE EXISTS (SELECT 1 FROM public.lineups WHERE event_id = events.id) LIMIT 1;
SELECT public.get_event_captain_distribution('<found-id>'::uuid);
SELECT public.get_event_player_pick_rates('<found-id>'::uuid);

-- 3. Anonymization-Audit:
SELECT pg_get_functiondef('public.get_event_captain_distribution(uuid)'::regprocedure)
  ILIKE '%user_id%' OR
  pg_get_functiondef('public.get_event_captain_distribution(uuid)'::regprocedure)
  ILIKE '%handle%';
-- expected: false

-- 4. AR-44-Audit:
SELECT proname, pg_get_function_arguments(oid),
  has_function_privilege('anon', oid, 'execute') AS anon_can,
  has_function_privilege('authenticated', oid, 'execute') AS authn_can
FROM pg_proc
WHERE proname IN ('get_event_captain_distribution', 'get_event_player_pick_rates');
-- expected: anon_can=false, authn_can=true (beide Funktionen)
```



