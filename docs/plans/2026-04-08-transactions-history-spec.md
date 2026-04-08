# B3 Transactions History E2E — SPEC

**Datum:** 2026-04-08
**Status:** SPEC — awaiting Anil's Gate
**Kontext:** 3. und letztes Feature aus `project_e2e_features.md` (B1 Missions ✅, B2 Following Feed ✅).
**Pattern:** Discovery → Reality Check → Fragen → Implementation → Live Test (wie B1, B2).

---

## 1.1 Current State (IST-Zustand)

### Feature Inventory (was kann der User aktuell mit Transactions)

| # | Feature | Wo | Für wen |
|---|---------|-----|---------|
| 1 | **Credits Timeline anzeigen** (own) | `/profile` → Tab "Timeline" | Self |
| 2 | **Tickets Timeline anzeigen** (own) | `/profile` → Tab "Timeline" | Self (non-self: leer) |
| 3 | **Filter Chips** (all/credits/tickets/trades/fantasy/rewards) | TimelineTab | Alle |
| 4 | **Day Grouping** (Heute / Gestern / Datum) | TimelineTab | Alle |
| 5 | **Load More Pagination** (PAGE_SIZE=20) | TimelineTab | Alle |
| 6 | **i18n für Activity Labels** | `messages/{de,tr}.json` — `activity.*`, `profile.*` | Alle |
| 7 | **Public Profile Tx Filter** (PUBLIC_TX_TYPES) | useProfileData | Public Viewers |
| 8 | **Analyst Tab Content Earnings Aggregation** | AnalystTab.tsx (nutzt raw transactions) | Self |
| 9 | **Analyst Tab Bounty Stats Aggregation** | AnalystTab.tsx | Self |
| 10 | **Transactions Cache Invalidation** (limit:10 hardcoded) | `queries/invalidation.ts` | System |

### File Inventory (betroffene Files)

| File | LoC | Zweck |
|------|-----|-------|
| `src/lib/services/wallet.ts` | 155 | `getTransactions()`, `getWallet()`, formatScout |
| `src/lib/services/tickets.ts` | ~80 | `getTicketTransactions()`, ticket CRUD |
| `src/features/fantasy/services/wildcards.ts` | 111 | `getWildcardHistory()` — **DEAD, nirgends genutzt** |
| `src/lib/queries/misc.ts` | 206 | `useTransactions()` hook — **DEAD, nur Re-Export** |
| `src/lib/queries/tickets.ts` | 28 | `useTicketTransactions()` hook — **DEAD** |
| `src/lib/queries/keys.ts:143-147` | — | `qk.transactions.byUser(uid,n)` / `.all` |
| `src/lib/queries/invalidation.ts:24,43,51,96` | — | Hardcoded `qk.transactions.byUser(uid, 10)` (BUG) |
| `src/components/profile/TimelineTab.tsx` | 331 | Main UI (Filter, Day Groups, Load More) |
| `src/components/profile/ProfileView.tsx` | 193 | Embedding als Tab `timeline` |
| `src/components/profile/hooks/useProfileData.ts` | 229 | Fetcht raw (nicht via Query Hook), hält veraltete `PUBLIC_TX_TYPES` |
| `src/components/profile/hooks/types.ts` | 58 | `ProfileDataResult` — publicTransactions |
| `src/components/profile/AnalystTab.tsx` | 518 | Nutzt `transactions` für Content-Earnings-Aggregation |
| `src/components/profile/TraderTab.tsx:272` | — | **BROKEN Link** `?tab=activity` |
| `src/app/(app)/profile/page.tsx` | 51 | **Liest keine searchParams** |
| `src/app/(app)/profile/[handle]/page.tsx` | 102 | **Liest keine searchParams** |
| `src/types/index.ts:545,771,828,1839` | — | 4 Transaction Types (`DbTransaction`, `DbTicketTransaction`, `DbWildcardTransaction`, `DbPbtTransaction`) |
| `.claude/rules/profile.md` | — | `PUBLIC_TX_TYPES` (15 types, divergiert vom Code) |
| `messages/{de,tr}.json` | — | `profile.*` namespace (filter labels), `activity.*` namespace |

### DB Reality Check (via Supabase MCP)

**4 Transactions-Tabellen existieren:**

| Tabelle | Rows | RLS Policy | Genutzt |
|---------|------|-----------|---------|
| `transactions` | 1009 | `SELECT: auth.uid() = user_id` (owner-only) | ✅ via `getTransactions` |
| `ticket_transactions` | 100 | owner + admin | ✅ via `getTicketTransactions` |
| `wildcard_transactions` | **0** | owner-only | ❌ Dead code (`getWildcardHistory`) |
| `pbt_transactions` | — | `SELECT: true` (public) | Player-bezogen, nicht user |

**`transactions.type` — DB vs Code Drift:**

| Type | DB Count | In Code `FILTER_TYPE_MAP.trades` | In `PUBLIC_TX_TYPES` (Code) |
|------|---------|----------------------------------|----------------------------|
| `ipo_buy` | 670 | ✅ | ✅ |
| `tier_bonus` | 107 | ❌ | ❌ |
| `deposit` | 63 | ❌ | ❌ |
| **`trade_buy`** | **61** | ❌ **(Code hat nur `buy`)** | ❌ |
| **`trade_sell`** | **61** | ❌ **(Code hat nur `sell`)** | ❌ |
| `welcome_bonus` | 13 | ❌ | ❌ |
| `offer_lock` | 8 | ❌ | ❌ |
| `buy` (legacy) | 6 | ✅ | ✅ |
| `sell` (legacy) | 6 | ✅ | ✅ |
| `streak_reward` | 6 | ✅ (rewards) | ❌ |
| `offer_unlock` | 4 | ❌ | ❌ |
| `mission_reward` | 2 | ❌ | ✅ |
| `offer_buy` | 1 | ❌ | ❌ |
| `offer_sell` | 1 | ❌ | ❌ |

**Fakt:** Der Filter "Trades" zeigt 122 von 128 echten Trades **NICHT** an. Der Public Profile zeigt 12 von 128 Trades **NICHT** an.

**`ticket_transactions.source`:** `daily_login` (64), `mystery_box` (30), `chip_use` (3), `mission` (2), `event_entry` (1)

**Jarvis QA Fixture:** 15 own transactions, 76 transactions bei den 3 gefolgten Scouts (`kemal2`, `test12`, `emre_snipe`).

### Data Flow (aktuell)

```
ProfileView
  → useProfileData (raw Promise.allSettled, KEIN Query Hook)
  → getTransactions(targetUserId, 50)       // wallet.ts
  → getTicketTransactions(targetUserId, 50) // tickets.ts (nur self)
  → publicTransactions = filter(PUBLIC_TX_TYPES) für non-self
  → TimelineTab (Props-basiert)
     → Load More: wieder raw getTransactions / getTicketTransactions
     → KEIN React Query involviert
```

