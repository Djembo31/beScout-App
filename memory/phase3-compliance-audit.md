# Phase 3 Compliance Audit — Operation Beta Ready

**Datum:** 2026-04-14 (Phase 3, Beta-Ready Compliance-Sicherung)
**Scope:** SPK/MASAK/MiCA/CASP/JuSchG/App-Store-3.1.1 — komplette Sweep
**Status:** READ-ONLY Audit, Fix-Strategien dokumentiert
**Beta-Gate:** **NEIN — 8 user-facing JSON-Strings + 8 Live-DB-Rows + 1 Service-Throw blockieren Pilot-Launch**

---

## Executive Summary

| Domain | DE-Code | DE-JSON | TR-Code | TR-JSON | Live-DB |
|--------|--------:|--------:|--------:|--------:|--------:|
| `$SCOUT` Ticker User-Face | 0 | 5 | 0 | 5 | 8 rows |
| Glücksspiel-Verb (gewinn*/kazan*) | 0 | 1 | 0 | 9 | 0 |
| Securities Role (Tüccar/Trader) | 0 | 0 | 0 | 3 | — |
| Reinvest-/Reward-Kausalität | 0 | 1 | 0 | 2 | — |
| Securities-Liga ("Prämien-Liga") | 0 | 1 | 0 | 1 | — |
| Service throws raw $SCOUT-Error | 1 | — | 0 | — | — |
| **TOTAL** | **1** | **8** | **0** | **20** | **8 rows** |

**Totale Violations: 37 (1 Code + 28 JSON + 8 Live-DB)**

**Compliance-Tests laufen (4/4 grün)** — aber decken nur EN/DE-Wortbasis ab, NICHT TR-Glücksspiel-Vokabel, NICHT Reward-Kausalität, NICHT Tüccar/Trader-Rolle.

---

## CRITICAL — Sofort-Fix vor Beta-Launch (P0)

### CRITICAL-1: 8 Live `$SCOUT`-Rows in `transactions.description` (User-Profile sichtbar)

**Live-DB:** 8 Rows mit `description ~ '\$SCOUT'`
- 6× `"3-Tage-Streak: 100 $SCOUT"` 
- 2× `"7-Tage-Streak: 500 $SCOUT"` 

**User-Impact:** Erscheinen unmittelbar in Profile→Activity→Transaktionen-Tab. Public-Profil zeigt diese Rows wenn `tx_type='streak_milestone'` in PUBLIC_TX_TYPES whitelisted ist.

**Root Cause:** RPC `record_login_streak` schrieb `'3-Tage-Streak: 100 $SCOUT'` etc. via CASE-Statement direkt in `description`. Migration `20260415030500_ar55_j7_streak_reward_description_neutralize.sql` (heute) hat den RPC-Body geändert auf `'3-Tage-Streak'` (ohne $SCOUT-Suffix). Aber **Backfill der 8 alten Rows fehlt**.

**Fix-Strategy (autonomous):**
```sql
UPDATE transactions
SET description = regexp_replace(description, ': \d+ \$SCOUT', '', 'g')
WHERE description ~ ': \d+ \$SCOUT';
```
→ 8 Rows → `"3-Tage-Streak"` / `"7-Tage-Streak"`.

**Verify:**
```sql
SELECT description FROM transactions WHERE description ~ '\$|SCOUT'; -- expect 0 rows
```

---

### CRITICAL-2: 4× User-facing `$SCOUT` in DE/TR Fantasy-Strings

**File:** `messages/de.json` lines 872, 883–886, 900
**File:** `messages/tr.json` lines 872, 883–886, 900

