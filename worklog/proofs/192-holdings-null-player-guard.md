# Slice 192 — Holdings NULL-Player Defensive Guard

**Datum:** 2026-04-24
**Trigger:** Anil-Screenshot 2026-04-24 zeigt Manager → Aufstellen-Tab mit 5 Spieler-Rows die als `#0 MID vs LEI 0 CR 1/1 SC 0S 0T 0A` rendern.

## Stage-Chain
SPEC (inline, active.md) → IMPACT (initially skipped — Reviewer flagged 4 Cache-Priming-Pfade in REWORK) → BUILD → REVIEW (Cold-Reviewer-Agent: REWORK with 7 findings) → REWORK → PROVE → LOG

## Reviewer-Verdict-History
- **First pass:** REWORK (worklog/reviews/192-review.md). Critical Finding #1: `primeMarketDashboardCaches` schreibt `DbHolding[]` ohne nested player in `qk.holdings.byUser` Cache → mit Slice-192 Mapper-Throw waere `/market → /fantasy/aufstellen` ein Hard-Crash gewesen.
- **After REWORK (this proof):** all CRITICAL + MEDIUM findings addressed; LOW + Follow-ups documented.

## Root-Cause (live verifiziert)

### Symptom-Pattern matched 100% mit Mapper-Defaults

Anils Screenshot:
| Sichtbar | Mapper-Default wenn `h.player === null` |
|----------|-------------------------------------------|
| `#0` | `ticket: h.player?.shirt_number ?? 0` |
| `MID` | `pos: h.player?.position ?? 'MID'` |
| (leerer Name) | `first/last: h.player?.first_name ?? ''` |
| (leerer Kreis) | `imageUrl: h.player?.image_url ?? null` |
| `0 CR` | `floorPrice: h.player?.floor_price ?? 0` |
| `0S 0T 0A` | `matches/goals/assists: ?? 0` |

Alle 7 Felder gleichzeitig auf Default → einzig moeglicher Pfad: `h.player === null`.

### DB-Daten sind sauber

`test1@gmx.de` (Adana Demirspor + 1025 CR + 15 Holdings — passt zu Anil-Screenshot-Header) hat alle Holdings mit vollen Player-Daten (Mert Çelik, Gökhan Akkan, etc.) inkl. `image_url` (api-sports canonical) + `shirt_number`.

### Live-Render verifiziert

Chrome-DevTools-MCP navigiert zu `https://www.bescout.net/manager` als jarvis-qa: DOM-Inspect zeigt `YILDIZ #61 52 DEF`, `DEMIR #14 65 MID`, `OKUMUŞ #22 71 DEF`, `ATING #90 63 MID`, `BOSTAN #91 68 ATT` — alle korrekt.

### Auth-Provider Console-Warnings

```
[AuthProvider] loadProfile RPC slow, using 3-query fallback: Error: Timeout
[AuthProvider] Profile load failed, retrying in 2s
```

`get_auth_state` RPC trivial (3 SELECTs), Timeout > 10s → Pooling/Connection-Saturation. Browser feuert Holdings-Query waehrend Auth-Token nicht final hydrated → PostgREST `player:players(...)` returns NULL fuer alle nested rows → Service akzeptiert silent → Mapper applizierte stille Defaults.

### Reviewer-Finding #1: Type-Mismatch seit Slice 122

`get_market_user_dashboard` (RPC, migration `20260420230000`) selektiert Holdings OHNE JOIN auf players:
```sql
SELECT id, user_id, player_id, quantity, avg_buy_price, created_at, updated_at
FROM holdings WHERE user_id = p_user_id AND quantity > 0
```

Aber TS-Service-Cast war `as HoldingWithPlayer[]` (mit `player`-nest-Required). Lie-Cast ist seit 2026-04-21 latent — funktionierte nur weil **kein Consumer den nested `player` gelesen hat**:
- `KaderTab` nutzt `playerMap.get(h.player_id)` → braucht nur player_id+quantity+avg_buy_price
- `MarktTab` + `MarktplatzTab` → only player_id for ownership counts
- `useEnrichedPlayers` → only player_id+quantity for enrichment

Mit Slice-192 Mapper-Throw waere `/market → /fantasy/aufstellen` ein Hard-Crash gewesen → **REWORK CRITICAL**.

## Defense-in-Depth Fix (final)

### Layer 1: Type-Truth (`marketDashboard.ts`)

```ts
// Was lie:
holdings: HoldingWithPlayer[];
// Now honest:
holdings: DbHolding[];  // RPC liefert DbHolding-shape, kein player-nest
```

Plus `primeMarketDashboardCaches` skipt das Priming von `qk.holdings.byUser(userId)` explicit (JSDoc dokumentiert warum). `useHoldings()` bleibt der zentrale Query fuer player-joined Holdings.

**4 Consumer-Files angepasst auf `DbHolding[]`:**
- `src/lib/queries/enriched.ts` — `useEnrichedPlayers` + `enrichPlayersWithData`
- `src/features/manager/components/kader/KaderTab.tsx`
- `src/features/manager/components/intel/MarktTab.tsx`
- `src/features/market/components/marktplatz/MarktplatzTab.tsx`

