# Active Slice

```
status: idle
slice: 478
title: D-26b Holdings + Search Mapper Club-FK-Resolve — DONE
size: XS
type: Service
welle: Mock→Pro Konsistenz-Batch (disease-register D-26b)
stage: LOG (done)
proof: worklog/proofs/478-d26b-holdings-search.txt
review: worklog/reviews/478-review.md
```

## Slice 478 DONE (autonom, Fortsetzung 477)
- **Fix:** `holdingMapper.ts:45` (reuse `clubLookup?.name` — eligibility-Gate `useLineupBuilder:358-362` geheilt) + `search.ts:96` (`getClub(club_id)?.name`). Beide hatten `club_id` → triviales 477-Muster. tsc 0 · vitest 14 (3 neue FK-Tests) · self-review PASS.
- **D-26c angelegt (offen, CTO):** Rest-Mapper OHNE `club_id` (watchlist/lineups.queries/offers/trading-movers = Select/RPC-Change) + **Player-Detail Cold-Load-Cache-Race (S286/D-03)**.

## Zuletzt
- **Slice 478** (2026-06-30) — D-26b Holdings/Search Club-FK (XS, self-review, `<commit>`).
- **Slice 477** (2026-06-30) — D-26 Player-Domain Club-FK (S, PASS, live `acab3db0`).
- **Slice 476** (2026-06-30) — /club Dual-Build-Crash (S, live `96bc9341`).

Nächstes (autonom-fähig): D-26c (Cache-Race S286 ODER Rest-Mapper Select-Changes) · D-25 Login-i18n · D-33 timeAgo-Leak — ODER CEO-Richtung (W3 Lineup-Fork / W6 Phase 3).