| Line | DE | TR |
|------|-----|-----|
| 872 | `"joinWithScout": "Teilnehmen ({cost} $SCOUT)"` | `"joinWithScout": "Katıl ({cost} $SCOUT)"` |
| 883 | `"scoutEventsTitle": "$SCOUT Events erlauben"` | `"scoutEventsTitle": "$SCOUT etkinliklere izin ver"` |
| 884 | `"scoutEventsDescription": "Wenn aktiviert, können Admins Events mit $SCOUT-Eintritt erstellen."` | `"scoutEventsDescription": "Etkinleştirildiğinde adminler $SCOUT girişli etkinlik oluşturabilir."` |
| 885 | `"scoutEventsEnabled": "$SCOUT Events aktiviert"` | `"scoutEventsEnabled": "$SCOUT etkinlikler aktif"` |
| 886 | `"scoutEventsDisabled": "$SCOUT Events deaktiviert"` | `"scoutEventsDisabled": "$SCOUT etkinlikler devre dışı"` |
| 900 | `"scoutEventsNotAvailable": "$SCOUT Events sind derzeit nicht verfügbar."` | `"scoutEventsNotAvailable": "$SCOUT etkinlikler şu anda kullanılamıyor."` |

**Namespace:** `fantasy.*` — USER-FACING (nicht admin).

**Caller-Verifikation:**
- `joinWithScout` wird in JoinConfirmDialog gerendert wenn `event.currency === 'scout'` (gated durch `PAID_FANTASY_ENABLED=false`) → **derzeit unsichtbar im Beta-Build, aber String-Leak im Bundle**.
- `scoutEvents*` werden vom Settings-Toggle in `EventFormModal` (admin) gerendert. Admin-only — aber CTO-Anil hat klar gesagt "user-facing strings ohne $SCOUT".

**Fix-Strategy (autonomous):** Ersetzen mit `Credits` token.
```
"joinWithScout": "Teilnehmen ({cost} Credits)"  // DE
"joinWithScout": "Katıl ({cost} Credits)"        // TR
"scoutEventsTitle": "Credits Events erlauben"   // DE
"scoutEventsTitle": "Credits etkinliklere izin ver" // TR
... (alle 6 analog umbenennen)
```

**Note:** Die zweite Block (lines 4053–4056) ist im `bescoutAdmin` Namespace — **darf bleiben** per business.md ("Admin-facing Strings: 'IPO' darf bleiben"). Selber Mechanismus für `$SCOUT` admin-side.

---

### CRITICAL-3: Service `bounties.ts` wirft DE/EN-Mix mit `$SCOUT`-Ticker

**File:** `src/lib/services/bounties.ts:236`
```typescript
if (params.rewardCents < 100) throw new Error('Reward must be at least 1 $SCOUT (100 cents)');
```

**Caller:** `src/components/community/hooks/useCommunityActions.ts:310`
```typescript
catch (err) { addToast(err instanceof Error ? err.message : t('genericError'), 'error'); }
```
→ User sieht **literal "Reward must be at least 1 $SCOUT (100 cents)"** als Toast.

**Triple-Red-Flag-Pattern (per common-errors.md):**
- (a) DE/TR-Mix → user-facing EN-Text auf DE/TR-UI
- (b) `$SCOUT`-Ticker direkt in Error-Message
- (c) Dynamischer Wert ("100 cents") in Error → gehört in Pre-Submit-Hint, nicht Post-Error

**Fix-Strategy (autonomous):**
```typescript
// bounties.ts
if (params.rewardCents < 100) throw new Error('rewardTooLow');
if (params.rewardCents > 100_000_000) throw new Error('rewardTooHigh');
```
```typescript
// useCommunityActions.ts (mapErrorToKey pattern aus common-errors.md):
const ERROR_KEYS = new Set(['rewardTooLow','rewardTooHigh',...]);
catch (err) {
  const msg = err instanceof Error ? err.message : '';
  const key = ERROR_KEYS.has(msg) ? `bounties.errors.${msg}` : 'genericError';
  addToast(t(key, { defaultValue: t('genericError') }), 'error');
}
```
+ Add zu `messages/de.json` + `messages/tr.json` `bounties.errors.rewardTooLow` etc.

---

### CRITICAL-4: TR `welcomeDesc` Glücksspiel-Verb `kazandın` (= "du hast gewonnen")

**File:** `messages/tr.json:3185`
```json
"welcomeDesc": "{amount} Credits kazandın! İlk oyuncunu satın al ve koleksiyonunu başlat."
```

**User-Impact:** Welcome-Bonus-Modal nach erstem Login. **MASAK-relevant** — direktes Glücksspiel-Verb, suggeriert "Win".
**DE-Side ist sauber:** `"Du hast {amount} Credits erhalten!"` → "erhalten" = received (NEUTRAL).

