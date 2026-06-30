# Slice 472 — W6 Phase 2: Server-Auth-Hydration (der echte LCP-Win)

**Status:** SPEC (Design fertig) · **Größe:** M (Kern-Auth, P0-Risiko) · **Slice-Type:** Architektur (Auth/Performance) · **Welle:** W6 · **Scope:** CEO-Go Anil „Server-Auth jetzt" · **§3-adjazent (Auth)** · **Datum:** 2026-06-30

> Baut auf 471 (SSR-Prefetch-Fundament + request-scoped Provider). Liefert den sichtbaren LCP-Win: authed Pages rendern Content im SSR-HTML statt authLoading-Skeleton.

## 1. Problem-Statement
Reviewer-Finding 471-F1 (verifiziert): `ClubContent.tsx:179` + alle authed Pages gaten hinter `authLoading` (= AuthProvider `loading`), das server-seitig IMMER `true` ist (AuthProvider `useState(true)`, resolve via client-only `onAuthStateChange`). → SSR-HTML = Skeleton für ALLE. Der 471-Prefetch landet nicht im HTML. **Die 5-13s sind der eingeloggte Cold-Start** (Auth-Resolve-Netzwerk + dann erst Content).

## 2. Lösungs-Design
Session server-seitig lesen (Cookie ist via @supabase/ssr `createBrowserClient` server-lesbar; Middleware refresht sie schon) → `initialUser` als Prop an AuthProvider → seeden, sodass Server + Client-First-Paint übereinstimmen (kein Hydration-Mismatch) und `loading=false` für eingeloggte → authed SSR-Render zeigt Content.

**Kritischer Seed (AuthGuard-Interaktion beachtet):**
```ts
const [user, setUser] = useState<User|null>(initialUser ?? null);
const [loading, setLoading] = useState(initialUser == null);        // user bekannt → nicht loading
const [profileLoading, setProfileLoading] = useState(initialUser != null); // user da, profile lädt noch
```
→ AuthGuard (`if (!profile && !profileLoading) return skeleton`): mit profileLoading=true fällt es durch zu children (KEIN fälschlicher Onboarding-Redirect). Repliziert den Slice-264-„user-bekannt-profile-lädt"-Zustand (profile-abhängige Komponenten sind null-safe, audit-verifiziert in 264) — nur jetzt auch server-seitig.

**Warum kein Hydration-Mismatch:** `initialUser` ist ein PROP (server→client serialisiert), KEIN localStorage → Server-useState == Client-First-Render-useState. (Der 147-149-Kommentar verbietet localStorage-in-initializer; ein Prop ist explizit safe — Kommentar anpassen.)

## 3. Betroffene Files
| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/supabaseServer.ts` | NEU | Server-Supabase-Client (cookies() aus next/headers) + `getServerUser()` (getUser, validiert JWT) |
| `src/app/layout.tsx` | EDIT | `const initialUser = await getServerUser()` → an `<Providers>` |
| `src/components/providers/Providers.tsx` | EDIT | `initialUser`-Prop durchreichen an AuthProvider |
| `src/components/providers/AuthProvider.tsx` | EDIT | `initialUser`-Prop → 3 useState-Seeds (oben); Kommentar 147-149 präzisieren |

## 4. Code-Reading-Liste (erledigt)
- AuthProvider.tsx (voll gelesen): useState-Init 150-155, localStorage-Hydration-useEffect 265-281, onAuthStateChange 327-393, user-switch-detect 341-352. Seed-Punkte = die 3 useState. ✅
- AuthGuard.tsx:53-63 (Profile-Gate `!profile && !profileLoading`) → profileLoading-Seed nötig. ✅
- middleware.ts + supabaseMiddleware.ts: getUser() refresht Cookie auf protected Routes (Token-Refresh-Infra existiert). ✅
- layout.tsx: async RootLayout → Providers (client). ✅
- context7 @supabase/ssr Server-Client + RSC-cookies-Pattern (setAll no-op in RSC) — **vor Build verifizieren**.

## 5. Pattern-References
- @supabase/ssr: RSC kann keine Cookies setzen → `setAll` no-op/try-catch; Middleware macht Refresh (existiert).
- 471 getServerQueryClient (cache()) — analoges per-Request-Server-Pattern.
- Slice 264 (AuthGuard nur `loading`, nicht profileLoading; profile-Komponenten null-safe) — der Seed repliziert genau diesen Zustand server-seitig.

## 6. Acceptance Criteria
```
AC-01: [PERF] LCP einer EINGELOGGTEN Hot-Page (z.B. /club logged-in ODER /market) sinkt messbar
  VERIFY: chrome-devtools perf-trace LOGGED-IN vorher/nachher (Login-Session nötig)
  EXPECTED: Content im SSR-HTML, Auth-Skeleton-Fenster weg, LCP deutlich < logged-in-Baseline
  FAIL IF: LCP unverändert
