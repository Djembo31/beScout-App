# Active Slice

```
status: idle
slice: 477
title: D-26 Player-Domain Club-Identität — dbToPlayer FK-Resolve — DONE (warm-path live-verifiziert)
size: S
type: Service
welle: Mock→Pro Konsistenz-Batch (disease-register D-26)
stage: LOG (done)
proof: worklog/proofs/477-player-club-identity.txt
review: worklog/reviews/477-review.md
```

## Slice 477 DONE + Prod-verifiziert
- **Bug (P1, live):** `players.club` Freitext divergiert bei **294/4472 (6,57 %)** vom FK-Club → PlayerHero zeigte Freitext-Name+Wappen MIT FK-Liga-Badge = widersprüchliche Karte.
- **Fix (1 Zeile, SSOT):** `players.ts:211` `club: db.club_id ? getClub(db.club_id)?.name ?? db.club : db.club`. tsc 0 · vitest 235 · Reviewer PASS · Commit `acab3db0`.
- **AC-6 Live (bescout.net):** WARM-Cache ✅ — Suche Adli → „BAY" (Bayer Leverkusen) statt „Bournemouth" (`477-search-adli-bay-warm.png`). **Cold-Direct-Load Player-Detail = pre-existing S286/D-03 Cache-Race** (useMemo läuft vor Club-Cache-ready; betrifft Liga identisch; kein 477-Regression) → getrackt.
- **Geparkt (D-26b + Cache-Race):** Holdings-Mapper (priorisiert, eligibility-affecting), Watchlist, Home-Strips-RPCs, search.ts/lineups.queries/offers/compare; + player-detail Cold-Load-Reaktivität (S286).

## Zuletzt
- **Slice 477** (2026-06-30) — D-26 Player-Domain Club-FK-Resolve (S, PASS, live `acab3db0`).
- **Slice 476** (2026-06-30) — /club Dual-Build-Crash gefixt (S, live `96bc9341`).
- **Slice 475** (2026-06-30) — `clubs.active_gameweek` DROP (= 428b, live `ccb86c1a`).

Nächstes (CEO-Richtung): W6 Phase 3 / Mock→Pro Welle 3 (Events/Aufstellung) / Ranking-Konsolidierung — ODER autonomer Konsistenz-Batch: D-26b (Holdings-Mapper priorisiert) · D-25 (Login-i18n) · D-33 (timeAgo i18n-Leak) · player-detail Cache-Race (S286).
