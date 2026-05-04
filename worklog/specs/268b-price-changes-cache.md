# Slice 268 — Price-Changes-Cache (Phase 3 Live-Pulse Foundation)

**Status:** SPEC · **Größe:** S · **Slice-Type:** Service · **Scope:** CTO (D63 Phase 3 ist Anil-approved Roadmap) · **Datum:** 2026-05-04

---

## 1. Problem Statement

`getPlayerPriceChanges7d` Service in `src/lib/services/players.ts:281` läuft heute **ohne TanStack-Query-Cache** im Konsumenten `src/app/(app)/hooks/useHomeData.ts:215-232`. Effekt:

1. **Battery-Drain Mobile:** Jedes Re-Mount der Home-Page (Tab-Switch via Sidebar, Back-Navigation, Scope-Switch via Liga-Pill) feuert eine neue `supabase.rpc('get_player_price_changes_7d')`-Anfrage. Kein staleTime, kein dedup. Bei aktivem User mit ~5 Holdings = 1 RPC pro Mount, ohne Wiederverwendung.
2. **Silent-Fail-Klasse:** Service-Body `console.error + return []` bei RPC-Error verstößt gegen errors-db.md "Service Error-Swallowing"-Regel (Slice 088 Hardening). UI zeigt "0 Top Movers" statt erkennbarem Error-State — User merkt nicht, dass Daten fehlen.
3. **Anti-Pattern useState/useEffect für Server-State:** Konsument nutzt `useState<TopMover[]> + useEffect + cancelled-flag` Pattern. TanStack-Query-Hook würde dedup, retry, staleTime-Caching automatisch liefern.

**Evidence:**
- D63 (`memory/decisions.md:2806`) Cross-Persona-Top-Finding #3: „`getPlayerPriceChanges7d` ohne Cache (Performance + Battery)".
- Live-Code-Read `src/lib/services/players.ts:281-294`: Kein `useQuery`-Wrap, kein staleTime, silent-error.
- Live-Code-Read `src/app/(app)/hooks/useHomeData.ts:215-232`: useState/useEffect mit cancelled-Flag.

**Wer ist betroffen?**
- ALLE Home-Page-User mit ≥2 Holdings (= aktive Trader = Daily-Driver-Persona).
- Mobile-User besonders: Battery-Drain durch unnötige Roundtrips.
- Frequency: jedes Home-Mount = 1 RPC. Bei einer Session mit 3 Tab-Switches = 3 RPCs für identische Daten.

## 2. Lösungs-Design (Architektur)

**Drei-Achsen-Heal in einem Slice:**

| Achse | Vorher | Nachher |
|-------|--------|---------|
| Cache | Kein TanStack-Cache, jedes Mount = neue RPC | `useQuery` mit `qk.priceChanges.byPlayers(playerIdsKey, limit)`, staleTime 5min |
| Error-Handling | `console.error + return []` (silent) | `throw new Error(error.message)` (TanStack retry + UI-Error-Surface) |
| Konsumenten-Pattern | useState/useEffect mit cancelled-Flag | `usePlayerPriceChanges7d(playerIds, limit)` Hook, Hook gibt `data` direkt |

**Datenfluss-Diagramm:**

```
Vorher:
  useHomeData (Re-Mount) → useEffect → getPlayerPriceChanges7d (RPC) → setState
                                              ↓ error
                                       console.error + return []

Nachher:
  useHomeData → usePlayerPriceChanges7d(playerIds, 3) → useQuery {
    queryKey: qk.priceChanges.byPlayers(playerIdsKey, 3),
    queryFn: () => getPlayerPriceChanges7d(playerIds, 3),
    staleTime: 5 * 60 * 1000,
    enabled: playerIds && playerIds.length >= 2,
  }
  → data (cached, deduped, retry-on-error)
```

**Neue Types/Interfaces:** Keine — `PriceChange7d` existiert bereits in `players.ts:272`.

**Neue qk-Sektion (`src/lib/queries/keys.ts`):**