**Konsequenz:** Trade-Flow ruft `invalidateTradeQueries` → invalidiert `qk.transactions.byUser(uid, 10)` → **trifft nichts**, da Profile raw fetcht. Nach Trade zeigt Timeline stale Daten bis Page-Reload.

### External Links zum Transactions-Feature

```
grep -rn "?tab=activity" src/
→ src/components/profile/TraderTab.tsx:272  (BROKEN — Tab heißt "timeline", Page liest searchParams nicht)
```

**Einziger Entry-Point zu Timeline außerhalb der ProfileView Tabs.**

### Shared State / Query Keys

- `qk.transactions.byUser(uid, n)` — verwendet in Invalidation (limit:10), nie im Read
- `qk.tickets.transactions(uid, n)` — definiert, dead
- `qk.tickets.balance(uid)` — aktiv (WalletProvider / Tickets Widget)

---

## 1.2 Goals + Non-Goals + Anti-Requirements

### Goals (measurable)

1. **Transactions Timeline funktioniert für Self** — alle Types korrekt gefiltert, Day Grouping, Pagination, ohne stale Cache.
2. **Transactions Timeline funktioniert für Public Profile** — PUBLIC_TX_TYPES korrekt gefiltert, RLS erlaubt Cross-User-Reads für diese Types.
3. **DB/Code Drift eliminiert** — Filter und PUBLIC_TX_TYPES matchen echte DB-Types (`trade_buy/trade_sell` + alle anderen).
4. **Deep Link funktioniert** — `/profile?tab=timeline` öffnet TimelineTab direkt; "Alle Trades"-Link in TraderTab bricht nicht.
5. **Cache Invalidation korrekt** — nach Trade/Research/Poll refetched Timeline ohne Manual Reload.

### Non-Goals (explizit nicht in B3)

- **Keine dedizierte `/transactions` Page** (Tab reicht — TimelineTab ist bereits voll funktional für den Kontext)
- **Keine Wildcards Integration** (`wildcard_transactions` ist leer, getWildcardHistory ist dead — separates Cleanup-Task)
- **Kein CSV Export** (Handoff erwähnt als optional, nicht Pilot-kritisch)
- **Keine Realtime Subscription** (staleTime-basiert reicht, wie B2)
- **Keine Redesign der TimelineTab UX** (Funktion first, nicht Kosmetik)
- **Keine neue Filter-Kategorie** (bestehende 6 Filter bleiben)

### Anti-Requirements (explizit verboten)

1. **KEIN neuer TimelineTab-Clone erstellen** — existierende Komponente fixen, nicht duplizieren.
2. **KEINE hardcoded Type-Listen in der UI** — alle Type-Listen müssen aus einer Single-Source-of-Truth kommen (z.B. `lib/activityHelpers.ts` oder neuer `lib/transactionTypes.ts`).
3. **KEINE Änderung an AnalystTab-Aggregationen** ohne impact check — Content Earnings Calc hängt an denselben Types.
4. **KEIN Delete der dead hooks ohne grep-bestätigung** (useTransactions, useTicketTransactions, getWildcardHistory).
5. **KEIN Refactoring der useProfileData → React Query Migration** (zu großer Scope für B3 — separater Task).

---

## 1.3 Feature Migration Map

| # | Feature | Current | Target | Action |
|---|---------|---------|--------|--------|
| 1 | Credits Timeline (Self) | ProfileView Tab | Gleich — **Bugs fix** | ENHANCE |
| 2 | Tickets Timeline (Self) | ProfileView Tab | Gleich | STAYS |
| 3 | Public Profile Timeline | Leer (RLS blockiert) | Funktioniert für PUBLIC_TX_TYPES | **FIX (RLS)** |
| 4 | Trade Filter | `['buy','sell','ipo_buy']` (missed 122) | Komplett (inkl. `trade_buy/sell`, `offer_buy/sell`) | **FIX (type list)** |
| 5 | PUBLIC_TX_TYPES | 10 Types, veraltet | Single Source, alle public-safe Types | **FIX + dedupe** |
| 6 | Deep Link `?tab=X` | Ignoriert | Wird gelesen, mapped auf ProfileTab | **ADD (searchParams read)** |
| 7 | TraderTab "Alle Trades" Link | `?tab=activity` (broken) | `?tab=timeline` | **FIX** |
| 8 | Cache Invalidation | `limit:10` hardcoded | Invalidate `qk.transactions.byUser` **prefix** | **FIX** |
| 9 | AnalystTab Content Earnings | Aggregation funktioniert | Gleich (invariant — keine Änderung) | STAYS |
| 10 | Dead: `useTransactions` Hook | Existiert, nie genutzt | **DELETE** oder **WIRE** | DECISION NEEDED |
| 11 | Dead: `useTicketTransactions` | Existiert, nie genutzt | **DELETE** oder **WIRE** | DECISION NEEDED |
| 12 | Dead: `getWildcardHistory` | Existiert, nie genutzt | **DELETE** (wildcard_transactions leer) | REMOVE |

---

## 1.4 Blast Radius Map

### Change 1 — RLS Policy auf `transactions`

**Direct impact:** Alle `getTransactions()` calls auf fremde Users.

```bash
grep -rn "getTransactions(" src/
→ src/components/profile/hooks/useProfileData.ts:83   (raw fetch targetUserId)
→ src/components/profile/TimelineTab.tsx:207          (Load More — eigener User via prop)
→ src/lib/queries/misc.ts:27                          (Hook, dead)
→ src/lib/services/__tests__/wallet-v2.test.ts        (Tests)
```

**Indirect:** Alle UI-Komponenten die `publicTransactions` oder `transactions` aus useProfileData bekommen:
- `ProfileView.tsx` — rendert TimelineTab
- `AnalystTab.tsx` — Aggregation (Content Earnings, Bounty Stats)

**Runtime:** RLS-Änderung sichtbar **sofort** beim nächsten SELECT. Keine Migration-Zeit. Kein Rollback-Aufwand.

**Risk:** Types die jetzt als "private" gelten (z.B. `deposit`, `offer_lock`, `welcome_bonus`) werden für andere User sichtbar, wenn PUBLIC_TX_TYPES nicht strikt ist. → **Mitigation:** PUBLIC_TX_TYPES whitelist in RLS-Policy embedded.

### Change 2 — Type-Listen Korrigieren (`trade_buy/sell` etc.)

