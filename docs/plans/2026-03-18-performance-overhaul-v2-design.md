# Performance Overhaul v2 — Design Doc

**Datum:** 2026-03-18
**Ziel:** App fliegt bei 100K Usern. Kein Lag, kein Refresh noetig.
**Ansatz:** Layered (Bottom-Up) — jede Schicht komplett fixen, von Daten nach oben.
**Anils Anforderungen (woertlich):**
- "die performance der seite ist wieder in die knie gegangen"
- "es nervt die user, dass staendig lade probleme gibt und dann wieder refresh geklickt werden muss"
- "100K user ohne probleme, alles schnell laden"
- "ziemlich clever durchdacht und strukturiert"
- Aggressivitaet: Voll (Option C) — inkl. neue RPCs und DB-Aggregation
- Alles fuehlt sich laggy an — kein spezifisches Symptom

---

## Analyse-Ergebnisse (19 Probleme gefunden)

### Kritisch
1. `staleTime: 0 + refetchOnMount: 'always'` auf activeGameweek (`events.ts:38-59`)
2. Home Page: 11 React Query Hooks feuern gleichzeitig
3. PlayerContent: 16 Queries ohne Tab-Gating (`PlayerContent.tsx:84-99`)
4. Community: 13 useState → Kaskaden-Re-Renders (`community/page.tsx:54-85`)
5. Club CRM: 6 sequentielle Queries (Wasserfall)
6. Unbounded Queries ohne `.limit()` in 6+ Services
7. N+1 Patterns in Research/Scouting/Offers

### Hoch
8. Nur 7x React.memo im ganzen Projekt
9. `invalidateSocialQueries` invalidiert `['leaderboard']` bei jedem Follow
10. getTrendingPlayers scannt 1000 Trades in JS statt DB-Aggregation

### Mittel
11. SELECT * in 8 Services statt explizite Columns
12. Fehlende Pagination in 5 Services
13. Nur 3 Packages in `optimizePackageImports`
14. Barrel-Export `queries/index.ts` zieht alles in den Bundle

---

## Phase 1: Query-Fundamentals

**Ziel:** 50-60% weniger API-Calls pro Page-Navigation. Null DB-Aenderungen.

### 1a. ActiveGameweek staleTime fix
- **File:** `src/lib/queries/events.ts:38-59`
- **Problem:** `staleTime: 0` + `refetchOnMount: 'always'` auf beiden GW-Hooks
- **Fix:** `staleTime: 5 * 60 * 1000`, `refetchOnMount` entfernen
- Gameweeks aendern sich 1x/Woche. Targeted invalidation nach Admin-Aktionen reicht.

### 1b. PlayerContent Tab-Gating
- **File:** `src/app/(app)/player/[id]/PlayerContent.tsx:84-99`
- **Problem:** 16 Query-Hooks feuern alle beim Mount. Nur 2 tab-gated.
- **Fix:**
  - Immer: dbPlayer, holdingQty, holderCount, sellOrders, activeIpo, allPlayers
  - Trading-Tab: trades, pbtTreasury, ipoPurchases, mastery, openBids
  - Performance-Tab: gwScores, matchTimeline, liquidationEvent
  - Community-Tab: playerResearch, playerPosts
- **Ergebnis:** 16 → 7 Queries beim initialen Load

### 1c. Community Query-Gating
- **File:** `src/app/(app)/community/page.tsx:91-100`
- **Problem:** 12 Queries feuern alle sofort
- **Fix:** `useLeaderboard`, `useFollowerCount`, `useFollowingCount` nur laden wenn Sidebar sichtbar/expanded. `usePlayerNames` nur wenn Community-Tab aktiv.

### 1d. Invalidation verschaerfen
- **File:** `src/lib/queries/invalidation.ts:31`
- **Problem:** `invalidateSocialQueries` invalidiert `['leaderboard']` fuzzy
- **Fix:** Leaderboard-Invalidation aus `invalidateSocialQueries` ENTFERNEN. Leaderboard hat eigenen 5min staleTime.

### 1e. Home Query-Priorisierung
- **File:** `src/app/(app)/page.tsx:93-103`
- **Problem:** 9 Queries beim Mount, nicht alle above-the-fold
- **Fix:** `useTodaysChallenge`, `useChallengeHistory`, `useUserTickets`, `useHighestPass` mit delayed `enabled` (nach 1s oder IntersectionObserver)

---

## Phase 2: Service Layer

**Ziel:** 50% weniger Payload, Waterfalls eliminieren.

### 2a. Fehlende Limits
| Service | File | Fix |
|---------|------|-----|
| `getAllActiveBounties()` | `services/bounties.ts` | `.limit(50)` + Pagination |
| `getUserJoinedEventIds()` | `services/events.ts` | `.limit(200)` |
| `getClubFanSegments()` | `services/clubCrm.ts:64-68` | `.limit(500)` auf Holdings |
| `getClubFanList()` | `services/clubCrm.ts:141` | `.limit(1000)` statt `userIds.length` |
| `getResearchPosts()` | `services/research.ts:16-21` | WHERE club_id in SQL statt JS-Filter |
| `enrichOffers()` | `services/offers.ts:17-54` | Chunk `.in()` in 100er-Batches |

### 2b. Waterfall → Promise.all
- **File:** `services/clubCrm.ts` getClubFanList()
- **Aktuell:** 6 sequentielle awaits
- **Fix:** 2 parallele Batches:
  - Batch 1: followers + clubPlayers (parallel)
  - Batch 2: profiles + subscriptions + holdings + activity (parallel, braucht IDs)

