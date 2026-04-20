# Slice 104 — Gated-Pages Echt-Messung (logged in als jarvis-qa)

**Date:** 2026-04-20 post-deploy (Slice 103+104 live)
**Tool:** Chrome DevTools MCP
**Conditions:** Mobile Slow 4G + 4x CPU + 393x852 viewport
**User:** jarvis-qa@bescout.net (eingeloggt via Login-Form)

## Ergebnisse nach Deploy

| Page | LCP | Render Delay | JS-Chunks | Supabase-Calls |
|---|---|---|---|---|
| `/login` (public, post-104) | **874 ms** | 498 ms | 23 | 0 |
| `/` (Home, gated, reload) | **5086 ms** ❌ | **4641 ms** (91% der LCP!) | — | ~20+ |
| `/market` (gated, reload) | **3018 ms** ❌ | 2713 ms (90%) | 45 | 28+ (713 KB transferred) |

**CLS: 0.00 auf allen drei Pages** ✅

## /home Analyse — Der 5-Sekunden-Killer

Der User erlebt das exakt so: 5 Sekunden Blank-Screen auf Mobile bei Cold-Reload auf `/home`. Das ist was Slice 104 NICHT gelöst hat — die Shell ist schnell, aber die Daten kommen sequenziell.

## /market Netzwerk-Waterfall (Duplicate Calls!)

Ich habe die Network-Requests mitgeschnitten. Folgende **Doppelt-Calls** = verschwendete Roundtrips:

1. **`wallets` 2x** (reqid=674, 677) — identischer Query
2. **`club_followers` 2x** (reqid=683, 684) — identischer Query
3. **`get_public_orderbook` RPC 2x** (reqid=665, 670) — identischer Query

**N+1 Pattern — `player_gameweek_scores`:**
- 5 sequenzielle Queries für Gameweek 32, 33, 34, 35, 36 (reqid=678-682)
- Sollte EINE Query sein: `.in('gameweek', [32,33,34,35,36])`
- Kostet 4 zusätzliche Roundtrips = ~800ms auf Slow 4G

**RSC-Prefetch aggressiv:**
- 10 parallele RSC-Prefetches (/profile, /fantasy, /manager, /rankings, /missions, /datenschutz, /player/id×4)
- Sinnvoll auf Desktop, auf Mobile Slow 4G saturiert das den Thread

**713 KB Supabase-Payload** auf `/market` — auf Slow 4G ~4-5s Download.

## Was Slice 104 gelöst hat

Die **App-Shell** ist jetzt schnell:
- /login LCP 2091→874ms (-58%)
- Template.tsx verhindert Provider-Remount → Route-Transitions zwischen /manager↔/market↔/fantasy sollten jetzt flüssig sein (warmer Cache)

## Was Slice 104 NICHT gelöst hat

- **Auth-Waterfall auf gated Pages** — AuthProvider startet mit `loading: true`, alles wartet → 4 Sekunden bis Hydration
- **Data-Waterfall** — 20+ Queries beim `/home`-Mount, viele redundant
- **Kein Service Worker Cache** — Returning User muss immer alles neu laden
- **Keine React Query Persistenz** — Client-State verpufft beim Tab-Close
- **Kein Edge Auth Check** — Flash-of-Login auf Cookie-authenticated Visits

## Attribution für den CEO

Der User erlebt **5 Sekunden** auf `/home` (exakt was er beschrieben hat: "zwischen Seiten hin und her, mehrmals refreshen bis alles da ist"). 

Das Gute: Die Foundation ist gesetzt (Slice 104). Jetzt kann Slice 105 (AuthProvider) + 110 (Service Worker Cache-First) + Data-Layer-Fixes (Duplicate-Calls + N+1) die verbleibenden ~3-4s auf `<1s` reduzieren.

## Konkrete Next-Slices priorisiert nach User-Impact

1. **Slice 105: AuthProvider-Refactor** — App-Shell sofort, Auth parallel → schätzungsweise -2000ms auf /home
2. **Slice 105b: Data-Waterfall-Fixes** (Home + Market Query-Bundling) — schätzungsweise -1000ms
3. **Slice 110: Service Worker Cache-First** — Returning User 0ms Shell
4. **Slice 106: Stadium-Images WebP** — -600MB Deploy-Size
5. **Slice 111: Edge Auth Middleware** — Flash-of-Login eliminieren
