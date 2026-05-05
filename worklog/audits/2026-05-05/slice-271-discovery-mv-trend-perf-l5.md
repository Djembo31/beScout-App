# Slice 271 Discovery — mv_trend_7d Drift + perf_l5=50.00 Default

**Datum:** 2026-05-05
**Format:** Audit-Document (NICHT Slice — Anti-Pattern „Audit-as-Slice")
**Trigger:** Slice 270 sekundäre Befunde aus Phase-1-Discovery.
**Output:** Bug-Hypothesen + Code-Reading-Liste + Empfehlung für separate Slice 271 (Implementation-Slice mit Code-Diff).

---

## Befund 1: mv_trend_7d ist 4556× NULL trotz funktionierender Snapshot-Pipeline

### DB-State (verifiziert 2026-05-05)

| Tabelle / Function | State |
|---|---|
| `players.mv_trend_7d` (TEXT col) | 4556 NULL, 0 nicht-NULL |
| `players_mv_history` | 31.892 rows · 4556 distinct players · 2026-04-25 → 2026-05-05 (11 Tage) |
| Function `cron_snapshot_and_calc_mv_trends` | exists, body reviewed |
| `cron.job` mit `mv_trend` im name/command | **LEER** (kein pg_cron-Job) |

### Function-Body-Analyse

```sql
-- Function-Body (extracted via pg_get_functiondef):
INSERT INTO players_mv_history (player_id, date, mv_eur)
SELECT id, CURRENT_DATE, COALESCE(market_value_eur, 0)
FROM players WHERE market_value_eur IS NOT NULL
ON CONFLICT (player_id, date) DO UPDATE SET mv_eur = EXCLUDED.mv_eur;
-- ✓ Snapshot funktioniert (31k rows in History bestätigt)

WITH trend_calc AS (
  SELECT today.player_id,
    CASE
      WHEN past.mv_eur IS NULL THEN NULL
      WHEN past.mv_eur = 0 AND today.mv_eur > 0 THEN 'rising'
      WHEN past.mv_eur = 0 THEN 'stable'
      WHEN today.mv_eur > past.mv_eur * 1.05 THEN 'rising'
      WHEN today.mv_eur < past.mv_eur * 0.95 THEN 'falling'
      ELSE 'stable'
    END AS new_trend
  FROM players_mv_history today
  LEFT JOIN players_mv_history past
    ON past.player_id = today.player_id
    AND past.date = CURRENT_DATE - INTERVAL '7 days'
  WHERE today.date = CURRENT_DATE
)
UPDATE players p SET mv_trend_7d = tc.new_trend
FROM trend_calc tc
WHERE p.id = tc.player_id
  AND (p.mv_trend_7d IS DISTINCT FROM tc.new_trend);
```

### Bug-Hypothese (3 mögliche Root-Causes) — VERIFIED 2026-05-05 Abend

**H1: Function wird nicht aufgerufen.** — ❌ falsifiziert
- Vercel-Cron `calculate-mv-trends` läuft täglich `45 3 * * *` (vercel.json:Z.50).
- `cron_sync_log` zeigt 5 grüne Runs zwischen 2026-05-01 und 2026-05-05, alle status=success.
- snapshot_count = 4556 jeden Tag (Snapshot-Pfad funktioniert).

**H2: UPDATE-Klausel skippt wegen Date-Mismatch.** — ❌ falsifiziert
- CURRENT_DATE ist UTC und matched today-Snapshot.

**H3: past.mv_eur IS NULL → new_trend = NULL.** — ✅ **ROOT-CAUSE bestätigt**
- Manuelle Trend-Calc-Smoke 2026-05-05: 4556× new_trend = NULL.
- History hat **GAP**: 2026-04-26, 2026-04-27, 2026-04-28, 2026-04-29 fehlen komplett.
  - Existiert: 2026-04-25 (Initial-Backfill aus Slice 197d Migration), 2026-04-30 ff. (täglich seit Vercel-Cron live).
  - Heute = 2026-05-05, 7d-old = 2026-04-28 → GAP → past.mv_eur IS NULL → new_trend = NULL.
  - Gestern 2026-05-04, 7d-old = 2026-04-27 → GAP → trend_updated_count=0.
  - 2026-05-03, 7d-old = 2026-04-26 → GAP, aber trend_updated_count=4556. Weil DB-Werte vorher nicht-NULL, dann auf NULL gesetzt → IS DISTINCT FROM matched.
  - 2026-05-02, 7d-old = 2026-04-25 → EXISTS! → echte Trend-Berechnung. 4556 Updates plausibel.
  - 2026-05-01, 7d-old = 2026-04-24 → GAP → 0 Updates (alle waren schon NULL nach 04-30 Initial-Run).
- **Self-Healing in 2 Tagen**: ab 2026-05-07 ist 7d-old = 2026-04-30 (existiert) → 4556 echte Trends.
- ABER: Aktuell ALLE 4556 Player auf NULL → Frontend könnte UI-Risk haben falls Konsument existiert.

### Self-Healing-Prognose

| Datum | 7d-old Datum | History exists? | Erwarteter trend_updated_count |
|-------|-------------|-----------------|--------------------------------|
| 2026-05-06 | 2026-04-29 | ❌ GAP | 0 (bleibt NULL) |
| 2026-05-07 | 2026-04-30 | ✅ EXISTS | 4556 (erste echte Trends) |
| 2026-05-08+ | 2026-05-01+ | ✅ EXISTS | 4556 (steady state) |

### Optionaler Fix: Robustes Fallback-Lookup

Statt strict `past.date = CURRENT_DATE - INTERVAL '7 days'`:
```sql
-- Nutze nächst-älteres Datum innerhalb [3d, 14d] window
LEFT JOIN LATERAL (
  SELECT mv_eur FROM players_mv_history h
  WHERE h.player_id = today.player_id
    AND h.date BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE - INTERVAL '3 days'
  ORDER BY h.date DESC
  LIMIT 1
) past ON true
```
Vorteil: Robust gegen 1-2 Gap-Tage. Wartet nicht 7+ Tage auf Self-Healing.
Nachteil: Trend ist möglicherweise nicht "exakt 7d" sondern "n-Tage" (n ∈ [3, 14]). Trend-Semantik bleibt valid.

### Frontend-Konsumenten von mv_trend_7d

- `dbToPlayer`-Mapper in `src/lib/services/players.ts` setzt `mvTrend7d: db.mv_trend_7d ?? null`.
- 0 Live-Konsumenten gefunden via grep `mvTrend7d|mv_trend_7d` in `src/components/` (außer Type-Definition + Mapper).
- **Frontend nutzt es nicht.** Kein User-Wirkungs-Bug.

### Empfehlung

**Priorität: niedrig.** Slice 271 als separates Slice mit:
1. SPEC: H1/H2/H3 Test-Pfade durchspielen.
2. Function entweder als pg_cron-Job registrieren ODER Vercel-Cron-Endpoint anlegen.
3. UI-Konsument schaffen (Frontend zeigt mv_trend_7d nicht — Slice 271b? Visual-Polish?).
4. ODER: Decision treffen ob mv_trend_7d gestrichen werden soll (kein Konsument → tote Spalte).

**Aktuell kein Beta-Blocker.**

---

## Befund 2: perf_l5 = 50.00 Default bei 615 Spielern

### DB-State

| Cohort | Count |
|--------|-------|
| Total mit `perf_l5 = 50.00` | 615 |
| davon `matches = 0` | 595 (Junioren — wahrscheinlich Defaults) |
| davon `matches > 0` | **20 (Stale-Default-Verdacht!)** |

### Code-Analyse

`src/lib/services/players.ts:252-254` (`createPlayer` Function):
```ts
perf_l5: 0,
perf_l15: 0,
perf_season: 0,
```

**Inkonsistenz:** Code schreibt `0`, DB hat `50.00` für 615 Spieler. → Anderer Sync-Pfad muss existieren.

### Bug-Hypothese — VERIFIED 2026-05-05 Abend

**H4: DB-Default `perf_l5 NUMERIC NOT NULL DEFAULT 50.00`.** — ✅ **ROOT-CAUSE bestätigt**
- `supabase/migrations/20260331_baseline_core.sql:96` definiert `perf_l5 NUMERIC NOT NULL DEFAULT 50.00`.
- Spielanleitung: 50.00 ist **intentional** als Salary-Cap-Proxy (Lineup-RPCs nutzen `COALESCE(p.perf_l5, 50)` für Salary-Calculation: 195c L264, 195d L425+894, 197c L210, 422-L302, SO5 L251).
- 595 Junioren mit matches=0 → DB-Default griff bei Insert, Cron `recalculate_perf` skippt sie (kein avg5 verfügbar).
- 20 Player mit matches>0 + perf_l5=50 → Edge-Case: `recalculate_perf` Cron-Lag oder Score-Drift.
- **Code-Inkonsistenz:** `players.ts:252` `perf_l5: 0` wird im neuen-Player-Pfad gesetzt, aber Insert-Spread mit DB-Default überschreibt das.

### Wirkung-Klassifikation

| Layer | 50.00-Wirkung |
|-------|--------------|
| **Lineup-Salary-Cap (DB-RPC)** | INTENTIONAL — Salary-Approximation für Spieler ohne perf-Historie |
| **Frontend-Display (PlayerIPOCard, FormBars-Sub)** | BUG — User denkt „mittelmäßig" obwohl 0 Spiele |
| **Filter-Sortierung (Marktplatz)** | BUG — Junioren landen mittig statt unten/N/A |

### Wirkung im Frontend

`dbToPlayer`-Mapper:
```ts
perf: {
  l5: Number(db.perf_l5),
  l15: Number(db.perf_l15),
  trend: Number(db.perf_l5) > Number(db.perf_l15) ? 'UP' : 'DOWN' or 'FLAT',
}
```

`PlayerIPOCard.tsx:108`: zeigt `Math.round(player.perf.l5)` als L5-Score-Circle.

**User-Wirkung:**
- 595 Junioren mit 0 Spielen zeigen „L5: 50" → User denkt „mittelmäßiger Spieler" obwohl Datenpunkt = 0.
- 20 Spieler mit matches > 0 zeigen 50 als „neutralen Score" der nicht stimmt.

### Empfehlung

**Priorität: mittel.** Slice 271b (oder Sub-Track in 271):
1. Code-Reading-Liste: Wer schreibt 50.00? (`grep` durch migrations + scripts).
2. Decision: Soll perf_l5=50 für 0-played-Player explizit „N/A" sein (Frontend zeigt `—` statt Zahl)?
3. ODER: Default zu 0 ändern + Frontend `if (perf.l5 === 0 && matches === 0) show '—'`?

**Aktuell kein Beta-Blocker, aber visueller Trust-Bug.**

---

## Empfehlung für Slice 271

**Schedule:**
- Slice 271 nach Live-Verify Slice 270 + Anil-Skim dieser Audit-Notes.
- Beta-Tester-Launch ist nicht blockiert von 271 — Slice 270 hat den eigentlichen Anil-Live-Bug gefixt.

**Skope (vorläufig):**
- Track A: mv_trend_7d → Function-Trigger registrieren ODER Spalte streichen (Decision-Pflicht).
- Track B: perf_l5=50 Default → Frontend-Display oder DB-Default-Refactor.
- Track C (optional): `mv_source = 'transfermarkt_stale'`-Status für 0-played-Junioren — sollten sie aus Marktplatz-Filter raus?

---

**Status:** AUDIT-FERTIG · Befunde 1+2 verifiziert 2026-05-05 Abend · Anil-Decision-Pflicht für Track A/B/C-Scope · Implementation-Slice 271 wartet.

---

## CTO-Empfehlung 2026-05-05 Abend

**Track A (mv_trend_7d):**
- **Option A1 (PASSIV — empfohlen für Beta):** Self-Healing abwarten. Ab 2026-05-07 sind echte Trends da. Kein Code-Change nötig.
- **Option A2 (AKTIV):** Migration mit LATERAL-Fallback-Lookup deployen — robust gegen Gap-Tage. ~20 LOC Migration. Kein User-Impact (kein Frontend-Konsument).
- **Option A3 (CLEANUP):** Spalte streichen wenn Frontend-Integration nicht geplant. Slice 197d war pre-emptive Build, kein Konsument.

**Track B (perf_l5=50):**
- **Option B1 (FRONTEND-FIX — empfohlen):** PlayerIPOCard + FormBars zeigen `—` bei `matches === 0 && perf_l5 === 50`. ~10 LOC. Lineup-Salary-Logic bleibt unangetastet.
- **Option B2 (DB-DEFAULT-CHANGE):** Default auf NULL + Constraint relaxen + alle 6 Lineup-RPCs anpassen. Hoher Refactor-Aufwand, Money-Path-Risk.

**Empfehlung Anil-Decision:** A1 + B1 → minimaler Aufwand, Beta-Launch nicht blockiert. Slice 271 als reine Frontend-Polish (`matches === 0` → `—`).
