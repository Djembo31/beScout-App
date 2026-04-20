# Slice 087 — Upstream Silent-Fail Follow-Ups (Slice 086 Scope-Outs)

## Ziel (1 Satz)
Zwei Reviewer-Scope-Outs aus Slice 086 schliessen: upstream `.in('club_id')` ungechunkt + `Promise.allSettled` silent-rejected in getMappingStatus.

## Betroffene Files

| Path | Fix |
|------|-----|
| `src/app/api/cron/gameweek-sync/route.ts` | Lines 1245-1252 — `.in('club_id', allLeagueClubIds)` mit `.range()` while-loop (eliminiert upstream 1000-row-cap) |
| `src/lib/services/footballData.ts` | Lines 371-383 — `Promise.allSettled` → `Promise.all` (rejected wird natural propagated, kein silent `data=[]`) |

## Root-Cause / Warum jetzt

### Fix 1: gameweek-sync:1245-1248
- Slice 086 hat `.in('player_id', leaguePlayerIds)` chunked. Aber die **Loader-Query** die leaguePlayerIds produziert (`supabaseAdmin.from('players').select('id').in('club_id', allLeagueClubIds)`) hat selbst kein `.range()`.
- Heute 500-750 Players pro Liga (sicher <1000), aber: Premier League + La Liga haben je ~500-700 aktive + Benched → bei Wachstum oder bei Multi-Liga-Aufruf silent-cap.
- Reviewer-Lesson (common-errors.md §1): "Wenn `.in()` chunked wird, prüfe ob UPSTREAM selbst silent-fail-anfällig ist."

### Fix 2: footballData.ts:371-383
- `Promise.allSettled` gibt rejected-Results als `status: 'rejected'` zurück. Der Code mapped das via `.status === 'fulfilled' ? ... : []` → rejected wird als leeres Array interpretiert.
- Konsequenz: DB-Error in einer der 5 Queries (z.B. `fixturesPaginated` IIFE-Throw) → Admin-Dashboard zeigt "fixtures: 0/0" ohne Fehler. Data-Liar-Bug.
- Caller (`AdminSettingsTab.tsx:42-49`) hat bereits try/catch → `Promise.all` lässt Error natural propagieren → console.error + UI bleibt leer (ehrlicher als Fake-Zero).

## Acceptance Criteria

1. `gameweek-sync/route.ts`: Loader-Query für `leaguePlayerIds` lädt **alle** rows via `.range()`-while-loop (pattern kopiert aus footballData.ts:353-369).
2. `footballData.ts`: `Promise.allSettled` → `Promise.all` in getMappingStatus.
3. Caller AdminSettingsTab: unverändert (try/catch fängt bereits).
4. `npx tsc --noEmit` clean.
5. `npx vitest run src/lib/services/__tests__/footballData.test.ts` grün (alle 3 existing cases).
6. Silent-Fail-Audit re-scan: Line 1245-1248 (gameweek-sync) und Line 371 (footballData Promise.allSettled) **nicht mehr** als HIGH gelistet.
7. Money-Invariant: Scoring-Logik unverändert (nur Loader + Error-Mechanik).

## Edge Cases

- allLeagueClubIds leer → Loader returnt 0 Rows → `gwScoreCount < 50` fires → "insufficient_scores" skip (unchanged).
- allLeagueClubIds mit Players genau 1000 → Loader ohne `.range()` hätte 1000 geliefert (silent OK), mit `.range()` liefert PAGE → break → 1000. Identisch.
- allLeagueClubIds mit Players 1001 → **vorher silent 1000**, **nachher alle 1001**. Fix-wirkung.
- `Promise.all` rejected: `AdminSettingsTab` catch → console.error + status bleibt null → UI Loading/Empty (akzeptabel, ehrlicher als Fake-Zero).
- Tests testen `Promise.allSettled`-verhalten → müssen auf `Promise.all` adaptiert werden. Falls Tests Mock-Rejections haben → Spec sagt "Test-Erwartung anpassen: rejected → getMappingStatus throws".

## Proof-Plan

- `worklog/proofs/087-after.txt`:
  - tsc clean
  - vitest footballData.test.ts output
  - git diff --stat
  - silent-fail-audit re-run diff (Baseline 111 HIGH → 109 HIGH, -2)
  - grep-Verifikation: Line 1245 mit `.range()`, Line 371 mit `Promise.all`

## Scope-Out

- Weitere `.in()`-Calls in gameweek-sync (Line 241, 482, 521, 599, 712, 1270, 1278, 1282, 1354) — nicht Money-Critical, Separate Slice bei Bedarf.
- `Promise.allSettled` in anderen Services — separate Audit (`/silent-fail-audit` wöchentlich).
- Sentry-Integration für residual Silent-Rejects — separate Slice (Handoff-Option 3).
- Test-Coverage für 1001+ Players in gameweek-sync — lokale DB hat keine so grosse Liga, in CI nicht reproduzierbar ohne Seed.
