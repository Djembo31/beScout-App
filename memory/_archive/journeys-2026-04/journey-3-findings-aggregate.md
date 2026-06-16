---
name: Journey 3 — Aggregated Findings
description: Synthese aus 3 parallel Audits (Frontend/Backend/Business) fuer Sekundaer-Trade. Autonom-Fixable vs CEO-Approval-Triggers.
type: project
status: ready-for-healer
created: 2026-04-14
---

# Journey #3 — Aggregated Findings (Sekundaer-Trade)

**Total: 62 Findings — 11 CRITICAL + 21 HIGH + 21 MEDIUM + 9 LOW**

Quellen: [journey-3-frontend-audit.md](journey-3-frontend-audit.md) (27), [journey-3-backend-audit.md](journey-3-backend-audit.md) (21), [journey-3-business-audit.md](journey-3-business-audit.md) (14)

**Verteilung nach Audit:**
- Frontend: 5C + 8H + 10M + 4L
- Backend: 4C + 8H + 6M + 3L
- Business: 2C + 5H + 5M + 2L

---

## Cross-Audit Overlaps (doppelt/dreifach gefunden = hoch konfident)

| Bug | FE | BE | Business |
|-----|----|----|----------|
| i18n-Key-Leak Sell/Order-Errors (sellError, placeBuyOrder) | J3F-01 | J3B-12 (teilweise) | B7 |
| Liga-Logo-Gap TradingCardFrame+Hero+PlayerRow | J3F-02..05 | — | — |
| Modal ohne preventClose (3x) | J3F-06..08 | — | — |
| TradingDisclaimer fehlt BuyOrderModal | J3F-09 | — | B5 |
| Hardcoded "Credits"/"CR" in Sekundaer-Flow | J3F-14, 15, 16 | — | B8, B9 |
| Fee-Breakdown fehlt in Sekundaer-UI | J3F-21 | — | B5, B14 |
| Investment-Wording "Marktwert steigt → Reward" | — | — | B1, B2, B11 |
| Migration-Drift (RPCs ohne Source) | — | J3B-02 | — |
| Cross-User-Read RLS (anon readable) | — | J3B-04, J3B-08 | — |

---

## Autonome Beta-Gates (Healer jetzt, kein CEO noetig)

### Group A — P0 Money-Safety & i18n

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-01 | CRITICAL | `useTradeActions.ts:handleSell, handleCancelOrder` | `mapErrorToKey(normalizeError(result.error))` + `te(key)` — genauso wie handleBuy (J2-Fix) | J3F-01, B7 |
| FIX-02 | HIGH | `src/lib/services/trading.ts:163, 457-461` | `throw new Error('maxPriceExceeded')` + `throw new Error('invalidQuantity'/'invalidPrice')` statt Raw-DE/EN-Strings | B7, B8 |
| FIX-03 | HIGH | `BuyModal.tsx:177` | `preventClose={buying \|\| ipoBuying}` | J3F-06 |
| FIX-04 | HIGH | `SellModal.tsx:76` | `preventClose={selling \|\| cancellingId !== null \|\| acceptingBidId !== null}` | J3F-07 |
| FIX-05 | HIGH | `LimitOrderModal.tsx:36` | Kommentar `// TODO preventClose wenn live` + feature-flag check | J3F-08 |
| FIX-06 | HIGH | `BuyOrderModal.tsx` footer | `<TradingDisclaimer variant="inline" />` + Fee-Breakdown 3.5/1.5/1 einblenden | J3F-09, B5 |
| FIX-07 | HIGH | `BuyModal.tsx:306-311` | Fallback `t('anonSeller')` statt UUID-Fragment | J3F-11 |

### Group B — P1 Multi-League Liga-Logos (als eigener Healer-PR bundeln)

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-08 | CRITICAL | `TradingCardFrame.tsx:213-239` Front TopBar | `<LeagueBadge size="xs" logoUrl={leagueLogoUrl} short={leagueShort} />` zwischen Club-Logo und Flag+Age | J3F-02 |
| FIX-09 | CRITICAL | `TradingCardFrame.tsx:392-444` Back | Liga-Header unter `scoutCardData`-Label (logo + leagueShort) | J3F-03 |
| FIX-10 | CRITICAL | `PlayerHero.tsx:199-214` | `<LeagueBadge logoUrl={leagueLogoUrl} short={leagueShort} />` zwischen Club und Position | J3F-04 |
| FIX-11 | CRITICAL | `TransferListSection.tsx:184-241` | LeagueBadge inline nach PlayerIdentity ODER PlayerIdentity um Liga-Support erweitern (Impact-Check!) | J3F-05 |
| FIX-12 | CRITICAL | Props-Propagation | Props durchreichen: `PlayerContent` → `PlayerHero`/`TradingCardFrame` inkl. `league`, `leagueShort`, `leagueLogoUrl` | Cross |

