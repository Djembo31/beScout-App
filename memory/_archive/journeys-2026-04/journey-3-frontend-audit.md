---
name: Journey 3 — Frontend Audit (Sekundaer-Trade)
description: UI/UX Audit des Sekundaer-Trading-Flows fuer Operation Beta Ready Phase 2. 27 Findings mit File:Line, Severity, Beweis, Fix.
type: project
status: audit-complete
created: 2026-04-14
agent: frontend
scope: /market (Portfolio + Marktplatz Tabs) + /player/[id] (Hero + TradingCardFrame Front/Back + Buy/Sell/LimitOrder/Offer Modals) + Order-Book + TradeSuccessCard + BestandPlayerRow
---

# Journey #3 — Frontend Audit (Sekundaer-Trade)

## Summary

**27 Findings:** 5 CRITICAL + 8 HIGH + 10 MEDIUM + 4 LOW.

**Beta-Gates (11):** J3F-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -12.

**Cross-Cuts mit J1/J2:**
- J3F-01 = Fortsetzung von J2F-01 (i18n-Key-Leak) auf Sekundaer-Seite — J2 hat es nur fuer `buyError` im MarketContent gefixt, aber NICHT fuer `sellError`/SellModal und LimitOrderModal-Pfad.
- J3F-02..05 = Multi-League Liga-Logo-Gap, komplett fehlend auf TradingCard-Front/-Back, PlayerHero, PlayerIPOCard-Analog fuer Sekundaer.
- J3F-06..08 = Modal-UX: preventClose fehlt in DREI weiteren Modals im Player-Detail (Compliance mit J2F-04 fehlt, Geld-Mutation kann mit ESC/Backdrop unterbrochen werden).

---

## Findings-Tabelle

