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

### Bug-Hypothese (3 mögliche Root-Causes)

**H1: Function wird nicht aufgerufen.**
- Kein pg_cron-Job registriert.
- History-Tabelle wird gefüllt → vermutlich via Vercel-Cron-Endpoint oder externes Script (`scripts/sync-*.ts`?).
- Function-Logic für UPDATE läuft nie → mv_trend bleibt NULL.
- **Test-Pfad:** Manuell `SELECT public.cron_snapshot_and_calc_mv_trends()` ausführen und mv_trend_7d-Coverage prüfen.

**H2: UPDATE-Klausel skippt wegen Date-Mismatch.**
- WHERE today.date = CURRENT_DATE.
- Wenn die Function ÜBERHAUPT von einer anderen Quelle gerufen wurde, könnte CURRENT_DATE drift sein (z.B. UTC vs. local).
- Plus: `INTERVAL '7 days'` braucht **exakt** 7 Tage History. History startet 2026-04-25 → ab 2026-05-02 hätten Trends berechnet werden können.
- **Test-Pfad:** Manuelles SELECT der CTE `trend_calc` für CURRENT_DATE → wie viele Player haben non-NULL `new_trend`?

**H3: market_value_eur ist NULL für viele Player → past.mv_eur IS NULL → new_trend = NULL → UPDATE setzt NULL = NULL → IS DISTINCT FROM-Filter blockiert.**
- 595 Player haben matches=0 + perf_l5=50 (siehe Befund 2). Diese könnten NULL market_value haben.
- **Test-Pfad:** SELECT count market_value_eur IS NULL.

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

### Bug-Hypothese

**H4: `score_event`-RPC oder `recalculate_perf_l5`-Cron schreibt `50.00` als „neutralen Default" wenn keine Match-Score gefunden.**

Suchpfade:
- `grep -rn "perf_l5" supabase/migrations/` → Trigger oder RPC?
- `grep -rn "50.0\|50.00" supabase/migrations/` → magische Zahl?
- `scripts/sync-*.ts` → Bulk-Default-Setter?

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

**Status:** AUDIT-FERTIG · Anil-Decision-Pflicht für Track A/B/C-Scope · Implementation-Slice 271 wartet.
