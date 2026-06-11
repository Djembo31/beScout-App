# Active Slice

```
status: idle
slice: 282 ✅ DONE
stage: LOG complete (Live-Verify: 0x /api/players auf Home, -4,2 MB, Smoke 1m07s SUCCESS)
spec: worklog/specs/282-home-players-payload-decouple.md
impact: worklog/impact/282-home-players-payload-decouple.md
proof: worklog/proofs/282-home-payload.md
review: worklog/reviews/282-review.md (Cold-Context REWORK -> 11/11 geheilt)
```

## Slice 282 — Home von /api/players entkoppelt ✅ DONE (2026-06-11)

Headline: **Home-Transfer −4,2 MB (−65%)**. usePlayers() raus, 3 Mini-Quellen rein, 4 Children entkoppelt, totes IPO-Spotlight reaktiviert (D63-Intent). Review fing 2 MAJOR vor Live-Gang.

## Zuletzt

- **Slice 282** (2026-06-11) — Home-Payload-Decouple −4,2 MB (M, Review REWORK→geheilt).
- **Slice 282a** (2026-06-11) — Ops-Recovery (M, Self-Review PASS).
- **Slice 281** (2026-05-06) — Synthetic-Daily-GHA (XS).

Nächstes (Kandidaten):
- **Slice 282b** — LHCI-Auth-Fix (misst aktuell /login statt App-Pages!) + GHA-Artifact-Fix. Voraussetzung für echte Phase-3-Lighthouse-Gates.
- **Slice 283** — Cold-Start Phase 4 (Vercel Edge-Caching) per D70-Plan.
- Market-Entkopplung von /api/players (L-Slice, Server-Pagination) — größter verbleibender Payload-Hebel.
