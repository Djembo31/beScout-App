# Frontend Journal: Slice 198 Track D — Fantasy-Rest Top-5
## Gestartet: 2026-04-25
### Verstaendnis
- Was: 5 Fantasy/Predictions-Findings schliessen (C-01 Streak, C-02 Difficulty visible, C-03 Aggregate-Hint, R-04 Tier-Promotion-CTA, F-13 Form-Trend Sparkline+Δ)
- Betroffene Files: PredictionsTab/PredictionCard, CreatePredictionModal, SelfRankCard, FantasyPlayerRow + messages/{de,tr}.json
- Risiken: Compliance (Gluecksspiel-Vokabel), i18n key-leak, no new RPC allowed

### Entscheidungen
| # | Entscheidung | Warum |
|---|---|---|
| 1 | C-01: aus existing usePredictionStats `bestStreak` + lokaler "current streak" Berechnung | RPC vorhanden + currentStreak ableitbar aus letzten resolved predictions |
| 2 | C-02: Difficulty-Slider visible — nutze 3-Sterne-Pill aus PredictionCard analog im Confirm-Step | Konsistent visual; Difficulty server-side erst nach RPC bekannt — daher mit "ungefaehr" Hinweis |
| 3 | C-03: SKIP — kein Backend-Aggregat-RPC vorhanden, "%-tippte-gleich" braucht aggregate query | Brief erlaubt SKIP wenn RPC fehlt |
| 4 | R-04: aus existing `getRang` Helper neuen `getNextRang(score)` ableiten und dann diff zum next Tier | Compliance-clean: "noch X Punkte bis ..." (kein "gewinne") |
| 5 | F-13: Mini-SVG-Sparkline aus formEntries inline + Δ via `perfL5 - perfL15` | perfL15 ist L15-avg → "perfL5 - perfL15" = current vs season Trend (Pattern aus LineupPanel:882) |

### Fortschritt
- [x] Read all relevant files
- [x] C-02: Difficulty Pill in CreatePredictionModal Confirm-Step
- [x] C-01: Streak Badge in PredictionsTab Header
- [x] R-04: Tier-Promotion-CTA in SelfRankCard
- [x] F-13: Mini-Sparkline + Δ in FantasyPlayerRow
- [x] C-03: SKIP dokumentiert
- [x] tsc clean
- [x] vitest smoke

### Runden-Log

