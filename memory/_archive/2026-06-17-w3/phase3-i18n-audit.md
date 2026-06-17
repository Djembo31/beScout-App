# Phase 3 — i18n Coverage Audit (READ-ONLY)

**Datum:** 2026-04-14
**Scope:** Operation Beta Ready Phase 3 — i18n-Coverage-Sweep
**Methodik:** Statisches Greppen + JSON Cross-Diff + AST-leicht Key-Resolver-Check
**Locales:** DE (default) + TR (next-intl v4, Cookie `bescout-locale`)

---

## Executive Summary

| Kategorie | Befund |
|-----------|--------|
| Gesamt DE Keys | 4677 |
| Gesamt TR Keys | 4677 |
| Key-Parität DE↔TR | 100% (0 missing in either direction) |
| **CRITICAL Issues** | **13** (12 missing keys + 1 namespace-Fehler im Sell-Flow) |
| **HIGH Issues** | **4** (Notification-Locale-Default, Service-Error-Strings, Equipment/Mission Achievement, Compliance-Wording) |
| **MEDIUM Issues** | **5** (Hardcoded de-DE date, Achievements-Type missing tr, Fantasy-Event names, Service raw English errors, defaultMessage Glossar-Leak) |
| **LOW Issues** | **3** (Admin-only hardcoded strings, fmtScout locale-default, Currency formatting) |

---

## Section 1: Key Parity DE ↔ TR

### 🟢 VERIFIED OK
- **Total DE keys:** 4677 (60 Namespaces)
- **Total TR keys:** 4677 (60 Namespaces)
- **Missing TR (only in DE):** 0
- **Missing DE (only in TR):** 0
- **Empty TR values:** 0
- **All 56 referenced namespaces existieren in beiden Locales**

### Namespaces in Use (56 active)
`achievement, activity, admin, adminApi, adminFans, airdrop, auth, bescoutAdmin, bounty, bountyAdmin, club, clubs, common, community, compare, demo, errors, fanWishes, fantasy, feed, feedback, founding, gamification, geo, glossary, home, inventory, leagues, legal, manager, market, missions, nav, notifTemplates, notifications, offers, onboarding, pitch, player, playerDetail, predictions, profile, pwa, rankings, research, roles, scouting, search, shortcuts, spieltag, sponsor, subscription, tips, tour, transactions, welcome`

---

## Section 2: 🔴 CRITICAL — Missing Keys (will render `${ns}.${key}` placeholder to user)

next-intl v4 Default-Verhalten: Bei fehlendem Key wird `${namespace}.${key}` als Platzhalter
gerendert (Fallback nicht via `defaultMessage` — das ist nur Interpolations-Param).
→ User sieht z.B. `playerDetail.clubSale` als sichtbaren String!

### CRIT-01: 12 Keys fehlen in DE+TR (alle 12 in beiden Locales)

| Key | Datei | Wirkt auf | Default-Fallback im Code? |
|-----|-------|-----------|--------------------------|
| `legal.foundingPassDisclaimer` | `src/app/(app)/page.tsx:128` | Home Founding Pass Upsell | Nein → User sieht `legal.foundingPassDisclaimer` Text |
| `fantasy.liveUpdating` | `src/components/fantasy/event-tabs/LeaderboardPanel.tsx:223` | aria-label während Live-Update | Ja (`defaultMessage: 'Rangliste wird live aktualisiert'`) — IGNORIERT von next-intl |
| `gamification.seasonDefault` | `src/components/gamification/FanRankOverview.tsx:48` | Saison-Label-Fallback | Nein → User sieht Key |
| `gamification.noFanRankCta` | `src/components/gamification/FanRankOverview.tsx:85` | Empty-State CTA | Nein |
| `player.priceAlertDeprecated` | `src/components/player/detail/hooks/usePriceAlerts.ts:31` | Toast (deprecated handler) | Nein |
| `playerDetail.clubSale` | `src/components/player/detail/trading/IPOBuySection.tsx:43` | "Club Verkauf" Label im IPO-Bereich | Ja (defaultMessage) — IGNORIERT |
| `rankings.rewardPendingTooltip` | `src/components/rankings/MonthlyWinners.tsx:60,101` | Tooltip auf Monthly-Winners-Reward | Nein |
| `gamification.tierLabel` | `src/components/ui/TierBadge.tsx:22` | aria-label TierBadge (mit `{tier}` Param) | Nein |
| `fantasy.eventLockedError` | `src/features/fantasy/hooks/useEventActions.ts:222` | Toast nach unlockEvent-Fehler | Nein |
| `market.watchlistStaleNotice` | `src/features/market/components/marktplatz/WatchlistView.tsx:244` | Stale-Watchlist-Warnung (mit `{count}` Param) | Nein |
| `market.bestandNoFilterResults` | `src/features/market/components/portfolio/BestandView.tsx:362` | Empty-State Filter-Result | Ja (defaultMessage) — IGNORIERT |
| `playerDetail.licensesUnit` | `src/components/player/detail/trading/IPOBuySection.tsx:75,79` | "Scout Cards" Einheit | Ja (defaultMessage) — IGNORIERT |

