# Pre-Review-Memo — Slice 251 Wave 1 Track A

**Author:** backend-agent (worktree `slice/251-wave-1-track-a`)
**Date:** 2026-04-28
**Wave:** Wave 1 (Track A — DB Backfill + Cron Dual-Write + Service-Rewrite)

---

## Self-Audit gegen ACs

**AC-21 (Backfill leagues.active_gameweek aus clubs MIN):**
- ✅ Migration `20260428175547_slice_251_leagues_active_gameweek_backfill.sql` geschrieben.
- ✅ SQL nutzt `UPDATE FROM` (subquery MIN per league_id), idempotent via `IS DISTINCT FROM`-Guard.
- ✅ COALESCE-Safety bei NULL-leagues.active_gameweek (compares -1).
- ⚠️ **NICHT applied via mcp__supabase__apply_migration** — Tool nicht im Worktree-Agent verfügbar. Primary-Claude muss applien.
- ⚠️ Post-Apply Verify-SQL als Comment-Block im Migration-Header dokumentiert.

**AC-22 (Dual-Write Cron schreibt clubs + leagues):**
- ✅ Cron `gameweek-sync/route.ts:1606-1624` extended: nach `clubs.UPDATE` neu `leagues.UPDATE`.
- ✅ Beide Schreib-Operationen im selben `runStep('advance_gameweek')` (atomarer Step).
- ✅ Hardcoded `if (nextGw <= 38)` ersetzt durch `if (nextGw <= league.maxGameweeks)` an 2 Stellen (clone_events Z.1494 + advance_gameweek Z.1606).
- ✅ ActiveLeague-Type um `maxGameweeks: number` erweitert + Query-Loader (Z.245-260) liest `max_gameweeks` mit Fallback 38.

---

## Self-Audit Edge-Cases (aus Spec 1.6)

| # | Edge-Case | Mitigation | Status |
|---|-----------|------------|--------|
| EC-06 | leagues.active_gameweek=0 (uninitialized) | Service: `?? 1` + DB-Backfill schreibt MIN(>=1) | ✅ |
| EC-07 | leagues.max_gameweeks=NULL | Service: `?? 38` + Cron-Loader: `?? 38` | ✅ |
| EC-21 (impact) | Backfill NULL-leagues.active_gameweek touchen | UPDATE-Filter `IS DISTINCT FROM` (NULL→non-NULL ist DISTINCT) | ✅ |
| EC-X (post-Backfill, Cron schreibt `clubs.active_gameweek` aber nicht `leagues`) | Dual-Write atomarer Step beide oder beide-fail (throw) | ✅ |

---

## Self-Verification-Commands gelaufen

```
$ cd C:/bescout-app/.claude/worktrees/agent-aec73207c3b95a285
$ git status -s
 M .claude/settings.local.json
 M src/app/(app)/club/[slug]/ClubContent.tsx
 M src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx
 M src/app/api/cron/gameweek-sync/route.ts
 M src/features/fantasy/hooks/useGameweek.ts
 M src/features/fantasy/queries/events.ts
 M src/features/fantasy/queries/invalidation.ts
 M src/lib/queries/keys.ts
 M src/lib/services/__tests__/club.test.ts
 M src/lib/services/club.ts
?? supabase/migrations/20260428175547_slice_251_leagues_active_gameweek_backfill.sql

$ npx tsc --noEmit
(0 errors)

$ vitest run src/lib/services/__tests__/club.test.ts
Test Files  1 passed (1)
     Tests  73 passed (73)

$ vitest run "src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx"
Test Files  1 passed (1)
     Tests  6 passed (6)

$ vitest run "src/app/(app)/club/[slug]/__tests__/ClubContent.test.tsx"
Test Files  1 passed (1)
     Tests  12 passed (12)
```

---

## Open-Blocks / Reviewer-Aufmerksamkeit

1. **Migration nicht applied** (Tool-Lücke): `mcp__supabase__apply_migration` ist im Worktree-Agent-Toolset nicht verfügbar. Primary-Claude muss vor Wave-2-Start applien. Pre-Apply Snapshot-SQL + Post-Apply Verify-SQL beide im Migration-Header.

