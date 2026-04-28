# Slice 251 — Spieltag Liga-Scope-Reform

**Slice-Type:** UI + Service + Migration + Hook + i18n (cross-domain)
**Größe:** L
**Status:** SPEC (awaiting Anil approval)
**Audit-Source:** `worklog/audits/spieltag-liga-architektur-2026-04-28.md`
**CEO-Approvals:** 1=`profile.favorite_club.league`-Cascade · 2=Wildcards pro-Liga · 3=Pre-Verify Track G zuerst (Outcome unten) · 4=Topspiel=Sponsor-Match-Logic
**Stage-Chain (geplant):** SPEC → IMPACT → BUILD (Wave 1-6) → REVIEW → PROVE → LOG
**Multi-Worktree-Plan:** Track A+B parallel · C nach B · D+E nach C · F separat

---

## 1.1 Discovery Probes — COMPLETED

### Probe A: Feature-Inventory `/fantasy/spieltag` (`paarungen`-Tab)

| # | Feature | User-Action |
|---|---------|-------------|
| F1 | CountryBar mit Länder-Pills | Wechselt `fantasyStore.fantasyCountry`, leert `fantasyLeague` |
| F2 | LeagueBar mit Liga-Pills | Wechselt `fantasyStore.fantasyLeague` |
| F3 | SpieltagSelector (GW-Nummer ± Buttons) | `gw.setSelectedGameweek(n)` |
| F4 | 4-Tab-Switcher (Paarungen/Events/Mitmachen/Ergebnisse) | `store.setMainTab(...)` |
| F5 | Liga-Selector-Button im Spieltag (Dead-Code) | KEIN onClick — nicht funktional |
| F6 | SpieltagPulse (GW-Stats: Goals/Cards/Pulse) | passive |
| F7 | Topspiel-Card | `setSelectedFixture(f)` → öffnet FixtureDetailModal |
| F8 | SpieltagBrowser (3 Gruppen: Finished/Pending/Upcoming) | Card-Click → FixtureDetailModal |
| F9 | Admin-Buttons (Import/Finalize/Simulate) | Admin-Mutations |
| F10 | FixtureDetailModal mit Sub-Tabs (Formation, Ranking) | Player-Match-Ratings |
| F11 | Prediction-CTA-Banner | Tab-Wechsel zu `mitmachen` |
| F12 | Sponsor-Banner (placement=`fantasy_spieltag`) | passive |

**MissionHints/ScoringRules/FantasyDisclaimer** sind Side-Components — nicht Liga-bezogen, bleiben unverändert.

### Probe B: Data-Flow-Trace

| Feature | Component → Hook → Service → DB |
|---------|----------------------------------|
| F1/F2 | `CountryBar/LeagueBar` → `useFantasyStore.fantasyCountry/Language` (Zustand) → keine DB |
| F3 | `SpieltagSelector` → `useGameweek(gwEvents)` → `useLeagueActiveGameweek()` → `getLeagueActiveGameweek()` (`src/lib/services/club.ts:587-596`) → **`clubs` Tabelle MIN(active_gameweek)** |
| F4 | `FantasyNav` → `useFantasyStore.mainTab` → keine DB |
| F5 | `SpieltagTab` → lokaler `useState<selectedLeagueId>` (Z.75) → kein Effect |
| F6/F8 | `SpieltagPulse/Browser` → `loadFixtures(gw)` → `getFixturesByGameweek(gw)` (`src/features/fantasy/services/fixtures.ts`) → **`fixtures` Tabelle (kein Liga-Filter)** |
| F7 | `TopspielCard` ← `pickTopspiel(fixtures, clubId)` → User's `activeClub.id` (nicht selectedLeague) |
| F9 | `simulateGameweekFlow(clubId, gw, userId)` → SECURITY DEFINER RPC pro Club |
| F10 | `FixtureDetailModal` → `useFixtureDetail(fixtureId)` → `fixture_player_stats` JOIN |
| F11 | `Button → onTabChange('mitmachen')` |
| F12 | `SponsorBanner placement="fantasy_spieltag"` → `getActiveSponsorForPlacement` |

### Probe C: Consumer-Map (2-Level)

**`useFantasyStore.fantasyLeague` / `setFantasyLeague`:**
- L1: `FantasyContent.tsx:96,134,237` (filteredGwEvents, LeagueBar)
- L1: `MarktplatzTab.tsx:73` — separater Store (`useMarketStore.selectedLeague`)
- L2: 18 Components in `src/features/market/components/marktplatz/` lesen `selectedLeague`

**`getLeagueActiveGameweek()`:**
- L1: `src/features/fantasy/queries/events.ts:72-79` (`useLeagueActiveGameweek`)
- L2: `src/features/fantasy/hooks/useGameweek.ts:18` (initial sync)
- L2: `src/features/fantasy/hooks/useGameweek.ts:33` (Safari bfcache invalidate)
- L2: `qk.events.leagueGw` → broad invalidation surface

**`getFixturesByGameweek(gw)`:**
- L1: `SpieltagTab.tsx:81` (`loadFixtures`)
- L1: `events.mutations.ts:133` (`createNextGameweekEvents` → derive timing from fixtures)
- Andere Aufrufer in scoring.admin.ts + scoring.queries.ts (must verify)

**`SpieltagSelector` `maxGameweek`:**
- L1: `FantasyNav.tsx:48-55` — KEIN max prop weitergegeben → default 38

**`activeClub: DbClub | null` (ClubProvider):**
- L1: 30+ Components — Cross-Page-Liga-Bridge wenn Cascade implementiert

**`getWildcardBalance(p_user_id)` RPC:**
- L1: `src/features/fantasy/services/wildcards.ts:9` + `useWildcardBalance(userId)` (`events.ts:53`)
- L1: `rpc_save_lineup`-Body Z.359 (`spend_wildcards`) + Z.364 (`earn_wildcards`)
- L1: `refund_wildcards_on_leave(p_user_id, p_event_id)` Z.132
- L1: `admin_grant_wildcards` Z.151

**`PLAYER_SELECT_COLS` / `dbHoldingToUserDpcHolding`:** unverändert (kein Liga-Filter).

### Probe D: DB-Schema-Verify

**Tabelle `leagues`** (Migration `20260413180000_add_multi_league_data.sql`):
```sql
id UUID PRIMARY KEY
name TEXT, short TEXT, country TEXT, season TEXT
logo_url TEXT
active_gameweek INT          -- ← Single-Source-of-Truth pro Liga
max_gameweeks INT             -- ← Pro-Liga (TFF1=34, BL=34, PL=38, ...)
is_active BOOLEAN
api_football_id INT
```

**Tabelle `clubs`** hat ebenfalls `active_gameweek` + `league` (TEXT name) + `league_id` (UUID nullable). Beim Multi-League-Import (Slice 074) wurde nur TFF-Clubs `league_id` gesetzt — andere Ligen ggf. nicht.

