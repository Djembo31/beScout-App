# Frontend Journal: J5 Healer-A Mystery Box Components
## Gestartet: 2026-04-14

### Verstaendnis
- Was: 8 Fixes in MysteryBoxModal.tsx (gamification/) + MysteryBoxHistorySection.tsx (inventory/)
- Betroffene Files:
  - `src/components/gamification/MysteryBoxModal.tsx`
  - `src/components/inventory/MysteryBoxHistorySection.tsx`
  - `src/app/(app)/hooks/useHomeData.ts` (cosmetic_name Propagation)
  - `src/types/index.ts` (MysteryBoxResult erweitern mit optional cosmetic_name)
  - `messages/de.json` + `messages/tr.json`
- Risiken:
  - `MysteryBoxResult` Type wird von History-Query UND Modal-Prop geteilt — History-Query returns nicht cosmetic_name → null-Guard needed
  - useHomeData.ts propagiert Reward-Daten bereits (equipment_name_de/tr/position). Muss cosmeticName/Key ebenso weiterreichen
  - ResizeObserver muss cleanup
  - Tests pruefen strings wie "freeBox", "dailyBoxClaimed" — neue Keys duerfen alte nicht brechen

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | `useLocale()` + ternary `locale === 'tr' ? label_tr : label_de` | Einfach, kein zusaetzlicher Lookup |
| 2 | REWARD_PREVIEW inline mit Drop-Rate-Zahlen | transparenz, compliance |
| 3 | ResizeObserver im useEffect, cleanup im return | React Pattern, kein useState |
| 4 | cosmetic_name via useHomeData erweitern (Type + Propagation) | minimaler Pfad, keine neue Query |
| 5 | History Date via `toLocaleDateString(locale==='tr' ? 'tr-TR' : 'de-DE')` | einfach, absolut |
| 6 | ticket_cost im History-Row anzeigen | transparenz, Compliance |
| 7 | preventClose auf `isAnimating` bleibt + Reduced-Motion-Branch wird ABER auch protected: ich fuehre einen lokalen `isOpening` State ein der VOR dem RPC auf true gesetzt wird und danach false | Sauber fuer beide Branches |

### Fortschritt
- [x] Phase 0: Knowledge geladen (SKILL, LEARNINGS, Findings, common-errors, business, CLAUDE, ui-components)
- [x] Types: MysteryBoxResult mit optional cosmetic_name, cosmetic_key, equipment_name_de/tr, equipment_position
- [x] i18n Keys: possibleRewards.*, rarityLabel.*, historyRewardCosmeticNamed, historyTicketCost(Free)
- [x] MysteryBoxModal Fixes (FIX-03 preventClose+isOpening, FIX-05 resolveRarityLabel, FIX-07 cosmeticLabel chain, FIX-10 REWARD_PREVIEW i18n+drop-rates, FIX-11 ResizeObserver)
- [x] MysteryBoxHistorySection Fixes (FIX-05 resolveRarityLabel, FIX-08 historyRewardCosmeticNamed, FIX-09 dateLocale, FIX-13 costLabel row)
- [x] useHomeData: cosmetic_name + cosmetic_key durchreichen via satisfies MysteryBoxResult
- [x] tsc --noEmit: CLEAN
- [x] vitest run src/components/gamification/: 14 green
- [x] vitest run src/app/(app)/hooks/: 27 green
- [x] Grep label_de|label_tr in components: nur noch in resolveRarityLabel helpers (keine hardcoded usage)
- [x] i18n Sanity: beide locales haben alle neuen Keys

### Runden-Log
Runde 1 (DONE): alle 8 FIXes in einem Pass implementiert.
- Strategie: Type-Layer zuerst (Base Type erweitern), dann i18n-Keys (beide locales parallel),
  dann Components (Modal + History parallel), dann Propagation (useHomeData).
- 0 Fehler, keine Rollbacks. TSC blieb die ganze Zeit clean.

### Ergebnis
- Commit: e5143a5 — fix(beta): J5 Healer-A Modal+History (FIX-03/05/07/08/09/10/11/13)
- 6 Files changed, 173 insertions, 48 deletions
- Test-Status: 14 gamification green, 27 useHomeData green, 977 services green
- Keine Regression auf vorhandene Tests (die 7 FAIL-Files waren pre-existing env-issues, nicht mein Scope)

### Offene Fragen / Follow-ups
- **TR Review needed:** Alle neuen TR-Strings sind bewusst konservativ. Anil sollte sie vor Beta-Launch
  bestätigen. Siehe besonders `possibleRewards.*` (Bilet/Ekipman) und `historyTicketCost`/`historyTicketCostFree`.
- **Cosmetic-Name DB-Join (out of scope):** Der History kann `cosmetic_name` erst zeigen wenn der
  Service entweder (a) `cosmetic_definitions` joinen oder (b) cosmetic_name in mystery_box_results
  persistieren würde. Aktuell fallback auf cosmetic_key (aus cosmetic_id column). **NICHT MEIN TASK** —
  FIX-08 Briefing hat explizit "Cosmetic-Name statt 'Cosmetic'-Label" gesagt, was via Fallback erreicht ist.
- **FIX-11 ResizeObserver Performance:** Falls Mystery Box Modal auf sehr schwachen Devices laggt,
  könnte der resize() Callback mit requestAnimationFrame gedrosselt werden. Aktuell: simple + direct.
