# Impact Manifest — Slice 251 Spieltag Liga-Scope-Reform

**Stage:** IMPACT
**Source:** impact-analyst Agent (Probes A-H), 51 Tool-Calls, 13min
**Spec:** `worklog/specs/251-spieltag-liga-scope-reform.md`
**Status:** 4 Spec-Refinements identifiziert, sonst Spec-konform

---

## 1. Service-Layer-Impact

| Aufrufer | File:Line | Migration | Risk |
|----------|-----------|-----------|------|
| `useLeagueActiveGameweek` | `src/features/fantasy/queries/events.ts:75` | YES — Hook muss `leagueId` aus `useLeagueScope()` einspeisen | HIGH |
| `useGameweek` | `src/features/fantasy/hooks/useGameweek.ts:18,33` | YES — invalidate-Trigger an Liga-Switch | HIGH |
| `useActiveGameweek(clubId)` Admin-Path | `events.ts:64` | NO — bleibt Club-spezifisch | LOW |
| `getActiveGameweek(clubId)` | `FantasyContent.tsx:175`, `AdminGameweeksTab.tsx:30`, `AdminSettingsTab.tsx:538` | NO | LOW |
| `setActiveGameweek(clubId, gw)` | `AdminSettingsTab.tsx:551`, `scoring.admin.ts:281` | TBD — bleibt Club | MED |
| `getFixturesByGameweek(gw)` | `SpieltagTab.tsx:81`, `events.mutations.ts:133`, `fixtures.ts:316` | YES — Signatur `(gw, leagueId?)` | HIGH |
| `pickTopspiel(fixtures, clubId)` | `SpieltagTab.tsx:125`, `TopspielCard.tsx:106` | YES — `(fixtures, clubId, leagueId, sponsorClubId?)` | MED |

**Insight:** `getLeagueActiveGameweek` hat 1 direkter Aufrufer (events.ts:75), enge Migration-Surface. Indirekt 30+ Components via `useGameweek`-`gw`-Prop.

---

## 2. RPC-Impact (Track F Wildcards)

| RPC / Service | File:Line | Earning-Pfad | League-Source |
|---------------|-----------|--------------|---------------|
| `getWildcardBalance(uid)` | `wildcards.ts:9` | n/a (Read) | NEU: `(uid, leagueId)` |
| `useWildcardBalance(uid)` | `events.ts:52,55` + `WildcardsSection.tsx:19` | n/a (Read) | NEU: `leagueId`-Param |
| `earnWildcards()` Service | `wildcards.ts:35` | **0 Frontend-Konsumenten** | DB-internal |
| `spendWildcards()` Service | `wildcards.ts:54` | **0 Frontend-Konsumenten** | DB-internal |
| `adminGrantWildcards()` | `wildcards.ts:96` | **0 Frontend-Konsumenten** | NEU: `p_league_id` |
| `refund_wildcards_on_leave` | `20260326_wildcards.sql:132` | Lineup-Leave (DB-side) | DB-internal: event.club.league_id lookup |
| `rpc_save_lineup` Z.359+364 | `20260417110000_save_lineup_*.sql` | Lineup-Submit + Bench-Refund | DB-internal: event.club.league_id |

**Earning-Pfade gesamt (alle DB-side):**
- Lineup-Submit Bench-Reward, Lineup-Leave Refund — Source: `event.club.league_id`
- Admin-Grant — Cascade-Default-Liga (Anil vorab-approved)
- **Mystery-Box / Missions / Daily-Quest / Milestone:** kein aktiver Frontend-Code gefunden — Wildcards heute zentriert auf Lineup-Lifecycle. Falls später erweitert → Anil-Decision pro Earning-Pfad.

**Insight:** Track F Frontend-Surface ist trivial: nur `useWildcardBalance` (Read). Heavy-Lifting läuft DB-side in 2 RPCs.

---