```ts
// ── Price Changes (Slice 268 — D63 Phase 3 Cache) ──
priceChanges: {
  /**
   * 7-day price-change top-movers.
   * Key-shape: ['priceChanges', '7d', sortedJoinedIds, limit]
   * sortedJoinedIds: deterministic hash via `playerIds.slice().sort().join(',')`.
   * No persist (UUIDs in key → Layer 3 UUID_REGEX skip).
   */
  byPlayers: (playerIdsKey: string, limit: number) =>
    ['priceChanges', '7d', playerIdsKey, limit] as const,
},
```

**Hook-Signatur (`src/lib/queries/players.ts`):**

```ts
export function usePlayerPriceChanges7d(
  playerIds: string[] | undefined,
  limit: number,
) {
  const playerIdsKey = useMemo(
    () => (playerIds ?? []).slice().sort().join(','),
    [playerIds],
  );
  return useQuery<PriceChange7d[]>({
    queryKey: qk.priceChanges.byPlayers(playerIdsKey, limit),
    queryFn: () => getPlayerPriceChanges7d(playerIds, limit),
    staleTime: FIVE_MIN,
    enabled: !!playerIds && playerIds.length >= 2,
  });
}
```

**Service-Heal (`src/lib/services/players.ts:281`):** silent-fail → throw, mit 3-Branch-Logic:

| Branch | Vorher | Nachher |
|--------|--------|---------|
| Success | `(data as PriceChange7d[]) ?? []` | unverändert |
| RPC-Error | `console.error(...) + return []` (silent) | `throw new Error(error.message)` |
| `data === null && error === null` (PostgREST-Quirk) | `?? []` greift | `?? []` greift (unverändert) |

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/queries/keys.ts` | EDIT | Neue `qk.priceChanges`-Sektion |
| `src/lib/queries/players.ts` | EDIT | Neuer `usePlayerPriceChanges7d`-Hook |
| `src/lib/queries/index.ts` | EDIT | Barrel re-export `usePlayerPriceChanges7d` (F-01: Konsument importiert via `from '@/lib/queries'`) |
| `src/lib/services/players.ts` | EDIT | `getPlayerPriceChanges7d` throw-heal (silent-fail-fix, 3-Branch-Logic siehe oben) |
| `src/lib/services/__tests__/players-priceChanges.test.ts` | NEU | Service-Test: Success-Path / Error-throw / Null-data-fallback (3 Cases) |
| `src/app/(app)/hooks/useHomeData.ts` | EDIT | useState/useEffect → Hook-Konsumption + `playerIds = useMemo(...)` (F-07: Reference-Stability) |
| `src/app/(app)/hooks/__tests__/useHomeData.test.ts` | EDIT | Test-Touch-Points (siehe Detail-Liste unten) |
| `src/lib/queries/__tests__/players-priceChanges.test.tsx` | NEU | Hook-Test (queryKey, enabled-Gate, dedup, mit shared-QueryClient-Wrapper) |

**Test-Touch-Points in `useHomeData.test.ts` (F-03):**
- **Z. 50-64** (`vi.mock('@/lib/queries', ...)`): erweitern um `usePlayerPriceChanges7d: (...args) => mockUsePlayerPriceChanges7d(...args)`
- **Z. 111-115** (`vi.mock('@/lib/services/players', ...)` für `getPlayerPriceChanges7d`): kann **bleiben** (Service-Mock wird durch Hook-Mock überschrieben — kein Konflikt) ODER entfernt werden (sauberer). Implementer-Entscheidung; bevorzugt: entfernen für Klarheit.
- **Z. 417-443** ("returns top movers from the 7d price changes RPC"): Test-Body umbauen auf `mockUsePlayerPriceChanges7d.mockReturnValue({ data: [...], isPending: false, isError: false })`.

**Greppen vor Implementation:**
- `grep -rn "getPlayerPriceChanges7d" src/` → genau 3 Hits (Service-Definition, Konsument useHomeData, Mock useHomeData.test.ts).
- `grep -rn "qk.priceChanges\|qk.players" src/` → keine Konflikte mit neuem `priceChanges`-Namespace.

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/lib/queries/players.ts` | Existing Hook-Pattern verifizieren | Wie sind `usePlayers`, `useRawPlayers` strukturiert? Welcher staleTime-Wert? |
| `src/lib/queries/keys.ts` | qk-Factory-Pattern | Wie sind ID-bearing Keys (z.B. `qk.transactions.tradePlayers`) strukturiert? Wie wird `string[]→string` deterministic-hash gemacht? |
| `src/components/providers/QueryProvider.tsx:87-141` | Persist-Allowlist | Greift Layer 3 UUID_REGEX bei Player-UUIDs im Key? Müssen wir USER_SCOPED_DOMAINS erweitern? |
| `src/lib/services/players.ts:272-294` | Service-Definition | Welche Return-Shape genau? Was kommt aus RPC-Body? Wo silent-fail? |
| `.claude/rules/errors-db.md` "Service Error-Swallowing" | Silent-Fail-Pattern | Was ist die Standard-Fix-Pattern für `console.error + return null`? |
| `src/app/(app)/hooks/__tests__/useHomeData.test.ts:114` | Mock-Pattern | Wie wird `getPlayerPriceChanges7d` heute gemockt? Was muss nach Hook-Migration angepasst werden? |
| `src/lib/queries/__tests__/` | Test-Pattern | Existieren TanStack-Hook-Tests in queries-Layer? Welcher Test-Wrapper-Stil (QueryClientProvider)? |

