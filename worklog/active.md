# Active Slice

```
status: active
slice: 421
title: Welle 2.4 — Per-Liga GW-Max in SpieltagSelector durchrouten + toten GameweekSelector löschen
size: S (2 EDIT UI + 1 DELETE Component + 1 EDIT Barrel + 1 DELETE Test)
stage: PROVE
spec: worklog/specs/421-gw-max-routing-orphan-delete.md
impact: skipped (kein DB/RPC/Service-Change; reines UI-Prop-Routing entlang existierender useLeagueMaxGameweeks-Quelle + Dead-Code-Delete; Consumer-Greps in Spec §3)
build: tsc 0 + FantasyContent(+club) 87 Tests grün; GameweekSelector 0 Refs nach Delete
review: worklog/reviews/421-review.md (PASS, 1 NIT akzeptiert, 1 INFO=Scope-Out-Smells)
proof: worklog/proofs/421-gw-max.txt
fact-correction: Live-DB (D87) — betroffen sind BUNDESLIGA + 2. Bundesliga (max_gameweeks=34, je 4 Geister-GWs), NICHT TFF 1. Lig (=38). Handoff/Test-Fixtures waren stale.
review: pending
```

## Kontext (Faktenbasis, grep-verifiziert 2026-06-27)
- **GW-Max-Bug:** `SpieltagSelector.tsx:20` `maxGameweek=38` Default; `FantasyNav.tsx:48` reicht es NICHT durch; `useGameweek` liefert es nicht → jede Liga cappt bei 38. TFF 1. Lig (max 34) = 4 Geister-GWs. Cron respektiert Per-Liga-Max bereits.
- **Kanonische Quelle existiert:** `useLeagueMaxGameweeks(leagueId)` (events.ts:78) → `getLeagueMaxGameweeks` (club.ts:604, Fallback 38). `FantasyContent` hat `leagueScopeId` in Scope (Z.89).
- **Orphan:** `GameweekSelector` = 0 Prod-Consumer (nur Component + Barrel index.ts:5 + eigener Test). Lebender Selector = SpieltagSelector.

## Plan
- Fix A: FantasyContent mountet `useLeagueMaxGameweeks(leagueScopeId)` → `maxGameweek={data ?? 38}` an FantasyNav → an SpieltagSelector (Prop existiert).
- Fix B: GameweekSelector.tsx + Barrel-Zeile + Test löschen (S375: grep inkl. __tests__).

## Vorige Slice (420 — DONE, Referenz)
Welle 2.3: Heim/Auswärts + FDR über Club-UUID. Reviewer PASS, full vitest 3301 grün.

Nächstes: Welle 2.4 (dieser Slice) → dann Admin-38-Hardcodes (Smell, scoring.queries.ts:415) ODER FantasyPlayerRow-Logo (S276) ODER Ranking-Konsolidierung ODER Welle 3.
