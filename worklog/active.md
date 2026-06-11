# Active Slice

```
status: active
slice: 282
stage: PROVE (AC-01/07 Live-Network-Verify post-Deploy offen)
spec: worklog/specs/282-home-players-payload-decouple.md
impact: worklog/impact/282-home-players-payload-decouple.md
proof: worklog/proofs/282-home-payload.md
review: worklog/reviews/282-review.md (Cold-Context REWORK → 11/11 Findings geheilt)
```

## Slice 282 — Cold-Start Phase 3: Home von /api/players entkoppeln (M)

**Trigger:** Anil 2026-06-11 „go" nach 282a. D70-Track.
**Discovery:** `/api/players` = 4,2 MB / 5,5s, auf Home konsumiert für 2 lebende Mini-Ableitungen + 1 totes Feature (activeIPOs immer leer — dbToPlayer setzt ipo.status='none'). Lighthouse-Validity-Befund: alle 3 LHCI-URLs redirecten auf /login (Slice 282b-Kandidat).
**Baseline:** worklog/audits/2026-06-11/lighthouse-baseline.md

## Zuletzt

- **Slice 282a** (2026-06-11) — Ops-Recovery (M, Self-Review PASS).
- **Slice 281** (2026-05-06) — Synthetic-Daily-GHA-Verkabelung (XS).

Nächstes: Slice 282b — LHCI-Auth + GHA-Artifact-Fix.
