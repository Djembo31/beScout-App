# Slice 275 — fix(sync-injuries): Date-Filter + Daten-Heilung (Anil-Live-Bug)

**Slice-Type:** Cron-Code-Fix + DB-Heal
**Größe:** M (1 Cron-Route + 1 DB-Bulk-Update)
**Datum:** 2026-05-06
**Anil-Approval:** „j" (2026-05-06, Daten-Heilung + Code-Fix in einem Pass)

---

## 1. Problem-Statement

**Anil-Quote 2026-05-06:** „check die club page die spieler, die zeigen alle verletzt an bei Galatasaray, warum?"

**Root-Cause:** Cron `sync-injuries` (Slice 070) ruft `/injuries?league=X&season=Y` ohne Date-Filter. API-Football returnt **alle Saison-Injuries** (13.398 für 7 Ligen), nicht nur aktive. Code mappt jede Response-Row auf `players.status='injured'`. Recovery-Logic kann das nicht mehr fixen, weil JEDE historische Episode in der API als „Missing Fixture" persistiert.

**DB-Smoking-Gun:** 1862 Spieler hatten identischen `status_updated_at = 2026-05-05 12:00:15` (= einzelner Cron-Run hat 41% aller Spieler in 1 Sekunde verletzt gesetzt).

**Per-Club-Verteilung (pre-Heal):**
| Club | total | fit | not-fit | % verletzt |
|---|---|---|---|---|
| Bayern | 43 | 13 | 30 | 70% |
| Real Madrid | 42 | 17 | 25 | 60% |
| Manchester City | 30 | 11 | 19 | 63% |
| Juventus | 38 | 9 | 29 | 76% |
| Beşiktaş | 23 | 3 | 20 | 87% |
| Galatasaray | 40 | 8 | 32 | 80% |

Realistisch wären 5-15% (3-5 Spieler pro Club).

## 2. Lösungs-Design

### Phase 1 — Sofort-Daten-Heilung (live 2026-05-06 13:25)

```sql
UPDATE players
SET status = 'fit', injury_reason = NULL, injury_until = NULL, status_updated_at = NOW()
WHERE status IN ('injured', 'doubtful')
  AND status_updated_at >= '2026-05-05 12:00:00+00'
  AND status_updated_at <= '2026-05-05 12:01:00+00';
-- → 1862 healed
```

Verify post-Heal: Bayern 39/4, Galatasaray 36/4, Real Madrid 40/2 ✓

### Phase 2 — Cron-Code-Fix (sync-injuries Date-Filter)

API-Discovery (Live-Test 2026-05-06):
- `/injuries?league=78&season=2025` → 2647 results (ALL Saison) ❌
- `/injuries?league=78&season=2025&date=2026-05-03` → 48 results (1 Match-Day) ✓
- `/injuries?fixture=1388593` → 16 results (1 Fixture) ✓

Gewählte Strategy: **`?date=` pro Liga × pro Distinct-Fixture-Date in [now-14d, now+14d]**

Pro Liga: SELECT distinct `played_at::date` aus fixtures in 28d-Window.
Pro Date+Liga: 1 API-Call mit `?league=X&season=Y&date=YYYY-MM-DD`.
Recovery: Spieler die in KEINER der Date-Calls vorkommen → status='fit'.

**API-Quota:** 7 Ligen × ~3-4 Match-Dates in Window = 21-28 calls/day = **0.4% von Pro-Tier 7500/day**.

## 3. Betroffene Files

- `src/app/api/cron/sync-injuries/route.ts` — Phase 0 (Fixture-Date-Lookup) + Phase 1 (Date-iteration)
- DB-State: 1862 rows healed via `UPDATE players SET status='fit' WHERE ...`
- KEIN Migration-File (pure Code-Fix + Bulk-DB-Heal)

## 4. Acceptance Criteria

- **AC1** Sofort-Heal: 0 Spieler mit `status='injured' AND status_updated_at = '2026-05-05 12:00:15'` ✓
- **AC2** Cron-Code-Fix: API-Calls nutzen `?date=` Param pro Liga × pro Fixture-Date in 28d-Window
- **AC3** Recovery-Logic unverändert: Players nicht in API-Response → fit
- **AC4** Nächster Cron-Run (12:00 UTC oder manueller Trigger): players_updated < 200 (statt 1861)
- **AC5** tsc clean
- **AC6** Top-Club-Verteilung post-Run: ≤ 15% not-fit pro Club

## 5. Edge Cases

| # | Szenario | Verhalten |
|---|---------|-----------|
| E-01 | Liga in Saisonpause (keine fixtures in Window) | leagues_processed++, recovery setzt alle vorher injured auf fit |
| E-02 | API-Call für eine Date failed | leagueOk=false → leagues_processed nicht inkrementiert → Recovery für DIESE Liga skipped (kein false-positive fit) |
| E-03 | Spieler langzeitverletzt (6 Monate Kreuzband) | erscheint in jeder fixture-date-Response als „Missing Fixture" → bleibt injured ✓ |
| E-04 | Spieler 2 Tage NACH last finished verletzt (Training-Verletzung) | bei nächstem Cron-Run ist Date-Window expanded → Spieler erscheint ✓ |
| E-05 | API-Football outage | Recovery skipped per leagueOk=false → DB-State bleibt eingefroren ✓ |
| E-06 | TR Süper Lig Saisonende (alle fixtures < 14d in past) | `played_at >= now-14d` deckt das ab |

## 6. Self-Verification (post-Deploy)

```bash
# 1. Manuell Cron triggern (Admin-UI oder Bearer-Call)
curl -H "Authorization: Bearer $CRON_SECRET" https://bescout.net/api/cron/sync-injuries

# 2. SQL-Verify nach Trigger
SELECT COUNT(*) FILTER (WHERE status='injured') AS injured_count,
       COUNT(*) AS total
FROM players WHERE club_id IS NOT NULL;
-- expect: < 200 injured (statt vorher 1861)

# 3. Per-Club-Verteilung
SELECT c.name, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE p.status NOT IN ('fit') AND p.status IS NOT NULL) AS not_fit
FROM players p JOIN clubs c ON c.id = p.club_id
WHERE c.name IN ('Galatasaray', 'Bayern München', 'Real Madrid')
GROUP BY c.name;
-- expect: not_fit ≤ 5 pro Club

# 4. Cron-Sync-Log
SELECT * FROM cron_sync_log WHERE step='sync-injuries' ORDER BY created_at DESC LIMIT 1;
```

## 7. Pattern-Promotion (errors-infra.md)

**Bug-Klasse: External-API liefert historische Daten als aktuelle**

API-Football `/injuries?season=Y` returnt ALLE Saison-Injuries (jede Episode pro Fixture). Wenn Cron diese als „aktuell" interpretiert → Daten-Korruption.

Pattern: Bei externen API-Endpoints, die scheinbar „aktuelle" Daten zurückgeben, IMMER prüfen ob historische Records mitkommen. Date/Time-Filter-Param suchen + nutzen. Wenn nicht verfügbar: Response-Records mit Date-Field clientseitig filtern.

Audit: `grep -rn "season=" src/app/api/cron/ | grep -v "date=\|fixture=\|live=\|round="` — Cron-Endpoints die Saison-Daten ohne Date-Filter holen sind verdächtig.

## 8. Stage-Chain

SPEC (this file) → BUILD (Sofort-Heal SQL + Code-Fix) → REVIEW (self-review S, Live-API-Test als Verify) → PROVE (DB-Smoke pre/post-Heal + manueller Cron-Trigger post-Deploy) → LOG
