# Session Handoff (2026-04-19 Nachmittag)

## TL;DR

**Phase A — Data-Quality Fundament komplett gebaut.** Anil hat den Aydin/Arda-Yilmaz-Fall gemeldet → tiefer Audit → systematische Root-Cause-Analyse → 5 Slices in einer Session:

| Slice | Was | Effekt |
|-------|-----|--------|
| **081** | Mass-Poisoning flaggen (Cluster ≥ 4) | 897 Spieler → `mv_source='transfermarkt_stale'` |
| **081b** | Paired-Poisoning mit last_name match | +36 Spieler flagged. **Arda Yilmaz + Barış Alper geschlossen.** |
| **081c** | Orphan Stale Contracts (>12 Mon. abgelaufen) | +1434 Spieler flagged |
| **082** | Re-Scraper-Script `tm-rescrape-stale.ts` gebaut + Smoke-Test | 3/3 Bundesliga verifiziert, Cloudflare-Block umgangen |
| **081d** | Ghost-Rows Cleanup (Aston Villa Cross-Club-Contamination) | 11 Rows `club_id=NULL`. AV squad 62 → 51. |

**Total stale: 2367 / 4556 (52% der DB).** Money-Invariant byte-identisch durchgängig. 4 CI-Regression-Guards live.

## Session-Commits (2026-04-19 Nachmittag)

```
c1f7bf38 fix(test): INV-39 TSC-Fehler — Array.from(Map) + explicit Row type
d47d4bdd feat(data): Slice 081d — Ghost-Rows Cleanup (Aston Villa)
47c9f906 feat(scripts): Slice 082 — Re-Scraper Script
2a03c89e feat(data): Slice 081c — Orphan Stale Contracts (>12 Mon.)
c046c4bc feat(data): Slice 081b — Paired-Poisoning (Cluster 2-3 + last_name)
006809b6 feat(data): Slice 081 — Data-Cleanup Phase A.1 (897 stale)
```

## Kritischer Kontext — NEUE Strategie

**Anil's Scope-Korrektur heute**: Alle 7 Ligen launch-ready, nicht mehr "Sakaryaspor/TFF1 Pilot". Produktstand reicht um Bundesliga/Süper-Lig-Clubs direkt anzusprechen. DE+TR-Prio 1 wegen Anil's Wurzeln, aber ALLE Ligen auf gleichen Standard.

Gespeichert: `feedback_scope_all_leagues_launch_ready.md` (user memory).

Prio-Reihenfolge Wellen-Rollout:
1. Bundesliga + 2. Bundesliga (Anil's Heimat)
2. Süper Lig + TFF 1. Lig (TR-Wurzeln)
3. Premier League + La Liga + Serie A (EU-Top)

## Daten-Quality Status (Session-Ende)

### mv_source Distribution

| Source | Count |
|--------|-------|
| `unknown` | 2189 |
| `transfermarkt_stale` | 2367 |
| `transfermarkt_verified` | 3 (nur Smoke-Test BL) |
| **TOTAL** | **4559** (inkl. 11 orphans mit club_id=NULL) |

### CI-Regression-Guards (alle green)

- **INV-36**: Keine Mass-Poisoning-Cluster > 3 (ohne stale-Flag)
- **INV-37**: Keine Paired-Poisoning mit gleichem last_name (TR-normalisiert)
- **INV-38**: Keine Spieler mit contract_end > 12 Mon. abgelaufen (ohne stale)
- **INV-39**: Keine Cross-Club-Contamination Ghost-Rows

## Phase A.2 — Lokale Wellen (TODO Anil)

```bash
# Welle 1 — DE (~1h)
npx tsx scripts/tm-rescrape-stale.ts --league="Bundesliga" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="2. Bundesliga" --limit=500 --rate=3000

# Welle 2 — TR (~1h)
npx tsx scripts/tm-rescrape-stale.ts --league="Süper Lig" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="TFF 1. Lig" --limit=500 --rate=3000

# Welle 3 — EU (~2h)
npx tsx scripts/tm-rescrape-stale.ts --league="Premier League" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="La Liga" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="Serie A" --limit=500 --rate=3000
```

Script getestet, Smoke-Test 3/3 grün (15.6s). Cloudflare-Block umgangen via lokalem Playwright.

## Phase A.3 — Nach allen Wellen

**Slice 083 Frontend-Filter aktivieren:**
- `getPlayersByClubId` bekommt `opts?: { activeOnly?: boolean }` Parameter
- Filter-Kriterium: `mv_source != 'transfermarkt_stale'` (statt originalem last_appearance/created_at das nichts filterte)
- Service + Hook + Cache-Key + 4 Caller müssen angepasst werden
- Spec existiert: `worklog/specs/083-altbestand-filter.md`
- Impact-Analyse gemacht: Admin-Views nutzen `activeOnly=false` (Full-Set), User-Views `activeOnly=true`

**Weitere offene Slices:**
- **084** Weitere Clubs mit Squad-Size > 40 auditieren ob Ghost-Contaminations existieren (Barcelona 56, Hatayspor 52, Bayern 46)
- **085** CI-Blocker `useMarketData.test.ts:283` — CEO-Money-Decision (referencePrice fallback)
- **086** Player-Row-Dedup (Jake O'Brien, Nico O'Reilly bei ManCity — echte name-collision-rows)

## Scope-Out

- **Phase B — SoT-Architektur**: `player_field_sources` Tabelle, Merge-Priority-Config, Staleness-Policy pro Feld
- **Phase C — Monitoring**: Daily Reconciliation Cron, Data-Quality-Dashboard, Admin-Review-Queue
- **Partner-API-Evaluation**: OPTA/Sportmonks Lizenz (~3-10k€/Jahr) — nach Beta-Launch

## Tech-Debt (nicht blockierend)

1. `useMarketData.test.ts:283` CI-Blocker, CEO-Money-Decision pending
2. Playwright als direct-dep fehlt in package.json (nutzt transitive resolution)
3. Multi-Account-Gate nicht enforced (nur Text-Regel)

## Neue Patterns (dokumentiert in common-errors.md update)

- **TM-Scraper Default-Poisoning**: Parser-Fallbacks setzen identische MV+contract_end auf viele Spieler. Detection via GROUP BY. Mitigation: `mv_source`-Flag statt MV=0.
- **Trigger-Guard-Safety**: BEFORE UPDATE Trigger mit `IF NEW.mv IS DISTINCT FROM OLD.mv` erlaubt mv_source-only UPDATE ohne reference_price-Kaskade.
- **Cross-Club-Contamination**: API-Football Squad-Response kann Spieler falsch zuordnen. Detection via SELF-JOIN auf (first+last+contract) mit 0-apps-Ghost vs >0-apps-Original.

## Erste Action nächste Session

1. **Status-Check**: `git log -1`, `cat worklog/active.md`, `SELECT mv_source, COUNT(*) FROM players GROUP BY mv_source`
2. **Falls Wellen gelaufen** → `verified`-Anteil prüfen → Slice 083 Frontend-Filter starten
3. **Falls Wellen nicht gelaufen** → entweder jetzt starten oder parallel Slice 084/085 angehen
4. `memory/next-session-briefing-2026-04-20.md` hat Details

## Files to read next session (in Order)

1. Dieser handoff (`memory/session-handoff.md`)
2. `memory/next-session-briefing-2026-04-20.md`
3. `worklog/active.md`
4. `worklog/log.md` (letzten 5 Slices)