## 5. Pattern-References (relevant für DIESEN Slice)

- **errors-db.md "Service Error-Swallowing"** (Slice 088 Hardening, 117 Fixes) — `console.error + return null/[]` ist Bug-Klasse. Fix-Pattern: `throw new Error(error.message)`. **Direkter Anwendungsfall hier.**
- **errors-frontend.md "Map/Set-typed React-Query-Data + Persist/SSR" (Slice 267)** — `PriceChange7d[]` ist plain Array, NICHT Map/Set → Layer 4 Filter unnötig. Verifiziere aber, dass unser Service kein Map zurückgibt.
- **patterns.md** TanStack-Query-Hook-Pattern (`useQuery + qk + staleTime + enabled`) — Standard-Hook-Stil etabliert in `src/lib/queries/players.ts`.
- **D63** (`memory/decisions.md:2806`) — Cross-Persona-Top-Finding #3 ist Slice-Trigger.
- **performance.md "Query Performance"** — `staleTime` min 30s für normale Daten, 5min für statische. Price-Changes ändern sich daily-cron-rhythm → 5 min sauber.
- **errors-frontend.md "TanStack Query v5: initialData vs placeholderData (Slice 268)"** — irrelevant hier, weil wir keinen localStorage-Mirror nutzen. Pure server-fetch via useQuery. Aber als Lehre: KEINEN initialData-Hack einbauen.

## 6. Acceptance Criteria (Executable)

