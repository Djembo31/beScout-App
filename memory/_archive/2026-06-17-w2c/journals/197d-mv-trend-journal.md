# Backend Journal: Slice 197d — MV-Trend 7d (Backend-Track)

## Gestartet: 2026-04-25

### Verstaendnis
- Was: DB-Spalte `players.mv_trend_7d` ENUM (`rising`/`stable`/`falling`/NULL) + Daily-Cron der Trend aus 7d-old-Snapshot vs current MV berechnet.
- Betroffene Tabellen: `players` (ALTER COLUMN), `players_mv_history` (NEW).
- Betroffene Files:
  - `supabase/migrations/20260425200000_slice_197d_mv_trend.sql` (NEW)
  - `src/app/api/cron/calculate-mv-trends/route.ts` (NEW)
  - `vercel.json` (cron-entry mergen)
  - `src/types/index.ts` DbPlayer extended
- Risiken (aus Skill abgeleitet):
  - Vercel Hobby-Plan-Limit: NUR daily Crons → schedule `0 3 * * *` (UTC). errors-infra.md D36.
  - AR-44 REVOKE/GRANT-Pflicht (CREATE OR REPLACE resettet Privilegien).
  - RLS Pflicht-Checkliste: neue Tabelle braucht Policies fuer ALLE Client-Ops oder explizit "kein Policy = service_role only". Ich nutze "kein Policy" + RLS enable → nur service_role.
  - Cron-Limit Hobby: Max 2 Crons/Tag. Aktuelle vercel.json hat 11 Cron-Eintraege → Pro-Plan implied. Trotzdem: schedule bleibt daily.
  - Stub-Migration-Verbot AR-43: vollstaendige SQL.
  - Next.js Route-Handler Named-Exports: nur HTTP-Methods + runtime/dynamic/maxDuration export.

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | Option A (history-table) | Trend-Berechnung deterministisch aus echten 7d-old-Snapshots, nicht heuristisch. Future-proof: erlaubt 30d/90d Trends ohne Refactor. |
| 2 | RLS enabled, aber KEINE Policy | Tabelle ist cron-only / admin-only. Service-role bypassed RLS. Authenticated/anon bekommt 0 Rows zurueck (kein 403). Self-Doc: data ist intern. |
| 3 | Threshold ±5% (rising/falling) | FM-Audit-Convention "MV-Trend" — kleine Schwankungen sind Noise. ±5% deckt echte Marktbewegungen ab. |
| 4 | History-Cleanup >30d | Speicher-Management. 30d reichen fuer 7d-Trend-Berechnung mit Buffer. Cron macht Cleanup im selben Run. |
| 5 | DROP+CREATE vs CREATE OR REPLACE: CREATE OR REPLACE | Erstes Mal angelegt — keine Signatur-Aenderung. AR-44 REVOKE/GRANT-Block trotzdem pflicht. |
| 6 | `NULL`-Default fuer mv_trend_7d | Bei players ohne 7d-old-Data: NULL = honest "kein Vergleichspunkt". Frontend rendert "—" oder gar nichts. |
| 7 | Cron-Schedule `0 3 * * *` UTC | Daily 3 AM UTC = 5 AM MEZ / 6 AM MESZ — Off-Peak. Konflikt mit `sync-players-daily` (0 3 * * 1) nur Montag-3AM, aber unterschiedliche Resourcen (this cron operiert nur auf existing players, sync schreibt). Akzeptabel. |
| 8 | NUR REVOKE/GRANT, KEIN auth.uid()-Guard | Cron-RPC. service_role hat default access, REVOKE FROM authenticated/anon/PUBLIC blockt user-Calls. Kein p_user_id-Param → kein Cross-User-Risk. |

### Fortschritt
- [x] Migration File schreiben — supabase/migrations/20260425200000_slice_197d_mv_trend.sql
- [x] Cron-Route schreiben — src/app/api/cron/calculate-mv-trends/route.ts
- [x] vercel.json mergen — slot 45 3 * * * (daily 03:45 UTC, Hobby-kompatibel)
- [x] DbPlayer Type erweitern — mv_trend_7d?: 'rising' | 'stable' | 'falling' | null
- [x] tsc clean
- [x] next build: route.js compiled clean. Build crasht erst spaeter bei /api/players (pre-existing Env-Var-Issue im Worktree, unrelated).

### Runden-Log
- Runde 1: Implementation parallel + verify. Erfolg.

### AFTER Phase
- 8-Punkt Checkliste komplett gruen.
- Backend-spezifische Checks:
  - CHECK constraint: 3 Enum-Werte (rising/stable/falling) + NULL.
  - RPC REVOKE 3-fach (PUBLIC/anon/authenticated). service_role default access.
  - RLS enabled + no policies → cron-only (Pattern aus database.md).
  - Discriminated-Union Return-Shape (success: true, ...).
  - GET DIAGNOSTICS ROW_COUNT fuer alle 3 Operationen.
  - NULL-safe Vergleich via IS DISTINCT FROM.
  - Zero-division Schutz (past.mv_eur = 0 Branches).
  - Cron-Schedule daily-only (D36 Hobby-Plan-Pflicht).
- Build: tsc clean, route.js compiled (kein Named-Exports-Trap).
