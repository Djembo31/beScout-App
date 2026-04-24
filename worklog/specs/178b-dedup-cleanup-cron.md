# Slice 178b — Cleanup-Cron for expired idempotency-keys

## Ziel
Hourly cron loescht Rows in `request_dedup_keys` mit `expires_at < NOW()`. Verhindert unbegrenztes Tabellen-Wachstum.

## Files
- `src/app/api/cron/dedup-cleanup/route.ts` NEU (withLogger + CRON_SECRET auth + supabaseAdmin DELETE)
- `vercel.json` — crons[] array ergaenzt um `{ "path": "/api/cron/dedup-cleanup", "schedule": "0 * * * *" }`

## AC
1. Route mit CRON_SECRET Bearer-auth.
2. `DELETE FROM request_dedup_keys WHERE expires_at < NOW()` — count returned.
3. Fresh rows (expires_at > NOW()) bleiben erhalten.
4. 401 ohne Bearer, 500 bei missing SUPABASE_SERVICE_ROLE_KEY.
5. Schedule `0 * * * *` = hourly.
6. tsc clean.

## Proof
SQL-simulation: 3 rows (2 expired, 1 fresh) → DELETE → 2 deleted, 1 remaining. Verified.

## Scope-Out
- Retention-Window-Tuning: aktuell 300s TTL, +60min cron-delay = ~6min worst-case expiry-lag. Kein SLO gefordert.
- Alerting bei zero-deletes: deferred.
