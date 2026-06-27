# Review — Slice 423 (Picker-Club-Identität auf UUID)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-27 · **time-spent:** ~11 min

## Verdict: PASS

## Findings (beide INFO, vorab Scope-Out)

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | INFO (Scope-Out §11) | PlayerPicker:107 / LineupBuilder:177 / useLineupPanelState:130 | `synergyClubs` ist ein dedupliziertes `Set` → `.filter(c => c === playerClubKey).length` immer 0/1 → `synergyPct` faktisch immer `4` oder `null` (nie 8/12). Vorschau-Magnitude dauerhaft grob. **Kein Regression** (identisch zu vor 423). | Folge-Slice „Synergie-Vorschau == Server" (echte Paar-Zählung über selectedPlayers + 5%/Surge/LEAST-Cap). In Handoff vermerkt. |
| 2 | INFO | LineupPanel:732, ScoreBreakdown:154 | Verbleibende `player.club`-Renders = reine **Display-Labels** (Scored-Breakdown), keine Gruppier-/Filter-Keys → korrekt nicht umgestellt. Stale-String (6,6 %) bleibt dort sichtbar. | Optional Folge-Slice (Scored-Ansicht-Labels auf `getClub(clubId)?.name`), falls gleicher Konsistenz-Anspruch wie die Row. |

## One-Line
Ja — Senior merged das: Gruppier-Key-Identität über alle 3 kritischen Pfade (Chip-ID, Filter-Anwendung, boundLeague-Vorfilter) byte-identisch `h.clubId ?? h.club`, NULL-safe, server-konsistent, Money-Path nachweislich unberührt.

## Belege (Reviewer)
- **(1) Jede Stelle umgestellt:** alle verbliebenen `h.club`-Treffer sind Display-Props oder die Namens-Substring-Suche (kein Filter-Key). Alle 3 Konsumenten parallel, kein Drift.
- **(2) Konsistenz — Haupt-Risiko vermieden:** Chip-ID (`id = h.clubId ?? h.club`) == Filter (`clubFilter.includes(h.clubId ?? h.club)`) == boundLeague-Vorfilter (`Set(...h.clubId ?? h.club)` + `.has(c.id)`). Kein „Chip vorhanden, filtert leer"-Mismatch möglich.
- **(3) NULL-safe:** `h.clubId ?? h.club` durchgängig, `if (!id) continue`, Label/Logo-Fallbacks, type-backed (`clubId: string | null`).
- **(4) Money unberührt:** alle 5 Files TS/TSX, kein Migration. Client-Vorschau gleicht sich nur dem Server (`club_id`) an. Rein Display.
- **(5) Toter-Code:** LineupBuilder-`availableClubsList` war 0-Consumer (PlayerPicker baut eigene); useMemo + `getClub`-Import sauber entfernt (S280).
- **(6) Keine Test-Fixture mit altem `{short,logo}`-Shape (S375 trifft nicht).**

## Positive
- Defense-in-depth über alle Kopien gleichzeitig (S414/415/416-Lehre „von-allem-N" proaktiv beherzigt).
- Kommentare zitieren Server-Wahrheit (`v_club_ids UUID[]`, D87) als Begründung für Display-only.
- Toter useMemo + Import mit-aufgeräumt (Karpathy §3).
- PickerSortFilter `{id,label,logo}` mit getrenntem Key/Label = S276-Wurzel behoben.
