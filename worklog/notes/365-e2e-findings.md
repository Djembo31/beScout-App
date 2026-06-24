# E2E-Durchlauf „Fees REIN" (Slice 358–365) — Live-Bug-Findings

> Echter End-to-End auf bescout.net (jarvis-qa als Käufer), Quelle für Quelle.
> Ziel: bestätigen, dass jede Fee real in den Plattform-Topf fließt + dabei UI-Bugs finden.
> Topf-Baseline vor Start = 0.

## ① Trading — ✅ Fee-REIN funktioniert live

**Setup:** demo-admin als Seller geseedet (5 Holdings Douglas Willian + `place_sell_order` 1 Card @ 1000 Cents). jarvis kauft via echte UI (Spieler-Detailseite → Kaufen-Modal → Kaufen).

**Kern-Ergebnis ✅:** Topf 0 → **35 Cents** = exakt 3,5 % von 1000. Ledger-Row `source='trading', amount=35`. Order `filled`. Käufer-Guthaben 12.220,77 → 12.210,77 (−10 CR Preis). Trade in Handels-Historie sichtbar. **Trading-Fee-REIN live bewiesen.**

### 🔴 Finding T-3 (CLUSTER, Achievement „Diamond Hands") — HIGH
Nach dem Kauf ploppt ein Achievement-Modal: **„Erfolg freigeschaltet! 💎 Diamond Hands — Scout Card 30 Tage gehalten ohne zu verkaufen"**. Drei Probleme:
1. **Compliance (HIGH):** „Diamond Hands" ist explizit verbotenes Meme-Coin-Vokabular (`business.md` → „Verboten: 'diamond hands', 'HODL', 'to the moon'…"). User-facing Achievement-Titel. MUSS umbenannt werden (DE+TR).
2. **Logik-Bug:** Wurde **sofort beim Kauf** vergeben — die Card wurde gerade erworben, nicht „30 Tage gehalten". Trigger-Kriterium widerspricht dem Text (Award-on-buy statt Award-after-30d-hold).
3. **UX (no-confetti-Regel):** Celebration-Modal auf einer Trading-Aktion verstößt gegen `feedback_no_confetti` (kein Konfetti/Celebration bei Trading-Aktionen).
- Evidence: `365e2e-1-trading-diamondhands.png`.
- **✅ Root-Cause verifiziert (2026-06-24, live-DB):** Die Award-Logik (`social.ts:466` `['diamond_hands', maxHoldDays >= 30]`) ist KORREKT — der Bug sitzt in `dpc_mastery.hold_days`. Live: 2533 Rows, **2472 (97,6 %) ≥ 30**, max 126; KEIN Trigger auf `dpc_mastery`; Verteilung clustert bei exakt 91 (827×) / 97 (778×) / 60 (778×) = **geseedete Mock-Daten, keine echt getrackte Halte-Dauer**. `maxHoldDays = max(dpc_mastery.hold_days)` liest den Seed → `diamond_hands` qualifiziert bei praktisch jedem Holding. **Fix-Richtung (Slice 367 BUILD):** echte Halte-Dauer aus `holdings`-Kaufdatum berechnen (statt geseedeter `hold_days`), ODER hold_days real per Trigger/Cron pflegen. Plus: Achievement umbenennen (Meme-Wort) + Konfetti-auf-Trade entfernen. **Klassisch Mock→Pro-Drift (E4-Kern).**

### 🟡 Finding T-2 (/api/push 500) — MEDIUM
Beim Kauf: 2× `POST https://www.bescout.net/api/push → 500`. Push-Notification-Route wirft Server-500 (Trade lief trotzdem durch, kein Block). Vermutlich Notify-Versand bei Order-Fill. Separat prüfen (VAPID/Payload?).

