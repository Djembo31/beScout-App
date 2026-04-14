---
name: Journey 3 — CEO Approvals Needed
description: 15 Items aus J3 Sekundaer-Trade Audits die 4 Approval-Triggers beruehren (Geld-Migration, Compliance-Wording, Architektur-Lock-In, Externe Systeme). CEO-Decision erforderlich vor Execution.
type: project
status: pending-ceo-review
created: 2026-04-14
owner: CEO (Anil)
---

# Journey #3 — CEO Approval-Triggers

**15 Items** aus J3 Sekundaer-Trade Audits: 5 CRITICAL + 8 HIGH + 2 MEDIUM.

**Beta-Status:**
- ✅ J3 Phase 2 Autonome Fixes: 12 Fixes durch (FIX-01..12 + FIX-24), Commits `22467fa` + `10df6cf` + Merge `32f2643`, Reviewer PASS, tsc + vitest gruen (97 Tests).
- 🔴 15 Items brauchen CEO-Decision bevor sie live gehen koennen.

Die Items gruppieren sich nach Approval-Trigger aus `operation-beta-ready.md`:

---

## 1. Geld-relevante DB-Migrations (4 Items)

### AR-11 — `place_buy_order` Matching-Engine (CRITICAL, Beta-Blocker)

**Problem:** `place_buy_order` lockt Geld (escrowed in `wallet.locked_balance`), erstellt Order-Row — **aber KEIN Matching-Engine** gegen existierende Sell-Orders. Live: 10 Buy-Orders seit 26 Tagen offen, 0 Fills.

**Beta-Impact:** Beta-User platziert Kaufgesuch @ 100k, Floor ist 50k, er erwartet Auto-Match → nichts passiert → Geld locked → Frustration → Support-Ticket.

**CEO-Optionen:**
- **A (korrekt, M-Aufwand):** `fill_buy_orders_for_player(p_player_id UUID)` RPC, AFTER INSERT TRIGGER auf orders. Match by price-priority: lowest-sell-price ≤ max-buy-price. ~3 Tage Aufwand.
- **B (quick):** UI-Disclaimer "Kaufgesuche werden NICHT automatisch gematcht". Feature bleibt sichtbar aber user-informed.
- **C (Beta-Scope):** `BuyOrderModal` + `usePlaceBuyOrder` komplett aus Beta entfernen. Feature zurueck, bis Matching-Engine steht.

**Empfehlung (CTO):** **C fuer Beta-Launch** (schnellster Weg, reinste UX), **A post-Beta** (Feature wirklich fertig machen). **B ist Half-Baked** — User sehen Feature ohne Wert.

---

### AR-12 — Migration-Backfill 7 Trading/Offer/Liquidation RPCs (CRITICAL)

**Problem:** 7 public RPCs live OHNE Source-File im Repo:
- `accept_offer`, `cancel_order`, `liquidate_player`, `create_offer`, `counter_offer`, `cancel_offer_rpc`, `reject_offer`

Rollback/DR broken. Neue Developer koennen Bodies nicht reviewen. NULL-Guards, Fee-Splits, CHECK Constraints = Audit-Blindspot.

**Drittes Auftreten des Patterns:** J1-AR-1 (Onboarding RPCs), J2B-01 (IPO-RPCs), jetzt J3B-02 (Offer/Liquidation).

**CEO-Optionen:**
- **A (empfohlen):** CTO dumped via `mcp__supabase__execute_sql(pg_get_functiondef)` alle 7 Bodies. Migration `20260414170000_backfill_offer_liquidation_rpcs.sql`. NO-OP Migration (Body bereits live). ~45 Min.
- **B:** Systematischer Scan ALLER public-Functions (nicht nur 7) — Full-Sweep einmal. ~2h. **Bessere Loesung** weil nachhaltig, aber groesserer Scope.

**Empfehlung (CTO):** **B Full-Sweep** — Pattern ist Wiederholungstaeter, Problem final loesen. Danach als Regel in `database.md`: "Vor JEDEM `CREATE OR REPLACE FUNCTION` auf Live-DB muss Source im Repo sein."

---

### AR-13 — 707 Phantom-SCs in Bot-Accounts (CRITICAL, Supply-Invariant broken)

