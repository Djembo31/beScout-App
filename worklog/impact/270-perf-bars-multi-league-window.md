# Slice 270 — IMPACT Analysis

**Datum:** 2026-05-05
**Spec:** worklog/specs/270-perf-bars-multi-league-window.md
**Slice-Type:** Service + DB-Migration → IMPACT pflicht (laut workflow.md)

---

## A. Service- und Hook-Layer

### Direkte Code-Änderung

| File | Edit | Risk |
|------|------|------|
| `src/features/fantasy/services/fixtures.ts:436-483` | `getRecentPlayerScores()` Body komplett ersetzt — neuer RPC-Call statt 2-Step-`.from()` | LOW (Return-Shape `Map<string,(number\|null)[]>` unverändert) |
| `src/features/fantasy/services/fixtures.ts:419-431` | `getRecentScoreGameweeks()` — Decision: bleibt unverändert in 270 (returnt globaler MAX) | LOW |
| `supabase/migrations/20260505HHMMSS_slice_270_per_player_recent_scores.sql` | NEU — RPC `rpc_get_recent_player_scores()` | LOW (read-only RPC, SECURITY DEFINER mit auth-uid-Guard nicht nötig — kein PII) |

### Re-Export-Bridge

| File | Wirkung |
|------|---------|
| `src/lib/services/fixtures.ts` | Re-Export-Bridge `export * from '@/features/fantasy/services/fixtures'` — automatisch propagiert, kein Edit |

## B. Konsumenten (grep-verifiziert)

### useRecentScores Konsumenten

| File | Zeile | Konsumiert | Impact |
|------|-------|------------|--------|
| `src/features/market/components/marktplatz/ClubAccordion.tsx` | 55 | `const { data: recentScores } = useRecentScores();` → `recentScores?.get(p.id)` | **Profitiert direkt:** alle 7 Ligen jetzt ≥ 5 Bars |
| `src/features/market/components/marktplatz/TransferListSection.tsx` | 213-214 | `const scores = scoresMap?.get(p.id); formEntries = (scores ?? []).map(...)` | **Profitiert direkt** |
| `src/features/market/components/portfolio/BestandPlayerRow.tsx` | 49-52 | `formEntries = (scores ?? []).map(...)` (scores via Prop von Parent) | **Profitiert direkt** wenn Parent `useRecentScores` nutzt |
| `src/features/manager/components/kader/KaderPlayerRow.tsx` | 216-219 | `formEntries = (scores ?? []).map((s, i) => ({ ..., gameweek: gameweeks?.[i] ?? null }))` | **Profitiert direkt** — aber Tooltip-GW-Label kommt aus `getRecentScoreGameweeks` (separat) → bleibt korrekt im 270-Scope |
| `src/components/fantasy/FantasyPlayerRow.tsx` | 111 | `<FormBars entries={formEntries} />` (formEntries aus PlayerPicker/LineupBuilder via `useBatchFormScores`) | **Nicht betroffen** (Fantasy Picker hat eigenen Daten-Pfad `getBatchFormScores`) |

### useRecentScoreGameweeks Konsumenten

| File | Zeile | Konsumiert |
|------|-------|------------|
| `src/features/manager/components/kader/KaderTab.tsx` | 153 | `const { data: gameweeks } = useRecentScoreGameweeks();` → `gameweeks` als Tooltip-Label `KaderPlayerRow.formEntries[i].gameweek` |

**Decision (siehe Spec Sektion 9):** `getRecentScoreGameweeks` bleibt in 270 unverändert. Tooltip-Mismatch-Risiko: ein Spieler mit eigenen letzten 5 Played-GWs `[10,15,20,25,30]` würde via `useRecentScoreGameweeks` das **globale Window** `[33..37]` als Tooltip-Label sehen → falsch.

**Mitigation:** Slice 270b (Folge-Slice, optional) — entweder Tooltip-Refactor oder Tooltip-Disable bei Per-Player-Window. **Markiert in active.md als follow-up.** Visual-Regression akzeptabel: Bars sind sichtbar (Hauptfix), Tooltip-Disambiguation ist Nuance.

### TanStack-Query Layer

| File | Zeile | Was |
|------|-------|-----|
| `src/lib/queries/managerData.ts:21-27` | `useRecentScores` | Hook-Wrapper unverändert. queryKey + staleTime gleich. |
| `src/components/providers/QueryProvider.tsx:130-137` | Layer-4-Filter | Map-Return → kein Persist → kein Crash post-Refactor |