### 2c. SELECT * → Explicit Columns
- `services/adRevenueShare.ts:78`
- `services/airdropScore.ts:11,44,85`
- `services/fixtures.ts:12-17` (40+ Column Table!)
- `services/wallet.ts:93`
- Fix: Nur benoetigte Columns selektieren

### 2d. Research N+1 eliminieren
- **File:** `services/research.ts:85-100`
- **Problem:** Track Records fetcht ALLE research_posts nochmal pro Author
- **Fix:** Window Function Query (oder neuer RPC in Phase 3)

---

## Phase 3: Neue RPCs

**Ziel:** Heaviest Queries 10-100x schneller durch DB-Aggregation.

### 3a. `rpc_get_trending_players`
```sql
SELECT player_id,
       COUNT(*) as trade_count,
       SUM(price * quantity) as volume_24h,
       (MAX(price) - MIN(price)) / NULLIF(MIN(price), 0) as price_swing
FROM trades
WHERE executed_at > NOW() - INTERVAL '24 hours'
GROUP BY player_id
ORDER BY volume_24h DESC
LIMIT $1
```
Ersetzt: 1000 Rows fetch + JS aggregation → 5 Rows direkt.

### 3b. `rpc_get_club_fan_overview`
```sql
SELECT f.follower_id, p.display_name, p.avatar_url,
       cs.tier, COUNT(h.id) as cards_held,
       MAX(al.created_at) as last_active
FROM user_follows f
JOIN profiles p ON p.id = f.follower_id
LEFT JOIN club_subscriptions cs ON cs.user_id = f.follower_id AND cs.club_id = $1
LEFT JOIN holdings h ON h.user_id = f.follower_id
  AND h.player_id = ANY(SELECT id FROM players WHERE club_id = $1)
LEFT JOIN activity_log al ON al.user_id = f.follower_id
WHERE f.following_id = $1
GROUP BY f.follower_id, p.display_name, p.avatar_url, cs.tier
ORDER BY last_active DESC NULLS LAST
LIMIT 100
```
Ersetzt: 6 Round-Trips → 1 Call.

### 3c. `rpc_get_author_track_records`
```sql
SELECT user_id,
       COUNT(*) as total_calls,
       COUNT(*) FILTER (WHERE outcome = call) as correct_calls,
       ROUND(COUNT(*) FILTER (WHERE outcome = call)::numeric / NULLIF(COUNT(*), 0), 2) as hit_rate
FROM research_posts
WHERE user_id = ANY($1) AND outcome IS NOT NULL
GROUP BY user_id
```
Ersetzt: O(n^2) re-fetch aller Posts pro Author.

### 3d. `rpc_get_scouting_summary`
Direkt mit Club-Filter + Aggregation statt alle Posts fetchen und in Memory filtern.
Statt 10K Rows → 20-30 Rows (pro Spieler eine Zeile).

---

## Phase 4: React Rendering

**Ziel:** Kein Jank/Stutter bei Interaktionen.

### 4a. React.memo auf Presentational Components
| Component | File | Trigger fuer unnoetige Re-Renders |
|-----------|------|----------------------------------|
| HomeSpotlight | `home/HomeSpotlight.tsx` | Streak/Challenge State |
| HomeStoryHeader | `home/HomeStoryHeader.tsx` | Holdings Update |
| TopMoversStrip | `home/TopMoversStrip.tsx` | Jeder Home State Change |
| PortfolioStrip | `home/PortfolioStrip.tsx` | Events Update |
| CommunityHero | `community/CommunityHero.tsx` | Jeder der 13 States |
| CommunitySidebar | `community/CommunitySidebar.tsx` | Feed-Filter Change |
| StickyDashboardStrip | `player/detail/StickyDashboardStrip.tsx` | Tab-Wechsel |
| PlayerHero | `player/detail/PlayerHero.tsx` | Jeder Query-Update |

### 4b. Community State → useReducer
- **File:** `community/page.tsx:55-85`
- **Problem:** 13 useState = potentiell 13 separate Re-Renders
- **Fix:** useReducer mit CommunityState type. Ein Dispatch = ein Re-Render.

### 4c. Virtualisierung fuer lange Listen
- **Library:** `@tanstack/react-virtual` (bereits TanStack im Stack)
- **Targets:**
  - Community Feed (50 Posts)
  - Market Player Grid (100+ Spieler)
  - Leaderboard (50 Eintraege)
- Rendert nur sichtbare Items.

---

## Phase 5: Bundle & Initial Load

**Ziel:** 10-20% schnellerer Initial Load.

### 5a. optimizePackageImports erweitern
```js
optimizePackageImports: [
  'lucide-react', '@supabase/supabase-js', 'posthog-js',
  '@tanstack/react-query', 'next-intl', 'zustand',
  'date-fns', 'recharts',
]
```

### 5b. Barrel-Export Migration
- `queries/index.ts` schrittweise auf Direkt-Imports migrieren
- Kein Breaking Change, beide Wege funktionieren parallel

### 5c. Community Modals → dynamic import
- CreatePostModal, CreateResearchModal, CreateBountyModal, FollowListModal
- Alle nur nach User-Aktion sichtbar → `dynamic(() => import(...), { ssr: false })`

---

## Zusammenfassung

| Phase | Impact | Risiko | Aufwand |
|-------|--------|--------|---------|
| 1 Query-Fundamentals | 50-60% weniger API-Calls | Minimal | Mittel |
| 2 Service Layer | 50% weniger Payload | Niedrig | Mittel |
| 3 Neue RPCs | 10-100x fuer Heavy Queries | Mittel (Migration) | Hoch |
| 4 React Rendering | Kein Jank | Niedrig | Mittel |
| 5 Bundle | 10-20% schnellerer FCP | Minimal | Niedrig |

**Reihenfolge ist fix.** Jede Phase baut auf der vorherigen auf.
