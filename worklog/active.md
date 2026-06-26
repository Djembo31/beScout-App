# Active Slice

```
status: idle
slice: 388
title: E-3 Min-pro-Position (Formations-Steuerung) — min_per_position (DONE)
size: S
stage: LOG
spec: worklog/specs/388-lineup-rule-position-quota.md
proof: worklog/proofs/388-position-quota-smoke.txt
proof-note: 13/13 force-rollback PASS (inkl. AC-5 players.position) + PATCH-AUDIT + tsc 0 + vitest 303/303
review: worklog/reviews/388-review.md
review-note: reviewer PASS, 2 NIT
ac13-ui: PASS (2026-06-26, bescout.net beide Builder, 386 Alter + 388 Position, kein MISSING_MESSAGE, 0 Console-Errors)
```

## Zuletzt

- **Slice 388** (2026-06-26) — E-3 Min-pro-Position min_per_position (S, reviewer PASS, 13/13, AC-13 UI-live PASS). VOLL-DONE.
- **Slice 387** (2026-06-26) — Compliance-Fix kazanılır→elde edilir (XS, CI grün).
- **Slice 386** (2026-06-25) — E-3 Alters-Fenster age_min/age_max (S, reviewer PASS).

Nächstes: AC-13 UI-Playwright post-Deploy (386 Age + 388 Position, beide Builder). Dann E-3-Erweiterung nation/mv_max ODER E-4 User-Events.
```
