# Review — Slice 471 (W6 Phase 1, SSR-Prefetch /club/[slug])

**Reviewer:** Cold-Context-Agent · **Datum:** 2026-06-30 · **Verdict: CONCERNS** · time-spent ~14 min

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | CONCERNS (slice-goal) | `ClubContent.tsx:179` + `page.tsx` | **SSR-HTML enthält nur Skeleton, NICHT den prefetchten Content.** ClubContent gated ALLES hinter `if (authLoading \|\| loading) return <ClubSkeleton/>`. `authLoading` ist im SSR (+ erstem Client-Paint) IMMER `true` (AuthProvider startet `loading:true`, useEffect läuft serverseitig nicht). Prefetch eliminiert nur den Club-RPC-Roundtrip NACH Client-Auth-Resolve — bringt den Content NICHT ins initiale HTML. AC-01 (Content im HTML, Load-delay-Kollaps) so nicht erreichbar; der echte LCP-Blocker (Auth-Gate) bleibt. | Echter Public-SSR-Win braucht Folge-Slice: PublicClubView serverseitig rendern (vom authLoading-Gate entkoppeln) ODER Session serverseitig lesen (Server-Auth) → logged-out-Zweig landet im SSR-HTML. |
| 2 | CONCERNS (Fundament) | `QueryProvider.tsx` → `queryClient.ts:3` | Provider nutzt Modul-Singleton QueryClient → auf dem Server requestübergreifend geteilt. HydrationBoundary hydratet in genau diesen Singleton. Für public per-slug-Daten korrekt, ABER: (a) Server-Cache akkumuliert pro Slug bei gcTime 24h, (b) als „Fundament für ALLE Prefetch-Pages" Cross-Request-Leak-Quelle sobald user-scoped/sensible Daten reinhydratet werden. | Provider auf `getQueryClient()` mit `isServer ? makeQueryClient() : browserSingleton` umstellen VOR user-scoped Prefetch. Minimal: in getServerQueryClient-Doc „nur public Daten bis Provider request-scoped". |
| 3 | NIT | live `get_club_by_slug` grants | anon-REVOKEt (Migration 20260615160000). SSR via supabaseAdmin umgeht korrekt. ABER logged-out Client-Refetch (5min-Stale / ErrorState-Retry / invalidate) läuft über anon → schlägt fehl; Hydration maskiert nur initialen Paint. Pre-existing, kein neuer Bug — durch SSR-Maskierung leichter zu übersehen. | Live proacl prüfen; logged-out-Recovery-Pfad latent kaputt. |

## Was korrekt ist (geprüft)
- **Key-Hash-Match:** `['clubs', slug, undefined]` server == logged-out client (beide `undefined`→`null` JSON-Hash). Logged-in: kein Match → client-fetch (bewusst, Edge 2). Kein Hydration-Mismatch (server + client-first-paint beide Skeleton).
- **`cache()` per-Request:** Prefetch-Client leakt NICHT (Leak-Vektor ist der Provider-Singleton, Finding 2).
- **Security:** get_club_by_slug SECDEF, p_user_id=null → nur public Felder, keine PII. Sicher im HTML.
- **prefetchQuery wirft nicht:** v5 fängt intern; error-Query nicht dehydriert → client-fetch. Degradiert sauber, kein Page-Break.
- **Shape-Match:** gleiche RPC → kein Cache-Lie. Regression: ClubContent unverändert.

## One-Line
Senior merged das Pattern (Code korrekt, sicher, degradiert sauber) — aber mit Pushback auf das überzogene Spec-Framing („Content im HTML") und Auflage, den Provider request-zu-scopen vor user-scoped Prefetch.

## CTO-Verifikation (Primary-Claude)
Finding 1 selbst verifiziert: ClubContent.tsx:179 bestätigt. Der Reviewer hat recht — das Phasing war falsch: der **authLoading-Gate ist der echte LCP-Blocker**, nicht der Club-RPC. Und authLoading=true-im-ersten-Paint ist BEWUSST (Hydration-Mismatch-Vermeidung) → der echte Win braucht Server-Auth (Session serverseitig lesen), damit Server + Client-First-Paint übereinstimmen und Content im SSR-HTML landet. → Phasing-Korrektur an Anil.
