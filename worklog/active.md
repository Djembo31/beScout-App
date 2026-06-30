# Active Slice

```
status: in-progress
slice: 472
title: W6 Phase 2 — Server-Auth-Hydration (der echte LCP-Win)
size: M
type: Architektur (Auth/Performance) — P0-Risiko Kern-Auth
welle: W6 (Performance/Architektur)
stage: PROVE
spec: worklog/specs/472-server-auth-hydration.md
proof: worklog/proofs/472-server-auth-hydration.txt
review: worklog/reviews/472-review.md
proof-status: BUILD+REVIEW+static-de-risk ✓ · Live-Walk pending Deploy (Gate, F1)
review-verdict: CONCERNS — Code korrekt auf 8 Achsen, F2 gefixt, Gate = Live-Walk
```

## Build-Korrekturen ggü. Spec (Faktencheck vor BUILD)
- **File #1 umbenannt:** `supabaseServer.ts` existiert bereits (Anon-Route-Handler-Client, Consumer: api/players + api/events) → NEU = `src/lib/supabaseServerAuth.ts` (`getServerUser()`, createServerClient + cookies()).
- **P0-Härtung (über Spec hinaus):** AuthProvider localStorage-Hydration nur anwenden wenn `cachedUser.id === initialUser.id` — verhindert transienten User-A→B→A-Flash bei stale Cross-User-Cache (Pre-Mortem #3).
- context7 @supabase/ssr RSC-Pattern verifiziert: setAll try/catch no-op (RSC read-only), Middleware refresht. getUser() validiert JWT.

## Letzter Slice DONE
471 (W6 SSR-Prefetch-Fundament + Provider-Request-Scoping) — live `3653bd31`, no-regression smoke-verifiziert (bescout.net lädt, kein Hydration-Error).

## ⏭️ NÄCHSTE SESSION — direkt Slice 472 (Server-Auth, Spec ready)
**CEO Anil: „Server-Auth jetzt" → als fokussierter nächster Schritt.** Spec `worklog/specs/472-server-auth-hydration.md` ist vollständig + ausführungsbereit. Der echte LCP-Win. **Kern-Auth-Pfad = P0-Risiko** → volle Verifikation Pflicht (logged-in Messung + Multi-Page-Regression-Walk + Login/Logout/2-Account-Switch + Cold-Context-Reviewer). 4 Files: supabaseServer.ts (NEU), layout.tsx, Providers.tsx, AuthProvider.tsx. Seed: `user=initialUser, loading=(initialUser==null), profileLoading=(initialUser!=null)` (AuthGuard-Profile-Gate beachtet).