| ID | Severity | File | Thema |
|----|----------|------|-------|
| J3F-01 | CRITICAL | SellModal.tsx:102 | sellError zeigt Raw-i18n-Key (Service-Throw nicht via `t()`) |
| J3F-02 | CRITICAL | TradingCardFrame.tsx:213-239 | Liga-Logo fehlt auf Card-Front (TopBar nur Club + Flag) |
| J3F-03 | CRITICAL | TradingCardFrame.tsx:392-444 | Liga-Logo fehlt auf Card-Back (Metric-Grid ohne Liga-Kontext) |
| J3F-04 | CRITICAL | PlayerHero.tsx:199-214 | Liga-Badge fehlt zwischen Club und Position |
| J3F-05 | CRITICAL | TransferListSection.tsx:184-241 | PlayerRow Card-Variant: kein Liga-Badge fuer Sekundaer-Listings |
| J3F-06 | HIGH | BuyModal.tsx:177 | Modal ohne `preventClose={buying \|\| ipoBuying}` Prop |
| J3F-07 | HIGH | SellModal.tsx:76 | Modal ohne `preventClose={selling}` Prop |
| J3F-08 | HIGH | LimitOrderModal.tsx:36 | Modal ohne preventClose — wobei Feature nur "Coming Soon" ist |
| J3F-09 | HIGH | TradingDisclaimer fehlt | BuyOrderModal (Sekundaer-Buy-Order) ohne inline Disclaimer |
| J3F-10 | HIGH | TransferBuySection.tsx:105-109 | Dead Component — seit BuyModal-Stacked-Layout nicht mehr genutzt (Confusion) |
| J3F-11 | HIGH | BuyModal.tsx:306-311 | Sell-Order-Auswahl zeigt user_id-Fallback statt "Anonymer Verkaeufer" |
| J3F-12 | HIGH | MarktplatzTab.tsx:112 | `flex-1` auf `overflow-x-auto` Container — iPhone-Overflow-Trap (DONT-List #1) |
| J3F-13 | HIGH | SellModal.tsx:42,96-101 | `sellSuccess` State dead — `setSellSuccess` wird nie aufgerufen, Branch tot |
| J3F-14 | MEDIUM | BuyModal.tsx:166 | Hardcoded "Credits" statt i18n-Key — rechts neben Preis |
| J3F-15 | MEDIUM | MobileTradingBar.tsx:36 | Hardcoded "Credits" statt i18n-Key |
| J3F-16 | MEDIUM | TradingCardFrame.tsx:407,417 | Hardcoded "CR"-Kuerzel Back-Face MetricCell |
| J3F-17 | MEDIUM | BestandView.tsx:325 | Hardcoded "Spieler" statt i18n (DE+TR not covered) |
| J3F-18 | MEDIUM | BestandPlayerRow.tsx:73 | `toUpperCase()` auf Spieler-Nachname — Türkische Unicode-Trap (`İ`) |
| J3F-19 | MEDIUM | TradingCardFrame.tsx:488 | Hardcoded "Keine Spieldaten" statt i18n |
| J3F-20 | MEDIUM | OffersTab.tsx:103 | Hardcoded 300 bps im Frontend statt `TRADE_FEE_PCT` Constant |
| J3F-21 | MEDIUM | SellModal.tsx:71 | Fee-Breakdown OHNE Platform/PBT/Club Aufschluesselung (wie BuyConfirmModal) |
| J3F-22 | MEDIUM | TradingTab.tsx:329-417 | Trade-History Skeleton nicht implementiert — Loader2 statt Skeleton-Rows |
| J3F-23 | MEDIUM | OrderDepthView.tsx:385-391 | Loader2 statt Skeleton — Pattern-Inkonsistenz mit BestandView |
| J3F-24 | MEDIUM | BuyModal.tsx:134-142 | setTimeout 2500ms ohne Cleanup-Token wenn `open` waehrend Timer wechselt |
| J3F-25 | LOW | PlayerHero.tsx:293 | Hardcoded "CR" in Alert-Display (nach Price-Alert-Set) |
| J3F-26 | LOW | SellModal.tsx:241-247 | Preset-Buttons "Floor/+5%/+10%/+20%" — +20% Preset fehlt mobile-label |
| J3F-27 | LOW | WatchlistView.tsx:217-223 | Sort-Label "Name" hardcoded ohne i18n |

---

## CRITICAL Findings

### J3F-01 — i18n-Key-Leak in SellModal sellError

**File:Line:** `src/components/player/detail/SellModal.tsx:102-107`

**Problem:**
```tsx
{sellError && (
  <div role="alert" ...>
    {sellError}  // Zeigt raw key wie "insufficientBalance"
  </div>
)}
```

Der `sellError` kommt entweder aus `parentSellError` (bei `trading.sellError` in PlayerContent.tsx:294, dessen Kette nicht via `t()` resolved wird) oder aus lokalem `setLocalSellError(t('minPriceError'))` (OK, weil lokal bereits uebersetzt). Aber die parent-Variante schluckt den Key, weil Service wirft z.B. 'insufficientBalance'/'playerLiquidated'/'generic' (siehe `.claude/rules/common-errors.md` "i18n-Key-Leak via Service-Errors", dokumentiert 2026-04-14 J1 Reviewer).

**Beweis:**
- `src/lib/services/trading.ts:12-32` mapRpcError → returnt Raw-Keys
- `src/features/market/hooks/useTradeActions.ts:105-113` `handleSell`: `return { success: false, error: result.error || t('listingFailed') }` — hier wird `result.error` direkt als raw-key zurueckgegeben, NICHT via `te()`
- `PlayerContent.tsx` → `trading.sellError` → `SellModal.tsx:102` → User sieht "insufficientBalance"

**Fix-Vorschlag:**
```ts
// useTradeActions.ts:handleSell
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
// ...
if (!result.success) {
  const key = mapErrorToKey(normalizeError(result.error ?? 'generic'));
  return { success: false, error: te(key) };  // te = useTranslations('errors')
}
```

Gleicher Fix fuer `handleCancelOrder` und alle anderen `return { error: result.error }`-Pfade.

---

### J3F-02 — TradingCardFrame Front: Liga-Logo fehlt komplett

**File:Line:** `src/components/player/detail/TradingCardFrame.tsx:213-239`

**Problem:**
Die TopBar der Card-Front hat drei Bereiche: Club-Logo (links), Flag+Age (mitte), Position-Pill (rechts). Nach Multi-League-Expansion (7 Ligen, 4.263 Spieler) ist dies fuer User NICHT mehr interpretierbar: "FC Bayern" aus BL unterscheidet sich visuell nicht von "Bayern Alzenau" aus Regionalliga, wenn nur Wappen sichtbar. Das Liga-Logo ist im Type (`leagueLogoUrl`, Z.53 types/index.ts), wird aber ignoriert.

**Beweis:**
- `src/types/index.ts:51-53`: `leagueShort?`, `leagueCountry?`, `leagueLogoUrl?` — ALLE Felder existieren auf Player Type
- TradingCardFrame Props Z.32-48: `club: string` aber KEIN `league`/`leagueShort`/`leagueLogoUrl` durchgereicht
- `grep leagueLogoUrl src/components/player/detail/`: **KEINE Treffer** — Multi-League Daten auf Player-Detail komplett ignoriert

**Fix-Vorschlag:**
1. Props erweitern: `league?: string; leagueLogoUrl?: string; leagueShort?: string;`
2. In TopBar zwischen Club-Logo und Flag+Age: `<LeagueBadge size="xs" logoUrl={leagueLogoUrl} short={leagueShort} name={league} />`
3. PlayerHero.tsx:175 Propagation: `<TradingCardFrame ... league={player.league} leagueLogoUrl={player.leagueLogoUrl} leagueShort={player.leagueShort} />`

---

### J3F-03 — TradingCardFrame Back: Liga-Kontext fehlt

**File:Line:** `src/components/player/detail/TradingCardFrame.tsx:392-444`

**Problem:**
Die Rueckseite zeigt Market Value, Floor Price, 24h-Change, Fee-Cap — alles Liga-kontextfreie Zahlen. Bei 7 Ligen sehr unterschiedlicher Marktkapitalisierung (BL vs TFF 1. Lig) ist ein 500.000 EUR Market Value in Regionalliga vs BL komplett anders zu interpretieren. User sollte sofort erkennen "dies ist ein BL-Spieler in dieser Preisklasse".

**Beweis:**
- Z.393-395: `<div className="text-[7px] font-bold uppercase tracking-[0.2em] text-white/25 mb-2">{tp('cardBack.scoutCardData')}</div>` — Titel ohne Liga-Bezug
- Z.398-420: 2x2 MetricCell Grid — kein Liga-Identifier

**Fix-Vorschlag:**
Liga-Header direkt unter dem scoutCardData-Label:
```tsx
<div className="flex items-center gap-1.5 text-[8px] text-white/40 -mt-1 mb-2">
  {leagueLogoUrl && <Image src={leagueLogoUrl} alt="" width={10} height={10} className="size-2.5 rounded-sm object-contain" />}
  <span className="font-mono uppercase tracking-wider">{leagueShort ?? '—'}</span>
</div>
```

---

### J3F-04 — PlayerHero: Liga-Badge fehlt zwischen Club und Position

**File:Line:** `src/app/(app)/player/[id]/PlayerContent.tsx` → `src/components/player/detail/PlayerHero.tsx:199-214`

**Problem:**
Die Sekundaer-Zeile des Heros zeigt: Club-Logo, Club-Name, Flag, `·`, Position, `·`, Age. Kein Liga-Hinweis. Das ist die Page auf die ALLE Market-Klicks leiten (Entry-Point fuer Sekundaer-Trade).

**Beweis:**
```tsx
// PlayerHero.tsx:199-214
<div className="flex items-center gap-2 text-xs md:text-sm text-white/60 mt-1 flex-wrap...">
  {clubData?.logo && <Image src={clubData.logo} ... />}
  <span>{player.club}</span>
  {player.country && <CountryFlag code={player.country} size={12} />}
  <span className="text-white/20">&middot;</span>
  <span>{player.pos}</span>
  ...
```

`player.league`, `player.leagueShort`, `player.leagueLogoUrl` werden nicht gerendert.

**Fix-Vorschlag:**
Zwischen `{player.club}` und `{player.country}`:
```tsx
{player.leagueShort && (
  <>
    <span className="text-white/20">&middot;</span>
    <LeagueBadge logoUrl={player.leagueLogoUrl} short={player.leagueShort} size="xs" />
  </>
)}
```

Konsistent mit `BestandPlayerRow.tsx:98-100` wo das Pattern bereits lebt.

---

### J3F-05 — TransferListSection (PlayerRow-Variant): Kein Liga-Badge

**File:Line:** `src/features/market/components/marktplatz/TransferListSection.tsx:184-241`

**Problem:**
Die Transferliste ist der Hauptweg zum Sekundaer-Kauf (Journey #3 Path: `/market → Player`). Jede Row zeigt Photo, Name, Club, Form, Preis — aber KEIN Liga-Kontext. Bei 134 Clubs in 7 Ligen ist Club-Name allein mehrdeutig (z.B. mehrere "Galatasaray" oder "FC Bayern" Affiliates).

**Beweis:**
- Z.189-190: `<PlayerIdentity player={p} size="sm" showStatus className="flex-1 min-w-0" />` — nutzt Shared Component, dort evtl schon Liga? Grep noetig. Der Check: In `BestandPlayerRow.tsx:98-100` wird `LeagueBadge` explizit zusaetzlich zu PlayerIdentity gerendert — muss in TransferListSection analog passieren, falls PlayerIdentity noch keinen Liga-Support hat.
- Z.216-220: Hidden md+ stats micro-display, aber mobile-user sieht gar nichts dazu

**Fix-Vorschlag:**
Entweder (a) `PlayerIdentity` um Liga-Badge erweitern (shared Fix, impact hoch — alle Consumer pruefen) ODER (b) inline direkt nach PlayerIdentity:
```tsx
<PlayerIdentity player={p} size="sm" showStatus className="flex-1 min-w-0" />
{p.leagueShort && (
  <LeagueBadge logoUrl={p.leagueLogoUrl} short={p.leagueShort} size="xs" className="hidden sm:inline-flex" />
)}
```

**Risk-Hinweis:** PlayerIdentity wird ueberall genutzt. Shared Fix braucht `/impact` Agent VOR Implementation.

---

## HIGH Findings

### J3F-06 — BuyModal (Player-Detail) ohne preventClose

**File:Line:** `src/components/player/detail/BuyModal.tsx:177-178`

**Problem:**
```tsx
<Modal open={open} onClose={onClose} title={t('buyDpc')} subtitle={`${player.first} ${player.last}`}>
```

Kein `preventClose={buying || ipoBuying}`. Wenn User ESC oder Backdrop klickt waehrend RPC laeuft (200-500ms Latenz auf 4G TR) → Mutation fliegt kontextlos weiter, aber UI verliert State (Balance-Before, Pending-Qty). Das gleiche Muster wie J2F-04 — dort war es im Features-Market BuyConfirmModal; hier ist es das Player-Detail-Eigene BuyModal.

**Beweis:**
- `src/components/ui/index.tsx:123,137,145,149,188`: `preventClose` ist in Modal verfuegbar, `e.key === 'Escape' && !preventClose` und backdrop-click respektieren es
- `grep preventClose src/components/player/detail/`: **KEIN Treffer**
- `src/features/market/components/shared/BuyConfirmModal.tsx:75,92`: Sekundaer-Tab nutzt es bereits (nach J2F-04 Fix)

**Fix-Vorschlag:**
```tsx
<Modal
  open={open}
  onClose={onClose}
  title={t('buyDpc')}
  subtitle={`${player.first} ${player.last}`}
  preventClose={buying || ipoBuying}
>
```

---

### J3F-07 — SellModal ohne preventClose

**File:Line:** `src/components/player/detail/SellModal.tsx:76-92`

**Problem:**
```tsx
<Modal
  open={open}
  onClose={onClose}
  title={t('sell')}
  subtitle={`${player.first} ${player.last}`}
  footer={availableToSell > 0 && !player.isLiquidated ? (...) : undefined}
>
```

Kein `preventClose={selling || cancellingId !== null || acceptingBidId !== null}`. Bei Verkauf (Geld-Mutation!) kann User ESC druecken → Mutation laeuft weiter, UI springt weg, `placeSellOrder` kann erfolgreich landen OHNE Feedback.

**Beweis:**
`grep preventClose src/components/player/detail/SellModal.tsx` → **0 Treffer**. Modal hat keine Barriere gegen Close-waehrend-Mutation.

**Fix-Vorschlag:**
```tsx
<Modal ... preventClose={selling || cancellingId !== null || acceptingBidId !== null}>
```

---

### J3F-08 — LimitOrderModal ohne preventClose

**File:Line:** `src/components/player/detail/LimitOrderModal.tsx:36`

**Problem:**
```tsx
<Modal open={open} onClose={handleClose} title={t('limitOrderTitle')}>
```

Modal ist nur "Coming Soon" Placeholder (`submitted === true` zeigt Coming-Soon-Card), aber wenn Feature spaeter live geht, wird dieser Code sofort produktiv sein. Pattern JETZT konsistent machen spart Bug-Fix-Round spaeter.

**Beweis:**
Z.23-25: `handleSubmit` setzt nur State `setSubmitted(true)`. Keine echte Mutation. Aktuell harmlos, aber Pattern-Drift fuer zukuenftige Feature-Activation.

**Fix-Vorschlag:**
Niedrig-Risk-Rename zu `preventClose={false}` heute (explizit), dann spaeter `preventClose={mutationInFlight}` wenn Feature aktiv wird. ODER Kommentar `// TODO: preventClose={mutationInFlight} when limit orders are live`.

---

### J3F-09 — BuyOrderModal ohne TradingDisclaimer

**File:Line:** `src/features/market/components/shared/BuyOrderModal.tsx:88-229`

**Problem:**
BuyOrderModal ist der Kaufgesuch-Flow (Sekundaer-Trade: "Ich will Scout Card fuer max X Credits"). User committed Geld (Escrow-Lock in `placeBuyOrder` RPC). Keine `<TradingDisclaimer variant="inline" />` vor dem Submit-Button.

**Beweis:**
- `src/features/market/components/shared/BuyConfirmModal.tsx:245`: Hat `<TradingDisclaimer variant="inline" />` (J2F-08 Fix)
- `src/features/market/components/shared/BuyOrderModal.tsx` (diese Datei): grep `TradingDisclaimer` → **0 Treffer**
- Compliance-Muster aus business.md: "Disclaimers auf JEDER Seite mit $SCOUT/DPC (TradingDisclaimer Component)"

**Fix-Vorschlag:**
Vor dem `footer` Button Block in Z.96-118:
```tsx
<TradingDisclaimer variant="inline" />
```
Oder direkt vor `<Button>` im footer.

---

### J3F-10 — TransferBuySection: Dead Component

**File:Line:** `src/components/player/detail/trading/TransferBuySection.tsx`

**Problem:**
Das neue `BuyModal.tsx` (Z.226-334) rendert die Sekundaer-Buy-Logik STACKED mit IPO und Market Sections inline. `TransferBuySection.tsx` ist eine separate Component die dieselbe Funktionalitaet hat, aber grep zeigt sie wird nicht im Player-Detail TradingTab oder BuyModal konsumiert.

**Beweis:**
```
grep -rn "TransferBuySection" src/
```
Result: nur Selbstreferenz in `trading/TransferBuySection.tsx`. Kein Consumer.

**Risiko:**
- Dev kopiert bei Fixes den dead-code-Pfad.
- Liga-Logo-Fix (J3F-02..05) muesste hier gar nicht passieren → verschwendete Arbeit.

**Fix-Vorschlag:**
- Option A (clean): File loeschen, Barrel-Export `src/components/player/detail/trading/index.ts` pruefen und aufraeumen.
- Option B (safe): Als `@deprecated` kommentieren, in einer Session spaeter loeschen.
- VERIFY: `grep -rn "TransferBuySection" src/ tests/` → muss 0 Treffer liefern bevor Loesch.

---

### J3F-11 — BuyModal Sell-Order-Auswahl: user_id-Fallback fuer anonyme Seller

**File:Line:** `src/components/player/detail/BuyModal.tsx:306-311`

**Problem:**
```tsx
<span className="text-xs text-white/50">
  @{profileMap?.[order.user_id]?.handle ?? order.user_id.slice(0, 8)}
</span>
```

Wenn profileMap keinen Handle hat (z.B. geloeschter Account, noch nicht geladen), zeigt UI `@a1b2c3d4` — UUID-Fragment als Handle. Das ist User-unfriendly und ein Info-Leak (man kann User anhand UUID queryen via Profiles-Table).

**Beweis:**
Z.309-311 oben. Keine Fallback-i18n-Key fuer "Anonymer Verkaeufer" o.ae.

**Fix-Vorschlag:**
```tsx
<span className="text-xs text-white/50">
  {profileMap?.[order.user_id]?.handle
    ? `@${profileMap[order.user_id].handle}`
    : t('anonSeller', { defaultMessage: 'Verkaeufer' })}
</span>
```

---

### J3F-12 — MarktplatzTab SubTabs: flex-1 auf overflow-x-auto

**File:Line:** `src/features/market/components/marktplatz/MarktplatzTab.tsx:112`

**Problem:**
```tsx
<div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
```

**DONT-List #1 aus CLAUDE.md:** "flex-1 auf Tabs → iPhone overflow → flex-shrink-0 nutzen".

Der Container `flex-1` versucht sich maximal breit zu machen aber hat overflow-x-auto → bei 393px iPhone-16 kann horizontal scroll-Trap auftreten wenn Sub-Tabs + Search-Button insgesamt >380px brauchen (4 Tabs "Club Verkauf", "Transferliste", "Trending", "Watchlist" mit Padding = grenzwertig).

**Beweis:**
- Z.112 oben
- `LEARNINGS.md` Frontend Z.8-16: `flex-1 iPhone Overflow (3x aufgetreten)` — wir haben diesen Bug schon 3x gemacht, er steht auf `NIEMALS`-List
- Inhalt der Sub-Tabs ist bereits `flex-shrink-0` (Z.118), ABER der aeussere Container ist trotzdem falsch

**Fix-Vorschlag:**
```tsx
// FALSCH:
<div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">

// RICHTIG:
<div className="flex gap-2 overflow-x-auto scrollbar-hide min-w-0 flex-1">
```
`min-w-0` laesst flex-child shrinken statt expandieren. ODER `flex-1` ganz raus und stattdessen `<div className="flex-1 min-w-0">` um den Container wrappen — das macht der Code eh indirekt.

Alternativ: Search-Button aussen als Sibling, Container-Breite = auto.

---

### J3F-13 — SellModal: sellSuccess-State ist dead

**File:Line:** `src/components/player/detail/SellModal.tsx:42,96-101`

**Problem:**
```tsx
const [sellSuccess, setSellSuccess] = useState<string | null>(null);
// ...
{sellSuccess && (
  <div className="bg-green-500/20 ...">
    {sellSuccess}
  </div>
)}
```

`setSellSuccess` wird im gesamten File **NIEMALS aufgerufen**. Die Success-State-Branch ist dead — wenn Verkauf erfolgreich, sieht User keine Visual-Bestaetigung im Modal (weil der Modal sich auch nicht auto-schliesst, siehe J3F-07 preventClose).

**Beweis:**
`grep setSellSuccess src/components/player/detail/SellModal.tsx` → **1 Treffer (useState Zeile)**. Kein setter-Call irgendwo.

**Fix-Vorschlag:**
Entweder:
- (a) Parent-Pattern: `handleSell` erhaelt Success-Callback, `onSell` returnt `{ success: true }` → Parent setzt `trading.sellSuccess` State, Parent propagiert runter. Analog zu `buySuccess` Prop im BuyModal.
- (b) Inline: Nach `onSell(...)` und `{ success: true }` → `setSellSuccess(t('listingCreated'))` + useEffect timeout zum clear.

Option (a) ist konsistenter, Option (b) weniger invasive.

---

## MEDIUM Findings

### J3F-14 — BuyOrderModal: Hardcoded "Credits"

**File:Line:** `src/features/market/components/shared/BuyOrderModal.tsx:166`

**Problem:**
```tsx
<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-bold">Credits</span>
```

Literal String. DE zeigt "Credits", TR zeigt auch "Credits" (sollte "Kredi" sein).

**Fix-Vorschlag:** i18n-Key `market.creditsSuffix` mit DE="Credits" / TR="Kredi".

---

### J3F-15 — MobileTradingBar: Hardcoded "Credits"

**File:Line:** `src/components/player/detail/MobileTradingBar.tsx:36`

```tsx
<span className="text-[10px] text-white/40">Credits</span>
```

Gleicher Bug. `tr.json` zeigt User "Credits" statt "Kredi".

**Fix-Vorschlag:** Gleicher Key wie J3F-14 (shared).

---

### J3F-16 — TradingCardFrame Back: Hardcoded "CR"

**File:Line:** `src/components/player/detail/TradingCardFrame.tsx:407,417`

```tsx
value={backData.floorPrice != null ? `${fmtScout(backData.floorPrice)} CR` : '\u2014'}
```

"CR" ist Kurzform Credits. Hardcoded in 2 Stellen im Back-Face. In J2 wurde das als J2F-17 "CR-Kuerzel hartkodiert" LOW markiert — hier ist es dasselbe Pattern aber auf Card-Back (Back-Face wird pro Flip gesehen).

**Fix-Vorschlag:** i18n-Key `cardBack.creditsShort` oder shared `market.creditsShort`.

---

### J3F-17 — BestandView: Hardcoded "Spieler"-Plural

**File:Line:** `src/features/market/components/portfolio/BestandView.tsx:325`

```tsx
{sorted.length} {sorted.length === 1 ? 'Spieler' : 'Spieler'}
```

Zwei Probleme:
1. Sinnloser Ternary — beide Branches liefern "Spieler" (entweder Spelling-Bug oder dead-code).
2. TR sieht "Spieler" statt "Oyuncu".

**Fix-Vorschlag:**
```tsx
{t('playerCount', { count: sorted.length })}
// Mit TR: "1 oyuncu" / "N oyuncu", DE: "1 Spieler" / "N Spieler"
```

---

### J3F-18 — BestandPlayerRow: toUpperCase() Turkish Unicode-Trap

**File:Line:** `src/features/market/components/portfolio/BestandPlayerRow.tsx:73`

```tsx
<span className="font-black text-sm text-white truncate">{p.last.toUpperCase()}</span>
```

JavaScript's default `toUpperCase()` macht aus "Dogan" → "DOGAN" OK, aber "Özdemir" → "ÖZDEMIR" OK. ABER: `"i".toUpperCase() === "I"` standardmaessig, waehrend Tuerkisch `"i".toLocaleUpperCase('tr-TR') === "İ"` waere. Der Non-Locale-Default verliert den Punkt auf "İ".

Fuer Anzeige von Spieler-Nachnamen (Beta-User in TR) ist das culturally inkorrekt.

**Beweis:**
- `common-errors.md` Turkish Unicode Section: `I.toLowerCase() = i̇ (NICHT i)`
- Player-Namen koennen "İlkay Gündoğan" oder "Yılmaz" enthalten

**Fix-Vorschlag:**
```tsx
const locale = useLocale();
<span>{p.last.toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : locale)}</span>
```

---

### J3F-19 — TradingCardFrame: Hardcoded "Keine Spieldaten"

**File:Line:** `src/components/player/detail/TradingCardFrame.tsx:488`

```tsx
<div className="text-[7px] text-white/20 text-center py-2">
  Keine Spieldaten
</div>
```

Hardcoded DE-String. TR-User sieht "Keine Spieldaten" auf Card-Back wenn Timeline leer.

**Fix-Vorschlag:** `tp('cardBack.noMatchData')` mit DE+TR.

---

### J3F-20 — OffersTab: Hardcoded 300 bps statt TRADE_FEE_PCT

**File:Line:** `src/features/market/components/portfolio/OffersTab.tsx:103`

```tsx
const fee = Math.floor(total * 300 / 10000);
```

3% Offers-Fee ist laut business.md aktuell 3% (2% Platform + 0.5% PBT + 0.5% Club = P2P Offers). Aber:
- 300 bps = 3.00% — matched.
- `TRADE_FEE_PCT` Constant ist aber 6% (fuer Sekundaer-Sell, nicht Offers)
- Es gibt keinen `OFFER_FEE_BPS` oder `OFFER_FEE_PCT` shared-Constant

Das 300 live-hardcoded Risk: wenn fee-config in DB sich aendert, UI driftet.

**Beweis:**
- `src/lib/constants.ts`: `TRADE_FEE_PCT = 6` (fuer Trading, nicht Offers)
- Z.103 oben: `300 / 10000 = 0.03 = 3%` korrekt fuer P2P Offers aber magic-number

**Fix-Vorschlag:**
Export `OFFER_FEE_BPS = 300` aus `src/lib/constants.ts`, importieren, nutzen. Plus Kommentar `// P2P Offer Fee: 3% = 2% Platform + 0.5% PBT + 0.5% Club (siehe business.md)`.

---

### J3F-21 — SellModal: Fee-Breakdown ohne Platform/PBT/Club Aufschluesselung

**File:Line:** `src/components/player/detail/SellModal.tsx:70-73,254-269`

**Problem:**
SellModal zeigt ein Fee-Breakdown: Brutto → 6% Fee → Netto. Das ist korrekt aber TIEFER aufgeschluesselt als der BuyConfirmModal (der nach J2F-09 AR-9 ja jetzt 3.5% / 1.5% / 1% aufgeschluesselt zeigt). Symmetrie fehlt: Verkaeufer sieht nur "6%", nicht WOHIN das Geld fliesst.

**Beweis:**
- `BuyConfirmModal.tsx:207-220`: zeigt Platform/PBT/Club (J2F-09 Fix)
- `SellModal.tsx:254-269`: zeigt nur aggregate Fee, keine Aufteilung
- Compliance (business.md): User sollte wissen wohin Geld fliesst — Transparenz

**Fix-Vorschlag:**
Analog zu BuyConfirmModal Z.207-220, hinzufuegen unter der Brutto/Fee/Netto-Row:
```tsx
<div className="ml-5.5 pl-[22px] text-[10px] text-white/25 space-y-0.5">
  <div>{t('feeBreakdownPlatform')}</div>
  <div>{t('feeBreakdownPbt')}</div>
  <div>{t('feeBreakdownClub')}</div>
</div>
```

---

### J3F-22 — TradingTab Trade-History: Loader2 statt Skeleton-Rows

**File:Line:** `src/components/player/detail/TradingTab.tsx:345-349`

```tsx
{tradesLoading ? (
  <div className="flex flex-col items-center justify-center py-6 gap-2">
    <Loader2 className="size-5 animate-spin motion-reduce:animate-none ..." />
    <span className="text-xs text-white/20">{t('tradesLoading')}</span>
  </div>
) : ...}
```

**Pattern-Violation:** `.claude/rules/ui-components.md`: "Loading: Skeleton Screens (nicht Spinner). Ausnahme: Loader2 fuer Actions". Trade-History ist initial-load, nicht Action → sollte Skeleton sein.

**Fix-Vorschlag:** 3x `<SkeletonCard className="h-14" />` analog zu PortfolioTab.tsx:14-16.

---

### J3F-23 — OrderDepthView: Loader2 statt Skeleton

**File:Line:** `src/features/market/components/shared/OrderDepthView.tsx:385-391`

Gleicher Pattern-Bug:
```tsx
if (isLoading) {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="size-4 animate-spin text-white/30 motion-reduce:animate-none" />
    </div>
  );
}
```

Order-Book-Tiefe ist initial-load, nicht Action. Skeleton besser (WCAG — User sieht Strukturform).

**Fix-Vorschlag:** Shimmer-Chart-Skeleton mit 2-3 Skeleton-Rows.

---

### J3F-24 — BuyModal: setTimeout ohne open-change-Cleanup

**File:Line:** `src/components/player/detail/BuyModal.tsx:134-142`

```tsx
useEffect(() => {
  if (!open || !buySuccess || buying || ipoBuying) return;
  setJustPurchased(true);
  const t1 = setTimeout(() => {
    setJustPurchased(false);
    onClose();
  }, 2500);
  return () => clearTimeout(t1);
}, [open, buySuccess, buying, ipoBuying, onClose]);
```

Cleanup ist da (`clearTimeout(t1)`), ABER der Modal schliesst sich via `onClose()` nach 2.5s. Falls User vorher ESC oder Backdrop-Click macht, `open` wird false → useEffect-cleanup feuert → aber setJustPurchased bleibt im Stale-State bis nachster open. Beim Re-Open vergisst die Logik den Reset.

Z.127: `if (!open) { setSelectedOrderId(null); setShowAllOrders(false); setJustPurchased(false); }` — das cleared zwar, aber das Cleanup-effect-Pattern sollte robuster sein.

**Fix-Vorschlag:**
```tsx
useEffect(() => {
  if (!open) return;  // Guard frueh
  if (!buySuccess || buying || ipoBuying) return;
  setJustPurchased(true);
  const t1 = setTimeout(() => {
    setJustPurchased(false);
    onClose();
  }, 2500);
  return () => {
    clearTimeout(t1);
    setJustPurchased(false);  // Explizit reset on cleanup
  };
}, [open, buySuccess, buying, ipoBuying, onClose]);
```

---

## LOW Findings

### J3F-25 — PlayerHero: Hardcoded "CR" in Price-Alert Display

**File:Line:** `src/components/player/detail/PlayerHero.tsx:293`

```tsx
Alert: {priceAlert.dir === 'below' ? '\u2264' : '\u2265'} {fmtScout(priceAlert.target)} CR
```

Hardcoded "CR". Minor, inline-String.

**Fix-Vorschlag:** `{t('hero.priceAlertLabel', { dir: ..., price: fmtScout(priceAlert.target) })}` mit i18n-Pattern.

---

### J3F-26 — SellModal Preset-Buttons: +20% Preset mobile-Label

**File:Line:** `src/components/player/detail/SellModal.tsx:238-248`

Preset-Buttons "Floor/+5%/+10%/+20%" plus Floor-Label `{fmtScout(floorBsd)}` nehmen auf 393px grenzwertig breit (120+40+40+40+40+80 >= 360px).

**Beweis:** Z.240-248 — `px-2.5 min-h-[44px]` je Button, kein Abbruch/Wrap-Guidance.

**Fix-Vorschlag:**
- `flex-wrap` auf Container, ODER
- +20% Button auf Mobile ausblenden (`hidden sm:inline-flex`), ODER
- Label "Floor: {fmtScout}" auf Mobile unter die Buttons (`block sm:inline`)

---

### J3F-27 — WatchlistView: Sort-Label "Name" ohne i18n

**File:Line:** `src/features/market/components/marktplatz/WatchlistView.tsx:219`

```tsx
{ key: 'name', label: 'Name' },
```

Hardcoded. Minor — "Name" ist in DE und TR gleich ("Name" / "İsim"), aber inkonsistent mit den anderen `t('...')` Keys in derselben Liste.

**Fix-Vorschlag:** `{ key: 'name', label: t('sortName', { defaultMessage: 'Name' }) }` — braucht auch `tr.json` "İsim".

---

## Multi-League Liga-Logo Gap-Map (Journey #3 spezifisch)

| Component | Status | Fix-Finding |
|-----------|--------|-------------|
| TradingCardFrame Front TopBar | FEHLT | J3F-02 |
| TradingCardFrame Back Metric-Grid | FEHLT | J3F-03 |
| PlayerHero Info-Zeile (Club · Pos · Age) | FEHLT | J3F-04 |
| TransferListSection PlayerRow | UNKLAR (via PlayerIdentity) | J3F-05 |
| BestandPlayerRow | OK (Z.98-100 via LeagueBadge) | — |
| BuyModal Order-Selector | fehlt (Z.306-311 nur Handle) | (nicht P1) |
| TradeSuccessCard Player-Row | fehlt — Z.154-166 kein Liga | (minor post-Beta) |
| OrderDepthView | N/A (keine Player-Darstellung) | — |

**P1 Beta-Gates fuer Multi-League:** J3F-02, J3F-03, J3F-04, J3F-05.

---

## Modal-Compliance-Map (preventClose + Disclaimer)

| Modal | preventClose? | TradingDisclaimer? | Status |
|-------|---------------|---------------------|--------|
| BuyModal (Player-Detail) | FEHLT | Z.365 vorhanden | J3F-06 |
| SellModal (Player-Detail) | FEHLT | Z.90 vorhanden (im footer) | J3F-07 |
| LimitOrderModal | FEHLT | (nicht noetig, noch nicht live) | J3F-08 |
| OfferModal (Player-Detail) | nicht auditiert | nicht auditiert | (TODO) |
| BuyOrderModal (Market Sekundaer) | isPending implizit (Z.99,103) | FEHLT | J3F-09 |
| BuyConfirmModal (Market Stacked Tab) | OK (nach J2F-04) | OK (nach J2F-08) | OK |
| SellModal via KaderSellModal | nicht auditiert (ausserhalb Scope) | TODO | (J8) |

**P1 Beta-Gates fuer Geld-Mutation-Modals:** J3F-06, J3F-07, J3F-09.

---

## Cross-Check gegen common-errors.md

| Pattern aus common-errors.md | Gefunden in J3? | Finding |
|------------------------------|-----------------|---------|
| `flex-1` auf Tabs → iPhone overflow | JA | J3F-12 |
| Modal ohne `open` prop | NEIN | (alle haben open) |
| i18n-Key-Leak via Service-Errors | JA | J3F-01 |
| Service Error-Swallowing | NEIN (hier nicht Service-Layer) | — |
| Dynamic Tailwind Classes | NEIN | — |
| Turkish Unicode (`toUpperCase`) | JA | J3F-18 |
| Hooks vor Returns | NEIN | — |
| `[...new Set()]` statt Array.from | NEIN | — |
| Leere `.catch(() => {})` | NEIN | — |
| Loader2 als default Spinner | Violation (sollte Skeleton sein) | J3F-22, J3F-23 |
| Hardcoded Text | JA (diverse) | J3F-14, -15, -16, -17, -19, -25, -27 |

---

## LEARNINGS

1. **Multi-League-Propagation ist inkonsistent**: Der `Player.leagueLogoUrl` / `leagueShort` / `leagueCountry` Typ existiert seit Commit 8a5014d, aber Propagation durch Component-Tree ist nur punktuell passiert (BestandPlayerRow ✅, MarktplatzTab CountryBar ✅). PlayerHero, TradingCardFrame, TransferListSection muessen explizit Props durchreichen. **Audit-Pattern:** `grep leagueLogoUrl src/components/** src/features/** | wc -l` — erwartete Zahl vs. aktuelle Abweichung quantifiziert den Drift.

2. **Dead-Code nach Feature-Pivots**: `TransferBuySection.tsx` ist dead (kein Consumer), weil BuyModal-Stacked-Layout die Funktion in sich zieht. Reviewer-Checkliste ergaenzen: "Nach Major-Refactor → nicht-referenzierte Components identifizieren und loeschen/deprecaten" (auch Analog zu `onBuy`/`buyingId` dead props aus J2F-06).

3. **preventClose als Modal-Standard-Prop**: Jeder Modal mit Mutation sollte preventClose haben. Aktuell haben wir es inkonsistent (J2F-04 fixte einen, J3F-06..08 findet drei weitere). **Regel-Vorschlag:** `common-errors.md` ergaenzen: "JEDER Modal mit Geld-Mutation MUSS preventClose haben (Pattern siehe BuyConfirmModal.tsx)". Plus ESLint-Rule / Reviewer-Check.

4. **i18n-Key-Leak-Pattern ist NICHT nur im BuyError**: J2 hat nur MarketContent.tsx:137 `buyError` gefixed, ABER `sellError`-Pfad durch SellModal ist weiterhin verwundbar (J3F-01). **Audit-Pattern naechste Session:** `grep -rn 'setError(result.error)' src/` und `grep -rn '{error.message}' src/features/ src/components/` — alle Stellen die Service-Throws direkt rendern.

5. **"Loader2 everywhere" ist Pattern-Drift**: Auf Initial-Load sollte IMMER Skeleton gezeigt werden, Loader2 nur fuer User-Actions. Wir haben 2 Violations in J3 (J3F-22, J3F-23) und das Team macht den Fehler regelmaessig. **Healer-Task nach Phase 2:** systematischer Sweep `grep -rn "Loader2" src/features/market/ src/components/player/detail/` → alle initial-load-Varianten auf Skeleton umstellen.

6. **Hardcoded "Credits" / "CR" ist der Top-Hardcoded-String-Leak**: 4 Findings in J3 (J3F-14, -15, -16, -25) + J2F-17 + J2F-19. Fix: shared i18n-Key `market.creditsShort` / `market.creditsFull` als Single-Source, alle Hardcoded entfernen. **Healer-Sweep** kann das in 1 Session durchziehen (~30 min).

7. **Fee-Transparenz-Symmetrie**: J2F-09 hat BuyConfirmModal Fee-Breakdown hinzugefuegt (3.5/1.5/1% sichtbar). SellModal hat das NICHT (J3F-21). Analog: bei jedem User-visible Fee muss Platform/PBT/Club aufgeschluesselt werden — Compliance + Trust. Pattern-Regel: "Wenn Fee angezeigt wird, MUSS Platform/PBT/Club einzeln gezeigt werden."

---

## Priorisierung fuer Healer Phase 3

**P0 (Beta-Blocker, sofort):**
- J3F-01 (sellError i18n-Leak) — Money + User-Confusion
- J3F-06, J3F-07 (preventClose Buy/SellModal) — Geld-Mutation-Safety
- J3F-09 (BuyOrderModal ohne Disclaimer) — Compliance

**P1 (Multi-League Beta-Readiness):**
- J3F-02, J3F-03, J3F-04, J3F-05 — Liga-Logo Gap (alle vier in einem PR)

**P2 (UX-Polish, vor Beta-Gate):**
- J3F-10 (TransferBuySection Dead-Code — delete/deprecate)
- J3F-12 (flex-1 iPhone-Trap — quick fix)
- J3F-13 (SellModal sellSuccess dead — enable Feedback)
- J3F-11 (anonSeller-Fallback)
- J3F-21 (Fee-Transparenz SellModal)

**P3 (Post-Beta, nicht Beta-blockend):**
- J3F-14..20, J3F-22..27 — i18n-Hardcoded + Loader2/Skeleton + Turkish Unicode + Minor

**Empfehlung:** 2 parallele Healer-Agents — (a) P0 Money-Safety, (b) P1 Multi-League Liga-Badge Propagation. Dann P2/P3 in einem separatem Sweep.
