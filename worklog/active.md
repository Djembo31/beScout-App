# Active Slice

```
status: active
slice: 477
title: D-26 Player-Domain Club-Identität — dbToPlayer FK-Resolve (stale players.club-Freitext → club_id)
size: S
type: Service
welle: Mock→Pro Konsistenz-Batch (disease-register D-26)
stage: LOG (commit pending → dann AC-6 Live-Playwright post-Deploy)
spec: worklog/specs/477-d26-player-club-identity.md
impact: inline (Spec §3 — dbToPlayer-Consumer-Grep done: Player-Detail/Markt/Suche/Club/Admin; separate Mapper Watchlist/Home-Strips = D-26b)
proof: worklog/proofs/477-player-club-identity.txt
review: worklog/reviews/477-review.md (Reviewer PASS, 4 Findings alle NITPICK/INFO)
```

## Slice 477 — Faktenlage (Live-DB verifiziert diese Session)
- **P1, sichtbar falsche Wahrheit:** 294/4472 Spieler (6,57 %) — `players.club` Freitext ≠ FK-`clubs.name`. Echte Falsch-Clubs (Adli „Bournemouth" vs FK „Bayer Leverkusen" etc.).
- **Selbst-widersprüchliche Karte:** PlayerHero Liga-Badge schon FK-resolved (Z.192), Club-Name+Wappen aus Freitext (Z.70/210) → „Bournemouth"-Name MIT BL-Badge.
- **Fix:** EINE Zeile `players.ts:207` `club: db.club_id ? (getClub(db.club_id)?.name ?? db.club) : db.club` — SSOT-Schnitt an Mapper-Grenze, parallel zur bereits FK-resolved Liga (Z.210-214). Graceful Fallback (NULL/Cache-cold → Freitext). Cascaded zu allen dbToPlayer-Konsumenten.
- CTO-autonom (money-neutral, kein Security/Wording). Reviewer-Pflicht (S, Field-Semantik 6 Surfaces).

## Zuletzt
- **Slice 476** (2026-06-30) — /club Dual-Build-Crash gefixt (S, PASS, live `96bc9341`).
- **Slice 475** (2026-06-30) — `clubs.active_gameweek` DROP (= 428b, live `ccb86c1a`).
- **Slice 472-474** (2026-06-30) — W6 Server-Auth-SSR-Trilogie, Prod-verifiziert.

Nächstes: nach 477 = CEO-Richtung (W6 Phase 3 / Mock→Pro Welle 3 / Ranking-Konsolidierung) ODER D-26-Rest (Watchlist/Home-Strips) + Konsistenz-Batch D-25/D-33.
