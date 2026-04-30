# Slice 261 Review — TanStack Query Persist-Cache

**Reviewer:** reviewer-agent (cold-context, 2-pass)
**Datum:** 2026-04-30
**Time-spent:** 32 min
**Verdict:** **CONCERNS-mergeable** → P1+P3 inline geheilt → effective PASS

## Spec-Coverage

- [x] AC-01 BESCOUT_QUERY_CACHE_v1 ref ≥ 1
- [x] AC-02 shouldDehydrateQuery + USER_SCOPED + UUID_REGEX
- [x] AC-03 SSR-Guard typeof window in useEffect
- [x] AC-04 QueryClientProvider unverändert (no children re-mount)
- [x] AC-05 tsc clean
- [x] AC-06 deps installed (@tanstack/react-query-persist-client + query-sync-storage-persister)
- [x] AC-07 Provider tests 25/25 PASS (post-Heal verifiziert)
- [x] AC-08 gcTime 24h aligned with persist maxAge
- [ ] AC-09 LIVE-VERIFY post-deploy

## Findings + Heal-Status

| # | Severity | Location | Issue | Heal |
|---|----------|----------|-------|------|
| 1 | **P1** | QueryProvider.tsx USER_SCOPED_DOMAINS | 4 fehlende inline-keyed user-scope-Domains: `home`/`streaks`/`wildcards`/`rankings`. Layer-3 UUID-regex unreliable wenn `user?.id` undefined während Auth-Race | **HEALED inline** — 4 Domains hinzugefügt + Audit-Command-Comment + Inline-Source-References |
| 2 | P2 | Architektur Denylist-vs-Allowlist | Defensive default sollte umgekehrt sein (Allowlist nur explizit public-domains) | **DEFER post-Beta** — größere architektonische Frage, Denylist + UUID + status-success ist defensiv genug nach P1-Fix |
| 3 | P2 | queryClient.ts gcTime 24h | Memory-Bloat-Risk bei Tab-stayer (50-100 queries × 24h) | **ACCEPT-AS-DESIGNED** für Beta-Day-2. Post-Beta Sentry-Telemetrie + reduce zu 30min |
| 4 | P2 | qk.posts.list/qk.research.list user-id in Object-Value | Layer-3 fängt UUID-strings via JSON.stringify aktuell, fragil bei zukünftiger UUID-v5/v7-Migration | **DEFER post-Beta** — qk-Schema-Refactor required |
| 5 | **P3** | QueryProvider.tsx persist-init catch | console.error ohne Sentry-Observability → silent degradation in Privacy-Mode | **HEALED inline** — Sentry.captureException mit tags |
| 6 | P3 | DevTools-import gated by NODE_ENV | Tree-shake-Risk in prod-bundle | **DEFER post-Beta** — `pnpm run analyze` (ANALYZE=true) Verify |
| 7 | P3 | AC-Audit cosmetic whitespace | Nur Cosmetic | KEIN Action |

## Cross-User-Leak-Surface (Reviewer Pflicht-Audit)

**Verifizierte Bedeckung:**
- 28 qk-Factory user-scope-Domains → in Layer 2 USER_SCOPED Set ✓
- 4 inline-keyed user-scope-Domains → **JETZT in Layer 2 USER_SCOPED Set ✓** (P1-Heal)
- ~10 user-scope-Keys mit UUID-args (clubs.isFollowing, equipment.inventory, etc.) → Layer 3 UUID-regex fängt ✓
- posts.list / research.list mit user-id-in-object → Layer 3 fängt via JSON.stringify ✓
- Status-success-only Layer 1 catches in-flight + error-state queries

**Layer-3-Limit verifiziert:** UUID-regex `[0-9a-f]{8}-[0-9a-f]{4}-...` matched valid v1/v4 UUIDs. `user?.id === undefined` während Auth-Race → key wird `[..., undefined]` → JSON.stringify drops slot → KEIN UUID-match → would persist. **DAS war P1-Lücke** für `home`/`streaks`/`wildcards`/`rankings`. Layer-2 Backup jetzt drin → safe.

## Cascade Slice 260 queryClient.clear() — verifiziert

`AuthProvider.tsx:329` `queryClient.clear()` → persist subscribed via QueryCache events → cache cleared in localStorage nach throttleTime (1s). 1s race-window mitigated durch:
1. Layer 1 status-success-only (User-B in-flight queries nicht persisted)
2. throttleTime 1s sub-perceptual
3. User-Switch-Detect cascading durch ALLE 3 Layer

