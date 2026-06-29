# Active Slice

```
status: idle
slice: 467
title: D-23 — Geld-Formatter konsolidieren (formatScout → fmtScout, 2 Dez) — DONE (AC-05 Visual post-Deploy offen)
size: S
type: Service (Display-Konsolidierung)
stage: LOG (done)
spec: worklog/specs/467-d23-money-formatter-consolidate.md
impact: skipped (reine Display-Logik, Return-Type string unverändert)
proof: worklog/proofs/467-d23-formatter.txt
review: worklog/reviews/467-review.md (CONCERNS=Housekeeping, Code PASS, adressiert)
```

## Plan (CTO; CEO-Format-Entscheid Anil 2026-06-30: 2 Dezimalstellen)
D-23: formatScout (cents, 0-Dez) vs fmtScout (Credits, 2-Dez) → verschiedene Zahlen auf demselben Screen (SideNav vs TopBar, ~45% Wallets). Fix: formatScout(cents) delegiert an kanonischen fmtScout(cents/100) → EINE Formatierungs-Wahrheit, 2-Dez konsistent, kein 201-File-Refactor. Nur fractional-Salden ändern sich (exakt statt gerundet = der Fix).

## Letzter Slice DONE
467 (D-23) — Geld-Formatter konsolidiert (formatScout→fmtScout, 2-Dez), Reviewer Code-PASS. AC-05 Visual post-Deploy offen.

## Session-Stand (autonom 460-467)
W0-Security-Block (460-466) + D-23 Geld-Divergenz (467) = die substanziellen Risiken zu. Rest = P2-Hygiene oder CEO-Scope.

## Offen (TEIL B) — nächste Kandidaten
- **🟡 AC-05 Visual D-23** post-Deploy bescout.net (SideNav==TopBar 2-Dez, jarvis-qa).
- **W0-Rest** (P2 anon-Hygiene · 87 search_path · 81 Policies + Index) · **D-38** sponsorStats Silent-Fail · **W5-Rest** (D-24 Wording **Compliance/CEO**/D-25 Auth-i18n/D-26 Club-Logos) · **Dead-GC** D-14/15/16 (Money/CEO) · **INV-19/32/33** P2 · K6/K7 (LOW).