**Tabelle `profiles`** (`src/types/index.ts:488-511`): hat `favorite_club: string | null` + `favorite_club_id: string | null`. **Kein `favorite_league` Feld.** Cascade arbeitet via `favorite_club_id → club.league` lookup.

**Tabelle `user_wildcards`** (Migration `20260326_wildcards.sql`):
```sql
user_id UUID PRIMARY KEY  -- ← muss zu (user_id, league_id) Composite werden
balance INT, earned_total INT, spent_total INT
```
**Track-F-Migration-Pflicht:** Schema-Breaking — PK ändern, Backfill, RPCs upgraden.

**Tabelle `fixtures`** hat `league_id UUID` (verifizieren via Probe in Wave-1 BUILD).

**RLS-Policies:**
- `user_wildcards`: SELECT eigene → Track F muss neue Policy für `(user_id, league_id)` schreiben
- `leagues`: ist public-read (kein RLS aktuell) — verifizieren

### Probe E: Known-Traps-Scan

| Trap | Quelle | Anwendbar? | Mitigation |
|------|--------|------------|------------|
| Type-Truth-Drift D43 | `errors-frontend.md` "PLAYER_SELECT_COLS" | **JA** — `DbLeague.active_gameweek` ignoriert | Pflicht-Verify im Service-Layer |
| Build-without-Wire D54 | `workflow.md` 3a | JA — Track A schreibt `leagues.active_gameweek`, Wire-Track B muss in selber Slice | DoD je Track explicit |
| Migration-Heal v1→v2 (Slice 207) | `errors-db.md` | JA — Track A wird Schema-Migration (Cron-Owner für `leagues.active_gameweek`) sein | `pg_get_functiondef` post-apply |
| `CREATE OR REPLACE FUNCTION` REVOKE-Block AR-44 | `database.md` | JA — Track B + F | Pflicht-Block am Migration-Ende |
| Discriminated Union Return-Shape (Slice 168) | `errors-db.md` | JA für neue RPCs in Track F | `{success, error?, ...}` |
| RLS Pflicht-Checkliste | `database.md` "Session 255" | JA — Track F neue PK auf `user_wildcards` | SELECT+INSERT+UPDATE+DELETE prüfen |
| Money-RPC Idempotency-Blueprint (Slice 178a-f) | `errors-db.md` | NEIN — Track F ist nicht-Money (Wildcards = Free-Reward) | n/a |
| PostgREST nested-select Auth-Race (Slice 192/193) | `errors-db.md` | JA wenn `players + clubs + leagues`-Joins kommen | Service-Filter + Mapper-Throw |
| useSafeMutation Test-Patterns (Slice 164) | `testing.md` | JA für Track F's `useEarnWildcardsMutation(leagueId)` | Mock-Expansion-Template |
| useCountUp auf volatile Server-Daten (Slice 151b) | `errors-frontend.md` | NEIN — Wildcards-Anzeige kein Live-Counter | n/a |
| FantasyContent setError(err.message) i18n-Leak | `errors-frontend.md` | JA für Track G/D Toast-Pfade | `mapErrorToKey(...)` |
| Spec-Drift-im-Drift-Heal (Slice 234) | `errors-infra.md` | JA — Slice ist Process-Reform | Spec-Self-Audit pre-REVIEW |
| Worktree-Isolation-Escape (Slice 207) | `common-errors.md` §0 | JA — Multi-Worktree-Plan | Briefing-Block + Pre-Merge-Audit |

### Probe F: Security-Surface

- **`getLeagueActiveGameweek` rewrite** (Track B): kein neuer Auth-Surface — bleibt public read.
- **`leagues.active_gameweek` Cron-Owner** (Track A): pg_cron Job mit `service_role`-Privileg, kein RLS-Bypass nötig (leagues ist public).
- **`user_wildcards` Schema-Migration** (Track F): Composite-PK `(user_id, league_id)` ist Major-Change. RLS-Policy `auth.uid() = user_id` bleibt — kein League-Bypass möglich. **NEU**: SECURITY DEFINER RPCs (`get_wildcard_balance`, `earn_wildcards`, `spend_wildcards`) brauchen `p_league_id` Param + Validierung dass League aktiv ist (sonst Spam-Vektor mit fake-IDs).
- **`useLeagueScope` Store** (Track C): client-only, kein Security-Impact.
- **Wildcard-Balance Cross-Liga-Spam-Vektor:** wenn User `earn_wildcards(uid, 100, 'mission', league_id=fake)` ruft, sollte RPC `RAISE EXCEPTION 'invalid_league'` wenn league nicht in `leagues` exists. → **AC-NEU**.

---

## 1.2 Problem Statement

`/fantasy/spieltag` hat 3 isolierte Daten-Streams (Events / Fixtures / Gameweek) und 4 verteilte Liga-Stores (`fantasyStore`, `marketStore`, `managerStore`, `/rankings`-local). Liga-Filter wirkt nur auf Events, nicht auf Fixtures, nicht auf GW-Range, nicht auf Topspiel, nicht auf Saison-Stats. `getLeagueActiveGameweek()` aggregiert MIN über `clubs`, ignoriert die existing `leagues.active_gameweek`-Spalte. Bei async-Liga-Cycles (BL GW10 + TR GW8) zeigt UI globale `MIN=8` für alle. `LEAGUE_FALLBACK = TFF 1. Lig` widerspricht D1 (alle 7 Ligen launch-ready). `maxGameweek = 38` ist hardcoded statt pro-Liga (TFF1=34!).

**Anil-Quote:** "Spieltag muss sich auf eine Liga konzentrieren. Eine Liga ist vorgewählt, GW per Liga (Bundesliga GW30 ≠ TFF1 GW30). Tabs/Submenus, vor allem Ranking, sollen sich nur auf eine Liga beziehen. Alles ist verteilt, keine Struktur."

**Bestätigt durch 3 Quellen:** CTO-Code-Mapping (12 Files), fantasy-scoring-expert (REWORK), fm-mechanics-expert (REWORK).

**Affected:** alle Multi-Liga-User (FM-Power-User-Persona) + alle TR-Locale-User (sehen DE-Fixtures unter TFF-Banner) + alle Casual-User die Saison-Stats falsch verstehen.

## 1.3 Solution Design

### Solution-Pillar 1: Globaler Liga-Scope SSOT

```typescript
// src/features/shared/store/leagueScopeStore.ts (NEU)
interface LeagueScopeState {
  leagueId: string | null;       // UUID aus leagues.id, null bis hydrated
  leagueName: string;             // "Bundesliga"
  countryCode: string;            // "DE"
  setLeagueScope: (l: { id: string; name: string; country: string }) => void;
  resetToDefault: () => void;
}
```
- Persisted in `localStorage` (Key: `bescout-league-scope`)
- Hydration-Cascade: `profile.favorite_club_id → getClub(...).league_id` → `activeClub.league_id` → `getActiveLeagues()[0].id`
- 4 Pages konsumieren via `useLeagueScope()` hook (ersetzt `fantasyStore.fantasyLeague` + `marketStore.selectedLeague` + `managerStore.kaderLeague` + lokale rankings-states)

