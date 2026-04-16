# 008 — Floor-Price-Drift eliminieren (B-01)

## Ziel

Reduziere die maximale Drift-Spanne zwischen client-angezeigtem Floor und tatsaechlich verfuegbarem Sell-Order von **bis zu 2 Minuten** auf **bis zu 30 Sekunden** durch Verkuerzen der React-Query `staleTime` auf den `useAllOpenOrders` + `useAllOpenBuyOrders` Hooks. Bereinige zusaetzlich den toten `referencePrice`-Fallback in `useMarketData.ts:53`, der nach Enrichment nie greifen kann (enriched.ts setzt `p.prices.floor` immer auf einen Number).

Drift-Klasse: orders-Cache 2min stale → User sieht Sell-Order der bereits gekauft wurde → klickt "Buy" → backend `buy_player_sc` rejected mit "Keine Angebote von anderen Usern verfuegbar". Nicht money-bewegend (RPC ist source of truth), aber UX-Issue (verwirrender Error nach Click).

## Klassifizierung

- **Slice-Groesse:** S (1 Hook + 1 Cleanup)
- **Scope:** **CTO-autonom** (display-only, kein Money-Flow; Floor wird im RPC FOR UPDATE gegen DB neu evaluiert)
- **Border-Note:** Performance — 4x mehr orders-Refetches bei Markt-Idle. Aber: Refetch ist zwei lightweight `select` queries, akzeptabel im Pilot-Volume (~10-50 active users gleichzeitig).
- **Referenz:** Walkthrough 04-blocker-a.md B-01; `.claude/rules/trading.md` (Pricing-Section); `.claude/rules/performance.md` (staleTime-Convention)

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `src/lib/queries/orders.ts` | `staleTime: 2 * 60_000` → `staleTime: 30_000` (beide Hooks) + Begruendungs-Kommentar |
| `src/features/market/hooks/useMarketData.ts` | Tot-Fallback `?? p.prices.referencePrice` entfernen (Z.53), Kanonische Fallback-Chain dokumentieren |

## Acceptance Criteria

1. `useAllOpenOrders.staleTime = 30_000` (30 Sekunden).
2. `useAllOpenBuyOrders.staleTime = 30_000`.
3. `useMarketData.ts` floorMap-Logik: `p.listings.length > 0 ? Math.min(...) : (p.prices.floor ?? 0)`. Keine `referencePrice`-Referenz mehr (war dead-code post-enrichment).
4. tsc clean.
5. Trading-Service Tests + Market-Test grün (kein Behavior-Change).
6. Git diff zeigt nur 2 Files, ≤ 30 LOC.

## Edge Cases

1. **Hot Market (>20 trades/min)** → Refetch-Storm? Nein: React Query dedupliziert konkurrente Queries; staleTime wirkt nur auf "isStale", refetch bleibt einzeln pro QueryKey.
2. **User offline** → React Query unterdrueckt automatic Refetch ohne Connection.
3. **Tab im Hintergrund** → `refetchOnWindowFocus: true` (default) löst Refetch erst bei Refocus aus → kein verschwenderischer Background-Polling.
4. **Player ohne Listings** → `p.listings.length === 0` → fallback `p.prices.floor`. Wenn enriched.ts (Z.74) keinen Wert finden konnte, ist `floor = 0`, was weiterhin `p.prices.floor ?? 0` korrekt liefert.
5. **Zwischen 30s und 2min nach Trade ohne Refocus** → User sieht eventually-stale Floor maximal 30s (statt 2min). Realtime-Subscription waere nice-to-have, separater Slice.
6. **Price-Cap-Validation** → unverändert: `getPriceCap` RPC ist DB-authoritative (separater Call).

## Proof-Plan

- `worklog/proofs/008-staletime-diff.txt` — `git diff src/lib/queries/orders.ts src/features/market/hooks/useMarketData.ts`
- `worklog/proofs/008-tsc.txt` — `npx tsc --noEmit` Output (clean)
- `worklog/proofs/008-tests.txt` — `npx vitest run src/lib/services/__tests__/trading*.test.ts` (Trading-Path nicht beruehrt, sollte gruen bleiben)

## Scope-Out

- **Realtime-Subscription** auf `orders` Tabelle (würde 0s-Drift erzeugen, aber Channel-Setup + RLS-Compatibility-Check + Reconnection-Handling sind eigener Slice).
- **Floor-Berechnung in Single-Source-Of-Truth Helper** zusammenführen (enriched.ts berechnet floorFromOrders, useMarketData.ts re-berechnet aus listings — DRY-Verletzung). Refactor-Slice spaeter.
- **Tests fuer floor-Drift** hinzufuegen — Vitest Coverage existiert nicht für floorMap-Memo. Empfohlen: separater Slice mit `enrichPlayersWithData` + `useMarketData.floorMap` Snapshots.
- **`useEnrichedPlayers` staleTime / refetchInterval** — orchestriert von Sub-Hooks, kein eigener Hook-staleTime nötig.

## Stages

- SPEC — dieses File
- IMPACT — inline (orders → useEnrichedPlayers → useMarketData → ~10 Components, alle nutzen `getFloor()`)
- BUILD — 2 File-Edits
- PROVE — diff + tsc + tests
- LOG — commit + log.md