```
AC-01: [HAPPY] Hook returnt PriceChange7d[] für valide playerIds + limit.
  VERIFY: vitest run src/lib/queries/__tests__/players-priceChanges.test.tsx
  EXPECTED: data ist PriceChange7d[]-Array mit ≤ limit Einträgen, sortiert nach
            absolutem change_pct desc (RPC-Verhalten unverändert).
  FAIL IF: data === undefined nach successful fetch ODER falsches Array-Length.

AC-02: [EMPTY] Hook bleibt disabled wenn playerIds leer oder < 2 Einträge.
  VERIFY: const result = renderHook(() => usePlayerPriceChanges7d([], 3))
          AND const result2 = renderHook(() => usePlayerPriceChanges7d(['uid'], 3))
  EXPECTED: result.current.isPending === false, result.current.fetchStatus === 'idle'
  FAIL IF: queryFn wird gefeuert obwohl playerIds.length < 2 (RPC-Roundtrip wäre verschwendet).

AC-03: [ERROR] Service-Heal: RPC-Error wird thrown statt silent-zurückgegeben.
  VERIFY: vitest run src/lib/services/__tests__/players.test.ts (oder neuen Test schreiben)
  EXPECTED: getPlayerPriceChanges7d wirft Error mit RPC-Error-Message.
  FAIL IF: Service returnt [] bei RPC-Error.

AC-04: [LOADING] Konsument zeigt Skeleton/leer-State während isPending ohne crash.
  VERIFY: useHomeData-Test mit mockGetPlayerPriceChanges7d Promise-pending,
          assert topMovers === [].
  EXPECTED: topMovers ist leeres Array während Loading, kein crash.
  FAIL IF: topMovers.map crasht weil data === undefined.

AC-05: [REGRESSION] Cache-dedup funktioniert: Zwei Hook-Calls mit gleichem Key
       innerhalb staleTime feuern nur 1 RPC.
  VERIFY: const qc = createTestQueryClient();
          renderHook(() => usePlayerPriceChanges7d(['a','b'], 3), { wrapper });
          renderHook(() => usePlayerPriceChanges7d(['a','b'], 3), { wrapper });
          assert mockRpc was called once.
  EXPECTED: mockRpc.mock.calls.length === 1.
  FAIL IF: 2 RPCs gefeuert (Cache-Key-Drift).

AC-06: [REGRESSION] useHomeData topMovers-Output bleibt funktional identisch.
  VERIFY: useHomeData-Test mit fixed mock-data, assert topMovers-Shape.
  EXPECTED: topMovers ist Array von { playerId, player, club, change24h }, mapping
            unverändert aus PriceChange7d → TopMover.
  FAIL IF: topMovers verliert Felder oder mapping-bug.

AC-07: [TYPE-SAFETY + LINT] tsc --noEmit clean + eslint clean nach Migration (F-10 unused-imports).
  VERIFY: npx tsc --noEmit && npx eslint "src/app/(app)/hooks/useHomeData.ts" "src/lib/queries/players.ts" "src/lib/services/players.ts"
  EXPECTED: 0 errors, 0 warnings.
  FAIL IF: any new TS-error ODER unused-import-warning (z.B. logSupabaseError nach Hook-Migration).

AC-08: [I18N] Keine neuen User-facing Strings (Pure-Backend-Slice).
  VERIFY: git diff messages/de.json messages/tr.json
  EXPECTED: 0 changes.
  FAIL IF: irgendwelche i18n-Mutation (wäre Scope-Creep).

AC-09: [ERROR-PROPAGATION] Hook isError === true → Konsument graceful-degrade ohne Crash (F-04).
  VERIFY: useHomeData-Test mit mockUsePlayerPriceChanges7d.mockReturnValue({ data: undefined, isError: true, isPending: false })
  EXPECTED: result.current.topMovers === [] (kein Crash, leeres Array).
  FAIL IF: topMovers.map crasht weil data === undefined ODER topMovers === undefined.
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Hook-Mount | playerIds === undefined | `usePlayerPriceChanges7d(undefined, 3)` | Disabled, kein RPC | `enabled: !!playerIds && playerIds.length >= 2` |
| 2 | Hook-Mount | playerIds === [] | `usePlayerPriceChanges7d([], 3)` | Disabled | Same enabled-Gate |
| 3 | Hook-Mount | playerIds.length === 1 | `usePlayerPriceChanges7d(['uid'], 3)` | Disabled (existing logic: useHomeData hat `if (holdings.length < 2)`) | enabled-Gate Schwelle ≥ 2 |
| 4 | Hook-Mount | playerIds-Reihenfolge wechselt | `['a','b']` vs `['b','a']` | Same Cache-Hit | `playerIds.slice().sort().join(',')` deterministic key |
| 5 | RPC-Error | Network-Fail / 500 / RLS-Block | Service throws | TanStack-Query setzt `isError`, retry 3× default | Service throw, useQuery onError-handling |
| 6 | RPC-Empty | RPC returnt `[]` (kein price-history) | data === [] | Hook returnt `data === []`, topMovers === [] | Konsument-mapping ist null-safe |
| 7 | Concurrent | 2 Mounts mit gleichem Key in <staleTime | Mount A + Mount B parallel | 1 RPC, beide bekommen same data | TanStack-dedup automatic |
| 8 | Stale-Cache | Wallet-Mutation refresht Holdings (neue UID dazu) | playerIds change → neuer Key | Neuer RPC, alter Cache bleibt 5min für andere Konsumenten | Key-deterministic via sorted join |
| 9 | Persist-Cache | Re-Mount von disk | playerIds-Key hat UUIDs | Layer 3 UUID_REGEX skip → kein localStorage | QueryProvider Layer 3 etabliert |
| 10 | Auth-Race | Mount während User-Switch | playerIds aus old-user-holdings | TanStack-Query feuert RPC mit old-IDs | enabled-Gate gates auf userId-Refresh, dadurch wird hook unmounted/remounted |

## 8. Self-Verification Commands

PowerShell-kompatibel (F-05 — Quotes statt backslash-Escape):

```powershell
# Pflicht jeder Slice:
npx tsc --noEmit
npx vitest run "src/lib/queries/__tests__/players-priceChanges.test.tsx"
npx vitest run "src/app/(app)/hooks/__tests__/useHomeData.test.ts"
npx vitest run "src/lib/services/__tests__/players-priceChanges.test.ts"
npx eslint "src/app/(app)/hooks/useHomeData.ts" "src/lib/queries/players.ts" "src/lib/services/players.ts"

