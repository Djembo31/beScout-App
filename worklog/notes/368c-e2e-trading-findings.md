# 368c E2E — Trading/Orderbuch-Härtung (Live bescout.net, jarvis-qa)

Datum: 2026-06-24 · Deploy 1dcff8bd live · Browser jarvis-qa (Profi) · Spieler Douglas Willian (`1cc3f504…`)

Ziel (Anil): 368c Floor-Band + Floor-Quelle-Sublabel verifizieren + breites Orderbuch-Verhalten
(Anbieten/Sell, Kaufen, größere Stückzahlen, Teilfüllung, P2P-Offers) + IPO-Festpreis. Bug-Jagd.

## ✅ VERIFIZIERT PASS (live)
- **T1 Floor-Quelle-Sublabel (368c Kern):** keine offene Order → „Letzter Verkauf" (Floor=last_price). Nach Sell-Order → flippt auf „Günstigstes Angebot". Nach Cancel → zurück auf „Letzter Verkauf". Beide Richtungen + Recalc korrekt.
- **T2 Sell-Preis-Band (368c Kern):** 2 CR (< Floor 3,33) → Alert „Preis zu niedrig — … (Schutz vor Marktpreis-Manipulation)" (`minPriceExceeded`, sauber aufgelöst, KEIN Roh-Key-Leak). 40 CR (> Cap 30) → „Maximaler Preis überschritten" (`maxPriceExceeded`). 12 CR (im Band) → Order angelegt. Cap=30/Floor=3,33 (=ipo 10 → 3×/÷3 … cap/9) bestätigt.
- **T3 Sell-Lifecycle:** listen → Floor 10→12 + Quelle flippt → „Angebots-Tiefe"(=Orderbuch, compliant) + „Marktplatz (User-Angebote)" zeigen Order → Stornieren → alles revertiert.
- **T4 Buy aus Orderbuch:** „Günstigstes zuerst", Käufer zahlt nur Preis (Saldo −22 für 2×11, Fee trägt Verkäufer). Holdings +2 (1→3). last_price=11. Floor rückt auf nächstgünstigste Order (13). 3 Deals. Korrekt.
- **T6 P2P-Kaufangebot:** Gebot 10 CR erstellt (Escrow, qty 1), Band greift hier korrekt NICHT (Design: nur place_sell_order). Cancel → Escrow frei.

## 🟡 FINDINGS (Bugs/Gaps)

### F1 — Quick-Stat-Label „Floor" statt „Marktpreis" (368c AC8-Lücke)
`TradingQuickStats.tsx:40` → `t('quickStatsFloor')` = „Floor" (de.json:4550). Im Player-Detail-Trading-Tab. Bei 368c übersehen.

### F2 — Sell-Modal: HARTCODIERTE „Floor"-Strings (i18n-Verstoß + Label-Miss)
`SellModalCore.tsx:246` Button-Text `>Floor<` und `:262` `Floor: {fmtScout(floorBsd)}` — **beide hartcodiert** (kein `t()`), kein DE/TR. = i18n-Verstoß (errors-frontend i18n-Regel) UND Label-Inkonsistenz.

### F3 — Buy-Modal hängt bei DIREKT GETIPPTER Menge (pre-existing, NICHT 368c)
Buy-Modal: Menge per **Tippen** ins Feld (statt +/−) → Status „Saldo wird aktualisiert…" löst sich NIE auf (30s+ Timeout), „Kaufen"-Button bleibt dauerhaft disabled. Mit **+/−-Buttons** funktioniert es einwandfrei. Zusätzlich: bei Menge 3 auf einer Order mit nur 2 verfügbaren zeigt „Gesamt" 3×11=33 (irreführend — `max. 4` spannt über beide Orders, Preis aber nur der günstigsten). Reproduzierbar. Eigener Slice empfohlen (Buy-Modal Mengen-Eingabe + Affordability-Hook).

### F4 — `/api/push` → 500 beim Order-Fill (= bekannter Slice 369, LIVE bestätigt)
Nach erfolgreichem Buy: Console-Error `Failed to load resource: 500 @ /api/push`. Trade läuft durch, Push-Route wirft still 500. Genau der für 369 geplante Bug — live reproduziert.

