# Frontend Journal: Phase 3 i18n CRIT Fixes

## Gestartet: 2026-04-14
### Verstaendnis
- Was: 3 Tasks — CRIT-02 Namespace-Bug, CRIT-01 12 fehlende i18n Keys, HIGH-01 notifText locale-propagation
- Betroffene Files:
  - Task 1: `src/components/trading/SellModalCore.tsx` (1 Line)
  - Task 2: `messages/de.json` + `messages/tr.json` (12 Keys; 1 Key existiert schon `playerDetail.licensesUnit`)
  - Task 3: `src/lib/notifText.ts` (signature-change), 9 Service-Files mit 47 call-sites
- Risiken:
  - `profiles.language` (nicht `locale` wie Audit behauptet) — Column existiert, Helper getRecipientLanguage() bauen
  - DE+TR Parity: jeder Key in beiden Files, keine Namespace-Verschiebungen
  - TR Uebersetzungen: Per feedback_tr_i18n_validation.md ist Anil Pflicht-Approval, aber in Beta-Quickfix-Kontext minimal/neutral formulieren

### Korrekturen am Audit-Briefing
- `playerDetail.licensesUnit` existiert bereits (DE="Scout Cards", TR="Scout Card") — KEIN Fix noetig
- SellModalCore Zeile 91+110 Analyse: Line 91 ist nur `useTranslations('market')` Deklaration, Zeile 110 `t('invalidQty')` = Bug, Zeile 115 `tp('minPriceError')` = bereits korrekt. Audit hat 2 Bugs behauptet — es ist 1 Bug.
- `profiles.locale` existiert NICHT — es ist `profiles.language` (Type: `Profile.language`)

### Plan (Reihenfolge)
1. Task 1: SellModalCore.tsx line 110 `t('invalidQty')` → `tp('invalidQty')`
2. Task 2: 11 fehlende Keys in DE+TR JSON einfuegen (alphabetisch sortiert in jeweiligem Namespace)
3. Task 3: notifText() signature belassen (default 'de' ok), Helper `getRecipientLanguage(userId)` in notifText.ts hinzufuegen, 9 Services: locale via Helper laden und als 3. Param an notifText uebergeben
4. Verify: tsc, vitest, grep
5. Commit in main (worktree-isolation broken wie im Briefing)

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | `getRecipientLanguage(userId)` als Helper in notifText.ts | Vermeidet Duplikate in 9 Service-Files. Cache optional. |
| 2 | Service-internal notifText-Calls (fallback-helper wie `unknownFallback`, `tradeFallbackPlayer`, `researchFallbackPlayer`, `someoneFallback`, `eventFallbackName`, `bountyFallbackTitle`) belassen ohne locale-Param | Sind Eigennamen/Display-Fallbacks ohne User-Kontext — default 'de' OK |
| 3 | TR fuer 11 neue Keys: minimal/neutral, business.md-compliant (keine "kazan*", keine "gewonnen") | TR-Pflicht-Approval ist Beta-Risiko — neutral formulieren |
| 4 | Keep notifText default-locale='de' | backward-compat mit service-internal calls |

### Fortschritt
- [x] Task 1: SellModalCore.tsx
- [x] Task 2: 11 keys in DE+TR
- [x] Task 3: notifText locale propagation (9 services, 47 call-sites → nur notification-recipient-calls)
