# Active Slice

```
status: idle
slice: 283 ✅ DONE
stage: LOG complete (GHA-Delta: /market Perf 52→87, LCP −43%, TBT −72%; Live-Network 0× full-fetch auf Default-Tab + /manager)
spec: worklog/specs/283-market-players-tab-decouple.md
impact: worklog/impact/283-market-players-tab-decouple.md
proof: worklog/proofs/283-market-decouple.md
review: worklog/reviews/283-review.md (Cold-Context REWORK → geheilt)
```

## Slice 283 — Market/Manager von /api/players entkoppelt ✅ DONE (2026-06-12)

Headline: **/market Perf 52 → 87, LCP 4,4s → 2,5s, TBT −72%** — schlechteste → beste Page. /manager mit-entkoppelt (Bonus-Discovery). Review fing 1 MAJOR (Dashboard-Error → Endlos-Skeleton).

## Zuletzt

- **Slice 283** (2026-06-12) — Market+Manager-Decouple, /market Perf +35 (L, REWORK→geheilt).
- **Slice 282b** (2026-06-12) — LHCI-Auth-Fix, erste valide Baseline (M).
- **Slice 282** (2026-06-11) — Home-Payload-Decouple −4,2 MB (M).

Nächstes (Kandidaten):
- **Slice 284 — Home-CLS-Fix** (S/M): CLS 0.225 im Post-283-Run (lokal bis 0.55) — letzter großer Baseline-Hebel, UX-spürbar („Seite springt").
- Lighthouse Phase-3-Gates scharf schalten (XS — jetzt 2 authed GHA-Runs, ab 3-5 Schwellen ableiten).
- 283-Backlog: Search-Debounce (F-06), Manager portfolioOnly-Option (F-07), 283b Lite-Endpoint (Re-Visit-Trigger: Marktplatz-Tab-Open-TBT).
- D70 Phase 4 Vercel Edge-Caching.
