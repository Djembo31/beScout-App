# Multi-League Expansion — Vollständiger Implementierungsplan

**Datum:** 2026-04-13
**Status:** SPEC (Anil-Review pending)
**Scope:** 7 Ligen (TFF 1. Lig + 6 neue), ~4.800 Spieler, ~140 Clubs

---

## Strategische Entscheidung

BeScout wird von einer Single-League-Pilot-App zu einer Multi-League-Plattform.
Der Markt ist **global** — ein User tradet Bundesliga UND Premier League Spieler im selben Portfolio.
Fantasy bleibt **liga-/club-gebunden** (Spieltag-Logik braucht Liga-Kontext).
Die Liga ist **Kontext und Filter**, nicht Grenze.

---

## Ziel-Ligen

| Liga | API-ID | Land | Teams | Spieler (ca.) | Season |
|------|--------|------|-------|---------------|--------|
| TFF 1. Lig (aktuell) | 204 | TR | 20 | 689 | 2025 |
| Süper Lig | 203 | TR | 20 | ~550 | 2025 |
| 2. Bundesliga | 79 | DE | 18 | ~500 | 2025 |
| Bundesliga | 78 | DE | 18 | ~500 | 2025 |
| Serie A | 135 | IT | 20 | ~550 | 2025 |
| La Liga | 140 | ES | 20 | ~550 | 2025 |
| Premier League | 39 | GB | 20 | ~550 | 2025 |
| **TOTAL** | | | **136** | **~4.800** | |

---

## Filter-Hierarchie (Design-Entscheidung)

### Dreistufig: Land → Liga → Club

Überall wo Spieler/Clubs gelistet werden, gilt dieselbe Hierarchie:

```
┌──────────────────────────────────────────────────────────────┐
│ 🇩🇪 Deutschland  🇬🇧 England  🇹🇷 Türkei  🇮🇹 Italien  🇪🇸 Spanien │  ← CountryBar (horizontal scroll)
├──────────────────────────────────────────────────────────────┤
│ [BL Logo] Bundesliga  [BL2 Logo] 2. Bundesliga              │  ← LeagueBar (filtered by Land, mit LOGO)
├──────────────────────────────────────────────────────────────┤
│ [Bayern Logo] Bayern 12  [BVB Logo] BVB 8  ...              │  ← Club Chips (filtered by Liga)
├──────────────────────────────────────────────────────────────┤
│  GK  DEF  MID  ATT                                          │  ← PosFilter (multi-select)
├──────────────────────────────────────────────────────────────┤
│  Wert ↓  G/V  L5  Name        🔍 Suche                      │  ← Sort + Search
└──────────────────────────────────────────────────────────────┘
```

**Warum Land → Liga?** Die Türkei hat 2 Ligen (Süper Lig + TFF 1. Lig), Deutschland auch (BL + BL2). Nach dem Pilot kommen weitere Länder — die Hierarchie muss von Anfang an stimmen.

**Smart Collapse:**
- Land hat nur 1 Liga (England, Italien, Spanien) → Liga wird AUTO-SELECTED, LeagueBar entfällt
- Land hat 2+ Ligen (Türkei, Deutschland) → LeagueBar zeigt Liga-Logos als Auswahl
- Kein Land gewählt ("Alle") → LeagueBar zeigt ALLE Ligen aller Länder

### Liga-Logos (ÜBERALL)

**Quelle:** API-Football liefert Liga-Logos: `https://media-*.api-sports.io/football/leagues/{id}.png`
**Speicherung:** `leagues.logo_url` (Column existiert bereits)
**CSP:** `media-*.api-sports.io` ist bereits in `vercel.json` `img-src` erlaubt

Liga-Logos erscheinen:
- LeagueBar Pills (16px Logo + Liga-Name)
- Scout Card (Top-Bar, neben Club-Logo)
- PlayerIdentity Meta-Zeile (12px Logo inline)
- BestandPlayerRow / KaderPlayerRow Meta-Zeile (12px Logo)
- Home-Widgets (Trending, IPOs, Most Watched)
- Rankings Header
- Event-Header (Fantasy)
- Admin-Tabs (Liga-Selector)
- Search-Results (nach Liga gruppiert, Logo als Gruppen-Header)

### Neue Shared Components

**`src/components/ui/CountryBar.tsx`** (NEU)
```typescript
interface CountryBarProps {
  countries: { code: string; name: string; leagueCount: number }[];
  selected: string;         // '' = alle, sonst Country-Code (DE, TR, GB, ...)
  onSelect: (code: string) => void;
}
```
- Horizontal scroll Pills mit Country-Flag (Emoji) + Ländername
- "Alle" Button links
- Count-Badge: Anzahl Ligen pro Land (optional)

**`src/components/ui/LeagueBar.tsx`** (REFACTOR aus bestehendem)
```typescript
interface LeagueBarProps {
  selected: string;          // '' = alle, sonst Liga-Name
  onSelect: (league: string) => void;
  country?: string;          // Optional: nur Ligen dieses Landes zeigen
  size?: 'sm' | 'md';       // md = 44px, sm = 36px
  showAll?: boolean;         // "Alle" Button (default: true)
}
```
- Pills mit **Liga-LOGO** (16px `<Image>`) + Liga-Name
- Logos aus `leagues.logo_url` (geladen via `getAllLeaguesCached()`)
- Wenn `country` gesetzt → nur Ligen dieses Landes
- Wenn Land nur 1 Liga hat → Component returned null (auto-collapse)

**`src/components/ui/LeagueBadge.tsx`** (NEU)
Kleines Inline-Badge für Meta-Zeilen und Listen:
```typescript
interface LeagueBadgeProps {
  logoUrl?: string;
  name: string;
  short: string;
  size?: 'xs' | 'sm';       // xs = 12px (inline), sm = 16px (card)
}
```
- `xs`: 12px Logo + Kürzel (für PlayerIdentity, BestandRow, etc.)
- `sm`: 16px Logo + voller Name (für Card Headers, Event Headers)

