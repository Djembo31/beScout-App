# Active Slice

```
status: active
slice: 471
title: W6 Phase 1 — SSR-Prefetch-Fundament + /club/[slug]-Pilot
size: M
type: UI/Architektur (Performance)
welle: W6 (Performance/Architektur)
stage: LOG (committing — Fundament)
spec: worklog/specs/471-club-ssr-prefetch.md
impact: skipped (additiver Server-Wrapper, kein Consumer-Contract-Change)
proof: worklog/proofs/471-club-ssr-prefetch.txt
review: worklog/reviews/471-review.md (CONCERNS → F1 ehrlich umframt, F2 gefixt)
```

## Plan (CEO-Go Anil „D-03 SSR Phase 1")
471 = SSR-Prefetch-Infrastruktur (getServerQueryClient + club-Root-Prefetch + HydrationBoundary) + Provider-Request-Scoping (Finding 2). **EHRLICH: Fundament, KEIN LCP-Win** — Reviewer-F1: ClubContent gated alles hinter `authLoading` (SSR immer true) → Content nicht im HTML. Sichtbarer Win = **472 Server-Auth** (Anil-Go „Server-Auth jetzt").

## Zuletzt DONE
470 (49 FK-Indizes) live · D-19/D-07/D-06 Fakten-Reconcile (kein aktiver Bug) · D-03 Ist-Analyse + Baseline (98f1cfea/db6463b5).
