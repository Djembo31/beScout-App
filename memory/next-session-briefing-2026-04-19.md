# Next-Session Briefing (2026-04-19)

> Erstellt Ende Session 2026-04-18.
> **Letzte Session war die produktivste seit Projektstart: 8 Slices (069–076) in einer Sitzung.**

---

## TL;DR — wo wir stehen

**Die komplette Data-Import-Infrastruktur ist gebaut.** 7 Cron-Endpoints + Admin-UI mit 8 Tabs + 3 neue Tabellen + Performance-Refactor.

**Was fehlt für Gold-Standard:** Manueller CSV-Upload (Slice 076 liefert das Werkzeug) — weil Transfermarkt-Scraping auf Vercel-IPs Cloudflare-blocked ist. **Gold ist jetzt NUR noch eine Frage der CSV-Arbeit, nicht mehr des Codes.**

**Aktueller Gold-Stand (verifiziert live):** 0/7 Ligen Gold. TFF 1. Lig hat Contract + Market-Value auf **70.2% gesunken** weil sync-players-daily neue Stammkader-Einträge (via shirt_number) brachte, die keine TM-Daten haben.

---

## Heute gelaufen — 8 Slices

| # | Slice | Commit(s) | Highlights |
|---|---|---|---|
| 069 | Cron-Frequenz + Manual-Trigger + Deploy-Healing | 37f2f0d6 + 5f48aa0d + d18daac9 | **Rettung:** 11 Vercel-Deploys waren gefailt seit Slice 064. Root-Cause: Named-Exports in route.ts + ESLint-Rule-Config-Gap. |
| 070 | Sync-Injuries + players.status CHECK | dbf98f4e | Fantasy-kritisch: Verletzungen/Sperren tracking. `players.status` IN ('fit','doubtful','injured','suspended'). |
| 071 | gameweek-sync Phase-A-Skip (3×-Schedule Rollback) | 7a097ea2 + dca2c359 | Perf-Opt im Code live. 3×/Tag Schedule rejected wegen Hobby-Plan-Limit. |
| 072 | sync-transfers Manual-Only + player_transfers Tabelle | dacfe6f4 | 134 Calls/Run, Transfer-Historie-Log. |
| 073 | sync-fixtures-future Manual-Only | 9d0b0a58 | Saison-Fixtures + Spielverlegungs-Update. |
| 074 | sync-standings Manual-Only + league_standings Tabelle | eb0e6521 | **Einziger Cron der LIVE Daten gebracht hat:** 134 standings in 7 Ligen, Form-Indicator "WWDWL". |
| 075 | Cron Performance-Refactor (Batch-Pattern) | e0c9abb2 + 089ef0f9 + ae03ebeb | sync-injuries **60s→28s** (1805 updates), sync-players-daily **300s→52s** (4074 updates). 3 Healing-Iterationen nötig. |
| 076 | Manual CSV-Import (TM-Block-Workaround) | 78d1d412 | Export/Import-UI mit validation + batch-apply. Gold-Standard-Ziel via CSV erreichbar. |

**Kernmetriken:**
- ~30 Commits gepusht
- 3 neue DB-Tabellen: `player_transfers`, `league_standings`, + CHECK constraint auf `players.status`
- 3 neue `players` Columns: `injury_reason`, `injury_until`, `status_updated_at`
- Admin-UI erweitert von 16 auf 18 Tabs
- 5 neue Common-Errors-Patterns dokumentiert

---

## Aktiv + Offen

### Automatisch laufende Crons (Vercel Hobby = nur 2 Auto-Slots)

| Cron | Schedule | Status |
|------|----------|--------|
| `gameweek-sync` | 06:00 UTC täglich | ✅ Auto (Match-Stats, Ratings) |
| `close-expired-bounties` | 05:00 UTC täglich | ✅ Auto |

### Manual-Only Crons (vercel.json listed aber Hobby-Limit blockt Auto-Schedule)

Alle 7 Manual-Only via Admin-UI → **Data Sync** Tab (7 Cards):

| Cron | Performance | Was es liefert |
|------|-------------|----------------|
| sync-injuries | 28s | Verletzte/gesperrte (1805 live updates gemessen) |
| sync-players-daily | 52s | Nationality/Photo/Shirt/Position (4074 updates) |
| sync-transfermarkt-batch | 1.4s | Market-Value + Contract (**nur für mapped Players** — 505 von 4556) |
| transfermarkt-search-batch | 70s | tm-ID Discovery — ⚠️ **Cloudflare-Block: 0 matches auf Vercel** |
| sync-transfers | **Timeout 300s** | Transfer-Historie — braucht Batch-Refactor |
| sync-fixtures-future | **Timeout 300s** | Saison-Fixtures + Verlegungen — braucht Batch-Refactor |
| sync-standings | 23s | Liga-Tabelle + Form (134 standings live) |

### Nur via Admin-UI (kein Auto-Schedule)