**Fix-Strategy (autonomous):**
```json
"welcomeDesc": "{amount} Credits aldın! İlk oyuncunu satın al ve koleksiyonunu başlat."
```
(`aldın` = "du hast erhalten/bekommen")

---

### CRITICAL-5: TR Reward-Notification "kazanıldı!" (Mystery Box Celebration)

**File:** `messages/tr.json:3053`
```json
"celebration": "{reward} kazanıldı!"
```
**DE-Pendant ist sauber:** `"celebration": "{reward} erhalten!"`

**Fix-Strategy (autonomous):**
```json
"celebration": "{reward} aldın!"
```

---

## HIGH — Vor Beta-Launch (P1)

### HIGH-1: 7× zusätzliche TR `kazan*`-Glücksspiel-Verben im `messages/tr.json`

| Line | Key | Wert | Empfehlung |
|------|-----|------|------------|
| 357 | `home.storyPnlUp` | `"Kadron bugün +{pct}% değer kazandı"` | `"Kadron bugün +{pct}% değer kazandı"` → `"Kadronun değeri bugün +{pct}% arttı"` |
| 1836 | `profile.earned` | `"kazanıldı"` | `"alındı"` |
| 1916 | `profile.scoutEarned` | `"Credits kazanıldı"` | `"Credits alındı"` |
| 2738 | `profile.wdTotalEarned` (?) | `"Toplam kazanılan"` | `"Toplam alınan"` |
| 3090 | `gamification.ticketsTooltip` | `"Biletleri günlük görevler ve aktivitelerle kazanırsın..."` | `"Biletleri günlük görevler ve aktivitelerle topla..."` |
| 4737 | `inventory` (Tickets-Beschreibung) | `"Aktiviteyle kazanılan ikinci para birimi..."` | `"Aktiviteyle alınan ikinci para birimi..."` |
| 4745 | `inventory` (Research-Beschreibung) | `"...her açılışta kazanır."` | `"...her açılışta alır."` |

**Fix-Strategy (autonomous):** systematische Replace mit `topla|al|elde et` per AR-32 Glossar.

**CI-Guard ergänzen** (per business.md Empfehlung):
```bash
grep -E '"kazandın|kazandı|kazanıldı|kazanılan|kazanırsın|kazanan"' messages/tr.json
# Treffer: pruefen + neutralisieren
```

---

### HIGH-2: 1× DE `wonLabel: "Gewonnen"` (profile.fantasyResults)

**File:** `messages/de.json:1928`
```json
"wonLabel": "Gewonnen"
```
**Namespace:** `profile.*` (Fantasy-Results-Sektion auf User-Profil).
**Per AR-32 Glossar:** `gewonnen → erhalten/erreicht`.

**Fix-Strategy (autonomous):** `"wonLabel": "Erhalten"` oder `"wonLabel": "Erreicht"`.

**Caller:** Source-grep findet `wonLabel` nicht → Key derzeit unbenutzt aber im Bundle. Fix trotzdem prophylaktisch (Compliance-Audit-Trail).

---

### HIGH-3: 3× TR `Tüccar` (Trader-Rolle in Achievements)

**File:** `messages/tr.json` lines 1994, 2958, 2988

| Line | Key | Wert | Empfehlung |
|------|-----|------|------------|
| 1994 | `profile.strengthTaktischerInvestor` | `"Taktik Tüccar"` | `"Taktik Koleksiyoncu"` |
| 2958 | `gamification.achievement.10_trades` | `"Aktif Tüccar"` | `"Aktif Koleksiyoncu"` |
| 2988 | `gamification.achievement.50_trades` | `"Profesyonel Tüccar"` | `"Profesyonel Koleksiyoncu"` |

**Per business.md AR-32:** `Trader (als Rolle) → Sammler, Koleksiyoncu`.

**DE-Pendants:**
- 1994: `"Taktischer Händler"` — Händler ≈ Trader (gleiche Klasse). Empfehlung: `"Taktischer Sammler"`.
- 2958: `"Aktiver Händler"` → `"Aktiver Sammler"`.
- 2988 (DE): `"100_trades": "Trading-Legende"` → `"Sammler-Legende"`.

