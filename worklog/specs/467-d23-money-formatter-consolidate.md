# Slice 467 — D-23: Geld-Formatter konsolidieren (formatScout → fmtScout, 2 Dez)

**Status:** SPEC · **Größe:** S · **Slice-Type:** Service (Display-Konsolidierung) · **Scope:** CTO (Format-Entscheid CEO Anil 2026-06-30: 2 Dezimalstellen) · **Datum:** 2026-06-30

> Visible-False-Truth-Fix (P1) + §0-Schnitt-Regel (2 Formatter → 1 Formatierungs-Wahrheit). Frontend-Display → Proof = Unit-Tests (Logik) + Post-Deploy-Visual bescout.net.

---

## 1. Problem Statement

Zwei Geld-Formatter mit **divergenter Präzision** zeigen für dieselbe Wallet **verschiedene Zahlen auf demselben Screen** (D-23, ~45 % der Wallets mit fractional Credits betroffen):
- `fmtScout(value)` (`utils.ts:6`) — Input = **Credits** (cents/100), `maximumFractionDigits: 2` → „11.708,27".
- `formatScout(cents)` (`wallet.ts:279`) — Input = **cents**, ÷100, `maximumFractionDigits: 0` → „11.708" (**versteckt den Cent-Anteil**).

SideNav (`fmtScout`) zeigt „11.708,27", TopBar (`formatScout`) „11.708" → sichtbare Inkonsistenz + falsch gerundeter Saldo.

**Evidence:** disease-register **D-23** (dup-registry). Bodies live gelesen (unterschiedl. Input-Einheit + Präzision). 604 Vorkommen / 201 Files.

## 2. Lösungs-Design

**Minimal-invasiv (kein 201-File-Refactor):** `fmtScout` = der **EINE kanonische Credits-Formatter** (2 Dez, Anil-Entscheid). `formatScout(cents)` wird zum **dünnen cents-Adapter**, der delegiert:
```ts
// wallet.ts
import { fmtScout } from '@/lib/utils';
/** Cents → Credits-Anzeige (2 Dez, D99/D-23). Dünner Adapter auf den kanonischen fmtScout. */
export function formatScout(cents: number): string {
  return fmtScout(Math.round(cents) / 100);
}
```
→ EINE Formatierungs-Wahrheit (`fmtScout`); alle ~100 `formatScout`-Caller + alle `fmtScout`-Caller zeigen ab jetzt **identisch** 2-Dez (bzw. keine Dez bei ganzen Credits, da `maximumFractionDigits:2` = bis-zu-2). §0-Schnitt: formatScout = dokumentierter cents-Adapter (bewusste-zwei wie thin-alias), keine doppelte Formatierungs-Logik mehr.

**Verhalten (verifiziert):** `maximumFractionDigits:2` zeigt KEINE Trailing-Nullen → ganze Credits bleiben „10.000" (unverändert), nur fractional zeigt „…,27". → die meisten Caller/Tests visuell unverändert; nur fractional-Salden werden korrekt (vorher gerundet).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/services/wallet.ts` | EDIT | formatScout → delegiert an fmtScout |
| `src/lib/services/__tests__/wallet.test.ts` | EDIT | fractional-Assertion (50 cents) auf „0,5" |
| `src/lib/services/__tests__/wallet-v2.test.ts` | EDIT | 50→„0,5", 49→„0,49" (exakter Cent-Anteil) |

## 4. Code-Reading-Liste

| Quelle | Status |
|--------|--------|
| `utils.ts:6` fmtScout (kanonisch) | **ERLEDIGT** (maximumFractionDigits:2, Credits-Input) |
| `wallet.ts:279` formatScout (cents, 0-Dez) | **ERLEDIGT** |
| wallet.test.ts + wallet-v2.test.ts formatScout-Asserts | **ERLEDIGT** (nur 50/49 ändern sich) |
| `trading.md` Geld-Einheit (D99: cents/100 = Credits) | fmtScout/centsToBsd kanonisch, Label „Credits" |
| circular-import-Check (wallet→utils) | utils = Leaf, kein Service-Import → kein Zyklus |

## 5. Pattern-References

- Disease-Register **D-23** (dup-registry, ungetrackt → geheilt).
- `trading.md` „Geld-Einheit D99" + „fmtScout()/centsToBsd für Formatierung".
- §0 Schnitt-Regel (workflow.md): 2 Wege → 1 kanonisch + dokumentierter Adapter.
- CEO-Format-Entscheid Anil 2026-06-30 (2 Dezimalstellen).

## 6. Acceptance Criteria

```
AC-01: [HAPPY] formatScout zeigt fractional Cent-Anteil exakt (2 Dez)
  VERIFY: formatScout(1170827) → "11.708,27"; formatScout(50) → "0,5"
  EXPECTED: exakter Wert, nicht gerundet
  FAIL IF: "11.708" / "1"