2. **`useGameweek(gwEvents)` ohne leagueId-Param** (transient Wave-3-Gap): `FantasyContent.tsx:83` ruft `useGameweek(gwEvents)` ohne leagueId. Mit dem neuen `enabled: !!leagueId`-Gate fired die Query nicht — `activeGw` ist `undefined`, `currentGw = selectedGameweek ?? 1`. **Functional Regression**: bis Track C (Wave 3 `useLeagueScope`-Wiring), startet FantasyContent immer auf GW=1 statt League-MIN. Backwards-Compatible Compile, aber UX-Drift bis Wave 3.
   - Mitigation: Spec dokumentiert es als Wave-3-Gap. Reviewer entscheidet ob Wave 1 ein `?? activeClub.league_id`-Bridge bekommen soll.

3. **`qk.events.leagueGw` Funktion-Migration** (Breaking Change Cache-Key): Pre-Wave-1: `['events', 'leagueGw']` (statisch). Post-Wave-1: `['events', 'leagueGw', leagueId]`. invalidation.ts:44 ruft jetzt `invalidateQueries({ queryKey: ['events', 'leagueGw'] })` — nutzt React-Query-Prefix-Match um ALLE Liga-Variants zu invalidieren. **Konsequenz:** Bestehende Cache-Entries unter altem Key (`['events', 'leagueGw']` statisch) werden bei Liga-User-Refresh fresh refetched mit neuem Key — kein hard-cache-corruption.

4. **`@/lib/queries/events` (alt) vs `@/features/fantasy/queries/events` (neu) — `useLeagueActiveGameweek`-Surface**: In FantasyContent.test.tsx Z.70+85 sind beide Mock-Pfade angepasst, um die neue Signatur `(leagueId)` zu akzeptieren. Mock akzeptiert variadic-args.

---

## Bekannte Risiken

- **Worktree-Isolation-Escape (Slice 207-Pattern):** Initial habe ich absolute Pfade benutzt — alle Edits landeten in main-repo. **Self-discovered + recovered**: Patch saved aus main-repo, main-repo `git checkout -- src/`, Patch in Worktree applied. `git status -s` final-verifiziert dass alle Files in Worktree.
- **Spec-Drift-Risiko:** Hardcoded `nextGw <= 38` wurde an ZWEI Stellen ersetzt (clone_events Z.1494 + advance_gameweek Z.1606). Spec Migration-Map nennt nur F14:Z.1593 — ich habe beide Stellen gleich behandelt (gleicher Bug, gleiche Lösung).
- **Migration nicht applied** = Wave 2 (Track B) Service-Rewrite wäre live-broken bis Apply (liest `leagues.active_gameweek = 1` initialisiert, nicht MIN). Daher Pflicht: Primary-Claude muss Migration vor Wave-2-Merge applien.

---

## Files (LOC-Diff)

- **NEW** `supabase/migrations/20260428175547_slice_251_leagues_active_gameweek_backfill.sql` (~42 lines)
- **EDIT** `src/lib/services/club.ts` (+50 -8 lines, getLeagueActiveGameweek-Rewrite + getLeagueMaxGameweeks-NEU)
- **EDIT** `src/features/fantasy/queries/events.ts` (+22 -8 lines, hook-leagueId-param + useLeagueMaxGameweeks-NEU)
- **EDIT** `src/features/fantasy/hooks/useGameweek.ts` (+10 -3 lines, leagueId-Param + invalidate-Key-Update)
- **EDIT** `src/features/fantasy/queries/invalidation.ts` (+2 -1 lines, prefix-match)
- **EDIT** `src/lib/queries/keys.ts` (+5 -1 lines, leagueGw-function + leagueMaxGw-NEU)
- **EDIT** `src/app/api/cron/gameweek-sync/route.ts` (+22 -3 lines, type+loader+2 hardcode-replaces+Dual-Write)
- **EDIT** `src/app/(app)/club/[slug]/ClubContent.tsx` (+2 -1 lines, leagueId aus club.league_id)
- **EDIT** `src/lib/services/__tests__/club.test.ts` (+50 -10 lines, 11 neue Test-Cases statt 2)
- **EDIT** `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx` (+8 -1 lines, qk-Mock function-form)

**Total:** ~182 lines added / ~36 removed across 9 files + 1 new migration.

---

## Verdict-Recommendation für Reviewer

**PASS pending:** Migration-Apply durch Primary-Claude.
- Code-Quality: tsc clean + alle 91 betroffenen Tests grün.
- Money-Path-Risk: NEIN (kein Money-Flow betroffen, kein RPC-Body, keine RLS-Änderungen).
- AR-44 REVOKE-Block: N/A (nur UPDATE-DDL, keine CREATE FUNCTION).
- Wave-1-Scope eingehalten: kein Track-B/C/D/F gestartet.