**Direct:**
- `src/components/profile/TimelineTab.tsx:43-52` — `FILTER_TYPE_MAP`
- `src/components/profile/hooks/useProfileData.ts:27-31` — `PUBLIC_TX_TYPES`
- `src/components/profile/AnalystTab.tsx:35-40` — `CONTENT_EARNING_TYPES` (muss NICHT geändert werden, aber überprüfen)

**Indirect:** `src/lib/activityHelpers.ts` — `getActivityIcon()`, `getActivityColor()`, `getActivityLabelKey()`:
```bash
grep -n "getActivityIcon\|getActivityColor\|getActivityLabelKey" src/lib/activityHelpers.ts
```
Wenn dort nur `buy/sell` gemappt ist → `trade_buy/sell` zeigen falsche Icons.

**Mitigation:** Single-Source Type-Helper erstellen + `activityHelpers` erweitern.

### Change 3 — Cache Invalidation

**Direct:** `src/lib/queries/invalidation.ts` (4 Stellen mit hardcoded `(uid, 10)`)

**Indirect:** Wenn wir von Raw-Fetch auf Query Hook migrieren, werden folgende Consumers beeinflusst:
- `useProfileData` (fetcht raw)
- `TimelineTab` Load More (raw)

**Mitigation:** Für B3 nur das Pattern fix — **prefix invalidation** (invalidiere alle Keys die mit `['transactions', userId]` anfangen, nicht nur `['transactions', userId, 10]`).

### Change 4 — Deep Link `?tab=X`

**Direct:**
- `src/app/(app)/profile/page.tsx` (self)
- `src/app/(app)/profile/[handle]/page.tsx` (public)
- `src/components/profile/ProfileView.tsx` (accept initial tab prop)
- `src/components/profile/hooks/useProfileData.ts` (tab initialization logic)

**Indirect:** Bestehende Tab-Initialization verwendet `getStrongestDimension(scores)` → Prio-Regel: searchParams > stärkste Dimension > default.

**External:** `src/components/profile/TraderTab.tsx:272` Link ändern.

**Mitigation:** Initial Tab als `?tab=` auslesen, fallback auf bestehende Logik.

---

## 1.5 Pre-Mortem — "Es ist 2 Tage später, B3 ist gescheitert"

| # | Scenario | Mitigation |
|---|---------|-----------|
| 1 | **Public Profile zeigt sensible Types** (z.B. `offer_lock`, `deposit` von anderen Usern) | RLS-Policy enthält expliziten Whitelist-Filter mit `action = ANY(ARRAY[...])`, PUBLIC_TX_TYPES Single-Source in DB-Migration UND Code. |
| 2 | **AnalystTab Content Earnings zeigt doppelte oder fehlende Beträge** nach Type-Fix | Regression-Test: Jarvis self Profile → AnalystTab Content Earnings-Summe **VOR** Fix notieren, **NACH** Fix vergleichen. Kein Type-Remove in AnalystTab. |
| 3 | **Deep Link funktioniert auf Public Profile aber nicht auf Self** | Beide Pages lesen searchParams + mappen auf den gleichen ProfileView Tab Contract. Smoke-Test auf beiden Routes. |
| 4 | **Cache Invalidation prefix fix bricht andere Query Keys** (`qk.transactions.all`) | Nur `byUser` Keys invalidieren, nicht `.all`. Explizit testen dass `qk.priceHist.all` o.ä. nicht mit-invalidiert werden. |
| 5 | **Service Worker Cache zeigt stale JS** (wie bei B2) | Playbook aus `memory/errors.md` vor QA: `navigator.serviceWorker.getRegistrations().unregister()` + caches.delete all + hard reload. |

---

## 1.6 Invarianten + Constraints

### Invarianten (dürfen sich NICHT ändern)

- AnalystTab Content Earnings-Aggregation rechnet identisch wie vorher (dieselben Types matchen, gleiche Summen).
- AnalystTab Bounty Stats rechnet identisch (`bounty_reward` Type unverändert).
- Tab-Reihenfolge im ProfileView bleibt dim-dynamisch (manager/trader/analyst → timeline).
- `formatScout()` Output identisch (BIGINT cents → de-DE formatted).
- Jarvis self sees alle seine Credits + Tickets nach dem Fix (mindestens so viele wie vorher).
- Load More Pagination funktioniert genau wie vorher (PAGE_SIZE=20, kein Off-by-One).
- Day Grouping (Heute/Gestern/Datum) identisch.
- Sprach-Umschaltung DE ⇄ TR zeigt korrekte Labels.

### Constraints

- **Max 10 Files pro Wave**.
- **Move und Change getrennt**: Neue Types-SSOT-Datei erstellen = Wave 1; Consumers umstellen = Wave 2.
- **DB-Migration vor Code**: RLS-Fix muss **vor** Frontend-Read deployed sein.
- **Pre-Mortem Szenario 2 (AnalystTab Regression)**: Vor Commit → Smoke-Test auf Self-Profile AnalystTab.
- **Kein Delete von dead hooks ohne grep**: `useTransactions`, `useTicketTransactions`, `getWildcardHistory` vor Delete nochmal greppen.
- **i18n DE + TR**: Alle neuen Labels in beiden Sprachen.
- **Self-Test**: Vor Push — interagieren, nicht nur screenshoten. Deep Link klicken, Filter umschalten, Load More, Public Profile öffnen.

---

## 1.7 Akzeptanzkriterien (Regressions-aware)

### AK1 — Self Profile Timeline Tab

```
GIVEN: Jarvis (jarvisqa) ist eingeloggt und öffnet /profile
WHEN:  Tab "Timeline" wird aktiviert (default je nach stärkster Dimension)
THEN:  Zeigt 15 Credits-Transaktionen + Tickets gemischt
  AND: Day Grouping (Heute/Gestern/Datum)
  AND: Filter "Trades" matched JETZT auch trade_buy/trade_sell (mehr Treffer als vorher)
  AND: Load More lädt weitere 20 beim Klick
  AND: AnalystTab Content Earnings Summe identisch wie VOR dem Fix (Regression-Check)
  AND NOT: Console Errors von meinem Code
  AND NOT: Stale Cache nach Trade (invalidate greift)
```

### AK2 — Public Profile Timeline Tab

```
GIVEN: Jarvis öffnet /profile/kemal2 (den er followed)
WHEN:  Tab "Timeline" wird aktiviert
THEN:  Zeigt kemal2's Transactions gefiltert auf PUBLIC_TX_TYPES (trades, ipo_buy, rewards, etc.)
  AND: RLS erlaubt Cross-User-Read für Public Types
  AND: Amounts negativ nur bei isSelf versteckt (UI-Regel bleibt)
  AND NOT: Private Types sichtbar (offer_lock, deposit, welcome_bonus)
  AND NOT: Komplett leer (wie VOR dem Fix)
  AND NOT: Console RLS-Error
```

### AK3 — Deep Link `/profile?tab=timeline`

