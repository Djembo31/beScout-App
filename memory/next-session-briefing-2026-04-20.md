# Next-Session Briefing (2026-04-20)

> Erstellt Ende Session 2026-04-19.
> **Heute: 2 Slices (077 + 077b), ~2873 neue TM-Mappings, 359 Contracts.**

---

## TL;DR — wo wir stehen

**api_mapping_pct** ist auf allen 7 Ligen >=98.9% gepusht (via Local-Playwright-Scraper).
**contract_pct** teilweise massiv verbessert (Serie A +16.6pp, La Liga +12.6pp).
**market_value_pct** stagniert — MVs sind schon in der DB, die ~900 fehlenden
Players haben entweder `tm-mv=0` oder sind komplett unmapped und nur via CSV lösbar.

---

## Gold-Tier Lücken (Stand 2026-04-19 Ende)

| Liga | api_map | contract | MV | MV-Lücke | CSV für Gold |
|---|---|---|---|---|---|
| **2. Bundesliga** | 99.8 | 94.8 | 91.3 | 47 | **20** ⭐ |
| **Bundesliga** | 99.3 | 92.9 | 89.9 | 60 | **31** |
| Süper Lig | 99.7 | 86.0 | 77.9 | 139 | 108 |
| Premier League | 98.9 | 85.6 | 77.9 | 144 | 112 |
| La Liga | 99.4 | 84.9 | 72.0 | 197 | 162 |
| Serie A | 99.8 | 85.6 | 69.0 | 206 | 173 |
| TFF 1. Lig | 99.7 | 77.6 | 70.2 | 223 | 186 |

## Quickest Gold-Win

**2. Bundesliga + Bundesliga:** 51 Spieler CSV → 2 Ligen Gold.

**Workflow (aus Slice 076):**
1. Admin → **CSV Import** → Export CSV
2. Excel/Sheets öffnen, filtern nach `club` = BuLi / 2. BuLi
3. MVs aus Kicker-Manager oder Comunio (hast Abo) eintragen
4. Contract-Dates dazu (Transfermarkt ist CF-blocked für Vercel — die sind im heutigen Run auch nicht gefunden worden, weil notFound)
5. CSV hochladen → Preview → Apply
6. Measure: `SELECT jsonb_pretty(public.get_player_data_completeness())`

---

## Neue Tools ab heute

`scripts/tm-search-local.ts` + `scripts/tm-profile-local.ts` — Playwright-basiert, umgeht
CF. Usage:

```bash
npx tsx scripts/tm-search-local.ts --league="TFF 1. Lig" --limit=300 --rate=2500
npx tsx scripts/tm-profile-local.ts --league="Süper Lig" --limit=1000 --rate=2500
```

Args: `--threshold=50` (score-cap), `--headless=false`, `--force=true`, `--rate=MS`.

---

## Offene Entscheidungen

### A — CSV-Workflow 2. BuLi + BuLi (51 Players)
**Aufwand:** 1-2h manuell (MVs aus Kicker eintragen)
**Gewinn:** 2 Ligen Gold-Tier erreicht

### B — Retry notFound-Cases mit lower threshold
**Status:** ~1055 Players haben heute "no match >=50" gesehen (alle 7 Ligen zusammen).
Viele: abgekürzte Firstnames ("Y. Bozdemir"), Diacritic-Drifts, Club-short fehlt.

**Aufwand:** ~1h Script-Tuning (score für abbreviated firstname) + 1h Full-Retry
**Gewinn:** evtl +100-200 Mappings, aber MV-Problem bleibt weil die fehlenden
haben meist auch auf TM MV=0.

### C — Cron-Bugfix
Query-Order-Bug in `src/app/api/cron/transfermarkt-search-batch/route.ts`:
```diff
- `${player.last_name} ${player.first_name}`
+ `${player.first_name} ${player.last_name}`
```
Auf Vercel ohnehin CF-blocked, aber bei Proxy-Setup später wichtig. 5min-Slice.

### D — Frontend-UI Club-Page mit League-Standings
Slice 074 hat `league_standings` table gefüllt (134 Rows). Kein UI drauf bislang.
Slice 078-Aufwand: ~2h.

---

## Priorisierte To-Do

### Kritisch (diese Woche)
- [ ] Entscheiden: CSV-Workflow 2. BuLi + BuLi (A) — konkreter Gold-Win
- [ ] Entscheiden: Retry notFound Optimization (B) — breiter aber weniger fokussiert

### Wichtig (diese Woche)
- [ ] Slice 078 — Frontend League-Standings UI (Club-Page Section)
- [ ] Slice 079 — Frontend Player-Transfers UI (Player-Detail Section)

### Nice-to-Have
- [ ] Slice 077c — Cron-Query-Bugfix (1-zeilig)
- [ ] Slice 080 — Home-Widget "Top 3 Clubs aus Tabelle"
- [ ] Slice 081 — Notification bei Injury-Change (Slice 070 follow-up)

---

## Technische Bemerkungen

### Der MV-Wert 70-78% ist künstlich niedrig
Aufgrund `market_value_eur = 0` für ~81-206 Players je Liga. TM zeigt `0` für
Youngsters, Amateure, Ex-Retired. Script kann nicht unterscheiden — `parseMarketValue`
returnt null für `> 0 == false`. Könnte via `parse als -1 = "TM gibt mv=0 zurück"`
distinct werden + in Completeness-RPC anders gezählt (MVs=0 dürften Gold-counten
wenn TM sie so gelistet).

Aber: das wäre Reframing, nicht echter Wert. Für Fantasy-Game ist MV=NULL nicht OK.

### Playwright lokal ist PC-abhängig
Scripts laufen auf Anils Windows-Machine, brauchen `npm install`, env.local, Playwright
chromium (bereits installiert). Macht aber kein Problem — wir brauchen die Scripts
nur für gelegentliche Refresh-Runs (z.B. wöchentlich oder post-Transfer-Fenster).

### Vercel-Cron bleibt manuell-only
Transfer-Sync, Fixtures-Future-Sync, Standings-Sync auf Vercel Hobby nur manuell
triggerbar. Bei Pro-Upgrade ($20/mo) werden sie automatisch.

---

## Session-Ende Status
- `git status`: 1 uncommitted (memory/session-handoff.md — Hook überschreibt)
- `worklog/active.md`: Slice 077 + 077b DONE markiert
- `worklog/log.md`: 2 neue Einträge
- Branch: main
- 2 Commits ahead of last night (Session-Start)

---

**Session-Ende 2026-04-19.**

Los am Morgen mit:
1. `git log --oneline -5` — commits ansehen
2. `SELECT jsonb_pretty(public.get_player_data_completeness())` — Gold-Stand messen
3. Wähle: CSV-Workflow (A) oder notFound-Retry (B) oder Frontend-UI (D) oder Cron-Bugfix (C)