### CRIT-02: Namespace-Mismatch in SellModalCore
**File:** `src/components/trading/SellModalCore.tsx:91,110`
**Bug:** `const t = useTranslations('market'); ... t('invalidQty')` → `market.invalidQty` existiert NICHT.
- Die korrekte Variante ist `tp('invalidQty')` mit `tp = useTranslations('playerDetail')` (Zeile 92, exists).
- Aktuell shipt fehlerhaft: User sieht "market.invalidQty" als sichtbaren Text wenn Quantity ungültig.
- Wahrscheinliche Fix-Variante: `setLocalError(tp('invalidQty'));` ODER neuen Key `market.invalidQty` anlegen.

### CRIT-03: defaultMessage als toter Fallback (138 Aufrufe in 27 Files)
- 138 Aufrufe von `t('key', { defaultMessage: 'DE-String' })` in Komponenten
- next-intl v4 nutzt `defaultMessage` NICHT als Fallback (anders als react-intl).
- Wird zwar bei `t.rich`/Format-Args interpoliert, aber bei missing key trotzdem gerendert als `${ns}.${key}`.
- 4 davon korrespondieren zu CRIT-01 Keys → User sieht Key-Strings statt deutscher Defaults.
- **Restliche 134 sind Glossar-Leak im Source** (Developer sehen "Erweiterte Filter" inline) — kein Runtime-Bug, aber Wartbarkeits-Risiko.

---

## Section 3: 🟠 HIGH — Notification & Service-Layer i18n-Lücken

### HIGH-01: Notification-Templates immer DE — 47 Aufrufe ignorieren Recipient-Locale
**Files:** `src/lib/services/{bounties,ipo,liquidation,missions,offers,posts,research,tips,trading}.ts`
**Bug:** ALLE 47 `notifText(...)` Aufrufe nutzen den Default `locale='de'` (siehe `notifText.ts:34`).
- Architektur-Hinweis im Helper selbst (J10F-01, AR-60): "long-term fix is for services to write i18n KEYS into the DB and let React resolve via `useTranslations`. This helper is a Beta-Quickfix that lets callers pass the recipient's locale (loaded from profiles.locale)."
- **Aktuelle Realität:** TR-User bekommen ALLE Notifications auf Deutsch.
- **Sample-Files:**
  - `src/lib/services/bounties.ts:323-454` — 6 notifText-Calls ohne locale
  - `src/lib/services/ipo.ts:153,154,224,225` — 4 ohne locale (newIpo, ipoPurchase)
  - `src/lib/services/missions.ts:164,165` — Mission-Reward-Notifs immer DE
  - `src/lib/services/offers.ts:187,219,268` — Offer-Notifs immer DE
  - `src/lib/services/liquidation.ts:74-79` — Liquidation-Notifs immer DE
  - `src/lib/services/posts.ts`, `tips.ts`, `research.ts`, `trading.ts` weitere
- **Fix-Pattern:** `notifText('key', params, recipientProfile.locale ?? 'de')`
- **Recipient-Locale-Source:** `profiles.locale` Spalte (existiert per AR-60)
- 🟢 **Templates selbst:** Beide Locales haben alle 52 Templates (perfekte Parität)

