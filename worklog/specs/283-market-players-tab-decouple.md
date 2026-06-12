# Slice 283 — Market: Portfolio-Tab von /api/players entkoppeln (Cold-Start /market)

**Größe:** L (Cross-Cutting Market-Tree + Query-Layer)
**Slice-Type:** Service + UI
**Datum:** 2026-06-12
**CEO-Scope:** Nein (Performance-Architektur, UX-Verhalten der Tabs bleibt; Marktplatz-Tab bekommt beim ersten Öffnen einen Lade-Beat statt Pre-Load — akzeptierter Trade-off)

## 1. Problem-Statement

**Evidence (worklog/audits/2026-06-12/lighthouse-baseline-authed.md + Explore-Agent-Map 2026-06-12):**
- /market ist die schlechteste Page der validen Baseline: **GHA Perf 52, LCP 4,4s, TBT 1,2s** (lokal TBT-Median 5,4s).
- Messkorrektur: Transfer ist br-komprimiert nur ~461 KB — der Killer ist **4,2 MB JSON.parse + Materialisierung von 4.500 Player-Objekten + Enrichment** auf throttled CPU.
- **Architektur-Befund (Slice-282-Klasse):** Default-Tab von /market ist `portfolio` (marketStore.ts:69) = BestandView über die **eigenen Holdings** (~Handvoll Spieler). Der Tab-Content ist aber durch `playersLoading` des **vollen 4.500-Spieler-Fetches** gegated (MarketContent.tsx:217 → 8×SkeletonCard) — der Fetch, den nur der Marktplatz-Tab braucht. LCP-Element ist genau dieses Skeleton-Grid.
- **Enrichment-Churn:** `useEnrichedPlayers` + priceHist-Merge spread-mappen ALLE 4.500 Player bei jedem Input-Resolve neu (holdings → orders → priceHist resolven sequentiell) = 3-5 volle O(N)-Pässe pro Mount → TBT.
- Bonus-Befund Explore: `applySorting` (MarketFilters.tsx:48-62) hat für `SortOption`-Werte `l15|change|name|age_asc|age_desc` KEINE cases → silent no-op Sortierung.

## 2. Lösungs-Design (3 Waves, serial)

**Wave 1 — Tab-Decoupling (der messbare Win):**
- `useEnrichedPlayers`/`usePlayers` in useMarketData nur noch `enabled: tab === 'marktplatz'` (gleicher Mechanismus wie bestehende tab-gated Queries priceHist/announcedIpos Z.33-36).
- Portfolio-Pfad bezieht Player-Daten via `usePlayersByIds` (Slice-282-Hook, existiert):
  - BestandView/mySquad: ids = holdings playerIds
  - OffersTab: ids = incoming_offers/open_bids playerIds (playerMap-Konsum prüfen)
  - Watchlist-Tab? (WatchlistView liegt in marktplatz/ — Tab-Zuordnung in BUILD verifizieren)
- Enrichment für Portfolio-Subset: gleiche `enrichPlayersWithData` über die ≤N byIds-Rows (O(N_klein)).
- Loading-Gates per Tab: portfolio-Tab gated auf dashboard+byIds, marktplatz-Tab auf full-list. `playersLoading`-Konsumenten (MarketContent.tsx:217 + Retry-Block) splitten.

**Wave 2 — Enrichment-Single-Pass (TBT auf Marktplatz-Tab):**
- `enrichedPlayers`-Memo + `prices.history7d`-Merge (useMarketData.ts:40-46) zu EINEM Memo konsolidieren → max 1 Spread-Pass pro Input-Änderung statt 2 gestaffelten.
- `enabled`-Gating sorgt dafür, dass orders/priceHist erst NACH Tab-Open resolven → Pässe laufen nur noch wenn Marktplatz offen.

**Wave 3 — SortOption-No-Op-Fix (XS, Bonus):**
- Fehlende cases `l15|change|name|age_asc|age_desc` in `applySorting` implementieren ODER tote Optionen aus `SortOption`-Type + UI entfernen (in BUILD: UI prüfen — werden sie angeboten?).

**Explizit NICHT (→ 283b-Kandidaten nach neuer Baseline):** Server-Pagination, Lite-Column-Endpoint (Type-Surgery-Risiko Player→PlayerMarket quer durch den Tree; erst wenn W1-Zahlen zeigen dass Marktplatz-Tab-Open selbst noch zu teuer ist).

## 3. Betroffene Files (geschätzt)

| File | Wave | Änderung |
|------|------|----------|
| `src/features/market/hooks/useMarketData.ts` | 1+2 | Tab-Gating, byIds-Portfolio-Pfad, Memo-Konsolidierung, getrennte Loading-States |
| `src/features/market/components/MarketContent.tsx` | 1 | playersLoading-Gate → per-Tab-Loading, Retry-Keys |
| `src/features/market/components/portfolio/BestandView.tsx` | 1 | Konsumiert Portfolio-Subset (Props-Shape prüfen — evtl. 0 Änderung wenn useMarketData die gleiche Shape liefert) |
| `src/features/market/components/portfolio/OffersTab.tsx` | 1 | playerMap-Quelle |
| `src/lib/queries/enriched.ts` | 1 | ggf. enabled-Param für useEnrichedPlayers |
| `src/features/market/components/shared/MarketFilters.tsx` | 3 | Sort-Cases |
| Tests: useMarketData/MarketContent/BestandView/Filters | alle | anpassen + neue Cases |