### Verhalten

- "Alle" Länder = kein Filter, zeigt alles
- Land auswählen → LeagueBar zeigt nur Ligen dieses Landes
- Land mit 1 Liga → Liga auto-selected, LeagueBar hidden
- Liga auswählen → Club-Chips zeigen nur Clubs dieser Liga
- Liga abwählen → zurück zu allen Ligen des Landes
- Land abwählen → zurück zu "Alle"
- State in Zustand Store (pro Page)

---

## Phase 0: Daten-Import

### 0.1 Leagues-Tabelle befüllen

**File:** Neue Migration
**Aktion:** 6 neue Einträge in `leagues` + `clubs.league_id` für bestehende TFF-Clubs befüllen

```sql
-- Neue Ligen (mit logo_url von API-Football)
INSERT INTO leagues (id, name, short, country, season, logo_url, active_gameweek, max_gameweeks, is_active) VALUES
  (gen_random_uuid(), 'Süper Lig', 'SL', 'TR', '2025-26', 'https://media-4.api-sports.io/football/leagues/203.png', 1, 38, true),
  (gen_random_uuid(), '2. Bundesliga', 'BL2', 'DE', '2025-26', 'https://media-4.api-sports.io/football/leagues/79.png', 1, 34, true),
  (gen_random_uuid(), 'Bundesliga', 'BL1', 'DE', '2025-26', 'https://media-4.api-sports.io/football/leagues/78.png', 1, 34, true),
  (gen_random_uuid(), 'Serie A', 'SA', 'IT', '2025-26', 'https://media-4.api-sports.io/football/leagues/135.png', 1, 38, true),
  (gen_random_uuid(), 'La Liga', 'LL', 'ES', '2025-26', 'https://media-4.api-sports.io/football/leagues/140.png', 1, 38, true),
  (gen_random_uuid(), 'Premier League', 'PL', 'GB', '2025-26', 'https://media-4.api-sports.io/football/leagues/39.png', 1, 38, true);

-- Bestehende TFF Liga: logo_url setzen
UPDATE leagues SET logo_url = 'https://media-4.api-sports.io/football/leagues/204.png'
WHERE short = 'TFF1';

-- Bestehende TFF-Clubs: league_id setzen
UPDATE clubs SET league_id = (SELECT id FROM leagues WHERE short = 'TFF1')
WHERE league = 'TFF 1. Lig';
```

### 0.2 Import-Script: Clubs + Spieler pro Liga

**File:** `scripts/import-league.mjs` (NEU)
**Aktion:** Für jede neue Liga:
1. API-Football: `/teams?league={id}&season=2025` → Clubs INSERT
2. Pro Club: `/players/squads?team={apiTeamId}` → Players INSERT
3. `club_external_ids` + `player_external_ids` befüllen
4. `clubs.league_id` setzen

**API-Calls pro Liga:** ~21 (1 Teams + ~20 Squads)
**Total für 6 neue Ligen:** ~126 Calls (Pro Plan: 7.500/Tag → kein Problem)

### 0.3 Fixture-Import für aktive Saison

**File:** `scripts/import-fixtures.mjs` (NEU oder Erweiterung von `backfill-all.mjs`)
**Aktion:** Pro Liga die abgeschlossenen Spieltage importieren:
- `/fixtures?league={id}&season=2025&round=Regular Season - {gw}` pro GW
- `fixture_player_stats` befüllen (Ratings, Scores)
- `player_gameweek_scores` befüllen

**Reihenfolge:** Zuerst Clubs+Spieler (Phase 0.2), dann Fixtures (Phase 0.3)

---

## Phase 1: Backend Multi-League

### 1.1 API-Calls parametrisieren

**File:** `src/lib/footballApi.ts`
**Änderungen:**
- `getLeagueId()` bleibt als Default-Fallback
- NEUE Funktion: `getActiveLeagues(): Promise<League[]>` — holt alle aktiven Ligen aus DB
- Alle Fetch-Funktionen erhalten optionalen `leagueId` Parameter

**File:** `src/lib/services/footballData.ts`
**Änderungen:**
- `fetchApiTeams(leagueId?: number)` statt hardcoded
- `fetchApiFixtures(gameweek: number, leagueId?: number)`
- `syncTeamMapping(leagueId: number)` — liga-spezifisch
- `syncPlayerMapping(teamId: number, leagueId: number)` — liga-spezifisch

### 1.2 Cron Multi-League

**File:** `src/app/api/cron/gameweek-sync/route.ts`
**Änderung:** Statt `const leagueId = getLeagueId()`:

```typescript
// Alle aktiven Ligen aus DB holen
const { data: activeLeagues } = await supabaseAdmin
  .from('leagues')
  .select('id, name, short, active_gameweek, max_gameweeks')
  .eq('is_active', true);

// Pro Liga synchronisieren
for (const league of activeLeagues) {
  await syncLeagueGameweek(league);
}
```

**Wichtig:** `active_gameweek` wird PRO LIGA in der `leagues` Tabelle getracked (existiert bereits).

### 1.3 Import-Scripts anpassen

**Betroffene Files:**
- `scripts/backfill-ratings.mjs` — Liga-Parameter hinzufügen
- `scripts/backfill-positions.mjs` — Liga-Parameter hinzufügen
- `scripts/sync-unmapped-players.mjs` — Multi-Liga Support
- `scripts/backfill-all.mjs` — Loop über aktive Ligen

### 1.4 Club-Cache Multi-League

**File:** `src/lib/clubs.ts`
**Änderung:** `getAllClubsCached()` liefert bereits alle Clubs. Neue Helper:

```typescript
export function getClubsByLeague(league: string): ClubLookup[] {
  return getAllClubsCached().filter(c => c.league === league);
}

export function getLeagues(): string[] {
  const clubs = getAllClubsCached();
  return Array.from(new Set(clubs.map(c => c.league).filter(Boolean)));
}
```

---

## Phase 2: Shared UI Components

### 2.1 LeagueBar extrahieren

**Von:** `src/features/market/components/marktplatz/LeagueBar.tsx`
**Nach:** `src/components/ui/LeagueBar.tsx` (shared)

**Änderungen am Component:**
- Entferne `leagues.length <= 1 ? null` Guard (wir haben jetzt immer >1)
- Füge `size?: 'sm' | 'md'` Prop hinzu (sm für enge Toolbars)
- Füge optionalen `leagues` Prop hinzu (statt immer aus Cache, für gefilterte Listen)
- Original-Import in `ClubVerkaufSection.tsx` auf neuen Pfad umbiegen

**Neues Interface:**
```typescript
interface LeagueBarProps {
  selected: string;
  onSelect: (league: string) => void;
  size?: 'sm' | 'md';        // md = default (44px), sm = kompakter (36px)
  leagues?: LeagueInfo[];      // optional override, sonst aus Club-Cache
  showAll?: boolean;           // "Alle" Button zeigen (default: true)
}
```

### 2.2 Club-Chips als shared Component

**Aktuell:** Inline in `BestandView.tsx` (Zeile ~241-262)
**Neu:** `src/components/ui/ClubChips.tsx`

```typescript
interface ClubChipsProps {
  clubs: { id: string; name: string; logo?: string; count: number }[];
  selected: string | null;
  onSelect: (clubId: string | null) => void;
}
```

**Wiederverwendung in:** BestandView, KaderTab, TransferListSection, MarketFilters

### 2.3 Kombinierter Filter-Stack

**Neu:** `src/components/ui/PlayerFilterStack.tsx`

Kapselt die gesamte Hierarchie: LeagueBar → ClubChips → PosFilter → Sort
Jede Ebene optional, State wird per Props reingegeben.

```typescript
interface PlayerFilterStackProps {
  // Liga
  showLeague?: boolean;
  selectedLeague: string;
  onLeagueChange: (league: string) => void;
  // Club
  showClub?: boolean;
  clubs: ClubChipItem[];
  selectedClub: string | null;
  onClubChange: (clubId: string | null) => void;
  // Position
  showPos?: boolean;
  selectedPos: Set<Pos>;
  onPosToggle: (pos: Pos) => void;
  posCounts?: Partial<Record<Pos, number>>;
  // Sort
  showSort?: boolean;
  sortOptions: SortOption[];
  activeSort: string;
  onSortChange: (key: string) => void;
}
```

---

## Phase 3: Seite für Seite — Alle UX-Änderungen

### 3.1 Marktplatz / Market (`/market`)

#### 3.1.1 MarktplatzTab (Kaufen)

**File:** `src/features/market/components/marktplatz/MarktplatzTab.tsx`
**Änderung:** CountryBar + LeagueBar ÜBER den Sub-Tabs
**State:** `marketStore.selectedCountry` + `marketStore.selectedLeague`

```
┌───────────────────────────────────────────────────┐
│ CountryBar: Alle | 🇩🇪 DE | 🇬🇧 GB | 🇹🇷 TR | ... │  ← NEU
├───────────────────────────────────────────────────┤
│ LeagueBar: [BL Logo] BL | [BL2 Logo] BL2         │  ← NEU (nur wenn Land 2+ Ligen)
├───────────────────────────────────────────────────┤
│ 📦 Club Verkauf | 📋 Transferliste | 📈 Trending  │  ← bestehend
├───────────────────────────────────────────────────┤
│ ... Content gefiltert nach Land+Liga ...          │
└───────────────────────────────────────────────────┘
```

#### 3.1.2 ClubVerkaufSection

**File:** `src/features/market/components/marktplatz/ClubVerkaufSection.tsx`
**Änderung:**
- Bestehender LeagueBar-Import wird durch globalen `selectedLeague` aus Store ersetzt
- Club-Akkordeon zeigt nur Clubs der ausgewählten Liga
- IPO-Liste gefiltert nach Liga

#### 3.1.3 TransferListSection

**File:** `src/features/market/components/marktplatz/TransferListSection.tsx`
**Änderung:**
- Sell-Orders gefiltert nach Liga (über Player → Club → Liga Join)
- Club-Filter zeigt nur Clubs der aktiven Liga
- PosFilter bleibt gleich

#### 3.1.4 TrendingSection

**File:** `src/features/market/components/marktplatz/TrendingSection.tsx`
**Änderung:**
- Trending-Spieler gefiltert nach Liga
- "Top Mover" Liste liga-spezifisch

#### 3.1.5 WatchlistView

**File:** `src/features/market/components/marktplatz/WatchlistView.tsx`
**Änderung:**
- LeagueBar + ClubChips Filter hinzufügen
- Watchlist selbst bleibt global (User watchlisted Spieler aus allen Ligen)
- Aber kann per Liga gefiltert werden

#### 3.1.6 MarketSearch

**File:** `src/features/market/components/shared/MarketSearch.tsx`
**Änderung:**
- Suchresultate zeigen Liga-Badge pro Spieler
- Optionaler Pre-Filter nach aktiver Liga (wenn Liga im Store gesetzt)
- Oder: Ergebnisse nach Liga gruppieren

#### 3.1.7 MarketFilters (Advanced)

**File:** `src/features/market/components/shared/MarketFilters.tsx`
**Änderung:**
- Liga-Dropdown als erster Filter (oder über LeagueBar bereits gesetzt)
- Club-Dropdown zeigt nur Clubs der ausgewählten Liga

#### 3.1.8 Market Store