### Group C — Polish & UX

| ID | Severity | File | Fix | Ursprung |
|----|----------|------|-----|----------|
| FIX-13 | HIGH | `MarktplatzTab.tsx:112` | `min-w-0 flex-1` — DONT-List #1 | J3F-12 |
| FIX-14 | HIGH | `SellModal.tsx:42,96-101` | Parent-Pattern: handleSell Callback → parent setzt `trading.sellSuccess` → prop weitergereicht | J3F-13 |
| FIX-15 | HIGH | `TransferBuySection.tsx` | File loeschen + Barrel-Export aufraeumen nach grep-Verify (0 Consumer) | J3F-10 |
| FIX-16 | HIGH | `BuyModal.tsx:134-142` | Cleanup-Token: `let cancelled=false; return () => { cancelled=true; clearTimeout(t) }` | J3F-24 |
| FIX-17 | MEDIUM | `BuyOrderModal.tsx:166`, `MobileTradingBar.tsx:36`, `TradingCardFrame.tsx:407,417` | Shared i18n-Key `market.creditsSuffix` + `market.creditsShort` (DE: Credits/CR, TR: Kredi/CR) | J3F-14, 15, 16, B9 |
| FIX-18 | MEDIUM | `BestandView.tsx:325` | `t('playerCount', { count: sorted.length })` DE+TR mit plural | J3F-17 |
| FIX-19 | MEDIUM | `BestandPlayerRow.tsx:73` | `p.last.toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : locale)` | J3F-18 |
| FIX-20 | MEDIUM | `TradingCardFrame.tsx:488` | `tp('cardBack.noMatchData')` | J3F-19 |
| FIX-21 | MEDIUM | `OffersTab.tsx:103` + `src/lib/constants.ts` | Export `OFFER_FEE_BPS = 300` + import + nutzen | J3F-20 |
| FIX-22 | MEDIUM | `SellModal.tsx:70-73,254-269` | Analog BuyConfirmModal: `feeBreakdownPlatform`/`Pbt`/`Club` rendern | J3F-21, B14 |
| FIX-23 | MEDIUM | `TradingTab.tsx:345-349`, `OrderDepthView.tsx:385-391` | `<SkeletonCard />` statt `<Loader2 />` (Pattern-Konsistenz) | J3F-22, 23 |
| FIX-24 | HIGH | `trading.ts:149,197` | Kommentar-Sanitization "DPCs" → "SCs" | J3B-19 |

**Total: 24 autonome Fixes** (10 CRITICAL + 8 HIGH + 6 MEDIUM). Healer kann das in 2 Parallel-Worktrees erledigen:
- **Healer FE-P0:** FIX-01, 03-07 (Money-Safety + i18n + Modal-Safety)
- **Healer FE-P1:** FIX-08..12 (Multi-League Liga-Logos mit Props-Propagation)
- **Healer FE-P2 (optional oder serial):** FIX-13..24 (Polish)

---

## CEO-Approval-Triggers (siehe journey-3-ceo-approvals-needed.md)

