# Post-Deploy Measurement: /market (2026-04-21)

**Context:** Nach Hotfix `d73dc235` sind alle gestauten Slices 114-123 live.
**Conditions:** Chrome DevTools MCP, Mobile Slow 4G + 4× CPU + 393×852, jarvis-qa logged in
**URL:** https://www.bescout.net/market
**Method:** 2 reloads, performance_start_trace autoStop

## Ergebnisse

| Metric | Slice 107 Baseline (2026-04-20) | Run 1 (post-123) | Run 2 (post-123) | Mean |
|---|---|---|---|---|
| **LCP** | 1270 ms | 3245 ms | 3429 ms | **3337 ms** |
| **TTFB** | 210-305 ms | 898 ms | 775 ms | **836 ms** |
| **Render Delay** | 1060 ms | 2347 ms | 2654 ms | **2500 ms** |
| **CLS** | 0.11 (later 0.14) | 0.00 | 0.00 | **0.00** |

## Positive

- **CLS komplett gefixt** durch Slice 116 Skeletons (0.00 auf 2 Runs stabil) — User-Experience Layout-Shift vorbei.

## Regression

- **LCP 1270 → 3337 ms (+163%)**. Baseline war pre-Slice-118 (Sentry).
- **TTFB 210-305 → 775-898 ms (+3-4×)**. Größter Beitrag. Server-side langsamer.
- **Shared JS 89 kB → 159 kB** (+70 kB) durch Sentry-Client-Instrumentation auf allen Pages.

## Vermutete Root-Causes (unverifiziert)

1. **Sentry server-side deprecated config** — Vercel-Build-Logs warnten explizit:
   > "It appears you've configured a sentry.server.config.ts file. Please ensure to put this file's content into the register() function of a Next.js instrumentation file instead."
   Server-side Sentry-Wrapper instrumentiert jede Request → TTFB-Impact.
2. **Sentry client instrumentation-client.ts** — 70 kB shared-chunk von `@sentry/nextjs`.
3. **Cold-Start Serverless** — falls erste Requests nach Idle-Phase, kann TTFB spike.

## Nicht-Hypothesen

- **Slice 122 get_market_user_dashboard RPC**: Latenz-Budget dort ist dominiert von HTTP-Roundtrip, nicht neue-RPC-Aufruf. Eliminiert nur client-side roundtrip count, nicht TTFB.
- **Slice 120 country-flag-split**: würde LCP verbessern, nicht verschlechtern.
- **Slice 121 research lazy-load**: minimaler positiver Effekt, nicht Ursache.

## Messunsicherheit

- Kalt-Cache-erste-Visits nach Deploy sind per se langsamer. Mehrere Messungen + 3rd Run nach Warm-Up sinnvoll.
- Lighthouse lab-data sind worst-case; echte CrUX-Daten (field) aus echten Nutzern sind noch unvorhanden (new deployment).

## Empfehlungen

- **Short-term**: Sentry-Config-Deprecation beheben (instrumentation.ts migration).
- **Medium-term**: `tracesSampleRate` checken — wenn 1.0, reduzieren auf 0.1 für Beta.
- **Medium-term**: `ANALYZE=true next build` re-messen + Sentry-Chunk-Beitrag identifizieren.
- **Watch**: CrUX-Daten nach 3-7 Tagen echter Nutzer — lab-Zahlen können täuschen.
