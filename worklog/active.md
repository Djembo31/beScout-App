# Active Slice

```
status: idle
slice: 482
title: D-26c Teil 2 — players.club Render-SSOT in Aggregat-RPCs (Server-Resolve) — DONE (schließt D-26c Display)
size: S
type: Migration
welle: Mock→Pro Konsistenz-Batch (disease-register D-26c)
stage: LOG (done)
proof: worklog/proofs/482-rpc-club-resolve.txt
review: worklog/reviews/482-review.md
```

## Slice 482 DONE (autonom, P1 Display-Konsistenz)
- 2 Aggregat-RPCs (`rpc_get_trending_players` Movers + `rpc_get_most_watched_players` Watchlist via SECDEF-Wrapper) lesen Club FK-resolved: `LEFT JOIN clubs + COALESCE(c.name, p.club)`. Keine Signatur-Änderung (ACL/Shape/SECDEF erhalten S368c) → kein Client-/Service-/Test-Change.
- Migration `20260630180000` applied · functiondef-verifiziert · proacl pre==post · Live-Resolve-Smoke (Zaniolo Udinese→Galatasaray) · Probe-Call row-count-neutral · self-review PASS.
- **D-26c Display-Teil KOMPLETT** (481 no-DB offers/lineups/compare + 482 RPC). §0: Surface-Typ-Split (Raw-Row→Client-getClub, Aggregat→Server-Resolve), beide lesen clubs-SSOT.

## 🅿️ Geparkt (D-26c-Rest, Architektur)
- Player-Detail Cold-Load-Cache-Race S286/D-03 (`usePlayerDetailData` useMemo vor Club-Cache-ready) — Reaktivitäts-Signal, kein Display-SSOT-Problem.

## Zuletzt
- **Slice 482** (2026-06-30) — D-26c Teil 2 RPC Server-Resolve (S, self-review, `<commit>`). **D-26c Display done.**
- **Slice 481** (2026-06-30) — D-26c Teil 1 no-DB (S, self-review, `29dd6b93`).
- **Slice 480** (2026-06-30) — D-27 Gameweek-Guard SSOT (S, Reviewer R2 PASS, `40831fab`).

Nächstes (autonom-fähig): D-33 (timeAgo EN-Leak, XS) — ODER CEO-Richtung (W3 Lineup-Fork D-04 / W6 Phase 3 / Mock→Pro Welle 3 Events). Konsistenz-Batch: nur noch D-24 (Wording, Compliance/CEO) offen. P2-Cleanup: Phantom-Event GW37 + Süper-Lig-max_gameweeks.