**Risk residual LOW, akzeptabel für Beta.**

## Memory-Bloat-Risk gcTime 24h

Tab-stayer + 50-100 active queries × 5-50KB payload × 24h = bis zu 500MB worst-case. Persist-Lib gc'd nur localStorage, nicht Memory.

**Mitigation:** Post-Beta `gcTime: 30min` aligned mit MAX_AGE_MS. Persist restored aus localStorage trotzdem queries älter als 30min. Beta-Day-2 SW + Persist-UX-Win > Memory-Risk akzeptabel.

## Persist-Init-Race in Tests

useEffect läuft in jsdom (window existiert) → createSyncStoragePersister schreibt zu jsdom-localStorage → Side-effect persistiert. Wenn sequentielle Tests laufen + Test-A leakt persistierte queries → Test-B sieht stale. **Risk:** flaky tests in Zukunft.

**Status:** 25/25 PASS jetzt ist live-truth für Beta. **Defer Fix:** vitest.setup.ts `beforeEach(() => { window.localStorage.clear() })` ODER mock persist-Lib als no-op.

## persistQueryClient Return-Shape

`const [persistUnsubscribe] = persistQueryClient({...})` destructures only first array element. Funktional safe — `restorePromise` ignored, restore läuft trotzdem als side-effect. Component braucht nicht auf restore-completion warten weil queries stale-while-revalidate-handhaben.

## Spec-Quality-Check (Slice 211)

- ✓ Slice-Type Header, ACs greppable, Edge-Cases enumerated, Pre-Mortem 5 Szenarien
- ⚠ **Allowlist-vs-Denylist nicht in Open-Questions** (Spec sagt "Allowlist", Code implementiert Denylist) — vertretbar bei vollständiger Liste. P1-Heal löste die Lücke.
- ⚠ **"etc." in Spec Sektion 6** (DENY-list) wurde nicht systematisch aufgelöst → P1-Lücke entstand. Future: `grep -rn "queryKey:\\s*\\['" src/` als Pflicht-Audit-Command bei Cache-Filter-Slices.

## Knowledge-Capture-Vorschläge

**Pattern (memory/patterns.md candidate):**
> **qk-Factory ist NICHT single-source-of-truth für queryKeys** (Slice 261)
> Components inlinen oft `queryKey: ['domain', ...]` direkt statt qk-Factory zu nutzen (`['home', ...]`, `['streaks', ...]`, `['wildcards', ...]`, `['rankings', ...]`).
> Pflicht-Audit bei Cache-Filter-Slices: `grep -rn "queryKey:\\s*\\['" src/` damit ALLE first-keys gelistet werden, nicht nur qk-Factory.

**Pattern (memory/patterns.md candidate):**
> **Cross-User-Leak-Layer-3 (UUID-regex) hat undefined-uid-Lücke** (Slice 261)
> UUID-regex matched valid v1/v4. Wenn user-id `undefined` während Auth-Race, key wird `[..., undefined]` → JSON.stringify drops slot → kein UUID-match → defensive Layer 2 (USER_SCOPED domain set) muss greifen.

## Positive

- Defense-in-Depth-Architektur korrekt (3 Layer)
- Status-success-only Layer 1 elegant
- try/catch Privacy-Mode/Quota korrekt
- SSR-Guard in useEffect richtig
- persistUnsubscribe cleanup in return-function korrekt
- gcTime-Bump-Comment in queryClient.ts erklärt warum
- AC-Audit-File geliefert (kein Pre-Review-Memo nötig für S-Slice)
- P1+P3 Healing inline mit klaren Source-References-Comments

## Summary

Slice 261 architektonisch korrekt. P1 (4 fehlende inline-keyed domains) inline geheilt durch Hinzufügen + Audit-Command-Comment für Future-Maintenance. P3 (Sentry-capture) ebenfalls inline geheilt. P2-Findings sind post-Beta-Refactors (Allowlist-vs-Denylist, gcTime, qk-Schema). 25/25 Tests PASS, tsc clean.

**verdict:** CONCERNS-mergeable → effective PASS post-Heal
**findings:** 7 (1× P1 healed, 1× P3 healed, 5× defer post-Beta)
**time-spent:** 32 min reviewer + ~5 min Heal
