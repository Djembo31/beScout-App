# Active Slice

```
status: active
slice: 398
title: F1-Quickfix — fehlende fantasy.bench*-i18n-Keys (Roh-Key-Leak im Lineup-Builder)
size: XS
stage: PROVE
spec: inline (XS, S198-Muster — 9 fehlende Keys × DE+TR)
impact: skipped (reine i18n-Addition, 0 Logik, 0 Consumer-Drift)
proof: worklog/proofs/398-bench-i18n.txt
review: self-review (XS, S198 i18n-Pattern-Wiederholung, kein Money/Security)
```

## Inline-Spec (XS)

**Problem (Slice 397 Live-Fund F1):** `src/features/fantasy/components/lineup/BenchRow.tsx` nutzt 9 `fantasy.bench*`-Keys, die in KEINER Sprachdatei existieren → 95 MISSING_MESSAGE-Console-Errors + **Roh-Key-Leak in sichtbarer UI** (Button-/Label-Text „fantasy.benchGkLabel"). Pre-existing seit Feat 195d, trifft JEDES Event mit Lineup-Bench (global, nicht nur User-Events).

**Keys (mit Param):** `benchTitle`, `benchSubTitle`, `benchGkLabel`, `benchOutfieldLabel`{n}, `benchSubOrderLabel`{order}, `benchRemoveSlot`{label}, `benchEmptySlot`{label}, `benchMoveUp`, `benchMoveDown`.

**ACs:** (1) alle 9 Keys in de.json+tr.json fantasy-Namespace · (2) Param-Platzhalter korrekt (`{n}`/`{order}`/`{label}`) · (3) Live: EventDetail öffnen → 0 bench-MISSING_MESSAGE, kein Roh-Key im UI · (4) Wording compliance-neutral (Fantasy-Lineup-Begriffe).

**Proof:** Live-Re-Open des E2E-Events `7052f7d7…` gegen bescout.net → Console 0 bench-Errors.

## Zuletzt
- **Slice 397** (2026-06-26) — E-4b Teil 1 User-Events Builder verkabelt, DONE + live (`21523534`/`10d7cda3`).