**Data Sync Tab (7 Cards)** + **CSV Import Tab (neu)**

---

## 🚨 Offene Entscheidungen für morgen

### Entscheidung 1 — Vercel Pro-Upgrade?

**Status:** Hobby max 2 Auto-Cron-Slots. Alle 7 Data-Sync-Crons laufen derzeit nur manuell.

**Pro ($20/mo) bringt:**
- 40 Cron-Jobs erlaubt
- 300s function-timeout (statt 10s Hobby)
- Multi-Schedule-Syntax (`0 6,14,22 * * *`) erlaubt → 3×/Tag gameweek-sync möglich

**Alternative:** Manual-Only bleibt. Du triggerst 1× pro Woche im Admin-Panel.

**Empfehlung:** Pre-Launch Hobby ist OK. Nach Launch direkt upgraden.

### Entscheidung 2 — CSV-Workflow durchziehen?

**Der direkte Weg zu Gold-Standard:**

1. Admin → **CSV Import** Tab → `CSV herunterladen`
2. Excel/Google-Sheets öffnen, `players-2026-04-18.csv`
3. Spalten `market_value_eur` (Integer in €) + `contract_end` (YYYY-MM-DD) füllen
4. Datenquellen-Optionen:
   - Comunio / Kicker-Manager
   - SofaScore (aber UI-scrape)
   - Dein eigenes Kicker-Abo / Fußball-Datenbank
   - Crowdsourcen über Discord/Twitter
5. CSV speichern
6. Zurück → `CSV hochladen` → Preview check → `Updates anwenden`
7. Check-Query: `SELECT jsonb_pretty(public.get_player_data_completeness())`

**Zeitschätzung:** 2h für TFF 1. Lig (mit Abo als Datenquelle). 8h für alle 7 Ligen.

### Entscheidung 3 — Performance-Refactor für sync-transfers + sync-fixtures-future?

**Betroffen:** Beide timeouten bei 300s wegen per-Row-DB-Ops. Gleiches Pattern wie bei sync-injuries.

**Slice 077 Aufwand:** ~1h (Pattern aus Slice 075 copy-pasten).

**Business-Impact:** Niedrig pre-launch (Transfer-Historie + Fixtures-Updates sind nicht-kritisch). Kann warten.

### Entscheidung 4 — Frontend-UI für player_transfers + league_standings?

**Status:** Backend-Daten sind da (134 standings live), UI fehlt.

**Slices 078-080:**
- **078** Club-Page: "Liga-Tabelle" Section (Position, Punkte, Form "WWDWL")
- **079** Player-Detail: "Letzte Transfers" Section (5 last transfers)
- **080** Home-Widget: "Top 3 Clubs aus Tabelle"

**Zeit:** je ~2h.

---

## 📋 Priorisierte To-Do Liste

### Kritisch (diese Woche, für Gold-Standard)

- [ ] **CSV-Workflow durchziehen** für TFF 1. Lig (Pilot) → `get_player_data_completeness()` checken
- [ ] Bei Success: für alle 7 Ligen wiederholen
- [ ] Regel für Laufende CSV-Updates: z.B. monatlich nach Transfer-Fenstern

### Wichtig (diese Woche, Infrastructure)

- [ ] **Slice 077** — sync-transfers + sync-fixtures-future Batch-Refactor (damit auch die manuell laufen)
- [ ] Vercel Pro-Upgrade-Entscheidung (nach Launch okay, jetzt nicht dringend)
- [ ] **Slice 071b** — Wenn Pro: 3 separate Cron-Entries für gameweek-sync (Late-Match-Coverage)

### Nice-to-Have (nächste 2 Wochen)

- [ ] **Slice 078** Frontend Club-Page "Liga-Tabelle" Section
- [ ] **Slice 079** Frontend Player-Detail "Letzte Transfers" Section
- [ ] **Slice 080** Frontend Home-Widget "Top 3 Clubs"
- [ ] **Slice 081** Notification on injury-change (Watchlist + Holdings)

### Deferred (nach Launch)

- [ ] Transfermarkt Proxy-Integration (Bright Data / Smartproxy ~$50/mo)
- [ ] UI: Cron-Status-Dashboard für Admin (zeigt letzten Run + Freshness)
- [ ] Slice 065b: 76 Clubs ohne lokales Stadium-Asset (Anil fills via Admin-UI)
- [ ] Slice 062b: 8 non-numeric api_football_ids auf NULL
- [ ] Slice 068b: Player-Search-Scoring-Algorithmus tune (nach Proxy-Fix)

---

## 🧱 Technische Schulden

### Cron-Endpoints die Timeouts haben

- **sync-transfers** (300s) — per-Row player-lookup + transfer-insert. Fix: Batch-Pattern aus Slice 075.
- **sync-fixtures-future** (300s) — per-Row pre-query fixture + insert/update. Fix: Batch via `.in()`.

Beide in **Slice 077** konsolidierbar (~1h).