**Fix-Strategy (autonomous):** systematic Replace.

---

### HIGH-4: `Marktwert steigt → Bonus steigt` Reward-Kausalität

**File:** `messages/de.json:4308` + `tr.json:4308–4309`

```json
// DE 4308:
"rewardLadderTooltip": "Je höher der Marktwert des Spielers steigt, desto höher der mögliche Bonus pro Scout Card. Der Verein entscheidet über die Ausschüttung."

// TR 4308:
"rewardLadderTooltip": "Oyuncunun piyasa değeri ne kadar yükselirse, Scout Card başına olası bonus o kadar artar. Kulüp dağıtıma karar verir."

// TR 4309:
"rewardLadderDesc": "Artan piyasa değerine göre Scout Card başına başarı primi"
```

**Per business.md AR-32 (Securities-Terminologie SPK/MiCA Red-Flag):**
> `Marktwert steigt → Fee steigt | Die Höhe... hängt von Markt-Bewertung ab | Miktar piyasa değerlemesine bağlıdır` (Begründung: **Rendite-Kausalität**).

Aktueller Wortlaut suggeriert lineare Markt-→-Reward-Kopplung = SPK-Investment-Pattern.

**Fix-Strategy (CEO-Approval — wortlaut-kritisch):**
```json
// DE empfohlen:
"rewardLadderTooltip": "Die Höhe einer optionalen Community Success Fee pro Scout Card hängt von der Markt-Bewertung des Spielers ab. Die Auszahlung erfolgt nach alleinigem Ermessen des Vereins, kein Anspruch."

// TR empfohlen:
"rewardLadderTooltip": "Bir Scout Card başına isteğe bağlı Topluluk Başarı Ücreti miktarı, oyuncunun piyasa değerlemesine bağlıdır. Dağıtım, kulübün takdirindedir; hak talebi yok."
"rewardLadderDesc": "Piyasa değerlemesine göre Scout Card başına isteğe bağlı başarı primi"
```

**WARNUNG:** Reward-Ladder-Component (`rewardLadderTooltip` Caller) sollte ergänzend `FantasyDisclaimer` oder `TradingDisclaimer` in der Nähe rendern. → Healer-Audit empfohlen.

---

### HIGH-5: Public Pitch-Page `Prämien-Liga` / `Prize League` / `Ödüllü Lig`

**Files:** `messages/de.json:3563, 3616` + `messages/tr.json:3563, 3616`
- `geo.feature.prize_league: "Prämien-Liga"` / `"Ödül Ligi"`
- `pitch.region_feat_prizeLeague: "Prize League"` / `"Ödüllü Lig"`

**Routing:** `/pitch` ist **PUBLIC** (kein Auth-Gate in middleware.ts — `publicRoutes` enthält explizit `"/pitch"`). Investor-Pitch-Audience.

**Risk:** "Prämien-Liga" / "Prize League" = Glücksspiel-Marketing-Wording auf öffentlich-zugänglicher Seite. Im Pilot-Aufschlag (TFF 1. Lig Sakaryaspor) potenziell von Aufsicht (BaFin/MASAK) crawlbar.

**Per business.md:** `Phase 4 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN` + `Prize, Prämie → Reward, Belohnung`.

**Fix-Strategy (CEO-Approval — Marketing-Sprache):**
- DE: `"prize_league": "Reward-Liga"` oder `"Top-Spieltag"` 
- TR: `"prize_league": "Ödül Ligi" → "Ödül Ligi"` (TR "Ödül" ist neutraler als "Prize" auf EN — borderline OK, oder `"Üst Lig"`)
- DE: `"region_feat_prizeLeague": "Reward-Liga"` 
- TR: `"region_feat_prizeLeague": "Ödüllü Lig" → "Ödül Ligi"`

**Alternative:** Kompletter Eintrag entfernen (Phase-4-Feature → nicht in Pitch-Matrix listen) bis MGA-Lizenz da ist.

---

## MEDIUM — Vor V1-GA (P2)