# Slice-spezifisch (via Grep-Tool):
# grep "getPlayerPriceChanges7d" → Erwartet 4-5 Hits (F-09):
#   - Service-Definition (players.ts)
#   - Hook-Wrap queryFn (queries/players.ts)
#   - Service-Test (players-priceChanges.test.ts)
#   - Hook-Test (players-priceChanges.test.tsx)
#   Wenn `useHomeData.ts` noch in Liste: Migration unvollständig.

# grep "qk.priceChanges" → Erwartet ≥ 2 Hits (keys.ts + queries/players.ts).

# RPC-Smoke gegen DB (keine Schema-Änderung, nur Verifikation der RPC existiert):
# mcp__supabase__execute_sql "SELECT pg_get_functiondef('public.get_player_price_changes_7d(uuid[], int)'::regprocedure)"
```

**Bei Money-Path zusätzlich:** N/A — Slice 268 ist read-only Performance-Cache, kein Money-Path.

## 9. Open-Questions (klären VOR Code)

**Pflicht-Klärung (Anil):** Keine — D63 ist approved Roadmap, Slice 268 ist Sub-Item.

**Autonom-Zone (Claude entscheidet):**
- Hook-File: in `src/lib/queries/players.ts` integrieren (NICHT neuer File) — bestehender Pattern nutzen.
- Test-File: NEU `src/lib/queries/__tests__/players-priceChanges.test.tsx` (TanStack-Hook braucht TSX wegen wrapper).
- Service-Test: separat (NEU `src/lib/services/__tests__/players-priceChanges.test.ts`) — Service-Layer-Heal ist eigenständige Achse, errors-db.md "Service Error-Swallowing" verlangt isolierten Test.
- staleTime-Wert: 5min (FIVE_MIN const, etabliert in players.ts).
- enabled-Schwelle: ≥ 2 (matched existing useHomeData-logic `holdings.length < 2`).
- **Hook-Test Wrapper-Pattern (F-02):**
  ```tsx
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  // BEIDE renderHook-Calls in AC-05 nutzen DASSELBE qc — sonst kein Cache-Dedup-Test.
  // `retry: false` verhindert flakey Test-Output bei mock-Promise-Reject.
  ```
- **playerIds-Reference-Stability (F-07):** Konsument MUSS playerIds via `useMemo` extrahieren VOR Hook-Aufruf:
  ```ts
  const playerIds = useMemo(() => holdings.map(h => h.playerId), [holdings]);
  const { data: priceChanges } = usePlayerPriceChanges7d(playerIds, 3);
  ```
- **retry-Wert:** TanStack default `retry: 3` belassen — Battery-net-Win durch staleTime kompensiert. Falls Beta-Telemetrie >5% Error-Rate zeigt: in Slice 268b reduzieren auf `retry: 1`.
- **logSupabaseError (F-10):** Nach Hook-Migration ist try-catch in useHomeData.ts:230 weg. Falls `logSupabaseError` nirgendwo sonst in der Datei genutzt wird → Import entfernen. Sonst belassen.

**Nicht-Autonom (CEO):**
- KEINE Wording-Änderungen (Pure-Backend-Slice).
- KEINE neuen RPCs / Migrations.
- KEINE Änderung am Hook-Konsumtions-Vertrag (topMovers-Shape muss IDENTISCH bleiben — Reviewer prüft `git diff` an useHomeData.ts:213-232).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Service-Heal (silent → throw) | `npx vitest run src/lib/services/__tests__/players-priceChanges.test.ts` Output → `worklog/proofs/268-service-vitest.txt` |
| Hook (cache + dedup) | `npx vitest run src/lib/queries/__tests__/players-priceChanges.test.tsx` Output → `worklog/proofs/268-hook-vitest.txt` |
| Konsumenten-Migration (useHomeData) | `npx vitest run src/app/\(app\)/hooks/__tests__/useHomeData.test.ts` Output → `worklog/proofs/268-consumer-vitest.txt` |
| Cache-Effekt | network-trace-snippet `chrome-devtools list_network_requests` post-Deploy: 1 RPC pro 5min-Window für identische playerIds → `worklog/proofs/268-network-trace.txt` |
| Persist-Skip-Verifikation (F-12) | Nach Hook-Cache-Hit: `localStorage.getItem('BESCOUT_QUERY_CACHE_v2-slice267')` parsen → assert KEIN `priceChanges`-Eintrag (Layer 3 UUID_REGEX greift) → `worklog/proofs/268-persist-skip-verify.txt` |
| Type-Safety | `npx tsc --noEmit` clean + `eslint` clean Output → reproduzierbar in Pre-Commit-Hook-Output |

## 11. Scope-Out

- **Migration-File für `get_player_price_changes_7d`:** NICHT in diesem Slice. RPC existiert bereits, wir nutzen sie unverändert. Falls RPC-Body refactor nötig ist → separater Slice.
- **Real-Time Price-Updates via Realtime-Channel:** NICHT in diesem Slice. Slice 267 hat Live-Score-Realtime gemacht; Price-Changes-Realtime wäre Slice 274+ Post-Phase-5 (zu viel Infra für Phase 3).
- **Andere Konsumenten von `getPlayerPriceChanges7d`:** Es gibt aktuell NUR einen Konsument (useHomeData). Falls Slice 266 (Spotlight-Multi-Slot) auch Price-Changes braucht, kommt es ON-DEMAND in 266 dazu — nicht hier preempt-bauen.
- **Service-Tests für andere Player-Services:** NICHT in diesem Slice. Wir testen nur `getPlayerPriceChanges7d`. Andere Services (`getPlayers`, `getPlayerById`) bleiben wie sie sind.

## 12. Stage-Chain (geplant)

```
SPEC ✓ → IMPACT (skipped — Service-Body unchanged, kein Schema-Change, nur Wrapping)
       → BUILD (S-Slice, ein Worktree, sequenziell: keys → service-heal → hook → konsument-migration → tests)
       → REVIEW (reviewer-Agent — Pflicht bei feat/refactor)
       → PROVE (3× vitest + tsc + Pre-Commit-Hook-Check)
       → LOG
