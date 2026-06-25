# Active Slice

```
status: idle
slice: 386
title: E-3 Alters-Fenster — age_min/age_max Aufstellungs-Regel (DONE)
size: S
stage: LOG
spec: worklog/specs/386-lineup-rule-age-window.md
proof: worklog/proofs/386-age-rule-smoke.txt
proof-note: 15/15 ACs force-rollback PASS + PATCH-AUDIT + tsc 0 + vitest 1955/1956 (einziger Fail = vorbestehender 374-kazan-Compliance-Test, nicht 386)
review: worklog/reviews/386-review.md
review-note: reviewer PASS, 2 NIT bewusst nicht geheilt
```

## Zuletzt

- **Slice 386** (2026-06-25) — E-3 Alters-Fenster age_min/age_max + Bound-pro-Typ-Fundament-Fix (S, Money-nah, reviewer PASS, 15/15 ACs). UI-Playwright post-Deploy offen.
- **Slice 385** (2026-06-25) — E-3 Aufstellungs-Regel-Fundament: JSONB lineup_rules + Validator + min_per_own_club (M, reviewer PASS).
- **Slice 384** (2026-06-25) — E-3 Türsteher: Follower-Pflicht + Fan-Rang-Gate (M, reviewer PASS).

Nächstes: AC-13 UI-Playwright post-Deploy (Age-Inputs beide Builder). Dann E-3-Erweiterung nation/mv/position ODER E-4. **Offener vorbestehender Compliance-Fund:** `COMPL-tr-kazan` (374) — Micro-Slice.
