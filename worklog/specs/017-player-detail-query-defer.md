# Slice 017 — B3 Player Detail Query-Waterfall Defer

## Ziel

Reduziere initial parallele Queries auf `/player/[id]` von ~16 auf ~10. Info-Layer-Queries (Counter, Badges, Below-the-fold Banner) werden via `belowFoldReady` 300ms nach Mount nachgeladen. Critical-Path (Hero + Trading-Actions) bleibt sofort geladen.

## Hintergrund

Flow 8 markierte "15-19 parallele Queries" als Restrisiko (B3). `usePlayerDetailData.ts` mountet 16 Queries initial auf Trading-Tab (Default).

Browser limitiert 6 gleichzeitige HTTP-Connections pro Origin — die restlichen 10 queuen (Waterfall). Auf 4G/3G = 200-500ms zusaetzliche Latenz bevor die Below-the-fold Komponenten rendern koennen.

Fix-Pattern ist bereits im Codebase etabliert: `useHomeData.ts:42-49` (800ms), `useCommunityData.ts:28-33` (500ms). Ich nutze 300ms fuer Player-Detail weil User-Expectation aus Deep-Link (Market/Fantasy click) schnelles Rendering ist.

## Analyse — aktueller Zustand (usePlayerDetailData.ts)

**Always Initial (tab=trading default):**
| # | Hook | Above-the-fold? | Deferrable? |
|---|------|-----------------|-------------|
| 1 | `useDbPlayerById` | Ja (Hero-Daten) | Nein — critical |
| 2 | `useHoldingQty` | Ja (Owned-Marker) | Nein — critical |
| 3 | `useHoldingLocks` | Nein (gesperrt-Badge) | **Ja** |
| 4 | `usePlayerHolderCount` | Nein (Scouts-Tooltip) | **Ja** |
| 5 | `useWatcherCount` | Nein (Eye-Counter) | **Ja** |
| 6 | `useWatchlist` | Ja (Star-Icon Hero) | Nein — critical |
| 7 | `useSellOrders` | Ja (Floor-Price Kaufen-Button) | Nein — critical |
| 8 | `useIpoForPlayer` | Ja (IPO-Banner falls aktiv) | Nein — critical |
| 9 | `usePlayerTrades` | Nein (Trade-History Tab) | **Ja** |
| 10 | `useOpenBids` | Nein (gated tab=trading) | behält gate (nicht verschlechtern) |
| 11 | `usePbtForPlayer` | Nein (gated tab=trading) | behält gate |
| 12 | `useUserIpoPurchases` | Nein (IPO-Purchase-Badge, implizit gated auf activeIpo?.id) | behält gate |
| 13 | `useDpcMastery` | Nein (Mastery-Banner below-fold) | **Ja** |
| 14 | `usePlayerMatchTimeline` | Nein (Performance-Preview-Section) | **Ja** |
| 15 | `useLiquidationEvent` | Nein (rare Warning-Banner) | **Ja** |
| 16 | `usePlayerResearch` | Nein (Research-Preview-Section) | **Ja** (bleibt tab-gated, + belowFoldReady) |

**Tab-gated (Performance/Community):**
- `usePlayerGwScores` (performance) — unveraendert
- `usePlayerPercentiles` (performance) — unveraendert
- `usePosts` (community) — unveraendert

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `src/components/player/detail/hooks/usePlayerDetailData.ts` | `belowFoldReady` state + 300ms timeout, 7 `enabled`-Args anpassen |

Keine Service-Aenderungen, keine neuen RPCs, keine DB-Changes.

## Konkrete Aenderungen

```ts
// NEU nach line 88:
const [belowFoldReady, setBelowFoldReady] = useState(false);
useEffect(() => {
  const t = setTimeout(() => setBelowFoldReady(true), 300);
  return () => clearTimeout(t);
}, []);
```

**Query-Aenderungen:**

| Hook | Signatur vor | Signatur nach |
|------|--------------|---------------|
| `useHoldingLocks(userId)` | (userId) | **Neu:** `useHoldingLocks(userId, belowFoldReady)` — Hook muss 2. Arg akzeptieren |
| `usePlayerHolderCount(playerId)` | (playerId) | `usePlayerHolderCount(belowFoldReady ? playerId : undefined)` — einfacher Gate via undefined-playerId |
| `useWatcherCount(playerId)` | (playerId) | gleiche Technik |
| `usePlayerTrades(playerId)` | (playerId) | `usePlayerTrades(playerId, belowFoldReady)` — Hook muss 2. Arg akzeptieren |
| `useDpcMastery(userId, playerId)` | (userId, playerId) | `useDpcMastery(belowFoldReady ? userId : undefined, playerId)` |
| `usePlayerMatchTimeline(playerId, 15)` | (pid, 15) | 3. Arg `active`: `usePlayerMatchTimeline(playerId, 15, belowFoldReady)` — **Hook hat bereits 3. Arg `active=true`!** |
| `useLiquidationEvent(playerId)` | (playerId) | **Hook hat bereits 2. Arg `active=true`:** `useLiquidationEvent(playerId, belowFoldReady)` |
| `usePlayerResearch` | `(playerId, userId, tab==='community'||'trading')` | `(playerId, userId, (tab==='community'||tab==='trading') && belowFoldReady)` |

**Pruefe welche Hooks einen active/enabled-Param akzeptieren:**
- `usePlayerMatchTimeline(playerId, limit = 15, active = true)` — hat `active` → OK
- `useLiquidationEvent(playerId, active = true)` — hat `active` → OK
- `useHoldingLocks(userId)` — PRUEFEN
- `usePlayerTrades(playerId)` — PRUEFEN
- `useDpcMastery(userId, playerId)` — PRUEFEN
- `usePlayerHolderCount(playerId)` — PRUEFEN
- `useWatcherCount(playerId)` — PRUEFEN