**File:** `src/features/market/store/marketStore.ts`
**Neue State-Felder:**
```typescript
selectedCountry: string;         // '' = alle, sonst Country-Code (DE, TR, GB, IT, ES)
setSelectedCountry: (v: string) => void;
selectedLeague: string;          // '' = alle, sonst Liga-Name
setSelectedLeague: (v: string) => void;
```
**Bestehend (umbenennen):**
- `clubVerkaufLeague` → wird durch globalen `selectedLeague` ersetzt

**Smart Collapse Logik (Helper-Funktion, shared):**
```typescript
function onCountrySelect(code: string, leagues: League[]) {
  setSelectedCountry(code);
  const countryLeagues = leagues.filter(l => l.country === code);
  if (countryLeagues.length === 1) {
    // Land hat nur 1 Liga → auto-select
    setSelectedLeague(countryLeagues[0].name);
  } else {
    // Land hat 2+ Ligen → User wählt Liga
    setSelectedLeague('');
  }
}
```

### 3.2 Portfolio / Bestand (`/market` Portfolio-Tab)

#### 3.2.1 BestandView

**File:** `src/features/market/components/portfolio/BestandView.tsx`
**Änderung:** CountryBar + LeagueBar ALS ERSTE Filterebenen hinzufügen

**Vorher:**
```
PosFilter → Club Chips → Sort
```

**Nachher:**
```
CountryBar → LeagueBar (wenn Land 2+ Ligen) → Club Chips (gefiltert) → PosFilter → Sort
```

**State:** Übernimmt `selectedCountry` + `selectedLeague` aus Market Store (gleicher Filter-State wie Marktplatz-Tab, da Bestand = Portfolio-Tab der Market-Page)
**Logik:**
- Land gewählt → LeagueBar zeigt Ligen des Landes (mit Logo)
- Liga gewählt (oder auto-selected) → `clubCounts` nur aus Clubs dieser Liga
- Holdings-Items gefiltert: `item.player.leagueCountry === country && item.player.league === league`
- Kein Filter → alle Holdings sichtbar (wie heute)

#### 3.2.2 BestandHeader

**File:** `src/features/market/components/portfolio/BestandHeader.tsx`
**Änderung:**
- Portfolio-Wert kann optional per Liga angezeigt werden
- Wenn Liga-Filter aktiv: "Bundesliga Portfolio: 125.000 CR" statt nur "Portfolio: 500.000 CR"
- Zeige Liga-Badge/Flag neben dem Titel

#### 3.2.3 BestandPlayerRow

**File:** `src/features/market/components/portfolio/BestandPlayerRow.tsx`
**Änderung:**
- Liga-Badge (kleines Flag-Emoji + Kürzel) in der Meta-Zeile neben Club-Name
- Vorher: `[Bayern Logo] FC Bayern · #9 · 25J.`
- Nachher: `[Bayern Logo] FC Bayern · 🇩🇪 BL · #9 · 25J.`

### 3.3 Mein Kader / Manager (`/manager`)

#### 3.3.1 KaderTab

**File:** `src/features/manager/components/kader/KaderTab.tsx`
**Änderung:** CountryBar + LeagueBar über dem KaderToolbar

**Vorher:**
```
Lens: Performance | Markt | Handel | Vertrag
Search + Sort + Group + Filter Toggle
PosFilter + Club Dropdown
```

**Nachher:**
```
CountryBar: Alle | 🇩🇪 | 🇬🇧 | 🇹🇷 | 🇮🇹 | 🇪🇸              ← NEU
LeagueBar: [BL Logo] BL | [BL2 Logo] BL2              ← NEU (conditional)
Lens: Performance | Markt | Handel | Vertrag
Search + Sort + Group + Filter Toggle
PosFilter + Club Chips (gefiltert nach Liga)            ← Club Dropdown → Club Chips
```

#### 3.3.2 KaderToolbar

**File:** `src/features/manager/components/kader/KaderToolbar.tsx`
**Änderung:**
- Club-Dropdown (native `<select>`) → **Club Chips** (horizontal scroll, wie in Bestand)
- Clubs gefiltert nach gewählter Liga
- Group-by-Club Logik bleibt, aber zeigt Liga-Header wenn mehrere Ligen

#### 3.3.3 KaderPlayerRow

**File:** `src/features/manager/components/kader/KaderPlayerRow.tsx`
**Änderung:**
- Liga-Kürzel mit Flag in Meta-Zeile (wie BestandPlayerRow)

#### 3.3.4 Manager Store

**File:** `src/features/manager/store/managerStore.ts`
**Neue State-Felder:**
```typescript
kaderCountry: string;           // '' = alle
setKaderCountry: (v: string) => void;
kaderLeague: string;            // '' = alle
setKaderLeague: (v: string) => void;
```

### 3.4 Fantasy / Spieltag (`/fantasy`)

#### 3.4.1 FantasyContent / FantasyNav

**File:** `src/features/fantasy/components/FantasyNav.tsx`
**Änderung:** CountryBar + LeagueBar oberhalb der Fantasy-Tabs

```
CountryBar: Alle | 🇩🇪 | 🇬🇧 | 🇹🇷 | ...                       ← NEU
LeagueBar: [SL Logo] Süper Lig | [TFF Logo] TFF 1. Lig      ← NEU (conditional)
Tabs: Events | Mitmachen | Ergebnisse | Liga                 ← bestehend
```

**Logik:**
- Land→Liga-Filter steuert welche Events angezeigt werden
- Events sind club-scoped → werden über `event.club_id → club.league` gefiltert
- Globale Events (scope='global') werden immer gezeigt
- Jede Event-Karte zeigt Liga-Logo im Header

#### 3.4.2 Event-Liste

**File:** `src/features/fantasy/services/events.queries.ts`
**Änderung:**
- `getEvents()` — optionaler `leagueFilter` Parameter
- `getEventsByClubIds(clubIds)` — Club-IDs vorgefiltert nach Liga

#### 3.4.3 Lineup Builder / PlayerPicker