### HIGH-02: Service-Error raw English/German strings (16 Stellen)
**Datei `src/lib/services/bounties.ts:236-241`** (6 Strings):
```
'Reward must be at least 1 $SCOUT (100 cents)'
'Reward exceeds maximum'
'Deadline must be 1-90 days'
'Max submissions must be 1-100'
'Title is required'
'Description is required'
```
- Werden via `throw new Error(...)` propagiert → Caller sieht den Raw-String.
- mapErrorToKey() matched diese NICHT → endet bei `'generic'` ("Ein Fehler ist aufgetreten").
- User-Impact: Statt "Reward zu klein" sieht User generischen Fehler.

**Datei `src/lib/services/clubChallenges.ts:104-150`** (5 Strings):
```
'Challenge already claimed'
'Challenge not found'
'Challenge is not active'
'Failed to award fan rank points'
'Failed to record challenge claim'
```
- Gleiches Pattern. Leiten via Error-Boundary auf `errors.generic`.

**Datei `src/lib/services/club.ts:593-613`** (4 Strings):
```
'Not authenticated'
'Not authorized'
'Invalid primary color format'
'Invalid secondary color format'
```
- Sichtbar in Club-Customization Flow (Settings).

**Datei `src/lib/services/players.ts:33`**: `'Failed to fetch players'` — kritisch (Markt-Bootstrap).

**Datei `src/lib/services/trading.ts:103,184,222,283,485`** (5 Stellen):
```
'buy_player_sc returned null'
'place_sell_order returned null'
'buy_from_order returned null'
'cancel_order returned null'
'place_buy_order returned null'
```
- "Should never happen" — aber wenn doch, sieht User Backend-Internal.

**Datei `src/features/fantasy/services/events.mutations.ts`** (8+ DE/EN-Mixed):
- `'Event nicht gefunden'` (DE) auf Zeilen 269, 312, 323
- `'Übergang "X" → "Y" nicht erlaubt'` (DE) Zeile 332
- `'Felder nicht editierbar im Status "X": ...'` (DE) Zeile 278
- `'Paid tournament entry requires Phase-4 license...'` (EN) Zeile 39
- `'Max GW 38 reached'` (EN) Zeile 104
- `'No response from server'` (EN) Zeilen 404, 433, 457
- `'No events found to clone'` (EN) Zeile 126
- Admin-only Pfade, aber Fragmentierung user-facing wenn admin auf TR umstellt.

### HIGH-03: Achievement Definitions — Type fehlt `title_tr` / `description_tr`
**File:** `src/types/index.ts:1238-1251` `DbAchievementDefinition`
**Bug:** Type hat nur `title: string; description: string` — keine `_tr` Felder.
- Im Vergleich: `DbMissionDefinition` (1261-1269) hat `title_tr` + `description_tr` korrekt (AR-54 J7).
- 33 Achievements werden TR-Usern mit DE-Labels gezeigt:
  - `src/components/missions/AchievementsSection.tsx:96,120` rendert `ach.label` direkt
  - Kein Resolver wie `resolveMissionTitle()` für Achievements
- Hardcoded Fallback in `src/lib/achievements.ts:21-58` ist 100% DE
  ("Erster Deal", "Aktiver Händler", "Trading-Legende", ...)

### HIGH-04: Compliance-Wording (SPK/MASAK + Glücksspiel) noch in user-facing Strings
**Per `business.md` Kapitalmarkt-Glossar (AR-17, J3+J4):**

User-facing IPO-Begriff (verboten — solte "Erstverkauf"/"Kulüp Satışı" sein):
- `de.json` `market.ipoViewLabel` = `"IPO-Ansicht"` (statt "Erstverkauf-Ansicht")
- `tr.json` `market.ipoViewLabel` = `"IPO görünümü"` (statt "Kulüp Satışı görünümü")
- `tr.json` `market.ipoShowActive` = `"Aktif IPO'ları göster"`
- `tr.json` `market.ipoShowPlanned` = `"Planlanan IPO'ları göster"`
- `tr.json` `market.ipoShowEnded` = `"Sona eren IPO'ları göster"`