AC-02: [REGRESSION] ganze Credits unverändert (keine Trailing-Null)
  VERIFY: formatScout(1000000)→"10.000"; formatScout(100)→"1"; formatScout(0)→"0"; formatScout(-1000000)→"-10.000"
  EXPECTED: identisch zu vorher
  FAIL IF: "10.000,00" o.ä.

AC-03: [REGRESSION] formatScout == fmtScout(cents/100) (eine Wahrheit)
  VERIFY: formatScout(1170827) === fmtScout(11708.27)
  EXPECTED: true
  FAIL IF: divergent

AC-04: [REGRESSION] tsc + wallet-Tests grün (3 fractional-Asserts angepasst)
  VERIFY: npx tsc --noEmit; npx vitest run wallet.test.ts wallet-v2.test.ts
  EXPECTED: tsc 0; alle grün
  FAIL IF: rot

AC-05: [VISUAL, post-deploy] SideNav + TopBar zeigen denselben Saldo (2 Dez)
  VERIFY: bescout.net nach Deploy, Wallet mit fractional Saldo
  EXPECTED: beide identisch (z.B. „11.708,27")
  FAIL IF: divergent
```

## 7. Edge Cases

| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | ganze Credits | keine Dez („10.000") | maximumFractionDigits:2 (kein min) |
| 2 | fractional | „…,27" | delegiert an fmtScout |
| 3 | 0 | „0" | fmtScout(0)→"0" |
| 4 | negativ | „-10.000" | unverändert |
| 5 | 50 cents (0,5 Cr) | „0,5" (vorher „1") | exakter Wert = Fix |
| 6 | null/undefined cents | (Typ=number, kein Caller; fmtScout fängt null→'0') | Math.round schützt nicht vor null, aber Typ-Vertrag = number |

## 8. Self-Verification

```bash
npx tsc --noEmit
npx vitest run src/lib/services/__tests__/wallet.test.ts src/lib/services/__tests__/wallet-v2.test.ts
# Post-Deploy: bescout.net Wallet-Saldo SideNav vs TopBar (Playwright/visuell)
```

## 9. Open-Questions
Keine (CEO-Format-Entscheid liegt vor). Autonom: Adapter-Form.

## 10. Proof-Plan
Unit-Tests (formatScout==fmtScout-Delegation + fractional exakt + ganze unverändert) + tsc → `worklog/proofs/467-d23-formatter.txt`. AC-05 Visual = post-Deploy bescout.net (separater Verify-Schritt).

## 11. Scope-Out
- Voll-Migration aller 604 Caller auf EINEN Funktionsnamen = NICHT nötig (Delegation löst die Divergenz; formatScout bleibt als cents-Adapter). Falls später gewünscht: eigener Rename-Slice.
- `fmtCompact` (K-Suffix) unberührt (eigener Zweck).

## 12. Stage-Chain
```
SPEC → IMPACT (skipped: reine Display-Logik, Return-Type string unverändert) → BUILD (1 Service + 2 Tests) → REVIEW (self-review, S aber triviale Delegation + CEO-Format-Entscheid) → PROVE (tsc + Tests) → LOG · AC-05 Visual post-Deploy
```

## 13. Pre-Mortem

| # | Failure | Prob | Mitigation | Detection |
|---|---------|------|------------|-----------|
| 1 | ein Caller erwartete 0-Dez (z.B. enge Spalte) → Layout-Shift bei „,27" | LOW | nur fractional zeigt Dez; ganze unverändert; Anil-Entscheid 2-Dez | Post-Deploy-Visual AC-05 |
| 2 | circular import wallet↔utils | LOW | utils = Leaf | tsc |
| 3 | Test-Drift übersehen | LOW | grep formatScout-Asserts (nur 50/49) | AC-04 |

---

## Open Risiko
Ein-Zeilen-Delegation, Return-Type unverändert. Verhalten ändert sich NUR für fractional Salden (= der Fix). Restrisiko: ein Caller mit engem Layout zeigt jetzt „,27" → Post-Deploy-Visual fängt's. Logik durch Unit-Tests bewiesen.
