# Active Slice

```
status: idle
slice: 368a
title: ✅ DONE — Scout-Card-Wertmodell als Kanon (D100 + treasury.md §1b + trading.md-Korrektur)
stage: LOG complete
size: XS
slice-type: Doc/Decision (Money-konzeptuell, kein Runtime-Code, kein Daten-UPDATE)
spec: docs/plans/2026-06-24-scout-card-value-model-spec.md (368-Serie)
impact: skipped (reine Doc/Decision — keine Consumer, kein Schema, kein Daten-UPDATE)
proof: worklog/proofs/368a-proof.txt (knowledge-gate HARD 0/SOFT 0 · grep-Verify · kein Daten-UPDATE)
review: worklog/reviews/368a-review.md (reviewer-Agent PASS, 2 NIT — #1 gefixt)
next: 368b Anzeige-Wahrheit (UI: „Dein Einstieg"←ipos.price/„—", Labels trennen) · 368c Floor-Orderbuch-Transparenz
```

## Inline-Spec (368a)

**Problem:** Die alte Slice-368-Prämisse („ipo_price ist falsch → auf MV/10 nachziehen") missversteht das Modell (Anil-Klärung 2026-06-24). `ipo_price` = Vereins-Eintrittspreis, NICHT MV-gekoppelt. Vier Card-Wert-Zahlen sind im Produkt + in der Doku verschmolzen.

**Lösung (368a = Kanon festhalten, kein Code):**
1. **DISTILL D100** in `memory/decisions.md` — Wertmodell (4 getrennte Zahlen, ipo_price MV-entkoppelt, Floor=Orderbuch), supersedes D99 Punkt 4 (Data-Drift-Sub-Entscheidung).
2. **INDEX.md** Decisions-Range D1–D99 → D1–D100 (Knowledge-Gate).
3. **treasury.md** §Wertmodell-Sektion (4 Zahlen + Anker-Regel + Floor-Transparenz-Ziel), `updated:` heute.
4. **`.claude/rules/trading.md`** korrigieren: alte „Data-Drift → MV/10"-Notiz (Z.30) ersetzen durch korrektes Modell; Pricing-Asset-Block präzisieren (MV/10 = Vorschlag, nicht Zwang).

**AC:**
1. D100 existiert, supersedes-Bezug auf D99 Punkt 4 korrekt.
2. INDEX-Range = D1–D100 (Gate grün).
3. treasury.md hat Wertmodell-Sektion, `pnpm audit:knowledge:check` grün.
4. `.claude/rules/trading.md` enthält NICHT mehr „Fix = Recompute MV/10" als To-Do; ipo_price-Anker-Semantik klar.
5. KEIN Daten-UPDATE auf players/ipos. tsc unberührt (kein Runtime-Code).

**Scope-Out:** 368b (UI-Anzeige), 368c (Floor-Orderbuch). Kein players/ipos-UPDATE.

**Self-Verify:** `grep -n "Recompute.*MV/10\|→ Slice 368" .claude/rules/trading.md` = 0 · `grep "D1–D100" docs/knowledge/INDEX.md` · `pnpm audit:knowledge:check`.

## Zuletzt

- **Slice 367** (2026-06-24) — E4 „Diamond Hands"→„Treuer Sammler" (S, PASS).
- **Slice 366** (2026-06-24) — E4 Doc-Glattzug auf D99 (PASS).

Nächstes: 368b Anzeige-Wahrheit (UI), 368c Floor-Orderbuch.
```