```
GIVEN: Auf einem anderen Screen, Link zu /profile?tab=timeline wird geklickt
WHEN:  Page lädt
THEN:  ProfileView öffnet mit Tab "Timeline" direkt aktiv (nicht Default-Tab)
  AND: Gleiches Verhalten auf /profile/{handle}?tab=timeline
  AND: TraderTab "Alle Trades" Link (Zeile 272) funktioniert wieder
  AND NOT: Flackern oder Sprung zu einem anderen Tab
```

### AK4 — Cache Invalidation nach Trade

```
GIVEN: Jarvis hat 15 Transactions, Timeline Tab offen
WHEN:  Jarvis führt einen Trade aus (oder eine andere Tx-schreibende Aktion)
THEN:  Timeline zeigt neue Transaction innerhalb von max 1 Refetch-Zyklus
  AND NOT: Manueller Page-Reload nötig
```

### AK5 — Filter-Coverage Matching DB Reality

```
GIVEN: Ein User mit trade_buy, trade_sell, ipo_buy, streak_reward Transactions
WHEN:  Filter "Trades" ausgewählt
THEN:  Zeigt ALLE trade_buy + trade_sell + ipo_buy + buy + sell + offer_buy + offer_sell
  AND NOT: trade_buy oder trade_sell werden verpasst
  AND:     streak_reward erscheint NUR im Filter "Rewards", NICHT im Filter "Trades"
```

---

## SPEC GATE — Anil's Review

**Offene Fragen an Anil (3 A/B/C-Fragen):**

### Frage 1 — Scope der B3-Arbeiten

Was alles in B3 rein?

- **A) Minimal**: Nur P0 RLS Bug + P1 Type Drift fixen. TimelineTab bleibt im ProfileView. Deep Link + Dead Code + Cache-Invalidation in separatem Task.
- **B) Medium**: A + Deep Link Fix (`?tab=timeline`) + Cache Invalidation Fix + Dead Code Cleanup (`useTransactions`/`useTicketTransactions`/`getWildcardHistory` löschen, da alle dead).
- **C) Full**: B + Dedizierte `/transactions` Page + Wildcards Integration + CSV Export.

### Frage 2 — Public Profile Type-Visibility

Welche Types sollen auf fremden Profilen sichtbar sein?

- **A) Trading-Only**: Nur `trade_buy/sell`, `buy/sell`, `ipo_buy`, `offer_buy/sell` (klassisch "öffentliche Trading-Historie")
- **B) Trading + Achievements**: A + `mission_reward`, `streak_reward`, `bounty_reward`, `research_earning`, `tier_bonus`, `welcome_bonus` (zeigt Erfolge)
- **C) Alles außer Privates**: A + B ohne `deposit`, `offer_lock`, `offer_unlock` (Wallet-Operations bleiben privat)

### Frage 3 — Dead Code Entscheidung

Die 3 toten Services/Hooks (`useTransactions`, `useTicketTransactions`, `getWildcardHistory`):

- **A) Alle löschen** (inkl. Re-Exports in `queries/index.ts`)
- **B) `useTransactions`+`useTicketTransactions` wire'n** (useProfileData umstellen auf Query Hooks → kostet extra Arbeit, fixt aber Cache-Invalidation "richtig"), `getWildcardHistory` löschen
- **C) Alle lassen wie sie sind** (kein Cleanup im B3-Scope)

---

**Anil's Antwort: 1C Full, 2B + Fantasy Ranking, 3B Wire Hooks.**

---

## Ergänzende Discovery — Fantasy Ranking

- `lineups.rank`, `lineups.total_score`, `lineups.reward_amount` existieren.
- **`lineups` RLS ist bereits Cross-User-fähig:** `(user_id = auth.uid()) OR (locked = true)` — gescored Lineups sind public readable.
- `getUserFantasyHistory(userId, limit=10)` liefert `UserFantasyResult[]` (`eventId`, `eventName`, `gameweek`, `eventDate`, `totalScore`, `rank`, `rewardAmount`).
- **Jarvis Fixture:** 1 gescored Lineup — Event "Sakaryaspor Fan Challenge", GW 34, Rank 3, 487 Points, +25.000 CR reward.
- **In DB aktuell:** 0 Transactions mit type `fantasy_reward` vorhanden (Anomaly: Jarvis hat `reward_amount` in lineups, aber es wurde kein Tx geschrieben — alte Daten, RPC noch nicht durchgelaufen).

**Design-Entscheidung:** Fantasy-Ranking wird als **eigene Data-Source** im TimelineTab eingeflochten (analog zu ticketTransactions). Eine `UserFantasyResult`-Row zeigt: Rank-Badge, Score, Event-Name, Gameweek, Reward. Wenn später auch ein `fantasy_reward` Tx kommt, werden die per `event_id` dedupliziert (Fantasy-Row schluckt die Tx-Row mit gleichem reference_id).

---

## Ergänzende Discovery — Type Drift in `activityHelpers.ts`

`src/lib/activityHelpers.ts` kennt bereits `trade_buy/trade_sell`, `buy/sell`, `fantasy_reward`, `streak_bonus`, `deposit` etc. **ABER:**

- Code hat `streak_bonus` — DB hat `streak_reward` (6 rows) → **Drift**
- `tier_bonus` (107 rows in DB) — **nicht in activityHelpers**
- `welcome_bonus` (13 rows) — **nicht in activityHelpers**
- `offer_lock/unlock/buy/sell` (14 rows) — **nicht in activityHelpers**

Das heißt: 140 transactions werden mit default Icon/Color gerendert.

---

# PHASE 2: PLAN — Waves

### Wave-Übersicht

| Wave | Zweck | Files | Commit-worthy |
|------|-------|-------|--------------|
| **W1** | **Type SSOT + DB Migration (RLS + Backfill)** | 4 Files | ✅ |
| **W2** | **Query Hooks Wire + Cache Invalidation Fix** | 5 Files | ✅ |
| **W3** | **TimelineTab Type-Integration + Fantasy Ranking + Deep Link** | 7 Files | ✅ |
| **W4** | **Dedizierte `/transactions` Page + Sidebar Entry** | 6 Files | ✅ |
| **W5** | **CSV Export + Wildcards Hook + Dead Code Cleanup** | 5 Files | ✅ |

Jede Wave ist eigenständig shippbar. Jede Wave endet mit `tsc --noEmit` + betroffene Tests + Smoke Test. Max 10 Files pro Wave.

---

### Wave 1 — Type SSOT + DB RLS Migration

**Zweck:** Eine einzige Quelle für Transaction-Types, inklusive PUBLIC_TX_TYPES (Single Source of Truth). DB-RLS erweitert für Cross-User-Reads von Public Types.