**File:** `src/features/fantasy/components/lineup/PlayerPicker.tsx`
**Änderung:**
- Picker zeigt nur Spieler-Holdings aus der Liga des Events
- Wenn Event ein Bundesliga-Spieltag ist → nur Bundesliga-Spieler im Picker
- Cross-Liga-Events (future): alle Holdings

#### 3.4.4 Fantasy Store

**File:** `src/features/fantasy/store/fantasyStore.ts`
**Neue State-Felder:**
```typescript
fantasyCountry: string;         // '' = alle
setFantasyCountry: (v: string) => void;
fantasyLeague: string;          // '' = alle
setFantasyLeague: (v: string) => void;
```

### 3.5 Home Page (`/`)

**File:** `src/app/(app)/page.tsx`

**Betroffene Sections:**

| Section | Änderung |
|---------|----------|
| `HomeStoryHeader` | Portfolio-Wert bleibt global (kein Liga-Filter auf Home) |
| `TopMoversStrip` | Liga-Badge pro Spieler-Chip hinzufügen |
| `HomeSpotlight` | Aktive IPOs: Liga-Badge zeigen |
| `LastGameweekWidget` | Zeigt Liga-Name des letzten Events |
| `MostWatchedStrip` | Liga-Badge pro Spieler |
| `MyClubs` (Sidebar) | Zeigt bereits `club.league` — nur Styling anpassen |

**Kein LeagueBar auf Home** — Home ist der globale Überblick. Liga-Filter nur auf List-Pages.

### 3.6 Clubs-Page (`/clubs`)

**File:** `src/app/(app)/clubs/page.tsx`
**Änderung:**
- LeagueBar oben → Clubs nach Liga filtern
- Grouping: Clubs nach Liga gruppiert (mit Liga-Header + Flag)
- Zeigt bereits `league` als Header — nur auf Multi-Liga erweitern

### 3.7 Club Detail (`/club/[slug]`)

**File:** `src/app/(app)/club/[slug]/page.tsx`
**Änderung:**
- Liga-Badge prominent im Club-Header
- Standings zeigen Liga-Kontext
- Keine LeagueBar nötig (ist single-club context)

### 3.8 Player Detail (`/player/[id]`)

**File:** `src/app/(app)/player/[id]/page.tsx`
**Änderung:**
- Liga-Badge im Hero-Section (neben Club-Badge)
- Liga-Name in Breadcrumb oder Subtitle
- Standings-Widget zeigt Liga-Tabelle

### 3.9 Rankings (`/rankings`)

**File:** `src/app/(app)/rankings/page.tsx`
**Änderung:**
- LeagueBar über den Rankings
- GlobalLeaderboard: per Liga filterbar
- PlayerRankings: per Liga filterbar
- MonthlyWinners: per Liga

### 3.10 Transactions (`/transactions`)

**File:** `src/app/(app)/transactions/page.tsx`
**Änderung:**
- Liga-Filter (LeagueBar) über der Transaktionsliste
- Jeder Eintrag zeigt Liga-Badge des betroffenen Spielers

### 3.11 Profile (`/profile`)

**File:** `src/components/profile/ProfileView.tsx`
**Änderung:**
- Portfolio-Tab: optionaler Liga-Breakdown
- Activity-Tab: Liga-Badge pro Eintrag
- Kein LeagueBar auf Profil (zu viele Tabs bereits)

### 3.12 Community (`/community`)

**File:** `src/app/(app)/community/page.tsx`
**Änderung:**
- LeagueBar über Posts/Research
- Posts gefiltert nach Liga (über club_id → league)
- Bounties: Liga-Kontext anzeigen

### 3.13 Navigation

#### SideNav

**File:** `src/components/layout/SideNav.tsx`
**Änderung:**
- ClubSwitcher zeigt Liga-Badge prominenter pro Club
- Optionaler Liga-Indikator unter dem aktiven Club

#### TopBar

**File:** `src/components/layout/TopBar.tsx`
**Änderung:**
- Aktive Liga als Kontext-Info (Flag + Kürzel) wenn relevant

#### SearchOverlay

**File:** `src/components/layout/SearchOverlay.tsx`
**Änderung:**
- Suchergebnisse nach Liga gruppieren
- Liga-Badge pro Ergebnis
- Optionaler Liga-Pre-Filter

---

## Phase 4: Scout Card + Player Components — Liga-LOGO überall

### Design-Entscheidung: Liga-Logo statt Text

Überall wo Liga angezeigt wird, nutzen wir das **offizielle Liga-Logo** (16px oder 12px) statt reinem Text.
Das `LeagueBadge` Component (Phase 2) wird der single source für alle Liga-Anzeigen.

```
LeagueBadge size="xs" (12px): [BL Logo] BL       ← Meta-Zeilen, Listen
LeagueBadge size="sm" (16px): [BL Logo] Bundesliga ← Card Headers, Filter Pills
```

### 4.1 TradingCardFrame (Scout Card)

**File:** `src/components/player/detail/TradingCardFrame.tsx`

**Neue Props:**
```typescript
interface TradingCardFrameProps {
  // ... bestehende Props ...
  leagueName?: string;      // NEU: "Bundesliga"
  leagueShort?: string;     // NEU: "BL1"
  leagueLogoUrl?: string;   // NEU: Liga-Logo URL
}
```

**Front Face — Top Bar Änderung:**

Vorher:
```
[Club Logo]  [🇹🇷 Flag]  [23Y]  [MID #10]
```

Nachher:
```
[Club Logo]  [BL Logo]  [🇹🇷 Flag]  [23Y]  [MID #10]
              ↑ NEU: Liga-Logo (12px, rounded, ring-1 ring-white/10)
```

**Liga-Logo Design auf Scout Card:**
- 12px Logo (wie Club-Logo Overlay, aber in der Top Bar)
- `rounded-sm ring-1 ring-white/10 bg-black/40`
- Position: zwischen Club-Logo und Country-Flag
- Tooltip/aria-label: voller Liga-Name