Glücksspiel-Vokabel (TR "kazan*" → soll "topla, al, elde et"):
- `tr.json` `welcome.heroSubtitle` = `"...Credits kazan."` → soll `"Credits topla"`
- `tr.json` `welcome.step3Title` = `"Credits kazan"` → `"Credits topla"`
- `tr.json` `welcome.step3Text` = `"...Credits kazan."` → `"Credits topla"`
- `tr.json` `home.welcomeSubtitle` = `"...Credits kazan..."` → `"Credits topla"`
- `tr.json` `home.introCommunityDesc` = `"...kredi kazan."` → `"kredi topla/elde et"`
- `tr.json` `community.subtitle` = `"...Credits kazan"` → `"Credits topla"`
- `tr.json` `community.hero.researchDesc` = `"Premium raporlarla Credits kazan"` → `"...topla"`
- `tr.json` `community.writeFirstReport` = `"...Credits kazan!"` → `"...topla!"`
- `tr.json` `profile.earnings` = `"Kazançlar"`, `profile.earned` = `"kazanıldı"` → `"Topladıkların"` / `"toplandı"`
- `tr.json` `profile.scoutEarned` = `"Credits kazanıldı"` → `"Credits toplandı"`
- `tr.json` `profile.creatorTotalEarned` = `"Kazanılan"` → `"Toplanan"`
- `tr.json` `club.earnedScout` = `"Kazanılan"` → `"Toplanan"`
- `tr.json` `club.featureScoutDesc` = `"Oyuncuları analiz et, kredi kazan"` → `"...kredi topla"`
- `tr.json` `gamification.scoreRoad.celebration` = `"{reward} kazanıldı!"` → `"toplandı!"`
- `tr.json` `gamification.badge.community_voiceDesc` = `"En az 20 takipçi kazan"` → `"...elde et"`
- `tr.json` `gamification.ticketsTooltip` = `"Biletleri ... kazanırsın..."` → `"toplarsın"`
- `tr.json` `gamification.noCosmeticsHint` = `"...Başarılarla kazan"` → `"...topla"`
- `tr.json` `onboarding.welcomeDesc` = `"{amount} Credits kazandın!..."` → `"...topladın!"`
- `tr.json` `playerDetail.emptyResearchDesc` = `"...Credits kazan"` → `"...topla"`
- `tr.json` `tour.balanceDescDesktop` = `"...Credits kazan."` → `"...topla."`
- `tr.json` `tour.balanceDescMobile` = `"...Credits kazan."` → `"...topla."`
- `tr.json` `inventory.cosmeticsEmptyDesc` = `"...kozmetik kazan."` → `"...topla."`

DE-Side (Gluecksspiel/SPK):
- `de.json` `profile.wonLabel` = `"Gewonnen"` (Partizip) → `"Erhalten"` per business.md
- `de.json` `gamification.badge.community_voiceDesc` = `"Mindestens 20 Follower gewinnen"` → `"...erhalten"`

**Sample SPK/Anteil:**
- `de.json` `profile.creatorFundShare` = `"Anteil"` → User-facing problematisch → `"Beteiligung am Pool"` (oder neutral "Anteil am Pool")
- `de.json` `playerDetail.floatShare` = `"Anteil am Float"` — Trading-Disclaimer-Kontext, akzeptabel mit Disclaimer

---

## Section 4: 🟡 MEDIUM — Hardcoded DE in Code

### MED-01: Hardcoded `'de-DE'` in user-facing Date-Formatting (10 Stellen)
**Wird TR-Usern als DE-Datum rendern:**
- `src/components/home/LastGameweekWidget.tsx:60`
  → `d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })`
- `src/components/player/detail/LiquidationAlert.tsx:35`
  → Liquidations-Datum auf Player-Detail
- `src/components/player/PlayerRow.tsx:80`
  → Vertragslauf "month + year"
- `src/components/profile/AnalystTab.tsx:416,418`
  → Payout-Period im Analyst Tab
- `src/components/gamification/ScoreRoadCard.tsx:184`
  → Score-Road claimed-at via `tsr('claimedAt', { date: ... })`
- `src/components/profile/TimelineTab.tsx:18` + `src/components/transactions/TransactionsPageContent.tsx:21`
  → CR-Konversion `(cents/100).toLocaleString('de-DE')` — bei TR funktioniert das (TR uses ".") ABER inkonsistent
- `src/components/ui/RangBadge.tsx:149`
  → Score-Display