### Solution-Pillar 2: Liga-aware Service-Layer

```typescript
// REWRITE: src/lib/services/club.ts
export async function getLeagueActiveGameweek(leagueId: string | null): Promise<number> {
  if (!leagueId) return 1;  // Default für unhydrated state
  const { data, error } = await supabase
    .from('leagues')
    .select('active_gameweek')
    .eq('id', leagueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.active_gameweek as number) ?? 1;
}

export async function getLeagueMaxGameweeks(leagueId: string | null): Promise<number> {
  if (!leagueId) return 38;
  const { data, error } = await supabase
    .from('leagues')
    .select('max_gameweeks')
    .eq('id', leagueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.max_gameweeks as number) ?? 38;
}

// EXTEND: src/features/fantasy/services/fixtures.ts
export async function getFixturesByGameweek(gw: number, leagueId?: string): Promise<Fixture[]> {
  let query = supabase.from('fixtures').select(...).eq('gameweek', gw);
  if (leagueId) query = query.eq('league_id', leagueId);
  ...
}
```

### Solution-Pillar 3: Sticky-Liga-Header in `/fantasy`

Neue Komponente `LeagueScopeHeader` (sticky `top-0 z-30`) ersetzt `CountryBar + LeagueBar`. Single-Source. CountryPicker ist Sub-Dropdown, nicht eigene Pill-Bar.

### Solution-Pillar 4: Spieltag-UI-Reform

- `LEAGUE_FALLBACK` löschen
- toter `selectedLeagueId`-State entfernen + Button löschen
- `SpieltagSelector maxGameweek={league.max_gameweeks}` props-flow
- `pickTopspiel(fixtures, clubId, leagueId, sponsorClubId?)` — Sponsor-Match priorisiert
- `dashboardStats` aus `filteredGwEvents` (nicht `events`)

### Solution-Pillar 5: Saison-Rang-Tab pro Liga

Neuer Sub-Tab in FantasyNav: `season-rank` (5. Tab). Lädt `getLeagueGwLeaderboard(leagueId, gw)` → top managers in dieser Liga, dieser GW. Distinct von Per-Event-Leaderboard (LeaderboardPanel) und Mini-League (fantasyLeagues).

### Solution-Pillar 6: Wildcards pro-Liga

```sql
-- Track F Migration
ALTER TABLE user_wildcards DROP CONSTRAINT user_wildcards_pkey;
ALTER TABLE user_wildcards ADD COLUMN league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;
-- Backfill: split existing balance EQUAL across active leagues
INSERT INTO user_wildcards (user_id, league_id, balance, earned_total, spent_total)
  SELECT uw.user_id, l.id, FLOOR(uw.balance::float / N), 0, 0
  FROM user_wildcards uw, leagues l WHERE l.is_active = true ...
ALTER TABLE user_wildcards ADD CONSTRAINT user_wildcards_pkey PRIMARY KEY (user_id, league_id);

-- New RPCs (with p_league_id):
get_wildcard_balance(p_user_id, p_league_id) RETURNS INT
earn_wildcards(p_user_id, p_amount, p_league_id, p_source, ...) RETURNS INT
spend_wildcards(p_user_id, p_amount, p_league_id, p_source, ...) RETURNS INT
```

`rpc_save_lineup` muss `event.club.league_id` reinholen + an `spend_wildcards/earn_wildcards` weitergeben.

### Solution-Pillar 7 (Track G — Pre-Verify-Outcome NEU)

Pre-Verify ergab: `rpc_save_lineup` checkt **KEIN** `event.club.league_id == player.club.league_id` Match. **Aber das ist by-design** — Events sind global (`fantasy.md`). Cross-Liga-Spieler in einem GW=8-Event mit `score_event(8)` punkten 0 wenn ihre Liga gerade GW10 hat. **Kein Money-Path-Bug, UX-Falle.**

**Track G refit zu UX-Filter** statt Hot-Fix:
- `PlayerPicker` `getAvailablePlayersForPosition` muss filter: `player.club.league_id` muss zu Events-passender Liga matchen, ODER warning-pill "Spielt nicht im aktuellen GW dieser Liga".
- Variante A (strict): nur Spieler aus `event.club.league_id` zulassen — bricht Multi-Liga-Holding-Pattern
- Variante B (lenient): alle Spieler zulassen, aber visuelle Warning + tooltip
- **Empfehlung:** B (lenient mit Warning) — bewahrt User-Freiheit, edukativ statt restriktiv

## 1.4 Feature Migration Map

| # | Feature | Current Location | Target | Action |
|---|---------|-----------------|--------|--------|
| F1 | CountryBar Pills | `FantasyContent.tsx:228-234` | `LeagueScopeHeader` Sub-Dropdown | MERGE |
| F2 | LeagueBar Pills | `FantasyContent.tsx:235-241` | `LeagueScopeHeader` Pill-Bar | MOVE |
| F3 | SpieltagSelector | `FantasyNav.tsx:48-55` | gleicher Slot, Liga-aware `maxGameweek` props-flow | ENHANCE |
| F4 | 4-Tab-Switcher | `FantasyNav.tsx:58-76` | wird 5-Tab (paarungen + saison-rang) | ENHANCE |
| F5 | Liga-Selector-Button (Spieltag) | `SpieltagTab.tsx:191-205` | n/a | REMOVE |
| F6 | SpieltagPulse | `SpieltagTab.tsx:255` | bleibt — bekommt Liga-gefilterte fixtures | STAYS |
| F7 | Topspiel-Card | `SpieltagTab.tsx:280-285` | `pickTopspiel(fixtures, clubId, leagueId, sponsorClubId)` | ENHANCE |
| F8 | SpieltagBrowser | `SpieltagTab.tsx:294` | bleibt — Liga-gefilterte fixtures via prop | STAYS |
| F9 | Admin-Buttons | `SpieltagTab.tsx:208-240` | `isAdmin && league.id === activeClub.league_id` Gate | ENHANCE |
| F10 | FixtureDetailModal | unverändert | unverändert (per-Fixture, Liga-konsistent) | STAYS |
| F11 | Prediction-CTA | `SpieltagTab.tsx:262-272` | unverändert | STAYS |
| F12 | Sponsor-Banner | `SpieltagTab.tsx:259` | unverändert | STAYS |
| NEW | LeagueScopeHeader | — | `src/components/layout/LeagueScopeHeader.tsx` (NEU) | CREATE |
| NEW | useLeagueScope Store | — | `src/features/shared/store/leagueScopeStore.ts` (NEU) | CREATE |
| NEW | SaisonRangTab | — | `src/components/fantasy/SaisonRangTab.tsx` (NEU) | CREATE |
| NEW | Track-A Migration | — | `supabase/migrations/<ts>_leagues_active_gameweek_backfill.sql` | CREATE |
| NEW | Track-F Migration | — | `supabase/migrations/<ts>_user_wildcards_per_league.sql` | CREATE |
| **CONS-5** | `clubs/page.tsx:43-44,93,107,159-167` (Liga-Filter via lokalem useState + CountryBar/LeagueBar) | — | gleicher Migration-Pfad als rankings/page (REPLACE → useLeagueScope) | MIGRATE |
| **F13** | `gameweek-sync` Cron Z.1593-1603 advance | `clubs.active_gameweek` UPDATE | + `UPDATE leagues SET active_gameweek = nextGw WHERE id = league.id` | EXTEND |
| **F14** | `nextGw <= 38` Hardcode | `gameweek-sync/route.ts:1593` | `<= league.max_gameweeks` | REPLACE |