## 📋 LABEL-VEREINHEITLICHUNG (AC8) — UNVOLLSTÄNDIG, volle Inventur
368c änderte nur ~6 Keys. Noch „Floor" user-facing (de.json, TR spiegelt):
- 1153 `sortFloorAsc` „Floor ↑ (günstigste)" · 1154 `sortFloorDesc` „Floor ↓ (teuerste)" · 1240 `bestandSortFloorAsc` „Floor ↑" (Sortier-Optionen)
- 1279 `bestandFloor` „Floor" · 1580 `portfolioCardFloor` „Floor" · 2262 `statFloor` „Floor" · 2266 `statFloorShort` „FLOOR" (Stat-/Portfolio-Labels)
- 1850 `criteriaFloor` „Floor ≤ {value}" (Filter-Kriterium)
- 3708 `floor` „Floor" (genutzt in `SearchOverlay.tsx:399`)
- 4550 `quickStatsFloor` „Floor" (F1)
- 324 `portfolioRosterTooltip` „…zum aktuellen Floor-Preis."
- HARTCODIERT: `SellModalCore.tsx:246/262` (F2), `app/(app)/player/[id]/page.tsx:16` Metadata `Floor: X CR`
→ Empfehlung: eigener Slice **368d** „Floor-Label-Vereinheitlichung komplett" (DE+TR + 2 hardcoded + Metadata, mit Reviewer). Wording-Entscheid: „Marktpreis" überall? (Sort/Filter/Compact-Badge „FLOOR" ggf. Sonderfall.)

## T7 IPO — N/A diese Session
Keine aktive IPO live (0 open/early_access/announced). IPO = Festpreis (`buy_from_ipo`), orderbuch-/band-unabhängig. Gehört zum 370-E2E-Sweep (mit Seed).

## 🗂️ MASTER-FOLLOW-UP-LISTE (alle Test-Auffälligkeiten → Slice-Home) — für frische Session
| # | Auffälligkeit | Status / Slice-Home |
|---|---|---|
| A | **Preis-Level falsch** (500K-Spieler zeigt 10–11 statt 500) | ✅ Sofort-Fix: 19 Ausreißer → MV/1000 (Douglas live=500). Strukturell → **368e** (approved-to-build). |
| B | **3 driftende Einstiegs-Spalten** (ipo_price/ipos.price/initial_listing_price) | **368e** SSOT (=ipo_price), Entscheidungen §7 geklärt. |
| C | **„33 CR"-Anzeige-Lüge** im Kaufdialog | ✅ **368d DONE** (committet e7048d84). |
| D | **F1** Quick-Stat-Label „Floor" (TradingQuickStats) statt „Marktpreis" | offen → **368-Label-Rest-Slice**. |
| E | **F2** Sell-Modal HARTCODIERTE „Floor"-Strings (SellModalCore.tsx:246,262, kein i18n) | offen → **368-Label-Rest-Slice** (+ i18n-Verstoß). |
| F | **Label-Vereinheitlichung unvollständig** (~11 „Floor"-Keys + 2 hardcoded + page.tsx-Metadata) | offen → **368-Label-Rest-Slice** (volle Inventur oben). |
| G | **F3** Buy-Modal hängt bei DIREKT GETIPPTER Menge („Saldo wird aktualisiert…" ewig, Button disabled; +/− ok) | offen → **eigener kleiner Slice** (Mengen-Input + balanceStale-Hook). |
| H | **F4** `/api/push → 500` beim Order-Fill (still, Trade läuft durch) | offen → **Slice 369** (war eh geplant, jetzt live bestätigt). |
| I | „Markteintritt" könnte +4900% rechnen (initial_listing 10 vs floor 500) | ✅ durch Daten-Fix entschärft; final via **368e**. |
| J | „Club Sale · Festpreis" englisch (clubSaleFixed) | NIT (368c-Review) → **368-Label-Rest-Slice**. |
| K | floorPriceTooltip pre-existing (Nutzung prüfen) | NIT (368c-Review) → mit 368-Label-Rest mitnehmen. |
| L | **D100-Präzisierung nötig (D101):** „kein Daten-Update" galt nur für kleine legit Abweichungen; grobe Seed-Ausreißer + Mehrfach-Quellen SIND Bugs. | DISTILL in **368e** (memory/decisions.md D101 + trading.md/treasury.md). |
| M | AC7 368c Playwright-Sublabel-Proof | offen post-Deploy (war schon live im E2E gesehen: „Letzter Verkauf"/„Günstigstes Angebot" beide PASS). |
| N | T7 IPO-Festpreis (`buy_from_ipo`) live | keine aktive IPO → **Slice 370** E2E-Sweep (mit Seed). |

**Anil-Entscheid 2026-06-24:** alle obigen BUILD-Arbeiten in **frischer Session**. 368e-Entscheidungen (Portfolio=avg_buy_price · RewardsTab→ipo_price · initial_listing erst deprecaten) geklärt.

## Residual-State (QA-Accounts, akzeptiert)
jarvisqa hält jetzt 3 Douglas-Cards (war 1), demo-admin 2 (war 4), last_price 10→11, +1 Trade, Plattform-Topf +Fee. Echte Test-Trades, nicht rückgebucht (append-only). Orderbuch + Offers wieder leer (aufgeräumt).