```

**IMPACT-Skip-Begründung:** Kein DB-Schema-Change, keine RPC-Body-Änderung, kein RLS-Touch. Service-Wrapper-Layer + Hook-Layer + Konsument-Migration. Cross-Cutting-Impact = nur 1 Konsument (`useHomeData`), bereits identifiziert per grep.

## 13. Pre-Mortem (S-Slice optional, hier 5 Szenarien für Quality-Sicherheit)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Cache-Key-Drift: Zwei Hook-Calls mit gleichen IDs aber unterschiedlicher Reihenfolge → 2 separate Cache-Entries → 2 RPCs | MED | mittel (Performance-Win flopped) | `playerIds.slice().sort().join(',')` deterministic key | AC-05 Test, network-trace post-Deploy |
| 2 | Service-Heal bricht existing Konsumenten — TanStack `useQuery` retry-on-throw könnte Error-Loop machen | LOW | hoch (Home-Page broken) | TanStack default `retry: 3 + exponential backoff` ist sicher; AC-04 deckt Error-State im Konsument ab | useHomeData.test.ts mit Reject-Promise mock |
| 3 | enabled-Gate falsch gesetzt → RPC feuert auch bei `playerIds.length < 2` (verschwendete Roundtrips) | LOW | niedrig | AC-02 Test deckt Schwelle ab; existing `if (holdings.length < 2) setTopMovers([]); return;` Logic mappt 1:1 auf `enabled: playerIds.length >= 2` | vitest disabled-state |
| 4 | Persist-Cache hat Cache-Pollution zwischen User-Switch (User A's Holdings-IDs landen in localStorage, User B sieht alte Daten beim Login) | LOW | hoch (Cross-User-Leak) | Layer 3 UUID_REGEX in QueryProvider blockt automatisch (Player-IDs sind UUIDs) → kein localStorage-Persist; AuthProvider's User-Switch-Detect (Slice 260) cleart cache bei UID-Change | Manuelle Smoke: localStorage-Inspection nach User-Switch |
| 5 | Konsument-Migration ändert topMovers-Shape ungewollt — Sub-Komponenten die topMovers konsumieren brechen | LOW | mittel | Diff-Audit am useHomeData.ts:213-232 vor/nach: Mapping ist 1:1 erhalten. AC-06 Test deckt Output-Shape ab. `grep -rn "topMovers" src/` für Konsumenten-Audit | useHomeData.test.ts Snapshot von return-shape |
| 6 | playerIds-Reference-Instability: Konsument erzeugt bei jedem Render neuen Array-Ref → useMemo recomputet identisches output, aber wasted CPU + zusätzlicher useQuery queryKey deep-equality-check (F-07) | MED | niedrig | Konsument MUSS `playerIds = useMemo(() => holdings.map(...), [holdings])` extrahieren. Spec §9 dokumentiert. | tsc + Test mit Spy auf useMemo-Recompute-Count, oder visuell via React-DevTools-Profiler. |
| 7 | Cache-Churn bei aktiven Tradern: 5 Holdings → Verkauf → 4 Holdings = neuer Cache-Key = neuer RPC. Optimistische "1 RPC pro 5min" gilt nur stationär (F-08) | MED | niedrig | Wert-Net-Win bleibt positiv (vorher 1 RPC pro Mount). Beta-Telemetrie messen: avg. RPCs pro Session post-Slice-268. Wenn > 1.5×/Session → Hook-Granularität in Slice 268b überdenken (cache-key auf userId, Service-Side Filterung). | Beta-Telemetrie via Sentry breadcrumb / network-trace. |

---

## Compliance-Check

- $SCOUT-Wording: N/A — Pure-Backend-Slice, keine User-facing Strings.
- IPO-Begriff: N/A.
- TR-Glücksspiel-Vokabel: N/A.
- Asset-Klasse-Framing: N/A.
- Disclaimer: N/A — kein Page-Touch.

## TR-Wording-Vorab

N/A — keine i18n-Strings in diesem Slice.

## Open Risiko (kurz, ehrlich)

- **Risiko 1:** TanStack-Query default `retry: 3` könnte bei flaky-RPC zu 3 fail-Roundtrips führen (vorher: 1 fail + silent-empty). Battery-net-Win bleibt aber positiv durch staleTime. Mitigation: in Hook explicit `retry: 1` setzen falls Beta-Telemetry zeigt RPC-Flakiness.
- **Risiko 2:** Cache-Hit zwischen Sessions via persist? Layer 3 UUID_REGEX blockt — Verifizierung pflicht in PROVE-Stage durch DevTools-Snapshot.

**Mitigation greift:** Beides ist im Pre-Mortem #2/#4 gecovered, AC-04/AC-05 testen explizit.