**Per Pattern aus LeaderboardPanel/LineupPanel/TradingTab korrekt:**
`const dateLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';` + ` ... .toLocaleDateString(dateLocale, ...)`

### MED-02: Hardcoded `'de-DE'` in `formatScout` (wallet.ts) und `fmtScout` (utils.ts)
- `src/lib/services/wallet.ts:147` `formatScout()` → `bsd.toLocaleString('de-DE')`
- `src/lib/utils.ts:7` `fmtScout()` → `value.toLocaleString('de-DE')`
- `src/lib/utils.ts:13` `fmtCompact()` → `value.toLocaleString('de-DE')`

**Risk:** Niedrig — DE und TR nutzen beide `.` als Tausender-Separator, also visuell identisch.
**Risk konkret:** Float-Werte mit Dezimalen — DE `,` vs TR `,` — ebenfalls identisch.
→ Visuell unkritisch, aber Code-Hygiene empfiehlt locale-aware.

### MED-03: Fantasy-Event Names sind DE-only
**File:** `supabase/migrations/20260331_baseline_fantasy.sql:39-68`
**Schema:** `events.name TEXT NOT NULL` — KEINE `name_tr` Spalte.
- Admin-erstellte Events ("Spieltag 14 Champions League") werden allen Usern in genau dem eingegebenen Wording angezeigt.
- 5 Render-Sites verwenden `event.name` direkt:
  - `src/components/fantasy/events/EventCardView.tsx:92`
  - `src/components/fantasy/events/EventCompactRow.tsx:39`
  - `src/components/fantasy/events/EventSpotlight.tsx:62`
  - `src/components/fantasy/MitmachenTab.tsx:119`
  - `src/components/fantasy/EventDetailModal.tsx:228,342,386`
  - `src/features/fantasy/components/event-detail/JoinConfirmDialog.tsx:50`
  - `src/features/fantasy/hooks/useEventActions.ts:126,260`
  - `src/features/manager/components/aufstellen/EventSelector.tsx:52`
- TR-User sehen DE-Event-Namen (sofern Admin DE benutzt).
- **Recommended Fix:** Migration für `events.name_tr TEXT` + Resolver-Pattern (analog `resolveMissionTitle`).

### MED-04: Hardcoded Inline DE in SideNav (1 Stelle)
- `src/components/layout/SideNav.tsx:283` → `<span>Wunsch einreichen</span>`
- Sollte `t('wishButton')` o.ä. — der Key `nav.wishButton` existiert sogar (`"Dilek gönder"` in TR).
- Zeile direkt drüber nutzt schon `t(...)` — Drop-in.

### MED-05: defaultMessage als Glossar-Leak im Source (134 Stellen, kein Runtime-Bug)
- `t('key', { defaultMessage: 'Erweiterte Filter' })` — wird nicht zur Runtime gebraucht (Key existiert), aber:
- Glossar-Compliance-Risiko: Wenn business.md Wording ändert (siehe IPO→Erstverkauf), kann der defaultMessage stale werden.
- Empfehlung: Im Polish-Sweep alle defaultMessage-Strings auf Glossar abgleichen ODER entfernen.
- Liste der 27 Files im Quell-Output. Kein User-Impact aktuell.

---

## Section 5: 🟢 LOW — Polish & Admin-Only

### LOW-01: Admin-Only Hardcoded DE Strings (15+ Stellen)
- `src/app/(app)/bescout-admin/AdminEconomyTab.tsx` — Tab-Header, Toasts ("Gespeichert", "Mission erstellt", "Key und Titel sind Pflichtfelder"), Form-Labels ("Titel", "Beschreibung", "Icon", "Zielwert", "Kategorie", "Reward", "Status", "Ziel")
- `src/app/(app)/bescout-admin/AdminFanWishesTab.tsx` — Toast "Status aktualisiert"
- `src/app/(app)/bescout-admin/AdminLigaTab.tsx:51,89` — `'Unerwarteter Fehler'`
- `src/components/admin/EventBulkBar.tsx:42,64` — aria-label "Bulk-Aktion waehlen", "Auswahl aufheben"
- `src/components/admin/EventFilterBar.tsx:41,54,67,80` — 4× aria-label "X filtern"
- `src/components/admin/EventSortBar.tsx:18` — `<span>Sortierung:</span>`
- `src/components/admin/CreateClubModal.tsx:129` — placeholder "sakaryaspor"
- `src/app/(app)/founding/page.tsx:128` — Toast "Ein Fehler ist aufgetreten"