| ID | Trigger | Severity | Item |
|----|---------|----------|------|
| **AR-11** | Architektur-Lock-In + Geld | CRITICAL | `place_buy_order` Matching-Engine: 10 Buy-Orders seit 26d tot (J3B-01). Option A: fill_buy_orders RPC, Option B: UI-Disclaimer, Option C: Feature aus Beta |
| **AR-12** | External Systems + Audit | CRITICAL | Migration-Backfill 7 RPCs (accept_offer, cancel_order, liquidate_player, create_offer, counter_offer, cancel_offer_rpc, reject_offer) — identisch J1-AR-1 / J2B-01 Pattern (J3B-02) |
| **AR-13** | Geld-Migration | CRITICAL | 707 Phantom-SCs in 30 Bot-Accounts ueber 137 Spieler, Supply-Invariant broken. Option A: ipo_purchases nachtragen, Option B: known-issues, Option C: Seed-Script fixen (J3B-03) |
| **AR-14** | Externe Systeme (RLS) | CRITICAL | Anon-Read `transactions` (949 rows, balance_after leak) + `orders` (343 rows). P0 Privacy: transactions own-all, orders Policy-Review (J3B-04) |
| **AR-15** | Compliance-Wording | CRITICAL | B1: `rewardsIntro` "am Erfolg beteiligen" + B2: `introPortfolioDesc` "Handle clever, Marktwert steigt → Fee steigt". Woertliche Gewinnbeteiligung, SPK/MiCA-Red-Flag |
| **AR-16** | Compliance-Wording | HIGH | "Spieler kaufen" in 5 Message-Keys (Welcome, Onboarding, Kader, Empty-States, DE+TR). Ownership ueber Personen suggeriert (B3) |
| **AR-17** | Compliance-Architektur | HIGH | business.md Erweiterung: Kapitalmarkt-Glossar (Orderbuch → Angebots-Tiefe, Trader → Sammler, Portfolio-als-Invest, Handle clever, am Erfolg beteiligen). CI Regex-Guard Pre-Commit |
| **AR-18** | Geld-RPC | HIGH | Circular-Trade-Guard zu aggressiv (7d-Window). Option: 24h, Threshold >=2, Alt-User-Exception (J3B-05) |
| **AR-19** | Geld-RPC | HIGH | `buy_player_sc` 1-SC-Limit hardcoded — legacy Guard, blockt Bulk-Buys bei Veteranen (J3B-06) |
| **AR-20** | Geld/Analytics | HIGH | 529 Orphan `ipo_id` in trades (70% IPO-Linkage kaputt). Option: Backfill SET NULL, ON DELETE SET NULL verifizieren, IPO-Archive statt Delete (J3B-11) |
| **AR-21** | Geld-RPC | MEDIUM | `get_price_cap` Fallback 100k SC fuer neue Spieler ohne reference_price — Manipulation-Vector (J3B-15) |
| **AR-22** | Compliance-TR | HIGH | Alle Trading-RPCs haben hardcoded DE-Errors. TR-User kriegt DE. Option A: RPC throwt Keys, Option B: mapRpcError erweitern (J3B-12) |
| **AR-23** | Compliance + Architektur | HIGH | LimitOrderModal Placeholder-UI ohne Disclaimer, ohne GeoGate. Feature-flag oder finalize (B6) |
| **AR-24** | Externe Systeme (RLS) | HIGH | `trades` public-readable ohne whitelist-Pattern — `buy_order_id`/`sell_order_id` preisgegeben (J3B-08) |
| **AR-25** | UX-Polish | MEDIUM | Seller-Notification Race-Dedup via reference_id/trade_id (J3B-17) |

**15 CEO-Approval-Triggers** — davon 5 CRITICAL (AR-11..15), 8 HIGH, 2 MEDIUM.

---

## Post-Beta (nicht Beta-Blocker)

### Frontend
- J3F-25 (PlayerHero Alert-Display hardcoded "CR")
- J3F-26 (SellModal Preset-Buttons +20% Mobile-Label)
- J3F-27 (WatchlistView Sort-Label "Name" hardcoded)

### Backend
- J3B-13 (Rate-Limit Scope nur per player, nicht global)
- J3B-14 (velocity_guard_check_24h OR buyer+seller count)
- J3B-16 (getUserTrades AbortSignal + FK-Join Pattern)
- J3B-18 (transactions.type CHECK constraint Doku)
- J3B-20 (Activity-Log fire-and-forget kein Retry)
- J3B-21 (cancel_buy_order kein Audit-Log)

### Business
- B13 ("Trader" Rolle in Onboarding-Intro — LOW)
- B14 (BuyConfirmation Fee-Breakdown fehlt — LOW, nur Own-Orders-Branch)

**Journey-uebergreifend:**
- Player-Detail Page `/player/[id]` kein GeoGate (Defense-in-Depth reicht, aber UX-degraded TR)

---

## VERIFIED OK (Live-DB 2026-04-14)

| Check | Beweis |
|-------|--------|
| Secondary Fee-Split 3.5/1.5/1% | 350.16 / 149.83 / 99.86 bps ueber 68 Trades |
| Escrow-Invariant | walletsLocked=5000c, expectedLocked=5000c, drift=0 |
| Zero phantom-mint-trades | 0 rows (null_seller + null_ipo) |
| Zero-Price Exploit | 0 Trades mit price=0 |
| Negative Holdings | 0 |
| Overfilled Orders | 0 |
| Negative Wallet Balance | 0 |
| RLS Anon INSERT blocked | holdings/wallets/trades |
| RLS Anon SELECT holdings | blocked |
| RLS Anon SELECT wallets | blocked |
| Auth-UID Guard 4 RPCs | active |
| Liquidation Guard 4 RPCs | active |
| Club-Admin Restriction | active |
| Price-Cap Check | active (mit AR-21 Fallback-Gap) |
| Own-Order-Reject | active |
| Advisory-Lock Pattern | 3 RPCs |
| forbidden-words (hard) im Market-Code | 0 Treffer |
| Geofencing TR = TIER_RESTRICTED | dpc_trading=false, GeoGate greift |
| Disclaimer-Coverage | 10/13 Trade-UIs haben Disclaimer (3 Luecken B4/B5/B6) |
| J2 i18n-Key-Leak Fix (handleBuy) | wirkt via mapErrorToKey |
| RPC-Rename buy_player_sc | Alias-Pattern live |

---

## LEARNINGS (Drafts, Reviewer promoten)

