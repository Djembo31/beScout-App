# Slice 083 — Altbestand-Filter `getPlayersByClubId`

**Status:** SPEC (Rev. 2026-04-20 — Filter-Kriterium nach Phase A umgestellt)
**CEO-Scope:** JA (Trading-UX, Money-angrenzend — sichtbarer Kader aendert sich)
**Stage-Chain:** SPEC → IMPACT (DONE) → BUILD → PROVE → LOG

## Ziel

`getPlayersByClubId` bekommt einen **optionalen** `activeOnly`-Filter.
Filter-Kriterium (nach Phase A Slice 081/081b/081c):

```ts
if (opts?.activeOnly) query = query.neq('mv_source', 'transfermarkt_stale');
```

User-facing Views (Club-Page, Admin-Overview, Admin-Revenue) bekommen `activeOnly: true`.
Admin-Management (`useAdminPlayersState` fuer Liquidate/Set-Cap/Create-IPO) bleibt auf Full-Set (backwards-compat, muss auch gestalte Rows sehen).

## Warum `mv_source != 'transfermarkt_stale'` statt altem Kriterium

Alte Spec (Rev. 1): `AND is_liquidated = false AND (last_appearance_gw > 0 OR created_at > now() - 180 days)`.
Problem: `last_appearance_gw > 0` filtert echte Winter-Neuzugaenge raus, `created_at > 180d` ist zeitlich driftend.

Nach Phase A Slice 081/081b/081c sind 2364/4556 Rows (52%) auf `mv_source='transfermarkt_stale'` geflaggt:
- 081: Mass-Poisoning-Cluster ≥ 4 (897)
- 081b: Paired-Poisoning mit gleichem last_name (+36)
- 081c: Orphan Contracts >12 Mon. abgelaufen (+1434)

Das ist das **stabile Data-Quality-Flag**, nicht zeitlich driftend, CI-Guards live (INV-36/37/38).

## Impact (verifiziert via grep)

| File | Aenderung | Consumer |
|------|----------|----------|
| `src/lib/services/players.ts:73-82` | `getPlayersByClubId(clubId, opts?: { activeOnly?: boolean })` | — |
| `src/lib/queries/keys.ts:12` | `qk.players.byClub(cid, activeOnly: boolean)` | — |
| `src/lib/queries/players.ts:31-38` | `usePlayersByClub(clubId, activeOnly?: boolean)` | — |
| `src/components/club/hooks/useClubData.ts:31` | `usePlayersByClub(clubId, true)` | **activeOnly=true** |
| `src/components/admin/AdminOverviewTab.tsx:46` | `getPlayersByClubId(club.id, { activeOnly: true })` | **activeOnly=true** |
| `src/components/admin/AdminRevenueTab.tsx:29` | `getPlayersByClubId(club.id, { activeOnly: true })` | **activeOnly=true** |
| `src/components/admin/useAdminPlayersState.ts` (4 calls) | kein Flag → default false | **activeOnly=false** |
| Tests (5) | Mock-Signatur kompatibel halten (opt. Arg) | — |

**Scope-Out (explizit):**
- `club.ts` Helper-Queries (`getClubFanAnalytics`, `getClubTradingFees`, `getClubsWithStats`, `getClubRecentTrades`) — werden in separatem Slice gefiltert.
- `getClubDashboardStats` RPC — RPC-Logic-Change braucht eigenes Slice inkl. Migration.
- `/api/players` (Market-Holdings-Rail) — anderer Pfad, separate Entscheidung.

## Acceptance Criteria

1. Service-Default: `activeOnly` NICHT gesetzt → alle Rows (keine Breaking-Change).
2. Service mit `activeOnly: true`: Query hat `.neq('mv_source', 'transfermarkt_stale')`.
3. Query-Key unterscheidet Active vs Full: `qk.players.byClub(cid, true) !== qk.players.byClub(cid, false)`.
4. Club-Page zeigt nur `mv_source IN ('unknown', 'transfermarkt_verified', '...future')`.
5. Admin-Player-Tab (Liquidate-UI) zeigt weiter Full-Set inkl. `transfermarkt_stale`.
6. `npx tsc --noEmit` clean.
7. Betroffene Tests gruen (`npx vitest run src/components/club src/components/admin`).

## Proof-Plan

- `worklog/proofs/083-after.txt`:
  - `EXPLAIN (ANALYZE)` fuer `getPlayersByClubId(AV, activeOnly=true)` zeigt `.neq` Filter
  - Beispiel-Query: Aston Villa squad count activeOnly=true vs false
- vitest output der 5 Test-Dateien
- `git diff --stat`

## Edge Cases

1. **User haelt Holdings auf gestaltem Spieler**: Club-Page zeigt ihn nicht, Holdings-Rail schon. Dokumentiert, kein Bug (Holdings-Rail hat eigene Logic).
2. **Ganz neuer Player (`mv_source='unknown'`, 0 Appearances)**: Sichtbar — `unknown` ≠ stale. Gewollt.
3. **Cache-Drift**: Admin+User teilten vorher denselben Cache-Eintrag. Key-Update ist Pflicht.
4. **Aston Villa Kader** (klassisches Beispiel): vorher 51 (nach 081d Cleanup), `activeOnly=true` sollte ~30-35 zeigen.
5. **Re-Scraper Wellen (Phase A.2)**: wenn stale → verified, Spieler taucht automatisch wieder auf (Cache-Invalidation via React Query staleTime 5 Min).

## Rollout-Reihenfolge (Sicherheit)

1. **BUILD + MERGE**: Infrastruktur + alle Consumer activeOnly=true (dieser Slice).
2. **NICHT PUSHEN** bis Phase A.2 Wellen gelaufen sind (lokal von Anil).
3. Nach Wellen: Re-Scraper hat stale-Rows auf verified umgestellt → Club-Pages zeigen realistischen Kader.
4. Push → Deploy → Visual QA auf bescout.net (Aston Villa + Galatasaray + Bayern Counts pruefen).
