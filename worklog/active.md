# Active Slice

```
status: idle
slice: 423
title: Picker-Club-Identität durchgängig auf UUID (Filter-Chips + Synergie-Gruppierung) — DONE
size: S
stage: LOG (DONE)
spec: worklog/specs/423-picker-club-identity-uuid.md
impact: skipped (Display-only Gruppier-Key-Wechsel String→clubId im Picker; score_event/Money-Path nachweislich unberührt — D87-functiondef belegt Server nutzt bereits club_id)
proof: worklog/proofs/423-picker-uuid.txt
review: worklog/reviews/423-review.md (PASS, 2 INFO Scope-Out)
proof-summary: tsc 0 + 110 Tests + git diff (5 TS-Files, KEIN Migration = Money unberührt) + functiondef (score_event club_id) + grep (einheitlicher Key h.clubId ?? h.club über Chip-ID/Filter/boundLeague). Reviewer PASS.
```

## Zuletzt

- **Slice 422** (2026-06-27) — FantasyPlayerRow Club-Logo+Name aus UUID statt Freitext/Short (S, PASS, Live Bostan→Konyaspor).
- **Slice 421** (2026-06-27) — Welle 2.4 Per-Liga-GW-Max + GameweekSelector-Orphan (S, PASS).
- **Slice 420** (2026-06-27) — Welle 2.3 Heim/Auswärts + FDR über Club-UUID (S, PASS).

## Plan (423)

Folge-Smell aus 422 (Reviewer-INFO): nach 422 zeigt die **Row** den Club per UUID (Bostan→Konyaspor), aber der **Filter-Chip** (`availableClubsList`) + die **Synergie-Vorschau** (`synergyClubs`) gruppieren noch nach `h.club`-Freitext → Inkonsistenz + irreführende Synergie. `score_event` (functiondef-belegt) nutzt **club_id** → Client auf clubId ziehen = Vorschau matcht Server, rein Display. 4 Files (PlayerPicker, LineupBuilder, useLineupPanelState, PickerSortFilter). Synergie-%-Heuristik (4 % vs Server 5 %) bewusst Scope-Out (separat).

## Eskalation an CEO (Anil) — NICHT autonom
- **Admin-Gameweek-Engine-Inkonsistenz (war „Admin-38-Hardcode"):** `getFullGameweekStatus` global + 1..38 hart; `simulateGameweekFlow`→`finalizeGameweek` scored Events **club-scoped** (`WHERE club_id`), aber `importProgressiveStats`→`syncFixtureScores(gw)` synct **global pro GW-Nummer**. Nach 419/421 (fixture/liga-gebunden) inkohärent. Money-Path (`scoreEvent` mintet) → Architektur-Entscheid „GW-Lifecycle vollständig per-Liga?" = CEO.
