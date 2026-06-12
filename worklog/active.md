# Active Slice

```
status: active
slice: 283
stage: PROVE (Live-Network + GHA-Lighthouse-Delta post-Deploy offen)
spec: worklog/specs/283-market-players-tab-decouple.md
impact: worklog/impact/283-market-players-tab-decouple.md
proof: worklog/proofs/283-market-decouple.md
review: worklog/reviews/283-review.md (Cold-Context REWORK → MAJOR+MINOR geheilt, Wave-2-partial dokumentiert)
```

## Slice 283 — Market: Portfolio-Tab von /api/players entkoppeln (L)

**Trigger:** Anil 2026-06-12 „weiter mit 1" (Baseline-Hebel #1: /market GHA LCP 4,4s / Perf 52).
**Design-Pivot:** Statt Server-Pagination (L+, beta-riskant) → Tab-Decoupling: Default-Tab `portfolio` (nur Holdings) wird heute vom 4,2-MB-Fetch des Marktplatz-Tabs gegated — exakt die Slice-282-Home-Klasse. Wave 1 Tab-Gating + byIds-Portfolio-Pfad, Wave 2 Enrichment-Single-Pass, Wave 3 SortOption-No-Op-Fix.
**Messkorrektur dokumentiert:** Transfer ist br-komprimiert ~461 KB — Killer ist Parse/Materialisierung/Enrichment (4.500 Objekte × 3-5 Pässe).

## Zuletzt

- **Slice 282b** (2026-06-12) — LHCI-Auth-Fix, erste valide Baseline.
- **Slice 282** (2026-06-11) — Home-Payload-Decouple −4,2 MB.
- **Slice 282a** (2026-06-11) — Ops-Recovery.

Nächstes: 283b (Lite-Endpoint/Server-Pagination falls nötig) · 284 Home-CLS · Lighthouse Phase-3-Gates.
