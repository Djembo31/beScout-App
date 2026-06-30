# Active Slice

```
status: idle
slice: 480
title: D-27 Gameweek-Season-Guard aus SSOT leagues.max_gameweeks — DONE (Reviewer R2 PASS, live verifiziert)
size: S
type: Service
welle: Mock→Pro Konsistenz-Batch (disease-register D-27)
stage: LOG (done)
proof: worklog/proofs/480-gameweek-ssot-guard.txt
review: worklog/reviews/480-review.md
```

## Slice 480 DONE (autonom, P1)
- `createNextGameweekEvents` Hardcode `nextGw > 38` → SSOT `leagues.max_gameweeks`, verankert an **Club-Liga** (`clubs.league_id`). Guard-at-Top.
- **Anker-Korrektur (R1-Review):** event.league_id wäre falsch (207/208 Events league_id=NULL → 38-Fallback, Bug ungelöst). Club-Liga ist deterministisch + konsistent mit getActiveGameweek.
- **Verhindert** Phantom-Events GW35-38 in BL/2.BL (max=34, live scharf bei active_gameweek=34). DB-Beweis: FC Augsburg=BL max34 → 35>34 skip.
- tsc 0 · vitest 107 (2 neue SSOT-Tests + Boundary + Bestand) · grep 0-Hardcode · **Reviewer R1 CONCERNS → R2 PASS** (LOW #1 clubs-Query Silent-Fail-Härtung umgesetzt).
- Knowledge → errors-db **S480** (Per-Liga-Fork → Anker an Entitäts-Liga). disease-register D-27 → ✅ geheilt.

## 🅿️ Geparkt (P2, kein Money)
- 1 bestehendes Phantom-Event „BeScout-Saison Bundesliga (Demo)" GW37 (FC Augsburg, frei/ended/0 real_entries) → trivialer Cleanup, kein Money-Risiko, nicht in Code-Fix gemischt.
- Süper Lig `max_gameweeks=38` (active=34) = separater Daten-Smell.

## Zuletzt
- **Slice 480** (2026-06-30) — D-27 Gameweek-Guard SSOT (S, Reviewer R2 PASS, `<commit>`).
- **Slice 479** (2026-06-30) — D-25 Auth-Fehler-i18n (S, Reviewer PASS, `d1050dba`).
- **Slice 478** (2026-06-30) — D-26b Holdings/Search Club-FK (XS, self-review, `1fb18ad5`).

Nächstes (autonom-fähig): D-33 (timeAgo EN-Leak, XS) · D-26c (Cache-Race S286 / Rest-Mapper) — ODER CEO-Richtung (W3 Lineup-Fork / W6 Phase 3). Konsistenz-Batch: nur noch D-24 (Wording, Compliance/CEO) offen. P2-Cleanup: Phantom-Event GW37 + Süper-Lig-max_gameweeks.