**Risk:** Niedrig — Admin/Club-Admin sind mehrheitlich DE-Native. Nicht TR-User-facing.
**Empfehlung:** Post-Beta i18n-aware Admin-Wave.

### LOW-02: Currency-Formatter "CR" hardcoded
- `src/components/transactions/TransactionsPageContent.tsx:19-21,403`
- `src/components/profile/TimelineTab.tsx:16-18`
- "CR" als Abbreviation (Credits) — brand-neutral, kein i18n nötig.
- 🟢 OK — Markennamen-äquivalent.

### LOW-03: Hardcoded Aria-Labels in Player-Detail
- `src/components/player/detail/PlayerHero.tsx:133` — `aria-label="Close menu"`
- `src/components/player/FormBars.tsx:31` — `aria-label="Form last 5"`
- `src/components/profile/AnalystTab.tsx:51-53` — Bullish/Bearish/Neutral als aria
- `src/app/blocked/page.tsx:9-10` — englischer aria-label "Region restricted"

**Risk:** Niedrig — Screenreader-User mit englischem Setting kommen klar.

---

## Section 6: 🟢 VERIFIED OK — Funktioniert wie erwartet

### OK-01: notifTemplates Coverage (Perfect Parity)
- 52 Templates DE = 52 Templates TR (alle gleichen Keys)
- 39 in Code referenziert, 13 ungenutzt (defined but unused — wahrscheinlich Backend-RPC-Reserve)
- Keine `notifText('key')` ohne entsprechenden Template-Key

### OK-02: Equipment + Mission Resolver Pattern
- `src/components/gamification/equipmentNames.ts` — `resolveEquipmentName(def, locale)` mit DE-Fallback
- `src/lib/services/missions.ts:16-31` — `resolveMissionTitle(def, locale)` + `resolveMissionDescription`
- 9+ Call-Sites korrekt verkabelt (J11F-01 FIX-01 + AR-54 J7)
- DB-Spalten `name_tr` / `description_tr` / `title_tr` mit DE-Fallback

### OK-03: errors-Namespace 100% Coverage
- `errors` Namespace hat 63 Keys DE = 63 Keys TR
- `mapErrorToKey()` KNOWN_KEYS Set (62 Keys) = 100% in `errors` Namespace abgedeckt
- Keine "raw key shows to user" durch errors-Pfad

### OK-04: TR-Translation Vollständigkeit
- 0 leere TR-Werte
- 0 echte deutsche Wörter in TR (4 false-positive Suffix-Treffer auf "den")
- 87 identical DE/TR — alles legitim (Eigennamen wie "Sakaryaspor", "TFF 1.Lig", "Premium", "Floor", "Score", "Form" — Brand/Engl. Lehnwörter)

### OK-05: ConfirmDialog statt native alert/confirm
- `grep -rEn "window.alert|window.confirm"` → 0 Treffer in Production-Code
- ConfirmDialog Component (J4 Healer A) konsequent ausgerollt

### OK-06: Date-Formatting in mehrheitlicher Files locale-aware
- Pattern `locale === 'tr' ? 'tr-TR' : 'de-DE'` korrekt in:
  - LeaderboardPanel, LineupPanel, OverviewPanel
  - PriceChart, TradingTab
  - SynergyPreview, MonthlyWinners
  - MysteryBoxHistorySection (über `dateLocale`-Variable)
  - Util `formatTimeAgo` (Param)
  - `lib/activityHelpers.ts:110` + `lib/utils.ts:55` korrekt locale-aware

### OK-07: Compliance — Orderbuch / Trader bereits ersetzt in user-facing
- `playerDetail.orderbookTitle` = `"Angebots-Tiefe"` / `"Teklif Derinliği"` ✅
- Code-intern `OrderbookSummary.tsx`/`OrderbookDepth.tsx` Filenames bleiben (Code-intern OK)
- Keine user-facing "Trader" als Rolle

---

## Section 7: Recommended Fix-Strategy (Healer-Split)