### Vercel Function-Limits

- Admin-Trigger-Proxy `maxDuration = 300` wird von Vercel-Hobby respektiert für diese Route-Typen
- Direct Cron-Auto-Runs können länger laufen (aber fehlen wegen Hobby-2-Slot-Limit)

### Transfermarkt-Abhängigkeit

- Market-Value + Contract-End kommen EXKLUSIV aus Transfermarkt
- Vercel-IPs sind Cloudflare-blocked
- CSV-Import ist der Workaround, aber manuell
- Langfristig: Proxy-Service ($50/mo) oder alternative Datenquelle (Comunio API falls existiert)

### CSV-Import-Limitationen

- Keine Auto-Match von Comunio/SofaScore-Formaten (user muss Mapping selbst machen)
- Keine Historical-Log für spätere Audits
- Frontend CSV-Parser ist minimal (kein papaparse) — OK für Standard-Exports, evtl. edge-cases

---

## 📚 Knowledge-Gewinn

### 5 neue Common-Errors (`.claude/rules/common-errors.md`)

1. **Next.js Route-Handler: Named-Exports brechen Build** (Slice 069)
   - `export function helper(...)` in `route.ts` → Type-Error `'OmitWithTag<...> does not satisfy'`
   - Fix: Helpers in `src/lib/...` extrahieren
   
2. **ESLint disable-comment mit undefined rule** (Slice 069)
   - `// eslint-disable-next-line @typescript-eslint/no-explicit-any` fails wenn Plugin nicht im eslintrc
   - Fix: typgerechter Cast statt `as any`

3. **Postgres ON CONFLICT CHECK validiert INSERT-Tuple-Defaults BEFORE routing** (Slice 075)
   - `.upsert()` failt auch für existing rows wenn INSERT-Defaults CHECK verletzen
   - Fix: `.update().eq('id', ...)` statt `.upsert()`

4. **Vercel Hobby Cron-Limit + Function-Timeouts** (Slice 071 + 075)
   - Hobby: max 2 Crons, 60s functions, Deploy-Fail bei Multi-Schedule
   - Pro: 40 Crons, 300s functions
   - Batch-Pattern pflicht für >1000-Row-Ops

5. **Transfermarkt Cloudflare-Block für Vercel-IPs** (Slice 075)
   - Vercel-Datacenter-IPs returnen leere HTML
   - curl vom lokalen PC findet matches
   - Workaround: Proxy oder CSV-Import

---

## 🛠️ Anleitung — CSV-Workflow (für Gold-Standard)

### Schritt 1: Export

1. https://bescout.net/bescout-admin
2. Tab **"CSV Import"** (FileSpreadsheet-Icon, nach Data Sync)
3. **"CSV herunterladen"** → Datei `players-2026-04-18.csv` in Downloads

### Schritt 2: Fill in Excel/Sheets

CSV-Spalten:
- `player_id` — **NICHT ANRÜHREN** (UUID)
- `full_name` — readonly (Referenz)
- `club` — readonly (Referenz)
- `position` — readonly (Referenz)
- `market_value_eur` — **FÜLLEN** (Integer in €, z.B. 500000 = 500k€)
- `contract_end` — **FÜLLEN** (YYYY-MM-DD, z.B. 2026-06-30)

**Leere Zellen** = NULL (kein Update).

**Datenquellen-Ideen:**
- Comunio-Liste (Bundesliga/2. Bundesliga)
- Kicker-Manager Excel
- Dein eigenes Abo
- Crowdsourcing (Discord-Channel "Player-Daten")

### Schritt 3: Upload + Apply

1. Zurück zu **"CSV Import"** Tab
2. **"CSV hochladen"** → File wählen
3. **Preview:** erste 5 Zeilen + eventuelle parse errors
4. **"Updates anwenden"** → Confirmation-Dialog → Apply
5. **Result:** zeigt `updated / errored / invalid`

### Schritt 4: Measure

In Supabase-Dashboard SQL:
```sql
SELECT jsonb_pretty(public.get_player_data_completeness());
```

Liga mit alle Werte >= 95% = **Gold Tier erreicht ✅**

---

## 🗂️ Session-Ende Status

- `git status`: 1 uncommitted (memory/session-handoff.md — wird automatisch überschrieben)
- `worklog/active.md`: `status: idle` ✅
- `worklog/log.md`: 8 Slice-Einträge 069–076 ✅
- `.claude/rules/common-errors.md`: 5 neue Patterns ✅
- Pipeline geheilt: alle Deploys seit Session-Ende success ✅

---

**Session-Ende 2026-04-18. Bereit für 2026-04-19.**

Los geht's am Morgen mit:
1. `git log --oneline -10` — letzte Commits anschauen
2. `SELECT jsonb_pretty(public.get_player_data_completeness())` — Gold-Progression messen
3. Wähle: CSV-Workflow, Slice 077 Performance-Refactor, oder Frontend-UI-Slices
