# Slice 144g — Contract-End NULL on missing TM-data (S)

**Datum:** 2026-04-22
**Groesse:** S (1-Zeile Code-Change + Script-Rerun + Reviewer-Pflicht)
**CEO-Scope:** nein — Data-Hygiene, keine Money/Trading

## Ziel

Beheben des semantischen Mismatch aus Slice 144f: Players mit `mv_source='transfermarkt_verified'` aber historisch-veraltetem `contract_end` (2022-2023), weil TM aktuell kein "Vertrag bis"-Feld zeigt.

Beispiel: Lynen, Pieper, Stark (Werder Bremen) — TM-Profile haben 0 "Vertrag bis" Occurrences, Parser returnt null, Script belässt (Slice 082 Logic) old DB-Value. UI zeigt falsches Contract-End.

## Root-Cause (Debug-Evidence)

`tmp/144g-contract-debug.ts` live-Test:
- Mio Backhaus (control): 2 "Vertrag bis" Occurrences → parser OK → 2028-06-30
- Lynen/Pieper/Stark: 0 "Vertrag bis" Occurrences → parser returnt null
- Script (Line 271): `if (contract !== null) updates.contract_end = contract;` → no-op bei null → alter historical-Wert bleibt

## Betroffene Files

- `scripts/tm-rescrape-stale.ts` Line 271 — `contract_end` update-Policy
- Post-Rerun: 3 Players haben `contract_end=NULL` (semantisch ehrlich)

## Acceptance Criteria

1. Code-Change: `updates.contract_end = contract` (always write, auch null)
2. Re-Run Bundesliga rescrape (nur die 3 WER-IDs kommen in Frage, Rest ist schon verified)
3. Post-Run: `contract_end IS NULL` für Lynen (338668), Pieper (334221), Stark (162434)
4. Keine Regression: 6 frisch-updated WER-Contracts bleiben (Backhaus, Deman, etc. mit 2026-2029)
5. Reviewer-Agent dispatched (Cold-Context), Review-File exists
6. tsc clean (kein Type-Change, aber defensive)

## Proof-Plan

- `worklog/proofs/144g-debug.txt` — debug-script output (0 vs 2 "Vertrag bis")
- `worklog/proofs/144g-verify.txt` — DB Pre/Post, 3 WER contract_end: 2022-2023 → NULL

## Scope-Out

- Andere Players mit stale historical-contract in anderen Ligen — erst nach 144g läuft
- Parser-Change (parseContractEnd) — Parser ist korrekt, Policy-Change im Script war die Fix-Ebene
- UI-Handling "contract_end null" — service `calcContractMonths` returnt bereits 0, UI existiert

## Risk-Mitigation

- 1-Zeile Change, kein Data-Destroy (null ist valid DB-State, FK-frei)
- Re-run scopet BL → 48 Players werden nochmal gescraped, 6 haben schon frische contracts (no-op), 3 neu auf NULL
- Beta-Freeze → kein Trading-Risk
