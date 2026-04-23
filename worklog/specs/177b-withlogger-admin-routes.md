# Slice 177b — withLogger-Integration fuer Admin-Routes (177 AC5-Completion)

**Typ:** XS-Slice. Money-Path: Nein. Follow-up aus `worklog/reviews/177-review.md` Finding #1.
**Impact:** skipped (route-wrapper migration).

---

## Ziel

Die 4 Admin-Routes aus Slice 177 (`invite-club-admin`, `backfill-ratings`, `backfill-positions`, `sync-contracts`) auf `withLogger` aus Slice 175 migrieren. Dann:
- Unhandled errors (inkl. unexpected throws nach ValidationError-400-Response-Return) werden automatisch via Sentry captured (`captureError` aus Slice 176).
- Strukturierte Pino-Logs (`request.start` + `request.end` + latency) fuer Observability.
- `x-request-id` Header fuer distributed-tracing.

Schliesst Slice 177 AC5: "Bei Zod-Parse-Fail landet der Request in Slice-175 withLogger Error-Pfad → captureError(ValidationError) mit tags.code='validation' automatisch".

---

## Betroffene Files (4)

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/app/api/admin/invite-club-admin/route.ts` | `export async function POST(req)` → `export const POST = withLogger('admin.invite-club-admin', async (req, {log, requestId}) => {...})` |
| 2 | `src/app/api/admin/backfill-ratings/route.ts` | Gleiches Pattern — route `'admin.backfill-ratings'` |
| 3 | `src/app/api/admin/backfill-positions/route.ts` | Route `'admin.backfill-positions'` |
| 4 | `src/app/api/admin/sync-contracts/route.ts` | Route `'admin.sync-contracts'`. `console.error` → `log.error` + `captureError` via withLogger auto-catch |

---

## Aenderung je File

**Vorher:**
```ts
export async function POST(req: NextRequest) {
  // ... body
}
```

**Nachher:**
```ts
import { withLogger } from '@/lib/observability/apiLogger';

export const POST = withLogger('admin.invite-club-admin', async (req, { log, requestId }) => {
  // ... body (unchanged)
  // log.info, log.error available if needed
});
```

---

## Acceptance Criteria

1. **A1** — Alle 4 Admin-Routes nutzen `withLogger`. Import aus `@/lib/observability/apiLogger`.
2. **A2** — ValidationError (400) wird weiterhin als explicit 400-Response returniert (kein 500 via withLogger-catch) — weil wir in der Route vor dem 400-Return via `isValidationError(err)` zurueck return'en.
3. **A3** — Unexpected/non-validation errors → withLogger auto-catches → `captureError` mit `tags.route='admin.xyz'` + `requestId`.
4. **A4** — `sync-contracts` nutzt `log.error` statt `console.error` fuer legacy-catch-all.
5. **A5** — tsc clean + bestehende Tests gruen (keine neuen Tests noetig — Integration-Tests sind out-of-scope fuer XS-Slice, withLogger ist in Slice 175 getestet).

---

## Risiken

- **Legacy `POST(req: Request)`** → `withLogger` verlangt `NextRequest`. Routes koennen `NextRequest` importieren, schon geschehen in Slice 177.
- **Route-String-Naming:** Konvention `<section>.<action>` (dotted). Bereits etabliert in Slice 175 (`cron.sync-injuries` etc.). Konsistent.
- **Admin-Runtime:** Admin-Routes laufen nicht auf Edge — kein Runtime-Switch, kein Bundle-Split-Issue.

---

## Scope-Out

- Andere API-Routes migrieren (Slice 175b, geplant)
- Tests fuer withLogger-Integration (Integration-Scope, separate Tests)

---

## Proof-Plan

`worklog/proofs/177b-withlogger.txt` — tsc clean + grep-counts (4 Files nutzen `withLogger` + 0 verbleibende `console.error` in sync-contracts).

---

## Time-Estimate

~10 min (1-Line-Pattern-Change je Route).
