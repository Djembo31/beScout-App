# Frontend Journal: J6+J7+J8 Round 2 Frontend

## Gestartet: 2026-04-14

### Verstaendnis
- Was: 4 Frontend-Tasks in EINEM Commit (main):
  1. AR-56 J7: MissionDisclaimer Component + Integration /missions + messages
  2. AR-54 J8: Orderbuch→Angebots-Tiefe Glossar Sweep (keys bereits in de/tr vorhanden — aber aria-label inline defaultMessage in TransferListSection hat noch "Orderbuch")
  3. AR-56 J8: SellModal Fee-Breakdown (3.5% + 1.5% + 1% = 6%)
  4. J7 locale-aware title_tr in missions service
- Betroffene Files:
  - NEW `src/components/legal/MissionDisclaimer.tsx`
  - EDIT `src/app/(app)/missions/page.tsx` (Disclaimer Integration)
  - EDIT `src/components/player/detail/SellModal.tsx` (Fee-Breakdown)
  - EDIT `src/features/market/components/marktplatz/TransferListSection.tsx` (Orderbuch defaultMessage)
  - EDIT `src/lib/services/missions.ts` (locale support)
  - EDIT `src/types/index.ts` (DbMissionDefinition: title_tr, description_tr nullable)
  - EDIT `messages/de.json` + `messages/tr.json` (MissionDisclaimer keys)
- Risiken (aus Skill):
  - TR-Strings muss Anil absegnen — aber als Template-Orientation MysteryBoxDisclaimer (already approved)
  - Glossar keys: bereits in de/tr.json = "Angebots-Tiefe" / "Teklif Derinliği" => nur noch aria-label inline defaultMessage fixen
  - i18n Parity DE+TR
  - static Tailwind, Mobile-First
  - Hooks vor returns
  - Type propagation DbMissionDefinition → service → hook → UI

### Entscheidungen
| # | Entscheidung | Warum |
|---|---|---|
| 1 | MissionDisclaimer 1:1 Pattern von MysteryBoxDisclaimer copy | konsistent, kein Scope-Creep |
| 2 | Disclaimer Integration NUR in page.tsx, NICHT MissionBanner | Banner ist kompakt, UI already crowded, Page-Level reicht |
| 3 | Locale-Handling in Service: `title_tr ?? title` via optional useLocale() Hook im Consumer, Service kennt locale nicht | Service-Layer pure, Consumers (MissionBanner) reichen locale |
| 4 | Sell Fee-Breakdown: 1:1 i18n-Reuse der vorhandenen `feeBreakdownPlatform/pbt/club` Keys aus market-namespace | kein neuer Key noetig, DRY |

### Fortschritt
- [x] MissionDisclaimer Component erstellen
- [x] i18n Keys hinzufuegen (DE + TR)
- [x] /missions page.tsx Disclaimer Integration
- [x] Orderbuch→Angebots-Tiefe: TransferListSection defaultMessage
- [x] SellModal Fee-Breakdown
- [x] Types erweitern: DbMissionDefinition.title_tr, description_tr
- [x] missions.ts service: kein locale-switching, aber Type-Propagation. Verbrauch in MissionBanner via useLocale()
- [x] tsc + vitest
- [x] Commit

### Runden-Log
