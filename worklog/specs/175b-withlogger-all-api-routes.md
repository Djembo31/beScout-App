# Slice 175b — withLogger-Batch-Migration aller verbleibenden API-Routes

**Typ:** S-Slice (15 Files, 1-Line-Pattern-Change je File). Money-Path: Nein (withLogger ist rein observabel, keine Money-Logic-Aenderung).
**Impact:** skipped (route-wrapper migration, keine Consumer-Aenderung).

---

## Ziel

Die 15 verbleibenden API-Routes auf `withLogger` aus Slice 175 wrappen. Nach 177b sind 4 Admin-Routes schon gewrapped. Danach sind **alle 19** API-Routes observabel.

**Gewinn:**
- Unified `request.start` + `request.end` + latency-logs fuer ALLE Routes
- Unhandled errors → `captureError` (Slice 176) mit `tags.route` + `requestId`
- `x-request-id` Header fuer distributed-tracing durchgaengig
- Foundation fuer Dashboards/Alerts basierend auf route-tag

---

## Betroffene Files (15)

### Cron (9)
| # | File | Route-String |
|---|------|--------------|
| 1 | `cron/close-expired-bounties/route.ts` | `cron.close-expired-bounties` |
| 2 | `cron/gameweek-sync/route.ts` | `cron.gameweek-sync` |
| 3 | `cron/sync-fixtures-future/route.ts` | `cron.sync-fixtures-future` |
| 4 | `cron/sync-injuries/route.ts` | `cron.sync-injuries` |
| 5 | `cron/sync-players-daily/route.ts` | `cron.sync-players-daily` |
| 6 | `cron/sync-standings/route.ts` | `cron.sync-standings` |
| 7 | `cron/sync-transfermarkt-batch/route.ts` | `cron.sync-transfermarkt-batch` |
| 8 | `cron/sync-transfers/route.ts` | `cron.sync-transfers` |
| 9 | `cron/transfermarkt-search-batch/route.ts` | `cron.transfermarkt-search-batch` |

### Admin (3)
| # | File | Route-String |
|---|------|--------------|
| 10 | `admin/players-csv/export/route.ts` | `admin.players-csv.export` |
| 11 | `admin/players-csv/import/route.ts` | `admin.players-csv.import` |
| 12 | `admin/trigger-cron/[name]/route.ts` | `admin.trigger-cron` |

### Public (3)
| # | File | Route-String |
|---|------|--------------|
| 13 | `events/route.ts` | `public.events` |
| 14 | `players/route.ts` | `public.players` |
| 15 | `push/route.ts` | `public.push` |

---

## Aenderung je File

**Vorher:**
```ts
export async function POST(req: Request) {
  // ...
}
```

**Nachher:**
```ts
import { withLogger } from '@/lib/observability/apiLogger';

export const POST = withLogger('<route-string>', async (req) => {
  // ... (body unchanged)
});
```

**Fuer GET-Handler analog.**
**Fuer Files mit mehreren Handlers (GET + POST):** Jeder einzeln gewrapped.
**`console.error`** in existierenden catch-Bloecken: bleibt unveraendert (Migration zu `log.error` ist Follow-up).

---

## Acceptance Criteria

1. **A1** — Alle 15 Files nutzen `withLogger` Import + Wrapping
2. **A2** — Jede Route hat einen eindeutigen route-string (19 distinct total inkl. 4 aus 177b)
3. **A3** — `console.error` in catch-Bloecken bleibt (Scope-out — zu grosse Varianz pro Route)
4. **A4** — Bestehende Response-Shape + Status-Codes unveraendert
5. **A5** — tsc clean + bestehende Tests gruen
6. **A6** — Dynamic Route `[name]` (`trigger-cron`): params-handling via withLogger-`routeCtx`-Parameter

---

## Risiken

- **Dynamic Route Params:** `admin/trigger-cron/[name]` erhaelt params via withLogger's zweiten Parameter (`{log, requestId, params}`). Muss korrekt destructured werden.
- **GET vs POST:** Einige Routes haben beide. Jede Handler-Export einzeln wrappen. Wenn File GET+POST hat, 2 separate `withLogger`-Calls mit gleichem route-string.
- **Multi-Export-Files:** Route-Files sollten NUR HTTP-Method-Exports + konfigurierte Next.js-Konstanten haben (`runtime`, `maxDuration` etc.). Andere named-exports wurden in Slice 069 bereits verboten.

---

## Proof-Plan

`worklog/proofs/175b-withlogger-batch.txt`:
- tsc clean
- `grep -c "withLogger" src/app/api/**/route.ts` = 19 total
- 19 distinct route-strings
- bestehende Tests gruen (observability + smoke)

---

## Scope-Out

- Migration `console.error` → `log.error` (zu varianzreich, separater Slice wenn noetig)
- Neue Tests (withLogger hat Coverage in 175)
- Zod-Body-Validation fuer die 15 (eigener Pilot-Scope oder 177c)

---

## Time-Estimate

~30 min (15 Files × 2 Mini-Edits: Import + wrap-signature-change).
