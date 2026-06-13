# CTO Review: Slice 307 — last-5-Scores Unification auf Kanon-RPC (S7 #4/#6)

**Verdict: PASS** · reviewer-Agent (cold-context) · time-spent: ~14 min · 2026-06-14

## Spec-Coverage
- [x] **AC-1** dead refs (getBatchFormScores/useBatchFormScores/scoring.batchForm) → 0 live (nur Doku-Kommentare)
- [x] **AC-2** alle 3 Picker-Consumer beziehen FormBars aus `useRecentScores()`
- [x] **AC-3** Mapper `{score:s??0, status:s!=null?'played':'not_in_squad'}`, DNP→dashed
- [x] **AC-4** tsc clean + 375/375 Domain-Tests (PROVE)
- [x] getBatchFormScores + useBatchFormScores + Import + qk.scoring.batchForm gelöscht

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NIT | 3 neue + 4 Bestand-Mapper | `{score,status}`-Mapper jetzt 7× identisch. Bewusst NICHT als shared Helper extrahiert (Spec §9/§11, minimaler Blast-Radius). | Backlog-Hygiene (`mapScoresToFormEntries`-Helper) — NICHT in 307. |
| 2 | INFO | managerData `useRecentScores` | `enabled`-Gate-Verlust real (RPC feuert auf Lineup-Page-Mount). Spec §2 dokumentiert+akzeptiert (shared 5min-cache, 1 Round-Trip, identische Kanon-Quelle). | Keine Aktion. |

## Detail-Checks (alle grün)
- **Mapper-Shape vs Prop-Type:** Output `'played'|'not_in_squad'` ist assignbares Subset von `FantasyPlayerRow.formEntries`-Union (`'played'|'bench'|'not_in_squad'`) → typsicher. `gameweek` korrekt weggelassen (FormBars ohne showTooltip).
- **Konsistenz mit 4 Bestand-Copies:** byte-identisch zu BestandPlayerRow/TransferListSection/PlayerIPOCard; KaderPlayerRow hat zusätzlich gameweek (Tooltip aktiv) — erwartete Asymmetrie.
- **useCallback-deps:** useLineupPanelState listet `formScoresMap` korrekt; PlayerPicker/LineupBuilder plain function (keine deps nötig).
- **Verwaiste Imports/Vars:** kein dangling playerIds; useMemo weiter genutzt; FIVE_MIN von useNextFixtures genutzt; qk.scoring behält gwScores+matchTimeline (kein leerer Namespace).
- **Dead-Code:** 0 live getBatchFormScores-Refs.
- **errors-frontend.md „qk ohne Konsument" (267):** invertiert befolgt — Key mit letztem Konsumenten entfernt.
- **errors-db.md 270/274:** Migration eliminiert Global-`limit(n*5)`-Bug aus Picker; DNP=dashed = Slice-274-Semantik.

## Positive
- Schwächeren Pfad gelöscht (nicht falschen behalten); Picker erbt Slice-270/274-Korrekturen gratis.
- Delete-Disziplin alle 4 Achsen (Service+Hook+qk+Consumer) mit Doku-Breadcrumbs (Slice-305-Pattern für kleinere Variante).
- Behavioral-Gewinn (DNP dashed) explizit als gewollt markiert.

## Learnings
- Kein neuer Bug → kein common-errors-Eintrag.
- Pattern-Kandidat (optional, erst bei tatsächlicher DRY-Hygiene): „Inline-Mapper-Drift bei N-fach-Kopien" — 7× duplizierter FormEntry-Mapper.

## Summary
Sauberer, vollständig dead-code-freier Refactor, korrekte Mapper-Shape, konsistent zu Bestand-Copies, keine verwaisten Imports/Keys. Einziger Punkt = bewusst aufgeschobene DRY-Hygiene (NIT). PASS.