### MEDIUM-1: `monthlyWinners: "Monats-Sieger"` / `"Ayın Birincileri"`

**File:** `messages/de.json:2877` + `tr.json:2877`
**Per AR-32:** `Gewinner → Top-Platzierung`. "Sieger" ist Sport-Sprache (≠ Glücksspiel-Duden), aber strict-mode wäre `"Monats-Top-Platzierung"`.

**Empfehlung:** Borderline. **KEEP** im Pilot, **ändern** vor MGA-Audit.

---

### MEDIUM-2: Achievement `"Smart Money"` (DE+TR identisch — engl. Brand)

**File:** `messages/de.json:2964` (gleiches Key in TR)
```json
"smart_money": "Smart Money"
```
"Smart Money" = US-Trading-Slang ("smart investors"). Investmentsprache.

**Per AR-32:** Securities-Identität. Empfehlung: `"smart_money": "Glückliche Hand"` / `"Şanslı El"` oder `"Trefferquote"` / `"İsabet Oranı"`.

---

### MEDIUM-3: `Manager: Stelle Lineups auf und gewinne!` Subtitle?

Audit-Grep findet keine direkte Verletzung des "Manager: Gewinne Events"-Patterns aus AR-32. **Status:** ✅ Bereinigt (J3-Sweep).

---

### MEDIUM-4: `confirmResetMsg` (TR) erwähnt "ödüller silinecek" (rewards will be deleted)

**File:** `messages/tr.json:742` (admin-only — fantasy admin)
**Status:** Admin-context, nicht user-facing → ✅ OK.

---

## LOW — Code-Review nach Beta

### LOW-1: `formatScout()` Helper-Doc mentions `$SCOUT`

**File:** `src/lib/services/wallet.ts:144`
```typescript
/** Cents → $SCOUT Display (z.B. 1000000 → "10.000") */
```
Internal JSDoc, nicht user-facing. KEEP.

---

### LOW-2: `trading.md` Rule-File self-contradicts business.md

**File:** `.claude/rules/trading.md:7`
```
- `fmtScout()` fuer Formatierung, `$SCOUT` user-sichtbar
```
**Conflict mit:** business.md Wording-Compliance — `$SCOUT = "Platform Credits" (nicht Kryptowaehrung)`.

**Fix-Strategy (autonomous):** trading.md Zeile 7 ändern auf:
```
- `fmtScout()` fuer Formatierung, `Credits` user-sichtbar (NIE `$SCOUT` in UI)
```

---

### LOW-3: 5× `$SCOUT`-Comments in Source-Code (interne Doku)

Nur Kommentare/Variable-Doku, kein User-Impact:
- `src/types/index.ts:83` — Type-Comment
- `src/features/market/components/portfolio/BestandView.tsx:219`
- `src/features/market/components/portfolio/BestandPlayerRow.tsx:23,24,31`

KEEP.

---

## VERIFIED OK (PASSED Compliance-Gate)

### TICKED-1: 4 Compliance-Tests grün (`wording-compliance.test.ts`)
```
Test Files  1 passed
Tests       4 passed
- COMPL-de: German locale contains no forbidden financial terms ✓
- COMPL-tr: Turkish locale contains no forbidden financial terms ✓
- COMPL-SCOUT: No locale describes Scout Cards as player shares ✓
- COMPL-CRYPTO: No locale references cryptocurrency or blockchain tokens ✓
```

**ABER:** Test ist **wortbasiert + Disclaimer-aware**, deckt NICHT ab:
- TR `kazan*` Familie (Glücksspiel-Verb)
- "Tüccar" / "Trader" als Rolle
- "Marktwert steigt → Bonus steigt" Reward-Kausalität
- "Prize League" / "Prämien-Liga"
- $SCOUT-Ticker in user-facing Strings (CRITICAL-2!)

→ **Test-Erweiterung empfohlen** (siehe "Test-Coverage Lücken").

---

### TICKED-2: Disclaimer-Coverage (4/4 Disclaimer-Components live)

