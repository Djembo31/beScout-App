# Slice 126 — Sentry Sampling Reduction: LCP Compare

**Deploy:** `dpl_FxTTrQBfCgTVjjk86rWNBbbA8QqR` (commit `1cdd4d9e`) READY 2026-04-21
**Tool:** Chrome DevTools MCP, 2 reload traces
**Conditions:** Mobile Slow 4G + 4× CPU, 393×852, jarvis-qa logged in

## Results

| Metric | Pre-126 (post-125) mean | Post-126 Run 1 (cold) | Post-126 Run 2 (warm) | Post-126 mean | Δ vs pre-126 |
|---|---|---|---|---|---|
| **LCP** | 2906 ms | 3054 ms | 2768 ms | 2911 ms | **+5 ms (noise)** |
| **TTFB** | 538 ms | 761 ms | 331 ms | 546 ms | +8 ms |
| **CLS** | 0.00 | 0.00 | 0.00 | 0.00 | unchanged |

## Honest: hypothesis disproven

Slice 126 assumed lower `tracesSampleRate` + `replaysOnErrorSampleRate` would reduce Sentry runtime overhead, further cutting LCP toward the Google "Good" 2500ms threshold.

**Measurement shows 0 ms LCP impact.** Sampling decides whether to send the trace to Sentry's API (network/quota), not whether the instrumentation code runs. The per-request cost is in:
- Client SDK presence in the bundle (~70 kB shared chunk)
- Wrapper execution around fetch, errors, navigation transitions
- Replay recorder setup (always running, even if event sample rate is 0.1)

These are orthogonal to sampling rate. Sampling only affects **what reaches Sentry dashboards**.

## What Slice 126 actually does deliver

- **Sentry quota savings**: 10% → 1% trace volume = 90% fewer events sent (Sentry free/paid tier cost reduction)
- **Less network tail traffic**: fewer trace payloads leaving the client on slow connections
- **Replay storage**: 90% less replay data uploaded on error (replays are heavy)

These are business-sensible for Beta even without LCP wins.

## What would actually move LCP further

Ranked by expected impact (honest guesses):

1. **Remove Sentry entirely for Beta** (aggressive) — maybe −500 ms. Re-add post-launch via `enabled: process.env.NEXT_PUBLIC_SENTRY_ON === 'true'` env-gate. Trade-off: no error monitoring during launch.
2. **`/market` below-fold dynamic() conversions** — Hero + Tabs stay eager, PortfolioTab + MarktplatzTab lazy. Maybe −100 to −200 ms LCP via smaller initial bundle. Risk: click-to-show delay.
3. **Serverless Warm Lambda** — Vercel Pro + `fluid: true` eliminates cold-start 400-500ms TTFB spikes. Costs money.
4. **CrUX wait** — Real-user metrics from Google Search Console after 7 days. Lab-data may over-penalize cold deploy state.

## Recommendation

Leave Slice 126 as a **quota/storage optimization** (still valuable for Beta). LCP is **not improvable via Sentry config** further; next LCP hebel is either bundle-split or Sentry-off-for-Beta.

/market warm LCP 2768 ms is 268 ms above Google "Good" — close but not there. Real users may hit "Good" via browser cache on repeat visits (CrUX 75th-percentile). Unclear until field data arrives.