#### Task 1.1 — New Type Module

**File:** `src/lib/transactionTypes.ts` (NEW)

Exportiert:
```ts
// Alle DB-Types aus Realität (14 bekannte + Reserve für Zukunft)
export const ALL_CREDIT_TX_TYPES = [
  'ipo_buy', 'tier_bonus', 'deposit',
  'trade_buy', 'trade_sell', 'buy', 'sell',  // legacy + new
  'welcome_bonus', 'offer_lock', 'offer_unlock', 'offer_buy', 'offer_sell',
  'streak_reward', 'streak_bonus',  // DB + legacy
  'mission_reward', 'bounty_reward', 'bounty_cost',
  'research_earning', 'research_unlock',
  'poll_earning', 'poll_vote_cost',
  'fantasy_reward', 'fantasy_join', 'entry_fee', 'entry_refund',
  'vote_fee', 'pbt_liquidation', 'tip_receive',
  'scout_subscription_earning', 'creator_fund_payout', 'ad_revenue_payout',
] as const;

// PUBLIC Whitelist (Anil's 2B + Fantasy Ranking)
export const PUBLIC_TX_TYPES = new Set<string>([
  // Trading (P1)
  'trade_buy', 'trade_sell', 'buy', 'sell', 'ipo_buy',
  'offer_buy', 'offer_sell',
  // Achievements (Anil 2B)
  'mission_reward', 'streak_reward', 'streak_bonus',
  'bounty_reward', 'research_earning',
  'tier_bonus', 'welcome_bonus',
  // Fantasy Ranking (Anil 2 zusatz)
  'fantasy_reward', 'fantasy_join',
  // Revenue (public earnings)
  'poll_earning', 'tip_receive',
  'scout_subscription_earning', 'creator_fund_payout', 'ad_revenue_payout',
  'pbt_liquidation',
]);

// Filter groups für TimelineTab UI
export const FILTER_TYPE_MAP = {
  trades: new Set(['trade_buy', 'trade_sell', 'buy', 'sell', 'ipo_buy', 'offer_buy', 'offer_sell']),
  fantasy: new Set(['fantasy_join', 'fantasy_reward', 'entry_fee', 'entry_refund']),
  research: new Set(['research_earning', 'research_unlock', 'mission_reward']),
  rewards: new Set([
    'bounty_reward', 'streak_reward', 'streak_bonus', 'poll_earning',
    'tip_receive', 'scout_subscription_earning', 'creator_fund_payout',
    'ad_revenue_payout', 'pbt_liquidation', 'tier_bonus', 'welcome_bonus',
  ]),
} as const;

export function isPublicTxType(type: string): boolean {
  return PUBLIC_TX_TYPES.has(type);
}
```

**Steps:**
1. Create file with exports above
2. `npx tsc --noEmit`

**DONE means:**
- [ ] File existiert
- [ ] tsc clean
- [ ] Export `PUBLIC_TX_TYPES`, `FILTER_TYPE_MAP`, `isPublicTxType` vorhanden

#### Task 1.2 — Extend `activityHelpers.ts` für fehlende Types

**File:** `src/lib/activityHelpers.ts`

**Steps:**
1. Hinzufügen in `getActivityIcon`, `getActivityColor`, `getActivityLabelKey`:
   - `streak_reward` → gleich wie `streak_bonus` (Flame / orange / streakReward)
   - `tier_bonus` → (Award / gold / tierBonus)
   - `welcome_bonus` → (Gift / emerald / welcomeBonus)
   - `offer_lock` → (Lock / amber / offerLock)
   - `offer_unlock` → (Unlock / sky / offerUnlock)
   - `offer_buy` → (CircleDollarSign / gold / offerBuy)
   - `offer_sell` → (CircleDollarSign / green / offerSell)
   - `fantasy_join` → (Trophy / purple / fantasyJoin)
   - `tip_receive` → (Coins / emerald / tipReceive)
   - `scout_subscription_earning` → (Users / gold / subscriptionEarning)
   - `creator_fund_payout` → (Coins / green / creatorPayout)
   - `ad_revenue_payout` → (Banknote / green / adRevenue)
2. `npx tsc --noEmit`

**DONE means:**
- [ ] Alle 14 DB-Types haben Icon + Color + Label-Key
- [ ] tsc clean
- [ ] Keine Änderung am bestehenden Mapping (nur Additions)

#### Task 1.3 — i18n Keys ergänzen (`messages/de.json` + `messages/tr.json`)

**Files:** `messages/de.json`, `messages/tr.json`

**Steps:**
1. Im `activity` namespace hinzufügen (beide Sprachen):
   ```json
   "streakReward": "Streak-Belohnung" / "Seri Ödülü",
   "tierBonus": "Tier-Bonus" / "Kademe Bonusu",
   "welcomeBonus": "Willkommensbonus" / "Hoşgeldin Bonusu",
   "offerLock": "Gebot gesperrt" / "Teklif kilitlendi",
   "offerUnlock": "Gebot freigegeben" / "Teklif açıldı",
   "offerBuy": "Gebot angenommen (Kauf)" / "Teklif kabul (Alım)",
   "offerSell": "Gebot angenommen (Verkauf)" / "Teklif kabul (Satış)",
   "fantasyJoin": "Fantasy beigetreten" / "Fantasy'e katıldı",
   "tipReceive": "Tipp erhalten" / "Bahşiş alındı",
   "subscriptionEarning": "Abo-Einnahme" / "Abonelik geliri",
   "creatorPayout": "Creator-Auszahlung" / "Yaratıcı ödemesi",
   "adRevenue": "Werbe-Einnahme" / "Reklam geliri"
   ```
2. i18n Linter laufen lassen (wenn vorhanden)

**DONE means:**
- [ ] Alle neuen Keys in DE + TR
- [ ] Keine Duplicates
- [ ] JSON valid

#### Task 1.4 — DB Migration: RLS Cross-User-Read für Public Types

**File:** `supabase/migrations/20260408190000_transactions_public_rls.sql` (NEW)

```sql
-- B3 Transactions History: Allow cross-user read for PUBLIC_TX_TYPES
-- Pattern: identisch zu activity_log feed RLS (20260408180000)

-- Drop old policy (owner-only)
DROP POLICY IF EXISTS transactions_select ON transactions;

-- Own rows: always visible
CREATE POLICY "transactions_select_own"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

-- Public types: visible to everyone (for public profile timeline)
CREATE POLICY "transactions_select_public_types"
ON transactions FOR SELECT
USING (
  type = ANY(ARRAY[
    -- Trading
    'trade_buy', 'trade_sell', 'buy', 'sell', 'ipo_buy',
    'offer_buy', 'offer_sell',
    -- Achievements
    'mission_reward', 'streak_reward', 'streak_bonus',
    'bounty_reward', 'research_earning',
    'tier_bonus', 'welcome_bonus',
    -- Fantasy
    'fantasy_reward', 'fantasy_join',
    -- Revenue
    'poll_earning', 'tip_receive',
    'scout_subscription_earning', 'creator_fund_payout', 'ad_revenue_payout',
    'pbt_liquidation'
  ])
);

COMMENT ON POLICY "transactions_select_public_types" ON transactions IS
  'B3 Transactions History — Public Profile Timeline (same pattern as activity_log feed RLS). Whitelist must match src/lib/transactionTypes.ts::PUBLIC_TX_TYPES.';
```

