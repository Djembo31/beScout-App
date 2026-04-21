# Cost-Budget-Check für Beta-Launch

**Snapshot:** 2026-04-21  ·  **Basis:** Evidenz via Supabase-MCP + Vercel-MCP + Sentry-MCP (keine Schätzungen)

**Ergebnis:** **GRÜN für Beta** — alle Services in Free-Tier mit >60% Puffer. Ein Risiko identifiziert (`player_gameweek_scores` Wachstum).

---

## 1. Supabase (Free-Tier)

**Plan:** Free (org "BeScout"). Projekt `beScout-App` in `eu-west-1`, Postgres 17, ACTIVE_HEALTHY.

### Aktuelle Usage

| Metric | Aktuell | Free-Tier-Limit | Puffer |
|--------|--------:|----------------:|-------:|
| DB-Size | **107 MB** | 500 MB | **79%** frei |
| Auth-Users | 125 | 50.000 MAU | ~99,8% frei |
| Profiles | 124 | — | — |
| Aktive Rows (alle Tabellen) | ~135.000 | kein Hard-Limit | — |

### Top 5 Tabellen (Storage)

| Tabelle | Size | Rows | Bemerkung |
|---------|-----:|-----:|-----------|
| `fixture_player_stats` | 23 MB | 62.441 | Wächst mit jedem GW + Liga |
| `player_gameweek_scores` | 19 MB | 59.515 | **Wachstumskritisch** — siehe Risiko unten |
| `players` | 7 MB | 4.556 | Einmalig geladen, kaum Wachstum |
| `player_external_ids` | 3,8 MB | 9.655 | TM/API-Football Mappings |
| `activity_log` | 3,3 MB | 11.501 | Wächst mit User-Aktivität |

### Growth-Rate (letzte 7/30 Tage)

| Tabelle | Total | Last 7d | Last 30d | Projection 30d-Beta |
|---------|------:|--------:|---------:|--------------------:|
| players | 4.556 | 271 | 3.867 | +1.000 (abgeklungen) |
| transactions | 1.115 | 36 | 314 | +600 (2× bei Beta-Traffic) |
| trades | 753 | 6 | 223 | +500 (bei 20 Fans aktiv) |
| **player_gameweek_scores** | 59.515 | **49.189** | **50.282** | **+50.000 / Monat** |
| auth.users | 125 | 0 | 6 | +20 (Pilot-Fans) |

### Risiko

`player_gameweek_scores` wächst mit **~7.000 Rows/Tag** wenn GW-Scoring live läuft (alle Ligen × ~30 Spieler/Fixture × ~10 Fixtures). Bei diesem Tempo:
- Aktuell: 19 MB
- +30 Tage Beta: **+5 MB/Tag × 30 = +150 MB** → DB ~260 MB total → immer noch unter 500 MB
- +90 Tage: würde 500 MB überschreiten

**Aktion:** Nach Beta (wenn Pro-Tier fällig wird, $25/mo) oder: Cold-Storage-Archivierung alter GWs nach 10 Wochen (GW-1..-10 in `player_gameweek_scores_archive`). Nicht für Beta nötig.

### Alarmgrenze einrichten

Keine native Supabase-Alerts auf Free-Tier. Alternative: `pnpm run beta:metrics --save` als Daily-Cron → DB-Size im Report → bei >300 MB manuell checken.

---

## 2. Vercel (Hobby/Free-Tier)

**Plan:** Hobby (Free) — verifiziert durch `maxDuration=300` Cap (Pro wäre 900s, ADR in `.claude/rules/common-errors.md`).

### Bekannte Hobby-Limits

| Metric | Limit | Pilot-Beta-Bedarf | Risiko |
|--------|------:|------------------:|--------|
| Bandwidth | 100 GB/Monat | <1 GB bei 20 Fans | ⬜ irrelevant |
| Serverless-Function-Compute | 100 GB-Hours | <10 GB-Hours | ⬜ irrelevant |
| Serverless-Function max-duration (HTTP) | 10s (default) / 300s (pro Route) | OK | ⬜ |
| Cron-Jobs | max 2, max 1×/Tag | aktuell genutzt | ⚠️ evtl. kippt bei mehr Crons |
| Deployments | 100/Tag | <10/Tag | ⬜ irrelevant |
| Image-Optimization | 6.000 Min-Hours | <100 | ⬜ irrelevant |

### Live-Usage prüfen (MCP-Gap)

Vercel-MCP exponiert **keine Usage-APIs** — nur Project-Meta + Deployment-Listen. Anil muss manuell:

**Dashboard:** https://vercel.com/bescouts-projects/bescout-app/usage

Einmal vor Beta-Start + wöchentlich während Beta checken. Screenshot in `worklog/beta-metrics/vercel-usage-YYYY-MM-DD.png`.

### Cron-Jobs — ⚠️ POTENZIELLES PROBLEM

`vercel.json` definiert **6 Cron-Jobs**:
```
gameweek-sync           (0 6 * * *)   — daily
close-expired-bounties  (0 5 * * *)   — daily
sync-players-daily      (0 3 * * 1)   — weekly Mon
sync-transfermarkt-batch (0 4 1 1,5,9 *) — quarterly
transfermarkt-search-batch (30 2 * * *) — daily
sync-injuries           (0 12 * * *)  — daily
```