**Back Face:**
- Liga-Logo + Name als Header-Zeile über den Metriken
- `[BL Logo 14px] Bundesliga` zentriert, `text-[8px] font-bold text-white/40`

### 4.2 PlayerIdentity (Sacred Component)

**File:** `src/components/player/index.tsx` (Zeile 314-371)

**Aktuelle Meta-Zeile:**
```
{club} · #{ticket} · {age}J. · {league}
                                 ↑ nur Text, am Ende, leicht zu übersehen
```

**Neue Meta-Zeile — Liga-Logo prominent:**
```
{club} · [Liga-Logo 12px] {leagueShort} · #{ticket} · {age}J.
          ↑ Logo inline, direkt nach Club
```

**Änderung:**
- Liga kommt DIREKT NACH dem Club (nicht am Ende)
- Liga hat **LOGO** (12px inline `<img>`) + Kürzel
- Uses `LeagueBadge size="xs"`

**Neue Props erweitern:**
```typescript
player: Pick<Player, ... | 'league' | 'leagueShort' | 'leagueLogoUrl'>
```

### 4.3 PlayerRow (Compact + Card Variant)

**File:** `src/components/player/PlayerRow.tsx`

**Compact Variant:**
- Liga-Logo wird durch PlayerIdentity Meta-Zeile automatisch sichtbar
- Keine separate Änderung nötig (PlayerIdentity rendert LeagueBadge)

**Card Variant:**
- Header-Section: Liga-Logo neben Country-Flag
- Vorher: `[🇹🇷 Flag]  [L5 Score]  [⭐ Watch]`
- Nachher: `[BL Logo 14px]  [🇹🇷 Flag]  [L5 Score]  [⭐ Watch]`

### 4.4 BestandPlayerRow

**File:** `src/features/market/components/portfolio/BestandPlayerRow.tsx`

**Meta-Zeile (Line 2) Änderung:**
- Vorher: `[Club Logo] Sakaryaspor · #10 · 25J.`
- Nachher: `[Club Logo] Sakaryaspor · [BL Logo 12px] BL · #10 · 25J.`

### 4.5 KaderPlayerRow

**File:** `src/features/manager/components/kader/KaderPlayerRow.tsx`

**Gleiche Änderung wie BestandPlayerRow:**
- Liga-Logo in Meta-Zeile via LeagueBadge

### 4.6 DiscoveryCard

**File:** `src/features/market/components/marktplatz/DiscoveryCard.tsx`
**Änderung:** Liga-Logo wird durch PlayerIdentity automatisch sichtbar

### 4.7 PlayerIPOCard

**File:** `src/features/market/components/marktplatz/PlayerIPOCard.tsx`
**Änderung:** Liga-Logo im Header (14px Logo + Kürzel)

### 4.8 Alle Stellen wo Liga-Logo erscheint (Checkliste)

| Stelle | Component | Logo-Size | Format |
|--------|-----------|-----------|--------|
| Scout Card Front (Top Bar) | TradingCardFrame | 12px | Logo only |
| Scout Card Back (Header) | TradingCardFrame | 14px | Logo + Name |
| PlayerIdentity Meta-Zeile | PlayerIdentity | 12px | Logo + Kürzel |
| PlayerRow Card Header | PlayerRow (card) | 14px | Logo only |
| BestandPlayerRow Meta | BestandPlayerRow | 12px | Logo + Kürzel |
| KaderPlayerRow Meta | KaderPlayerRow | 12px | Logo + Kürzel |
| Home TopMoversStrip | TopMoversStrip | 12px | Logo only |
| Home MostWatchedStrip | MostWatchedStrip | 12px | Logo only |
| Home IPO Spotlight | HomeSpotlight | 14px | Logo + Name |
| LeagueBar Pills | LeagueBar | 16px | Logo + Name |
| CountryBar → LeagueBar | LeagueBar | 16px | Logo + Name |
| Fantasy Event Header | EventDetailHeader | 16px | Logo + Name |
| Fantasy Event Card | EventCard | 14px | Logo + Kürzel |
| Rankings Header | GlobalLeaderboard | 16px | Logo + Name |
| Search Results Gruppen | SearchOverlay | 14px | Logo + Name |
| Admin Liga-Selector | AdminHeader | 16px | Logo + Name |
| Transactions Liste | TransactionRow | 12px | Logo only |
| Club Page Header | ClubContent | 20px | Logo + Name |
| Player Detail Hero | PlayerHero | 16px | Logo + Name |
| Notifications | NotificationItem | 12px | Logo only |

---

## Phase 5: Admin Panel

### 5.1 Liga-Selector im Admin

**File:** `src/app/(app)/bescout-admin/page.tsx`
**Änderung:** Globaler Liga-Selector (Dropdown) im Admin-Header

```
[Liga: Alle ▼]  [Tab: Liga | Events | Spieltage | ...]
```

### 5.2 AdminLigaTab

**File:** `src/components/admin/AdminLigaTab.tsx`
**Änderung:**
- Liga-Dropdown steuert welche Liga-Season verwaltet wird
- Separate `active_gameweek` pro Liga (aus `leagues` Tabelle)
- Monthly Close pro Liga

### 5.3 AdminGameweeksTab

**File:** `src/components/admin/AdminGameweeksTab.tsx`
**Änderung:**
- Spieltag-Verwaltung pro Liga
- Liga-Selector oben

### 5.4 AdminEventsManagementTab

**File:** `src/components/admin/AdminEventsManagementTab.tsx`
**Änderung:**
- Event-Erstellung: Liga-Feld
- Event-Liste: Liga-Filter

### 5.5 CreateClubModal

