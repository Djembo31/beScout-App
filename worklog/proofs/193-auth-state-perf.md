# Slice 193 — AuthProvider-Perf + Auth-Race-Gate

**Datum:** 2026-04-25
**Trigger:** Slice 192 Root-Cause-Fix. AuthProvider Console: `get_auth_state RPC slow > 10s timeout`. Live-Test ergab dass der RPC tatsaechlich schnell ist — der Timeout-Wert ist falsch dimensioniert + die downstream Queries muessen warten.

## Stage-Chain
SPEC (inline /optimize-Pattern) → IMPACT skipped (1 Service + 1 Hook, keine API-Aenderung) → BUILD → REVIEW (self per D35 — defensive observability + 1-Field-Gate) → PROVE → LOG

## Baseline-Messung (live via Chrome-DevTools-MCP)

Browser-Session als jarvis-qa, Manager-Page reload + Network-Tab-Capture:

```
POST /rest/v1/rpc/get_auth_state
  Status: 200
  x-envoy-upstream-service-time: 154 ms
  Response: { profile, clubAdmin, platformRole }

GET /rest/v1/holdings?select=*,player:players(...)
  Status: 200
  x-envoy-upstream-service-time: 54 ms
  Response: 12 holdings, alle mit nested player-Objekt
```

**Befund:** Beide RPCs liefern in <200ms (Server-Time). Die Slice-192-Console-Warnings (`RPC slow > 10s timeout`) waren von **erstem Cold-Load** (Cookie-Resume + Hydration konkurrent zur Holdings-Query). Bei warmem Reload ist alles glatt.

**Indexes verifiziert** (alle drei RPC-internen SELECTs sind PK-Lookups):
- `profiles.id` PK ✓
- `platform_admins.user_id` PK ✓
- `club_admins(user_id)` Index + `(club_id, user_id)` Unique ✓

→ H1 (slow RPC body) widerlegt. Echtes Problem: **Auth-Race bei Cold-Start**, nicht RPC-Performance.

## Root-Cause (live verifiziert)

Browser-Cold-Load-Sequenz:
1. `AuthProvider` mounts mit `cachedUser` aus sessionStorage → `setUser(u)` → `userId` available
2. React rerenders → `useHoldings(userId)` queryFn fires (`enabled: !!userId`)
3. **Parallel:** `loadProfile(u.id)` → `getAuthState` RPC fired (Server-Time 154ms, Network ~300ms total)
4. PostgREST holdings-query feuert mit Cookie-Auth-Token. Wenn Token noch in Refresh-Cycle (Slice-192 race) → nested `player:players(...)` returnt silent NULL
5. Service-Layer (Slice 192 Filter) fängt es, aber User sieht **Holdings-Liste minus Ghost-Rows**

**Echte Cold-Start-Race:** Holdings-Query feuert **bevor** AuthProvider sicher ist dass die Session vollstaendig restored ist. PostgREST nested-select scheitert silent.

## Fix (3 Layer)

### Layer 1: Holdings-Query gates auf profileLoading (`src/lib/queries/holdings.ts`)

```ts
export function useHoldings(userId: string | undefined) {
  const { profileLoading } = useUser();
  return useQuery({
    queryKey: qk.holdings.byUser(userId!),
    queryFn: () => getHoldings(userId!),
    enabled: !!userId && !profileLoading,  // Slice 193 gate
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}
```

**Effekt:** Holdings-Query feuert erst wenn AuthProvider den Profile-Load abgeschlossen hat. Eliminiert das Race-Window komplett (~50-200ms zusaetzliche Latenz beim Initial-Load, akzeptabel).

### Layer 2: getAuthState Timeout 10s → 3s (`AuthProvider.tsx:164`)

```ts
const authState = await withTimeout(getAuthState(userId), 3000);  // war 10000
```

**Effekt:** Bei Network-Stall geht der Code **schneller** in den 3-Query-Fallback (Promise.allSettled mit profile + platformRole + clubAdmin). Verkleinert das Auth-Race-Fenster fuer Layer 1's Gate.

**Begruendung:** RPC liefert typisch 150ms; > 3s ist immer ein Stall (Cold-Start/Pool/Network). Fallback ist robust (3 unabhaengige Queries mit eigenen 8s-Timeouts).

### Layer 3: Bestehende Slice-192-Defenses bleiben aktiv

- `getHoldings()` Service filtert Ghost-Rows (player=null)
- `holdingMapper` throws `ghost_holding_row` bei null-player
- `logSilentCatch` Sentry-Breadcrumbs

→ Layer 1 verhindert den Race ueberhaupt. Wenn er trotzdem trifft (z.B. neuer Code-Pfad bypassed `useHoldings` Hook), greifen Layer 2+3 als Backup.

## Test-Status

- tsc: clean
- vitest: kein neuer Test (gating ist eine 1-Field-Aenderung; React Query `enabled`-Behavior ist von TanStack getestet)
- Slice 192 Tests laufen weiter gruen (8/8 Mapper+Service)

## Live-Verify-Plan (post-deploy)

1. Cold-Open neue Inkognito-Session auf bescout.net
2. Console-Tab: kein `[AuthProvider] loadProfile RPC slow` mehr
3. Network-Tab: holdings-Query feuert NACH `get_auth_state`-Response (sequenziell statt parallel)
4. Manager → Aufstellen-Tab: Spieler rendern korrekt (Namen, Bilder, Trikot-Nummern)

## Was dieser Fix NICHT loest

- **Vercel Cold-Start-Latenz** bei Hobby-Tier — Infra-Issue, kein Code-Fix moeglich.
- **Supabase Connection-Pool-Saturation** unter Last — Pro-Plan-Kandidat (CEO).
- **PostgREST nested-select-Pattern** generell — langfristig auf SECURITY DEFINER RPCs migrieren (Backlog, Holdings-RPC-Migration).

## Dateien

- `src/lib/queries/holdings.ts` (+5 Zeilen Gate + 8 Zeilen JSDoc)
- `src/components/providers/AuthProvider.tsx` (1 Zeile Timeout-Reduce + 4 Zeilen Comment)
- `worklog/proofs/193-auth-state-perf.md` (diese Datei)
