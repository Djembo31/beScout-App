# Slice 262 — Middleware Public-Route-Bail-Out (P3, Beta-Day-2 Final-Final)

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Service (Edge Middleware) · **Scope:** CTO · **Datum:** 2026-04-30

---

## 1. Problem Statement

Smoking-Gun #4 vom Slice 259/260 Deep-Dive: `src/lib/supabaseMiddleware.ts:55-62` ruft `supabase.auth.getUser()` auf **JEDEM Request** — auch für true-anonymous Visits auf public Routes (`/welcome`, `/login`, `/auth/callback`, `/agb` etc.). +50-300ms TTFB pro Request, am häufigsten beim Landing-Page-Hit (Anil's Home-Page-Domain!).

**Wer betroffen, wie oft?** ALLE first-time-Visitors (kein Cookie) + alle anon-Browser auf public Pages. Beta-Tester: erste Visit nach Sign-up jeder Browser-Session-Reset.

**Anil-Direktive:** Slice 262 schließt das Kapitel "Beta-Day-2 Auth/Cache-Initialisierung". Plus: wirkt direkt für Anil's parallel-Home-Arbeit (TTFB-Win für Landing-Page).

## 2. Lösungs-Design

**Vor:**
```
Request →
  geo-tier cookie set →
  createServerClient + cookies-getAll →
  supabase.auth.getUser() ← 50-300ms RTT IMMER
  → public-route-check + admin-checks
```

**Nach:**
```
Request →
  geo-tier cookie set →
  ── NEW: Early Bail-Out ──
  isPublicRoute = publicRoutes.some(...)
  hasAuthCookie = request.cookies.some(c => sb-*-auth-token)
  if (isPublicRoute && !hasAuthCookie):
    return supabaseResponse  ← skip getUser RTT
  ──────────────────────────
  createServerClient + getUser() (only for auth'd or protected)
  → admin-checks
```

**Effekt:**
- True-Anon-Public-Visit (kein sb-cookie): 0× Supabase-RTT (war 1× = 50-300ms)
- Logged-in-User auf Public-Route: weiterhin getUser (RT-Sync für SSR-Auth-State, korrekt)
- Stale-but-present sb-cookie: weiterhin getUser (verifies stale-vs-valid token)
- Protected route ohne Cookie: weiterhin getUser → null → redirect /welcome (existing behavior)