**File:** `src/components/admin/CreateClubModal.tsx`
**Änderung:**
- `league` Feld: Dropdown mit allen Ligen (statt hardcoded "TFF 1. Lig")
- `country` Feld: Auto-Fill basierend auf Liga-Auswahl

### 5.6 AdminSettingsTab

**File:** `src/components/admin/AdminSettingsTab.tsx`
**Änderung:**
- Gameweek-Sync Button pro Liga
- API-Football Mapping pro Liga

---

## Phase 6: Datenmodell-Erweiterungen

### 6.1 Player Type erweitern

**File:** `src/types/index.ts`
**Änderung:**
```typescript
interface Player {
  // ... bestehende Felder ...
  league: string;           // bestehend — Liga-Name (z.B. "Bundesliga")
  leagueShort?: string;     // NEU — Liga-Kürzel (BL1, PL, SA, ...)
  leagueCountry?: string;   // NEU — Liga-Land Code (DE, GB, IT, ...)
  leagueLogoUrl?: string;   // NEU — Liga-Logo URL
}
```

### 6.1b League Type + Cache

**File:** `src/types/index.ts`
**Neuer Type:**
```typescript
interface League {
  id: string;
  name: string;
  short: string;
  country: string;
  season: string;
  logoUrl: string | null;
  activeGameweek: number;
  maxGameweeks: number;
  isActive: boolean;
}
```

**File:** `src/lib/leagues.ts` (NEU — analog zu `src/lib/clubs.ts`)
```typescript
let leagueCache: League[] = [];

export function getAllLeaguesCached(): League[] { ... }
export function getLeague(name: string): League | undefined { ... }
export function getLeaguesByCountry(country: string): League[] { ... }
export function getCountries(): { code: string; name: string; leagueCount: number }[] { ... }
```

Wird beim App-Init geladen (analog zum Club-Cache), cached client-seitig.

### 6.2 Service-Layer Liga-Support

**Betroffene Services:**

| Service | File | Änderung |
|---------|------|----------|
| `search.ts` | `src/lib/services/search.ts` | Liga-Parameter in `spotlightSearch()` |
| `players.ts` | `src/lib/services/players.ts` | `getPlayersByLeague(league)` hinzufügen |
| `club.ts` | `src/lib/services/club.ts` | `getClubsByLeague(league)` hinzufügen |
| `trading.ts` | `src/lib/services/trading.ts` | Sell-Orders optional per Liga filterbar |
| `posts.ts` | `src/lib/services/posts.ts` | Liga-Filter Parameter |
| `scoring.ts` | `src/lib/services/scoring.ts` | Liga-Kontext für Gameweek-Scores |
| `footballData.ts` | `src/lib/services/footballData.ts` | Multi-Liga API-Calls (Phase 1) |

### 6.3 Query Keys erweitern

**File:** `src/lib/queryKeys.ts`
**Änderung:** Liga als Key-Segment wo nötig:

```typescript
export const qk = {
  // bestehend:
  players: { all: ['players'], byClub: (cid: string) => ['players', 'club', cid] },
  // NEU:
  players: {
    ...
    byLeague: (league: string) => ['players', 'league', league],
  },
  market: {
    ...
    sellOrders: (league?: string) => ['market', 'sell', league ?? 'all'],
  },
  // etc.
};
```

---

## Phase 7: i18n + Polish

### 7.1 Liga-Namen i18n

**Files:** `messages/de.json`, `messages/tr.json`
**Neue Keys:**
```json
{
  "leagues": {
    "allLeagues": "Alle Ligen",
    "bundesliga": "Bundesliga",
    "bundesliga2": "2. Bundesliga",
    "premierLeague": "Premier League",
    "serieA": "Serie A",
    "laLiga": "La Liga",
    "superLig": "Süper Lig",
    "tff1Lig": "TFF 1. Lig"
  }
}
```

### 7.2 Marketing-Texte entfernen

**Betroffene Files:**
- `src/app/layout.tsx` (Zeile 28) — "TFF 1. Lig" aus Meta-Description entfernen
- `src/app/welcome/page.tsx` (Zeile 68) — "TFF" aus Stat-Section entfernen
- Landing Page Texte: generisch machen ("Top-Ligen Europas")

### 7.3 Onboarding

**File:** `src/app/(auth)/onboarding/page.tsx`
**Änderung:**
- Optional: Liga-Auswahl-Step VOR Club-Auswahl
- Oder: Club-Auswahl zeigt alle Ligen (gruppiert mit Liga-Headern)
- Einfachste Variante: Clubs nach Liga gruppiert in bestehendem Flow

---

## Nicht-Änderungen (bewusst KEIN Umbau)

| Bereich | Warum kein Umbau |
|---------|------------------|
| `orders` Tabelle | Kein `league_id` nötig — Trading ist GLOBAL (player_id → club → league via JOIN) |
| `trades` Tabelle | Gleich — global, liga-info via Player-Join |
| `offers` Tabelle | Gleich — P2P ist global |
| `wallets` | Eine Wallet pro User, liga-unabhängig |
| `holdings` | Global — User hält Spieler aus allen Ligen |
| Fee-Split | Liga-unabhängig (gleiche Fees für alle Ligen) |
| `player_gameweek_scores` | Kein `league_id` nötig — Player gehört zu genau einer Liga, GW ist eindeutig pro Spieler |
| Inventory/Equipment | Liga-agnostisch, globales System |
| Achievements/Missions | Liga-agnostisch |
| Founding Pass | Plattform-weit |

---

## Implementierungs-Reihenfolge

