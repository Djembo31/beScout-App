# Active Slice

```
status: idle
slice: 346
title: ✅ DONE — FRE-3: Exklusive Vereins-Beiträge (Fan-Rang-Gate + gesperrte Vorschau)
stage: LOG complete
size: M
slice-type: Migration
spec: worklog/specs/346-exclusive-club-posts.md
impact: inline (Spec §3/§4 — RLS/Security-nah)
proof: worklog/proofs/346-rls.txt (+ UI-Playwright post-Deploy offen)
review: worklog/reviews/346-review.md (PASS, 3 NIT non-blocking)
```

## Zuletzt
- **Slice 344 / FRE-1** — Fan-Rang-Leiter sichtbar (UI). PASS, live.
- **Slice 345 / FRE-2** — Follow zählt (+5) + Recalc-Trigger. PASS, live.

## Fan-Reward-Engine (E1-Teil) — Plan = D93
- FRE-1 ✅ · FRE-2 ✅ · **FRE-3 (dieser Slice): exklusive Vereins-Beiträge ab Fan-Stufe X, mit gesperrter Vorschau (🔒).** Security-nah (RLS-Lese-Gate) → ich (CTO) baue selbst.
- Design (Anil 2026-06-18): gesperrte Vorschau (nicht komplett unsichtbar); Mindeststufe wählt der Admin pro Beitrag.
- Danach: FRE-4 Airdrop (Money) · FRE-5 Club-Konfig.
