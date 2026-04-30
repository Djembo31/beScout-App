# Slice 260 — Auth-Hydrate Hardening (P1, Beta-Day-2)

**Status:** SPEC · **Größe:** S · **Slice-Type:** UI (Provider Hooks) · **Scope:** CTO · **Datum:** 2026-04-30

---

## 1. Problem Statement

Slice 259 hat die SW-Cache-Pollution (Smoking-Gun #1) geheilt. Vom Deep-Dive bleiben 2 sekundäre Effekte die "First Load slower than ideal" verursachen:

**Smoking-Gun #5: `sessionStorage` statt `localStorage` für Auth-Cache**
- `AuthProvider` cached `bs_user/bs_profile/bs_platform_role/bs_club_admin` in `sessionStorage` (4 Keys)
- `ClubProvider` cached `bescout-active-club` in `sessionStorage` (1 Key)
- **`sessionStorage` ist tab-isoliert** — neuer Tab oder direkter URL-Visit → kein cache → AuthProvider startet `loading=true` → Skeleton 500ms-3s
- **`localStorage`** würde tab-übergreifend warmen Cache liefern → Returning-User mit anderem Tab sieht **instant** statt Skeleton

**Smoking-Gun #7: Welcome-Bonus + ActivityLog feuern auf Mount**
- `(app)/layout.tsx:43-48` `claimWelcomeBonus()` triggert direkt nach Auth
- `(app)/layout.tsx:29-40` `logActivity('page_view')` mit nur 1s `setTimeout` Debounce
- Beide adden zur Render-Race-Surface beim Mount
- Sollten in `requestIdleCallback` (mit setTimeout-Fallback) → off-critical-path

**Wer betroffen, wie oft?** Returning-User die `bescout.net` in neuem Tab öffnen, oder via External-Link visitieren (Email, Social-Share). Wahrscheinlich 50-100% der Beta-Tester ab Tag 2.

## 2. Lösungs-Design (Architektur)

### 2a. sessionStorage → localStorage Migration

**Vor:**
```
sessionStorage: {
  bs_user, bs_profile, bs_platform_role, bs_club_admin (AuthProvider)
  bescout-active-club (ClubProvider)
}
```
Tab-isoliert. Window-close = weg.

**Nach:**
```
localStorage: {
  bs_user, bs_profile, bs_platform_role, bs_club_admin (AuthProvider)
  bescout-active-club (ClubProvider)
}
```
Tab-übergreifend. Persistent über Browser-Sessions.

**Cross-User-Pollution-Mitigation (NEU):**

Da localStorage cross-Browser-Session persistiert, kann nach Tab-Crash ohne SIGNED_OUT-Event ein User A's Cache mit einer User B's Session colliden. Mitigation in onAuthStateChange:

```ts
if (u && u.id) {
  const cachedUserId = lsGet<User>(LS_USER)?.id;
  if (cachedUserId && cachedUserId !== u.id) {
    // User-Switch detected — clear stale cache before setting new state
    lsClear();
    queryClient.clear();
  }
  setUser(u);
  lsSet(LS_USER, u);
  // ... rest of handler
}
```

### 2b. Welcome-Bonus + ActivityLog → requestIdleCallback

**Vor:**
```ts
// (app)/layout.tsx:42-48
useEffect(() => {
  if (!user || bonusClaimed.current) return;
  bonusClaimed.current = true;
  claimWelcomeBonus().catch(...);
}, [user]);

// activity-log: setTimeout(... 1000)
```

**Nach:**
```ts
useEffect(() => {
  if (!user || bonusClaimed.current) return;
  bonusClaimed.current = true;
  const trigger = () => claimWelcomeBonus().catch(...);
  if ('requestIdleCallback' in window) {
    requestIdleCallback(trigger, { timeout: 5000 });
  } else {
    setTimeout(trigger, 1000);
  }
}, [user]);
```

ActivityLog gleiche Pattern (idle statt setTimeout 1000).

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/components/providers/AuthProvider.tsx` | EDIT | 4 Helpers `ssGet/ssSet/ssClear` → `lsGet/lsSet/lsClear` (rename). Plus 1 neuer User-Switch-Detect-Block in onAuthStateChange. |
| `src/components/providers/ClubProvider.tsx` | EDIT | 2 Helpers `ssGetClub/ssSetClub` → `lsGetClub/lsSetClub` (rename). Existing `storedStillValid`-Check bleibt (Cross-User-Session-Schutz). |
| `src/app/(app)/layout.tsx` | EDIT | Welcome-Bonus + ActivityLog in `requestIdleCallback` mit setTimeout-Fallback |

**Greppen vor Edit:**
- `grep -rn "sessionStorage" src/` — alle anderen Konsumenten?
- `grep -rn "claimWelcomeBonus\|logActivity" src/` — bestehende Caller-Stellen?

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/components/providers/AuthProvider.tsx` (full) | Existing flow verstehen | Welche Race-Conditions sind dokumentiert? loadProfile fallback chain? |
| `src/components/providers/ClubProvider.tsx` | activeClub-Hydrate-flow | `storedStillValid`-Check bleibt — verifizieren dass localStorage gleiche Semantik liefert |
| `src/components/providers/__tests__/AuthGuard.test.tsx` | Existing test-coverage | Was wird mocked? sessionStorage muss in localStorage gemockt werden |
| `src/components/providers/__tests__/ClubProvider.test.tsx` | Existing test-coverage | sessionStorage-Mocks in Tests |
| `src/components/providers/__tests__/Providers.test.tsx` | Provider-Cascade-Test | Verständnis des Mounting-Orders |
| `.claude/rules/errors-frontend.md` "i18n-Key-Leak" + "Filter-as-audience-choice" | Bekannte Frontend-Fallen | Nicht direkt relevant, aber pattern-awareness |
| `.claude/rules/performance.md` | Query-Performance-Regeln | requestIdleCallback ist non-blocking-pattern |

## 5. Pattern-References

- **D40-D43 (Slice 192/193):** Auth-State und Data-Cache müssen consistent sein. localStorage erweitert die Window in der Drift-möglich-ist (cross-tab) — daher User-Switch-Detect-Mitigation pflicht.
- **errors-db.md "PostgREST nested-select Auth-Race":** JWT-Awareness bleibt clientseitig kritisch. localStorage ändert nichts daran (TanStack Query clear bleibt).
- **Pattern #40 (Slice 259):** SW-Cache-Strategie. localStorage ist parallel — nicht in SW. Konsistent mit "TanStack Query handhabt JWT-aware Cache".
- **D45 (Hooks > Text-Regeln):** N/A für diesen Slice.
- **AuthProvider.tsx:133-135 inline-Comment:** "Never read sessionStorage in useState initializers — hydration mismatch (server=loading, client=cached). Instead, always start as loading and hydrate from cache in useEffect." — Diese Regel **gilt 1:1 weiter für localStorage**. SSR-Guard pflicht.

## 6. Acceptance Criteria

```
AC-01: [HAPPY] sessionStorage-Refs in AuthProvider migriert zu localStorage
  VERIFY: grep -c "sessionStorage" src/components/providers/AuthProvider.tsx
  EXPECTED: 0
  FAIL IF: > 0

AC-02: [HAPPY] sessionStorage-Refs in ClubProvider migriert zu localStorage
  VERIFY: grep -c "sessionStorage" src/components/providers/ClubProvider.tsx
  EXPECTED: 0
  FAIL IF: > 0

AC-03: [SECURITY] User-Switch-Detect-Block existiert
  VERIFY: grep -A3 "cachedUserId.*!==.*u\.id" src/components/providers/AuthProvider.tsx
  EXPECTED: Block calls lsClear() + queryClient.clear() before setUser
  FAIL IF: missing

AC-04: [REGRESSION] Tests grün
  VERIFY: pnpm exec vitest run src/components/providers/
  EXPECTED: All tests pass
  FAIL IF: any failure

AC-05: [BUILD] tsc clean
  VERIFY: pnpm exec tsc --noEmit
  EXPECTED: exit 0
  FAIL IF: type errors

AC-06: [PERF] Welcome-Bonus + ActivityLog idle-deferred
  VERIFY: grep -c "requestIdleCallback" src/app/(app)/layout.tsx
  EXPECTED: 2 (welcome-bonus + activity-log)
  FAIL IF: < 2

AC-07: [REGRESSION] SSR-Guard intakt (typeof check für localStorage)
  VERIFY: AuthProvider lsGet/lsSet/lsClear haben try/catch oder typeof window check
  EXPECTED: existing pattern (try/catch) übernommen
  FAIL IF: SSR-crash bei Build

AC-08: [LIVE-VERIFY] Post-Deploy: Cross-Tab-Cache funktioniert
  VERIFY: bescout.net in Tab 1 → login → bescout.net in Tab 2 → instant render (kein Skeleton)
  EXPECTED: localStorage wird in beiden Tabs gelesen
  FAIL IF: Tab 2 zeigt Skeleton wie kalt-start
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | SSR | Server-Render | `typeof window === 'undefined'` | Helpers nicht crashen | try/catch (existing) deckt es ab |
| 2 | Private-Browsing | localStorage throws SecurityError | Safari Private | Fallback: kein cache, normales loading | try/catch loggt, returns null |
| 3 | Quota-Exceeded | localStorage > 5MB | Edge case | Catch in lsSet, log, kein crash | try/catch (existing) |
| 4 | User-Switch (Login B nach Logout A nicht-cleared) | localStorage hat User A's Cache, Session ist User B's | localStorage.bs_user.id !== session.user.id | lsClear + queryClient.clear vor setUser | NEU in 260 |
| 5 | Tab-Crash mid-session | localStorage persistiert, kein SIGNED_OUT | Returning-User | onAuthStateChange feuert mit aktueller Session, User-Switch-Detect catched stale | #4 mitigation deckt es ab |
| 6 | Tab-1 logout, Tab-2 weiter offen | Tab-2 sieht User A weiterhin in localStorage bis next event | Cross-Tab-Race | onAuthStateChange feuert in beiden Tabs (Supabase-Cookie-based) → Tab-2 kriegt SIGNED_OUT | Existing supabase.auth.onAuthStateChange |
| 7 | requestIdleCallback unsupported | Safari < 16.4 | typeof check | setTimeout 1000 fallback | Code-Pattern dokumentiert |
| 8 | Welcome-Bonus + ActivityLog still-firing-on-page-leave | Idle-callback never triggered before unload | Bonus-Claim verzögert | claim ist idempotent (existing PK constraint), nächster Visit holt nach | Akzeptabel |

## 8. Self-Verification Commands

```bash
# AC-01/02 sessionStorage migration
grep -c "sessionStorage" src/components/providers/AuthProvider.tsx
grep -c "sessionStorage" src/components/providers/ClubProvider.tsx
# Beide expected: 0

# AC-03 User-Switch-Detect
grep -B1 -A4 "cachedUserId" src/components/providers/AuthProvider.tsx

# AC-06 idle-callback
grep -c "requestIdleCallback" src/app/\(app\)/layout.tsx

# AC-04/05 Build + Tests
pnpm exec tsc --noEmit
pnpm exec vitest run src/components/providers/
# Pflicht-Tests:
# - AuthGuard.test.tsx (existing)
# - ClubProvider.test.tsx (existing)
# - Providers.test.tsx (existing)

# Rest of grep audit
grep -rn "sessionStorage" src/ --include="*.tsx" --include="*.ts" | grep -v __tests__ | head
# Expected: 0 (oder nur tests, die mocken)
```

## 9. Open-Questions

**Pflicht-Klärung (Anil):** keine — autonome Direktive aktiv.

**Autonom-Zone:**
- Helper-Naming (`lsGet/lsSet/lsClear` vs `localGet/localSet/localClear`) — gehe mit `lsGet` für minimalen Diff
- Welche `requestIdleCallback`-Timeout-Wert (ich wähle 5000ms)
- ob User-Switch-Detect zusätzlich Sentry-Breadcrumb-Event addet (ja, für Observability)

**Nicht-Autonom:**
- Money-Path: nicht betroffen (Welcome-Bonus ist Money-Path, aber nur Timing-Change, nicht Logic)
- RLS: nicht betroffen
- Wording: nicht betroffen

## 10. Proof-Plan

| Schritt | Artefakt |
|---------|----------|
| Pre-Edit | `git diff --stat` baseline |
| Post-Edit AC-Audit | `worklog/proofs/260-ac-audit.txt` (alle 7 lokale ACs) |
| Build + Tests | `worklog/proofs/260-tests.txt` (vitest-Output) |
| Live-Verify | `worklog/proofs/260-live-verify.md` (Cross-Tab-Test mit Playwright) |

## 11. Scope-Out

Explizit NICHT in Slice 260:

- **Cookie-Presence-Detection für SSR-optimistic-paint** → Slice 261 (mehr Aufwand, Server-Layout-Touch)
- **TanStack Query persistQueryClient** → Slice 261 oder Post-Beta (RootLayout-Touch)
- **`get_auth_state` als Server-Action im RSC RootLayout** → Slice 261 oder Post-Beta
- **Middleware Public-Route-Bail-Out** → Post-Beta (Edge-Function-Test-Aufwand)
- **AuthProvider 8s-Loading-Cascade-Reduktion** → Post-Beta (komplexere Refactor)

## 12. Stage-Chain

```
SPEC (this file)
  → IMPACT skipped (3 Files in src/components/providers + 1 in app/layout, kein src/lib/services, kein RPC, kein Schema)
  → BUILD (3 File-Edits + AC-Audit)
  → REVIEW (reviewer-Agent — Beta-Day-2 + Auth-Provider-Touch zwingt Cold-Context)
  → PROVE (AC-Audit + Build + Tests + Post-Deploy Cross-Tab-Live-Verify)
  → LOG (commit + push + log.md + active.md → idle)
```

## 13. Pre-Mortem (5 Szenarien — Auth-Provider-Touch Beta-Day-2)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | localStorage-Helper crasht in SSR (Build-time) | LOW | HIGH (App nicht deployed) | try/catch existing pattern, useEffect-only-Read (existing) | next build local |
| 2 | User-Switch-Detect-Block triggers fälschlich bei TOKEN_REFRESHED | MED | MED (cache-clear ohne Grund, Performance-Hit) | Block nur bei `event === 'SIGNED_IN'` UND `cachedUserId !== u.id` | Live-Verify Tab-Behavior |
| 3 | Bonus-Claim never fires weil idle-callback never gets idle | LOW | LOW (idempotent, nächster Visit) | timeout: 5000ms forced fire, plus setTimeout-fallback | Sentry-User-Filter on bonus-claim event |
| 4 | localStorage cleared bei Browser-Privacy-Settings → User wieder bei Skeleton | LOW | LOW (= status quo wie sessionStorage heute) | accept-as-designed, kein Regression | User-feedback |
| 5 | Cross-Tab-Sync gewünscht (Tab-1-Logout in Tab-2 nicht reflected) | LOW | LOW (existing supabase.auth.onAuthStateChange handhabt es via cookie-shared-session) | Existing pattern unverändert | Manual cross-tab-test |

---

## Compliance-Check

- $SCOUT/Money-Path: Welcome-Bonus ist Money-Path — Slice 260 ändert NUR Timing (mount → idle), nicht Logic. RPC-Call identisch. Idempotency-PK constraint existing.
- Wording: nicht betroffen.

## Open Risiko

**Risiko:** AuthProvider ist Core-Feature. Bug → User können nicht einloggen. **Mitigation 1:** Edit ist trivial (sessionStorage → localStorage rename). **Mitigation 2:** Reviewer-Agent als Cold-Context-Catch. **Mitigation 3:** AC-04 vitest-Suite hat existing AuthGuard + ClubProvider Tests die Mock-Storage testen — alle müssen weiter green.

**Confidence:** HIGH. Subtraktiv-additiv (rename + 1 neuer Block + 1 timing-Change), AC-greppbar, Pre-Mortem clear.
