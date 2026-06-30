# Active Slice

```
status: idle
slice: 471
title: W6 Phase 1 — SSR-Prefetch-Fundament — DONE (live 3653bd31)
size: M
type: UI/Architektur (Performance)
welle: W6 (Performance/Architektur)
stage: LOG (done)
spec: worklog/specs/471-club-ssr-prefetch.md
proof: worklog/proofs/471-club-ssr-prefetch.txt
review: worklog/reviews/471-review.md (CONCERNS → F1 ehrlich umframt, F2 gefixt)
```

## Letzter Slice DONE
471 (W6 SSR-Prefetch-Fundament + Provider-Request-Scoping) — live `3653bd31`, no-regression smoke-verifiziert (bescout.net lädt, kein Hydration-Error).

## ⏭️ NÄCHSTE SESSION — direkt Slice 472 (Server-Auth, Spec ready)
**CEO Anil: „Server-Auth jetzt" → als fokussierter nächster Schritt.** Spec `worklog/specs/472-server-auth-hydration.md` ist vollständig + ausführungsbereit. Der echte LCP-Win. **Kern-Auth-Pfad = P0-Risiko** → volle Verifikation Pflicht (logged-in Messung + Multi-Page-Regression-Walk + Login/Logout/2-Account-Switch + Cold-Context-Reviewer). 4 Files: supabaseServer.ts (NEU), layout.tsx, Providers.tsx, AuthProvider.tsx. Seed: `user=initialUser, loading=(initialUser==null), profileLoading=(initialUser!=null)` (AuthGuard-Profile-Gate beachtet).