**Trade-Off:** Wenn jemand mit altem `sb-*-auth-token` Cookie eine public Route besucht, läuft trotzdem die volle getUser-Roundtrip. Nur **true-Anon** profitieren. Das ist die korrekte UX-Wahl: anon-Visitor sieht Page schnell, logged-in-User sieht weiterhin korrekten Auth-State (Avatar, Logout-Button, etc.) auch auf public-Pages.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/supabaseMiddleware.ts` | EDIT | Bail-Out-Block einfügen vor createServerClient. Public-Routes-List nicht ändern (out-of-scope). |

**KEIN Touch:**
- `middleware.ts` (Routing-Wrapper unverändert)
- `src/app/layout.tsx` / `page.tsx` (Anil parallel — Home)
- `src/app/(app)/*` (Slice 260 just touched)
- Public-Routes-List bleibt wie sie ist (Erweiterung wäre Anil-CEO-Decision, separater Slice)

**Greppen vor Edit:**
- `grep -rn "publicRoutes" src/` — wo wird die Liste verwendet? Nur in supabaseMiddleware.ts → safe.

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/lib/supabaseMiddleware.ts` (full, 134 Zeilen) | Existing flow verstehen | Was darf NICHT ausfallen? geo-tier cookie + admin-checks |
| `middleware.ts` | Wrapper-Pattern | matcher pattern unverändert |
| `.claude/rules/errors-infra.md` | Edge-runtime Fallen | Vercel Edge-Function-Quirks bei cookie.getAll? |
| `memory/decisions.md` D40-D43 | Auth-State Consistency | Bail-Out darf logged-in-User auf Public-Page nicht zu anon werden lassen |
| `errors-db.md` "PostgREST Auth-Race" | JWT-Awareness | nicht direkt relevant — Edge-runtime |

## 5. Pattern-References

- **D40-D43:** Auth-State-Consistency. Bail-Out **nur bei beidem isPublicRoute+!hasAuthCookie** — andernfalls full getUser (consistency erhalten).
- **errors-infra.md "Vercel Hobby-Tier Silent-Build-Fail":** Edge-Function-Build muss clean. Pre-push verifies via vitest (Edge-runtime-Test? — defer).
- **Pattern #40 (Slice 259):** Cache nur für public/static. Analog: Auth-Round-Trip nur wenn nötig.

## 6. Acceptance Criteria

```
AC-01: [PERF] Bail-Out-Block in supabaseMiddleware
  VERIFY: grep -c "isPublicRoute && !hasAuthCookie" src/lib/supabaseMiddleware.ts
  EXPECTED: ≥ 1
  FAIL IF: 0

AC-02: [REGRESSION] Existing publicRoutes-List unverändert
  VERIFY: grep -A2 'publicRoutes = \[' src/lib/supabaseMiddleware.ts
  EXPECTED: ["/login", "/auth/callback", "/onboarding", "/welcome", "/club", "/pitch", "/blocked"]
  FAIL IF: list differs

AC-03: [REGRESSION] Existing admin-protection-block intakt
  VERIFY: grep -c "platform_admins" src/lib/supabaseMiddleware.ts
  EXPECTED: ≥ 2 (existing logic)

AC-04: [REGRESSION] Existing geo-tier cookie set
  VERIFY: grep -c "bescout-geo-tier" src/lib/supabaseMiddleware.ts
  EXPECTED: 1

AC-05: [BUILD] tsc clean
  VERIFY: pnpm exec tsc --noEmit
  EXPECTED: exit 0

AC-06: [LIVE-VERIFY] Post-Deploy: anon visit /welcome → kein Supabase /auth/v1/user Call in Network
  VERIFY: Playwright/curl Network-trace gegen bescout.net/welcome (incognito, kein Cookie)
  EXPECTED: 0 requests zu .supabase.co/auth/v1/user
  FAIL IF: ≥ 1 request
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | True-Anon | Visit /welcome ohne Cookie | isPublicRoute=true, hasAuthCookie=false | Bail-Out → 0× getUser RTT | by-design |
| 2 | Logged-In-Anon-Page | Logged-in user visits /welcome | isPublicRoute=true, hasAuthCookie=true | Skip bail-out → full getUser → SSR-Auth korrekt | by-design |
| 3 | Stale-Cookie | Anon mit altem sb-cookie visits /welcome | isPublicRoute=true, hasAuthCookie=true | Skip bail-out → getUser fails/null → trotzdem render (kein redirect bei public) | acceptable cost |
| 4 | Protected ohne Cookie | True-Anon visits /market | isPublicRoute=false, hasAuthCookie=false | Skip bail-out → getUser=null → redirect /welcome (existing) | by-design |
| 5 | Protected mit Cookie | Logged-in visits /market | isPublicRoute=false, hasAuthCookie=true | Skip bail-out → getUser → user → render | by-design |
| 6 | Geo-Block | TIER_BLOCKED country | independent of auth | Geo-redirect /blocked (existing, occurs BEFORE bail-out) | by-design |
| 7 | Cookie-Format-Drift | Supabase changes cookie naming | hasAuthCookie heuristic miss | Skip bail-out → full getUser → safe degrade | sb-*-auth-token has been stable since 2024 |
| 8 | Performance Edge-Race | Many concurrent anon hits | each does Bail-Out independently | Each saves 50-300ms RTT — load-balancer benefit | by-design |

## 8. Self-Verification Commands

```bash
# AC-01..04: grep audit
grep -c "isPublicRoute && !hasAuthCookie" src/lib/supabaseMiddleware.ts
grep -A1 "hasAuthCookie" src/lib/supabaseMiddleware.ts | head -5
grep -c "publicRoutes" src/lib/supabaseMiddleware.ts
grep -c "platform_admins" src/lib/supabaseMiddleware.ts
grep -c "bescout-geo-tier" src/lib/supabaseMiddleware.ts

# AC-05: build
pnpm exec tsc --noEmit

# Vercel Edge-build verify (optional, slow):
# pnpm next build  # check no Edge-runtime-incompat

# AC-06: live (post-deploy)
curl -sI https://www.bescout.net/welcome  # check response time
# Plus Playwright eval: navigator timing OR fetch /auth/v1/user check
```

## 9. Open-Questions

**Pflicht-Klärung:** Keine.

**Autonom-Zone:**
- Cookie-Detection-Heuristic (`sb-` prefix + `-auth-token` suffix) — Standard-Supabase-Pattern
- Bail-Out before/after geo-tier cookie set (nach — geo-tier ist cheap + nützlich für anon)

**Nicht-Autonom:**
- Public-Routes-List Erweiterung (`/agb`, `/datenschutz`, `/impressum` würden auch profitieren) → CEO-Decision, separater Slice
- Money-Path: nicht betroffen
- Wording: nicht betroffen

## 10. Proof-Plan

| Schritt | Artefakt |
|---------|----------|
| Pre-Edit | git diff baseline |
| Post-Edit AC-Audit | `worklog/proofs/262-ac-audit.txt` |
| Build | inline in audit |
| Live-Verify | `worklog/proofs/262-live-verify.md` (Playwright/curl: anon /welcome ohne /auth/v1/user) |

## 11. Scope-Out

- **Public-Routes-List Erweiterung** (`/agb`, `/datenschutz`, `/impressum`) → Anil-CEO-Decision, post-Beta wenn Anil entscheidet
- **Admin-Checks aus Middleware in RSC-Layout migrieren** → Architektur-Refactor, RootLayout-Touch, post-Beta
- **Sequential Loading-Cascade** (Smoking-Gun #3) → Architektur-Refactor, post-Beta
- **Server-Component RSC `get_auth_state` Auth-Hydrate** → defer post-Beta, RootLayout-Touch

## 12. Stage-Chain

```
SPEC → IMPACT skipped (1 File, kein RPC, kein Schema, additiv-only) → BUILD (1 File-Edit) → REVIEW (self-review D35 — Pattern-Wiederholung trivial logic, XS-Slice) → PROVE (AC-Audit + Build + Live-Verify) → LOG
```

**Reviewer-Skip-Begründung (D35):** XS-Slice mit additiver Bail-Out-Logic, kein Logic-Change im hot-path (existing flow unverändert für non-bail-out cases). Pattern-Wiederholung: gleiche "skip-if-not-needed"-Pattern wie Slice 259 (SW-Cache REST skip) und Slice 260 (idle-callback off-critical-path). Self-Review reicht.

## 13. Pre-Mortem (3 Szenarien — XS optional)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Cookie-Detection-Heuristic miss-classified | LOW | LOW (skip bail-out → full RT, safe degrade) | sb-*-auth-token Standard since 2024 | Sentry breadcrumbs at edge |
| 2 | hasAuthCookie true für Cookie-Garbage (z.B. sb-other-app-auth-token) | LOW | LOW (full getUser → null → safe) | Same domain isolation in browser | by-design |
| 3 | Edge-runtime Cookie-API differs from Vercel-spec | LOW | MED (Build-Fail) | tsc + Vercel build verify | next build local |

---

## Compliance-Check

- $SCOUT/Money: nicht betroffen
- Wording: nicht betroffen
- Money-Path: nicht betroffen

## Open Risiko

**Risiko:** Cookie-Detection auf `sb-*-auth-token`-Pattern ist heuristic. Wenn Supabase das Format ändert, Bail-Out fired weniger oft → Fallback zu existing-behavior (sicher). **Confidence:** HIGH.