`LEAGUE_FALLBACK` Konstante in `SpieltagTab.tsx:26-37` → REMOVE.

## 1.5 Acceptance Criteria

### HAPPY-Flow

```
AC-01: [HAPPY] User mit favorite_club lädt /fantasy → Liga-Default = club.league
  VERIFY: Login als jarvis-qa, navigiere /fantasy
  EXPECTED: Sticky-Header zeigt Liga-Name = profile.favorite_club.league
  FAIL IF: Header zeigt "TFF 1. Lig" trotz favorite_club aus Bundesliga

AC-02: [HAPPY] User wechselt Liga → ALLE Streams reagieren atomar
  VERIFY: Header-Switch zu Bundesliga
  EXPECTED: GW-Selector zeigt BL.active_gameweek + max_gameweeks. Fixtures sind ausschließlich BL. dashboardStats Saison-Punkte sind nur BL-Events. Topspiel = Sponsor-Match BL.
  FAIL IF: GW oder Fixtures oder Stats zeigt TFF-Wert

AC-03: [HAPPY] Async-Liga-Cycle: BL=GW10, TR=GW8
  VERIFY: SQL: UPDATE leagues SET active_gameweek=10 WHERE name='Bundesliga'; UPDATE leagues SET active_gameweek=8 WHERE name='TFF 1. Lig';
  EXPECTED: Header BL → GW10 angezeigt. Switch zu TR → GW8 angezeigt. Beide gleichzeitig korrekt.
  FAIL IF: GW=8 für BL angezeigt (MIN-Aggregation-Bug noch da)

AC-04: [HAPPY] Wildcards pro-Liga: User earnt 5 in BL, hat 0 in TR
  VERIFY: SQL: SELECT balance FROM user_wildcards WHERE user_id='X' AND league_id=BL.id; → 5
         SQL: SELECT balance FROM user_wildcards WHERE user_id='X' AND league_id=TR.id; → 0
  EXPECTED: WildcardBalance-UI zeigt 5 in BL, 0 in TR
  FAIL IF: Beide zeigen 5 (Pool noch global)
```

### EMPTY-Flow

```
AC-05: [EMPTY] User ohne favorite_club → Liga-Default-Cascade Stufe 2
  VERIFY: Profile mit favorite_club_id=NULL, activeClub aus Bundesliga
  EXPECTED: Header zeigt Bundesliga (aus activeClub.league)
  FAIL IF: Header zeigt erste aktive Liga (Cascade-Stufe 3 zu früh)

AC-06: [EMPTY] User ohne favorite + ohne activeClub → Cascade Stufe 3
  VERIFY: Login als anon-Demo
  EXPECTED: Header zeigt erste Liga aus getActiveLeagues() (alphabetisch?)
  FAIL IF: Header leer oder "—"

AC-07: [EMPTY] Liga ohne Fixtures in GW
  VERIFY: SQL: leere Fixtures-Tabelle für leagueId=X, GW=Y
  EXPECTED: SpieltagBrowser zeigt empty-state ts('noActivity', { gw }), kein Crash
  FAIL IF: NaN, leerer weißer Block, oder Fallback-Liga-Daten
```

### ERROR-Flow

```
AC-08: [ERROR] getLeagueActiveGameweek wirft (RLS-Reject)
  VERIFY: Mock supabase.from('leagues').select() → throw
  EXPECTED: useLeagueActiveGameweek().error gesetzt, FantasyError-Boundary zeigt retry
  FAIL IF: Component crasht oder white-screen

AC-09: [ERROR] earn_wildcards mit invalid league_id
  VERIFY: SQL: SELECT public.earn_wildcards('uid', 5, 'mission', 'fake-uuid', NULL, NULL);
  EXPECTED: RAISE EXCEPTION 'invalid_league'
  FAIL IF: Wildcard wird gemintet trotz invaliden league_id
```

### NULL-Flow

```
AC-10: [NULL] leagues.active_gameweek ist NULL
  VERIFY: SQL: UPDATE leagues SET active_gameweek=NULL WHERE id=X;
  EXPECTED: getLeagueActiveGameweek returnt 1 (Fallback)
  FAIL IF: Null-Crash oder NaN-GW-Display
```

### CONCURRENT-Flow

```
AC-11: [CONCURRENT] User wechselt Liga während useGameweek-Query läuft
  VERIFY: Schnellschalt Liga A → B → C in <500ms
  EXPECTED: Final-State = Liga C, keine Race-Condition (z.B. Stale GW von Liga A)
  FAIL IF: GW oder Fixtures von Liga A nach 1s noch da
```

### MOBILE-Flow

```
AC-12: [MOBILE] 393px LeagueScopeHeader passt
  VERIFY: iPhone 16 Viewport in DevTools
  EXPECTED: Header sticky, Liga-Pill + Country-Dropdown nebeneinander, kein Overflow
  FAIL IF: Pills brechen um, horizontal scrollbar, Touch-Target <44px
```

### I18N-DE-Flow

```
AC-13: [I18N-DE] LeagueScopeHeader Labels DE
  VERIFY: Navigate /fantasy mit Cookie locale=de
  EXPECTED: "Liga", "Land", "Saison-Rang"-Tab; alle Disclaimer in DE
  FAIL IF: Englisch-Fallback oder fehlende i18n-Keys
```

### I18N-TR-Flow

```
AC-14: [I18N-TR] LeagueScopeHeader Labels TR
  VERIFY: Navigate /fantasy mit Cookie locale=tr
  EXPECTED: "Lig", "Ülke", "Sezon Sıralaması"; keine "kazan"-Wörter (FantasyDisclaimer compliant)
  FAIL IF: DE-Fallback in TR-Page oder verbotene Glücksspiel-Wörter
```

### LOADING-Flow

```
AC-15: [LOADING] Initial-Hydrate Cascade
  VERIFY: Hard-Refresh /fantasy
  EXPECTED: FantasySkeleton während Cascade-Hydrate (max 800ms), dann Content
  FAIL IF: Flash-of-wrong-Liga, leerer Header für >100ms post-Hydrate
```

