# D-03 SSR/Performance — Ist-Analyse + Inkrement-Plan (2026-06-30)

> Faktenbasierte Analyse (kein Build). CEO-Wahl Anil: „D-03 SSR größte Pro-Lücke". Ansatz: **inkrementell, kein XL-Big-Bang.**

## Ist-Zustand (live verifiziert)

| Achse | Befund | Beleg |
|-------|--------|-------|
| Server-Prefetch / Hydration | **0** | `grep HydrationBoundary\|dehydrate\|prefetchQuery src/` = leer |
| `'use client'`-Pages | 25/41 page.tsx | grep |
| Auth-Resolve | client-seitig, `loading=true`-Start → `onAuthStateChange`+`getAuthState` (Netzwerk, 10s-Timeout) | `AuthProvider.tsx:152/185/283` |
| `AuthGuard` | blockt Render mit `ContentSkeleton` während `loading` (Slice 264: nur `loading`, nicht `profileLoading` → Returning-User sub-Sek) | `AuthGuard.tsx:53` |
| Daten | 100% client `useQuery` nach Mount, 0 Prefetch | `PlayerContent`/etc. |
| queryClient | **Singleton** (nicht per-Request SSR-fähig) | `src/lib/queryClient.ts:3` |
| @supabase/ssr | installiert, NUR in API-Routes (`createServerClient`) | grep |
| Server-Pages (player/club) | nur `generateMetadata` (SEO), Daten via client-Child, KEIN Prefetch | `player/[id]/page.tsx` |

**Root-Cause der 5-13s:** kumulativer Wasserfall — (1) client Auth-Resolve (Netzwerk-Roundtrip) → (2) `loading`-Fenster blockt Shell → (3) children mounten → (4) deren client-`useQuery` feuern → (5) per-Component-Skeletons bis Daten da. KEIN Server-HTML mit Daten.

## Inkrement-Plan (phasiert, je messbar, kein Big-Bang)

**Phase 1 — SSR-Prefetch-Fundament + 1 Pilot-Page (player/[id], höchster Traffic).** ← EMPFEHLUNG erster Slice
- Per-Request Server-queryClient-Factory + `HydrationBoundary`-Helper (`src/lib/getServerQueryClient.ts`).
- `player/[id]/page.tsx` (schon Server-Component): primäre Daten server-seitig prefetchen (player + prices) via @supabase/ssr (RLS-respektierend) ODER supabaseAdmin (public Player-Daten); `dehydrate` → `<HydrationBoundary>{<PlayerContent/>}</HydrationBoundary>`.
- Query-Keys server==client matchen (sonst hydratet es nicht). Pilot beweist Pattern + misst Win (First-Paint-mit-Daten statt Skeleton).
- **Verifizierbar:** Lighthouse/Network bescout.net player-Page vorher/nachher (LCP/Skeleton-Dauer). Contained = 1 Page, kein Auth-Umbau.

**Phase 2 — Server-Auth-Hydration.** Server liest Session-Cookie (@supabase/ssr `createServerClient`+`cookies()`) → initial user/profile als Server-Prop → `AuthProvider` startet mit bekanntem User statt `loading=true`. ⚠️ Vorsicht: der `loading=true`-Start ist BEWUSST (Hydration-Mismatch-Vermeidung, AuthProvider:148) → braucht sauberes Server-Client-Hydration-Handoff. Eliminiert das Auth-`loading`-Fenster (cold-start). Größter Single-Win, aber delikat (Auth).

**Phase 3 — weitere Hot-Pages (club/[slug], home, market) auf das Phase-1-Pattern.** Mechanische Wiederholung pro Page.

**Phase 4 (optional/später) — RSC-Migration einzelner statischer Sektionen** (Server-Components wo kein Client-State nötig). XL, niedrigster Hebel-pro-Aufwand → zuletzt.

## Risiken / Vorsicht
- **Auth-Hydration-Mismatch** (Phase 2): server=loading vs client=cached → der bewusste `loading=true`-Start. Phase 1 umgeht das (kein Auth-Touch).
- **queryClient-Singleton**: für SSR braucht es per-Request (Server) + Singleton (Client) — Standard-TanStack-v5-Pattern (`getQueryClient` mit `cache()`/`isServer`).
- **RLS bei Prefetch**: user-scoped Daten (Holdings/Wallet) NICHT mit supabaseAdmin prefetchen (RLS-Bypass) → @supabase/ssr-Server-Client mit User-Session. Public Daten (Player-Stammdaten/Prices) = supabaseAdmin OK.
- **context7 vor Build**: aktuelles @supabase/ssr + Next-14-App-Router + TanStack-v5 HydrationBoundary-Pattern via context7 verifizieren (Training-Drift, CLAUDE.md §7).

## Empfehlung
**Phase 1 (player/[id] SSR-Prefetch-Pilot)** als erster Slice — contained, messbar, beweist das Pattern, kein Auth-Risiko, höchster Traffic. Phase 2 (Server-Auth) danach als der größte Single-Win, aber bewusst getrennt (delikat).