1. **i18n-Key-Leak propagiert auf Sekundaer-Seite:** J2 hat nur `handleBuy` gefixt, `handleSell`/`handleCancelOrder`/`placeBuyOrder` sind offen geblieben. common-errors.md-Erweiterung: **Nach swallow→throw-Refactor alle Consumer-Pfade greppen, nicht nur den direkt betroffenen**.
2. **Multi-League Props-Propagation ist systematisch:** TradingCardFrame bekommt `club` durchgereicht, aber NICHT `league`/`leagueLogoUrl`/`leagueShort`. Gleiches Pattern zu erwarten bei anderen Player-Components. Audit-Signal: Neue Player-Feld-Ergaenzungen IMMER downstream greppen (PlayerHero, Cards, Lists).
3. **"Spieler kaufen"-Systemfehler ist grundlegend:** 5 Keys — das ist nicht String-Drift, das ist Produkt-Sprache-Grundfehler. Glossary-Entry in business.md PFLICHT.
4. **Kapitalmarkt-Terminologie Regel:** AR-7 (IPO → Erstverkauf) muss erweitert werden um Orderbuch, Trader, Portfolio-als-Invest, Handle clever, am Erfolg beteiligen. Als "Kapitalmarkt-Glossar"-Section in business.md.
5. **Placeholder-UI = Compliance-Risiko:** LimitOrderModal ist nur `setSubmitted(true)` Mock, aber Securities-Optik + kein Disclaimer + kein GeoGate = Triple-Red-Flag. Regel: Mock-UI = Feature-flag OR finalize OR delete.
6. **Migration-Drift ist Wiederholungstaeter:** J1-AR-1, J2B-01, J3B-02. Drei Journeys, drei Mal dasselbe Pattern. CEO-Approval fuer **systematischen Backfill-Scan** aller public-Functions (nicht per-Journey).
7. **Buy-Order Matching-Engine Feature-Leak:** UI komplett fertig, RPC erstellt Order-Row, Escrow lockt — aber KEIN Match. 10 tote Orders seit 26d. Audit-Signal: Feature mit Multi-Step-Transaction (lock → match → execute) — alle Steps existent? oder Placeholder?
8. **Phantom-Supply durch Seed-Script:** Seed-Script schreibt Holdings OHNE ipo_purchases-Parent. Jeder Trade von diesen Bots mintet weiter Supply. Hard Rule: **Jeder Holdings-INSERT muss ipo_purchases-Parent haben** (Foreign-Key-like, aktuell kein DB-Constraint).
9. **Investment-Framing-Stack:** B1+B2+B11+B13 sind Varianten desselben "Marktwert → Belohnung → Sammler"-Narrativs. CI Regex-Guard `grep -i "Marktwert steigt\|am Erfolg beteilig\|Handle clever\|Portfolio ausbauen"` in Pre-Commit.
10. **Cross-User-Read RLS (drittes Mal):** `activity_log` (B2), `transactions` (B3 — war damals gefixt, aber jetzt `transactions.balance_after` wieder anon-readable), `orders`. Pattern: Nach JEDER neuen Tabelle `SELECT policyname, cmd FROM pg_policies WHERE tablename = X` + `anon_client.from(X).select()` verifizieren.

---

## Recommended Healer-Strategie

**Parallel 2 Worktrees:**

**Healer FE-P0 (Worktree A) — Money-Safety + i18n:**
- FIX-01 (i18n-Key-Leak Sell)
- FIX-02 (Service-Error-Keys)
- FIX-03, 04, 05 (preventClose × 3)
- FIX-06 (BuyOrderModal Disclaimer + Fee-Breakdown)
- FIX-07 (Anon-Seller Fallback)
- Danach: FIX-13, 14, 15, 16 (UX-Polish Money-Safety-adjacent)

**Healer FE-P1 (Worktree B) — Multi-League Liga-Logos:**
- FIX-08..12 (TradingCardFrame Front+Back, PlayerHero, TransferListSection, Props-Propagation)
- Impact-Check fuer `PlayerIdentity` (shared) vs inline
- Danach Barrel-Exports pruefen

**Healer FE-P2 (seriell nach P0/P1):**
- FIX-17..24 (Polish: Credits/CR-Keys, playerCount, toLocaleUpperCase, noMatchData, OFFER_FEE_BPS, SellModal-Breakdown, Skeletons, DPCs-Kommentare)

**CEO-Approvals:**
- 15 Items in `journey-3-ceo-approvals-needed.md` sammeln
- Auf CEO-Session warten (analog J2-Schnellbahn)

**Reviewer-Pass:**
- Nach Healer-Merges in main: cto-review Skill auf alle Commits
- Pruefung gegen common-errors.md (gerade neue Patterns aus Learning 1, 2, 10)
