# Active Slice

```
status: in-progress
slice: 473
title: leagueScopeStore SSR-safe — entblockt 472 authed-SSR (Hydration-Mismatch-Fix)
size: XS
type: Service/Store (SSR-Hydration-Korrektheit)
welle: W6 (Performance/Architektur)
stage: BUILD
spec: inline (XS, Pattern-klar SSR-safe)
proof: worklog/proofs/473-leaguescope-ssr.txt
review: self-review (XS, SSR-Init-Timing, kein Money/Security/Filter-Logik-Change)
```

## Inline-Spec 473
**Problem (Live-Walk 472 gefunden, Root-Cause Code+Runtime bestätigt):** `leagueScopeStore.ts:141` `const initialPersisted = readFromStorage()` seedet Store-Init aus localStorage bei MODUL-Init. Server (kein window) → `leagueName=''`; Client → cached `'Süper Lig'`. 472 rendert erstmals den authed Shell server-seitig → Liga-Selektor rendert `leagueName` → Server-`''` vs Client-`'Süper Lig'` = React #418 (5×) + #423 (voller Root-Re-Render) auf JEDER authed Page → **LCP-Win von 472 zunichte**.
**Fix:** Store init = Server-Defaults (null/''/''). Persistierter Pick via neue `hydrateFromStorage()`-Action in einem Client-Mount-Effect in ClubProvider (post-mount → First-Render server==client → kein Mismatch). Verhalten erhalten (persisted pick gewinnt vor Cascade via bestehendem Skip-Check).
**AC:** (1) tsc 0 (2) leagueScope-Tests grün (3) Re-Walk bescout.net logged-in: Console KEIN #418/#423 auf home+market+fantasy (4) Liga-Selektor zeigt nach Hydration korrekt „Süper Lig" (5) 472 LCP-Win jetzt messbar.
**Sibling-Scan:** nur leagueScopeStore liest localStorage bei Modul-Init (alle anderen in useEffect/Handler/lazy-Init) → kein Whack-a-Mole.

## Build-Korrekturen ggü. Spec (Faktencheck vor BUILD)
- **File #1 umbenannt:** `supabaseServer.ts` existiert bereits (Anon-Route-Handler-Client, Consumer: api/players + api/events) → NEU = `src/lib/supabaseServerAuth.ts` (`getServerUser()`, createServerClient + cookies()).
- **P0-Härtung (über Spec hinaus):** AuthProvider localStorage-Hydration nur anwenden wenn `cachedUser.id === initialUser.id` — verhindert transienten User-A→B→A-Flash bei stale Cross-User-Cache (Pre-Mortem #3).
- context7 @supabase/ssr RSC-Pattern verifiziert: setAll try/catch no-op (RSC read-only), Middleware refresht. getUser() validiert JWT.

## Letzter Slice DONE
471 (W6 SSR-Prefetch-Fundament + Provider-Request-Scoping) — live `3653bd31`, no-regression smoke-verifiziert (bescout.net lädt, kein Hydration-Error).

## ⏭️ NÄCHSTE SESSION — direkt Slice 472 (Server-Auth, Spec ready)
**CEO Anil: „Server-Auth jetzt" → als fokussierter nächster Schritt.** Spec `worklog/specs/472-server-auth-hydration.md` ist vollständig + ausführungsbereit. Der echte LCP-Win. **Kern-Auth-Pfad = P0-Risiko** → volle Verifikation Pflicht (logged-in Messung + Multi-Page-Regression-Walk + Login/Logout/2-Account-Switch + Cold-Context-Reviewer). 4 Files: supabaseServer.ts (NEU), layout.tsx, Providers.tsx, AuthProvider.tsx. Seed: `user=initialUser, loading=(initialUser==null), profileLoading=(initialUser!=null)` (AuthGuard-Profile-Gate beachtet).