| Disclaimer | Component | Pages mit Coverage |
|------------|-----------|---------------------|
| TradingDisclaimer | `src/components/legal/TradingDisclaimer.tsx` | rankings, airdrop, welcome, founding, home (`/`), playerDetail (BuyModal, SellModal, OfferModal, IPOBuySection, BuyConfirmModal, BuyOrderModal, RewardsTab, TradingTab, MarktplatzTab, PortfolioTab, WelcomeBonusModal) |
| FantasyDisclaimer | `src/components/legal/FantasyDisclaimer.tsx` | fantasy/FantasyContent, EventDetailModal, EventSummaryModal, JoinConfirmDialog, OverviewPanel, LeaderboardPanel, CreateEventModal |
| MysteryBoxDisclaimer | `src/components/legal/MysteryBoxDisclaimer.tsx` | MysteryBoxModal (claim-flow + empty-state), MysteryBoxHistorySection (history + empty-state) |
| MissionDisclaimer | `src/components/legal/MissionDisclaimer.tsx` | missions/page |

**Audit-Output:** 37 Files mit `Disclaimer`-Imports (siehe `grep -rn "Disclaimer" src/`).

**ALLE Reward-Modals/Claim-Flows mit Disclaimer abgedeckt.** ✓

---

### TICKED-3: Licensing-Phase Feature-Flags (PAID_FANTASY + PAID_MYSTERY_BOX)

**File:** `src/lib/featureFlags.ts`
```typescript
export const PAID_FANTASY_ENABLED = false;     // line 53 — hardcoded
export const PAID_MYSTERY_BOX_ENABLED = process.env.NEXT_PUBLIC_PAID_MYSTERY_BOX_ENABLED === 'true';  // line 70 — env-gated
```

**Verifizierte Gates:**
- `CreateEventModal` — buyIn-Feld + Fee-Preview + creatorFee-Berechnung gated
- `JoinConfirmDialog` — `event.currency === 'scout'`-Branch gated
- `EventFormModal` — `<option value="scout">$SCOUT</option>` gated
- `MysteryBoxModal` — `paidEnabled` flag-gated, Backend-RPC wirft `paid_mystery_box_disabled`

**Effective State:** Beide Phasen-4-Features sind defaultmäßig **OFF**. ✓

---

### TICKED-4: Cash-Out / Exchange / Fiat-Conversion Pfade

**Audit-Grep:** `convertToFiat|exchangeCredits|withdrawScout|cashOut|sellForFiat|EUR|USD|TRY` in `src/lib/services/`
- **0 Hits** für User-Cash-Out
- `requestClubWithdrawal` (src/lib/services/club.ts:660) — **Club-Admin only**, Fee-Auszahlung Club→Bank, NICHT User-Cash-Out
- KEINE Currency-Exchange-Komponenten oder Services

**Effective State:** Closed Economy garantiert. ✓

---

### TICKED-5: Geofencing-Tier-Matrix

**File:** `src/lib/geofencing.ts`
- `BLOCKED_COUNTRIES`: USA, China, KP, Iran, Syria, Cuba, Venezuela, Myanmar, Russia, Belarus → Hard-Block via Middleware-Redirect (`/blocked`)
- `RESTRICTED_COUNTRIES`: TR → `paid_fantasy: false`, `dpc_trading: false`
- `FREE_COUNTRIES`: DE/FR/AT/UK → `paid_fantasy: false`, `dpc_trading: false`
- `CASP_COUNTRIES`: 19 EU-States → `paid_fantasy: false`, `dpc_trading: true`
- `TIER_FULL`: Rest-EU → alle Features

**Enforcement:** `supabaseMiddleware.ts:12` — blockierte Länder → Redirect auf `/blocked` BEFORE Auth-Check.

**Effective State:** TIER_BLOCKED hart, TIER_RESTRICTED korrekt restriktiv. ✓

---

### TICKED-6: Age-Gating 18+

**Files:**
- `messages/de.json:98 + tr.json:98`: `ageConfirmation` Pflicht-Checkbox in Auth-Signup
- Alle Disclaimers (Mystery Box, Mission) enden mit "Nur für Nutzer ab 18 Jahren empfohlen"
- AGB §3 (`registrationContent`): "Nutzer müssen mindestens 18 Jahre alt sein"
- AGB §10 (`prohibitedContent`): "Nutzung der Plattform durch Personen unter 18 Jahren" verboten