Fuer Hooks ohne `active`-Param nutze ich **undefined-propagation** in den user/player-Id Parameter:
`usePlayerHolderCount(belowFoldReady ? playerId : undefined)` — der `enabled: !!playerId`-Guard im Hook triggert.

Diese Taktik hat 2 Tradeoffs:
- (a) undefined-Cast umgeht TypeScript falls Hook `string` erwartet (muss mit `undefined` typed sein — viele unserer Hooks sind `string | undefined`, das ist OK).
- (b) queryKey ist dann `['...', undefined, ...]` vs `['...', id, ...]` — unterschiedliche Cache-Keys, bedeutet erster Run mit undefined + zweiter Run mit id sind 2 verschiedene Cache-Eintraege. Das ist OK — der erste Run mit undefined ist eh disabled, also kein Fetch.

Beide Taktiken sind acceptable. Ich nutze je nach Hook-Signatur.

## Acceptance Criteria

1. `usePlayerDetailData(playerId, userId, tab='trading')` mountet initial ~10 Queries (von 16).
2. 6 Info-Layer-Queries (Locks, HolderCount, WatcherCount, Trades, Mastery, MatchTimeline, LiquidationEvent, Research) enablen sich erst nach 300ms.
3. Alle Critical-Path-Queries (Player, HoldingQty, Watchlist, SellOrders, ActiveIPO) bleiben ungegated.
4. Tab-gated Queries (OpenBids, PBT, Performance, Community) bleiben unveraendert.
5. `npx tsc --noEmit` clean.
6. `npx vitest run src/components/player/detail/hooks/__tests__/usePlayerDetailData.test.ts` gruen (Mocks akzeptieren beliebige Args — kein Test-Bruch erwartet).
7. PlayerContent + Tabs rendern weiterhin null-safe mit `data ?? []` / `data ?? null` — kein UI-Bruch.

## Edge Cases

1. **Sehr langsames Netz (>300ms Initial-Fetch)**: Initial-Queries noch nicht fertig wenn belowFoldReady feuert. Deferred-Queries fetchen parallel — kein Problem.
2. **Tab-Wechsel waehrend belowFoldReady=false**: Tab-gated Queries triggern erst wenn ENTWEDER belowFoldReady true ODER direkte tab-gates erfuellt. Fuer Community/Performance: tab-gate + belowFoldReady zusaetzlich kombiniert → etwas spaeter aber OK (User muss Tab anklicken, 300ms ist menschlich nicht wahrnehmbar).
3. **Playern mit activeIpo=null**: Query #12 bleibt disabled via `!!activeIpo?.id` — unveraendert.
4. **Player ohne Holdings/SellOrders/IPO**: `useHoldingQty`, `useSellOrders`, `useIpoForPlayer` returnen schnell (leere Antwort). Keine Beeinflussung.
5. **Mount → Unmount unter 300ms**: Cleanup des setTimeout verhindert state-update-on-unmounted-component.
6. **React Strict Mode Double-Invoke** (dev-only): 2 useEffect-Aufrufe, beide queueen setTimeout, beide clearen sich gegenseitig. Kein Problem — nur 1 belowFoldReady-Set am Ende.
7. **User mit aktiver Trade-History + scrollt sofort nach unten**: Wahrnehmung eines "Trade-History lädt..."-Skeletons fuer 300ms. Acceptable vs. UI-Freeze durch 16 parallele Queries.
8. **Search-Bar-Fokus unmittelbar nach Mount**: belowFoldReady unabhaengig, Focus-Interaktion wird nicht verzoegert.

## Proof-Plan

- `worklog/proofs/017-diff.txt` — `git diff usePlayerDetailData.ts`
- `worklog/proofs/017-tsc.txt` — `npx tsc --noEmit` (leer)
- `worklog/proofs/017-tests.txt` — vitest usePlayerDetailData.test.ts gruen
- `worklog/proofs/017-query-count.md` — Before/After Tabelle: Initial-Query-Count je Tab (trading, performance, community), mit Hook-Liste + Gate-Logik.

**Kein Playwright-Messung** in diesem Slice — Messung gegen `bescout.net` nach Deploy ist Phase-7-Scope. Statische Query-Zaehlung + Pattern-Referenz auf `useHomeData` sind der Proof.

## Scope-Out

- **Combined-RPC** (`get_player_detail(playerId, userId)` mit einem Round-Trip) — CEO-Scope (neue SECURITY DEFINER RPC, Money-adjacent durch Holdings), folgender Slice bei CEO-Approval.
- **Intersection-Observer-basiertes Lazy-Loading** fuer scroll-getriggerte Sections — separater Slice, baut auf diesem auf.
- **Service-Worker-Cache** fuer static Player-Daten — weit out-of-scope.
- **Query-Priorisierung via React Query `networkMode='offlineFirst'`** — unterschiedliches Cache-Konzept, braucht Evaluation separat.
- **Post-Deploy Playwright-Messung** (`bescout.net/player/[id]` Network-Timing) — Phase 7.
- **PlayerContent.tsx Null-Safety-Audit** — spot-check machen, aber alle Tabs-Components sind aktuell null-safe laut existierendem Pattern (`?? []`, `?? null`, Skeleton-Gates).

## Slice-Klassifikation

- **Groesse:** S-M (1 Hook-File, ~8 Zeilen neu + 7 Zeilen modifiziert)
- **CEO-Scope:** CTO-autonom per Block-B-Briefing-Freigabe ("B3 — M-L, CTO-autonom (Performance-Messung Pflicht)")
- **Risiko:** Niedrig — Defer-Pattern bekannt (useHomeData, useCommunityData), Null-Safety-Consumer etabliert, keine Service/DB-Change.
