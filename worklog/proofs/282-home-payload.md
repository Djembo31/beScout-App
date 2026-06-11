# Proof Slice 282 — Home von /api/players entkoppelt (2026-06-11)

## Baseline (Vorher-Messung, lighthouse-baseline.md)

```
GET /api/players (Production, unthrottled curl):
HTTP 200 | 4.228.848 bytes (4,2 MB) | 5,48s
Mobile-Profil (1.6 Mbps, LH-Throttling): ~21s Download + 4-MB-JSON.parse auf 4×-CPU
Konsumiert auf Home via useHomeData → usePlayers() für:
  - activeIPOs (DEAD: dbToPlayer setzt ipo.status='none' unconditional)
  - trendingWithPlayers (5-ID-Join)
  - hasGlobalMovers (1 some()-Check)
```

## AC-06 — tsc + Tests grün

```
npx tsc --noEmit → exit 0
CI=true vitest run (useHomeData + home-Components + social + queries + neuer Service-Test):
 Test Files  13 passed (13)
      Tests  154 passed (154)
```

Neu: `src/lib/services/__tests__/players-byIds-movers.test.ts` (Review F-07) — 7 Tests
inkl. Chunk-Boundary (101 IDs → exakt 2 Queries) + error-throw + !res.ok-throw.

## AC-08 — qk-Keys mit Konsumenten

```
$ grep -rn "qk.players.byIds|qk.players.globalMovers" src/ | grep -v keys.ts | wc -l
2   (usePlayersByIds + useGlobalMovers in queries/players.ts; Hooks konsumiert von
     useHomeData, LastGameweekWidget, FollowingFeedRail, TopMoversStrip)
$ grep -c "usePlayers()" src/app/(app)/hooks/useHomeData.ts
1   (nur Kommentar-Erwähnung — kein Call mehr)
```

## AC-05 — Market unverändert

usePlayers-Konsumenten nach Slice: `enriched.ts` (Market) + Fantasy-Builder — Home raus, sonst nichts angefasst. Reviewer-verifiziert.

## DB-Spotchecks (AC-03/AC-04-Grundlage)

```sql
ipos by status:        ended=4720, open=0, early_access=0
movers (change<>0, !liquidated): 0      -- Markt aktuell ruhig
ipos RLS:              ipos_select_all (SELECT) ✓
```

→ Live-Zustand: activeIPOs=[] + hasGlobalMovers=false — beide Sektionen unsichtbar,
identisch zum Vorher-Verhalten. AC-04 (IPO-Mapping) via Unit-Tests belegt
(Dedupe + Status-Priorität + progress-Rundung + Missing-Player-Skip), Visual folgt
sobald reale IPOs existieren.

## REVIEW

Cold-Context-Reviewer: REWORK (2 MAJOR + 5 MINOR + 4 NIT) → alle 11 Findings geheilt,
siehe `worklog/reviews/282-review.md`. Highlight: F-01 IPO-Doppel-Render
(Slice-278-Klasse, durch Reaktivierung scharf geworden) vor Live-Gang gefangen.

## Bewusster Drop (Review F-04)

topMover-Sparkline in HomeSpotlight entfernt statt restauriert: `prices.history7d`
wird in der gesamten Codebase NIRGENDS befüllt (einziger Treffer = Type-Definition)
— die Sparkline hat nie gerendert. Restaurierung wäre Scope-Creep (History-Datenquelle
existiert nicht).

## AC-01 + AC-07 — Live-Network-Verify (post-Deploy) ✅

Deploy-Story (D36): Vercel-Webhook für `1ab44019` kam ~14 min verzögert (0 commit-statuses,
0 deployment-Entries) — Re-Push `29abe210` (Smoke-Fix) als Re-Trigger, beide deployed.
Post-Deploy-Smoke: **SUCCESS in 1m07s** (Run 27376469436 — erster Lauf mit dem
282a-Pattern-Fix in beta-smoke.spec.ts).

```
$ npx tsx e2e/qa-282-network.ts   (eingeloggt jarvis-qa, 393px, Production)
Requests total: 125 | Transfer-Sum (response bodies): 2.28 MB
AC-01 — GET /api/players (full): 0 ✅ ELIMINIERT
Movers-Endpoint (erwartet 1): 1 — 0.0 KB   (DB hat aktuell 0 Movers — korrekt leer)
byIds-Mini-Fetches (rest/v1 players id=in.): 1 — 6.5 KB
Screenshot: qa-screenshots/282-home-mobile.png (Hero + Stats + Streak rendern, 0 Layout-Bruch)
```

**AC-07: Home-Transfer 2,28 MB statt ~6,5 MB (Vorher = 2,3 MB Rest + 4,2 MB players)
→ −4,2 MB / −65% — Hard-AC ≥ 4 MB erfüllt.** Die 4,2-MB-Payload ist durch 6,5 KB
byIds + 0-KB-Movers ersetzt (−99,8% auf der Players-Achse).
