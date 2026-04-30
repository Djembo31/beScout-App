# Slice 259 Review — Service Worker Cache-Pollution Heal

**Reviewer:** reviewer-agent (cold-context)
**Datum:** 2026-04-30
**Time-spent:** 18 min
**Verdict:** **PASS** (CONCERNS-mergeable wenn man P3-Nitpicks ernst nimmt)

## Spec-Coverage

- [x] AC-01 SECURITY (no Supabase REST cache): VERIFIED — 0 refs to `supabase.co` / `rest/v1` in active code
- [x] AC-02 STATIC_CACHE_PATTERNS intact: VERIFIED — 2 refs (definition + usage)
- [x] AC-03 push handler intact: VERIFIED — push + notificationclick byte-identical zu pre-edit
- [x] AC-04 offline.html intact: VERIFIED — 2 refs, public/offline.html exists
- [x] AC-05 cache-bump v3→v4: VERIFIED
- [x] AC-06 cleanup-filter catch-all: VERIFIED — `keys.filter(k => k !== CACHE_NAME)` evicts ALLE legacy caches inkl. `bescout-api-v1`, `bescout-v3`
- [x] tsc clean: PASS
- [ ] AC-07 LIVE-VERIFY post-deploy: deferred (correct — manual)

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | P3 (Nitpick) | `public/sw.js:42` | Comment sagt "explicitly deleted" aber Implementation ist catch-all-filter | Comment präzisieren: "is deleted by the catch-all filter" |
| 2 | P3 (Defense) | `public/sw.js:85-87` | Fehlt explicit `return;` am Ende fetch-handler — implicit OK aber defensive bei zukünftigen Edits | Add `return;` |
| 3 | P2 (Accept) | `public/sw.js:39-50` | `clients.claim()` cancel'd in-flight requests bei Tab-mid-deploy. Pre-mortem akzeptiert — 3 Tester risk | accept-as-designed |

## Pflicht-Audit-Ergebnisse

**Spec-Quality:**
- ACs greppable (alle 6 mit `grep -c` + numeric expected): PASS
- Edge-cases enumerated (7 cases, install/returning/push/offline/chunk/race/privacy): PASS
- Pre-mortem voluntarily added (5 Szenarien) trotz S-Slice-optional: korrekte Judgement-Call für Live-Tester-Risk: PASS
- Pattern-References zitieren richtige Precedents (errors-db.md Auth-Race, D40-D43, performance.md getWallet): PASS

**Smoking-Gun-Confirmation:**
Removing the Supabase-REST cache ist KORREKT, keine defensible JWT-keyed-cache Alternative:
1. Cache API keyed by URL only — Auth-Header nicht parseable als Cache-Key ohne fragile Workarounds
2. TanStack Query ist der richtige Layer (JWT-aware via Supabase-Client + per-user query-keys + auth-state-change-Invalidation)
3. performance.md sagt explizit `getWallet()` NICHT cachen — SW überrode das wholesale
4. D40-D43 Auth-State und Data-Cache must be consistent — SW war forgotten blind-spot

JWT-keyed Alternative wäre möglich aber complexity-to-benefit-Ratio schlecht. Subtraktiv ist richtig.

**Production-Readiness:**
- Push-Notifications: byte-identisch, PushManager-Subscriptions in Browser-PushManager nicht in Cache-Storage
- Cache-Migration: catch-all-filter robuster als alter whitelist-pattern (würde gotcha gewesen sein)
- 0 active Supabase-Refs (2 in comments, dokumentiert)
- Race-Conditions: standard PWA-pattern, einzige edge case ist in-flight-cancel — accepted in pre-mortem

**Slice-Out-Verification:**
- Slice 260 (sessionStorage→localStorage): real follow-up, secondary effect, not punted core
- Slice 261 (TanStack persist + RSC hydrate): real follow-up, RootLayout-Touch-Risk justified post-Beta

## Positive Highlights

- Pure subtractive fix — 25/25 ins/del nahezu alle comment-rewrites + removal des cache-blocks. Zero net new logic. Lowest-risk possible.
- Cache-bump strategy bulletproof (catch-all ohne API_CACHE whitelist evicts ALLE legacy caches reliably)
- Slice-Number + WHY-comments am SW-File-Top — exemplarische Documentation für künftige Wartung
- Pre-Mortem voluntarily added despite S-optional — Live-Tester-Risk-bewusst
- AC-Audit-Proof structured + greppable

## Knowledge-Capture-Vorschläge (Knowledge-Flywheel)

**Für `errors-frontend.md` (oder neue `errors-pwa.md`):**
> **Service Worker Cache muss JWT-aware sein oder authenticated-Endpoints überhaupt nicht cachen** (Slice 259):
> Cache-API keyed by URL only. Auth-Header nicht Teil des Keys. Cachen von authenticated Endpoints (Supabase REST) → cross-auth-pollution + stale-on-first-load + cross-user-leak-Risiko.
> Fix: SW cached nur unauthenticated static assets. Authenticated Daten-Cache gehört in TanStack Query.
> Symptom-Decoder: User-Report "Refresh fixt App-Load" → SW serviert stale Anon-Response → background-fetch füllt Cache → 2. Load fresh.
> Detection: Chrome DevTools Network → reload → Source-Spalte filtern auf `(ServiceWorker)` für `*.supabase.co/rest/v1/*`.

**Für `memory/patterns.md`:**
> **Cache-Bump + Catch-All-Filter im activate-handler** als Standard-Migration-Path bei SW-Updates: `bescout-vN → vN+1` + `caches.keys().filter(k => k !== CURRENT).map(caches.delete)` evicts ALLE legacy caches inkl. uncoupled API-caches reliably.

**Für `memory/decisions.md`:** D-new "Service Worker Cache-Strategie: nur Static-Assets" — codify decision so it doesn't drift back.

## Summary

Slice 259 ist vorbildlicher EMERGENCY-Fix: subtraktiv, low-risk, AC-greppbar, voluntary Pre-Mortem für Live-Tester-Schutz. Smoking-Gun-Identifikation korrekt (URL-keyed-Cache ohne JWT-Awareness fundamental unsafe für authenticated APIs). Cache-Migration via catch-all-filter robust. Push-Notifications + Static-Caching + Offline-Fallback bewahrt. Keine Regression-Surface. Ready für Commit + Push.

**verdict:** PASS
**findings:** 3 nitpicks (1× P2 accepted, 2× P3 fixable trivially)
**time-spent:** 18 minutes