### WAVE 1 — CRITICAL Hot-Fix (Healer A, ~2h)
**Ziel:** Sichtbare Key-Strings im Production verschwinden lassen.
1. CRIT-02 SellModalCore: `t('invalidQty')` → `tp('invalidQty')` (1-Zeilen-Fix) ODER neuen Key `market.invalidQty` anlegen + DE+TR Translation
2. CRIT-01: 12 fehlende Keys in DE+TR `messages/{de,tr}.json` ergänzen — Healer braucht für jeden Key:
   - DE-Wert (defaultMessage übernehmen wo vorhanden, sonst fragen)
   - TR-Übersetzung (Anil approval per `feedback_tr_i18n_validation.md`)
3. Verify: Empty-States + Live-Polling + Onboarding-Pfade screenshoten
**Verify:** `grep -rn 'defaultMessage' src/` neu auf Treffer in CRIT-01-Liste — sollte alle Keys jetzt finden.

### WAVE 2 — HIGH Priority (Healer B, ~3h)
**Ziel:** TR-User bekommen TR-Notifications + i18n-konforme Service-Errors.
1. HIGH-01 — Notification Locale: 47 `notifText(...)` Aufrufe so anpassen, dass sie `recipient.locale ?? 'de'` als 3. Param übergeben.
   - Backend muss `profiles.locale` mitlesen (1-Query Add für jeden Service)
   - Helper-Pattern: `await getRecipientLocale(receiverId)` einmal cachen
2. HIGH-02 — Service Errors: 16 raw English/German Strings auf i18n-Keys mappen.
   - bounties.ts: 6 Validation-Errors → keys `errors.bountyRewardTooLow|TooHigh|...`
   - clubChallenges.ts: 5 Errors → `errors.challenge*` Keys
   - club.ts: 4 → existing keys oder `errors.invalidColor`
   - trading.ts: 5 "returned null" → `errors.generic` (akzeptabel — should never happen)
   - events.mutations.ts: 8 → admin-namespace keys
3. HIGH-03 — Achievement i18n: Migration `ALTER TABLE achievement_definitions ADD COLUMN title_tr TEXT, description_tr TEXT;` + Backfill (33 Achievements) + Resolver-Pattern + AchievementsSection.tsx Hookup
4. HIGH-04 — Compliance Glossar:
   - 5 IPO user-facing Keys umschreiben (DE: "Erstverkauf-Ansicht", TR: "Kulüp Satışı görünümü")
   - 18 TR "kazan*" Keys auf "topla/al/elde et" (Anil approval pro Datei)
   - 1 DE "Gewonnen" → "Erhalten"

**Verify:** Send Test-Notif als DE-User → TR-User, Inhalt prüfen. CI-Guard aus business.md laufen lassen.

### WAVE 3 — MEDIUM Polish (Healer C, ~2h)
1. MED-01 — 10 Date-Formatter-Sites auf `locale === 'tr' ? 'tr-TR' : 'de-DE'` umstellen
2. MED-02 — `fmtScout`/`formatScout`/`fmtCompact` Locale-Param hinzufügen (optional, default 'de-DE'), Caller schrittweise umstellen
3. MED-03 — Fantasy-Event-Migration `ALTER TABLE events ADD COLUMN name_tr TEXT;` + Resolver
4. MED-04 — SideNav.tsx:283 → `t('wishButton')`
5. MED-05 — defaultMessage Audit: 134 inline-Defaults gegen aktuelles JSON abgleichen, stale Defaults entfernen oder updaten

**Verify:** TR-Cookie setzen, Home/Profile/Player-Detail/Fantasy/Manager-Pages screenshot.

### WAVE 4 — LOW Polish (Optional, post-Beta)
1. Admin-Tabs i18n-Wave (15+ Strings)
2. Aria-Labels auf i18n-Keys umstellen

---

## Section 8: Audit-Statistiken

