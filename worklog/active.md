# Active Slice

```
status: in-progress
slice: 474
title: Wallet/Tickets cached-placeholder SSR-safe — DER 472-Blocker-Fix (#418 weg)
size: XS
type: Service/Hook (SSR-Hydration-Korrektheit)
welle: W6 (Performance/Architektur)
stage: PROVE (Dev-Walk grün; Prod-Walk pending Deploy)
spec: inline (XS, via Dev-Repro root-caused)
proof: worklog/proofs/474-wallet-tickets-ssr-placeholder.txt
review: worklog/reviews/474-review.md (self-review, kein Money-Logic-Change)
```

## Lösung (CEO-Entscheid „Dev-Repro → gezielt fixen")
- Dev-Repro un-minifiziert: Mismatch = Wallet-Balance „12.501,47" im `<aside>`. `useWallet`/`useUserTickets` lasen localStorage-Mirror synchron als placeholderData → seit 472 (userId server-präsent) divergiert First-Render.
- **474 fixt es:** geteilter `useCachedPlaceholder`-Hook (post-mount-gated). **Dev-verifiziert: /market + /home #418/#423-FREI**, Wallet rendert korrekt. Money-Freshness-Gate unberührt.
- **473 (leagueScope) = korrekte aber tangentiale SSR-Härtung** (live, behalten). **472 (Seed) + 474 (Fix) = die funktionierende Lösung.**
- ⏭️ Prod-Deploy + finaler Prod-Walk (Console #418-frei + LCP-Win messbar + 2-Account-Switch) = letztes Gate.

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