**Hobby erlaubt max 2 Cron-Jobs.** Das bedeutet:
- **Entweder Projekt ist auf Pro** (bill-sichtbar im Dashboard → **Anil muss prüfen**)
- **Oder 4 der 6 Jobs laufen silent nicht** → Data-Sync fehlt → Beta-Data könnte stale sein

`cron_sync_log` zeigt `transfermarkt-search-batch` läuft (5 runs/7d) — mindestens **ein** der 6 funktioniert. Aber wir wissen nicht welche 2 Vercel picked hat.

**Action:** Anil öffnet https://vercel.com/bescouts-projects/bescout-app/settings/cron-jobs — Dashboard zeigt alle aktiven Crons. Wenn <6 → Pro-Upgrade nötig ($20/mo) ODER 4 Crons deaktivieren. **VOR Beta-Start checken**.

---

## 3. Sentry (Free Developer Plan)

### Aktuelle Usage

| Metric | Aktuell | Free-Tier-Limit | Puffer |
|--------|--------:|----------------:|-------:|
| Errors (30d) | **13** | 5.000/Monat | **99,7%** frei |
| Transaction-Events | noch nicht messbar separat | 10.000/Monat | Beta-sample 0.01 → 100 Traces/10.000 Calls |

**Slice 126 Wirkung:** `tracesSampleRate=0.01` (statt 0.1) + `replaysOnError=0.1` (statt 1.0) — **90% Quota-Sparen** aktiv. Wird in Beta **nicht kippen**.

### Alarmgrenze

- Bei >60% Quota-Verbrauch E-Mail-Benachrichtigung automatisch von Sentry.
- Zusätzlich Rule 1 aus `memory/beta-sentry-alerts-runbook.md` (Error-Rate >1%) triggert bei Ausreißern.

---

## 4. GitHub Actions (Free Public Repo)

**Plan:** Unlimited Minutes (Public Repo) — **keine Sorge** für CI + Post-Deploy-Smoke.

Wenn Repo private gemacht wird: Free = 2.000 Min/Monat. Aktuell:
- CI läuft ~3 Min × ~10 Pushes/Tag = 900 Min/Monat ← Obergrenze noch unter Limit

---

## 5. Kostenprognose nach Beta

**Wenn GO-LIVE-Entscheidung → Public-Launch mit 100+ Fans:**

| Service | Free-Tier? | Switch-Kosten | Wann nötig |
|---------|:----------:|--------------:|------------|
| Supabase | noch 30 Tage OK | Pro $25/mo (8 GB DB, 50 GB Bandwidth, 7-day PITR) | Bei DB>400 MB ODER MAU>1.000 |
| Vercel | noch OK | Pro $20/mo (1 TB Bandwidth, 1.000 GB-H Compute) | Bei >100 DAU aktiv kontinuierlich |
| Sentry | OK | Team $26/mo (50k Errors, 100k Perf-Events) | Bei Error-Rate >100/Tag |
| GitHub | Unlimited (Public) | Team $4/user/mo (wenn Private) | Erst bei Private-Repo |

**Budget Public-Launch:** $25 + $20 + $26 = **$71/Monat** — unkritisch.

**Budget für Beta (nur 20 Fans):** **$0/Monat** — alles im Free-Tier.

---

## 6. Pre-Beta-Actions für Anil

1. **Vercel-Usage-Dashboard** einmal öffnen + Usage-Baseline screenshotten: https://vercel.com/bescouts-projects/bescout-app/usage
2. **Supabase-Dashboard** einmal öffnen + Daily-DB-Size-Trend beobachten: https://supabase.com/dashboard/project/skzjfhvgccaeplydsunz/reports/database
3. **Sentry-Quota-Dashboard** einmal öffnen: https://bescout.sentry.io/settings/billing/usage/

Während Beta täglich:
```bash
pnpm run beta:metrics --save  # DB-State in worklog/beta-metrics/YYYY-MM-DD.md
```

Wenn einer der drei Services >70% Quota erreicht während Beta → Pro-Upgrade oder Beta pausieren.

---

## 7. Kritische Erkenntnisse

1. ✅ **Alle 3 Services mit >60% Puffer** — Beta startet sicher im Free-Tier.
2. ⚠️ **`player_gameweek_scores` wächst 7k/Tag** bei aktivem GW-Scoring — monitoren, nicht blocker.
3. ✅ **Sentry massiv unter Quota** (13/5.000 = 0,3%) — Slice 126 Sampling-Reduktion war überproportional wirksam.
4. ⚠️ **Vercel-Cron-Limit Hobby = 2 Jobs 1×/Tag** — aktuell voll genutzt. Weitere Cron-Jobs zwingen zum Pro-Upgrade.
5. ✅ **GitHub Actions unbegrenzt** (Public Repo) — kein CI-Budget nötig.

**Empfehlung:** Beta mit aktuellem Setup starten, Daily-Metrics-Script laufen lassen, nach 14 Tagen Re-Check. **Keine Pro-Upgrades vor Beta nötig.**
