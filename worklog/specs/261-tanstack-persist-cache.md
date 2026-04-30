# Slice 261 — TanStack Query Persist-Cache (P2, Beta-Day-2 Final)

**Status:** SPEC · **Größe:** S · **Slice-Type:** UI (Provider Hooks) · **Scope:** CTO (Bug-Class-Adjacent — Money-Path indirect via cache-strategy) · **Datum:** 2026-04-30

---

## 1. Problem Statement

Smoking-Gun #6 vom Slice 259/260 Deep-Dive bleibt offen: TanStack Query hat aktuell **keine Persistence**. Jeder neue Tab / neuer Browser-Session = kalter Query-Cache → alle Public-Static-Daten (Player-DB, Liga-Tabellen, Fixtures, Sponsors, Economy-Config) müssen neu gefetcht werden trotz unveränderter Source.

**Wer betroffen, wie oft?** ALLE returning-User die nach Tab-Close zurückkommen. Aktuelle Beta-Tester: jeden Tag mehrfach. Performance-Hit primär bei **public-Static-Data**, nicht authenticated.

**Anil-Direktive:** "damit das Kapitel zu haben" — Auth/Cache-Hardening-Story komplett abschließen.

**Constraint:** Anil arbeitet PARALLEL an Home-Page in anderem Terminal. **NICHT-Touch-Files:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(app)/page.tsx`, `src/app/(app)/layout.tsx`.

## 2. Lösungs-Design (Architektur)

**TanStack Query v5 `persistQueryClient` Function-Pattern** (nicht PersistQueryClientProvider, weil wir kein Re-Mount der Children riskieren wollen — children stable, persist subscribed via useEffect).

**Cache-Layer:** `localStorage` mit Key `BESCOUT_QUERY_CACHE_v1` (vN für version-bust bei breaking changes).

**SSR-Safety:** Persist-Init in `useEffect` mit `typeof window`-Guard, NICHT auf Module-Top-Level.

**Cross-User-Pollution-Prevention** (kritisch — wirkt zusammen mit Slice 260 User-Switch-Detect):
- `queryClient.clear()` aus Slice 260 cascaded automatisch zu localStorage (persist subscribes to QueryClient)
- Plus `dehydrateOptions.shouldDehydrateQuery` filter:
  - **DENY:** Jeder Key der eine UUID enthält (player-id, club-id, user-id — defensive: nicht zu unterscheiden ohne strukturiertes Schema)
  - **DENY:** User-Scope-Domains (holdings, wallet, orders, watchlist, transactions, social, predictions, etc.)
  - **ALLOW:** Public-Static-Data ohne UUID (players.all/names, leaderboard.top, fixtures.recentMinutes, economy.*, sponsors.*, system.cronHealth, etc.)

**Cache-Lifecycle:**
- `gcTime`: 24h (matches persist maxAge — querys nicht früher gc'd als persist sie wieder hydratet)
- `maxAge`: 30 Min (public-data driftet — 30 Min ist guter Trade-Off zw. UX und Frische)
- `buster`: `'v1'` (bei breaking changes inkrementieren)
- `throttleTime`: 1000ms (max 1× pro Sekunde Write zu localStorage)

**Trade-Off vs Status quo:**
- VORTEIL: Returning-User mit cache hat sofort Player-DB / Liga-Tabellen / Fixtures sichtbar (subjektiv "instant")
- KOSTEN: localStorage-Write throttled (1s), Read nur bei Mount, max 5 MB localStorage-Quota
- RISIKO Cross-User-Leak: defensiv mitigated durch Allowlist + Slice-260-User-Switch-Clear

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/components/providers/QueryProvider.tsx` | EDIT | persistQueryClient setup in useEffect, plus Sub/Unsub-Cleanup |
| `src/lib/queryClient.ts` | EDIT | gcTime 10min → 24h (matches persist maxAge — sonst gc'd queries werden nicht persisted) |
| `package.json` | EDIT | + `@tanstack/react-query-persist-client` + `@tanstack/query-sync-storage-persister` |
| `pnpm-lock.yaml` | EDIT | Auto-update von pnpm install |

**KEIN Touch:**
- `src/app/layout.tsx` (Anil parallel — Home)
- `src/app/page.tsx` (Anil parallel — Home)
- `src/app/(app)/layout.tsx` (Slice 260 just touched, parallel-safe Risk)
- `src/components/providers/AuthProvider.tsx` (Slice 260 just touched)
- `src/components/providers/Providers.tsx` (provider-cascade unverändert)

**Greppen vor Edit:**
- `grep -rn "QueryClientProvider" src/` — wo wird existing Provider verwendet? Nur QueryProvider.tsx → safe.
- Tests greppen `vi.mock('@/lib/queryClient'...)` — Tests sollten weiter mit existing mock-pattern funktionieren weil queryClient export unverändert ist.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/lib/queries/keys.ts` (full) | qk-Factory verstehen | Welche Keys haben UUIDs? Welche sind public-static? |
| `src/components/providers/QueryProvider.tsx` (current) | Baseline-Setup | Existing QueryClientProvider unverändert beibehalten |
| `src/lib/queryClient.ts` | Cache-Defaults | gcTime 10min muss auf 24h hoch |
| `src/components/providers/AuthProvider.tsx:320-330` | User-Switch-Detect (Slice 260) | queryClient.clear() cascading verifizieren |
| `package.json` | dependency-Versionen | Compatible mit @tanstack/react-query@5.90.21? |
| `.claude/rules/errors-frontend.md` "Filter-as-audience-choice" | Pattern-awareness | nicht direkt relevant |
| `memory/patterns.md` #41 | Cross-Tab-Cache mit User-Switch-Detect (Slice 260) | persistQueryClient verlängert das Pattern |
| `memory/decisions.md` D61 | SW-Cache-Strategie (Slice 259) | Konsistenz: SW = nur static-assets, persist = nur public-data |

## 5. Pattern-References

- **Pattern #40 (Slice 259):** SW-Cache-Strategie nur-Static-Assets — gleiche Philosophie für Persist-Cache (nur public-data, niemals authenticated)
- **Pattern #41 (Slice 260):** Cross-Tab-Cache mit User-Switch-Detect — persist-Cache wird durch queryClient.clear() automatisch mitgewipt
- **D61 (Slice 259):** SW-Cache nur-Static-Assets ARCHITECTURE — analog für persist-Cache: niemals user-specific RLS-Data
- **errors-db.md "PostgREST nested-select Auth-Race":** persistierte Public-Data kann veraltet werden, aber NIE mit user-id verbunden persisted → kein cross-user-Leak
- **performance.md "Query Performance":** `getWallet()` NICHT cachen — wallet hat eigene staleTime + ist user-scoped → automatisch ausgeschlossen via Allowlist

## 6. Acceptance Criteria

```
AC-01: [HAPPY] persist-Cache aktiv mit localStorage-Key
  VERIFY: grep -c "BESCOUT_QUERY_CACHE_v1" src/components/providers/QueryProvider.tsx
  EXPECTED: ≥ 1
  FAIL IF: 0

AC-02: [SECURITY] shouldDehydrateQuery filtert User-Scope-Domains
  VERIFY: grep -A20 "shouldDehydrateQuery" src/components/providers/QueryProvider.tsx
  EXPECTED: enthält USER_SCOPED set + UUID-regex
  FAIL IF: alles persistiert wird

AC-03: [SSR] persist-Init in useEffect, NICHT Module-Top-Level
  VERIFY: grep -B2 "createSyncStoragePersister" src/components/providers/QueryProvider.tsx
  EXPECTED: innerhalb useEffect-Body
  FAIL IF: top-level call (würde SSR crashen)

AC-04: [REGRESSION] Existing QueryClientProvider unverändert (children re-mount-frei)
  VERIFY: grep -c "QueryClientProvider" src/components/providers/QueryProvider.tsx
  EXPECTED: ≥ 1 (still there, unchanged structure)
  FAIL IF: 0 (replaced) → would re-mount children

AC-05: [BUILD] tsc clean
  VERIFY: pnpm exec tsc --noEmit
  EXPECTED: exit 0

AC-06: [DEPENDENCIES] persist deps installiert
  VERIFY: grep "react-query-persist-client\|query-sync-storage-persister" package.json
  EXPECTED: 2 lines
  FAIL IF: 0 (deps not added)

AC-07: [REGRESSION] Provider-Tests grün
  VERIFY: pnpm exec vitest run src/components/providers/
  EXPECTED: 25/25 PASS (existing tests don't break)

AC-08: [LIFECYCLE] gcTime auf 24h gesetzt (matched persist maxAge)
  VERIFY: grep "gcTime" src/lib/queryClient.ts
  EXPECTED: 24 * 60 * 60 * 1000

AC-09: [LIVE-VERIFY] Post-Deploy: localStorage hat BESCOUT_QUERY_CACHE_v1 nach App-Visit
  VERIFY: localStorage.getItem('BESCOUT_QUERY_CACHE_v1') !== null nach 10s mount
  EXPECTED: persistierte query-data
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | SSR | Server-Render | typeof window === 'undefined' | persist-Init übersprungen | useEffect-only-Init + typeof-Guard |
| 2 | Privacy-Mode | localStorage throws SecurityError | Safari Private | catch + log + skip persist (queries normal) | try/catch in useEffect |
| 3 | Quota-Exceeded | localStorage > 5MB | Edge case | catch + log + skip persist | persist-Lib handles internally |
| 4 | User-Switch | localStorage hat User A's persist + User B logt ein | Slice 260 User-Switch-Detect feuert | queryClient.clear() → persist sync clear | Slice 260 Mitigation cascading |
| 5 | Stale-Data | persistierte Public-Data > 30 Min alt | Liga-Tabelle veraltet | maxAge 30min → discard, refetch | persist-Lib handles internally |
| 6 | Breaking-Change | Schema-Drift zwischen Releases | qk-Format ändert sich | buster='v1' → bei v2-Release inkrementieren | manual-Pflicht bei Schema-Change |
| 7 | UUID in Key | players.byClub('abc-123-...') | UUID-regex matched → SKIP | nicht persistiert (defensiv) | by-design |
| 8 | Cross-Tab Race | Tab-1 schreibt Cache, Tab-2 liest gleichzeitig | localStorage atomic | OK, throttleTime 1000ms entkoppelt | by-design |

## 8. Self-Verification Commands

```bash
# AC-01/02/03/04/06: grep audit
grep -c "BESCOUT_QUERY_CACHE_v1" src/components/providers/QueryProvider.tsx
grep -A20 "shouldDehydrateQuery" src/components/providers/QueryProvider.tsx
grep -B2 "createSyncStoragePersister" src/components/providers/QueryProvider.tsx
grep -c "QueryClientProvider" src/components/providers/QueryProvider.tsx
grep "react-query-persist-client" package.json

# AC-05: Build
pnpm exec tsc --noEmit

# AC-07: Tests
pnpm exec vitest run src/components/providers/

# AC-08: Cache-Lifecycle
grep "gcTime" src/lib/queryClient.ts
```

## 9. Open-Questions

**Pflicht-Klärung:** Keine — Anil-Direktive autonom + 100% + keine Reste + Anil parallel an Home (Files-NOT-Touch-Liste hält uns out-of-his-way).

**Autonom-Zone:**
- Genaue USER_SCOPED-Set-Liste (defensive Default: ALL identifiable user-domains)
- maxAge 30min vs 60min (ich wähle 30 — aligned mit staleTime-Verhältnis)
- buster initial 'v1' vs 'slice261-v1' (kürzer ist OK)

**Nicht-Autonom:**
- Money-Path: getWallet/getHoldings sind in USER_SCOPED → nie persisted ✓
- RLS: defensive Allowlist + Slice-260 cascade clear ✓
- Wording: nicht betroffen

## 10. Proof-Plan

| Schritt | Artefakt |
|---------|----------|
| Pre-Edit | git diff baseline |
| Post-Edit AC-Audit | `worklog/proofs/261-ac-audit.txt` |
| Build + Tests | inline in audit |
| Live-Verify | `worklog/proofs/261-live-verify.md` (Playwright: localStorage check post-mount) |

## 11. Scope-Out

Explizit NICHT in Slice 261:

- **Server-Component RSC Auth-Hydrate** (`get_auth_state` als Server-Action im RootLayout) → Defer post-Beta wegen RootLayout-Touch + Anil parallel an Home
- **Middleware Public-Route-Bail-Out** → **Slice 262** (parallel safe — Middleware-File only)
- **Sequential Loading-Cascade Reduktion** (Smoking-Gun #3) → Architektur-Refactor, post-Beta
- **AuthProvider 8s-Loading-Cascade-Reduktion** → post-Beta

## 12. Stage-Chain

```
SPEC (this file)
  → IMPACT skipped (3 Files, kein src/lib/services, kein RPC, kein Schema)
  → BUILD (pnpm install + 2 File-Edits + AC-Audit)
  → REVIEW (reviewer-Agent — security-adjacent Cache-Strategie, Beta-Day-2)
  → PROVE (AC-Audit + Build + Tests + Post-Deploy Live-Verify)
  → LOG (commit + push + log.md + active.md → idle)
```

## 13. Pre-Mortem (5 Szenarien — security-adjacent)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | localStorage cross-user-leak weil Allowlist-Filter Lücke | LOW | HIGH (Privacy-Bug) | Defensive Allowlist (UUID-deny + USER_SCOPED-deny + status-success-only). Slice-260-clear cascading. | Manual review of dehydrated keys post-deploy |
| 2 | persist verlangsamt Mount durch sync-localStorage-IO | LOW | MED (UX-Hick) | createSyncStoragePersister ist sync aber schnell (<10ms typisch). throttleTime 1000ms write-side. | Lighthouse Performance |
| 3 | gcTime 24h verwaltet zu viele alte Queries → Memory-Bloat | LOW | LOW | maxAge 30min discardet alte persist-Entries. Browser garbage-collected localStorage bei quota. | DevTools Memory |
| 4 | Tests mocken queryClient direkt, jetzt aber persist-subscribed | MED | LOW | Existing mocks targeting queryClient export bleiben kompatibel — persist subscribed via useEffect, nicht via Module-Top-Level | AC-07 vitest |
| 5 | Schema-Drift in qk-Factory → cached entries crash beim hydrate | LOW | MED (cache-clear nötig) | buster string + persist-Lib handles graceful | Sentry Error-Reports |

---

## Compliance-Check

- $SCOUT/Money-Path: Wallet/Holdings/Transactions in USER_SCOPED → nie persistiert ✓
- IPO-Begriff: nicht betroffen
- TR-Glücksspiel-Vokabel: nicht betroffen
- Asset-Klasse-Framing: nicht betroffen
- Disclaimer: nicht betroffen
- Money-Path: indirect — durch defensive Allowlist explicit excluded ✓

## Open Risiko

**Risiko:** localStorage-cross-user-leak wenn Allowlist-Filter eine domain durchlässt die user-scope hat ohne UUID. **Mitigation:** Conservative explizite USER_SCOPED-Liste enthält ALLE bekannten user-domains. Plus UUID-deny als Backup-Layer. Plus Slice-260 User-Switch-clear als 3. Layer.

**Confidence:** HIGH. 3-Layer Defense-in-Depth, alle Code-paths in bestehendem Pattern (matches Slice 260 patterns.md #41), persist-Lib battle-tested.