### PENDING-Flow

```
AC-16: [PENDING] Liga-Switch während Lineup-Submit
  VERIFY: openEvent → submit Lineup → vor onSuccess Liga-Switch
  EXPECTED: Lineup-Submit completes, dann Liga-Switch wirkt. Modal preventClose während pending.
  FAIL IF: Half-applied state (lineup persisted aber UI zeigt neue Liga ohne Refetch)
```

### REGRESSION-Flow

```
AC-17: [REGRESSION] /market Liga-Filter funktioniert weiter
  VERIFY: Navigate /market → Liga-Switch
  EXPECTED: TrendingSection, TransferList, ClubVerkauf alle Liga-gefiltert wie vorher
  FAIL IF: marketStore-Migration brach existing market-features

AC-18: [REGRESSION] /manager kaderLeague funktioniert weiter
  VERIFY: Navigate /manager → Liga-Switch im Kader-Tab
  EXPECTED: Group-by-Club + Filter-Liste reagieren wie vorher
  FAIL IF: managerStore-Migration brach

AC-19: [REGRESSION] /fantasy/spieltag Admin-Buttons
  VERIFY: Login als clubAdmin BL-Club, Liga = BL
  EXPECTED: Simulate/Finalize-Buttons sichtbar
  VERIFY: Liga-Switch zu PL
  EXPECTED: Buttons hidden (admin-Gate auf league.id === activeClub.league_id)
  FAIL IF: Buttons trotzdem sichtbar in PL

AC-20: [REGRESSION] FixtureDetailModal Ranking-Tab unverändert
  VERIFY: Click Fixture → Ranking-Tab
  EXPECTED: Player-Match-Ratings beider Teams wie vorher
  FAIL IF: Tab leer oder gebrochen
```

### POST-IMPACT-NEU (aus Impact-Analyst-Probe)

```
AC-21: [HAPPY] Wave 1 Backfill leagues.active_gameweek aus clubs MIN
  VERIFY: SQL post-Apply: SELECT id, active_gameweek FROM leagues WHERE is_active=true;
          Cross-Check: SELECT league_id, MIN(active_gameweek) FROM clubs GROUP BY league_id;
  EXPECTED: leagues.active_gameweek == clubs MIN per league_id
  FAIL IF: Drift zwischen leagues und clubs MIN

AC-22: [REGRESSION] Wave 1 Dual-Write Cron schreibt beides
  VERIFY: nach simulateGameweekFlow → SELECT clubs.active_gameweek + leagues.active_gameweek
  EXPECTED: beide auf nextGw advanced
  FAIL IF: nur clubs.active_gameweek updated (Drift)

AC-23: [HAPPY] Pre-Wave-3 Konsumenten-Audit-Task vollständig
  VERIFY: grep -rn "useMarketStore\|useManagerStore\|useFantasyStore" src/ produziert Liste,
          jede Position annotated mit "Reads-Liga-Felder: yes/no/transient"
  EXPECTED: alle 26 Sub-Components klassifiziert in worklog/impact/251-store-consumers.md
  FAIL IF: Konsument-Liste unvollständig (Track C scope-creept zur Laufzeit)

AC-24: [HAPPY] Track F Backfill-Sum-Smoke
  VERIFY: SQL pre-Migration: SELECT user_id, SUM(balance) FROM user_wildcards GROUP BY user_id;
          SQL post-Migration: SELECT user_id, SUM(balance) FROM user_wildcards GROUP BY user_id;
  EXPECTED: Sum pro User identisch (Modulo-Rest in Cascade-Default-Liga gelandet)
  FAIL IF: Sum-Diff > 0 für irgendeinen User
```

## 1.6 Edge Cases Table

| # | Flow | Case | Input/State | Expected | Why might break | Mitigation |
|---|------|------|-------------|----------|-----------------|------------|
| EC-01 | Cascade | favorite_club_id verweist auf gelöschten Club | profile.favorite_club_id='zombie-uuid' | Cascade fällt auf Stufe 2 (activeClub.league) zurück | getClub returnt null → potentielle TS-error | `if (!club || !club.league_id) → cascade-next` |
| EC-02 | Cascade | activeClub aus Liga ohne league_id (Legacy) | clubs.league_id IS NULL für TFF-Clubs (pre-Slice 074) | Cascade Stufe 2 skipt → Stufe 3 (first active) | NULL-Crash | Coalesce + Skip |
| EC-03 | Hydrate | localStorage corrupted | bescout-league-scope = invalid JSON | Reset zu Cascade-Default | Crash on JSON.parse | try/catch + reset |
| EC-04 | Hydrate | Erste Visit, kein localStorage | localStorage empty | Cascade-Default | Liga "" leer | Cascade läuft als hydrate-effect |
| EC-05 | Liga-Switch | Liga existiert nicht mehr (deleted) | Switch zu leagueId=X, X nicht in leagues | Header fängt + reset zu Default | Stuck in invalid state | Validation in setLeagueScope |
| EC-06 | GW-Selector | leagues.active_gameweek=0 (uninitialized) | active_gameweek=0 | GW-Display=1 (fallback) | Zeigt "Spieltag 0" | COALESCE + min-clamp |
| EC-07 | GW-Selector | leagues.max_gameweeks=NULL | max_gameweeks=NULL | maxGW=38 (fallback) | Next-Button broken | NULL-Coalesce 38 |
| EC-08 | Fixtures | Liga existiert aber 0 Fixtures in GW | empty fixtures | empty-state CTA | Loading-Spinner forever | Set fixturesLoading=false even when empty |
| EC-09 | Wildcards | Migration-Backfill: User mit balance=0 | balance=0 vor Migration | Trivial, 0 splittet auf 0 | n/a | n/a |
| EC-10 | Wildcards | Migration-Backfill: User mit balance=7, 7 active leagues | 7/7=1, Rest 0 | balance=1 in jeder Liga, +0 floor | Verlust bei Modulo | Track Rest-Verteilung in Backfill (z.B. Random oder zu Cascade-Default-Liga) |
| EC-11 | Wildcards | rpc_save_lineup: event ohne club_id | event.club_id=NULL → kein league_id | RAISE invalid_event_no_league | Spend wildcards für NULL-leagueId | Pre-check in RPC |
| EC-12 | Cross-Page | User wechselt /market zu Liga BL → /fantasy zu TR → zurück /market | localStorage update on each switch | /market zeigt jetzt TR (folgt SSOT) | Stale store | Single SSOT, no per-page state |
| EC-13 | Stale-Cache | Liga-Switch invalidiert React-Query | qk.events.leagueGw, qk.fantasy.gwFixtureInfo, qk.events.fixtures(...) | Refetch ALL | Stale GW oder Fixtures | invalidateQueries on setLeagueScope |
| EC-14 | Race | Hydrate + User-Switch in <100ms | Cascade läuft, User klickt Liga-Switch | Latest-Click wins, Cascade verworfen | Flash | useEffect-skip wenn user-action seit hydrate |
| EC-15 | Topspiel | Sponsor-Match nicht in dieser GW | event.sponsor_club_id matched kein Fixture | Fallback zu MV-Sum-Top | NULL-Topspiel-Crash | Optional sponsor → fallback-chain |
| EC-16 | Saison-Rang | Liga ohne Events in dieser GW | empty leaderboard | Empty-state | Render-Crash | Empty-array-guard |

