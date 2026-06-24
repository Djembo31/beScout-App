# Active Slice

```
status: idle
slice: 366
title: ✅ DONE — E4 Doc-Glattzug: Money-Modell-Doku auf D99 ausgerichtet
stage: LOG complete
size: XS
slice-type: Doc (Ops-spur, lean — kein Money/Security-Code-Verhalten; richtet Doku an CEO-ratifizierter D99 aus)
spec: inline (siehe unten) + Checkliste worklog/notes/365-money-model-drift-inventory.md
impact: skipped (reine Doku/Wording, 0 Code-Verhalten, 0 RPC/Schema/Service)
proof: worklog/proofs/366-drift-grep.txt (Phasen 1/2/3 · Faktor-100 aufgelöst · messages $SCOUT/BSD=0 · tsc EXIT 0)
review: worklog/reviews/366-review.md (self-review PASS, Ops/Doc-Spur)
next: 367 „Diamond Hands"-Cluster fixen (Umbenennen DE+TR + 30d-Logik + Konfetti raus) — Plan worklog/notes/366-e4-money-model-cleanup-epic.md
```

## Inline-Spec (E4 Schritt 2 — Doc-Glattzug)

**Problem:** Money-Modell-Doku driftet über ~40 Stellen (3 Namen BSD/$SCOUT/Credits, Faktor-100-€-Widerspruch, Phasen 1/3/4 vs 1/2, CASP-Konflikt, CONCEPT-DPC-ECONOMY in sich widersprüchlich). Belegt durch Slice-365-E2E (M-5/D99).

**Ziel:** Jede Inventur-Stelle (A–E in `365-money-model-drift-inventory.md`) auf **D99** ausrichten — verbunden, kein Parallel-Stand.

**Glattzug-Regeln (aus D99):**
- Einheit user-facing = **„Credits"**. „$SCOUT" nur noch ICO-Coin-/Strategie-/Investor-Kontext (klar als „später" markiert). „BSD" = deprecatet (als Legacy markieren, nicht user-facing).
- Einheiten-Vokabular: **intern = cent (integer)**, **Anzeige = Credits (= cents/100)**. Die Zeile „1 $SCOUT = 1 cent" → präzisieren: „intern 1 cent = kleinste Einheit; 1 Credit = 100 cents (Anzeige)". Faktor-100-Drift auflösen.
- Phasen überall **1/2/3** (1=Free-Play · 2=ICO/Token nach Lizenz · 3=Paid Fantasy nach MGA).
- CASP: „Token erst nach **gültiger Lizenz**" (nicht „nach CASP" absolut); Route = Anwalt vor ICO; scout-launch-strategie.md = ein Input.
- Pricing: **1 Card = MV/1.000 Credits** kanonisch (= MV/100.000 € beim ICO-Peg, KEIN 100×-Widerspruch). €-Bezug = ICO-Zeit, user-facing nie €.

**Scope-Out:** `ipo_price`-Data-Migration (→ Slice 368), Diamond-Hands (→ 367), Code-Funktions-Renames mit Verhalten (nur JSDoc/Kommentar-Wording hier, keine Signatur-Änderung).

**AC:**
1. `de.json:27`/`tr.json:27` `"bsd":"Credits"` bleibt (zentral korrekt) — keine €-Werte neben Credits.
2. Keine Doc-Stelle behauptet mehr „1.000.000 cents = 10.000 $SCOUT" ohne D99-konforme Auflösung.
3. Keine Doc-Stelle nummeriert Phasen 1/3/4 für dasselbe Modell.
4. „100× auseinander" / Pricing-Widerspruch ist als reconciled (MV/1.000 Credits) aufgelöst.
5. CASP-Wording neutral „nach gültiger Lizenz", scout-launch-strategie.md nicht mehr als Widerspruch.
6. CONCEPT-DPC-ECONOMY.md interner Selbstwiderspruch geheilt (alter Faktor 10.000 BSD/€ raus).
```
