# Slice 471 — W6 Phase 1: SSR-Prefetch-Fundament + /club/[slug]-Pilot

**Status:** SPEC · **Größe:** M · **Slice-Type:** UI/Architektur (Performance) · **Welle:** W6 (Performance/Architektur) · **Scope:** CEO-Go Anil („D-03 SSR, Phase 1 bauen") · **Datum:** 2026-06-30

> D-03 Root-Cause #3 (Client-only). Erster W6-Slice: SSR-Prefetch-Pattern etablieren + an der public Hot-Page `/club/[slug]` pilotieren. Baseline: LCP 4.118 ms / Load-delay 2.049 ms (`d03-ssr-ist-analyse.md`).

## 1. Problem-Statement
0 Server-Prefetch (live verifiziert) → client-Fetch-Wasserfall: Shell+Skeleton rendert, dann JS hydratet, dann `useClubBySlug(slug)` (Root-Query) fetcht, dann erst feuern die `clubId`-gated Queries. Baseline-Trace: **2.049 ms Load-delay** = kein Content im initialen HTML.

## 2. Lösungs-Design
TanStack-v5-SSR-Pattern (context7-verifiziert): Per-Request Server-`QueryClient` via React `cache()` → `prefetchQuery` der Root-Query `['clubs', slug, undefined]` server-seitig (RPC `get_club_by_slug` via `supabaseAdmin`, `p_user_id=null` = logged-out-Pfad) → `dehydrate` → `<HydrationBoundary>{<ClubContent/>}</HydrationBoundary>`. Der logged-out Client-`useClubBySlug(slug, undefined)` hydratet sofort aus dem dehydrierten State (Key matcht) → `clubId` sofort da → Hero rendert instant + gated Queries feuern ohne Roundtrip-Wartezeit.

## 3. Betroffene Files
| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/getServerQueryClient.ts` | NEU | Per-Request Server-QueryClient (`cache()`) — das Fundament für ALLE künftigen Prefetch-Pages |
| `src/app/(app)/club/[slug]/page.tsx` | EDIT | Prefetch Root-Query + HydrationBoundary um ClubContent |

## 4. Code-Reading-Liste (erledigt)
- `useClubBySlug` (`queries/misc.ts:141`): Key `qk.clubs.bySlug(slug,userId)=['clubs',slug,uid]`, fn `getClubBySlug`, staleTime 5min. ✅
- `getClubBySlug` (`services/club.ts`): `supabase.rpc('get_club_by_slug',{p_slug,p_user_id})` → `ClubWithAdmin|null`. ✅ (server: `supabaseAdmin.rpc`, p_user_id=null)
- `useClubData` (`components/club/hooks/useClubData.ts:29`): clubId aus useClubBySlug, ALLE anderen Queries gated → Root = useClubBySlug. ✅
- context7 TanStack-v5 Next-App-Router: `cache(()=>new QueryClient())` + dehydrate + HydrationBoundary. ✅

## 5. Pattern-References
- TanStack-v5 advanced-ssr (context7): per-request `cache()` QueryClient, prefetchQuery ohne await möglich (Streaming), HydrationBoundary.
- W6 MASTERPLAN: „prefetchQuery/HydrationBoundary · Query-Wasserfall reduzieren".
- Key-Hash: `undefined` in Key → JSON-serialisiert konsistent server==client (beide `qk.clubs.bySlug(slug, undefined)`).

## 6. Acceptance Criteria
```
AC-01: [PERF] LCP /club/galatasaray sinkt messbar vs Baseline 4.118 ms
  VERIFY: chrome-devtools performance_start_trace (reload) nach Deploy
  EXPECTED: LCP < Baseline, Load-delay < 2.049 ms (Content im HTML)
  FAIL IF: LCP unverändert/höher
AC-02: [REGRESSION] /club/[slug] rendert korrekt (kein Hydration-Mismatch, kein Crash)
  VERIFY: Live-Render bescout.net + Console-Scan (kein Hydration-Error)
AC-03: [TYPECHECK] tsc grün
AC-04: [FUNDAMENT] getServerQueryClient wiederverwendbar (cache(), per-Request)
```

## 7. Edge Cases
| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | Slug existiert nicht | ClubContent zeigt notFound | RPC liefert null, dehydrate null OK |
| 2 | Logged-IN Besucher (userId≠undefined) | Key matcht NICHT (`['clubs',slug,uid]`) → kein Hydrat, client-fetch wie bisher | bewusst: Pilot zielt logged-out (public), keine Regression für eingeloggte (Phase 2/3 deckt Auth) |
| 3 | RPC-Error server | prefetchQuery wirft → page-render-error? | Prefetch ohne await (`void`) ODER try-catch — Streaming-Pattern, Fehler degradiert auf client-fetch |
| 4 | dehydrate `undefined` im Key | konsistenter Hash server==client | beide via `qk.clubs.bySlug(slug, undefined)` |

## 8. Self-Verification
```bash
npx tsc --noEmit
# Live: performance_start_trace /club/galatasaray vorher(4118)/nachher
```

## 10. Proof-Plan
LCP-Trace vorher (4.118 ms, Baseline) vs nachher (post-Deploy) → `worklog/proofs/471-club-ssr-prefetch.txt`. tsc grün.

## 11. Scope-Out
- Player/home/market (Phase 3) · Server-Auth (Phase 2) · weitere Club-Queries prefetchen (nur Root im Pilot) · Image-Optimierung (separater P2-Hebel).

## 12. Stage-Chain
SPEC → IMPACT (skipped: additive Server-Wrapper, kein Consumer-Contract-Change) → BUILD (2 Files) → REVIEW (reviewer, Architektur-Pattern) → PROVE (LCP-Trace post-Deploy) → LOG

## 13. Pre-Mortem
| # | Failure | Mitigation | Detection |
|---|---------|------------|-----------|
| 1 | Hydration-Mismatch (server vs client HTML) | Root-Query-Daten identisch (gleicher RPC, p_user_id=null); ClubContent unverändert | Console Hydration-Error |
| 2 | Key-Mismatch → kein Hydrat (still kein Win) | beide `qk.clubs.bySlug(slug,undefined)`; LCP-Messung beweist Hydrat | AC-01 LCP unverändert |
| 3 | supabaseAdmin server-RPC-Fehler bricht Page | Prefetch ohne await / try-catch → degradiert auf client-fetch | AC-02 Live-Render |
| 4 | `cache()` leakt zwischen Requests | React `cache()` ist per-Request-scoped (context7) | — |

## Open Risiko
Additiver Server-Wrapper + 1 Prefetch. ClubContent unverändert (kein Client-Logic-Touch). Worst-Case = kein Win (Key-Mismatch), kein Schaden. Messung (LCP vorher/nachher) ist der harte Beweis.

## ⚠️ SCOPE-KORREKTUR (Reviewer-Finding 471-F1, verifiziert 2026-06-30)
**AC-01 (Content im HTML / LCP-Win) ist mit 471 ALLEIN NICHT erreichbar.** ClubContent.tsx:179 gated alles hinter `authLoading` (server-seitig immer true) → SSR-HTML bleibt Skeleton, Prefetch landet nicht im HTML. **471 = korrektes Fundament (SSR-Prefetch-Infra + Provider-Request-Scoping [F2 gefixt]), KEIN LCP-Win.** Der sichtbare Win + die LCP-Messung gehören zu **Slice 472 (Server-Auth)** — Session server-seitig lesen, damit Server + Client-First-Paint übereinstimmen und Content im SSR-HTML rendert. CEO Anil: „Server-Auth jetzt".