AC-02: [REGRESSION-KRITISCH] Auth bricht NICHT — über mehrere authed Pages live:
  - Login/Logout funktioniert · kein fälschlicher Onboarding-Redirect · kein User-A-sieht-User-B
  - kein Hydration-Mismatch-Error in Console (über home/market/player/club/fantasy)
  - logged-out: unverändert (initialUser=null → loading=true → wie bisher)
AC-03: [TYPECHECK] tsc grün
AC-04: [SECURITY §3] getServerUser nutzt getUser() (validiert JWT, nicht nur getSession); initialUser enthält keine Tokens (nur User-Profil)
```

## 7. Edge Cases
| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | logged-out (kein Cookie) | initialUser=null → loading=true → SSR-Skeleton (wie bisher) | seed `loading=(initialUser==null)` |
| 2 | Cookie da, profile noch nicht geladen | AuthGuard fällt durch (profileLoading=true), Content rendert, profile-Komponenten null-safe | profileLoading-Seed |
| 3 | localStorage cached User ≠ Cookie-User (stale) | user-switch-detect (onAuthStateChange) clear+korrigiert | bestehende Logik 341-352 |
| 4 | Cookie expired/invalid | getUser() liefert null → initialUser=null → loading=true | getUser validiert |
| 5 | Token-Refresh in RSC nötig | RSC kann Cookie nicht setzen → setAll no-op; Middleware refresht | dokumentiertes @supabase/ssr-Pattern |
| 6 | initialUser serialisiert in HTML | nur User-Profil (id/email/metadata), KEINE Tokens (in Cookie) | getUser-Shape, §3-Check |

## 8. Self-Verification
```bash
npx tsc --noEmit
# Live LOGGED-IN (jarvis-qa@bescout.net): perf-trace + Console-Scan (kein Hydration-Error) über home/market/player/club/fantasy
# Login/Logout-Zyklus + 2-Account-Switch (User-A→User-B kein Daten-Leak)
```

## 10. Proof-Plan
LCP logged-in vorher/nachher + Console-clean über 5 authed Pages + Login/Logout/Switch-Walk → `worklog/proofs/472-*.txt/png`. Reviewer (Cold-Context, Auth-Fokus) PFLICHT.

## 11. Scope-Out
- Public-club-logged-out SSR (separater Fix: public-View vom authLoading entkoppeln) · weitere Page-Prefetches (Phase 3) · Image-Optim (P2).

## 12. Stage-Chain
SPEC → IMPACT (Auth-Consumer: alle useUser-Caller — Seed ändert nur Initial-State, kein Contract) → BUILD (4 Files, einzeln tsc) → REVIEW (reviewer Auth-Fokus PFLICHT) → PROVE (logged-in Messung + Regression-Walk) → LOG

## 13. Pre-Mortem (P0-Risiko Kern-Auth)
| # | Failure | Mitigation | Detection |
|---|---------|------------|------------|
| 1 | Hydration-Mismatch (server-content vs client-skeleton) | Prop-Seed (identisch server/client), NICHT localStorage | Console Hydration-Error, AC-02 |
| 2 | Fälschlicher Onboarding-Redirect (profile=null seed) | profileLoading=true-Seed → AuthGuard fällt durch | AC-02 Live-Walk |
| 3 | User-A-sieht-User-B (stale localStorage vs cookie) | user-switch-detect bestehend; Cookie ist Wahrheit | AC-02 2-Account-Switch |
| 4 | Auth komplett gebrochen (Login/Logout) | onAuthStateChange unverändert (nur Initial-State geseedet); Reviewer | AC-02 Login/Logout |
| 5 | getUser-Latenz erhöht TTFB (2× mit Middleware) | akzeptabel; ggf. später via Middleware-Header optimieren | perf-trace TTFB |
| 6 | initialUser leakt Tokens ins HTML | getUser liefert nur User-Profil; Tokens bleiben im Cookie | §3-Check AC-04 |

## Open Risiko (§1 caution)
Kern-Auth-Pfad, P0-bei-Fehler (Auth-Break trifft ALLE). Der Code-Change ist klein (Prop + 3 Seeds + 1 Server-Helper + Layout-Wire), aber die INTERAKTIONEN (AuthGuard-Profile-Gate, localStorage-Hydration, Hydration-Mismatch über alle authed Pages) brauchen sorgfältige Live-Regression-Verifikation (mehrere Pages, Login/Logout, 2-Account-Switch) + Cold-Context-Reviewer. NICHT als Quick-Build rushen.