## 3. Store-Migration-Impact (Track C)

| Component | Current Store | Reads | Action |
|-----------|---------------|-------|--------|
| `FantasyContent.tsx:96` | `useFantasyStore` | `fantasyCountry`, `fantasyLeague`, setters | REPLACE |
| `MarktplatzTab.tsx:73` | `useMarketStore` | `selectedCountry`, `selectedLeague`, setters | REPLACE |
| `TrendingSection.tsx:19` | `useMarketStore` | `selectedLeague` | READ-ONLY migrate |
| `TransferListSection.tsx:85` | `useMarketStore` | filter | READ-ONLY migrate |
| `ClubVerkaufSection.tsx:58,102,147` | `useMarketStore` | filter | READ-ONLY migrate |
| `BestandView.tsx:280-286` | `useMarketStore` + CountryBar/LeagueBar | full | REPLACE |
| **+14 weitere market/-Components** | `useMarketStore` | various — **unverifiziert** | VERIFY-Probe pre-Wave-3 |
| `KaderTab.tsx:106,108,245-308` | `useManagerStore` | `kaderCountry`, `kaderLeague`, smartLeague | REPLACE |
| **+9 weitere manager/-Components** | `useManagerStore` | various — **unverifiziert** | VERIFY-Probe pre-Wave-3 |
| `rankings/page.tsx:23-24` + `PlayerRankings.tsx:37-38,77` | lokales useState | `filterCountry`/`filterLeague` | REPLACE |
| **`clubs/page.tsx:43-44,93,107,159-167`** | lokales useState + CountryBar/LeagueBar | aktiver Liga-Filter | **REPLACE — fehlt in Spec** |
| **+3 fantasy/hooks/-Files** | `useFantasyStore` | unverifiziert | VERIFY pre-Wave-3 |

**KRITISCHER FINDING:** `/clubs/page.tsx` ist **5. Konsument** — Spec listet nur 4. Plus 26 Sub-Components mit unverifiziertem Liga-Bezug.

---

## 4. Cron + Schema-Impact (Track A)

| Cron / Source | DB-Spalte | Action |
|---------------|-----------|--------|
| `gameweek-sync` Z.428-444 | `clubs.active_gameweek` MIN per league | KEEP (Source) |
| `gameweek-sync` Z.1593-1603 (advance) | `clubs.active_gameweek` UPDATE | **EXTEND** — auch `UPDATE leagues SET active_gameweek = nextGw` |
| Hardcoded `nextGw <= 38` | `gameweek-sync:1593` | **REPLACE** → `<= league.max_gameweeks` (TFF1=34!) |
| `cron_process_gameweek` RPC | bezieht `clubs` | KEEP — Dual-Source-Window |
| `score_event` / `simulate_gameweek` | club-scoped | KEEP |
| `seed-multi-league-events.mjs:124` | `leagues.active_gameweek` Read | bereits Liga-aware ✓ |
| `import-league.mjs:147`, `verify-squads.mjs:188` | `clubs.active_gameweek = 1` initial | KEEP |

**Insight:** Track A's Code-Edit ist klein — Single-Insert in `gameweek-sync:1593-1603`. `leagues.active_gameweek` hat **bereits Daten** (Migration `20260413180000` initialisiert alle 7 Ligen mit `active_gameweek=1`). Pre-Track-B Backfill-Migration: `UPDATE leagues SET active_gameweek = MIN(clubs.active_gameweek per league_id)`.

---

## 5. Cache-Invalidation-Map

Liga-Switch in `useLeagueScope.setLeagueScope` muss invalidieren:

| Key | File:Line | Liga-aware? | Strategy |
|-----|-----------|-------------|----------|
| `qk.events.leagueGw` | `keys.ts:48` | YES → `leagueGw(leagueId)` | invalidate komplett |
| `qk.events.activeGw(cid)` | `keys.ts:47` | NO (Club) | n/a |
| `qk.events.wildcardBalance(uid)` | `keys.ts:46` | YES → `(uid, leagueId)` | invalidate komplett |
| `qk.fantasy.gwFixtureInfo(gw)` | `keys.ts:384` | YES → `(gw, leagueId)` | invalidate komplett |
| `qk.fantasy.fixtureDeadlines(gw)` | `keys.ts:385` | YES analog | invalidate komplett |
| `qk.fantasy.captainDistribution/pickRates(eid)` | `keys.ts:395-398` | NO (Event-scoped) | n/a |
| `qk.fantasyLeagues.*` | `keys.ts:402-406` | NO (Mini-League ≠ Real-Liga) | n/a |
| `qk.players.*`, `qk.holdings.*` | n/a | NO (Liga-orthogonal) | n/a |

**Bestehender Invalidate-Code:** `src/features/fantasy/queries/invalidation.ts:26,44-45` — Liga-Switch-Trigger einbauen.

---

## 6. Hidden-Liga-Filter

| Component | File:Line | Liga-Filter? | Konsument? |
|-----------|-----------|--------------|------------|
| `clubs/page.tsx:43-44,93,107,159-167` | lokales State + CountryBar/LeagueBar | **YES — filtert `c.league`** | **JA — fehlt in Spec** |
| `(app)/page.tsx:501` | Reads `club.league` für Display | NO | n/a |
| `club/[slug]/ClubContent.tsx:533` | Display | NO | n/a |
| `bescout-admin/AdminClubsTab.tsx:110` | Admin-only Display | NO | n/a |
| `players.ts:127` (`getLeague(club.league)`) | Lookup | NO | n/a |
| `transactions/page.tsx`, `profile/*` | kein Liga-Filter | n/a | n/a |

---

## 7. Component-Removal-Plan

| Component | File | Konsumenten | Action |
|-----------|------|-------------|--------|
| `CountryBar` | `components/ui/CountryBar.tsx` | 6× (BestandView, MarktplatzTab, KaderTab, rankings, **clubs**, FantasyContent) | **KEEP** als Sub-Lib für LeagueScopeHeader |
| `LeagueBar` (shared) | `components/ui/LeagueBarShared.tsx` | gleiche 6× | KEEP |
| `LeagueBar` (market-only) | `features/market/components/marktplatz/LeagueBar.tsx` | dupliziert | **DELETE-Candidate** Wave 6 |
| `LEAGUE_FALLBACK` | `SpieltagTab.tsx:26-37` | nur SpieltagTab | DELETE Wave 6 |
| `selectedLeagueId` toter Selector | `SpieltagTab.tsx:75,184-205` | dead-code | DELETE Wave 6 |
| 3 Stores Liga-Felder | `fantasy/store`, `market/store`, `manager/store` | siehe §3 | REMOVE Wave 6 |

---

## 8. Test-Drift-List

| Test-File | Mock-Target | Update |
|-----------|-------------|--------|
| `lib/services/__tests__/club.test.ts:371-378` | `getLeagueActiveGameweek()` | YES — Signatur + mockTable |
| `components/admin/__tests__/AdminSettingsTab.test.tsx:35-36` | `getActiveGameweek/setActiveGameweek` | NO |
| `lib/services/__tests__/scoring-v2.test.ts:102,437-441` | `setActiveGameweek` | NO |
| `components/fantasy/__tests__/SpieltagTab.test.tsx:14,62,193,216-218,473-475` | `getFixturesByGameweek`, `pickTopspiel` | YES |
| `features/fantasy/services/__tests__/fixtures.test.ts:71-129,490-500` | `getFixturesByGameweek` (5 Tests) | YES |
| `lib/services/__tests__/fixtures.test.ts:14-47,237-241` | `getFixturesByGameweek` | YES |
| `lib/services/__tests__/events-v2.test.ts:4,14,16` | `getFixturesByGameweek` Mock | YES |
| `app/(app)/fantasy/__tests__/FantasyContent.test.tsx:77,90,158,420-421` | `useWildcardBalance`, `CountryBar`, `LeagueBar` | YES |
| **NEW** `wildcards.test.ts` | wildcards-Service | NEW FILE |
| **NEW** `leagueScopeStore.test.ts` | `useLeagueScope` | NEW FILE |

