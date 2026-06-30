# Active Slice

```
status: idle
slice: 481
title: D-26c Teil 1 — players.club Render-SSOT (offers/lineups/compare) via getClub(club_id) — DONE
size: S
type: Service
welle: Mock→Pro Konsistenz-Batch (disease-register D-26c, Teil 1)
stage: LOG (done)
proof: worklog/proofs/481-club-resolve-nodb.txt
review: worklog/reviews/481-review.md
```

## Slice 481 DONE (autonom, P1 Display-Konsistenz)
- 3 no-DB-Surfaces lesen Club aus FK-SSOT statt stale `players.club`-Freitext: `offers.ts` (enrichOffers→OffersTab), `lineups.queries.ts` (Slot-Spieler), `compare/page.tsx` (Search+2 Displays). Kanonisch `club_id ? getClub(club_id)?.name ?? club : club` (wie 477/478).
- tsc 0 · vitest 71 (4 neue AC: FK-Resolve + Freitext-Fallback je offers/lineups) · grep guarded-getClub · DB-Divergenz 294/4556=6,45% · alle Consumer client-gerendert (getClub-Cache da) · self-review PASS.
- §0: getClub = EINE Resolution-SSOT, kein Backfill (S303).

## ⏭️ Nächstes: Slice 482 — D-26c Teil 2 (RPC, DB-isoliert)
- `watchlist.ts` (`get_most_watched_players`) + `trading.ts` (`getGlobalMovers`/Trending): RPC liefert nur Freitext → Migration (club_id zur RPC-Return) + Service-Resolve via getClub. Schließt D-26c.
- **Geparkt:** Cache-Race S286/D-03 (Architektur-Reaktivität).

## Zuletzt
- **Slice 481** (2026-06-30) — D-26c Teil 1 no-DB (S, self-review, `<commit>`).
- **Slice 480** (2026-06-30) — D-27 Gameweek-Guard SSOT (S, Reviewer R2 PASS, `40831fab`).
- **Slice 479** (2026-06-30) — D-25 Auth-Fehler-i18n (S, Reviewer PASS, `d1050dba`).
