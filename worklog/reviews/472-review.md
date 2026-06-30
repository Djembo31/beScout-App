# Review — Slice 472 Server-Auth-Hydration

**Reviewer:** Cold-Context reviewer-Agent (Auth-Fokus) · **Datum:** 2026-06-30 · **time-spent:** 32 min

## Verdict: CONCERNS

Der Code in den 4 geänderten Files ist **korrekt** — Seed-Logik, `cacheMatchesSeed`-Guard, Token-Hygiene und RSC-Pattern halten allen 8 Prüf-Achsen stand. CONCERNS kommt **nicht** von einem Code-Defekt, sondern vom **Blast-Radius**: dieser Slice rendert erstmals den kompletten authed-Page-Content server-seitig. Statisch nicht clearbar. → **PASS, sobald der gemandatete Live-Walk grün ist** (proof: pending in active.md).

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | MEDIUM (PROVE-gated) | Blast-Radius: `layout.tsx:59` + `AuthGuard.tsx:61` Fall-through | **Erstmaliges SSR des gesamten authed-Surface.** Pre-472 short-circuitete AuthGuard für Logged-in auf `loading=true`→Skeleton; Page-Content wurde nie tief server-gerendert. Jetzt (loading=false, profileLoading=true) fällt AuthGuard zu `children` durch → jede authed Page (ClubContent, market, player, fantasy) rendert server-seitig. Provider sind SSR-clean (Browser-APIs nur in useEffect), ABER jede authed-Page-Komponente, die `window`/`localStorage`/`document`/Zustand-persisted-state **im Render** liest, wirft jetzt SSR-500 oder Hydration-Mismatch. Statisch nicht clearbar. | Der Live-Walk IST der Gate: home/market/player/club/fantasy gegen bescout.net, **Console-Scan auf Hydration-Error + MISSING_MESSAGE**, logged-in. Nicht mergen bevor grün. (Kein Code-Fix — Proof-Pflicht.) |
| 2 | LOW | `layout.tsx:54-59` | `getLocale`/`getMessages`/`getServerUser` sequenziell awaited, obwohl unabhängig. Logged-in: `getUser()` addiert ~50-150ms Auth-Roundtrip seriell auf TTFB. `getUser()` läuft 2× pro Request (Middleware Z.77 + Layout) — bewusster Tradeoff (Pre-Mortem #5). | `Promise.all([getLocale(), getMessages(), getServerUser()])`. Mittelfristig: User aus Middleware via Request-Header durchreichen statt 2× validieren. |
| 3 | LOW | `AuthProvider.tsx:405-417` (Seed-Interaktion) | **Transienter Server-valid/Client-null-Flash.** Schmales Fenster: getServerUser liefert User (Server), Client-onAuthStateChange feuert INITIAL_SESSION=null UND kein localStorage (`hadCachedUser=false`) → fällt in `else{clearUserState}`, authed-Content flasht→logged-out. Selten (server-valides Cookie ≈ client-valide Session via Middleware-Refresh). Kein kaputter State, nur Flash. | Akzeptabel as-is. Falls im Walk beobachtet: Grace-Zweig (Z.405) auf `(hadCachedUser \|\| initialUser)` erweitern. Nur wenn real. |

## Spec-Coverage
- [x] File #1 `supabaseServerAuth.ts` (NEU) — sauber von `supabaseServer.ts` getrennt
- [x] File #2 `layout.tsx` — initialUser → Providers
- [x] File #3 `Providers.tsx` — initialUser?-Prop durchgereicht
- [x] File #4 `AuthProvider.tsx` — 3 Seeds + Kommentar präzisiert
- [x] P0-Härtung über Spec hinaus: `cacheMatchesSeed`-Guard gegen Cross-User-Flash — korrekt
- [ ] AC-01/AC-02 (LCP-Win + Regression-Walk) — proof pending (= Finding #1, der eigentliche Gate)

## Detail-Belege je Achse (Kurzfassung)
1. **Hydration-Mismatch — kein Risiko.** Alle 3 Seeds aus dem `initialUser`-Prop (server==client). Kein localStorage in Initializern. `User` JSON-serialisierbar.
2. **Onboarding-Redirect — korrekt.** profileLoading=true → AuthGuard-useEffect (Z.30), Render (Z.61), useRequireProfile (Z.140) fallen alle durch. Redirect erst NACH loadProfile.
3. **User-A-sieht-User-B — geschlossen.** `cacheMatchesSeed` überspringt Cross-User-Cache; 2. Verteidigung user-switch-detect (Z.369). Guard tightened NUR bei aktivem Seed → Warm-Cache-Pfad (`!initialUser`) bit-genau unverändert.
4. **Token-Leak — keiner.** `getUser()` (validiert) statt `getSession()`; Return=User (id/email/metadata), Tokens bleiben im httpOnly-Cookie.
5. **File-Kollision — sauber.** auth-scoped vs anon, JSDoc dokumentiert Trennung.
6. **RSC-Pattern — korrekt.** setAll try/catch no-op; Route war via getLocale eh dynamic; fail-safe→null.
7. **Perf — kein Anon-Regress.** getUser() ohne Cookie short-circuited mit AuthSessionMissingError OHNE Netzwerk-Call.
8. **Deps — stabil.** loadProfile useCallback([]); initialUser referentiell stabil über Mount-Lifetime → kein Re-Subscription-Churn.

## Positive
- `cacheMatchesSeed`-Guard ist echter Catch (schließt A→B→A-Flash, lässt Warm-Cache-Pfad unangetastet).
- Token-Hygiene exemplarisch (getUser, dokumentiert, §3).
- Datei-Disziplin: existierender supabaseServer.ts nicht angefasst, neue Datei mit Abgrenzungs-JSDoc (§0 Schnitt-Regel).

## Learnings (Knowledge-Capture)
- **Neue Bug-Klasse `errors-frontend.md`:** „Server-Auth-Seeding aktiviert erstmaliges SSR des authed-Surface = Blast-Radius." Wenn ein Slice einen client-only gegateten Bereich (AuthGuard-Skeleton) server-seitig durchlässt, rendern dessen Page-Children erstmals im SSR → render-time `window`/`localStorage`/`document`/Zustand-persist = SSR-500/Hydration. DoD = Live-Walk über ALLE neu-SSR-Pages + Console-Scan. Familie von S397/398.
- **Pattern `memory/patterns.md`:** SSR-Auth-Seed via Prop (nie localStorage) + `cacheMatchesSeed`-Guard.

## One-Line
Würde ein Senior das so mergen? **Code ja — aber nicht ohne den Live-Walk:** eine P0-Auth-Änderung, die erstmals das gesamte authed-Surface SSRt, geht nicht auf Static-Review allein durch.
