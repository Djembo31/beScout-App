# Active Slice

```
status: idle
slice: 391
title: nationality-Normalisierung — generierte Spalte nationality_iso (DONE)
size: M
stage: LOG
spec: worklog/specs/391-nationality-iso-normalization.md
impact: inline (additive Spalte + IMMUTABLE fn; Display liest weiter mapNationalityToIso(nationality) unverändert)
proof: worklog/proofs/391-nationality-iso.txt
proof-note: Coverage 100% (unmapped=0), TR-Bucket 762 vereint, Index+Grants ohne anon, Reviewer PASS (3 NIT)
review: worklog/reviews/391-review.md
ceo: generierte Spalte nationality_iso GENERATED ALWAYS (Anil 2026-06-26)
prev: 390 DONE (mv_min_eur + max_per_position). NÄCHSTER = Slice 392 nation_in + max_per_nation (nutzt nationality_iso), dann gebündelter Playwright.
spec: worklog/specs/390-lineup-rule-mvmin-maxpos.md
impact: inline (grep-verifiziert, kein neuer Consumer ggü. 389; Money-nah → Live-functiondef Post-389 D87)
proof: worklog/proofs/390-mvmin-maxpos-smoke.txt
proof-note: force-rollback 14/14 + PATCH-AUDIT (alle Vorgänger-Regeln intakt, grants ohne anon) + tsc 0 + vitest 3268/3269
review: worklog/reviews/390-review.md
review-note: reviewer PASS, 2 NIT
ceo: "alle E-3-Regeln rein, dann ein Playwright-Durchlauf" (Anil 2026-06-26). Nationen → Normalisieren-Slice 391 zuerst (nationality-Daten kaputt: Türkei=3 Schreibweisen).
ac-ui: GEBÜNDELT OFFEN — ein Playwright-Durchlauf am Ende über 386/388/389/390(+392)
```

## Zuletzt

- **Slice 391** (2026-06-26) — nationality-Normalisierung: generierte Spalte nationality_iso (M, reviewer PASS 3 NIT, Coverage 100%, TR-Bucket 762 vereint). DONE. NÄCHSTER = 392 nation_in + max_per_nation.
- **Slice 390** (2026-06-26) — E-3 mv_min_eur + max_per_position (M, reviewer PASS, 14/14). DONE. Offen: gebündelter Playwright.
- **Slice 389** (2026-06-26) — E-3 mv_max_eur Underdog (S, reviewer PASS, 13/13, MV=0 fail-closed + BIGINT-Fix). DONE, Commit 29854ac5. Offen: AC-12 UI post-Deploy.
- **Slice 388** (2026-06-26) — E-3 Min-pro-Position min_per_position (S, reviewer PASS, 13/13, AC-13 UI-live PASS). VOLL-DONE.
- **Slice 387** (2026-06-26) — Compliance-Fix kazanılır→elde edilir (XS, CI grün).
- **Slice 386** (2026-06-25) — E-3 Alters-Fenster age_min/age_max (S, reviewer PASS).

Nächstes: E-3-Regel-Reste (nation_in / mv_min_eur / max_per_position) ODER E-4 User-Events (L, Money/CEO). Money-nah → Live-functiondef VOR Spec (D87).
```