**NOTE:** `ticket_transactions` bleibt owner-only (Tickets sind private Economy-Detail). Kein Cross-User-Read.

**Steps:**
1. Create migration file
2. Apply: `mcp__supabase__apply_migration`
3. Verify: `SELECT policyname, cmd FROM pg_policies WHERE tablename='transactions'`

**DONE means:**
- [ ] Migration angewendet
- [ ] Jarvis kann kemal2's Trades sehen (Smoke Test mit SQL)
- [ ] Jarvis kann NICHT kemal2's deposits/offer_locks sehen

---

### Wave 2 — Query Hooks Wire + Cache Invalidation

**Zweck:** `useProfileData` verwendet raw fetches. Wir migrieren auf React Query Hooks. Invalidation wird prefix-basiert.

#### Task 2.1 — Update `useTransactions` Hook Signature

**File:** `src/lib/queries/misc.ts`

Hook akzeptiert `{ limit, offset }` optional, key inkludiert beide:
```ts
export function useTransactions(
  userId: string | undefined,
  opts: { limit?: number; enabled?: boolean } = {},
) {
  const { limit = 50, enabled = true } = opts;
  return useQuery({
    queryKey: qk.transactions.byUser(userId!, limit),
    queryFn: () => getTransactions(userId!, limit),
    enabled: !!userId && enabled,
    staleTime: 60_000, // 1 Min — Transactions sind append-only
  });
}
```

**DONE means:**
- [ ] tsc clean
- [ ] Hook Signature docs updated
- [ ] Backwards-compatible mit alter Signatur (nur `userId, limit`) via opts-Parameter

#### Task 2.2 — Add Ticket Transactions Hook Active Flag

**File:** `src/lib/queries/tickets.ts`

Hook akzeptiert `enabled` flag, für isSelf-Gating:
```ts
export function useTicketTransactions(
  userId: string | undefined,
  opts: { limit?: number; enabled?: boolean } = {},
) {
  const { limit = 50, enabled = true } = opts;
  return useQuery({
    queryKey: qk.tickets.transactions(userId!, limit),
    queryFn: () => getTicketTransactions(userId!, limit),
    enabled: !!userId && enabled,
    staleTime: 60_000,
  });
}
```

**DONE means:**
- [ ] tsc clean
- [ ] `enabled` Flag funktioniert (keine Fetches wenn false)

#### Task 2.3 — Fix Cache Invalidation (prefix-based)

**File:** `src/lib/queries/invalidation.ts`

Replace alle `qk.transactions.byUser(userId, 10)` mit prefix:
```ts
queryClient.invalidateQueries({ queryKey: ['transactions', userId], exact: false });
```

**Steps:**
1. 4 Stellen ändern (Zeilen 24, 43, 51, 96)
2. `npx tsc --noEmit`
3. Verify: `grep "qk.transactions.byUser(" src/` → nur noch in Hooks, nicht in Invalidation

**DONE means:**
- [ ] Alle 4 Stellen fixed
- [ ] Unit Test: `invalidateTradeQueries('p1', 'u1')` invalidiert sowohl `['transactions', 'u1', 10]` als auch `['transactions', 'u1', 50]`

#### Task 2.4 — Migrate `useProfileData` to Query Hooks

**File:** `src/components/profile/hooks/useProfileData.ts`

**Steps:**
1. Import `useTransactions`, `useTicketTransactions` from `@/lib/queries`
2. Ersetze `getTransactions` + `getTicketTransactions` in `Promise.allSettled` durch Query Hooks (außerhalb des useEffect, oben im Hook)
3. `publicTransactions` Berechnung auf `isPublicTxType()` aus SSOT umstellen
4. `transactions` state wird aus `useTransactions().data ?? []` derived, nicht mehr lokal
5. `ticketTransactions` analog
6. Retry-Logik: verwende `refetch()` von beiden Hooks statt `retryCount`
7. `loading` flag kombiniert `isLoading` von beiden Hooks + Rest der Promise.allSettled

**Constraints:**
- Alle anderen 9 Datenquellen (`getHoldings`, `getUserStats` etc.) bleiben raw in Promise.allSettled
- Zurückgegebene `ProfileDataResult` Interface bleibt invariant
- `retry()` funktioniert weiterhin

**DONE means:**
- [ ] tsc clean
- [ ] `useProfileData.test.ts` grün (mocks müssen ggf. angepasst werden)
- [ ] Smoke Test: Self-Profile lädt alle Tabs, Timeline zeigt Transactions
- [ ] Kein Delay/Flackern

#### Task 2.5 — Fix `PUBLIC_TX_TYPES` in useProfileData — use SSOT

**File:** `src/components/profile/hooks/useProfileData.ts`

Entferne lokale `const PUBLIC_TX_TYPES`, importiere aus `@/lib/transactionTypes`.

**DONE means:**
- [ ] `isPublicTxType` importiert
- [ ] `publicTransactions = useMemo(() => isSelf ? transactions : transactions.filter(tx => isPublicTxType(tx.type)), ...)`
- [ ] Keine hardcoded PUBLIC_TX_TYPES List mehr in useProfileData

---

### Wave 3 — TimelineTab Type-Integration + Fantasy Ranking + Deep Link

**Zweck:** TimelineTab nutzt SSOT. Fantasy Ranking als neue Data-Source. Deep Link `?tab=timeline` funktioniert.

#### Task 3.1 — TimelineTab auf SSOT umstellen

**File:** `src/components/profile/TimelineTab.tsx`

**Steps:**
1. Delete lokales `FILTER_TYPE_MAP`
2. Import `FILTER_TYPE_MAP` from `@/lib/transactionTypes`
3. Neuer Filter `fantasy` zu FILTERS list hinzufügen:
   ```ts
   { id: 'fantasy', labelKey: 'filterFantasy' }
   ```
   (existiert schon — aber wird nach Neudefinition breiter)
4. Sicherstellen dass alle 14 Types korrekt gerendert werden

**DONE means:**
- [ ] TimelineTab nutzt SSOT für Filter
- [ ] Filter "Trades" zeigt jetzt alle trade_buy/trade_sell Transactions
- [ ] tsc clean