**JuSchG §10b Loot-Box Compliance:** Da Registrierung 18+ erzwingt + Mystery-Box-Disclaimer 18+ Hinweis enthält, formal abgedeckt. **ABER:** Server-side Geburtsdatum-Validation? → noch nicht verifiziert (separater Audit empfohlen).

---

### TICKED-7: App-Store 3.1.1 Loot-Box Odds-Disclosure

**File:** `src/components/gamification/MysteryBoxModal.tsx`
- AR-48: Drop-Rates aus DB-Config dynamisch via `useMysteryBoxDropRates` Hook
- Fallback `DEFAULT_DROP_PERCENTS` für statische Anzeige
- `mysteryBoxDisclaimer`: "Drop-Raten basieren auf Zufall und können jederzeit angepasst werden"

**Effective State:** Apple 3.1.1-konform (sichtbare Wahrscheinlichkeiten + jederzeit-Variabilität deklariert). ✓

---

### TICKED-8: activity_log + transactions Sensitive Data Audit

**Audit-Query (Live-DB):**
```sql
SELECT DISTINCT action FROM activity_log;
-- → 21 Keys, alle technisch (fantasy_event_joined, trade_buy etc.) — KEINE user-facing Strings
SELECT DISTINCT metadata::text FROM activity_log WHERE metadata::text ~* 'scout|gewinn|kazan';
-- → 3 Rows (eventName: "BeScout Rising Stars" etc.) — Brand-Name, kein Leak
```

**Effective State:** activity_log clean, keine SPK/MASAK-relevanten Strings. ✓
**Aber:** transactions hat 8 `$SCOUT`-Leaks (siehe CRITICAL-1).

---

## Test-Coverage Lücken (für Phase-3-Hardening)

`wording-compliance.test.ts` muss erweitert werden um:

1. **TR Glücksspiel-Verb-Detektor:**
   ```typescript
   const FORBIDDEN_TR_GAMBLING = [
     'kazandın','kazandı','kazanıldı','kazanılan','kazanırsın','kazanan','kazanır[^l]',
   ].map(t => ({ term: t, regex: termRegex(t) }));
   ```
2. **DE Gewinn-Substantiv-Detektor:** `gewonnen|gewinner` als standalone Wörter (außer `Fans gewinnen`/`Follower gewinnen` Whitelist).
3. **`$SCOUT`-Ticker Detektor:** `\\$SCOUT` regex auf user-facing Namespaces (`fantasy.*`, `home.*`, `welcome.*`, `profile.*`, `missions.*`, `gamification.*`).
4. **Securities-Rolle-Detektor:** `Tüccar|Investor|Trader` (als standalone) auf user-facing Namespaces.
5. **Reward-Kausalität-Detektor:** Multi-Wort-Pattern: `(Marktwert.*steigt|piyasa değeri.*yükselirse|am.*Markt.*beteilig)`.

**Pre-Commit-Hook empfohlen** (per business.md AR-32):
```bash
grep -iE "gewinn|prämie|preis[eg]|\\bwin\\b|\\bprize\\b" messages/*.json | grep -iE "fantasy\\.|home\\.|welcome\\.|intro|profile\\.|missions\\.|gamification\\." | grep -v "gewinnLabel"
grep -iE "Marktwert steigt|piyasa değeri artınca|başarıya ortak|am Erfolg beteilig|Handle clever|akıllıca işlem" messages/*.json
grep -iE '\\$SCOUT' messages/*.json | grep -v 'bescoutAdmin\\.'
```

---

## Fix-Strategy Summary

| Tier | Fix-Mode | Items | ETA |
|------|----------|-------|-----|
| **CRITICAL P0** | Autonomous + Migration | 1 SQL-Backfill + 6 JSON-Strings + 1 Service-File + 2 TR-Strings + 1 caller fix | 1h |
| **HIGH P1** | Autonomous (1-3) + CEO-Approval (4,5) | 7 TR-kazan + 1 DE wonLabel + 3 TR Tüccar / DE Händler + Reward-Kausalität (2 strings) + Pitch-Page (4 strings) | 2h auto + CEO-Sync |
| **MEDIUM P2** | Post-Beta (defer) | Monats-Sieger + Smart-Money | nach V1-GA |
| **LOW** | Cleanup-Sweep | trading.md Rule-Doc | next session |