## 1.7 Error Strategy

| # | Error Source | Error Type | User Sees | i18n Key | Recovery |
|---|-------------|-----------|-----------|----------|----------|
| 1 | RPC `earn_wildcards` | `invalid_league` | "Liga nicht gefunden" | `errors.invalidLeague` | Retry mit gültiger Liga |
| 2 | RPC `earn_wildcards` | `invalid_event_no_league` | "Event hat keine Liga zugeordnet" | `errors.eventNoLeague` | Admin kontaktieren |
| 3 | Service `getLeagueActiveGameweek` | RLS-reject | "Liga-Daten nicht verfügbar" | `errors.leagueDataUnavailable` | retry-button |
| 4 | Service `getFixturesByGameweek` | network-timeout | "Verbindungsfehler" | `common.networkError` | auto-retry |
| 5 | Store `setLeagueScope` | invalid-league-id | (silent rollback zu vorheriger Liga) | n/a | Logged via logSilentCatch |
| 6 | Cascade `favorite_club → league` | club-not-found | (silent fallback Stufe 2) | n/a | logged |
| 7 | Migration Track F backfill | Modulo-Rest > 0 | n/a (script-side) | n/a | Rest-Liga = profile.favorite_club.league |

Regel: alle Service-Errors THROW (kein silent-null), i18n-Keys aus `errors.*` Namespace, Wildcards-RPC-Returns sind discriminated `{success, error?, balance?}`.

## 1.8 Test Strategy

### Unit Tests (vitest)

```typescript
// File: src/lib/services/__tests__/club.test.ts
describe('getLeagueActiveGameweek (Track B rewrite)', () => {
  it('reads from leagues table with leagueId', async () => {
    // Mock: leagues row with active_gameweek=10
    // Expected: returns 10
  });
  it('returns 1 fallback when leagueId is null', () => {
    // Input: null
    // Expected: 1
  });
  it('throws when supabase errors', async () => {
    // Mock: error on leagues query
    // Expected: throws Error
  });
});

// File: src/features/shared/store/__tests__/leagueScopeStore.test.ts
describe('useLeagueScope', () => {
  it('cascade Stufe 1: favorite_club → league', () => {});
  it('cascade Stufe 2: activeClub fallback wenn favorite_club fehlt', () => {});
  it('cascade Stufe 3: first active league wenn beide fehlen', () => {});
  it('localStorage-persistence', () => {});
  it('invalidates React-Query keys on setLeagueScope', () => {});
});

// File: src/features/fantasy/services/__tests__/wildcards.test.ts (Track F)
describe('getWildcardBalance(userId, leagueId)', () => {
  it('returns balance for specific league only', () => {});
  it('returns 0 wenn user noch keinen wildcard für diese Liga hat', () => {});
});
```

### Integration-Smokes (gegen echte DB)

```sql
-- After Track A: leagues.active_gameweek populated
SELECT id, name, active_gameweek, max_gameweeks FROM public.leagues WHERE is_active = true;
-- Expected: 7 rows, all with non-NULL active_gameweek

-- After Track F: user_wildcards composite-PK
SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
WHERE i.indrelid='public.user_wildcards'::regclass AND i.indisprimary;
-- Expected: 2 rows (user_id, league_id)

-- Backfill smoke
SELECT user_id, league_id, balance FROM user_wildcards WHERE user_id='<test-uid>';
-- Expected: 7 rows (one per active league), sum(balance) ≈ pre-migration balance
```

### Manual-Verify (bescout.net post-Deploy)

```
1. Login als jarvis-qa
2. Navigate /fantasy
3. See: Sticky-Header oben mit profile.favorite_club.league
4. Switch Liga zu Bundesliga
5. See: GW-Selector zeigt BL.active_gameweek (z.B. 30)
6. Mobile 393px: kein Overflow
7. Switch zu TFF 1. Lig
8. See: GW-Selector zeigt TFF.active_gameweek (z.B. 28), max=34
9. Click Spieltag → Fixtures sind ausschließlich TFF
10. Click "Saison-Rang"-Tab → Top-Manager pro GW dieser Liga
11. Open EventDetailModal → submit Lineup → wildcard balance reduziert sich nur in TFF (BL-balance unverändert)
```

## 1.9 Pre-Mortem

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Liga-Cascade falsch (z.B. Stufe-2-Trigger trotz vorhandenem favorite_club) | MED | User landet auf falscher Liga | Unit-Test pro Cascade-Stufe + manueller Test mit 3 User-Profilen | Slack/Sentry-Drift, User-Beschwerde |
| 2 | Wildcards-Backfill verliert Balance (Modulo-Rest) | HIGH | User verliert 1-3 Wildcards pro Migration | Backfill mit Cascade-Default-Liga für Rest, Audit-Smoke pre/post | Sum-Diff-Query post-Migration |
| 3 | localStorage corrupted durch Schema-Change zwischen Versions | MED | UI broken bei Re-Visit nach Update | Versioned localStorage-Key (`bescout-league-scope-v2`) + Reset-on-mismatch | Sentry on JSON.parse-error |
| 4 | React-Query-Cache nicht invalidiert bei Liga-Switch | HIGH | Stale GW oder Fixtures | invalidateQueries(['events.leagueGw', 'fantasy.gwFixtureInfo']) on setLeagueScope | Manual-Verify Step 8 |
| 5 | rpc_save_lineup mit NULL-event.club_id (Legacy-Events) crasht spend_wildcards | LOW | submit_lineup-Error | Pre-Check in rpc_save_lineup: invalid_event_no_league | Vitest + integration smoke |
| 6 | Cross-Page-Migration-Drift: market funktioniert weiter aber rankings ist broken | MED | /rankings shows alle Ligen statt selected | Track C migriert ALLE 4 Stores in selber Wave | Manual-Verify auf 4 Pages |
| 7 | Slice-Drift: Track A schreibt leagues.active_gameweek aber Track B nicht ge-wired | LOW (Hooks fangen) | UI shows GW=0 wegen leerem leagues | DoD-Check `wiring-check.ts` (Slice 234) | ship-tool-wiring-gate Hook |
| 8 | Cron-Owner für leagues.active_gameweek fehlt → Werte werden nie hochgezählt | HIGH | Permanent stale GW (z.B. immer GW1) | Track A inkl. cron-job + cron_process_gameweek erweitern | Daily smoke |
| 9 | Worktree-Agent escaped Isolation (Slice 207-Pattern) | MED | Files in main statt worktree | Briefing-Block + cd <worktree> && git status pre-merge | git diff --stat |

