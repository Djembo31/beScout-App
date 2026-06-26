# Active Slice

```
status: idle
slice: 392
title: E-3 Event-Regeln nation_in + max_per_nation (auf nationality_iso) — DONE (UI gebündelt offen)
size: M
stage: LOG
spec: worklog/specs/392-lineup-rule-nation.md
impact: inline (additive Validator-Branches Post-391-Baseline; Money-nah → Live-functiondef geholt D87; feste kuratierte Nation-Liste FE-only)
proof: worklog/proofs/392-nation-smoke.txt
proof-note: force-rollback 17/17 + PATCH-AUDIT (alle 385-390 erhalten, kein anon) + tsc0 + vitest 219
review: worklog/reviews/392-review.md
review-note: reviewer PASS, 2 NIT non-blocking
ceo: "alle E-3-Regeln rein, dann ein Playwright-Durchlauf" (Anil 2026-06-26) · Picker-Quelle = feste kuratierte ~50er-Liste (Anil 2026-06-26, daten-informiert n>=10 + bekannte Fußballnationen)
prev: 391 DONE (nationality_iso). Danach gebündelter Playwright über 386/388/389/390/392.
ac-ui: GEBÜNDELT OFFEN — ein Playwright-Durchlauf am Ende über 386/388/389/390/392
```

## Zuletzt

- **Slice 392** (2026-06-26) — E-3 nation_in (Länder-Whitelist, Multi-Select) + max_per_nation (M, reviewer PASS 2 NIT, force-rollback 17/17). DONE. Offen: gebündelter Playwright (386/388/389/390/392).
- **Slice 391** (2026-06-26) — nationality-Normalisierung: generierte Spalte nationality_iso (M, reviewer PASS 3 NIT, Coverage 100%, TR-Bucket 762 vereint). DONE.
- **Slice 390** (2026-06-26) — E-3 mv_min_eur + max_per_position (M, reviewer PASS, 14/14). DONE. Offen: gebündelter Playwright.
- **Slice 389** (2026-06-26) — E-3 mv_max_eur Underdog (S, reviewer PASS, 13/13). DONE.
- **Slice 388** (2026-06-26) — E-3 Min-pro-Position (S, reviewer PASS, AC-13 UI-live PASS). VOLL-DONE.
- **Slice 387** (2026-06-26) — Compliance-Fix kazanılır→elde edilir (XS, CI grün).

Nächstes: gebündelter Playwright-Durchlauf (386/388/389/390/392) ODER E-4 User-Events (L, Money/CEO).
```
