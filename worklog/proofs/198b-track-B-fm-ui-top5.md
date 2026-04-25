# Slice 198b Track B — FM-UI Top-5 Proof

**Date:** 2026-04-25
**Scope:** Read-only / View-Layer — KEIN Money-Path, KEIN DB-Schema, KEIN neuer RPC.

## Items Closed (3/6)

### fm 2.3 P2 — Lineup-Score-Projection
**File:** `src/components/fantasy/event-tabs/LineupPanel.tsx`
**Pattern:** Pre-Game Pill above Formation Selector. Sum of slot players' `perfL5` + 1.1× Captain-Multiplier (from Slice 195a). Sichtbar nur wenn Event nicht running/scored, mind. 1 Spieler im Lineup.
**i18n:** `fantasy.projectionLabel` DE/TR added.
**Visibility:** `!isScored && event.status !== 'running' && selectedPlayers.length > 0`
**Captain-Mult:** `1.1×` matches Slice 195a (CEO-decision in `memory/decisions.md`).

### fm 4.6 P3 — Cross-Sub-Tab IPOs-Ending-Soon Banner
**File:** `src/features/market/components/MarketContent.tsx`
**Pattern:** Banner zwischen MarketHeader + Tabs. Zaehlt active IPOs mit `ends_at < now+24h`. Click navigiert zu marktplatz Tab. Versteckt wenn Tab bereits marktplatz oder count=0.
**i18n:** `market.iposEndingSoonBanner` (mit ICU-Plural), `market.iposEndingSoonHint`, `market.iposEndingSoonAria`.
**Compliance:** "Erstverkauf"/"Kulüp Satışı" — kein "IPO" user-facing (AR-7 SPK-Compliance).

### fm 5.3 P3 — Volume-Histogramm unter PriceChart
**File:** `src/components/player/detail/PriceChart.tsx`
**Pattern:** Custom-SVG Bar-Chart, 12 Buckets ueber Trade-Zeitraum, sum quantity per bucket. Unter Linien-Chart, ueber Date-Labels.
**Color:** `vivid-green/vivid-red` matching trend (oben). Opacity 0.35.
**Null-Guard:** `trade.quantity ?? 0` falls Datensatz alte Schema-Variante.
**i18n:** `player.volumeLabel`, `player.volumeHistogramLabel` DE/TR.

## Items Skipped (3/6, mit Begruendung)

### fm 1.3 P2 — In-Lineup-Filter Kader-Toolbar
**Skip-Grund:** `KaderToolbar.tsx` und `KaderTab.tsx` sind in Wave-1 Forbidden-File-Liste (CTO-Briefing).

### fm 2.4 P2 — Event-Difficulty-Indikator
**Skip-Grund:** `FantasyEvent` Type hat KEIN `difficulty`/`avgIpoPrice` Feld. Faehigkeit zur Berechnung waere DB+Service-Query (avg IPO-Price der teilnehmenden Clubs) — backend-data-dependent, ausserhalb Wave-2 Frontend-Scope.

### fm 5.4 P3 — Set-Price-Alert Trading-Tab (frontend-only localStorage)
**Skip-Grund:** Price-Alerts wurden auf server-side Watchlist-System migriert (J10 FIX-15, AR-59 trigger `notify_watchlist_price_change`). `usePriceAlerts.ts:25` ist `@deprecated`, leitet User zur Watchlist um. Adding localStorage variant waere Regression.

## Verification

```bash
npx tsc --noEmit                                         # clean
npx vitest run src/components/player/detail/__tests__    # 99 passed
npx vitest run src/components/fantasy/event-tabs/__tests__ # 14 passed
node -e "JSON.parse(...messages...)"                     # JSON valid
```

**Money-Path-Audit:**
```bash
grep -rE "\.from\('(wallets|transactions|holdings)'" \
  src/components/fantasy/event-tabs/LineupPanel.tsx \
  src/components/player/detail/PriceChart.tsx \
  src/features/market/components/MarketContent.tsx
# (no output — clean)
```

**Forbidden-Files-Compliance:** Kein Edit auf Wave-1 Files (DailyChallengeCard, founding/page, KaderToolbar, KaderTab, FormBars).

## Files Changed

```
messages/de.json                                  |  6 ++
messages/tr.json                                  |  6 ++
src/components/fantasy/event-tabs/LineupPanel.tsx | 37 +++++++++++
src/components/player/detail/PriceChart.tsx       | 67 ++++++++++++++++++--
src/features/market/components/MarketContent.tsx  | 35 +++++++++-
```

## Mobile-393px Verification (mental)

- **Projection Pill:** flex-row mit `min-w-0 truncate` Label + flex-shrink-0 Counter — rendert in 393px.
- **IPO Banner:** flex layout, ChevronRight als Visual Affordance, `min-h-[56px]` Touch Target, `truncate` auf labels.
- **Volume-Histogramm:** SVG mit `preserveAspectRatio="none"`, scaliert mit Parent-Width. 12 Buckets * ~28px Bar = ueber 393px viewport gesund.
