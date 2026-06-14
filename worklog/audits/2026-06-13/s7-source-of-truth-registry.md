# S7 — Source-of-Truth & Wiring Registry

**Zweck:** Die „Verfassung" der BeScout-Daten-Architektur. Pro Datendomäne: die EINE kanonische Quelle, die redundanten Alternativen, der E2E-Wiring-Status, Schwächen, Missverständnisse, offene Punkte, Ziel + Migrationsschritt. Read-only Steuerungsdokument — Phase 2 (Migration) + Phase 3 (Abräumen) hängen sich daran.

**Methode:** Strangler-Fig + Ratchet-Guards (D75). Kein Big-Bang. Demo-/Money-Path zuerst.

**Status:** Slice 302 (S7) — Foundation + Player-Domäne als Beweis-Template. Übrige Domänen folgen domänenweise.

---

## Record-Format (pro Domäne, 8 Achsen)

1. **Kanonische Quelle** — die eine Wahrheit (Tabelle.Spalte / Service-Fn)
2. **Redundante Alternativen** — was dasselbe nochmal speichert
3. **E2E-Verdrahtung** — DB→Service→Hook→Component→UI: intakt / partiell / gebrochen
4. **Schwächen / Workarounds** — Brücken, direkter supabase-Zugriff, Defaults, fragile Mapper
5. **Missverständnisse / Inkonsistenzen** — wo zwei Teile sich über die Wahrheit uneinig sind
6. **Offene Punkte** — dormant Felder, TODOs, externe Abhängigkeiten
7. **Ziel + Migrationsschritt** — auf welche eine Quelle, welcher Slice
8. **Severity** — Demo-/Money-Path-Relevanz (P0–P3)

---

## Domänen-Terrain (9 Makro-Domänen, Reihenfolge nach Demo/Money-Path)

| # | Domäne | enthält | Priorität | Registry-Status |
|---|--------|---------|-----------|-----------------|
| 1 | **Player** | players, valuations, research, watchlist, search | 🔴 P0 | ✅ gemappt (unten) |
| 2 | **Fantasy / Spieltag** | events, lineups, scoring, predictions, fixtures, fantasyLeagues, wildcards | 🔴 P0 | ✅ gemappt (unten) |
| 3 | **Market / Trading** | trading, marketDashboard, ipo, offers, liquidation, orders, priceHist, wallet, pbt | 🔴 P0 (Money) | ✅ gemappt (unten) |
| 4 | **Club** | club, clubChallenges, clubCrm, clubSubscriptions, fanRanking, foundingPasses | 🟡 P1 | ⏳ offen |
| 5 | **Social / Community** | social, posts, votes, communityPolls, notifications, feedback | 🟡 P1 | ⏳ offen |
| 6 | **Gamification / Economy** | missions, dailyChallenge, streaks, mysteryBox, equipment, cosmetics, mastery, tickets, airdrop | 🟡 P1 | ⏳ offen |
| 7 | **Creator / Sponsor / Revenue** | creatorFund, sponsors, adRevenueShare, bounties, tips, scouting | 🟢 P2 | ⏳ offen |
| 8 | **Identity / Profile** | auth, profiles, avatars, push* | 🟢 P2 | ⏳ offen |
| 9 | **Admin / Ops** | platformAdmin, cronHealth, homeDashboard, leaderboards, activityLog | 🟢 P3 | ⏳ offen |

---

# DOMÄNE 1 — PLAYER (gemappt 2026-06-13)

> Verifiziert gegen Live-Schema (`players` 4.556 · `player_fair_values` 5 · `player_valuations` 5 · `players_mv_history` 141.236 · `player_gameweek_scores` 61.462 · `fixture_player_stats` 67.737, davon 48.418 mit `rating`).
> **Korrektur zweier verbreiteter Annahmen:** `players.rating/score/score_delta/form*` **existieren NICHT** (Phantom-Spalten — DDL hat nur `perf_l5/perf_l15/perf_season` + Roh-Counter + `mv_trend_7d/mv_source`). `scout_scores` ist **User-Reputation** (trader/manager/analyst Elo), NICHT Spieler-Bewertung.

