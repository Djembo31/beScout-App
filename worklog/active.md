# Active Slice

```
status: idle
slice: 401
title: e2e-Durchsetzungs-Audit — Befund gesichert + 400-Rest + Tracker-Stale-Heal — DONE
size: XS (Ops/Doc-Spur — 1 Zeile toter Code + Doku, kein Money/Security/User-facing)
stage: LOG (DONE)
spec: inline (siehe unten)
impact: inline (kein Consumer-Drift — toter Display-Map-Key + Doc-Files)
proof: worklog/proofs/401-cleanup.txt (tsc EXIT 0 + grep creator weg)
review: self-review (Ops/Doc, kein Money/Security)
```

## Inline-Spec (Ops/Doc-Spur)

**Problem:** Lückenloser e2e-Durchsetzungs-Check (4 parallele Verifikations-Agents, alle Slices 329–400 gegen Live-DB+Code) deckte auf:
1. **Echter Code-Drift:** Slice 400 „restlos über 11 Flächen entfernt" war 1 Fläche zu kurz — `AdminEventFeesSection.tsx:20` hält noch den toten `creator`-Key in einer `Record<string,…>`-TYPE_META-Map (tsc-unsichtbar, DB hat keinen creator-Eintrag → nie gerendert).
2. **Stale Tracker-Fakten:** `s7-phase3-remaining.md` sagt `referral_reward` „ohne RPC" (FALSCH — `reward_referral` existiert + feuert) + listet Research als Dormant (lebt: 3 Rows, gerendert); `reconciled-through-slice: 354` bei HEAD 400.
3. **Offene Punkte aus dem Check** sind in keinem Epic/Tracker festgehalten → drohen verloren zu gehen.

**Plan (BUILD):**
- A. Audit-Befund als bleibende Quelle: `worklog/notes/401-e2e-enforcement-audit.md` (4 Cluster-Summen + klassifizierte offene Punkte).
- B. Code-Fix: `AdminEventFeesSection.tsx:20` creator-Zeile löschen (schließt 400-„restlos").
- C. Tracker-Stale-Heal: `s7-phase3-remaining.md` (referral_reward + Research korrigieren, reconciled-through→401, Block-2/3-Befunde mit Evidenz präzisieren).
- D. Offene Punkte in die Epics: `358-platform-treasury-epic.md` (RAUS-nie-real-gelaufen 376/377/378) + `event-creator-liga-epic.md` (E-7-Rest) + `MASTERPLAN.md` + `TODO.md`.

**ACs:** (1) `grep creator src/app/(app)/bescout-admin/AdminEventFeesSection.tsx` = 0; (2) tsc clean; (3) alle offenen Check-Punkte in mind. 1 Tracker mit Evidenz; (4) Stale-Fakten korrigiert.

**Proof:** `worklog/proofs/401-cleanup.txt`.

## Zuletzt
- **Slice 401** (2026-06-26) — e2e-Audit-Befund + 400-Rest + Tracker-Heal, IN ARBEIT.
- **Slice 400** (2026-06-26) — E-7 creator-Drift-Cleanup, DONE (Reviewer PASS).
- **Slice 399** (2026-06-26) — E-4b Teil 2 User-Events fertig, DONE + live (`ea27cfe3`).