### 🟢 Finding T-1 (Cold-Start: leerer Markt) — MEDIUM/Produkt
Vor dem Seeding: systemweit **0 aktive Erstverkäufe + 0 User-Sell-Orders** → ein neuer Beta-Tester kann **nichts kaufen**, obwohl Home/Markt „Kaufe deinen ersten Spieler" bewerben. `buy_player_sc`/`buy_from_order` matchen gegen Orders → ohne Liquidität kein Trade. Launch braucht garantierte Grund-Liquidität (Dauer-IPO oder Seed-Orderbuch).
- (Nebenbefund, LOW/unsicher: Markt-Sub-Tabs „Von Usern" etc. rutschen unter Sticky-Header — als Test schwer klickbar; echter User scrollt.)

### 🔴 Finding P-4 (Pricing-Data-Drift) — HIGH/Money-Data
Beim Trade aufgefallen: Douglas Willian (MV **500.000 €**) stand bei **10 Credits** statt kanonisch ~**500** (`MV/1.000`). Top-Spieler (Mbappé MV 200 Mio → 200.000 CR) sind **korrekt** — die Formel `ipo_price_cents = MV/10` greift dort. **Ursache:** `ipo_price` wird bei Launch **eingefroren** und NICHT nachgezogen, wenn der TM-Marktwert später steigt (Canon-Doc warnt das an). Nicht-Top-/untere-Liga-Spieler sind dadurch verzerrt.
- Fix-Slice: `ipo_price` der Nicht-Top-Spieler per Formel neu setzen (Data-Migration, Money — eigener Slice, CEO-Scope).

### 🟣 Finding M-5 (Money-Modell-Doku-Drift, SYSTEMISCH) — STRATEGISCH → **D99**
Der eine Trade legte einen **systemischen** Drift über ~40 Doc-Stellen offen: 3 Namen (BSD/$SCOUT/Credits), Faktor-100-€-Widerspruch, Phasen-Nummerierung 1/3/4 vs 1/2, CASP-Strategie-Konflikt, `CONCEPT-DPC-ECONOMY.md` in sich widersprüchlich. **Geklärt mit Anil → D99 ($SCOUT-Phasenmodell: Spielgeld jetzt ohne €-Wert, Coin-Wert erst ICO, Early-Adopter-Bonus diskretionär).** Vollständige Checkliste: `worklog/notes/365-money-model-drift-inventory.md`. Naming/Einheiten/Pricing-Fairness = OFFEN, von Anil zu ratifizieren.

---
## E2E-Sweep — Stand (eins nach dem anderen, Bug-Jagd)
- **① Trading ✅ durchgespielt** (Fee-REIN live bewiesen, Topf +35) — 5 Funde (T-1 leerer Markt, T-2 push-500, T-3 Diamond-Hands-Cluster, P-4 Pricing-Drift, M-5 Money-Modell→D99).
- **Fix-Stand E4:** M-5 → **D99 ✅** (Schritt 1+2: Ratifikation + Doc-Glattzug Slice 366). T-3 → **Slice 367 ✅** (Rename „Treuer Sammler"/„Sadık Koleksiyoncu" + Hold-Logik aus holdings.created_at statt Mock-Seed + Konfetti-Gate; Reviewer PASS). **Offen:** P-4 ipo_price-Data-Drift (Slice 368, Money/CEO) · T-2 push-500 (369) · T-1 Cold-Start-Liquidität (Produkt) · ②–⑤ E2E-Sweep (370). Plus 367-Follow-ups (F#1 „ohne verkaufen"-Semantik · F#2 Hold-Regression-Tests · F#3 Mastery-Leaderboard-Mock).
- **② IPO — ✅ DONE** (Slice 370): live bewiesen via echtem `buy_from_ipo` aus 369-AC5 → pot source='ipo' = 500 (10 % von 5000).
- **③ Poll — ✅ DONE** (Slice 370): echter `cast_community_poll_vote` (cost 1000) → pot 'poll' = 200 (20 %), Creator +800, Zero-Sum ✓.
- **④ Research — ✅ DONE** (Slice 370): echter `unlock_research` (price 1000) → pot 'research' = 200 (20 %), Autor +800, Zero-Sum ✓.
- **⑤ Bounty — ✅ DONE** (Slice 370): echter `approve_bounty_submission` (reward 1000) → pot 'bounty' = 50 (5 %), Submitter +950, Zero-Sum ✓; Doppel-Approve money-safe rejected.
- **Pot-Stand live = 2462 Cents** (trading 1512 + ipo 500 + poll 200 + research 200 + bounty 50). ALLE 5 Quellen real bewiesen. Keine Fee-Booking-Bugs. Proof `worklog/proofs/370-fees-rein-sweep.txt`. Topf-Card-Visual-Verify (357) weiterhin offen (eigener UI-Check).
- **E2E-Sweep ②–⑤ KOMPLETT** — E4-Epic-Verify-Teil abgeschlossen; nächster Epic-Schritt = E3 Slice 3 (Monats-Liga RAUS-Kanal).
- **UI-Walk-Nachtrag (Slice 370, Anil-Frage „per Playwright?"):** ② IPO (369-AC5 Buy-Modal) · ③ Poll · ④ Research jetzt per **echtem UI-Klick** Ende-zu-Ende bewiesen (Fee real im Topf, 0 Console-Errors, Proof `370-ui-fees-rein.txt` + 2 PNGs). ⑤ Bounty (Admin-Approval) bleibt RPC-bewiesen — Approval-UI braucht Club-Admin-Login (kede5-Creds fehlen). Topf nach UI-Walk = **2862 Cents** (poll/research je 400).
  - **🟡 U-1 (MEDIUM/UX, kein Geld-Bug):** Header-Guthaben aktualisiert nach Poll-Vote/Research-Unlock aus dem Feed nicht sofort (DB korrekt, korrigiert beim Reload). Wallet-Query-Key wird in `castCommunityPollVote`/`unlockResearch`-Mutations nicht invalidiert (performance.md: invalidateQueries nach Writes). → eigener kleiner Follow-up-Slice.

> **Geseedete Live-Artefakte aus ① (nicht vergessen / ggf. aufräumen):** demo-admin hält 4 Cards Douglas Willian (1 verkauft an jarvis), jarvis hält 1 Card. 1 echte Trade-Transaktion + 1 `trading`-Pot-Zeile (35) sind **permanent** (append-only, gewollt als E2E-Beweis).