### Layer 2: Service-Filter mit Sentry-Breadcrumb (`wallet.ts`)

```ts
const ghosts = rows.filter((h) => h.player == null);
if (ghosts.length > 0) {
  logSilentCatch('getHoldings.ghostRows', new Error(...), { userId, ghostPlayerIds, totalRows });
  if (rows.length > 0 && ghosts.length === rows.length) {
    throw new Error('holdings_ghost_all');  // all-ghost edge case → React-Query retry
  }
  return rows.filter((h) => h.player != null);
}
```

**Edge-Case-Fix (Reviewer #3):** Bei ALL-ghost throw werfen statt empty-array — verhindert "fake new-user state".

### Layer 3: Mapper-Throw mit i18n-Key (`holdingMapper.ts`)

```ts
if (h.player == null) {
  logSilentCatch('holdingMapper.ghostRow', new Error('h.player is NULL'), { playerId, quantity });
  throw new Error('ghost_holding_row');  // i18n-key, NOT human-string (errors-frontend.md)
}
```

**i18n-Mapping (Reviewer #4):**
- `errorMessages.ts` KNOWN_KEYS += `ghost_holding_row, holdings_ghost_all`
- `messages/de.json` + `messages/tr.json` mit User-Strings
- React-Query Error-Boundary catches → Toast statt broken UI

### Layer 4: Tests

**Mapper (`holdingMapper.test.ts`):** 4 Tests
- happy-path mapping
- throws `ghost_holding_row` bei `player=null`
- logs to Sentry via `logSilentCatch` BEFORE throwing
- throws bei `player=undefined` (defensive coverage)

**Service (`getHoldings-ghost-filter.test.ts`, NEU):** 4 Tests
- valid Holdings unchanged when no ghosts
- filters ghost rows + logs to Sentry
- THROWS `holdings_ghost_all` when ALL rows ghosts
- empty array gracefully when truly no holdings

**Total: 8/8 Tests gruen.**

## Reviewer-Findings-Status

| # | Severity | Status | Note |
|---|----------|--------|------|
| 1 | CRITICAL | ✅ Fixed | Type narrowed to `DbHolding[]` + 4 Consumers angepasst + Prime-Skip dokumentiert |
| 2 | HIGH | ⏭ Skipped | HomeDashboard RPC macht JOIN players → kein NULL-Pfad. Optional Follow-up: `filterValidHoldings()` Helper |
| 3 | MEDIUM | ✅ Fixed | All-ghost throw + `logSilentCatch` |
| 4 | MEDIUM | ✅ Fixed | `ghost_holding_row` i18n-key + DE/TR + KNOWN_KEYS |
| 5 | LOW | ✅ Fixed | Service-Test `getHoldings-ghost-filter.test.ts` (4 Tests) |
| 6 | LOW | ⏭ Backlog | AuthProvider-Perf-Slice in active.md offen markiert |
| 7 | LOW | ⏭ Backlog | Hook-Catch in `useFantasyHoldings` als optional Follow-up |

## Was dieser Fix NICHT loest

- **AuthProvider `get_auth_state` Performance-Problem:** Eigener Slice via `/optimize` Skill empfohlen. Backlog-Eintrag in active.md.
- **PostgREST nested-select Auth-Race:** Layer 1+2+3 fangen Symptom sichtbar; Root-Cause-Migration auf SECURITY DEFINER RPC fuer Holdings ist langfristiger Schritt.

## Files

- `src/lib/services/wallet.ts` (+13 Zeilen Filter+throw+logSilentCatch)
- `src/features/fantasy/mappers/holdingMapper.ts` (+8 Zeilen Throw + 8 Zeilen JSDoc + i18n-key)
- `src/lib/services/marketDashboard.ts` (Type fix `HoldingWithPlayer` → `DbHolding`)
- `src/lib/queries/marketDashboard.ts` (Prime-Skip mit JSDoc)
- `src/lib/queries/enriched.ts` (Type narrowing)
- `src/features/manager/components/kader/KaderTab.tsx` (Type narrowing)
- `src/features/manager/components/intel/MarktTab.tsx` (Type narrowing)
- `src/features/market/components/marktplatz/MarktplatzTab.tsx` (Type narrowing)
- `src/lib/errorMessages.ts` (+2 KNOWN_KEYS)
- `messages/de.json` + `messages/tr.json` (+2 Error-Strings je locale)
- `src/features/fantasy/mappers/__tests__/holdingMapper.test.ts` (NEU, 4 Tests)
- `src/lib/services/__tests__/getHoldings-ghost-filter.test.ts` (NEU, 4 Tests)
- `worklog/reviews/192-review.md` (NEU, Reviewer-Output mit 7 Findings)
- `worklog/proofs/192-holdings-null-player-guard.md` (diese Datei)

## Test-Status
- tsc: clean
- vitest holdings-relevant: 8/8 gruen (4 mapper + 4 service)
- Pre-Commit Hook (commitlint + lint-staged + tsc) muss durchlaufen vor commit
