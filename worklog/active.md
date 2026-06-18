# Active Slice

```
status: in-progress
slice: 347
title: FRE-5 — Club-konfigurierbare Fan-Rang-Schwellen (Money-nah)
stage: PROVE (Backend bewiesen; UI-Playwright post-Deploy offen)
size: L
slice-type: Migration
spec: worklog/specs/347-club-configurable-fan-rank-thresholds.md
impact: worklog (impact-analyst Consumer-Karte, 6 Gruppen, Risiko HIGH)
proof: worklog/proofs/347-thresholds-smoke.txt (Backend AC1-AC8 ✅; UI AC9/AC10 post-Deploy)
review: worklog/reviews/347-review.md (PASS, Finding #1 gefixt, 1 NIT pre-existing)
```

## Vorheriger Slice
- **346 / FRE-3** ✅ DONE — Exklusive Vereins-Beiträge (Fan-Rang-Gate + 🔒-Vorschau). PASS, live.

## Zuletzt
- **Slice 344 / FRE-1** — Fan-Rang-Leiter sichtbar (UI). PASS, live.
- **Slice 345 / FRE-2** — Follow zählt (+5) + Recalc-Trigger. PASS, live.

## Fan-Reward-Engine (E1-Teil) — Plan = D93
- FRE-1 ✅ · FRE-2 ✅ · **FRE-3 (dieser Slice): exklusive Vereins-Beiträge ab Fan-Stufe X, mit gesperrter Vorschau (🔒).** Security-nah (RLS-Lese-Gate) → ich (CTO) baue selbst.
- Design (Anil 2026-06-18): gesperrte Vorschau (nicht komplett unsichtbar); Mindeststufe wählt der Admin pro Beitrag.
- Danach: FRE-4 Airdrop (Money) · FRE-5 Club-Konfig.
