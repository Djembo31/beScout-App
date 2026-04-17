# Data-Integrity Deep-Dive: Player + Club Daten

**Datum:** 2026-04-18
**Source:** Live-DB via Supabase MCP (skzjfhvgccaeplydsunz)
**Scope:** Players + Clubs + Stadien + Mappings + Sync-Strategie

---

## TL;DR — Ehrliche Einschätzung

**Stand: Bastel-Stadium 2 von 5.** Funktional für Pilot (Sakaryaspor), aber **NICHT elite-klasse**.

- **Clubs:** 134 komplett befüllt, aber 2 verschiedene Logo-Quellen vermischt (api-sports 123x, wikimedia 11x) → Inkonsistenz
- **Players:** 4556 total, massive Completeness-Gaps: **22.8% ohne Market-Value**, **21.8% ohne Vertrags-Ende**, 8.7% ohne Nationalität
- **KEIN Sync-Job für Player-Daten.** Market-Values/Contracts werden NIE automatisch aktualisiert. Nur Match-Stats per Gameweek-Sync.
- **Datenintegrität:** `players.api_football_id` (Column) und `player_external_ids` (Table) sind out-of-sync — 58 Players haben Mapping in Table aber NULL in Column
- **Duplikate:** 2 Player-Duplikate gefunden (same first+last+club). Klein, aber symptomatisch.

Das reicht für Pilot mit engagierten Test-Usern. Für öffentlichen Launch: **Vertrauensbruch-Risiko**.

---

## 1. Ist-Zustand (Live-DB)

### 1.1 Clubs

| Metrik | Wert |
|--------|------|
| Total Clubs | 134 |
| Mit Logo | 134 (100%) |
| Mit Stadium | 134 (100%) |
| Mit Primary/Secondary Color | 134 (100%) |
| Mit City/Country | 134 (100%) |
| Distinct Stadium Values | 131 (3 Clubs teilen Stadion — plausibel bei Derby-Städten) |

**Logo-Quellen:**
- `media.api-sports.io`: 123 Clubs (92%)
- `upload.wikimedia.org`: 11 Clubs (8%) — **Inkonsistent**

Wikimedia-Logos sind wahrscheinlich manuell nachgetragen — möglicherweise veraltete oder falsche Versionen. User-Wahrnehmung: "Wappen nicht korrekt."

### 1.2 Players

| Liga | Clubs | Players | Market-Value missing | Nationalität missing | Vertrag missing | Photo missing |
|------|-------|---------|---------------------|---------------------|----------------|---------------|
| TFF 1. Lig | 20 | 797 | **29.1%** | 16.1% | 29.1% | 0.4% |
| La Liga | 20 | 717 | **27.9%** | 9.9% | 27.6% | 4.3% |
| Premier League | 20 | 671 | 21.9% | 4.8% | 21.8% | 8.8% |
| Serie A | 20 | 656 | **31.7%** | 10.5% | 31.7% | 1.2% |
| Süper Lig | 18 | 597 | 23.1% | 6.2% | 17.9% | 1.8% |
| Bundesliga | 18 | 565 | 11.3% | 6.5% | 11.2% | 3.4% |
| 2. Bundesliga | 18 | 553 | 8.9% | 4.0% | 7.4% | 2.0% |
| **TOTAL** | **134** | **4556** | **22.8%** | **8.7%** | **21.8%** | **3.1%** |

**Kritische Gaps (global):**
- 1038 Players ohne Market-Value (EUR)
- 995 Players ohne Contract-End
- 396 Players ohne Nationalität
- 210 Players ohne api_football_id (Column-Wert)
- 113 Players ohne Shirt-Number

### 1.3 External-ID-Mapping (api_football)

| Source | Count | Distinct Players |
|--------|-------|------------------|
| `api_football_squad` | 4346 | 4346 |
| `api_football_fixture` | 254 | 254 (aus Match-Lineups recovered) |
| `api_football_orphan_recovery` | 56 | 56 (manual patch) |
| **TOTAL** | **4656** | **4656** |

**Drift-Problem:** 58 Players haben Eintrag in `player_external_ids` aber NULL in `players.api_football_id` (redundante Speicherung nicht sync).

### 1.4 Player-Photos

