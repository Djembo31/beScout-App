# Slice 107 — Data-Waterfall Fixes (Duplicate-Calls + N+1)

**Status:** spec (BUILD queued)
**Size:** S (2-4 Files, eine Domain)
**CEO-Scope:** false (CTO-Scope: Query-Optimization, keine Wording/Geld/Security-Änderung)

## Ziel

Auf `/home` und `/market` die **~1000ms Data-Waterfall reduzieren** durch Eliminierung von 3 Duplicate-Calls + 1 N+1-Pattern. Messbar an Chrome DevTools Network Request Count (28+ → <20) auf /market.

## Kontext

Chrome DevTools Live-Messung (heute, logged-in jarvis-qa, Slow 4G) offenbart:
- `wallets?select=user_id%2Cbalance%2Clocked_balance...` 2x (reqid=674, 677)
- `club_followers?select=club_id%2Cis_primary...` 2x (reqid=683, 684)
- `rpc/get_public_orderbook` POST 2x (reqid=665, 670)
- `player_gameweek_scores?select=player_id%2Cscore&gameweek=eq.36|35|34|33|32` — 5 sequenzielle Queries (reqid=678-682) statt 1 mit `.in('gameweek', [32-36])`

Geschätzte Ersparnis auf Slow 4G (~150ms Latenz pro Roundtrip):
- 3 duplicate calls eliminated → ~450ms
- 4 N+1 roundtrips eliminated → ~600ms
- Total: **~1000ms** Render-Delay-Reduktion auf /market

## Investigation (vor BUILD)

1. Grep call-sites für jede doppelte Query — welche Hook/Service ist zweimal gebunden?
2. Sind es 2 verschiedene Hooks die unterschiedliche Query-Keys haben (= echte Duplikate) oder Strict Mode dev artifact?
3. Für N+1: identifiziere Hook, der die 5-GW-Loop macht → prüfe ob `in()` möglich ist (Schema-Check!)

## Betroffene Files (geschätzt, final in BUILD)

- EDIT: 2-4 query hooks in `src/lib/queries/` (wallet, club, orderbook, gameweek-scores)
- EDIT: 0-2 components die den N+1 triggern
- NEW tests: optional, bei strukturellem Service-Change

## Acceptance Criteria

1. `/market` Network-Request-Count: 28+ → <20 (gemessen via Chrome DevTools)
2. Keine `wallets`-Query zweimal (dedupe-Log vorher/nachher in Proof)
3. Keine `club_followers`-Query zweimal
4. Keine `get_public_orderbook`-RPC zweimal
5. `player_gameweek_scores` nur EINE Query mit `.in('gameweek', [32-36])` statt 5 sequenziell
6. `npx tsc --noEmit` clean
7. Post-Deploy Chrome DevTools Trace `/market`: LCP < 2500ms (Baseline 3018ms)
8. Keine breaking Tests

## Edge Cases

1. Wenn 2 verschiedene Components die gleiche Query fordern mit **exakt gleichem Key** → React Query dedupe-t von selbst. Die Tatsache dass Netzwerk 2x zeigt bedeutet: **unterschiedliche Keys** oder **unterschiedliche Mount-Zeiten** (Initial + re-trigger via invalidate/refetch).
2. N+1 ersetzen braucht evtl. serverseitige Aggregation in Service-Layer — nicht einfach `.in()` wenn Komponenten unterschiedliche Props brauchen.
3. `get_public_orderbook`-Duplicate: wahrscheinlich zwei verschiedene Widgets (Home-Widget + Market-Widget). Wenn je einmal = OK, wenn auf derselben Page = Dedup nötig.
4. Wenn Queries aus verschiedenen Providers kommen (WalletProvider + direktes useWallet) → konsolidieren auf Provider only.
5. Tests die auf 5 separate GW-Queries mocken brechen — Update nötig.

## Proof-Plan

- `worklog/proofs/107-before-network.txt` — Netzwerk-Log /market VORHER (hab ich schon)
- `worklog/proofs/107-after-network.txt` — Netzwerk-Log /market NACHHER (Request-Count)
- `worklog/proofs/107-tsc-clean.txt` — tsc output
- `worklog/proofs/107-trace-after.md` — LCP/Render-Delay-Vergleich

## Scope-Out

- AuthProvider-Refactor → Slice 105
- Service Worker Cache → Slice 110
- React Query Persist → Slice 112
- RSC-Prefetch Drosselung auf Mobile → eigener Slice (105c oder 113)
- Stadium-Images WebP → Slice 106
