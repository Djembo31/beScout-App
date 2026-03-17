# Datenintegritaet & Vertrauen — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sicherstellen dass Spielerdaten zu 100% korrekt, konsistent und transparent sind — damit kein User jemals an der Datenqualitaet zweifelt.

**Architecture:** Dreistufig: (1) Backend-Datenluecken schliessen, (2) Frontend-Transparenz, (3) Verification. Alle Aenderungen sind additiv — kein bestehendes Verhalten bricht.

**Tech Stack:** Supabase RPCs, API-Football Injuries Endpoint, React Query, next-intl

---

## Befund (Status Quo)

### Was FUNKTIONIERT
- `sync_player_aggregates` Trigger: matches/goals/assists/clean_sheets/minutes/saves auf `players` stimmen mit `fixture_player_stats` ueberein (0 Abweichungen)
- `cron_recalc_perf` RPC: perf_l5/l15 werden korrekt aus `player_gameweek_scores` berechnet
- Cron Step 12 ruft `cron_recalc_perf` bei jedem Sync auf
- 607 von 633 Spielern haben Match-Daten (95.9%)
- 94.4% der fixture_player_stats sind gemappt

### Was NICHT funktioniert
| Problem | Impact | Prio |
|---------|--------|------|
| **ALLE 633 Spieler zeigen `status: 'fit'`** — Status wird NIE von API-Football synchronisiert | User sieht verletzten Spieler als "fit" | KRITISCH |
| **20+ Spieler seit 18-28 GWs nicht gespielt** aber `status: 'fit'` | User kauft Scout Card eines nicht-aktiven Spielers | KRITISCH |
| **Kein "Warum?" bei fehlenden Daten** — MatchTimeline zeigt "Keine Daten" ohne Erklaerung | User denkt App ist kaputt | HOCH |
| **`getPlayerById()` fehlt** `contract_end`, `total_minutes`, `total_saves` | Minuten/Saves zeigen 0 im Detail | MITTEL |
| **Market Movers API** hat weniger Spalten als Hauptliste | Inkonsistente Daten je nach View | MITTEL |
| **5.6% ungemappte fixture_player_stats** (704 Rows) | Daten existieren aber sind keinem Spieler zugeordnet | NIEDRIG |
| **26 Spieler mit 0 Matches** zeigen keine Erklaerung | User fragt sich was los ist | NIEDRIG |

---

## Phase 1: Backend — Datenluecken schliessen

### Task 1: Query-Spalten alignen (Single Source of Truth)

**Ziel:** EINE kanonische Spalten-Liste fuer ALLE Player-Queries.

**Files:**
- Modify: `src/lib/services/players.ts` — `getPlayerById()` und `getPlayersByClubId()`
- Modify: `src/app/api/players/route.ts` — Movers-Query + Hauptliste

**Step 1:** Kanonische Spalten-Konstante definieren

In `src/lib/services/players.ts` oben:
```typescript
/** Kanonische Spalten fuer ALLE Player-Queries. Single Source of Truth. */
export const PLAYER_SELECT_COLS = [
  'id', 'first_name', 'last_name', 'position', 'club', 'club_id',
  'age', 'shirt_number', 'nationality', 'image_url',
  'matches', 'goals', 'assists', 'clean_sheets',
  'total_minutes', 'total_saves',
  'perf_l5', 'perf_l15', 'perf_season',
  'dpc_total', 'dpc_available',
  'floor_price', 'last_price', 'ipo_price', 'price_change_24h', 'volume_24h',
  'status', 'market_value_eur', 'success_fee_cap_cents', 'max_supply',
  'is_liquidated', 'contract_end', 'created_at', 'updated_at',
].join(', ');
```

**Step 2:** `getPlayerById()` + `getPlayersByClubId()` nutzen `PLAYER_SELECT_COLS`

**Step 3:** `/api/players` Route: Movers-Query nutzt DIESELBEN Spalten wie Hauptliste (importiert `PLAYER_SELECT_COLS`)

**Step 4:** Build + tsc check

**Step 5:** Commit: `fix: align all player queries to canonical column set`

---

### Task 2: Player Status Sync von API-Football

**Ziel:** Spieler-Status (verletzt, gesperrt, nicht im Kader) automatisch von API-Football synchronisieren.

**Files:**
- Modify: `src/lib/footballApi.ts` — neuer API-Type fuer Injuries
- Modify: `src/app/api/cron/gameweek-sync/route.ts` — neuer Cron-Step
- Create: Migration — `last_appearance_gw` Spalte

**Step 1:** Migration — `last_appearance_gw` + Status-Erweiterung

