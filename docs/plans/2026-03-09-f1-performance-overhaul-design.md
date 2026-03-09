# Design: F1 Performance Overhaul

## Status: Approved
## Datum: 2026-03-09

## Ziel
App-Ladezeit von ~4-5s auf <1.5s LCP reduzieren. Moderner Standard: instant Shell, progressive Content, lazy Everything.

## Phase 1 — Render-Blocking eliminieren (Critical Path)

### 1.1 Font Loading → next/font
- Google Fonts CSS-Import raus aus globals.css
- `next/font/google` mit Outfit + Space Mono, nur Weights 400/700/900
- System Font Fallback sofort sichtbar, Swap wenn geladen
- Impact: ~500ms FCP

### 1.2 AuthProvider → Non-Blocking Shell
- App rendert sofort mit Skeleton-Shell
- Auth-Check laeuft parallel im Hintergrund
- Sobald Session da: hydrate User-State, UI updated
- Impact: ~300-500ms TTI

### 1.3 PostHog → Lazy Load nach Interaction
- posthog-js Import wird dynamic import() nach requestIdleCallback
- Events queuen bis SDK ready
- Impact: ~60KB vom Critical Bundle

### 1.4 goal_icon.png (6.7MB) → SVG/komprimiert
- Ersetzen durch inline SVG oder stark komprimiertes Asset (<50KB)
- Impact: 6.6MB pro User-Session

## Phase 2 — Progressive Loading (Perceived Performance)

### 2.1 loading.tsx Skeletons
- (app)/loading.tsx — App-Shell Skeleton
- (app)/fantasy/loading.tsx — Fantasy Skeleton
- (app)/market/loading.tsx — Market Skeleton

### 2.2 Homepage → Staggered Sections
- Hero/Stats sofort (cached)
- Portfolio, Trending, Recent Trades als eigene Suspense-Boundaries
- usePlayers() aufteilen: nur IPO + Trending statt alle 630

### 2.3 Market → Tab-Gated Queries
- enabled: activeTab === 'kaufen' etc.
- 10 Queries → 3-4 beim Oeffnen

### 2.4 Fantasy → Query Optimization
- useJoinedEventIds nur wenn Tab aktiv
- keepPreviousData fuer instant Tab-Switch

## Phase 3 — Bundle & Code Splitting

### 3.1 EventDetailModal splitten (1,854 Zeilen)
- Kern-Modal: Header + Tabs (~300 Zeilen)
- LeaderboardPanel, LineupPickerPanel, ProgressiveScoresPanel, FormationView → lazy

### 3.2 FixtureDetailModal splitten (1,272 Zeilen)
- Kern: Score Header + Tab Navigation
- FormationTab, RankingTab, TimelineTab → lazy per Tab
- HTTP-Requests batchen mit Promise.all()

### 3.3 next.config.mjs Optimierungen
- optimizePackageImports erweitern
- Bundle Analyzer einrichten
- Image: AVIF + WebP

### 3.4 Provider Chain optimieren
- WalletProvider + ClubProvider → lazy init nach Auth
- AnalyticsProvider → nach First Paint

## Phase 4 — Advanced (Server-Side)

### 4.1 Server Components
- Statische Layout-Teile als Server Components
- Metadata als Server Component

### 4.2 Streaming SSR
- React Streaming fuer Homepage-Sections
- loading.tsx + Suspense = native Streaming

### 4.3 Service Worker Cache-Strategie
- Stale-While-Revalidate fuer API-Responses
- Prefetch naechste wahrscheinliche Route

### 4.4 CSS Cleanup
- Ungenutzte @keyframes entfernen
- prefers-reduced-motion auf alle Animationen

## Erwartetes Ergebnis

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| FCP | ~2.5s | <1.0s |
| LCP | ~4.0s | <1.5s |
| TTI | ~5.0s | <2.0s |
| Bundle (initial) | ~350KB | <200KB |
| goal_icon | 6.7MB | <50KB |

## Nicht im Scope
- Backend/RPC Optimierung
- CDN/Edge Deployment
- Image CDN fuer Player-Fotos
