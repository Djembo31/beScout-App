# 010 — Service-Throw-Key Coverage (INV-25, B-02 sub-class)

## Ziel

Statischer Audit: jeder von einem Service geworfene identifier-stil Error-Key (`throw new Error('someKey')`) ist entweder in `KNOWN_KEYS` (`src/lib/errorMessages.ts`) oder in einer dokumentierten `INV25_WHITELIST` als namespace-spezifisch erklaert. Drift-Klasse: Service wirft neuen Key, `mapErrorToKey` hat keinen Eintrag → Caller faellt silent auf `'generic'` zurueck → User sieht `errors.generic` statt die korrekte spezifische Meldung.

B-02 Sub-Scope: Service-Contract-Drift im Error-Kanal. Verwandte Haertung zu J1-Finding (applyClubReferral.throw ohne Consumer-Fix) und J3-Pattern (swallow→throw Refactor muss alle Consumer-Pfade durchziehen).

## Klassifizierung

- **Slice-Groesse:** S (1 Test-File, ~100 LOC)
- **Scope:** **CTO-autonom** (CI-Regression-Guard ohne Behavior-Change)
- **Referenz:** Walkthrough 05-blocker-b.md B-02; `.claude/rules/common-errors.md` "i18n-Key-Leak via Service-Errors" + "Service Contract-Change Propagation"

## Betroffene Files

| File | Rolle |
|------|-------|
| `src/lib/__tests__/error-keys-coverage.test.ts` (NEW) | INV-25 — statischer Scan via `fs.readFileSync` über `src/lib/services/*.ts` + `src/features/*/services/*.ts`, Assertion jeder thrown identifier-key ∈ KNOWN_KEYS ∪ WHITELIST |

## Acceptance Criteria

1. Test-File existiert, enthaelt expliziten Scan-Scope + KNOWN_KEYS-Import + INV25_WHITELIST + Assertion.
2. Test ist **gruen** auf HEAD. Wenn nicht: entweder fehlende Keys werden zu KNOWN_KEYS hinzugefuegt (mit Translations, CEO-Check falls neue User-Meldung) oder explizit in WHITELIST mit Begruendungs-Kommentar.
3. Aktuelle bekannte Namespace-Keys (`insufficient_wildcards`, `lineup_save_failed`) bleiben in Fantasy-Namespace (handled explicitly in `useEventActions.ts`) und werden whitelisted mit Begruendung.
4. Test erkennt `throw new Error('identifier')` Pattern: single quote, double quote, backtick, mit/ohne Whitespace. Skippt `throw new Error(varName)` und `throw new Error(error.message)`.
5. tsc clean. Test laeuft unter `vitest run`.

## Edge Cases

1. **Template-literal `throw new Error(\`${x}\`)`** → Skippt (dynamic, nicht als static key audierbar).
2. **`throw new Error(xxx.message)` oder `throw new Error(mapped)`** → Skippt (variabler Wert, nicht als key audierbar).
3. **`throw new Error('raw text with spaces')`** → Skippt (nicht identifier-style, mapErrorToKey regex-faengt).
4. **Snake_case keys** (`insufficient_wildcards`) → Gefangen wenn nicht in KNOWN_KEYS.
5. **Neue Service-Datei mit neuem Key** → Test faellt → PR-Autor muss (a) Key zu KNOWN_KEYS + Translations in messages/*.json hinzufuegen (CEO-Scope fuer user-facing Text) ODER (b) Whitelist-Entry mit Begruendung.
6. **Dynamic vs static thrown keys** → Test klassifiziert nur static (literal). Dynamic (z.B. `throw new Error(err.message)`) wird nicht eingepflegt in KNOWN_KEYS weil sie durch `mapErrorToKey`-Regex-Patterns aufgeloest werden sollen.

## Proof-Plan

- `worklog/proofs/010-inv25.txt` — Test-Output (vitest run)
- `worklog/proofs/010-diff.txt` — git diff

## Scope-Out

- **Regex-Updates in `ERROR_MAP`** — falls neue Raw-Strings hinzukommen die via Regex aufgeloest werden sollen, separater Slice.
- **CEO-Pflege der Translations** — neue `KNOWN_KEYS` benoetigen Translations. Fuer diesen Slice nur whitelisten (keine neuen User-Texte).
- **Component-level `throw` patterns** — nur Service-Files scannen, keine Consumer-Components.
- **Edge-Function/API-Route throws** — nicht im User-Facing-Error-Path, skippen.
- **Full Return-Type-Konsistenz-Audit fuer B-02** — broader work, separater Slice.

## Stages

- SPEC — dieses File
- IMPACT — inline (static test, kein Runtime-Impact)
- BUILD — 1 Test-File
- PROVE — vitest run + diff
- LOG — commit + log.md