## 4. Code-Reading-Liste (Pflicht VOR Implementation — L: ≥10)

| # | File | Frage |
|---|------|-------|
| 1 | `useMarketData.ts` (voll) | ✅ teilgelesen — Rest: alle Returns + wer konsumiert playersLoading/playersError/players/mySquadPlayers/playerMap/floorMap |
| 2 | `MarketContent.tsx` (voll) | Gate Z.217, Retry-Block, Tab-Init aus URL-Param? (Deep-Link `?tab=`) |
| 3 | `marketStore.ts` | Tab-State, Default, Persist? SortOption-Type Z.5-7 |
| 4 | `BestandView.tsx` | Welche players-Quelle (Props vs Hook), Filter auf leagueCountry/clubId — kommen die Felder aus byIds+dbToPlayer? (league*-Felder: woher mappt dbToPlayer die? clubCache?) |
| 5 | `OffersTab.tsx` + `useOffersState.ts` | playerMap-Bedarf (welche ids) |
| 6 | `WatchlistView.tsx` | Welcher Tab? Datenquelle watchlist→players-Join |
| 7 | `enriched.ts` (voll) | ✅ gelesen — enabled-Durchreiche nötig |
| 8 | `dbToPlayer` league-Felder | leagueShort/leagueCountry/leagueLogoUrl-Mapping-Quelle (PLAYER_SELECT_COLS hat keine league-Cols → clubCache? Slice-276-Konflikt-Helper?) |
| 9 | `MarketFilters.tsx` applySorting/applyFilters (voll) | Sort-Cases + wo werden SortOptionen im UI angeboten |
| 10 | `PortfolioTab.tsx` | Komposition Bestand+Offers, eigene players-Konsumenten |
| 11 | `MarktplatzTab.tsx` | Konsumiert es playersLoading separat? EndingSoon/Trending-Gates |
| 12 | Tests `useMarketData`/`MarketContent` | Mock-Struktur (usePlayers-Mocks → byIds/enabled-Erweiterung) |

## 5. Pattern-References