```sql
-- Add last_appearance_gw column to track when player was last seen
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_appearance_gw INT DEFAULT 0;

-- Backfill from existing data
UPDATE players p SET last_appearance_gw = COALESCE(sub.max_gw, 0)
FROM (
  SELECT fps.player_id, MAX(f.gameweek) as max_gw
  FROM fixture_player_stats fps
  JOIN fixtures f ON f.id = fps.fixture_id
  WHERE fps.player_id IS NOT NULL
  GROUP BY fps.player_id
) sub
WHERE p.id = sub.player_id;
```

**Step 2:** API-Football Sidelined/Injuries fetch in `footballApi.ts`

```typescript
export type ApiSidelinedPlayer = {
  player: { id: number; name: string };
  team: { id: number };
  type: string; // 'Missing Fixture', 'Injured', 'Suspended', 'Doubtful'
  reason: string;
};
```

**Step 3:** Neuer Cron-Step — `sync_player_status`

Ablauf:
1. Fetch `/injuries?league={id}&season={season}` von API-Football
2. Fuer jeden Eintrag: finde Spieler via `player_external_ids`
3. Mappe API-Type → BeScout-Status:
   - `'Injured'` → `'injured'`
   - `'Suspended'` → `'suspended'`
   - `'Doubtful'` → `'doubtful'`
   - `'Missing Fixture'` → pruefen ob Transfer
4. UPDATE `players.status` nur wenn sich was aendert
5. Spieler die NICHT in der Injuries-Liste sind UND `last_appearance_gw` aktuell → `'fit'`

**Step 4:** `last_appearance_gw` automatisch updaten

Im bestehenden Cron-Step der fixture_player_stats inserted:
```sql
-- After inserting fixture_player_stats, update last_appearance_gw
UPDATE players p SET last_appearance_gw = GREATEST(p.last_appearance_gw, {currentGw})
WHERE p.id IN (SELECT DISTINCT player_id FROM fixture_player_stats WHERE fixture_id = {fixtureId} AND player_id IS NOT NULL);
```

**Step 5:** PLAYER_SELECT_COLS um `last_appearance_gw` erweitern

**Step 6:** Build + tsc check

**Step 7:** Commit: `feat: sync player status from API-Football + track last appearance GW`

---

### Task 3: DbPlayer + Player Types erweitern

**Files:**
- Modify: `src/types/index.ts` — DbPlayer + Player Types
- Modify: `src/lib/services/players.ts` — `dbToPlayer()` Mapper

**Step 1:** DbPlayer erweitern:
```typescript
// Add to DbPlayer
last_appearance_gw: number;
// contract_end already exists but wasn't always selected
```

**Step 2:** Player Type erweitern:
```typescript
// Add to Player
lastAppearanceGw: number;  // letzte GW mit Einsatz
gwGap: number;             // aktuelle GW - lastAppearanceGw
```

**Step 3:** `dbToPlayer()` — neue Felder mappen:
```typescript
lastAppearanceGw: db.last_appearance_gw ?? 0,
gwGap: currentGw - (db.last_appearance_gw ?? 0), // currentGw from env or fixtures
```

**Step 4:** Build + tsc check

**Step 5:** Commit: `feat: extend Player type with lastAppearanceGw + gwGap`

---

## Phase 2: Frontend — Transparenz

### Task 4: Player Status Badge (universell)

**Ziel:** Ueberall wo ein Spieler angezeigt wird, MUSS sein aktueller Status sichtbar sein wenn er NICHT "fit" ist.

**Files:**
- Modify: `src/components/player/index.tsx` — `StatusBadge` erweitern
- i18n: `messages/de.json`, `messages/tr.json`

**Step 1:** `StatusBadge` erweitern fuer neue Status-Werte:

Aktuell zeigt es: `doubtful`, `injured`, `suspended`, `loaned`, `liquidated`

Hinzufuegen:
- `inactive` — Spieler hat seit 5+ GWs nicht gespielt, Grund unbekannt
- Tooltip mit "Letzter Einsatz: GW {n}" wenn gap > 3

**Step 2:** i18n Keys fuer neue Status-Texte

**Step 3:** Commit: `feat: enhanced StatusBadge with inactivity indicator`

---

### Task 5: MatchTimeline — Erklaerung bei fehlenden Daten

**Ziel:** Wenn ein Spieler keine/wenige Match-Daten hat, erklaeren WARUM.

**Files:**
- Modify: `src/components/player/detail/MatchTimeline.tsx`
- i18n: neue Keys

**Step 1:** Empty State mit Kontext-Erklaerung:

```
Wenn entries leer UND:
- player.status === 'injured' → "Spieler ist derzeit verletzt"
- player.status === 'suspended' → "Spieler ist gesperrt"
- player.gwGap > 10 → "Spieler hat seit GW {n} nicht mehr gespielt. Moeglicherweise transferiert oder nicht im Kader."
- player.gwGap > 3 → "Kein Einsatz in den letzten {n} Spieltagen"
- player.matches === 0 → "Bisher kein Pflichtspieleinsatz in dieser Saison"
- sonst → "Keine Leistungsdaten vorhanden"
```

**Step 2:** Header-Info fuer aktuelle Daten:

Unter dem L5/L15 Toggle eine dezente Info-Zeile:
```
"Daten bis GW {lastAppearanceGw} · {matches} Einsaetze · Status: {status}"
```

**Step 3:** Build + tsc

**Step 4:** Commit: `feat: contextual empty states in MatchTimeline`

---

### Task 6: PerformanceTab — Status + Freshness Indicator

**Ziel:** PerformanceTab zeigt den Spieler-Status prominent und warnt bei veralteten Daten.

**Files:**
- Modify: `src/components/player/detail/PerformanceTab.tsx`

**Step 1:** Status-Banner oben im Tab wenn nicht "fit":

```tsx
{player.status !== 'fit' && (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
    <AlertTriangle className="size-4 text-amber-400" />
    <span className="text-sm text-amber-300">{statusMessage}</span>
  </div>
)}
```

**Step 2:** Wenn `gwGap > 5` und Status "fit":

```
"Letzter Einsatz: GW {n} ({gwGap} Spieltage her) — Spieler koennte transferiert oder nicht im Kader sein"
```

**Step 3:** Build + tsc

**Step 4:** Commit: `feat: player status + freshness in PerformanceTab`

---

### Task 7: PlayerRow/Card — Inaktivitaets-Indikator

**Ziel:** In Listen-Ansichten (Market, Kader, etc.) sofort sichtbar ob ein Spieler inaktiv ist.

**Files:**
- Modify: `src/components/player/index.tsx` — PlayerKPIs / StatusBadge
- Modify: `src/components/player/PlayerRow.tsx`

**Step 1:** StatusBadge bei `gwGap > 5` automatisch anzeigen:

Dezentes Badge "Inaktiv seit GW {n}" neben dem Namen, unabhaengig von `player.status`.

**Step 2:** Build + tsc

**Step 3:** Commit: `feat: inactivity indicator in player list views`

---

## Phase 3: Verification

### Task 8: Admin Data Integrity Dashboard

**Ziel:** BeScout-Admin bekommt einen Tab "Datenqualitaet" der auf einen Blick zeigt ob alles stimmt.

**Files:**
- Modify: Admin Dashboard (neuer Sub-Tab)

**Inhalt:**
- Anzahl gemappter vs. ungemappter fixture_player_stats
- Spieler mit `gwGap > 5` und `status = 'fit'` (potenzielle Fehler)
- Letzter Cron-Run + Status
- Spieler mit 0 Matches

**Step 1:** SQL Query fuer Integrity-Check

**Step 2:** Admin UI Komponente

**Step 3:** Commit: `feat: admin data integrity dashboard`

---

### Task 9: Manuelles Status-Override fuer Admin

**Ziel:** Club-Admin kann Spieler-Status manuell setzen wenn API-Football falsch liegt.

**Files:**
- Modify: Club Admin Player Management

**Step 1:** Status-Dropdown im Player-Edit Modal (club-admin)

Optionen: fit, injured, suspended, doubtful, loaned, transferred

**Step 2:** UPDATE Query mit `updated_at`

**Step 3:** Commit: `feat: admin manual player status override`

---

## Reihenfolge & Abhaengigkeiten

```
Task 1 (Query-Spalten) ──┐
                         ├── Task 3 (Types) ── Task 4 (StatusBadge) ── Task 5+6+7 (UI)
Task 2 (Status Sync)  ──┘                                               │
                                                                         ├── Task 8 (Admin Dashboard)
                                                                         └── Task 9 (Manual Override)
```

**Empfohlene Waves:**

| Wave | Tasks | Dauer | Was es bringt |
|------|-------|-------|---------------|
| 1 | 1, 2, 3 | Backend | Daten sind korrekt + vollstaendig |
| 2 | 4, 5, 6, 7 | Frontend | User sieht und versteht die Daten |
| 3 | 8, 9 | Admin | Qualitaetskontrolle + Manuelles Override |

---

## Nicht-Ziele (explizit NICHT in diesem Plan)

- Redesign des Scoring-Systems
- Aenderung an der Cron-Frequenz
- Neue Datenquellen (Transfermarkt API, etc.)
- Transfer-Tracking (welcher Spieler zu welchem Club gewechselt)
- Historische Status-Aenderungen (Verlaufs-Log)