#### Task 3.2 — Fantasy Ranking als Data-Source in TimelineTab

**File:** `src/components/profile/TimelineTab.tsx`

**Steps:**
1. Props erweitern:
   ```ts
   interface TimelineTabProps {
     transactions: DbTransaction[];
     ticketTransactions: DbTicketTransaction[];
     fantasyResults: UserFantasyResult[];  // NEW
     userId: string;
     isSelf: boolean;
   }
   ```
2. Neuer `TimelineRow` Variant:
   ```ts
   type TimelineRow =
     | { kind: 'credit'; ... }
     | { kind: 'ticket'; ... }
     | { kind: 'fantasy'; eventId: string; eventName: string; gameweek: number|null; rank: number; totalScore: number; rewardAmount: number; eventDate: string };
   ```
3. Convert `fantasyResults` zu TimelineRow[] via useMemo
4. **Dedup**: Wenn ein `fantasy_reward` Tx die gleiche `reference_id` (= eventId) hat wie ein Fantasy-Row → Fantasy-Row wins, Credit-Row wird verworfen
5. Rendering: Fantasy-Row zeigt Rank-Badge (🥇🥈🥉 für 1-3, "#N" sonst) + Score + Event-Name + Reward
6. Filter `fantasy` matched alle fantasy-Rows UND fantasy_reward/fantasy_join Credit-Rows

**Rendering-Design (Mobile-first):**
```
[Trophy Icon] Sakaryaspor Fan Challenge  [#3 🥉]
              GW 34 · 487 Punkte          +25.000 CR
              Vor 2 Tagen
```

**DONE means:**
- [ ] Fantasy Rows rendern korrekt
- [ ] Dedup funktioniert (keine doppelten Einträge)
- [ ] Rank Badge zeigt korrekte Farbe/Icon (gold=1, silber=2, bronze=3)
- [ ] Filter "Fantasy" matched beide Row-Types
- [ ] Public Profile zeigt Fantasy Results (RLS auf lineups erlaubt `locked=true` cross-user)

#### Task 3.3 — ProfileView passes fantasyResults to TimelineTab

**File:** `src/components/profile/ProfileView.tsx`

**Steps:**
1. `fantasyResults` aus `useProfileData` destructurieren (existiert schon)
2. An TimelineTab prop übergeben

**DONE means:**
- [ ] Prop-Drill funktioniert
- [ ] tsc clean

#### Task 3.4 — Deep Link Read auf Self-Profile

**File:** `src/app/(app)/profile/page.tsx`

**Steps:**
1. Import `useSearchParams` from `next/navigation`
2. Read `?tab=X` param
3. Pass `initialTab` prop to ProfileView
4. Wrap Page in Suspense (wegen useSearchParams requirement)

```tsx
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ProfileContent() {
  const { user, profile, loading } = useUser();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  // ...
  return <ProfileView targetUserId={user.id} targetProfile={profile} isSelf initialTab={initialTab ?? undefined} />;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
```

**DONE means:**
- [ ] `/profile?tab=timeline` öffnet Timeline direkt
- [ ] Default-Tab Logik bleibt wenn kein `?tab=` gesetzt
- [ ] Page in Suspense wrapped

#### Task 3.5 — Deep Link Read auf Public Profile

**File:** `src/app/(app)/profile/[handle]/page.tsx`

**Steps:** Analog zu 3.4 — useSearchParams + initialTab prop

**DONE means:**
- [ ] `/profile/kemal2?tab=timeline` öffnet Timeline direkt
- [ ] Existing Redirect-Logik (own handle → /profile) bleibt

#### Task 3.6 — ProfileView accept `initialTab` prop

**File:** `src/components/profile/ProfileView.tsx`

**Steps:**
1. Prop `initialTab?: string` hinzufügen
2. Pass down to `useProfileData`
3. useProfileData: Wenn `initialTab` valid → `setTab(initialTab)` statt strongestDimension

**File:** `src/components/profile/hooks/useProfileData.ts`
**File:** `src/components/profile/hooks/types.ts`

```ts
interface UseProfileDataParams {
  targetUserId: string;
  targetProfile: Profile;
  isSelf: boolean;
  initialTab?: string;  // NEW
}
```

Tab-Init:
```ts
if (!tabInitialized && stats) {
  const validTabs: ProfileTab[] = ['manager', 'trader', 'analyst', 'timeline'];
  if (initialTab && validTabs.includes(initialTab as ProfileTab)) {
    setTab(initialTab as ProfileTab);
  } else {
    setTab(getStrongestDimension(scores));
  }
  setTabInitialized(true);
}
```

**DONE means:**
- [ ] Prop propagiert korrekt
- [ ] Tab-Init-Logik respektiert initialTab
- [ ] tsc clean

#### Task 3.7 — Fix TraderTab "Alle Trades" Link

**File:** `src/components/profile/TraderTab.tsx:272`

**Steps:**
- Change `?tab=activity` → `?tab=timeline`

**DONE means:**
- [ ] Link zeigt jetzt auf gültigen Tab
- [ ] Visual check: Link sichtbar + clickbar

---

### Wave 4 — Dedizierte `/transactions` Page

**Zweck:** Eine eigene Page für die Full History — mehr Platz, Export-Button, Search, längerer Zeitraum.

#### Task 4.1 — New Route `/transactions/page.tsx`

**File:** `src/app/(app)/transactions/page.tsx` (NEW)

**Struktur:**
```tsx
'use client';
import { useUser } from '@/components/providers/AuthProvider';
import TransactionsPageContent from '@/components/transactions/TransactionsPageContent';

export default function TransactionsPage() {
  const { user, loading } = useUser();
  if (loading) return <Skeleton />;
  if (!user) return <SignInPrompt />;
  return <TransactionsPageContent userId={user.id} />;
}
```

**DONE means:**
- [ ] Route exists
- [ ] Auth-Guard
- [ ] tsc clean

#### Task 4.2 — New Component `TransactionsPageContent`

**File:** `src/components/transactions/TransactionsPageContent.tsx` (NEW)

**Features (beyond TimelineTab):**
- Header mit "Verlauf" Titel + Badge "Total: X"
- Aggregations-Cards (Spent / Earned / Net über Zeitraum)
- Date Range Picker (7d / 30d / 90d / All)
- Search by description
- Export Button (CSV — Wave 5)
- Reuse TimelineTab for display (oder neue größere Variant)

**Steps:**
1. Layout: max-w-[900px], header + stats grid + filter row + timeline body
2. Data: `useTransactions(userId, { limit: 200 })` + `useTicketTransactions(userId, { limit: 200 })`
3. Client-side filter by description search query
4. Client-side filter by date range (startDate...endDate)
5. Aggregations über gefilterte Rows