### Quantitative Befunde
| Metrik | Wert |
|--------|------|
| TS/TSX-Files in `src/` | ~600 |
| Files mit `useTranslations`-Aufruf | ~250 |
| Distinct Namespaces | 56 / 60 (4 ungenutzt: `predictions, pwa, demo, glossary` — defined but no `useTranslations` callsite) |
| `t(...)` Aufrufe geprüft | ~3000 |
| Missing-Key-Treffer (unique) | 12 (in 11 Files, alle in DE+TR fehlen) |
| `defaultMessage` Aufrufe | 138 (in 27 Files) |
| Hardcoded `'de-DE'` in user-facing Komponenten | 10 |
| `notifText` Aufrufe ohne locale-Param | 47 / 47 (100%) |
| Raw-Error-Strings in Services | 16 (bounties, clubChallenges, club, trading, players, events.mutations) |
| Window.alert/confirm Aufrufe | 0 (clean) |
| TR Strings mit "kazan*" Glücksspiel-Vokabel | 22 |
| User-facing IPO-Begriff (statt Erstverkauf) | 5 (`market.ipo*`) |

### Top-5 betroffene Files (CRIT+HIGH)
1. `src/components/trading/SellModalCore.tsx` — CRIT-02 Namespace-Mismatch
2. `src/lib/services/bounties.ts` — HIGH-02 (6 raw strings) + HIGH-01 (6 notifText ohne locale)
3. `src/features/fantasy/services/events.mutations.ts` — HIGH-02 (8 mixed DE/EN strings)
4. `src/lib/notifText.ts` — Architektur HIGH-01 (Default-Locale-Fallback Beta-Quickfix offen)
5. `src/components/player/detail/trading/IPOBuySection.tsx` — CRIT-01 (3 missing keys mit defaultMessage)

### Compliance-Risiko-Ranking (per business.md)
1. **HIGH** — `kazan*` in Welcome/Onboarding/Tour ist Direct-User-Touch (Anil-Approval Pflicht für TR-Wording)
2. **HIGH** — `IPO` user-facing in `market.ipo*` triggert SPK-Signal in TR
3. **MEDIUM** — `Anteil` in `profile.creatorFundShare` (Securities-adjacent ohne Disclaimer)
4. **MEDIUM** — `Gewonnen` als DE Partizip in `profile.wonLabel`
5. **LOW** — Admin-namespace `bescoutAdmin.feeIpoPlatform` etc. — admin-only OK

---

## Section 9: Open Questions for Anil

1. **CRIT-01 fehlende Keys:** Soll Healer DE+TR neu erfinden oder Tickets fragen?
   - Empfehlung: defaultMessage als DE übernehmen, TR Anil-approve nach `feedback_tr_i18n_validation.md`
2. **HIGH-01 Notification-Locale:** Soll Beta-Launch alle TR-User mit DE-Notifs raus, oder Healer-Wave VOR Launch?
   - Empfehlung: VOR Launch (TR-Pilot ohne TR-Notif sendet falsches Signal)
3. **MED-03 Fantasy-Event name_tr:** Db-Migration jetzt oder Beta-Launch live + Backfill?
   - Empfehlung: Migration jetzt, leeres Default ('' oder NULL → Resolver fällt auf `name`), Backfill auf Need-Basis
4. **HIGH-04 TR "kazan→topla":** Anil-Pflicht-Approval pro Key oder Bulk-OK auf das Pattern?
   - Anil-Vorschlag holen — 22 Strings sind viel für Einzel-Approval, Bulk-Pattern wäre OK wenn Anil das Wording bestätigt

---

## Appendix: Tools & Methods

- **JSON-Diff:** `node` Script flattens beide JSONs auf dotted-Keys, `Set`-Differenz
- **Key-Resolver:** Walks alle TS/TSX-Files, parsed `useTranslations(...)` Variable→Namespace Map, dann `varName('key')` Regex-Walk gegen DE+TR JSONs
- **Pattern-Greps:** `grep -rEn` mit gefilterten Excludes (Tests, Admin-Pfade, common Tokens)
- **Compliance-Scan:** Word-Boundary Regex gegen `business.md` Forbidden-Lists
- **next-intl v4 Behavior:** Verifiziert über context7 MCP — `defaultMessage` ist NICHT runtime-Fallback (anders als react-intl)

---

**Audit-Owner:** Operation Beta Ready Phase 3
**Read-Only Status:** Bestätigt — keine Files in `src/` oder `messages/` editiert.
**Files erstellt/gelöscht:** nur diese Datei + temp `check-i18n-keys.js` (gelöscht).