## C. Side-Effects

### RLS / Security
- RPC ist SECURITY DEFINER mit `STABLE` und keinem auth-uid-Guard.
- **Begründung:** RPC liest nur `player_gameweek_scores` — public-readable Daten (Fantasy-Scores), keine PII, keine User-Identifikation. Identisch zu existing `getRecentPlayerScores` Lese-Pattern.
- REVOKE-Block: `REVOKE EXECUTE FROM PUBLIC, anon` + `GRANT EXECUTE TO authenticated` (AR-44 Pflicht).

### Caching
- `useRecentScores` `staleTime: 5 min` bleibt → 1 RPC-Call alle 5 Min pro Tab/User.
- Map-Type → kein Persist (Slice 267 Filter).
- Realtime-Refresh: kein neuer Listener — `player_gameweek_scores` Updates triggern keine FormBars-Live-Refresh (akzeptabel).

### Realtime
- Slice 267 Realtime-Channel ist auf `fixtures` gebunden, nicht `player_gameweek_scores` → keine Cross-Wirkung.

### Performance / RateLimits
- **Vorher:** 2 Queries (latest_gw + window_rows) ≈ 50–200ms total
- **Nachher:** 1 RPC-Call ≈ 20–80ms (Postgres-Window-Function ist effizient)
- API-Football: nicht betroffen (DB-internal Refactor).
- Vercel: keine Cron-Änderung, kein Hobby-Plan-Risiko.

## D. Migration-Plan

```
1. mcp__supabase__apply_migration mit RPC-Definition
2. mcp__supabase__execute_sql verifiziert pg_get_functiondef
3. mcp__supabase__execute_sql AC-01/02/03 Smoke
4. Service-Refactor in fixtures.ts
5. tsc + vitest
6. git commit
7. git push origin main → Vercel-Deploy
8. Live-Verify Chrome-DevTools-MCP
```

## E. Rückwärts-Kompatibilität

- **Service-API unchanged:** Return-Type `Promise<Map<string, (number|null)[]>>` identisch. Kein Caller muss adaptiert werden.
- **TanStack-Query-Key unchanged:** `qk.fixtures.recentScores` identisch → kein Cache-Bust nötig.
- **i18n-Strings:** keine.
- **DB-Schema:** keine breaking change. RPC ist additiv.

## F. Test-Coverage-Plan

- `src/features/fantasy/services/__tests__/fixtures.test.ts` Sektion `getRecentPlayerScores` (existing 1 Test) erweitert um 3 neue Cases (Spec Sektion 11).
- Keine E2E-Tests nötig — DB-Smoke + tsc + vitest decken Servic-Layer ab. Live-Verify via Chrome-DevTools-MCP für Visual-Regression.

## G. Rollback-Plan

Falls Live-Verify post-Deploy zeigt regression:
1. `git revert <commit>` (Service + Test-Edits) → main
2. Migration drop: `DROP FUNCTION IF EXISTS public.rpc_get_recent_player_scores();` via apply_migration
3. Vercel re-deploy

Risk: niedrig, weil Return-Shape unverändert. Worst-Case: Map ist leer (RPC schlägt fehl) → FormBars zeigt 5 dashed bars (= Status quo Bundesliga-Ligen).

## H. Cross-Domain-Impact

- **Manager-Domain:** KaderTab + KaderPlayerRow profitieren (Form-Bars sichtbar nach Refactor).
- **Market-Domain:** ClubAccordion + TransferListSection + BestandPlayerRow profitieren.
- **Fantasy-Domain:** FantasyPicker NICHT betroffen (eigener Pfad).
- **Player-Detail-Page:** TradingCardFrame `matchTimeline` separater Pfad — falls dort auch Bars fehlen, ist das Slice 272+ (out of scope 270).
- **Profile / Community / Trading:** keine Berührung.

---

## Impact-Summary

- 1 Migration (additive RPC)
- 1 Service-File-Edit (~50 LOC)
- 1 Test-File-Edit (~30 LOC neue Cases)
- 5 Konsumenten profitieren ohne Edit
- 0 breaking-change
- 0 i18n-Drift
- 0 Money-Path
- Risk: LOW