**Problem:** 30 Seed-Bot-Accounts halten 707 SCs ohne ipo_purchases-Parent. 137 Spieler mit `held > sold_via_ipos`. Jeder Trade von diesen Bots mintet weiter Supply.

**Top Spieler mit Phantom:**
- Muhammed Tiren: +72 SCs
- Ali Arda Yıldız: +25 SCs
- Giovanni Crociata: +21 SCs
- Cemil Berk Aksu: +21 SCs
- Mehmet Demirözü: +19 SCs

**Holder:** bot001..bot030 + jarvisqa.

**CEO-Optionen:**
- **A (korrekt):** Script ueber alle 30 Bot-Holdings → pro Phantom-Holding INSERT INTO trades(ipo_id=seed_ipo, buyer_id=bot, seller_id=NULL, quantity). Backfill macht Invariant gruen. ~1h. **Macht Money-Invariant echt gruen.**
- **B:** Ignorieren + in `beta-known-issues.md` dokumentieren. Bot-Trades werden als phantom-mint markiert.
- **C:** Seed-Script fixen → Script muss IMMER INSERT INTO ipo_purchases BEFORE INSERT INTO holdings. Verhindert Phantom in Zukunft aber fixt bestehenden Bestand nicht.

**Empfehlung (CTO):** **A + C kombiniert**. A fixt aktuellen Bestand, C verhindert Rueckfall. Bot-Accounts bleiben post-Beta aktiv (CEO-Decision Journey #2), daher Invariant wichtig.

**Verbindung zu J2-Q4:** Test-Accounts bleiben waehrend Beta fuer Markt-Belebung. Bots sind Teil des Pools. Phantom-SCs werden nicht bemerkt von Beta-User, aber **Money-Invariant ist fundamentales Kundenversprechen**.

---

### AR-14 — Anon-RLS-Leak `transactions` + `orders` (CRITICAL, P0 Privacy)

**Problem:**
- `transactions`: 949 rows anon-readable → **`balance_after` privacy leak**. Andere User koennen Wallet-Historie jedes Users rekonstruieren.
- `orders`: 343 rows anon-readable → Market-Transparenz OK aber user_ids exposed.

**Beweis (Live-DB):**
```ts
const anon = createClient(url, anonKey);
await anon.from('transactions').select('balance_after, user_id').limit(5);
// → 5 rows returned (KEIN Error)
```

**CEO-Optionen:**
- **A (P0 fuer transactions):** Drop public SELECT policy. Only `auth.uid() = user_id` allowed. ~15 Min Migration.
- **B (orders):** Entweder Transparenz beibehalten (intentional dokumentieren) oder whitelist-Pattern (own-all + public-whitelist ohne user_id).
- **C Full RLS-Audit:** Alle Feed/Social-Tabellen nach `activity_log` Pattern (2026-04-08, J2 B3) auditen.

**Empfehlung (CTO):** **A + B-beibehalten + C als Full-Sweep**. `transactions` ist klar, `orders` kann public bleiben (Market-Transparenz), `trades` braucht public-whitelist (J3B-08 AR-24).

---

## 2. User-Facing Compliance-Wording (5 Items)

### AR-15 — Investment-Signal in Reward-Strings (CRITICAL, SPK/MiCA-Red-Flag)

**Problem (B1 + B2):** Zwei Beta-sichtbare Strings enthalten **woertliche Gewinnbeteiligung**:

**B1** — `messages/de.json:4248` `rewardsIntro`:
> DE: "Je hoeher der Marktwert von {player} steigt, desto hoeher die moegliche Belohnung als Scout Card Holder. Der Verein kann dich am Erfolg beteiligen."
> TR analog mit "başarıya ortak edebilir"

→ "am Erfolg beteiligen" / "başarıya ortak etmek" = **woertlich Gewinnbeteiligung**, triggert SPK (TR) + BaFin/MiCA (EU) als qualifiziertes Finanzinstrument.

**B2** — `messages/de.json:4528` `introPortfolioDesc`:
> DE: "Kaufe Scout Cards am Marktplatz. Wenn der Marktwert steigt, steigt deine Community Success Fee. Handle clever und baue dein Portfolio aus."
> TR: "...Akıllıca işlem yap ve portföyünü büyüt."

→ Trading-Pitch im Onboarding, gesehen VOR der ersten Trade-Aktion.

**Fix-Vorschlag (CTO):**

**B1:**
- DE: *"Die Hoehe moeglicher Community Success Fees haengt von der Markt-Bewertung ab. Auszahlung nach alleinigem Ermessen des Vereins, kein Anspruch, keine Garantie."*
- TR: *"Topluluk Başarı Ücretlerinin miktarı piyasa değerine bağlıdır. Ödeme kulübün takdirindedir, hak talebi veya garanti yoktur."*

**B2:**
- DE: *"Sammle Scout Cards deiner Lieblingsspieler. Der Verein kann Scout Card Holder an Meilensteinen des Spielers mit einer optionalen Community Success Fee belohnen — nach alleinigem Ermessen, kein Anspruch."*
- TR analog.

**CEO-Approval:** Text-Vorschlag approven oder alternative Formulierung. **Beta-Blocker.**

---

### AR-16 — "Spieler kaufen" Wording-Fix (HIGH)

**Problem (B3):** 5 Message-Keys sagen user-facing "Spieler kaufen" / "Oyuncu satın al" (Ownership ueber Personen):
- `welcomeBuyPlayers`
- `buyFirstPlayer`
- `buyPlayer`
- `kaderBuyPlayers`
- `buyDpc` (bereits "Scout Card kaufen" — Inkonsistenz)

**Fix-Vorschlag:** Alle 5 Keys DE + TR auf "Scout Card kaufen" / "Scout Card al" (wie `buyDpc` bereits macht).

**CEO-Approval:** Wording approven (trivial, aber 5 Keys × 2 Sprachen = 10 Touch-Points + UI-Render-Checks).

---

### AR-17 — business.md Kapitalmarkt-Glossar erweitern (HIGH, Architektur)

**Problem:** AR-7 (IPO → Erstverkauf) ist ein Pattern, nicht isoliert. Weitere Securities-Terminologie im User-Face:
- "Orderbuch" (B10) → "Angebots-Tiefe"
- "Trader" als User-Rolle (B13) → "Sammler" / "Scout"
- "Portfolio" als Invest-Objekt (B2) → "Sammlung" / "Kader"
- "Handle clever" (B2) → "Sammle clever" / streichen
- "am Erfolg beteiligen" (B1) → streichen, "optionale Community Success Fee"
- "Preise gewinnen" (B12 Fantasy) → "Credits-Belohnungen sammeln"

**Fix-Vorschlag:**
1. `business.md` Section "Kapitalmarkt-Glossar" hinzufuegen mit allen Verboten + Alternativen.
2. CI Regex-Guard Pre-Commit: `grep -iE "Marktwert steigt|am Erfolg beteilig|Handle clever|Portfolio ausbauen|Trader:"` in `.husky/pre-commit` — blockt neue Investment-Framings.
3. `messages/de.json` + `tr.json` systematisch sweep (M-Aufwand ~2h).

**CEO-Approval:** Glossar-Formulierungen + CI-Guard approven.

---

### AR-22 — Trading-RPCs werfen hardcoded DE-Errors (HIGH, i18n)

**Problem (J3B-12):** Alle Trading-RPCs (`buy_from_order`, `buy_player_sc`, `place_sell_order`, etc.) werfen hardcoded DE-Strings:
- `'Ungültige Menge. Mindestens 1 DPC.'`
- `'Order nicht gefunden'`
- `'Keine Sell-Order'`
- `'Spieler wurde liquidiert. Trading nicht möglich.'`
- `'Eigene Order kaufen nicht möglich'`
- `'Verdaechtiges Handelsmuster...'`

TR-User sieht DE (Tier_RESTRICTED blockt Trade → aber Admin-RPCs + Zukunft wenn TR freigeschaltet).

Service `trading.ts:219-220` macht `throw new Error(mapRpcError(error.message))` — aber `mapRpcError` hat 10 Patterns, 20+ RPC-Errors — Abdeckung ~50%. Fallback = `'generic'`.

**CEO-Optionen:**
- **A (architektonisch korrekt):** RPCs werfen i18n-Keys (`RAISE 'err.circular_trade'`), Service uebersetzt. Konsistent mit Service-Layer-Pattern.
- **B (quick):** `mapRpcError` um alle RPC-Error-Phrases erweitern. Schnell, aber Pflege-Last pro neue RPC-Error-Phrase.

**Empfehlung (CTO):** **A** — finale Loesung. RPCs als i18n-Key-Sources behandeln.

---

### AR-23 — LimitOrderModal Feature-Flag oder GeoGate (HIGH, Compliance)

**Problem (B6):** LimitOrderModal ist Placeholder-UI (`handleSubmit = setSubmitted(true)` — nur Mock). Aber UI suggeriert Limit-Order-Feature mit Side-Toggle, Price/Qty-Inputs, "current floor"-Referenz. **Kein Disclaimer, kein GeoGate**. TR-User (TIER_RESTRICTED) kann Modal oeffnen.

**CEO-Optionen:**
- **A:** Feature finalisieren (Matching-Engine + Live-RPC + Disclaimer + GeoGate). ~3 Tage. Verbindung zu AR-11.
- **B:** Feature-flag `FEATURE_LIMIT_ORDERS = false` + Modal nicht rendern. UI-Buttons disabled.
- **C:** `LimitOrderModal` komplett aus Beta entfernen. `MobileTradingBar` `onLimitClick` weg.

**Empfehlung (CTO):** **C fuer Beta-Launch** (parallel zu AR-11 Option C). Nach Beta + Matching-Engine = A.

---

## 3. Architektur-Lock-Ins / Geld-RPC (3 Items)

### AR-18 — Circular-Trade-Guard zu aggressiv (HIGH)

**Problem (J3B-05):** `buy_from_order` + `buy_from_market` haben:
```sql
IF v_circular_count > 0 WHERE seller_id = p_buyer_id AND buyer_id = v_order.user_id
   AND executed_at > now() - INTERVAL '7 days' THEN RAISE 'Verdächtiges Handelsmuster...'
```

Blockt fair A→B→A case: A verkauft Mo @ 100c, kauft Do @ 110c → abgelehnt.

**Beta-Impact:** 50 aktive User = wird triggern. Support-Tickets.

**CEO-Optionen:**
- **A:** Window 7d → 24h
- **B:** Threshold `>= 2` statt `> 0` (nur echte Ping-Pong-Patterns)
- **C:** Guard nur fuer NEW Users (<30d), alt-User exempt
- **D:** Guard entfernen + Lauftrunden-Detection in Analytics

**Empfehlung (CTO):** **B** — 2 Trades in 7d ist realistisch, 1 Trade ist common. Loesung behaelt Manipulation-Detection fuer echte Abuse, nimmt False-Positives raus.

---

### AR-19 — 1-SC-Limit in `buy_player_sc` Legacy Guard (HIGH)

**Problem (J3B-06):** `IF p_quantity != 1 THEN reject` in `buy_player_sc`. User muss 10 einzelne Trades machen fuer 10 SCs → 10x Fee, 10x Trigger-Chain, schlechte UX.

**CEO-Decision:** Guard entfernen (`p_quantity > 0 AND p_quantity <= 300` matching Service-Limit)? Quality-Check: `v_total_cost := v_order.price * p_quantity` (Fee-Loop) korrekt fuer quantity>1.

**Empfehlung (CTO):** **Entfernen** — Legacy aus Pre-Pilot-Phase. Comunio-Veteranen werden Bulk-Buys wollen.

---

### AR-21 — `get_price_cap` Fallback 100k SC (MEDIUM)

**Problem (J3B-15):** Fuer neue Spieler ohne `reference_price`:
```sql
IF v_ref_price IS NULL OR v_ref_price = 0 THEN RETURN COALESCE(v_ipo_price * 3, 10000000);
```

100k SC Fallback = 10M cents. Neu eingefuehrte Multi-League-Spieler koennen fuer 100k gelistet werden → Floor-Manipulation.

**CEO-Optionen:**
- **A:** Fallback auf `5 * v_ipo_price` (niedriger)
- **B:** Reject wenn kein reference + kein active IPO (`price_cap = NULL → Listing blocked`)

**Empfehlung (CTO):** **B** — Clean: Spieler ohne IPO + ohne Reference ist noch nicht "bereit fuer Sekundaer".

---

## 4. Externe Systeme / RLS (2 Items)

### AR-20 — 529 Orphan `ipo_id` in trades (HIGH, Referential Integrity)

**Problem (J3B-11):** 529 Secondary-Trades (70% der IPO-Trades) haben `ipo_id` → IPO nicht mehr in `ipos` Tabelle. Fee-Tracking broken, History-Pages zeigen "unbekannt".

**Root:** Bulk-IPO-Reset in AR-5 (J2, Commit 6937b01) hat alte IPOs entfernt, `trades.ipo_id` `ON DELETE SET NULL` → blieb pointing to non-existent.

**CEO-Optionen:**
- **A:** Backfill: `UPDATE trades SET ipo_id = NULL WHERE ipo_id NOT IN (SELECT id FROM ipos)`.
- **B:** IPOs mit `status='archived'` markieren statt delete → FK bleibt valid.
- **C:** Ignorieren (Analytics-Gap, nicht Money).

**Empfehlung (CTO):** **A jetzt + B als Architektur-Aenderung** fuer zukuenftige Bulk-Resets.

---

### AR-24 — `trades` public-readable ohne whitelist-Pattern (HIGH, Privacy)

**Problem (J3B-08):** Anon sieht 747 Trades vollstaendig, inkl. `buy_order_id`, `sell_order_id`. User kann Order-History rekonstruieren.

**Pattern aus `common-errors.md` Session 86:** Cross-User Read Policies: IMMER `own-all` + `public-whitelist` (ohne sensitive columns).

**Fix-Vorschlag:** View oder Policy die `buy_order_id`, `sell_order_id` fuer non-own trades verstecken. `buyer_id`/`seller_id`/`price`/`quantity` bleiben public (Feed-Sinn).

**CEO-Approval:** RLS-Policy-Aenderung approven.

---

## 5. Post-Beta / Nice-to-Have (1 Item)

### AR-25 — Seller-Notification Race-Dedup (MEDIUM)

**Problem (J3B-17):** `buy_from_order` Partial-Fill schickt 2 Notifications an Seller wenn 2 parallele Buys. Unique-constraint via `reference_id` in notifications table fehlt.

**Fix-Vorschlag:** Deduplicate via `trade_id` statt `order_id` in `createNotification`.

**CEO-Approval:** Post-Beta Nice-to-Have, nicht Beta-Blocker.

---

## CEO-Entscheidungspunkte (zusammengefasst)

| AR# | Trigger | Severity | Empfehlung CTO |
|-----|---------|----------|----------------|
| AR-11 | Architektur + Geld | CRITICAL | Option C (Feature aus Beta) |
| AR-12 | External Systems | CRITICAL | Option B (Full-Sweep + Regel) |
| AR-13 | Geld-Migration | CRITICAL | A + C (Backfill + Seed-Fix) |
| AR-14 | Externe Systeme (RLS) | CRITICAL | A (P0 transactions) + B-beibehalten orders |
| AR-15 | Compliance-Wording | CRITICAL | Text-Vorschlag approve (B1+B2) |
| AR-16 | Compliance-Wording | HIGH | 5-Key Sweep approve |
| AR-17 | Compliance-Architektur | HIGH | Glossar + CI-Guard |
| AR-18 | Geld-RPC | HIGH | Option B (Threshold>=2) |
| AR-19 | Geld-RPC | HIGH | Guard entfernen |
| AR-20 | Analytics/Integrity | HIGH | Option A + B |
| AR-21 | Geld-RPC | MEDIUM | Option B (Reject) |
| AR-22 | Compliance-i18n | HIGH | Option A (Keys werfen) |
| AR-23 | Compliance + Arch | HIGH | Option C (aus Beta) |
| AR-24 | Externe Systeme (RLS) | HIGH | Whitelist-Pattern approve |
| AR-25 | UX | MEDIUM | Post-Beta deferred |

**Beta-Blocker (muessen vor 50-Mann-Launch):** AR-11 (C), AR-12 (B), AR-13 (A+C), AR-14 (A), AR-15, AR-16, AR-23 (C).

**Schnellbahn-Kandidaten (alle A-Empfehlungen → schnell durchziehen):** Analog J2-Schnellbahn 6x AR, hier 15x AR.

**Aufwand-Schaetzung:** 3-5 Sessions wenn alle 15 approved + durchgezogen.
