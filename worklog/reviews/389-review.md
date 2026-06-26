# Slice 389 Review — E-3 Marktwert-Deckel pro Karte (mv_max_eur)

**Reviewer:** reviewer-Agent (Cold-Context, read-only) · **Datum:** 2026-06-26 · **time-spent:** ~12 min

## Verdict: PASS

## Findings (beide NITPICK, nicht merge-blockierend)

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NITPICK | `useEventForm.ts` `mvMaxMillionsFromRules` | Round-Trip-Anzeige bei nicht-glatt-teilbaren EUR-Werten zeigt lange Dezimale (`333333`→`"0.333333"`). Kein Bug, da `pushMvMax` immer `Math.round(m*1e6)` schreibt; nur via direktem DB-Edit erzeugbar. | Optional `String(Math.round(rule.value/10000)/100)` für 2-Dezimal-Cap. Nicht gemerged (Scope-Out, theoretisch). |
| 2 | NITPICK | `EventFormModal.tsx` mv-Input | `inputMode="decimal"` weicht vom `numeric`-Default-Hinweis ab — ist hier aber die *richtige* Wahl (0,5 Mio möglich). Kein Fix. | Keiner. `decimal` korrekt. |

## One-Line
Ja — ein Senior würde das mergen: chirurgischer additiver Validator-Branch, PATCH-AUDIT byte-clean (13/13 + functiondef-Assertions), MV=0-Fail-closed explizit, BIGINT-Cast vollständig, i18n in korrekten Namespaces, D100-compliant.

## Belege (Prüfaufträge a–f)
- **(a) Patch-Audit:** sauber. Genau 3 Validator-Änderungen (BIGINT + Whitelist + mv-Branch); alle Nicht-Validator-Blöcke (E-1, max_per_club, bench, salary_cap, wildcard, INSERT/UPDATE, holding_locks) byte-identisch. functiondef-Assertions grün, grants ohne `anon`.
- **(b) Float/Einheit:** `parseFloat`+`Math.round(×1e6)`+`m>0`-Guard; Round-Trip stabil (5⇒5000000⇒"5", 0,5⇒500000).
- **(c) MV=0-Fail-closed:** `= 0`-Zweig explizit VOR `> cap`. AC-4 PASS (mv=0 → reject).
- **(d) BIGINT:** DECLARE+Cast+Bound vollständig; AC-5b (2e9 → sauberer Reject statt Crash).
- **(e) i18n-Namespace:** `mvMaxExceeded` in `fantasy`, `mvMaxLabel/Placeholder/Hint` in `admin`, DE+TR; Platform DE-hardcoded (S196-exempt).
- **(f) Compliance:** „Mio. €/Mn €" für MV per D100 erlaubt (Transfermarkt-Referenz). Kein Investment-/Securities-/Glücksspiel-Vokabular.

## Scope-Divergenz (S388)
mv_max_eur = Eignungs-Regel → Starter + Bank (spiegelt age). AC-3 (Bank-Reject) PASS. Auto-Sub-Umgehung geschlossen.

## Offen (kein Merge-Blocker)
- **AC-12 UI-live post-Deploy** — Standard-Nachholschritt der E-3-Reihe (wie 385/386/388), nach Vercel-Deploy von main.

## Knowledge-Capture (beim LOG)
errors-db S386 um „Wert-Bereich pro Regel kann INT-Max übersteigen (EUR) → DECLARE BIGINT + Bound" ergänzen. fantasy.md mv_max_eur-Regel + MV=0-Backlog notieren.