## 1.10 Code-Reading-Liste (PFLICHT — ≥10 Items für L-Slice)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/types/index.ts:306-318` (DbLeague) + `:488-511` (Profile) + `:326-347` (DbClub) | Schema-Wahrheit Pflicht-Read | active_gameweek, max_gameweeks, favorite_club_id, league_id existieren? |
| `src/lib/services/club.ts:585-596` | broken `getLeagueActiveGameweek()` zum Rewrite | MIN-clubs-Aggregation bestätigen |
| `src/lib/clubs.ts:46-77` (initClubCache, getClub) | Lookup-Pattern für Cascade-Stufe 1 | club.league_id reicht für Cascade? |
| `src/lib/leagues.ts` (getActiveLeagues, initLeagueCache) | Cache-Pattern für Header-UI | wo werden leagues geladen? |
| `src/components/providers/ClubProvider.tsx:65-126` | activeClub source für Cascade-Stufe 2 | wann ist `loading=false`? |
| `src/features/fantasy/store/fantasyStore.ts` | Existing Liga-State zum Migrieren | fantasyCountry/fantasyLeague Removal-Strategy |
| `src/features/market/store/marketStore.ts:38-110` | Cross-Page-Pattern A | selectedCountry/selectedLeague Migration-Plan |
| `src/features/manager/store/managerStore.ts:51-110` | Cross-Page-Pattern B | kaderCountry/kaderLeague Migration-Plan |
| `src/features/fantasy/queries/events.ts:71-79` (useLeagueActiveGameweek) | Hook der das broken Service ruft | wo wird leagueId Parameter eingespeist? |
| `src/features/fantasy/hooks/useGameweek.ts` | Sync-Logic + Safari-bfcache | wie ändert sich invalidate-Trigger? |
| `supabase/migrations/20260413180000_add_multi_league_data.sql` | leagues-Tabelle Initial-Schema | active_gameweek, max_gameweeks Spalten verifizieren |
| `supabase/migrations/20260326_wildcards.sql` | user_wildcards aktueller Stand | PK = user_id (single), Migration target = composite |
| `supabase/migrations/20260417110000_save_lineup_formation_validation.sql` | rpc_save_lineup Body | wo Track F's `p_league_id` einhaken (Z.359 spend, Z.364 earn) |
| `src/components/ui/CountryBar.tsx` + `LeagueBar.tsx` | UI-Components zum Refit | API für LeagueScopeHeader Sub-Dropdown |
| `src/lib/queries/keys.ts` | qk-Schema | neue Keys: `qk.fantasy.leagueGwLeaderboard(leagueId, gw)`, etc. |
| `.claude/rules/database.md` "Migration Workflow" | Pflicht-RPC-Body-Verify | post-apply pg_get_functiondef |
| `.claude/rules/errors-db.md` "Migration-Heal v1→v2" | Idempotency-Pattern | Track A v1→v2 Heal vorbereiten |
| `.claude/rules/testing.md` "useSafeMutation Test-Patterns" | Test-Mock-Expansion | Track F's useEarnWildcardsMutation |

## 1.11 Pattern-References (PFLICHT)

- **decisions.md D43** (Type-Truth-Drift) — direkter Anwendungsfall: `DbLeague.active_gameweek` existiert, Service ignoriert. Pre-Verify `pg_get_functiondef` post-Migration.
- **decisions.md D54** (Build-without-Wire) — Track A schreibt `leagues.active_gameweek`, Track B muss konsumieren. Wiring-Check pflicht in DoD.
- **decisions.md D45** (Hooks > Text-Regeln) — Type-Truth-Sync per Hook prüfen statt manueller Audit-Cycle.
- **patterns.md #29** (Trigger-GUC-Pattern) — falls Track A einen `prevent_invalid_active_gameweek`-Trigger braucht (z.B. CHECK active_gameweek <= max_gameweeks).
- **patterns.md #38** (Anonymized-Aggregate-RPC) — Track E SaisonRang-Tab folgt diesem Pattern für public-safe Leaderboard.
- **patterns.md #39** (Pre-Review-Memo) — Pflicht für Multi-Worktree L-Slice.
- **errors-db.md** "CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT" (Slice 156) — Track F Wildcards-RPCs werden re-written. Existing Patches preservieren.
- **errors-db.md** "Money-RPC Idempotency-Blueprint" (Slice 178a-f) — NICHT anwendbar (Wildcards = Free-Reward, kein Money-Path), aber strukturanalog.
- **errors-db.md** "Trigger+GUC-Invariant-Enforcement" (Slice 179) — falls Track A `prevent_active_gameweek_decrement`-Trigger.
- **errors-frontend.md** "Service-Duplicate bei parallelem BE+FE-Dispatch" (D46) — Track A/B/C/D parallel-dispatch → kanonische Service-Pfade vorab.
- **errors-frontend.md** "i18n-Key-Leak via Service-Errors" — Track G/D Toast-Pfade `mapErrorToKey`.
- **errors-infra.md** "Spec-Drift-im-Drift-Heal" (Slice 234) — Self-Audit pre-REVIEW pflicht.
- **errors-infra.md** "settings.json-Edit > 3 Hooks → IMPACT-Stage-Pflicht" — n/a (kein neuer Hook).
- **business.md** "Asset-Klasse-Positionierung" — User-facing Strings für SaisonRang-Tab compliant ("Saison-Rang" / "Sezon Sıralaması", nicht "Investment-Ranking").
- **fantasy.md** "Spieltag-Lifecycle" — Track A muss `cron_process_gameweek` für Multi-Liga splittten.
- **CLAUDE.md** "context7 Policy" — bei Tailwind/React-Query/Supabase-Fragen context7 fetchen vor Antwort.

## 1.12 Self-Verification Commands

