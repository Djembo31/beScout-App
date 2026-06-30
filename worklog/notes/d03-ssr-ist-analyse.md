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

## Baseline-Messung (2026-06-30, Chrome-DevTools performance_start_trace, Desktop, kein Throttle)

**Page: `https://www.bescout.net/club/galatasaray` (public Hot-Page, ungated):**
- **LCP: 4.118 ms** (🔴 poor) · CLS 0,06 (🟢)
- LCP-Breakdown: TTFB 525 ms · **Load-delay 2.049 ms** · Load-duration 1.069 ms · Render-delay 475 ms
- **Smoking-Gun = die 2.049 ms Load-delay** = der client-Fetch-Wasserfall (LCP-Element startet erst nach 2s, weil erst Shell+Skeleton rendert, dann JS hydratet + client-fetcht). Kein Content im initialen HTML.
- Kontext: public+ungated+Desktop+kein-Throttle. Login-gated Pages (player/home/market) + Mobile-Cold-Start addieren Auth-Skeleton → die 5-13s.
- Insights: ImageDelivery (LCP-Saving ~550ms, 389kB un-optimierte Bilder), NetworkDependencyTree (kritische Request-Kette), ThirdParties.
- Trace: `scratchpad/d03-baseline-club.json`.

**Erwartung nach Phase 1 (SSR-Prefetch):** Load-delay kollabiert (Content/Daten im initialen HTML) → LCP deutlich runter.

## Post-Implementation-Messung (2026-06-30, nach 471+476, /club/galatasaray, ali eingeloggt, Desktop/kein-Throttle)

| Metrik | Baseline (vor 471) | Jetzt (post-476) | Δ |
|--------|--------------------|--------------------|---|
| **LCP** | 4.118 ms 🔴 | **2.951 ms** | **−1.167 ms (−28%)** |
| Load-delay | 2.049 ms | 1.725 ms | −324 ms |
| TTFB | 525 ms | 710 ms | +185 ms (472 getServerUser-Roundtrip) |
| Render-delay | 475 ms | 105 ms | −370 ms |

**Wichtig — Phase-3-Umlenkung (Messung statt Annahme):**
1. **Der 471-Prefetch liefert** (jetzt wo 476 den Dual-Build-Crash gefixt hat): LCP 4118→2951 ms. Pattern bestätigt.
2. **Der verbleibende LCP-Engpass ist BILD-gebunden, nicht Daten:** LCP-Knoten = Stadion-Hero-Bild (`/stadiums/<club>.jpg` via next/image **w=3840** = massiv überdimensioniert, ~389 kB). Top-Insights: **LCPDiscovery** (LCP-Bild nicht früh auffindbar/lazy) + **DocumentLatency** (605 ms, TTFB/Kompression).
3. **Folge:** „mechanische Prefetch-Wiederholung auf player/home/market" (Phase 3 wie ursprünglich geplant) hat **abnehmenden LCP-Ertrag** — der Daten-Wasserfall ist nicht mehr der LCP-Treiber. **Höherer Hebel = LCP-Bild-Optimierung** (hero `priority` + korrekte `sizes` + realistische Breite statt w=3840; cross-page, weil Stadion/Player-Fotos überall LCP-Element sind). TTFB ist der zweite Hebel (472 addierte +185 ms getServerUser; via Middleware-Header-Durchreichung optimierbar, Pre-Mortem-472-#5).
4. **Empfohlener nächster W6-Slice:** LCP-Bild-Slice (hero-Bilder messbar entlasten) STATT blinder Prefetch-Replikation. Player-Detail-Perf-Item (usePlayers() lädt ALLE ~632 Spieler client-seitig) bleibt separat valide (Payload, nicht LCP).

## Post-486-Messung (LCP-Bild-Slice umgesetzt, 2026-06-30, live bescout.net)
Der empfohlene LCP-Bild-Slice (statt blinder Prefetch-Replikation) ist live (Slice 486):
- `next.config formats=['image/avif','image/webp']` (app-weit) + ClubHero-Stadion `sizes="100vw"` + `quality={60}`.
- **Byte-Win Stadion-Hero (curl, AVIF-q60 vs WebP-q75): −45-47%** — Desktop-Retina w=3840 **623→343 kB**, Desktop w=1920 538→283 kB, Mobile w=828 103→56 kB. App-weit (AVIF für ALLE next/image). Visuell scharf (decorative bg unter Overlays, q60 unsichtbar).
- **chrome-devtools-Re-Trace (Desktop, ausgeloggt, post-486): LCP 2233 ms.** LCP-Element = Stadion `image/avif w=1920 q60` (Change live). Breakdown: TTFB 366(16%) · **LOAD-DELAY 1432(64%)** · load-duration 358(16%, **Download nur 33 ms**) · render-delay 77(3%).
- **ZENTRALE LEHRE (umlenkend):** Das Bild ist KEIN LCP-Transfer-Bottleneck mehr (AVIF-Download 33 ms). Auf Fast-Desktop-CDN war es das nie — LCP ist **LOAD-DELAY-dominiert** (Bild erst @1798 ms angefragt = späte Discovery / Client-Render-Wasserfall = D-03-Architektur-Kern). Der −45% Byte-Win zahlt auf **Mobile/langsame Netze/Datenvolumen** ein, NICHT die Fast-Desktop-LCP. Auflösungs-Cap wäre für LCP wertlos (Download schon 33 ms).
- **Nächster W6-Hebel (gemessen, nicht geraten): LOAD-DELAY senken** — LCP-Hero früher discoveren/rendern (SSR-im-HTML statt client-fetch nach Hydration; `priority`-Preload-Effektivität prüfen; ggf. Hero als RSC). DANN (b) TTFB (472 +185 ms getServerUser) · (c) Player-Detail-Payload (usePlayers() ALLE ~632 — separat, nicht LCP).

## Empfehlung (verfeinert nach Baseline)
**Phase 1 = `/club/[slug]` SSR-Prefetch-Pilot** (statt player/[id]) — **besser**, weil public + Server-Component + **vor/nach ohne Login messbar** (player ist AuthGuard-gated, schwerer zu messen). Gleicher Pattern-Beweis (Server-queryClient + HydrationBoundary), aber sauber quantifizierbar gegen die Baseline 4.118 ms LCP. Player/home/market folgen in Phase 3. Phase 2 (Server-Auth) = größter Single-Win, bewusst getrennt (delikat).