**DONE means:**
- [ ] Page rendert
- [ ] Filter funktionieren
- [ ] Search funktioniert
- [ ] Aggregations stimmen
- [ ] tsc clean

#### Task 4.3 — Sidebar/Navigation Entry to `/transactions`

**File:** `src/components/layout/SideNav.tsx` (or wherever the side nav lives)

**Steps:**
1. Find SideNav component (grep `SideNav`)
2. Add entry: Icon (Receipt) + Label "Transaktionen" + href `/transactions`
3. Position: nach Wallet/Profile, vor Settings

**DONE means:**
- [ ] Entry sichtbar in Desktop + Mobile SideNav
- [ ] Click navigiert zu Page
- [ ] i18n (DE + TR)

#### Task 4.4 — Wallet-Widget "Alle Transaktionen" Link

**File:** `src/components/profile/ProfileView.tsx` (Wallet Card, line 113)

**Steps:**
1. Unter dem "Einzahlen" Button (oder daneben): neuer Link "Alle Transaktionen →" zu `/transactions`
2. Nur für isSelf
3. i18n key `profile.allTransactions`

**DONE means:**
- [ ] Link sichtbar auf Self-Profile
- [ ] Navigation funktioniert
- [ ] i18n DE + TR

#### Task 4.5 — i18n für neue Page

**Files:** `messages/de.json`, `messages/tr.json`

Neuer namespace `transactions`:
```json
"transactions": {
  "title": "Transaktionsverlauf" / "İşlem Geçmişi",
  "subtitle": "Alle Credits-, Tickets- und Fantasy-Bewegungen",
  "range7d": "7 Tage" / "7 Gün",
  "range30d": "30 Tage" / "30 Gün",
  "range90d": "90 Tage" / "90 Gün",
  "rangeAll": "Gesamt" / "Tümü",
  "searchPlaceholder": "Beschreibung suchen…" / "Açıklama ara…",
  "totalEarned": "Eingenommen" / "Kazanılan",
  "totalSpent": "Ausgegeben" / "Harcanan",
  "net": "Netto" / "Net",
  "exportCsv": "Als CSV exportieren" / "CSV olarak indir"
}
```

**DONE means:**
- [ ] Keys in beiden Sprachen
- [ ] JSON valid

#### Task 4.6 — SideNav i18n

**Files:** `messages/de.json`, `messages/tr.json`

Add `nav.transactions` key (wenn nicht existiert).

---

### Wave 5 — CSV Export + Wildcards Hook + Dead Code Cleanup

#### Task 5.1 — CSV Export Function

**File:** `src/lib/exportTransactions.ts` (NEW)

```ts
import type { DbTransaction, DbTicketTransaction } from '@/types';

export function exportTransactionsToCsv(
  transactions: DbTransaction[],
  ticketTransactions: DbTicketTransaction[],
  filename = 'transactions.csv',
): void {
  const header = ['Date', 'Currency', 'Type', 'Amount', 'Balance After', 'Description', 'Reference'];
  const rows: string[][] = [];
  for (const tx of transactions) {
    rows.push([tx.created_at, 'Credits', tx.type, String(tx.amount), String(tx.balance_after), tx.description ?? '', tx.reference_id ?? '']);
  }
  for (const tx of ticketTransactions) {
    rows.push([tx.created_at, 'Tickets', tx.source, String(tx.amount), String(tx.balance_after), tx.description ?? '', tx.reference_id ?? '']);
  }
  rows.sort((a, b) => b[0].localeCompare(a[0]));
  const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**DONE means:**
- [ ] Pure function, no React
- [ ] Handles quotes in descriptions (CSV escape)
- [ ] Sorted by date desc

#### Task 5.2 — Wire Export Button in TransactionsPageContent

**File:** `src/components/transactions/TransactionsPageContent.tsx`

Button triggers `exportTransactionsToCsv(transactions, ticketTransactions, 'bescout-transactions.csv')`.

**DONE means:**
- [ ] Button sichtbar
- [ ] Click lädt CSV
- [ ] File hat korrekte Daten

#### Task 5.3 — Wildcards Hook (lebendig für zukünftige Nutzung)

**File:** `src/lib/queries/misc.ts` (or dedicated file)

```ts
import { getWildcardHistory } from '@/features/fantasy/services/wildcards';
export function useWildcardHistory(userId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['wildcards', userId, limit],
    queryFn: () => getWildcardHistory(userId!, limit),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
```

**NOTE:** Da wildcard_transactions Table leer ist, wird das Ergebnis `[]` sein. Die Integration in Timeline ist **nicht Teil von B3** — nur der Hook existiert für zukünftiges Wiring.

**DONE means:**
- [ ] Hook existiert
- [ ] Export aus `queries/index.ts`
- [ ] tsc clean

#### Task 5.4 — Dead Code Delete

**Files:**
- `src/lib/queries/index.ts` — Check welche Re-Exports noch tot sind
- NICHT löschen: `useTransactions`, `useTicketTransactions` (sind jetzt wired!)
- NICHT löschen: `getWildcardHistory` (Hook wired in 5.3)

**Action:** Grep final check dass nichts dead ist. Wenn doch → löschen.

#### Task 5.5 — Verify `.claude/rules/profile.md` Consistency

**File:** `.claude/rules/profile.md`

Update PUBLIC_TX_TYPES section: Verweise auf SSOT `src/lib/transactionTypes.ts` statt hardcoded Liste.

---

## PLAN GATE

- [x] Jede Wave eigenständig shippbar?
- [x] Max 10 Files pro Wave?
- [x] Move und Change getrennt (W1=SSOT+DB, W2=Hooks, W3=Consumers)?
- [x] Jeder Task hat "DONE means" Checkliste?
- [x] Agent-Tasks vollständig spezifiziert (in diesem Plan keine Agent-Tasks — alle Tasks haben architektonische Entscheidungen)?
- [ ] **Anil reviewed und abgenommen** → dann GO.

---

## EXECUTE (ab hier wenn Anil "go" gibt)

**Reihenfolge:**
1. W1 → `npx tsc --noEmit` → commit `feat(db): transactions public RLS + type SSOT`
2. W2 → `npx tsc --noEmit` + test `useProfileData.test.ts` → commit `refactor(profile): wire transaction query hooks + prefix invalidation`
3. W3 → tsc + smoke test ProfileView → commit `feat(timeline): fantasy ranking + SSOT types + deep link`
4. W4 → tsc + smoke `/transactions` → commit `feat(transactions): dedicated history page`
5. W5 → tsc + full vitest run → commit `feat(transactions): csv export + wildcards hook`
6. Live QA als jarvis-qa (Service Worker clear!)
7. Push
8. AutoDream Run