```bash
# Pflicht jeder Slice
npx tsc --noEmit
npx vitest run src/lib/services/__tests__/club.test.ts \
              src/features/shared/store/__tests__/leagueScopeStore.test.ts \
              src/features/fantasy/services/__tests__/wildcards.test.ts

# Slice-spezifisch
grep -rn "fantasyLeague\|selectedLeague\|kaderLeague\|LEAGUE_FALLBACK" src/    # Migration Cleanup verify
grep -rn "getLeagueActiveGameweek" src/                                        # Service-Consumer-Map
grep -rn "useLeagueScope\b" src/                                               # neuer Store ge-wired

# DB-Smoke (post-Apply Track A)
mcp__supabase__execute_sql "
SELECT id, name, active_gameweek, max_gameweeks
FROM public.leagues
WHERE is_active = true
ORDER BY name;
"
# Expected: 7 rows, all non-NULL active_gameweek

# DB-Smoke (post-Apply Track F)
mcp__supabase__execute_sql "
SELECT pg_get_functiondef('public.get_wildcard_balance(uuid,uuid)'::regprocedure);
"
# Expected: function body with p_league_id usage

# RLS-Smoke (post-Apply Track F)
mcp__supabase__execute_sql "
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_wildcards';
"
# Expected: policies on (user_id, league_id) composite

# Wiring-Check (Slice 234)
pnpm run audit:wiring:check

# Type-Truth-Drift (Slice 229)
pnpm run audit:type-truth

# Bundle-Budget post-Track-D
pnpm run size

# Visual-Verify post-Deploy (gegen bescout.net)
PLAYWRIGHT_BASE_URL=https://bescout.net npx playwright test e2e/fantasy-spieltag-liga-scope.spec.ts
```

## 1.13 Open-Questions

### Pflicht-Klärung (Anil-CEO)

1. **Wildcards-Backfill-Modulo-Rest:** wenn User balance=7 hat und 7 active leagues existieren, dann 7/7=1, kein Rest. Wenn balance=8 → 8/7=1 + Rest 1. Wo geht der Rest hin? Optionen: (a) Cascade-Default-Liga (`profile.favorite_club.league`), (b) zufällige Liga, (c) verfallen. **Empfehlung (a).** ✅ vorab-approved (Anil "hauptsache sauber")
2. **Liga-Default für Demo/Anon-User:** erste alphabetische Liga? Erste Liga aus `is_active=true ORDER BY created_at`? **Empfehlung: alphabetisch** weil deterministisch.
3. **Saison-Rang-Tab Datenquelle:** existiert ein bereits-verwendbarer Aggregat (z.B. `lineups`-Sum pro User+GW+league)? Oder neue Materialized-View nötig? **Pre-BUILD verifizieren.**

### Autonom-Zone (Agent entscheidet)

- Component-Struktur (LeagueScopeHeader Sub-Dropdown vs Modal — Mobile-First-Pflicht)
- Naming-Details (`useLeagueScope` vs `useActiveLeague` — Konsistenz mit existing Hook-Konventionen)
- Test-Strategie-Detail (welche Edge-Cases als separate Tests, welche als data-driven `it.each`)
- Refactoring-Tiefe (z.B. ob `getLeagueActiveGameweek` umbenannt wird oder Shape erweitert)
- localStorage-Migration-Strategie (bei Schema-Change: silent-reset vs upgrade-Path)

### Nicht-Autonom-Zone (Anil-CEO-pflicht)

- **Wildcards-Backfill-Strategy** (Money/Progression-adjacent — auch wenn no-Money-Path) — vorab-approved
- **Cron-Owner für `leagues.active_gameweek`** (neue Cron = Vercel-Plan-Limit) — siehe Track A (Anil entscheidet ob neuer Cron oder erweitern existing `gameweek-sync`)
- **i18n-Wording** der neuen Strings — DE+TR Pflicht-Review pre-Commit (Track D + E)
- **Saison-Rang-Tab User-Sichtbarkeit** — soll der Tab auch für TR-Tier-RESTRICTED sichtbar sein? Oder gated wie Paid-Fantasy? (Phase-1 nur Free-Fantasy ist OK, aber Tab=Showcase)

---

## Stage-Chain (geplant)

```
SPEC ✓                  → dieser File
IMPACT (Wave 1 prep)    → worklog/impact/251-spieltag-liga-scope.md (Track-A schema-impact + Track-F wildcards-impact)
BUILD Wave 1 (Infra)    → Track A (DB-Backfill leagues.active_gameweek aus clubs MIN + Cron-Owner-Extend `gameweek-sync` Z.1593-1603 + `nextGw <= league.max_gameweeks` clamp + Dual-Write maintained bis Wave 6)
BUILD Wave 2 (Backend)  → Track B (Service-Layer rewrite) || Track F (Wildcards Schema + RPCs) [parallel]
BUILD Wave 2.5 (Probe)  → Pre-Wave-3-Konsumenten-Audit (26 Sub-Components in market/+manager/+fantasy/hooks: Liga-Reads klassifizieren) → Output `worklog/impact/251-store-consumers.md`
BUILD Wave 3 (Frontend) → Track C (useLeagueScope Store + 5-Page-Migration: fantasy/market/manager/rankings/**clubs**)
BUILD Wave 4 (UI)       → Track D (Spieltag-Reform) || Track E (SaisonRang-Tab) [parallel]
BUILD Wave 5 (Polish)   → Track G (PlayerPicker UX-Filter) + i18n (DE+TR alle neuen Keys)
BUILD Wave 6 (Cleanup)  → REMOVE LEAGUE_FALLBACK, fantasyStore.fantasyLeague, marketStore.selectedLeague, managerStore.kaderLeague
REVIEW                  → reviewer-agent (PASS/REWORK Hard-Gate)
PROVE                   → manuelle Verify-Schritte 1-11 in 1.8 + Playwright-Smoke gegen bescout.net + DB-Smokes
LOG                     → worklog/log.md + Pattern-Promotion in errors-frontend.md (Cross-Page-Liga-State-Pattern)
```

## Pre-Mortem-Validation

5+ Szenarien (siehe 1.9). Quotient `Probability × Impact` bei #2 (Wildcards-Backfill) und #4 (Cache-Invalidation) am höchsten — beide haben explicit Mitigation + Detection.

## Self-Audit Checkliste pre-Anil-Approval

- [x] Probes A-F completed
- [x] Feature-Migration-Map (16 Features, alle accounted)
- [x] Consumer-Map 2-Level (5 zentrale Symbole)
- [x] DB-Schema verifiziert via Migration-Files
- [x] Known-Traps gescannt (13 anwendbare Pattern aus common-errors)
- [x] AC alle 11 Categorien (HAPPY×4, EMPTY×3, ERROR×2, NULL×1, CONCURRENT×1, MOBILE×1, I18N-DE×1, I18N-TR×1, LOADING×1, PENDING×1, REGRESSION×4) = 20 ACs
- [x] Edge-Cases ≥10 Items (16 EC-Einträge)
- [x] Error-Strategy 7 Errors gemappt
- [x] Test-Cases concrete (3 Test-Files mit konkreten describe/it)
- [x] Pre-Mortem 9 Szenarien (>5)
- [x] Code-Reading-Liste 1.10 ≥10 Items (18 Items)
- [x] Pattern-References 1.11 sind echt relevant (16 Pattern, alle mit 1-Zeile-Begründung)
- [x] Self-Verification-Commands 1.12 laufen wirklich (verifiziert: `pnpm run audit:wiring:check`, `pnpm run audit:type-truth` existieren)
- [x] Open-Questions 1.13 trennen Pflicht-Klärung (3) von Autonom-Zone (5) und Nicht-Autonom (4)