- `media.api-sports.io`: 3909 (86%)
- `img.a.transfermarkt.technology`: 505 (11%)
- ohne Photo: 142 (3.1%)

**Konflikt mit `.claude/rules/common-errors.md`:** Die Regel sagt "Spielerbilder = transfermarkt.technology NICHT api-sports.io" — Live-DB sagt das Gegenteil. Regel ist veraltet oder CSP-Config ist drifted.

### 1.5 Sync-Strategie (Cron-Jobs)

| Job | Schedule | Aktualisiert |
|-----|----------|--------------|
| `event-status-sync` | every 15 min | events table only |
| `gameweek-sync-trigger` | every 30 min | match-stats (goals/assists/matches) |
| `sync-event-statuses` | every minute | fantasy events |

**KRITISCH:** Kein Cron-Job für:
- Player Market-Values
- Player Contract-End-Dates
- Player Transfers (Club-Wechsel)
- New-Player-Discovery (Junior-Kader-Aufnahmen)
- Club-Logo-Refresh
- Stadium-Änderungen

**Konsequenz:** Jeder Market-Value/Contract-Wert ist "as-of whenever last manual import was run". Neue Transfers, neue Spieler, Vertrags-Verlängerungen tauchen NICHT auf.

---

## 2. Probleme (ranked by User-Impact)

### P1 — KRITISCH: Kein Auto-Sync für Master-Daten

**Symptom:** 22% ohne Market-Value, 22% ohne Contract-End, Liste veraltet nach jedem Transfer-Fenster.

**Root-Cause:** Initial-Import lief manuell, einmalig. Kein wiederkehrender Job für Non-Match-Daten.

**User-Wahrnehmung:** "Spieler fehlt", "Falsche Werte", "Veraltet".

### P2 — HOCH: Dual-Source ohne Fallback-Strategy

**Symptom:** 
- Club-Logos aus api-sports + wikimedia
- Player-Photos aus api-sports + transfermarkt
- Market-Values theoretisch aus Transfermarkt (rule), aber 22% missing

**Root-Cause:** Keine klare Source-of-Truth pro Feld. Manuelle Korrekturen per SQL/Admin mischen sich mit Auto-Imports.

**User-Wahrnehmung:** "Unterschiedliche Bild-Qualität", "Wappen nicht einheitlich".

### P3 — HOCH: Players-vs-External-IDs Drift

**Symptom:** 58 Players mit `api_football_id IS NULL` aber Eintrag in `player_external_ids`.

**Root-Cause:** 2 Storage-Locations für gleiche Info ohne Constraint/Trigger zur Sync-Erhaltung.

**User-Wahrnehmung:** Unsichtbar — bricht aber zukünftige Sync-Runs (Matching schlägt fehl).

### P4 — MITTEL: Rate-Limit-Bruch beim Initial-Import

**Symptom:** User berichtet "mit 1 angefangen, dann 4000 nachgelegt, vieles falsch". Das deutet auf unkontrollierten Batch-Import ohne Retries hin.

**Root-Cause:** API-Football Free-Tier ~100 requests/day, Paid-Tier 75k/month. Ohne Throttle + Retry-Queue läuft jeder große Import ins Rate-Limit und liefert Teilmengen.

**User-Wahrnehmung:** "Nicht alle Spieler drin".

### P5 — NIEDRIG: Club-Page zeigt nicht eigenes Stadion

**Symptom:** User-Report, nicht DB-Issue.

**Root-Cause:** Frontend-Bug (Rendering von `club.stadium` fehlt oder falsches Binding). DB hat 100% Stadium-Coverage.

### P6 — NIEDRIG: Duplicate Players (2 Fälle)

**Symptom:** 2 players mit gleichem first+last+club. Klein, aber symptomatisch.

**Root-Cause:** Keine UNIQUE-Constraint auf `(first_name, last_name, club_id)` oder `(api_football_id)`.

---

## 3. Was "Elite-Klasse" heißt (State-of-the-Art für Sport-Apps)

Siehe wie Fantasy.com, FotMob, Sorare, Fantrax das machen:

### 3.1 Daten-Governance