**Total Beta-Blockers:** **17 Items + 8 DB-Rows** (P0+P1).

**CEO-Approval-Requests:**
1. **HIGH-4 Reward-Kausalität-Wortlaut** (`rewardLadderTooltip` DE+TR) — Wording wirkt auf Trust-Signal/Conversion → Anil entscheidet final.
2. **HIGH-5 Pitch-Page Prämien-Liga** — Investor-Pitch ist Marketing-Asset → Anil + ggf. Legal-Counsel beteiligen, ob Phase-4-Features ganz aus Pitch-Matrix raus oder nur umbenannt.

---

## Beta-Gate Compliance Ready: **NEIN** ❌

**Blocker (vor Pilot-Launch zu fixen):**
1. ❌ 8 Live-DB-Rows mit `$SCOUT` in `transactions.description` → Backfill-SQL (CRITICAL-1)
2. ❌ 6 user-facing Fantasy-Strings mit `$SCOUT` in DE+TR → JSON-Replace (CRITICAL-2)
3. ❌ 1 Service-Throw mit DE/EN-Mix + `$SCOUT` → mapErrorToKey-Pattern (CRITICAL-3)
4. ❌ 2 TR Glücksspiel-Verben in Welcome+Celebration (CRITICAL-4, CRITICAL-5)
5. ⚠️ 7 zusätzliche TR-`kazan*`, 1 DE `wonLabel`, 3 TR-`Tüccar` (HIGH-1, HIGH-2, HIGH-3)
6. ⚠️ Reward-Kausalität "Marktwert steigt → Bonus" (HIGH-4) — CEO-Approval
7. ⚠️ Pitch-Page "Prämien-Liga" (HIGH-5) — CEO-Approval

**Sobald CRITICAL+HIGH gefixt + `wording-compliance.test.ts` erweitert + alle Tests grün → Beta-Gate offen.**

**Compliance-Sicher (KEIN Blocker):**
- ✓ TradingDisclaimer auf allen $SCOUT/Scout-Card-Pages
- ✓ FantasyDisclaimer (J4-AR-33) auf allen Fantasy-Pages und Reward-Modals
- ✓ MysteryBoxDisclaimer (J5-AR-47) auf MysteryBoxModal + History
- ✓ MissionDisclaimer (J7-AR-56) auf missions/page
- ✓ PAID_FANTASY_ENABLED=false (hardcoded)
- ✓ PAID_MYSTERY_BOX_ENABLED env-gated (default false)
- ✓ Geofencing korrekt: TR restricted, USA/CN/RU blocked
- ✓ 18+ Age-Gating in Auth + alle Reward-Disclaimers
- ✓ Apple 3.1.1 Loot-Box-Odds disclosed (AR-48)
- ✓ Cash-Out/Exchange/Fiat — KEINE Pfade existieren
- ✓ activity_log + transactions.description sensitive-data-clean (außer CRITICAL-1)
- ✓ 4/4 wording-compliance Tests grün (Baseline)

---

## Top-5 CRITICAL (für Anil-Schnell-Lesung)

1. **8 Live-DB-Rows `transactions.description ~ '$SCOUT'`** → 1× UPDATE-SQL fixt alle, sofort autonomous-deploybar
2. **6 user-facing $SCOUT-Fantasy-Strings** in DE+TR (`joinWithScout`, `scoutEvents*`) → JSON-Replace mit "Credits"-Token
3. **`bounties.ts:236` throw `'Reward must be at least 1 $SCOUT (100 cents)'`** → mapErrorToKey-Refactor + i18n-Keys
4. **`tr.json:3185 welcomeDesc "kazandın!"`** → `aldın!` (1-Word-Replace)
5. **`tr.json:3053 celebration "kazanıldı!"`** → `aldın!` (1-Word-Replace)

**Total Time-to-Fix für Top-5: <30 Min autonomous.**
**Empfehlung: Healer-Agent dispatchen + Reviewer + Deploy.**
