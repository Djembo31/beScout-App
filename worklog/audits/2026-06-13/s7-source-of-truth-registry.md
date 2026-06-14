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
| 4 | **Club** | club, clubChallenges, clubCrm, clubSubscriptions, fanRanking, foundingPasses | 🟡 P1 | ✅ gemappt (Slice 314) |
| 5 | **Social / Community** | social, posts, votes, communityPolls, notifications, feedback | 🟡 P1 | ✅ gemappt (Slice 314) |
| 6 | **Gamification / Economy** | missions, dailyChallenge, streaks, mysteryBox, equipment, cosmetics, mastery, tickets, airdrop | 🟡 P1 | ✅ gemappt (Slice 314) |
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

# DOMÄNE 4 — CLUB (gemappt 2026-06-14)

> Live-Schema (Projekt `skzjfhvgccaeplydsunz`): `clubs` 134 · `club_subscriptions` **2** (davon active+gültig **0**) · `user_founding_passes` **0** · `fan_rankings` **37** (alle total_score>0: zuschauer 1 / stammgast 33 / ultra 3) · `club_followers` 21 · `club_admins` 25 · `club_withdrawals` 0 · `fee_config` 1 globale Zeile (club_id NULL).
> **Korrektur zweier verbreiteter Annahmen:** (1) `club_challenges` **existiert NICHT** in der Live-DB — ebenso `achievement_perk_claims`. Der komplette `clubChallenges`-Service + Hook + Admin-Tab feuern gegen Phantom-Tabellen (Muster #2 + #5). (2) `clubCrm` ist **kein eigenes Schema** — reiner Read-Aggregator über `club_followers`/`club_subscriptions`/`holdings`/`activity_log`/`players` (keine eigene Tabelle).
> **Money-Path-Kern:** `subscribe_to_club` + Abo-Fee-Discount sind robust + atomar. `grant_founding_pass` (Kill-Switch EUR 900K) ist **scharf und korrekt**, hat aber zwei Schema≠TS-Drifts (bcredits, Preis↔Tier-Bindung).

## 4.1 Club-Identity (name, slug, league, branding, stadium)
- **Kanonisch:** `clubs.{id,slug,name,short,league,league_id,country,city,stadium,stadium_image_url,logo_url,primary_color,secondary_color,is_verified,plan}` via `getClubBySlug` RPC (`club.ts:10`) bzw. expliziter `.select()`-Liste (`club.ts:24,36,374`). 134 Zeilen.
- **Redundant:** `clubs.league` (TEXT, Display) neben `clubs.league_id` (UUID, Resolve) — identisches `players.club`/`club_id`-Muster aus Player 1.1. `clubs.active_gameweek` (Treiber) gespiegelt nach `leagues.active_gameweek` (Lese-Truth) — siehe Fantasy 2.1, cross-domain.
- **E2E:** ✅ intakt (RPC + getClubById/getAllClubs/getClubsWithStats, `getClubsWithStats` mit korrektem 1000-Cap-Chunking `club.ts:385-418`).
- **Schwäche:** `clubs.referral_code` + `clubs.api_football_id` existieren live, sind aber in **keiner** Service-`.select()`-Liste (dormant Spalten). `getActiveGameweek(clubId)` (`club.ts:575`) liest weiter `clubs.active_gameweek` statt `leagues` — bewusst belassen (Fantasy 2.1 Slice 310: post-Fix clubs===leagues, harmlos).
- **Severity:** P2 (Identity stabil; league/league_id-Drift P1 bei Liga-Wechsel, erbt Player-1.1-Klasse).

## 4.2 Club-Subscriptions / Abos (Money-Path)
- **Kanonisch (Preis):** `subscribe_to_club`-RPC hardcoded `bronze 50000 / silber 150000 / gold 300000` cents (live verifiziert via `pg_get_functiondef`). Atomar: `FOR UPDATE` Wallet-Lock + `check_or_reserve_dedup_key`-Idempotenz (300s) + `transactions`-Append + 60s-Replay-Guard.
- **Kanonisch (Fee-Discount):** `fee_config.abo_discount_{bronze,silber,gold}_bps` = live **50/100/150** (global row). Im Buy-RPC club-scoped konsumiert: `v_discount_bps` aus `club_subscriptions WHERE club_id = player.club_id` → `GREATEST(0, trade_fee_bps - discount)`. **Korrekt club-gebunden.**
- **Redundant:** `clubSubscriptions.ts` TS-Konstanten doppeln beide DB-Wahrheiten — `TIER_CONFIG.priceCents` (50000/150000/300000) **== RPC** ✅ und `feeDiscountBps` (50/100/150) **== fee_config** ✅. Aktuell konsistent, aber **3. Hardcode-Stelle**: der Trade-Limit-CASE im Buy-RPC (`gold 200 / silber 50 / bronze 30 / else 20`) ist eine weitere tier-gebundene Konstante ohne fee_config-Eintrag.
- **E2E:** ✅ intakt. Tier-Highest-Pick dupliziert: TS `tierRank` + RPC `ORDER BY CASE tier` — gleiche Logik, 2 Impls.
- **Schwäche:** `cancelSubscription` macht direkten `.update()` auf RLS-geschützte Tabelle statt RPC + swallowt Fehler (`console.error; return false`) — verstößt gegen database.md „RLS `.update()` stumm blockiert → IMMER RPC".
- **Inkonsistenz:** Live nur **2 Zeilen, 0 aktiv+gültig** — Demo-Pfad zeigt aktuell „keine Abos". Kein Korruptions-Risiko, aber Money-Demo unbefüllt.
- **Severity:** **P1 (Money, aktuell sauber).** `cancelSubscription` RLS-Swallow = latent P1.

## 4.3 Founding-Passes (Money-Path, Kill-Switch EUR 900K)
- **Kanonisch:** `user_founding_passes.{tier,price_eur_cents,bcredits_granted,migration_bonus_pct,pass_number,payment_reference,granted_by}` via `grant_founding_pass`-RPC (SECURITY DEFINER, Admin-only). **Kill-Switch scharf + korrekt:** `v_kill_switch_limit := 90000000` cents (= EUR 900K), `SUM(price_eur_cents) + p_price > limit → {ok:false, KILL_SWITCH_ACTIVE}`. Atomar: Pass-Insert + Wallet-UPSERT + `transactions`-Append. Live **0 Zeilen**.
- **Redundant / Schema≠TS (Muster #2 — ZWEI Drifts):**
  1. **bcredits divergieren** zwischen TS und RPC: `FOUNDING_PASS_TIERS.bcreditsCents` = fan **100_000** / scout 500_000 / pro 2_000_000 / founder 5_000_000 **≠** RPC `v_bcredits` = fan **250000** / scout 1000000 / pro 3500000 / founder 10000000. Die Wallet bekommt den **RPC-Wert**, die Admin-UI/Matrix zeigt den **TS-Wert** → angezeigte ≠ gutgeschriebene Credits (2,5×–2× Drift).
  2. **Preis↔Tier nicht server-validiert:** RPC nimmt `p_price_eur_cents` als freien Caller-Parameter und speichert ihn verbatim (kein CHECK gegen Tier). Der Admin-Tab füttert `tierDef?.priceEurCents ?? 0` aus TS (`AdminFoundingPassesTab.tsx:171`) — die EUR-Wahrheit lebt **nur im Client**. Kill-Switch summiert exakt diesen ungeprüften Wert → ein falscher Client-Preis verfälscht das 900K-Limit.
- **E2E:** ✅ intakt. `migration_bonus_pct`: TS 15/25/35/50 == RPC ✅ (nur bcredits + Preis driften).
- **Severity:** **P0 (Money — Demo/Launch-Path).** bcredits-Drift = falsche gutgeschriebene Geldmenge; Preis-nicht-validiert = Kill-Switch-Integrität hängt am Client.

## 4.4 Fan-Ranking (CSF / Fan-Tiers)
- **Kanonisch:** `fan_rankings.{user_id,club_id,rank_tier,csf_multiplier,event_score,dpc_score,abo_score,community_score,streak_score,total_score,calculated_at}` (Composite-PK, NUMERIC-Scores) via `calculate_fan_rank` / `batch_recalculate_fan_ranks` / `increment_fan_rank_score`-RPCs. **37 echte Zeilen** (alle total_score>0 — KEIN Backfill-Platzhalter).
- **E2E:** ✅ **intakt** — `getFanRanking`/`getClubFanLeaderboard` → `useFanRanking`/`useClubFanLeaderboard` → `FanRankOverview.tsx` + `ManagerTab.tsx`. Einziges voll-verdrahtetes nicht-triviales Club-Sub-Feature.
- **Schwäche:** `getClubFanLeaderboard` nutzt `profiles!inner`-Join mit manuellem Mapping — PostgREST-nested-Fragilität, aber `!inner` + defensiv = akzeptabel. `csf_multiplier` speist Fantasy/Trading-Boosts — cross-domain, einheiten-prüfen.
- **Severity:** **P1 — Robust, NICHT ändern** (außer optional Mapping-DRY).

## 4.5 Club-Challenges (Fan-Rewards) — **GEBROCHEN: Phantom-Tabellen**
- **Kanonisch (behauptet):** `club_challenges` + `achievement_perk_claims`. **Beide existieren in der Live-DB NICHT** (verifiziert).
- **E2E:** ❌ **gebrochen** — `clubChallenges.ts` → `queries/clubChallenges.ts` → `FanChallengesTab.tsx` (voll gebauter Admin-Tab). Jeder Read/Write läuft in `relation does not exist`. Schlimmer als CommunityValuation (Player 1.4): dort importlos; hier **importiert + im Admin-UI gerendert** → ein Club-Admin der den Tab öffnet sieht einen Hard-Error statt leerer Liste.
- **Ziel:** Build-vs-Cut. (A) Tabellen deployen (RLS + Policies) ODER (B) Service+Hook+Tab entfernen (S6-Removal). Bis dahin: Tab aus Admin-Navigation gaten.
- **Severity:** **P1** (Crash im Club-Admin-Flow; Demo-Risiko wenn Tab erreichbar).

## 4.6 Club-CRM (Fan-Segmente / Retention)
- **Kanonisch:** **keine eigene Tabelle** — reiner Read-Aggregator (`clubCrm.ts`) über `club_followers`(21)+`club_subscriptions`(2)+`holdings`+`activity_log`+`players`. Segment-Truth abgeleitet.
- **Redundant:** DAU/WAU/MAU aus `activity_log` überschneidet sich mit `getClubFanAnalytics` (`rpc_get_club_fan_stats`) → **2 Fan-Analytics-Pfade** (client-aggregiert vs SECURITY-DEFINER-RPC), uneinig bei „aktiver Fan".
- **Schwäche:** `getClubFanList` lädt `activity_log` mit `.limit(1000)` ohne Chunking → silent-fail-Klasse; `holdings`-`.in()` bei >~200 Club-Spielern PostgREST-400-Risiko.
- **Severity:** **P2** (Admin-Analytics; 1000-Cap latent P1 bei aktivem Club).

## Club-Domäne — Top-Befunde (severity-sortiert)

| # | Sev | Semantik | Issue | Ziel |
|---|-----|----------|-------|------|
| 1 | **P0 Money** | Founding-bcredits | TS `FOUNDING_PASS_TIERS.bcreditsCents` (fan 100k…) **≠** RPC `v_bcredits` (fan 250k…); Wallet bekommt RPC-Wert, UI zeigt TS-Wert → falsche angezeigte Credits | EINE Quelle (RPC-Werte in TS spiegeln ODER RPC aus Config lesen) + bcreditsLabel angleichen |
| 2 | **P0 Money** | Founding-Preis↔Tier | `grant_founding_pass` validiert `p_price_eur_cents` NICHT gegen Tier; EUR-Wahrheit nur im Client; Kill-Switch summiert ungeprüften Wert | Preis tier-gebunden server-seitig ableiten (CASE wie bcredits) |
| 3 | P1 | Club-Challenges | `club_challenges` + `achievement_perk_claims` existieren nicht — Service+Hook+Admin-Tab crashen (42P01) | Tabellen deployen ODER Feature entfernen; bis dahin Tab gaten |
| 4 | P1 | Club-Abos | `cancelSubscription` direkter RLS-`.update()` + swallow statt RPC | Auf RPC + throw umstellen |
| 5 | P1 | Abo/Trade-Limit | Tier→Trade-Limit (gold 200/silber 50/bronze 30) hardcoded im Buy-RPC = 3. Konstanten-Ort | Nach fee_config / zentrale Config |
| 6 | P2 | Club-Identity | `clubs.league`(TEXT) vs `league_id`(UUID); erbt Player-1.1-Klasse | `league_id` als Truth (post-Beta) |
| 7 | P2 | Club-CRM | `activity_log .limit(1000)` ohne Chunking + 2 divergierende „aktive Fans"-Pfade | Chunking + EINE Fan-Analytics-Quelle |
| 8 | P3 | dormant | `referral_code`/`api_football_id` in keiner `.select()`; subs/passes/withdrawals leer (unbefüllt, kein Risiko) | Demo-Seed ODER bewusst dormant |
| — | ✅ | **Robust, NICHT ändern** | `subscribe_to_club` atomar+club-scoped Discount · `grant_founding_pass` Kill-Switch scharf · **Fan-Ranking voll E2E (37 echte Zeilen)** | — |

**Cross-Domain:** `fee_config.abo_discount_*_bps` → Trading-Money-Path (Slice 304 deckte das ab, Club erbt Fix); Club-Fee-Anteil `trade_club_bps=100` + Withdrawals sitzen auf Trading-Ledger. `clubs.active_gameweek`↔`leagues` = Fantasy 2.1 (Slice 310). `clubs.league`/`league_id` = Player-1.1-Klasse → gemeinsamer post-Beta-Schritt. Founding-bcredits/Preis = Muster #2 im Money-Path. Club-Challenges = Muster #5+#2 kombiniert.

---

# DOMÄNE 5 — SOCIAL / COMMUNITY (gemappt 2026-06-14)

> Live-Schema: `notifications` **327** (davon **60 mit `i18n_key`**, 267 ohne) · `user_follows` **29** · `posts` **10** · `post_votes` **7** · `community_polls` **1** · `tips` **1** · `notification_preferences` **0** · `feedback` **0** · **`research_posts`/`research_ratings`/`research_unlocks` je 0** · **`club_votes`/`vote_entries`/`community_poll_votes` je 0**.
> **Korrektur zweier database.md-Annahmen:** `posts` **HAT** Counter-Spalten `upvotes`/`downvotes` (INTEGER, de-normalisiert) — nur `research_posts` hat sie nicht. `post_votes.vote_type`=SMALLINT 1/-1, `user_follows.following_id`, `notifications.read` — alle live bestätigt.
> **Kern-Befund:** Mutation-Pfad (vote_post, cast_vote, unlock_research, follow_user) läuft sauber über RPCs mit Toggle-Off-Discriminator + RLS. Schwächen in (a) Notification-Doppel-Repräsentation (String vs `i18n_key`), (b) dormanten Content-Typen (research/votes = 0 Rows trotz vollständigem Build), (c) de-normalisierten Counter-Spalten ohne sichtbaren Reconcile.

## 5.1 Follows / Social-Graph
- **Kanonisch:** `user_follows.{follower_id,following_id}` (29 Rows). Write via RPC `follow_user`/`unfollow_user`. Batch-Read `rpc_get_user_social_stats`.
- **Redundant:** Counts **3-fach** — Live-`COUNT(*)`, RPC-Aggregat, de-norm Cron-Spiegel `user_stats.{followers_count,following_count}` (Leaderboard + Achievement-Checks).
- **E2E:** ✅ intakt, RLS sauber. **Missverständnis:** Cron-Spiegel kann von Live-COUNT driften → Leaderboard (Spiegel) vs FollowBtn (Live) = 2 Follower-Zahlen möglich.
- **Severity P2.** Ziel: EINE Lese-Quelle/Surface (RPC=Kanon, Spiegel nur Sort).

## 5.2 Posts / Community-Content
- **Kanonisch:** `posts` (10 Rows, explizite Spaltenliste). Write direkt `.insert()` (RLS-Policy live).
- **Redundant:** de-norm Counter `posts.upvotes/downvotes` **neben** `post_votes`-Ledger; `replies_count`-Spiegel; **`posts.club_name`(TEXT) neben `club_id`(UUID)** = Player-§1.1-Doppelung.
- **Missverständnis:** Client patcht Counter optimistisch + überschreibt mit RPC-Response — bei Counter/Ledger-Divergenz gewinnt die Counter-Spalte (Display ≠ Ledger).
- **Severity P1** (Counter-Drift = sichtbare falsche Vote-Zahl). Ziel: Counter als bewussten Read-Cache dokumentieren; `club_name` deprecaten.

## 5.3 Votes / Post-Sentiment (vote_post Toggle)
- **Kanonisch:** `post_votes` (SMALLINT 1/-1, 7 Rows) — Ledger. Write **nur** via RPC `vote_post`.
- **Robust, NICHT ändern:** Toggle-Off-Discriminator `oldVote===voteType` → DELETE-Branch; Seiteneffekt-Skip bei Toggle-Off (Anti-Spam); Service-Pre-Cast-Guard (Slice 165).
- **Severity P2:** `vote_post`-Return ohne `success`-Flag (Service-Guard mitigiert) → Discriminated-Union-Migration optional.

## 5.4 Club-Votes & Community-Polls (bezahltes Voting)
- **Kanonisch:** **Zwei getrennte Systeme** — (a) `club_votes`+`vote_entries` via `cast_vote`; (b) `community_polls`+`community_poll_votes` via `cast_community_poll_vote` (80/20-Split). Gleiche JSONB-`options`-Semantik, gleiches Abo-Gewicht → **Muster #3 (2 Impls/1 Semantik)**.
- **E2E:** ⚠️ **dormant** — alle Vote-Tabellen 0 Rows, nur 1 `community_polls` (Test). `cast_vote`-Return nicht discriminated, `cast_community_poll_vote` schon (Inkonsistenz). `cost_bsd`-Spaltenname-Drift (cents↔„bsd").
- **Severity P2** (dormant; bei Aktivierung Money → P1). Ziel: vor Aktivierung konsolidieren (S6).

## 5.5 Research / Premium-Content (Paywall)
- **Kanonisch:** `research_posts` + Splits `research_unlocks` (80/20) + `research_ratings.rating`(1-5). Aggregat `avg_rating`/`ratings_count` (de-norm Spiegel).
- **E2E:** ⚠️ **vollständig dormant** — 3 Tabellen je 0 Rows, Service+RPCs+UI gebaut, Write-Pfad korrekt (Muster #5, keine Fehldiagnose). Track-Record 2-fach (RPC vs client `getAuthorTrackRecord`). `price_at_creation` `floor_price || ipo_price || 0` versteckt floor=0 (Player-§1.4-Erbe).
- **Severity P2.**

## 5.6 Notifications
- **Kanonisch:** `notifications.{type,title,body,reference_id,reference_type,read}` (327 Rows). Realtime via `useNotificationRealtime`.
- **Schema≠Verwendung (Muster #2):** **Dual-Repräsentation** — Service schreibt pre-localized DE-Strings in `title`/`body`, während `i18n_key`/`i18n_params` (JSONB) existieren + `NotificationDropdown` zuerst `i18n_key` auflöst. Live **60/327 mit i18n_key**. `getNotifications` selektiert `i18n_key`/`params` **gar nicht** → Reload (roher String) vs Realtime-Push (lokalisiert) **divergieren**.
- **Schwäche:** `notification_preferences` 0 Rows (Defaults-all-true, Gate ungenutzt); `createBatchedNotification` extrahiert Count via Regex aus Title-String (fragil). `reference_id` ist TEXT (bewusst, Achievement-Keys) — kein Typ-Bug.
- **Severity P1** (sichtbare Lokalisierungs-Inkonsistenz, Beta-relevant). Ziel: `getNotifications`-SELECT um `i18n_key,i18n_params` ergänzen (1-Zeilen-Fix); neue Notifs nur via i18n_key.

## 5.7 Feedback
- **Kanonisch:** `feedback` (0 Rows), Write-only `.insert()` (RLS-Policy live). `category`/`status` dormant. **Severity P3**, kein Handlungsbedarf.

## Social-Domäne — Top-Befunde (severity-sortiert)

| # | Sev | Semantik | Issue | Ziel |
|---|-----|----------|-------|------|
| 1 | **P1** | Notifications | Dual-Repräsentation `title`-String vs `i18n_key`; `getNotifications`-SELECT lässt i18n_key/params weg → Reload (roher String) vs Realtime-Push (lokalisiert) divergieren | `getNotifications`-SELECT um `i18n_key,i18n_params` ergänzen; neue Notifs nur via i18n_key |
| 2 | **P1** | Posts/Votes | `posts.upvotes/downvotes` (de-norm) ≠ `post_votes`-Ledger; Display-Truth ist Counter, kein sichtbarer Reconcile | Counter als Read-Cache dokumentieren; Ledger-Recompute-Guard bei Drift |
| 3 | P2 | Club-Votes/Polls | 2 fast-identische Voting-Systeme, beide dormant (0 Rows); `cast_vote`-Return nicht discriminated | Vor Aktivierung konsolidieren (S6); cast_vote-Return angleichen |
| 4 | P2 | Research | Komplett dormant (3 Tabellen 0 Rows); Track-Record 2-fach; `price_at_creation` `\|\|` versteckt floor=0 | Track-Record auf RPC vereinheitlichen; `\|\|`→`??` |
| 5 | P2 | Follows | Counts 3-fach (Live vs RPC vs Cron-Spiegel) → 2 Zahlen möglich | EINE Lese-Quelle/Surface |
| 6 | P2 | Votes | `vote_post`-Return ohne `success`-Flag (Service-Guard mitigiert) | Discriminated Union (Consumer: nur posts.ts) |
| 7 | P2 | Posts | `club_name`(TEXT) neben `club_id`(UUID) = Player §1.1 | club_id als Truth (gemeinsam Player) |
| 8 | P3 | Feedback | Write-only, 0 Rows, `category`/`status` dormant | Kein Handlungsbedarf |
| — | ✅ | Mutation-Pfad | **Robust, NICHT ändern:** vote_post-Toggle-Off-Discriminator + Seiteneffekt-Skip; Service-Pre-Cast-Guards; RLS vollständig; Money-Splits in RPCs | — |

**Cross-Domain:** `research_posts.call` → `getPlayerSentimentCounts` → `ScoutConsensus`/`BuyConfirmModal` = **Player §1.3 Klarstellung: die Spieler-Sentiment-Brücke ist `call`, NICHT `avg_rating`** (avg_rating = reines Content-Rating, fließt NICHT in Player-Views). `user_stats`-Cron-Spiegel geteilt mit Gamification (Reconcile-Punkt). `tips`-Enrich auf Posts → Domäne 7. `club_name`/`club_id` = Player §1.1 (gemeinsamer Migrationsschritt). Notification-i18n-Drift betrifft ALLE Domänen (createNotification aus Trading/Fantasy/Offers/Bounties).

---

# DOMÄNE 6 — GAMIFICATION / ECONOMY (gemappt 2026-06-14)

> Live-Schema: `scout_scores` 128 (alle non-default) · `score_history` 1.758 (echte Delta-Logs) · `user_missions` 3.987 (153 completed, 4 claimed) · `mission_definitions` 30 · `user_tickets` 128 (21 non-zero = `ticket_transactions` 21 distinct) · `ticket_transactions` 191 · `user_streaks` 28 (alle aktiv) · `mystery_box_results` 44 · `user_equipment` 15 · `cosmetic_definitions` 14 · `user_cosmetics` **3** · `dpc_mastery` 2.532 (2.480 lvl>1) · `airdrop_scores` 49 (alle >0) · `user_daily_challenges` **1** · `daily_challenges` 52 · `score_road_claims` 4 · `achievement_definitions` 33 · `user_achievements` 28 · `monthly_liga_snapshots`/`winners` **0**.
> **Korrektur Player-§1.5:** `score_history` ist **NICHT** ein domänenfremder „User-Reputation-Delta-Log" — es ist der **kanonische Audit-Trail der 3-D-Elo-Dimension-Scores** (`dimension`/`delta`/`score_before`/`score_after`/`event_type`), speist `scout_scores`, gehört **hierher (6.1)**. Player-§1.5 meinte korrekt „nicht Player-Score", aber die Tabelle ist Gamification-Eigentum.
> **Naming:** Login-Streak = `user_streaks` (RPC `record_login_streak`), Score-Road = `score_road_claims`/Config `score_road_config` (DB-getrieben), Mastery = `dpc_mastery`.

## 6.1 Dimension-Scores / Ränge (3-D Elo)
- **Kanonisch:** `scout_scores.{trader,manager,analyst}_score` (128, Start 500) + Audit `score_history`. Schreib-Pfad **ausschließlich** REVOKED RPCs `award_dimension_score`/`award_score_points` (live verifiziert authenticated=false) → nur via DB-Triggers.
- **Gesamt-Rang:** **KEINE `overall_score`-Spalte** → Median client-seitig `sorted[1]` (`scoutScores.ts:306`). **gamification.md „Median, NICHT Average" eingehalten, kein Stored-Rank.**
- **Schwäche:** `getScoutLeaderboard('overall')` ordert DB nach `trader_score`, zieht `limit*3`, sortiert dann client nach Median → **Truncation-Bias** (median-stark/trader-schwach fällt raus). Bei 128 Usern unkritisch, skaliert schlecht.
- **Severity P1** (Score Money-nah über score_road/monthly; Bias kosmetisch).

## 6.2 Score Road (11 Milestones, BSD-Reward)
- **Kanonisch:** `score_road_claims` (4) + Config `score_road_config` (DB). Mint via RPC `claim_score_road` (idempotent, auth).
- **Schwäche/Money:** `claimScoreRoad` prüft Return via **Feld-Existenz** (`'error' in data`) statt `success`-Discriminator → Cast lügt bei RPC-Drift. Reward = BSD-Mint.
- **Severity P1.**

## 6.3 Missions
- **Kanonisch:** `user_missions` (3.987; 153 completed = **echte Aktivität**) + `mission_definitions` (30). Progress nur via Wrapper `track_my_mission_progress` (direkt `update_mission_progress` REVOKED). Reward `claim_mission_reward`.
- **Schwächen:** 60s In-Process-Cache; Circular-Dep dyn-import; `_userId`-Param toter Ballast (Server nutzt auth.uid()). Cross-Mint: Claim triggert Ticket-Credit (max 50/Claim, durch 100-Cap gedeckt).
- **Severity P1** (robust verdrahtet).

## 6.4 Daily Challenge — partiell dormant
- **Kanonisch:** `daily_challenges` (52) + `user_daily_challenges` (**1 Row**) via `get_todays_challenge`/`submit_daily_challenge`.
- **E2E:** ✅ Code intakt, aber **1 Submission gesamt** → faktisch dormant (Muster #5). Submit swallowt `{ok:false}` statt throw.
- **Severity P2.**

## 6.5 Streaks / Shields
- **Kanonisch:** `user_streaks` (28, alle aktiv) + `streak_config` + `streak_milestones_claimed` (10) via `record_login_streak` (idempotent).
- **Robust:** Mission-Doppelzähl bewusst vermieden (RPC inkrementiert daily_login intern, Client darf NICHT zusätzlich feuern). Cross-Mint: `3d=5/7d=15/14d=50/30d=150 $SCOUT`.
- **Severity P1** ($SCOUT-Mint, auth-guarded + idempotent → robust).

## 6.6 Mystery Box (Tickets→Equipment/Cosmetics/bCredits)
- **Kanonisch:** `mystery_box_results` (44) + Config `mystery_box_config` (RLS-gelockt, nur via RPC lesbar). Mint via `open_mystery_box_v2` (**Slice-178-Idempotency 300s** gegen Double-Deduct/Grant).
- **Schwäche:** RPC returnt camelCase (`rewardType`) vs v1-snake_case — Casing-Falle (Muster #2), dokumentiert.
- **Severity P1** (Money-nah; Idempotency = robust).

## 6.7 Equipment / Cosmetics
- **Kanonisch:** `user_equipment` (15) + `equipment_definitions` (5) + `equipment_ranks` (Multiplier). Cosmetics `user_cosmetics` (**3**) + `cosmetic_definitions` (14). Writes via `equip_to_slot`/`equip_cosmetic`.
- **E2E:** Equipment ✅; Cosmetics ✅ verdrahtet aber **3 Rows = near-dormant**. `equipCosmetic` **swallowt** `{ok:false}` (vs equipment.ts throw) — Sub-Domain-Inkonsistenz.
- **Severity P2** (Equipment→Fantasy-Score via Rank-Multiplier = P1-Berührung).

## 6.8 DPC-Mastery (XP Level 1–5)
- **Kanonisch:** `dpc_mastery` (2.532, **2.480 lvl>1 = massiv echt**). XP-Write nur via REVOKED `award_mastery_xp` → Triggers.
- **Schwäche:** Thresholds `[0,25,75,175,350]` TS-Konstante (`mastery.ts:21`) — **Drift-Risiko** falls Trigger andere Schwellen nutzt (nicht ohne Trigger-Body verifizierbar).
- **Severity P2** (größtes echtes Daten-Volumen).

## 6.9 Tickets (In-Game-Currency)
- **Kanonisch:** Balance `user_tickets.balance` (128) + Ledger `ticket_transactions` (191). Writes `credit_tickets`/`spend_tickets`.
- **„Balance ohne Ledger"-Verdacht — geprüft (Slice-306-Lehre):** 107/128 haben balance=0 ohne Ledger = leere Backfill-Platzhalter → KEIN Risiko. 21 non-zero matchen 21 Ledger-User. **20/21 balance==SUM(ledger)**, **1 Drift** (user `99b601d2…`: balance 70 vs ledger 65, +5). Echter kleiner Drift, nicht systemisch.
- **Robust, NICHT ändern:** `credit_tickets` harte Auth-Guards (`p_user_id<>auth.uid()`→EXCEPTION; admin_grant-Block; `p_amount>100`→EXCEPTION).
- **Severity P1** (Mint robust+capped; 1 Balance-Drift P2).

## 6.10 Airdrop-Score
- **Kanonisch:** `airdrop_scores` (49, alle >0) via `refresh_my_airdrop_score()` / `refresh_airdrop_score` (**auth-guarded**, NICHT revoked).
- **Inkonsistenz:** Service-Kommentar behauptet „REVOKED" — falsch (auth-guarded). **Schema≠TS:** DB-`tier`=`'silver'` vs TS `'silber'` → `normaliseAirdropTier`-Mapper an jedem Read-Site (fragil).
- **Severity P2** (pre-token, kein Live-Money).

## 6.11 Achievements (33) — Cross-Domain-Fehlplatzierung
- **Kanonisch:** `user_achievements.achievement_key` (28) + `achievement_definitions` (33). **Schreib-Pfad: client-direktes `INSERT`** in `checkAndUnlockAchievements` (`social.ts:266`), KEIN REVOKED-RPC — abweichend vom Domänen-Rest. Funktion lebt in `services/social.ts`, gefeuert aus trading/offers/ipo → verstreut.
- **Severity P2** (Platzierungs-/Konsistenz-Schuld).

## 6.12 Monthly Liga Snapshots / Winners — dormant
- `monthly_liga_snapshots`/`winners` **0 Rows**, UI gebaut. Muster #5 (wartet auf erstes Season-Rollover; `getMonthlyLeaderboard` filtert `rank>0`). **Severity P3** (Reward-Mint erst bei Rollover → dann P1-Re-Check).

## Gamification-Domäne — Top-Befunde (severity-sortiert)

| # | Sev | Semantik | Issue | Ziel |
|---|-----|----------|-------|------|
| 1 | P1 | Score Road | `claimScoreRoad` Return via Feld-Existenz statt `success`-Discriminator → Cast lügt bei Drift (BSD-Mint) | RPC auf `{success}`-Union + Service-Guard (database.md §Discriminated Union) |
| 2 | P1 | Dimension-Score | `getScoutLeaderboard('overall')` `limit*3`+Client-Median = Truncation-Bias | Median DB-seitig (generated col/RPC-Order) |
| 3 | P1 | Tickets | 1 Balance-Drift (user 99b601d2: 70 vs Ledger 65, +5) | Recompute balance=SUM(ledger); Ratchet balance==ledger nightly |
| 4 | P2 | Daily Challenge | 1 Submission live = near-dormant + swallow statt throw | Aktivieren/markieren; swallow→throw |
| 5 | P2 | Cosmetics | `equipCosmetic` swallowt (vs equipment.ts throw); 3 Rows near-dormant | J11-Throw-Pattern angleichen |
| 6 | P2 | Airdrop | Kommentar „REVOKED" falsch; `tier` DB-`silver` vs TS-`silber` Mapper überall | Kommentar fixen; tier-Norm in zentralen Mapper |
| 7 | P2 | Mastery | XP-Thresholds TS-Konstante, nicht gegen Trigger verifiziert | Aus DB-Config lesen / Parität dokumentieren |
| 8 | P2 | Achievements | Write in `social.ts`, client-direktes INSERT, verstreut über trading/offers/ipo | Nach `services/gamification` + Domänen-Konvention |
| 9 | P2 | scout_scores | 2 Import-Türen (`scoutScores.ts`+`gamification.ts`-Re-Export) | Optionaler Cleanup |
| 10 | P3 | Monthly Liga | 0 Rows = dormant (gebaut, nie befüllt) | Bei Rollover Reward-Mint re-prüfen (→P1) |
| — | ✅ | **Robust, NICHT ändern** | `credit_tickets` Auth-Guards+100-Cap; `open_mystery_box_v2` Idempotency; Score/Mastery/Mission-Mint REVOKED→Trigger/Wrapper; Median korrekt; Streak-Doppelzähl vermieden | — |

**Cross-Domain:** Scores werden NICHT hier geschrieben, sondern via Triggers aus **Trading** (trade/ipo_buy), **Fantasy** (fantasy_placement), **Community** (post/follow) + Decay-Cron gespeist; `score_history` = gemeinsamer Audit-Sink (Gamification-Eigentum). `user_stats`-Spiegel geteilt mit Social (Reconcile). Ticket→MysteryBox→Equipment→Rank-Multiplier→**Fantasy-Scoring** = geschlossener Economy-Loop, alle Hops auth-guarded.

---

# ÜBERGREIFENDE MUSTER (über alle 6 gemappten Domänen — Player/Fantasy/Trading/Club/Social/Gamification)

1. **FLOOR PRICE = das #1-Problem projektweit** — 5-6 Client-Berechnungen + 1 DB-Canon, keine repliziert die DB-Formel. Berührt Player + Trading + Fantasy(IPO). **Eine `computeFloor` ist der höchste Einzel-Hebel.**
2. **Schema ≠ TS-Typ** — Phantom-Spalten (`players.rating/score/form*`), fehlende Spalten (`DbFeeConfig.offer_*_bps`). **Slice 314 bestätigt im Money-Path:** Founding-Pass `bcredits` TS≠RPC (fan 100k vs 250k → falsche angezeigte Credits), Airdrop `tier` DB-`silver` vs TS-`silber` (Mapper an jedem Reader), MysteryBox-RPC camelCase vs v1-snake. Klasse: TS-Typ driftet von Live-DB. → Ratchet-Kandidat (Type-Truth-Audit erweitern).
3. **2 physische Spalten / 2 Implementierungen für 1 Semantik** — active_gameweek (clubs/leagues), last-5-Scores (2 Impls), GW-Status (3×), 24h-Change (3×). **Slice 314 +:** 2 Voting-Systeme (club_votes vs community_polls), Follow-Counts 3-fach (Live/RPC/Cron-Spiegel), Research-Track-Record 2× (RPC vs client), Club-Fan-Analytics 2× (CRM vs rpc_get_club_fan_stats). Klasse: kein „single computation".
4. **Audit-Fehldiagnose: leere Backfill-Platzhalter** — wildcard_transactions leer bei „35 Balances", die aber alle 0 sind (Backfill-Platzhalter, 1 Timestamp). Slice 306 widerlegt die „Aggregat ohne Audit-Trail = Risiko"-These: Werte echt UND Write-Pfad schreibt nicht → erst dann Risiko. **Slice 314 angewandt:** Tickets 107/128 leere Platzhalter (kein Risiko), nur 1 echter Balance-Drift; Club-Subs/Founding leer-weil-unbenutzt (kein Risiko). Klasse: vor Risiko-Label Row-Werte + RPC-Ledger-Pfad verifizieren.
5. **Dormant/orphan Features mit Test-Daten** — CommunityValuation + 2 Tabellen, predictions (1 Zeile). **Slice 314 +:** Research (3 Tabellen je 0 Rows, voll gebaut), beide Voting-Systeme (0 Rows), Monthly-Liga-Snapshots (0 Rows), Daily-Challenge (1 Submission), Cosmetics (3 Rows). Klasse: gebaut, nie/kaum verdrahtet (S6-Removal- bzw. Aktivierungs-Kandidaten).
6. **Externe Dep blockiert Heilung** — API-Football-Key seit 06.05 → SL-GW-Drift + Live-Pfade dormant. Klasse: nicht-redundant, sondern dormant.
7. **🔴 Money-Truth nur im Client / nicht server-validiert (NEU, Slice 314 — höchste neue Severity)** — `grant_founding_pass` nimmt `p_price_eur_cents` als freien Caller-Parameter ohne Tier-CHECK; die EUR-Wahrheit lebt nur im Admin-Client (`AdminFoundingPassesTab.tsx:171`), und der Kill-Switch (EUR 900K) summiert exakt diesen ungeprüften Wert. Klasse: ein Money-Limit/Reward hängt an einem Client-gelieferten Wert. → Server-seitige Ableitung (CASE wie bcredits) Pflicht. **2 P0-Money-Befunde (Club #1/#2).**
8. **De-normalisierte Counter ohne sichtbaren Reconcile (NEU, Slice 314)** — `posts.upvotes/downvotes` (Spiegel) vs `post_votes`-Ledger (Display gewinnt der Spiegel); `user_stats.followers_count` vs Live-COUNT; `research_posts.avg_rating` vs `research_ratings`. Klasse: Aggregat-Spiegel kann von Ledger driften, UI liest den Spiegel. → Spiegel als bewussten Read-Cache dokumentieren + Recompute-Guard/Ratchet.
9. **Phantom-Tabellen: Service referenziert nie-deployte Tabelle (NEU, Slice 314)** — `club_challenges` + `achievement_perk_claims` existieren in der Live-DB NICHT, aber Service+Hook+Admin-Tab sind voll gebaut + im UI gerendert → Hard-Crash (42P01) statt leerer Liste. Schärfere Variante von #2/#5. → Deploy-vs-Cut-Entscheidung; bis dahin UI-Pfad gaten.
10. **Pre-localized String vs i18n_key (NEU, Slice 314)** — `notifications.title/body` = DE-String, parallel `i18n_key`/`i18n_params` (60/327 Rows); `getNotifications` selektiert i18n_key nicht → Reload (roher String) vs Realtime-Push (lokalisiert) divergieren. Cross-domain (alle createNotification-Caller). → SELECT ergänzen + neue Notifs nur via i18n_key.

---

## Phase-1-Stand (Map): 6/9 Makro-Domänen gemappt

✅ **Player · Fantasy · Trading** (Slice 302, alle P0) · ✅ **Club · Social · Gamification** (Slice 314, alle P1).
⏳ **Offen (P2/P3):** Creator/Sponsor/Revenue (7), Identity/Profile (8), Admin/Ops (9).

**Neue Money/Demo-Befunde aus Slice 314 (Phase-2-Kandidaten, severity-sortiert):**
- 🔴 **P0** Club #1 Founding-bcredits TS≠RPC-Drift (falsche angezeigte Credits)
- 🔴 **P0** Club #2 Founding-Preis nicht server-validiert (Kill-Switch-Integrität)
- 🟡 **P1** Club #3 Club-Challenges Phantom-Tabellen (Admin-Crash) · Club #4 cancelSubscription RLS-Swallow
- 🟡 **P1** Social #1 Notification-i18n-Drift (Beta-sichtbar) · Social #2 Posts-Counter-vs-Ledger
- 🟡 **P1** Gamif #1 Score-Road-Shape · #2 Leaderboard-Median-Bias · #3 1 Ticket-Balance-Drift