## 1.1 Identity / Info (name, position, club, photo, shirt, nationality)
- **Kanonisch:** `players.{first_name,last_name,position,club_id,image_url,shirt_number,nationality}` via `PLAYER_SELECT_COLS` (`players.ts:14-26`) → `dbToPlayer` (`players.ts:188-250`).
- **Redundant:** `players.club` (TEXT) neben `players.club_id` (UUID) · `fixture_player_stats.player_name_api/match_position` (eigene Name-Quelle für unmatched) · `fixture_substitutions.player_in/out_name` · holdings/offers/trades RPC-Projektionen re-embedden `player_first_name/last_name/position`.
- **E2E:** ✅ intakt (PLAYER_SELECT_COLS-Drift-Guard Slice 200 greift).
- **Schwäche:** `players.club` (Display) vs `club_id` (Liga-Resolve) Drift; `club_id` known-stale für Cross-Club-Spieler → MatchTimeline musste Club per Fixture-Stat-Mehrheitsvotum rekonstruieren (`scoring.queries.ts:135-155`) = Workaround-Beweis.
- **Severity:** P2 (Identity meist stabil, club_id-Drift P1 bei Transfers).

## 1.2 Leistung / Performance (goals, assists, matches, appearances)
- **Kanonisch (Aggregat):** `players.{matches,goals,assists,clean_sheets,...}` via Cron `cron_recalc_perf`. **Kanonisch (pro Spiel):** `fixture_player_stats.{goals,assists,minutes_played,...}` (67k Rohzeilen).
- **Redundant/Dual-Grain:** dieselbe Semantik (Tore/Assists/Spiele) existiert auf 2 Granularitäten — Saison-Rollup (`players.*`) vs pro-Fixture (`fixture_player_stats`), nie reconciled.
- **Dual-Source-Flag:** PerformanceTab zeigt StatsBreakdown aus `player.stats.*` (Saison) UND MatchTimeline aus `fixture_player_stats` (pro Spiel) auf **derselben Seite** → bei Cron-Lag widersprüchlich.
- **E2E:** ⚠️ partiell — Counter hängen an `cron_recalc_perf` nach jedem GW-Backfill.
- **Schwäche:** `perf_l5/l15/season` DEFAULT 50.00 NOT NULL = Slice-102-Pilot-Default (595 Junioren `matches=0` → „L5: 50" fake-average); Mitigation nur display-seitig (`fmtPerfL5`, `PerfPills`) — leicht ein Render-Site zu vergessen.
- **Severity:** P1 (Demo-Korrektheit).

## 1.3 Bewertung / Rating
- **Kanonisch:** `fixture_player_stats.rating` (API-Match-Rating 1–10, 48k non-null). **KEIN player-rating auf `players`.**
- **Redundant (messigste Gruppe):** `fixture_player_stats.rating` → `fantasy_points = round(rating*10)` (gleiche Zeile, dupliziert) → `player_gameweek_scores.score` (andere Tabelle, via Bridge-RPC `sync_fixture_scores`). 3 Repräsentationen derselben Rating-Semantik. Plus `research_posts.avg_rating` (Community-Content-Rating 1–5) → `ScoutConsensus` als Spieler-Sentiment (andere Semantik, surface aber als Spieler-Bewertung).
- **E2E:** ✅ intakt aber 3-Hop-Bridge — wenn `sync_fixture_scores` nach Rating-Backfill nicht läuft, divergieren FormBars (`player_gameweek_scores`) und Match-Rating-Views (`fixture_player_stats.rating`).
- **Offen → ✅ verifiziert (Slice 313):** `getScoreStyle` (6-Tier-Farbe) — **kein Caller füttert ein 1–10-`rating`**. Alle Argumente 0–100 (`score`/`l5`/`perfValue`/`avgScore`/`mvpScore`/`getMatchScore`). Kein Mis-Color-Bug. Divergenz-Risiko liegt im Zahlenwert der Bridge (siehe errors-db.md „Multi-Hop Cron-Bridge"), nicht in der Farb-Zuordnung.
- **Severity:** P1.

## 1.4 Marktwert / Value
- **Kanonisch (MV):** `players.market_value_eur` (DDL **INTEGER**, aber typisiert/kommentiert als „€" → Präzisions-Mismatch; `db.market_value_eur || undefined` → 0 wird undefined).
- **Kanonisch (Floor):** `players.floor_price` (BIGINT cents) — ABER live recomputed 3-fach: `players.floor_price` (cron) vs `MIN(orders.price)` (`enriched.ts:62-67`) vs `MIN(listings.price)` (`playerMath.ts:14-21`) + 4. Reader `getFloorPricesForPlayers` (`fixtures.ts:644`).
- **Dormant/DEAD:** `player_fair_values` (5) + `player_valuations` (5) + `valuations.ts`-Service + `CommunityValuation.tsx` — Komponente vollständig gebaut, aber `@experimental`, **nirgends importiert** (orphan, Slice 227 bekannt). 5 Zeilen = Pre-Orphan-Testdaten. **Toter Value-Pfad.**
- **E2E:** ⚠️ Floor partiell (3 Quellen, meist einig); Value-Pfad **gebrochen** (orphan CommunityValuation).
- **Severity:** **P0 (Money)** — Floor-Truth hängt davon ab, in welcher Komponente man ist.

## 1.5 Score / Punkte
- **Kanonisch:** `player_gameweek_scores.score` (61k, pro-GW) + `fixture_player_stats.fantasy_points` (pro-Spiel). (`players.score/score_delta` Phantom.)
- **Redundant:** GW-Rollup vs pro-Match (Bridge `sync_fixture_scores`). `score_history` = **User-Reputation-Delta-Log**, NICHT Player-Score (exclude).
- **Dual-Implementation-Flag:** „letzte 5 GW-Scores" hat **2 nicht-äquivalente Implementierungen** — `getBatchFormScores` (direkt Tabelle, per-Player-Window, hardcoded `status:'played'`, Fantasy-Picker) vs `rpc_get_recent_player_scores` (JSONB, absolute Liga-Window, DNP=null, KaderTab). Gleiche Semantik, verschiedene Bars möglich.
- **Severity:** P1 (Med-High).

## 1.6 Form / L5
- **Kanonisch:** `players.perf_l5/perf_l15` (Cron-Skalar) für Sort/Filter/KPI; `rpc_get_recent_player_scores` für die Bars.
- **Redundant (3 Wege):** `perf_l5` (Skalar) vs RPC-last-5 (Bars) vs `getBatchFormScores`-last-5 (Picker) — können widersprechen (verschiedene Jobs/Windows).
- **Dual-Source-Flag:** **KaderTab rendert BEIDE** — `perf.l5`-Pill (`PerfPills`) UND FormBars (`useRecentScores`) **in derselben Zeile**, unabhängig gespeist. Bei Cron-Timing-Drift widersprechen Pill und Bars.
- **Severity:** **P0 (Demo-Korrektheit, Core-Squad-View).**

## Player-Domäne — Top-Befunde (severity-sortiert)

| # | Sev | Semantik | Issue | Ziel |
|---|-----|----------|-------|------|
| 1 | ~~P0 Money~~ ✅ **303** | Floor/Preis | ~~3-fach berechnet~~ → **Slice 303 Teil C** alle Client-Reader auf `players.floor_price` (computePlayerFloor=Passthrough, Math.min entfernt, resolveBuyPriceCents=floorBsd) | erledigt |
| 2 | ~~P0 Value~~ ✅ **305** | Fair-Value | CommunityValuation + 2 Tabellen + RPC entfernt (Slice 305) | erledigt |
| 3 | ~~P0 Demo~~ ✅ **309** | L5/Form | ~~Pill-vs-Bars-Widerspruch~~ → **Slice 309** (Anil Option A) Pill aus FormBars abgeleitet (`deriveL5FromRecentScores`, beide L5-Displays); live 11/11 Rows verifiziert. **D77-Catch: Formel KEIN /1.5** | erledigt |
| 4 | ~~P1~~ ✅ **307** | letzte-5-Scores | ~~2 Impls~~ → **Slice 307** Picker auf Kanon-RPC (`getBatchFormScores` gelöscht); = Fantasy #6 | erledigt |
| 5 | ~~P1~~ ✅ **312** (display) | perf_l5=50 | Display-Mitigation komplett (Slice 271 + **312** /compare-Lücke). DB-Default 50 bleibt bewusst (6 Salary-Cap-RPCs `COALESCE(perf_l5,50)`) | display erledigt; DB-Default Scope-Out |
| 6 | ~~P1~~ ✅ **313** (verifiziert: bereits mitigiert) | goals/assists | ~~Dual-Grain auf selber Seite~~ → Season-Card='Saison-Statistiken'-Heading; MatchTimeline per-GW-Zeilen + `dataUntilGw`-Freshness. Saison/Spiel-Trennung + Cron-Lag-Hinweis existieren bereits | erledigt (kein Code-Change nötig) |
| 7 | P1 | club-Identity | `players.club` (String) vs `club_id` (UUID), club_id stale | Auf `club_id` als Truth, `club`-String deprecaten (post-Beta-Migration) |
| 8 | ~~P2~~ ✅ **313** (Doku) | rating-Chain | 3-Hop `rating→fantasy_points→gw_score` Bridge → dokumentiert in errors-db.md „Multi-Hop Cron-Bridge ohne Trigger" (Sync via `sync_fixture_scores`/`admin_import_gameweek_stats`, kein Trigger; Detection-SQL; Trigger-Absicherung als post-API-Key-Backlog) | erledigt |
| 9 | P2 | market_value_eur | INTEGER vs „€", `||undefined` versteckt 0 | Typ/Präzision klären |
| 10 | — | Taxonomie | Phantom-Spalten `players.rating/score/form*` nicht existent; `scout_scores`/`score_history` = User-Reputation | In Folge-Arbeit nie auf Phantome bauen |

**Player-Migrations-Reihenfolge (Phase 2):** #1 Floor-Konsolidierung (Money, höchste) → #2 Value-Pfad-Entscheidung (CommunityValuation wire/del) → #3 L5-Reconcile → #4 last-5-Unify → Rest P1/P2.

---

# DOMÄNE 2 — FANTASY / SPIELTAG (gemappt 2026-06-13)

> Live-Schema: `fixtures` 2.438 (finished 2.284 / scheduled 154, **0 live/simulated**) · `lineups` 444 · `events` 207 · `predictions` **1** · `user_wildcards` 35 · `wildcard_transactions` **0**. `leagues.active_gameweek`↔`clubs.active_gameweek` aktuell in-sync (Slice-277-Dual-Write), ABER **Süper Lig: active_gameweek=34 bei max_gameweeks=38** (Saison-End-Drift, API-Key-blockiert).
> Naming-Korrektur: Lineup-Save-RPC heißt `save_lineup` (nicht `rpc_save_lineup`); `get_active_gw` ist nur ein Cron-Step-Name (inline-SELECT auf clubs), keine RPC.

## 2.1 Active Gameweek — **2 physische Spalten für 1 Semantik**
- **Kanonisch:** Lese-Truth `leagues.active_gameweek` (`getLeagueActiveGameweek` → `useGameweek`). Treiber `clubs.active_gameweek` (MIN/Liga, Cron `get_active_gw`).
- **Redundant:** `clubs.active_gameweek` (18-20 Zeilen/Liga) + `leagues.active_gameweek` (1/Liga) + 3. Reader `getActiveGameweek(clubId)` + 4. Override `fantasyStore.selectedGameweek`.
- **Wiring:** ⚠️ partiell — nur der Cron dual-writet beide; **kein Trigger synct sie**. Admin-`set_active_gameweek` schreibt nur `clubs` → stiller Drift. `FantasyContent.handleSimulated:165` liest `clubs`, `useGameweek` liest `leagues` (im selben Mount verschiedene Spalten).
- **✅ Slice 310 (Anil liga-weit):** `set_active_gameweek` schreibt liga-weit (alle Clubs der Liga + leagues-Zeile atomar → hält clubs-MIN===MAX===leagues); `handleSimulated` liest leagues; `useActiveGameweek`+`qk.events.activeGw` orphan entfernt; Drift-Guard `scripts/audit/gameweek-drift.js` wired in nightly (D75-Ratchet). `getActiveGameweek` bleibt für Admin-per-Club-Display (post-Fix clubs===leagues, harmlos). **P1 → erledigt.**

## 2.2 Fixtures & Status — **GW-Completion 3-fach berechnet**
- **Kanonisch:** `fixtures.status` ∈ scheduled/live/finished/simulated/cancelled/postponed.
- **Redundant:** „GW fertig?" 3× unabhängig — `getGameweekStatuses.is_complete` vs `useGameweek.gwStatus` (mischt events) vs `SpieltagTab.gwStatus` (lokale Logik). FDR client-side aus `players.perf.l5`+`club`-String (erbt 1.1-Drift).
- **Wiring:** ✅ Read intakt; Realtime/Live ⚠️ dormant (API-Key, 0 live-Zeilen). `SpieltagTab` umgeht React-Query (eigener useState/useEffect).
- **✅ Slice 311:** EINE `computeGwStatus(fixturesComplete, fixtureCount, events)` in `fantasy/lib/gwStatus.ts` von `useGameweek`+`SpieltagTab` geteilt; `isFixtureDone` DRY auch in `getGameweekStatuses`. SpieltagTab→React-Query Scope-Out (separater Slice). **P1 → erledigt.**

## 2.3 Events
- **Kanonisch:** `events`-Tabelle, Read via `/api/events`-Server-Route (nicht direkter DB-Read).
- **Redundant:** Teilnahme doppelt — `event_entries` (Join-Truth) vs `lineups` (Existenz); `events.current_entries`-Counter vs COUNT.
- **Schwäche:** `createNextGameweekEvents` **hardcoded `>38`** widerspricht per-Liga `max_gameweeks` (34-GW-Ligen); Klon-Pfad zum Cron. **Severity P2.**

## 2.4 Lineup (Store vs DB)
- **Kanonisch:** DB `lineups` (12 slot_* + captain + bench + `wildcard_slots`), Write via `save_lineup` RPC. Working-State `lineupStore` (Zustand).
- **Redundant:** Lineup-State doppelt (Store ↔ DB), Slot↔Column-Mapping **3× implementiert** (`useLineupBuilder` load, `submitLineup` map, `getLineupWithPlayers`).
- **Schwäche:** `wildcardSlots` ist **`Set`** im Store (Serialisierungs-Risiko Slice 267); **`loadFromDb` rehydriert wildcards NICHT** → nach Reload Wildcard-Picks weg bis Re-Toggle. `perfL5 ?? 50`-Default (erbt Pilot-Default).
- **✅ verifiziert false-positive (Slice 312 Sweep):** `wildcardSlots:Set` hat **keinen Serialisierungs-Pfad** — `lineupStore` hat KEINE persist-Middleware, kein React-Query-Cache, kein RPC-stringify des Sets (in-memory React-Props + `.has()`). Slice-267-Klasse trifft NICHT zu. `loadFromDb`-Rehydration betrifft nur das **dormante** Wildcard-Feature (0 Aktivität, Slice 306). Kein echter Bug. Slot-Mapping-3×-DRY bleibt optionaler Cleanup. **P1 → kein Handlungsbedarf.**

## 2.5 Scoring — **Cross-Domain mit Player 1.3/1.5**
- **Kanonisch:** `player_gameweek_scores.score` (pro-GW) + `lineups.total_score`/`slot_scores` (via `score_event` RPC).
- **Redundant:** identisch Player #4 — `getBatchFormScores` hardcoded `status:'played'` vs DNP-aware RPC. Live-`progressiveScores` (Polling) vs DB-`slot_scores` divergieren während GW.
- **Wiring:** ✅ aber mehr-Hop-Bridge (`sync_fixture_scores`→`score_event`); bei Key-Ausfall divergieren Live-Anzeige + finaler Score. **Severity P1** (Money: `reward_amount` hängt am Score).

## 2.6 Predictions — dormant (1 live Zeile). `club`-String-Filter. **Severity P3.**

## 2.7 Wildcards — **Dormant Feature (KEIN Compliance-Risiko)** · ✅ Slice 306
- **Kanonisch:** `user_wildcards` (Composite-PK user+league), Balance via `get_wildcard_balance`.
- **~~Risiko-These widerlegt~~ (Slice 306 Live-Investigation 2026-06-13):** Die 35 `user_wildcards`-Zeilen sind **alle leer** (balance=0, earned=0, spent=0, **alle 1 Timestamp** `2026-05-04 21:30:08` = Backfill-Platzhalter). `wildcard_transactions` 0 Zeilen ist **korrekt** — nie geearnt/gespent/gewährt. `earn`/`spend`/`admin_grant`-RPCs **schreiben** bereits `INSERT INTO wildcard_transactions` (live verifiziert via `pg_get_functiondef`). 444 lineups, **0 mit Wildcard-Slots**; `save_lineup` debitiert keine Balance; **0 Earning/Spending/Grant-Aufrufer in `src/`**.
- **Klasse:** Muster #5 (dormant/orphan), NICHT „Audit-Ledger als Risiko". Es gibt kein „Geld ohne Trail" — es gibt schlicht keine Wildcard-Aktivität.
- **Erledigt (Slice 306, Option A „minimal schließen"):** `getWildcardHistory` Error-Swallow → throw. Ledger-Pfad braucht KEIN Repair (bereits korrekt). Code bleibt dormant-aber-korrekt für spätere Aktivierung (Option C) bzw. Removal (Option B) — keins gewählt. **Severity P1 → resolved/dormant.**

## 2.8 League Scope — **Dual-Achse UUID vs String**
- **Kanonisch:** `useLeagueScope` Store (`leagueId` UUID).
- **Redundant:** Store hält `leagueId` (UUID, Queries) + `leagueName` (String, client Event-Filter) + `countryCode`. Events global (`/api/events`) + rein client-seitig liga-gefiltert. **Severity P2.**

## Fantasy — Top-Befunde
| # | Sev | Issue |
|---|-----|-------|
| 1 | ~~P1~~ ✅ **310** | Active-GW: ~~Admin schreibt nur clubs~~ → `set_active_gameweek` liga-weit + Drift-Guard-Skript (nightly). leagues=Lese-Wahrheit |
| 2 | P1 🔴 | Süper Lig active_gameweek=34 bei max=38 + API-Key seit 06.05 → Advance kann nicht heilen (API-Key-blockiert) |
| 3 | ~~P1~~ ✅ **306** | Wildcards: ~~35 Balances ohne Ledger~~ → **dormant** (35 leere Backfill-Rows, 0 Aktivität, Ledger-Pfad korrekt). swallow→throw + doku. Kein Risiko. |
| 4 | ~~P1~~ ✅ verifiziert | Lineup `wildcardSlots:Set` = **false-positive** (kein persist/cache/RPC-Serialization, in-memory props; Slice-267-Klasse trifft nicht). Rehydration nur dormantes Wildcard-Feature. Slice 312 Sweep |
| 5 | ~~P1~~ ✅ **311** | GW-Status: ~~3× berechnet~~ → EINE `computeGwStatus` geteilt (useGameweek+SpieltagTab) |
| 6 | ~~P1~~ ✅ **307** | ~~last-5-Scores 2 Impls~~ → Picker auf Kanon-RPC vereinheitlicht (= Player #4, cross-domain) |
| 7 | P1 | Live-progressiveScores vs DB-slot_scores divergieren während GW |
| 8 | P2 | Events `createNextGameweekEvents` hardcoded >38 vs per-Liga max |
| 9 | P2 | League-Scope Dual-Achse leagueId(UUID) vs leagueName(String) |

**Cross-Domain:** `fixture_player_stats`+`player_gameweek_scores` geteilt mit Player; last-5-Doppelimpl + rating→fantasy_points→gw_score-Bridge = identisch Player #4/#8 → **gemeinsamer Migrationsschritt**.

---

# DOMÄNE 3 — MARKET / TRADING (gemappt 2026-06-13)

> Live-Fee-Config verifiziert: trade 600bps (350/150/100) · offer 200/50/50 · IPO 8500/1000/500. Money überall BIGINT cents.
> **Kern:** DB-Money-Path ist solide + atomar (RPC + advisory-locks + dedup-keys + append-only). **Alle Schwächen liegen im Read/Display-Layer** — vor allem Floor.

## 3.1 Floor / Preis — **die kritischste Inkonsistenz (P0 Money-Display)**
- **Kanonisch:** `players.floor_price` (cents) via DB `recalc_floor_price` = `LEAST(MIN(open-sell), neuester ipo.price)` → `last_price` → keep.
- **Redundant: 5-6 divergierende Reader, KEINER repliziert die DB-Formel** — (B) `getFloorPricesForPlayers` (direkt floor_price, omittet 0) · (C) `enrichPlayersWithData` `Math.min(orders)` (ignoriert last_price+DB-floor) · (D) `computePlayerFloor` `Math.min(listings)` (keine IPO) · (E) `resolveBuyPriceCents` (**treibt die angezeigte Kaufsumme im BuyConfirmModal!**) · (F) optimistic `floor ?? lastTrade`.
- **Wiring:** ⚠️ partiell-divergent — bei offenen Sell-Orders meist einig; bei „keine Sells + offene IPO" weichen (D) und (A) ab. `last_price`-Fallback fehlt client-seitig überall.
- **Ziel:** EINE `computeFloor(player, sellOrders)` mit **exakter DB-Formel** (`LEAST(minSell, ipo)`→`lastTrade`) — gemeinsam mit Player #1. **Severity P0** (resolveBuyPriceCents = direkter Money-Display).

## 3.2 Holdings — `holdings.{quantity, avg_buy_price}`, Write nur RPC, zombie-Trigger `holdings_auto_delete_zero` live. Redundant: `getHoldings` (mit player-Join) vs Dashboard-RPC (nackt). Floor-Leak: optimistic-Patch schreibt Client-Floor (Variante F) in Cache. **P1.**

## 3.3 Orders — `orders.{side,price,quantity,filled_qty,status}`, Public-Read `get_public_orderbook` (3 Wrapper sauber). 1000-Cap-bewusst. **P1.**

## 3.4 Offers — `offers.{side,price,...}`, RPCs sauber. Redundant: `incoming_offers/open_bids` aus Dashboard-RPC UND `offers.ts`, owned-Filter 2× (TS+RPC). **Fee-Typ-Drift:** `DbFeeConfig` fehlen `offer_*_bps`. **P1** (latent P0).

## 3.5 Wallet — `wallets` PK=user_id, `balance`+`locked_balance` cents. **Sauber, keine 2. Quelle.** Bewusst uncached (RLS-Race). **P0** (aktuell sauber).

## 3.6 Trades/Transactions — append-only (kein UPDATE/DELETE), Fees als absolute cents persistiert. Redundant: 3 Trade-Shapes (Db/Public/UserTradeWith); `volume_24h` + `trades_volume_7d` (2 Volumen-Felder). `transactions.amount` signed (untypisiert). **P0** (korrekt).

## 3.7 IPO — `ipos.{price,total_offered,sold,status}`. Redundant: `players.ipo_price` (Spiegel) vs `ipos.price` (Canon) vs `prices.ipoPrice = ipo_price ?? floor_price` (**Floor-Fallback vermischt Semantik**). **Ziel:** IPO-Preis strikt aus `ipos.price`. **P1.**

## 3.8 PBT — `pbt_treasury.{balance,...inflow}` via `credit_pbt`. Redundant: `Player.pbt` (Client-Spiegel) vs `getPbtForPlayer`. Einheiten cents↔BSD prüfen. **P1.**

## 3.9 Price History / Trending — Redundant: 24h-Change 3-fach (`players.price_change_24h` Cron-Skalar vs RPC-Output vs client-derived history7d). **Trending-Strip nutzt DB-floor_price, Markt-Liste nutzt computePlayerFloor → 2 Floors für 1 Spieler auf /market.** **P2.**

## 3.10 Fee Config — **P0 Typ-Drift**
- **Kanonisch:** `fee_config` (global + club-overrides). Fees NIE client-berechnet (alle in RPCs) = gut.
- **Bruch:** `DbFeeConfig` TS-Typ (`types:954-968`) fehlen **`offer_*_bps` + `abo_discount_*_bps`** (live in DB, in RPCs genutzt). Club-override Teil-bps → hardcoded RPC-Defaults statt globaler Row → stille Fee-Drift/Club. `trade_platform_bps=350` = Remainder-Anzeige, nie direkt genutzt.
- **Ziel:** `DbFeeConfig` an Live-Schema angleichen. **Severity P0** (latent — exakt die „fee-formula drift"-Klasse).

## Market/Trading — Top-Befunde
| # | Sev | Issue |
|---|-----|-------|
| 1 | ~~P0 Money~~ ✅ **303** | ~~Floor 5-6 divergierende Berechnungen~~ → Teil C: alle Reader auf `players.floor_price`; resolveBuyPriceCents=floorBsd |
| 2 | ~~P0 Money latent~~ ✅ **304** | `DbFeeConfig`-Typ um offer_*_bps + abo_discount_*_bps ergänzt (Slice 304) |
| 3 | ~~P1~~ ✅ **303** | ~~2 Floors auf /market~~ → Trending+Liste teilen jetzt `players.floor_price` (computePlayerFloor=Passthrough) |
| 4 | ~~P1~~ ✅ **308** | ~~IPO-Preis `ipo_price ?? floor_price`~~ → dbToPlayer strikt aus ipo_price (undefined wenn kein IPO), Floor-Fallback entfernt |
| 5 | ~~P1~~ ✅ **303** | ~~Holdings-Floor-Leak~~ → optimistic kommt jetzt aus RPC-Response statt Client-Recompute |
| 6 | ~~P1~~ ✅ **313** (verifiziert: intentional, defer) | Offers Dual-Source — 2 Lese-Pfade, **beide mit aktiven Konsumenten**: `get_market_user_dashboard`-RPC (=/market konsolidiert, useMarketData) + `offers.ts`-Hooks (`useIncomingOffers`/`useOpenBids` für KaderTab/Bestand). Owned-Filter 2× ist gewollte Surface-Trennung. Konsolidieren = Live-Beta-Regressionsrisiko ohne User-Nutzen → defer bis post-Beta |
| 7 | P1 | Platform-Fee = Remainder, `trade_platform_bps` nie direkt genutzt (Doku-Drift) |
| 8 | P2 | 24h-Change 3 Quellen · volume_24h vs trades_volume_7d |
| — | ✅ | **Robust, NICHT ändern:** Money-Writes atomar (RPC+lock+dedup), append-only, zombie-Trigger, uncached-gegen-RLS-Race |

**Cross-Domain:** Floor (#1) ist gemeinsam mit Player #1 → **EINE `computeFloor`**. Schema≠TS-Typ-Drift (#2 hier, Phantom-Spalten bei Player) ist ein **wiederkehrendes Muster** über Domänen.

---

# ÜBERGREIFENDE MUSTER (über Player + Fantasy + Trading)

1. **FLOOR PRICE = das #1-Problem projektweit** — 5-6 Client-Berechnungen + 1 DB-Canon, keine repliziert die DB-Formel. Berührt Player + Trading + Fantasy(IPO). **Eine `computeFloor` ist der höchste Einzel-Hebel.**
2. **Schema ≠ TS-Typ** — Phantom-Spalten (`players.rating/score/form*`), fehlende Spalten (`DbFeeConfig.offer_*_bps`). Klasse: TS-Typ driftet von Live-DB. → Ratchet-Kandidat (Type-Truth-Audit erweitern).
3. **2 physische Spalten / 2 Implementierungen für 1 Semantik** — active_gameweek (clubs/leagues), last-5-Scores (2 Impls), GW-Status (3×), 24h-Change (3×). Klasse: kein „single computation".
4. **Audit-Fehldiagnose: leere Backfill-Platzhalter** — wildcard_transactions leer bei „35 Balances", die aber alle 0 sind (Backfill-Platzhalter, 1 Timestamp). Slice 306 widerlegt die „Aggregat ohne Audit-Trail = Risiko"-These: Werte echt UND Write-Pfad schreibt nicht → erst dann Risiko. Klasse: vor Risiko-Label Row-Werte + RPC-Ledger-Pfad verifizieren.
5. **Dormant/orphan Features mit Test-Daten** — CommunityValuation + 2 Tabellen, predictions (1 Zeile). Klasse: gebaut, nie verdrahtet (S6-Removal-Kandidaten).
6. **Externe Dep blockiert Heilung** — API-Football-Key seit 06.05 → SL-GW-Drift + Live-Pfade dormant. Klasse: nicht-redundant, sondern dormant.