---

## 9. Risk-Tabelle (Top 5)

| # | Risk | P×I | Mitigation |
|---|------|-----|------------|
| 1 | Wildcards-Backfill-Modulo-Rest split-7 | HIGH×HIGH | Cascade-Default-Liga (vorab-approved). Pre/Post-Sum-Smoke. EC-10 in Spec. |
| 2 | React-Query-Cache-Drift bei Liga-Switch (Stale GW + Fixtures) | HIGH×HIGH | `setLeagueScope` triggert atomare invalidate-Liste (§5). Manual-Verify Step 8. |
| 3 | Cron `gameweek-sync` advanced `clubs` aber nicht `leagues` (Dual-Source-Drift) | MED×HIGH | Track A erweitert advance-Block. CI-Smoke `SELECT * FROM leagues WHERE active_gameweek != (SELECT MIN ... FROM clubs)`. **Wave 1 vor Wave 2 pflicht.** |
| 4 | Track C übersieht 26 Sub-Konsumenten (`/clubs/page` fehlt in Spec) | MED×HIGH | Pre-Wave-3 vollständiges grep-Audit. **Spec-Update pflicht.** |
| 5 | `setActiveGameweek(clubId)` Admin-RPC bleibt Club-aware aber Cron schreibt jetzt Leagues — Drift wenn Admin manuell setzt | LOW×MED | Optional extend mit auto-leagues-update. Anil-Decision falls relevant. |

---

## 10. Wave-Sequencing-Empfehlung

Spec-Wave-Plan ist im Wesentlichen korrekt mit **4 Anpassungen:**

1. **Wave 1 (Track A) erweitern** um Backfill-Migration `UPDATE leagues SET active_gameweek = MIN(clubs ...)` UND Dual-Write (Cron schreibt beides bis Wave 6).
2. **Pre-Wave-3-Probe-Task** eingeschoben: vollständiges grep-Audit aller 26 Store-Konsumenten + Liga-Read-Map → Spec-Update.
3. **`/clubs/page.tsx` als 5. Konsument** in Track C-Scope.
4. **Track F parallel zu Track B** wie geplant ✓ — disjoint, sicher.

---

## Files-Estimate

- **Service:** 4 Files (rewrite + extend signatures)
- **Hook/Query:** 3 Files
- **Cron:** 1 File (`gameweek-sync/route.ts`)
- **Migrations:** 2 NEU (Track A backfill + Track F user_wildcards composite)
- **UI Stores:** 3 REMOVE Liga-Felder
- **NEW:** `leagueScopeStore.ts`, `LeagueScopeHeader.tsx`, `SaisonRangTab.tsx`
- **Components:** 5 Page-Konsumenten + 26 Sub-Components verify
- **Tests:** ~10 Updates + 2 NEU
- **i18n:** `de.json` + `tr.json`

**Total estimate: 50–65 Files** — Multi-Worktree-justified.

---

## Pflicht-Empfehlungen (vor Wave 1 BUILD)

1. ✅ Spec-Update: `clubs/page.tsx` als 5. Konsument (Sektion 1.4 Migration-Map ergänzen).
2. ✅ Spec-Update: Wave 1 Backfill-Migration + Dual-Write-Window AC ergänzen.
3. ✅ Spec-Update: Pre-Wave-3-Audit-Task als explizit AC.
4. ✅ Spec-Update: Track F Backfill-Sum-Smoke als AC.

Werden gleichzeitig mit dieser Impact-Datei in Spec eingespielt.