- **Single Source of Truth pro Feld:**
  - Master-IDs: API-Football (primär), Transfermarkt (fallback für Market-Values)
  - Photos: transfermarkt als canonical, api-sports als fallback
  - Logos: transfermarkt als canonical (offizieller)
  - Stadien: eigene Master-Tabelle mit FK (nicht als string in clubs)
- **Versionierung:** jede Daten-Änderung wird geloggt (player_history table)
- **Data Lineage:** jedes Feld weiß, wo es herkommt (source + updated_at + source_version)

### 3.2 Sync-Architektur

**3-Stufen-Pipeline:**

1. **Continuous Sync** (jede 6h): Match-Stats, In-Season Transfers, Shirt-Numbers
2. **Daily Sync** (3 AM UTC): Market-Values, Contracts, Injuries
3. **Weekly Sync** (Sonntag): New Players, Squad-Changes, Stadium-Updates

**Jeder Sync-Job:**
- Idempotent (darf 2x laufen ohne Duplikate)
- Rate-Limited (API-Quota-aware, mit Exponential-Backoff)
- Transactional (alles-oder-nichts pro Batch)
- Monitored (`cron_sync_log` Entry pro Run, Success/Skipped/Errored-Counts)
- Alerting (E-Mail/Slack wenn 3+ Runs in Folge fehlschlagen)

### 3.3 Data-Quality-SLA

- **99%+ Completeness** auf kritischen Feldern (Name, Position, Club, Nationalität, Photo)
- **95%+ auf Extra-Feldern** (Market-Value, Contract-End, Shirt-Number)
- **Max 7d Staleness** für Market-Values
- **Max 24h Staleness** für Match-Stats
- **Visible Freshness-Badge** im UI ("Daten aktualisiert vor 2h")

### 3.4 Fehler-Transparenz

- Admin-Dashboard zeigt pro Liga: Completeness-Score, Stale-Counter, Last-Sync-Timestamp
- User sieht "—" statt falschem Wert wenn Feld leer ist (kein Fake-"0")
- "Report falsches Datum" Button pro Spieler → queue für manuelle Korrektur

---

## 4. Vorgehen — Plan zur Elite-Klasse

### Phase 1 — Aufräumen (3-5 Slices, 1 Woche)

**059 — Data-Quality-Audit-RPC + INV-Test**
- `public.get_player_data_completeness()` Aggregation pro Liga + Feld
- INV-34: Test failt wenn Completeness unter SLA fällt
- Proof: Dashboard-Zahlen aus DB

**060 — Dedupe + Constraints**
- Manuelle Auflösung der 2 Duplikate
- `UNIQUE (api_football_id)` Constraint auf players
- Check-Constraint auf `player_external_ids.player_id` Sync

**061 — players.api_football_id ↔ player_external_ids sync**
- Trigger: INSERT/UPDATE auf player_external_ids → sync players.api_football_id
- Backfill der 58 drift cases

**062 — Logo-Quellen-Normalisierung**
- Entscheiden: api-sports ODER transfermarkt als primär
- Migration: 11 wikimedia-Logos auf canonical source
- Admin-UI: Upload-Override für Edge-Cases

### Phase 2 — Sync-Infrastruktur (5-7 Slices, 2 Wochen)

**063 — Player-Sync-Pipeline v1**
- Edge-Function `sync-players-daily` auf Vercel Cron (3 AM UTC)
- API-Football `/players?team=X&season=Y` iteriert über alle 134 Clubs
- Rate-Limited (1 req/sec), retry mit exponential backoff
- Upsert-Pattern mit `updated_at` als version

**064 — Market-Value-Sync via Transfermarkt**
- Scraper-Service (fair-use, caches 7d) oder API-Access
- Daily Sync für alle 4556 Players
- Fallback-Chain: Transfermarkt → API-Football (rare) → NULL

**065 — Contract-End Sync + Tracking**
- Teil des Player-Sync-Pipelines
- `player_history` Table: alte Werte archivieren
- Alert wenn sich Contract ändert (z.B. Early-Termination signal)

**066 — Stadium Master-Table**
- `stadiums` table mit FK von clubs
- Features: capacity, surface, city, opened_year
- Benefit: shared stadiums (1 Stadium, N Clubs) möglich

