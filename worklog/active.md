# Active Slice

```
status: idle
slice: 485
title: D-04 W3 — lineups DB-Integrität (4 Bench-FKs + 16-Slot-Distinctness-Trigger) — DONE
size: L
type: Migration
welle: Mock→Pro W3 Lineup-Datenmodell (disease-register D-04, root-cause #2)
stage: LOG (done)
proof: worklog/proofs/485-lineup-integrity.txt
review: worklog/reviews/485-review.md
```

## Slice 485 DONE (D-04, additive DB-Defense-in-Depth)
- `lineups` hat jetzt **DB-Level-Integrität** unabhängig vom 27k-RPC: 4 FK `bench_*→players(id)` + Trigger `trg_lineups_player_distinct` (BEFORE INS/UPD, 16-Slot-Distinctness, RAISE `duplicate_player`→i18n, GUC-Escape, search_path-pinned).
- Daten 447/0/0/0 → additiv ohne Cleanup. force-rollback AC3-AC8 grün · vitest 62 · RPC unberührt (D-20 Wide-Column behalten).
- **Reviewer R1 CONCERNS → Code PASS, Doku-Prämisse korrigiert:** der RPC validiert die volle 16-Slot-Distinctness BEREITS graceful (`bench_duplicate`/`bench_overlaps_starter`) — meine „RPC prüft nur Starter"-Prämisse war Fehllesung (nur v_seen-Starter-Schleife gelesen). Trigger = reiner DB-Backstop, kein RPC-Gap. **D-04b Phantom-Debt gestrichen.** Lehre → errors-db S485.

## Zuletzt
- **Slice 485** (2026-06-30) — D-04 lineups DB-Integrität (L, Reviewer R1 CONCERNS→Doku-fix, `<commit>`).
- **Slice 484** (2026-06-30) — D-24 Securities-Wording (S, CEO-approved + Live-Visual, `a636b767`).
- **Slice 483** (2026-06-30) — D-33 timeAgo-Konsolidierung (XS, `f491958f`).

Nächstes (CEO-Richtung): W6 SSR Phase 3 · Mock→Pro Welle 3 (Events/Aufstellung). P2-Cleanup: Phantom-Event GW37 · Süper-Lig-max_gameweeks · D-26c-Cache-Race · D-20-Orphan-Typ `Lineup`.