| Schritt | Phase | Was | Abhängigkeit |
|---------|-------|-----|-------------|
| 1 | 0 | Migration: Leagues + Clubs.league_id befüllen | — |
| 2 | 0 | Import-Script: 6 Ligen Clubs + Spieler | Schritt 1 |
| 3 | 0 | Import: Fixtures + Stats für neue Ligen | Schritt 2 |
| 4 | 1 | Backend: Cron Multi-League | Schritt 1 |
| 5 | 1 | Backend: API-Calls parametrisiert | Schritt 1 |
| 6 | 2 | UI: LeagueBar extrahieren + shared | — |
| 7 | 2 | UI: ClubChips extrahieren + shared | — |
| 8 | 6 | Types: Player.leagueShort, leagueCountry | Schritt 1 |
| 9 | 3 | UI: Marktplatz + Filters | Schritt 6, 7, 8 |
| 10 | 3 | UI: Bestand + Kader | Schritt 6, 7, 8 |
| 11 | 3 | UI: Fantasy + Events | Schritt 4, 6 |
| 12 | 4 | Scout Card + Player Components | Schritt 8 |
| 13 | 3 | UI: Rankings, Home, Clubs, Community | Schritt 6 |
| 14 | 5 | Admin Panel Multi-League | Schritt 1 |
| 15 | 7 | i18n + Marketing-Texte | Schritt 9-13 |
| 16 | 7 | Onboarding Liga-Auswahl | Schritt 9-13 |

---

## Risiken + Mitigations

| Risiko | Mitigation |
|--------|------------|
| API-Football Rate Limit bei 7 Ligen gleichzeitig | Pro Plan 7.500/Tag, 7 Ligen = ~143/Spieltag = 1.9% |
| Spieler-Duplikate (gleicher Spieler, verschiedene APIs) | player_external_ids Mapping, Name-Matching wie bei TFF |
| Performance bei 4.800 Spielern im Cache | `getAllClubsCached()` + Client-Filter, kein Full-Reload |
| Season-Start unterschiedlich pro Liga | `leagues.active_gameweek` pro Liga, Cron handelt unabhängig |
| Turkish Unicode bei europäischen Spielern | `normalizeForMatch()` existiert, deckt Latin-Chars ab |
| DB-Size wächst 7x | Supabase Free/Pro Plan reicht — 14K fixture_stats → ~100K |

---

## Aufwand-Schätzung

| Phase | Beschreibung | Aufwand |
|-------|-------------|---------|
| Phase 0 | Daten-Import (Ligen, Clubs, Spieler, Fixtures) | 1 Tag |
| Phase 1 | Backend Multi-League (Cron, API, Scripts) | 1-2 Tage |
| Phase 2 | Shared Components (LeagueBar, ClubChips, FilterStack) | 0.5 Tag |
| Phase 3 | Seite-für-Seite UX (12 Pages) | 3-4 Tage |
| Phase 4 | Scout Card + Player Components (7 Components) | 1 Tag |
| Phase 5 | Admin Panel | 0.5 Tag |
| Phase 6 | Types + Services + Query Keys | 0.5 Tag |
| Phase 7 | i18n + Polish + Onboarding | 0.5 Tag |
| **TOTAL** | | **~8-10 Tage** |

---

## Acceptance Criteria

### Daten
- [ ] 7 Ligen mit Logo-URLs in `leagues` Tabelle
- [ ] ~140 Clubs mit `league_id` befüllt
- [ ] ~4.800 Spieler mit Club-Zuordnung
- [ ] Cron synct alle aktiven Ligen automatisch (pro Liga unabhängiger Gameweek)

### Filter-Hierarchie (Land → Liga → Club)
- [ ] CountryBar + LeagueBar auf: Marktplatz, Bestand, Kader, Fantasy, Rankings, Clubs, Community, Transactions
- [ ] Smart Collapse: Land mit 1 Liga → LeagueBar entfällt, Liga auto-selected
- [ ] Club-Chips filtern sich nach gewählter Liga
- [ ] PosFilter + Sort bleiben unverändert (bestehende Patterns)

### Liga-Logos ÜBERALL
- [ ] LeagueBar Pills: 16px Logo + Liga-Name
- [ ] Scout Card Front: 12px Liga-Logo in Top Bar
- [ ] Scout Card Back: 14px Liga-Logo + Name im Header
- [ ] PlayerIdentity Meta-Zeile: 12px Logo + Kürzel nach Club
- [ ] BestandPlayerRow: 12px Logo + Kürzel in Meta
- [ ] KaderPlayerRow: 12px Logo + Kürzel in Meta
- [ ] PlayerRow Card Variant: 14px Liga-Logo im Header
- [ ] Home TopMovers/MostWatched: 12px Logo pro Spieler-Chip
- [ ] Home IPO Spotlight: 14px Logo + Name
- [ ] Fantasy Event Header + Event Cards: Liga-Logo
- [ ] Rankings Header: Liga-Logo
- [ ] Search Results: nach Liga gruppiert mit Logo
- [ ] Admin Liga-Selector: 16px Logo + Name
- [ ] Club Page Header: 20px Liga-Logo + Name
- [ ] Player Detail Hero: 16px Liga-Logo
- [ ] Transactions: 12px Logo pro Eintrag

### Admin
- [ ] Liga-Selector (Land→Liga) für alle Admin-Tabs
- [ ] Club-Erstellung: Liga-Dropdown mit Logos (nicht hardcoded "TFF 1. Lig")

### UX
- [ ] Mobile 393px: CountryBar + LeagueBar scrollbar, kein Overflow, min-h-[44px] Touch Targets
- [ ] LeagueBadge Component: xs (12px) + sm (16px) Varianten
- [ ] CountryBar Component: Flag-Emoji + Ländername
- [ ] Suche: Ergebnisse nach Liga gruppiert mit Logo-Header

### Qualität
- [ ] tsc clean + vitest green
- [ ] i18n: Liga-Namen + Ländernamen in DE + TR
- [ ] Marketing-Texte: "TFF 1. Lig" → generisch ("Top-Ligen Europas")
- [ ] `leagues.logo_url` für alle 7 Ligen befüllt
- [ ] CSP `img-src`: `media-*.api-sports.io` bereits erlaubt (verifizieren)