**067 — Club-Logo Admin-Override-UI**
- Admin kann manual Logo hochladen ODER canonical-URL forcen
- Fallback-Chain: admin_upload → transfermarkt → api-sports → placeholder

### Phase 3 — Observability + Trust-Features (3-4 Slices)

**068 — Admin Data-Quality-Dashboard**
- Per Liga: Completeness-Score
- Per Club: Fehlende Felder
- Per Player: "Last synced at"

**069 — User-facing Freshness-Badge**
- "Aktualisiert vor 2h" unter Market-Value
- "Verify"-Icon grün wenn alle Felder komplett

**070 — Data-Quality-Report-Feature für User**
- Button "Falsches Datum melden" auf Player-Page
- Admin queue → manual review → correction

---

## 5. Was JETZT zu entscheiden ist (CEO-Gate)

Bevor ich einen einzigen Code-Line schreibe, brauche ich Input:

### Q1 — Datenquelle-Strategie

**Option A** (günstig, aber 22% Gaps): API-Football Paid + manuelle Transfermarkt-Scrapes
**Option B** (teurer, komplett): Sorare-style — 3-4 Datenquellen kombiniert + Team hinter Daten-Qualität
**Option C** (billig, Risk): Komplett API-Football + explicit "Market-Value unbekannt" UI

Empfehlung: **Option A** für Pilot, Plan für **Option B** vor Public-Launch.

### Q2 — Budget für Daten-Infrastruktur

- API-Football Pro: €29/Monat bei 75k reqs
- Transfermarkt (kein offizielles API): Scraping (juristisch grau) oder Partner-Deal
- Vercel Cron Pro: inklusive
- Eigene Stored Procedures für Datenpflege: kostet Entwickler-Zeit

### Q3 — Wann ist 100%-Completeness erreicht?

Option: "Bronze-Ready" = 95% auf kritischen Feldern, "Silver" = 99%, "Gold" = 99.9% mit manual-override UI.

Für Pilot-Launch: Bronze. Für Public: Gold.

### Q4 — Wie gehen wir mit Liga-Unterschieden um?

Heute: Bundesliga 89% Coverage, TFF 71%. Das wird User confusen.

Optionen:
- Launch nur mit 100%-coverage Ligen (Bundesliga, 2. Liga)
- Launch alle, aber zeige Coverage-Badge
- Manual Fix-Team für Incomplete Data pro Liga

---

## 6. Anti-Pattern das wir vermeiden müssen

Im Moment:
- **Manuelle SQL-Imports** ohne Rollback-Plan (dein "1 + 4000 nachgelegt"-Fall)
- **Dual-Storage** (players.api_football_id + player_external_ids) ohne Sync-Enforcement
- **Keine UNIQUE-Constraints** auf natural keys
- **Silent-Failure** bei Rate-Limit-Hit (kein Retry-Queue, einfach Datensatz fehlt)
- **Keine Versionierung** — wir wissen nicht, was wann wo her kam

**Elite-Klasse macht das Gegenteil:** jede Daten-Änderung ist deklarativ, versioniert, idempotent, rate-limited, monitored.

---

## 7. Sofortige nächste Schritte

**Option A — du entscheidest Strategie, ich execute:**
Du beantwortest Q1-Q4 (oben), ich baue Phase-1-Slices (059-062) in dieser Session.

**Option B — wir machen heute nur Low-Hanging:**
Ich fixe die 2 Duplikate + die 58 drift cases + schreibe INV-34 Data-Quality-Test. Rest nach deiner Strategie-Entscheidung.

**Option C — Pause:**
Du denkst über Budget + Strategie nach, wir setzen morgen fort mit konkretem Plan.

Meine Empfehlung: **Option B** heute (2-3 Slices, sauber), **Option A** nach deiner Entscheidung über Datenquellen-Strategie.

---

## Referenzen

- `.claude/rules/database.md` — Column Quick-Reference (players, clubs)
- `.claude/rules/common-errors.md` — API-Football Gotchas (`grid_position` bug, etc.)
- `memory/project_multi_league_expansion.md` — Historische Context für 7 Ligen
- `supabase/migrations/` — 200+ Migrations, aber keine single "player-sync-cron"
- Live-DB state 2026-04-18 21:xx