- **Slice 282** (errors-frontend „Feature-Reaktivierung + Query-Ersatz: 3 Drift-Klassen") — Error-Gate-Semantik nicht verschärfen, byIds-Waterfall-Loading in kombinierte States, Suppression-Audit
- **Slice 282 Architektur**: usePlayersByIds + dbToPlayers (gleiche Pipeline = Slice-102-Contract gewahrt)
- performance.md „Tab-gated Queries: enabled: tab === 'x'" — exakt der bestehende Hausstandard
- errors-frontend „qk-Key ohne Konsument (267)" + „PLAYER_SELECT_COLS Sync (200)" — keine neuen Cols/Keys ohne Konsument
- Slice 254 „Cache-Invalidation Root-Prefix" — Retry-Block-Keys
- Slice 109 — keine RPC-Konsolidierungs-Versprechen, der Win ist Payload/Parse-Elimination auf dem Default-Pfad

## 6. Acceptance Criteria

- AC-01 [HAPPY]: /market Default-Tab (portfolio) lädt OHNE `GET /api/players` (full). VERIFY: Chrome-DevTools-Network eingeloggt. FAIL-IF: Request vor Marktplatz-Tab-Klick.
- AC-02 [HAPPY]: Marktplatz-Tab-Klick lädt die volle Liste nach + rendert wie heute (ClubVerkauf/Transferliste/Trending). VERIFY: Visual + Network nach Tab-Klick.
- AC-03 [HAPPY]: BestandView zeigt Holdings identisch (Name/Club/Pos/Floor/PnL-Inputs). VERIFY: Screenshot-Vergleich jarvis-Account vorher/nachher.
- AC-04 [HAPPY]: OffersTab + Watchlist funktionieren mit neuer Quelle. VERIFY: Tab-Klicks + ggf. vitest.
- AC-05 [PERF]: GHA-Lighthouse /market: LCP < 3,5s UND TBT < 900ms (Baseline: 4423/1189). VERIFY: nächster authed GHA-Run post-Deploy. FAIL-IF: keine Verbesserung ggü. Baseline.
- AC-06 [GUARD]: Error-Gate-Semantik nicht verschärft — full-list-Error zeigt Error-State nur im Marktplatz-Tab, Portfolio bleibt funktional (und umgekehrt). VERIFY: Code-Read + Test.
- AC-07 [GUARD]: tsc + betroffene vitest-Suiten grün; Market-Tests decken Tab-Gating (usePlayers NICHT gefeuert bei tab=portfolio).
- AC-08 [GUARD]: Deep-Link `?tab=marktplatz` (falls existiert) lädt full-list sofort. VERIFY: Reading #2 + Test.
- AC-09 [BONUS]: Alle angebotenen Sort-Optionen sortieren real (kein silent no-op). VERIFY: vitest für applySorting.

## 7. Edge Cases

| # | Case | Handling |
|---|------|----------|
| 1 | User mit 0 Holdings auf portfolio | byIds enabled:length>0, Empty-State wie heute |
| 2 | Tab-Wechsel portfolio→marktplatz→portfolio | full-list bleibt gecacht (staleTime 5min), kein Re-Fetch-Flackern |
| 3 | Offer für Player außerhalb Holdings | offer-playerIds in byIds-Set aufnehmen |
| 4 | Deep-Link auf marktplatz | enabled reagiert auf initialen Store-Tab |
| 5 | byIds-Error auf portfolio | Error nur Portfolio-Pfad, kein Full-Page (282-F-02-Lehre) |
| 6 | mySquadPlayers-Konsument außerhalb portfolio? | Reading #1 klärt; ggf. Quelle = byIds-Subset überall |
| 7 | Enrichment-Felder auf Portfolio (dpc.owned, listings, floor) | enrichPlayersWithData über Subset mit gleichen Inputs (holdings+orders) — orders sind ungated? Prüfen: useAllOpenOrders ungated nötig für Floor im Bestand → bleibt ungated (klein?) ODER floor aus byIds floor_price (Reading klärt Größe von orders) |
| 8 | watchlistMap/floorMap-Konsumenten auf marktplatz vor Load | leere Maps = heutiges Verhalten während loading |
| 9 | Realtime/Invalidation auf qk.players.all nach Trade | Trade-Mutations invalidieren? Grep — byIds-Keys mit-invalidieren (Root-Prefix ['players'] decken beide) |
| 10 | Turkish-Suche | unverändert (Suche lebt im marktplatz-Tab auf full-list) |
| 11 | Tests mocken usePlayers global | Mock-Erweiterung enabled-aware |
| 12 | SortOption-Entfernung bricht persisted Store-State | wenn Optionen tot im UI: Type-Entfernung + Migrations-Fallback default |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true pnpm exec vitest run src/features/market src/lib/queries 2>&1 | tail -5
grep -n "enabled" src/lib/queries/enriched.ts src/features/market/hooks/useMarketData.ts
# Network-Proof: chrome-devtools auf /market (eingeloggt): kein /api/players bis Tab-Klick
# Post-Deploy: gh run list --workflow=lighthouse.yml → /market LCP/TBT vs Baseline
```

## 9. Open-Questions

- **Autonom-Zone:** Loading-State-Aufteilung, byIds-Set-Komposition, Memo-Struktur, Sort-Fix-Variante (implementieren vs entfernen je UI-Angebot).
- **Pflicht-Klärung:** keine — Anil „weiter mit 1".
- **CEO-Zone:** keine.

## 10. Proof-Plan

`worklog/proofs/283-market-decouple.md`: (1) Network-Trace portfolio ohne /api/players + nach Tab-Klick mit, (2) vitest, (3) Screenshots Bestand/Marktplatz vorher/nachher, (4) GHA-Lighthouse-Delta /market.

## 11. Scope-Out

- Server-Pagination + Lite-Column-Endpoint (283b nach neuen Zahlen)
- Turkish-Such-Normalisierung ğ/ş/ç (Bonus-Befund → Backlog-Notiz)
- Home-CLS (Slice 284)

## 12. Stage-Chain (geplant)

SPEC → IMPACT (Pflicht — queries/enriched + Market-Hook; kompakt: Konsumenten-Greps aus Reading dokumentieren) → BUILD (3 Waves serial — interdependente Kette, Worktree-Parallel würde useMarketData-Konflikte erzeugen) → REVIEW (Cold-Context PFLICHT — L-Slice) → PROVE → LOG

## 13. Pre-Mortem (L: ≥5)

1. **Verstecker Konsument der full-list auf portfolio** (Suche? Header-Stats?) → Reading #1/#2 erschöpfend; Reviewer als Catcher.
2. **league*-Felder fehlen in byIds-Rows** (falls dbToPlayer sie aus anderem Pfad mappt) → Reading #8 VOR Build; sonst BestandView-Filter brechen still (Slice-102-Klasse).
3. **orders ungated zu groß** → useAllOpenOrders Größe messen; ggf. portfolio-Floor aus floor_price der byIds-Rows (Server-Wahrheit) statt Order-Scan.
4. **Loading-Flash beim Tab-Wechsel** (marktplatz erst ab Klick) → Skeleton im Tab + staleTime hält Folge-Wechsel warm; UX-Trade-off dokumentiert.
5. **Test-Mocks global auf usePlayers** → enabled-Verhalten in Mocks nachbilden, sonst false-green.
6. **Invalidation-Drift nach Buy/Sell** (Holdings ändern sich → byIds-Set ändert sich; alte Keys stale) → byIds-Key ist ids-abhängig (neuer Key bei neuem Set = frischer Fetch ✓); Root-Prefix-Invalidation deckt Rest.
