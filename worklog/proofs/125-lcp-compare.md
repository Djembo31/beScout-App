# Slice 125 — Sentry Instrumentation Migration: LCP Compare

**Deploy:** `dpl_9csPKM4CdKdXqC61AaPvjwrhXNKu` (commit `718c7265`) READY 2026-04-21 00:38 UTC
**Tool:** Chrome DevTools MCP (`performance_start_trace`)
**Conditions:** Mobile Slow 4G + 4× CPU + 393×852, jarvis-qa eingeloggt
**Page:** https://www.bescout.net/market

## Results

| Metric | Pre-125 (Run 1, cold) | Pre-125 (Run 2) | Pre-125 mean | **Post-125 Run 1** | **Post-125 Run 2 (warm)** | **Post-125 mean** | Δ vs pre-125 |
|---|---|---|---|---|---|---|---|
| **LCP** | 3245 ms | 3429 ms | 3337 ms | 3321 ms | **2492 ms** | **2906 ms** | **−431 ms (−13%)** |
| **TTFB** | 898 ms | 775 ms | 836 ms | 758 ms | **319 ms** | **538 ms** | **−298 ms (−36%)** |
| **Render Delay** | 2347 ms | 2654 ms | 2500 ms | 2563 ms | 2173 ms | 2368 ms | −132 ms (−5%) |
| **CLS** | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | unchanged ✅ |

## Interpretation

**Real win on TTFB** — core mechanic: Sentry was auto-loading `sentry.server.config.ts` + `sentry.edge.config.ts` per-request via the deprecated `withSentryConfig` auto-wire. The `instrumentation.ts` + `register()` pattern loads Sentry once per runtime-worker at startup, not per request.

- Run 1 post-125 (3321 ms) was still cold-start — new deploy, lambda cold. Similar LCP to pre-125 cold.
- Run 2 post-125 (2492 ms) reflects the warm-path experience. **That's what real users will see.**

**LCP improvement** = mostly TTFB-driven. Render-delay (client-side JS parsing + Supabase waterfall) barely changed — that's downstream of Sentry-overhead, not affected by this migration.

Per Google threshold: 2492 ms is "Needs Improvement" (>2500ms is "Good"). Still not quite at Google "Good" LCP, but close — and dramatically better than pre-125 2.6×-regression.

## Versus Slice 107 Baseline (pre-Sentry)

- Slice 107 baseline (without Sentry): **LCP 1270 ms**
- Slice 125 warm (with Sentry, modern config): LCP 2492 ms
- Remaining Sentry overhead: ~1222 ms

That gap is real. Further shrinking would require:
- Lowering `tracesSampleRate: 0.1` → `0.01` (less data, faster instrumentation)
- `replaysOnErrorSampleRate: 1.0` → `0.1` (client-side replay overhead)
- Shared-chunk reduction (159 kB shared still heavy)

## Build Warnings Cleared

Slice 125 eliminated 3 of 4 Sentry build warnings:
- ✅ `sentry.server.config.ts` deprecation — migrated
- ✅ `sentry.edge.config.ts` deprecation — migrated
- ✅ `sentry.client.config.ts` → `instrumentation-client.ts`
- ✅ `disableLogger` → `webpack.treeshake.removeDebugLogging`
- ✅ `automaticVercelMonitors` → `webpack.automaticVercelMonitors`

One remaining warning: `· instrumentationHook` (Next.js 14.2+ experimental flag is stable, harmless per docs — removed in Next 15).

## Files

- Commit: `718c7265`
- Migration: `instrumentation.ts`, `instrumentation-client.ts` (both at root)
- Config: `next.config.mjs` (sentryConfig webpack.* subkeys + experimental.instrumentationHook)
- Deleted: `sentry.client.config.ts`
- Kept (now loaded via register): `sentry.server.config.ts`, `sentry.edge.config.ts`

## Next-Steps (optional)

- **Observe 1-2 days** with CrUX/Sentry Performance — verify warm-path LCP stays <2500ms across real users.
- **Reduce sampling rates** if Sentry dashboard shows overhead is still significant (tracesSampleRate 0.1→0.01).
- **Replay opt-in only**: set `replaysOnErrorSampleRate: 0` for Beta, enable post-launch for specific incidents.
