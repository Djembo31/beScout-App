# Active Slice

```
status: active
slice: 389
title: E-3 Marktwert-Deckel pro Karte — mv_max_eur (Underdog-Events)
size: S
stage: LOG
spec: worklog/specs/389-lineup-rule-mv-max.md
impact: inline (grep-verifiziert, kein neuer Consumer ggü. 388; Money-nah → Live-functiondef D87 gelesen)
proof: worklog/proofs/389-mv-max-smoke.txt
proof-note: force-rollback 13/13 PASS + PATCH-AUDIT (BIGINT-Fix + alle Blöcke intakt) + tsc 0 + vitest 3268/3269
review: worklog/reviews/389-review.md
review-note: reviewer PASS, 2 NITPICK (non-blocking)
ceo: MV=0 fail-closed + Eingabe in Mio € (AskUserQuestion 2026-06-26)
ac12-ui: OFFEN — post-Deploy Playwright (mv-Input beide Builder, kein MISSING_MESSAGE)
```

## Zuletzt

- **Slice 388** (2026-06-26) — E-3 Min-pro-Position min_per_position (S, reviewer PASS, 13/13, AC-13 UI-live PASS). VOLL-DONE.
- **Slice 387** (2026-06-26) — Compliance-Fix kazanılır→elde edilir (XS, CI grün).
- **Slice 386** (2026-06-25) — E-3 Alters-Fenster age_min/age_max (S, reviewer PASS).

Nächstes: 389 BUILD (Migration + Form/UI/i18n) → REVIEW → PROVE (force-rollback + vitest + Playwright).
```
