# Review — Slice 467 (D-23: Geld-Formatter konsolidieren)

**Reviewer:** Cold-Context-Agent · **Datum:** 2026-06-30 · **time-spent:** ~13 min

## Verdict: CONCERNS (Code PASS-Niveau; CONCERNS = LOG-Housekeeping, alle adressiert)

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW (CONCERNS) | disease-register:22/130 | D-23 stand `ungetrackt`/`🟠 offen`; Register envisionte neues `formatBalance`, Slice machte (einfacher) `fmtScout` kanonisch + `formatScout` als Adapter. Ohne Flip re-flaggt audit:dup/Register ein Phantom. | → **ERLEDIGT:** dup-registry:22 → `bewusste-zwei` (beide Symbole bleiben bewusst, Adapter-Beziehung wie D112; geheilt-statt-formatBalance notiert); §3-Tabelle:130 → ✅ geheilt S467. |
| 2 | NIT | proof | Narrative statt rohem vitest/tsc-Output. | → **ERLEDIGT:** Roh-Output angehängt (tsc exit 0; 2 files / 31 tests passed; Duration 5.41s). |
| 3 | INFO | AC-05 | Visual-Parität post-Deploy — kein „done" vor Visual (feedback_no_premature_ready). | → im Proof + Register als 🟡 offen markiert; post-Deploy bescout.net jarvis-qa. |

## One-Line
Ja — ein Senior merged die Ein-Zeilen-Delegation (saubere Wurzel-Heilung der D-23-Divergenz), besteht aber auf dem disease-register-Flip beim LOG (sonst Phantom-offen). → Flip erledigt.

## Belege (Reviewer, READ-ONLY)
1. **Delegation korrekt:** `formatScout(cents)=fmtScout(Math.round(cents)/100)`; Einheit cents→Credits sauber; `Math.round` defensiv gg. Float; kein Präzisionsverlust (Integer-cents → ≤2 Dez). Kein circular import (utils=Leaf).
2. **Bestand-Erhaltung (AC-02):** `maximumFractionDigits:2` ohne min → ganze Credits ohne Trailing-Null ("10.000"); bestätigt durch unveränderte Integer-Asserts.
3. **Test-Updates:** nur 3 fractional-Asserts (50→"0,5", 49→"0,49"); de-DE locale korrekt.
4. **Caller-Impact (~60 Call-Sites gegrept):** kein Credit-passing (alle cents: *_cents/order.price/cost_bsd[BIGINT cents]/tx.amount), kein Doppel-Format, kein Test-Bruch (AdminBountiesTab nutzt gemockten formatScout). font-mono tabular-nums → 2 Extra-Zeichen tolerierbar (AC-05 fängt enge-Spalte-Restgefahr).
5. **§0:** im Kern geheilt — EINE Formatierungs-Logik (fmtScout); formatScout = dokumentierter Adapter („ein Job pro Artefakt", bewusste-Zwei wie D112).

## Positive
- Wurzel-Heilung statt Symptom: fmtScout SSOT, formatScout ehrlicher Einheiten-Adapter (§0-Intention).
- Minimal-invasiv (1-Zeile) statt 604-File-Rename = Simplicity-First.
- Test-Diff chirurgisch (nur die 3 verhalten-relevanten Asserts).
- CEO-Format-Entscheid (2 Dez) lag vor — keine autonome Money-Display-Entscheidung.

## Learning
Bei Display-Konsolidierungs-Slices, die einen disease-register-Eintrag heilen: Register-Flip (+ ggf. Korrektur des envisionten Ziel-Namens) als explizite LOG-Checkbox führen, sonst Phantom-offen + Re-Flag.
