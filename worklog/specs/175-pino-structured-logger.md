# Slice 175 — Pino Structured-Logger Foundation (Tier D1)

**Typ:** S-Slice (3 neue Files + 1 Pilot-Migration). Money-Path: Nein.
**Impact:** skipped (neue Module + 1 API-Route Pilot, kein DB/RPC-Change).

---

## Ziel

Strukturierte JSON-Logs in allen API-Routes. Heute `console.log/error` 14× verstreut, nicht queryable, nicht filterbar. Vercel ingested strings, nicht structured-JSON.

---

## Professional-Standard (Sorare/Socios)

```ts
logger.info({ userId, action: 'buyPlayer', playerId, latencyMs }, 'trade executed');
// → Vercel/Datadog sieht {level: 30, time: ..., userId, action, playerId, latencyMs, msg}
// → queryable: "action=buyPlayer AND latencyMs > 500"
```

Plus: `withLogger(handler)` API-wrapper, der Request-ID injecten und child-logger pro Request bindet.

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/lib/observability/logger.ts` | NEU — Pino-Instance + helpers (`logger`, `createChildLogger`) |
| 2 | `src/lib/observability/apiLogger.ts` | NEU — `withLogger(handler)` Route-Wrapper (Request-ID + latency + auto-error-capture) |
| 3 | `src/lib/observability/__tests__/logger.test.ts` | NEU — Test (log-shape + child-logger + redact-sensitive) |
| 4 | `package.json` | pino + pino-pretty (bereits installiert) |

---

## Acceptance Criteria

1. **A1** — `logger.info({ctx}, msg)` produziert JSON mit {level, time, ...ctx, msg}
2. **A2** — Dev: `pino-pretty` formatiert (farbig, menschlich). Prod: raw JSON (Vercel-ingest)
3. **A3** — `createChildLogger({requestId})` bindet RequestID an alle Logs
4. **A4** — `withLogger(handler)` generiert RequestID, misst Latenz, logt Start + End + Errors
5. **A5** — Sensitive Felder (password, token, authorization) werden automatisch redacted
6. **A6** — tsc clean + tests gruen

---

## Proof-Plan

`worklog/proofs/175-pino.txt` — vitest + ts-check + Sample-Output.

---

## Scope-Out

- Migration der 19 API-Routes (console.log/error → logger) → Slice 175b (batch)
- Pilot-Route-Migration → Slice 175b (deferred fuer Foundation-only Scope)
- Request-Context-Propagation via AsyncLocalStorage → post-Beta
- Log-Aggregation zu externem Service (Datadog/Axiom) → post-Beta

---

## Time-Estimate

~30 min.
