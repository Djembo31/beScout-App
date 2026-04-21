# Impact 133 — /clubs player-count + follow-optimistic

## Consumer-Map

### Direct Callers der geänderten Funktionen

| Funktion | Caller | Kontext |
|---|---|---|
| `getClubsWithStats({activeOnly:true})` | `src/app/(app)/clubs/page.tsx:58` | useEffect-Promise.all im Mount |
| `ClubProvider.toggleFollow(clubId, name)` | `src/app/(app)/clubs/page.tsx:101` | Einziger direkter Caller |

### Read-Consumer von `ClubProvider.followedClubs` (Array-State)

Breit genutzt (14 Files), aber API-transparent — Optimistic-Update ändert nur Timing, nicht Shape:

- `src/components/layout/ClubSwitcher.tsx` — Pills auf allen App-Pages
- `src/components/layout/SideNav.tsx` — Badge/Switcher
- `src/components/onboarding/OnboardingChecklist.tsx` — hasClub-Check
- `src/components/profile/FollowListModal.tsx` — Liste mit Unfollow-Option
- `src/app/(app)/page.tsx` — Home-Hero
- `src/app/(app)/fantasy/FantasyContent.tsx` — Club-Filter
- `src/app/(app)/community/page.tsx` — Feed-Filter
- `src/app/(app)/club/[slug]/ClubContent.tsx` — Switcher + Related
- `src/app/(app)/hooks/useHomeData.ts`
- `src/components/missions/MissionBanner.tsx`
- `src/components/rankings/ClubLeaderboard.tsx`
- `src/features/market/components/marktplatz/ClubVerkaufSection.tsx`
- `src/lib/retentionEngine.ts`

→ Alle profitieren automatisch von schnellerem `followedClubs`-Update (instant statt nach 2 Roundtrips).

### Detail-Page `/club/[slug]` — UNBERÜHRT

Nutzt `src/components/club/hooks/useClubActions.ts`, das `toggleFollowClub` (Service) + `refreshProfile()` direkt aufruft. Provider-Fix ändert nichts an diesem Flow. Separate Optimistic-State-Machine (`localFollowing`/`localFollowerDelta`) bleibt.

## Side-Effects

| Bereich | Impact | Handling |
|---|---|---|
| **RLS** | Keine | `getClubsWithStats` liest `players.club_id` + `club_followers.club_id` — beide read-only, Public-lesen erlaubt |
| **Query-Keys (React Query)** | Keine | `getClubsWithStats` läuft außerhalb von React Query (direct Promise) |
| **Realtime** | Keine | `club_followers` hat kein Realtime-Sync — kein Subscriber-Impact |
| **Silent-Fail-Baseline** | Wahrscheinlich Verbesserung | Aktueller Code destrukturiert `{data}` ohne `{error}` (`audit HIGH`). Fix wird explicit error-throw einbauen. Baseline `.audit-baseline.json`: 188/93/95 — Fix kann HIGH-Count senken |
| **CSP / CORS** | Keine | Keine neuen Endpoints |
| **Bundle-Size** | Minimal | Chunking-Loop = +15 Zeilen, kein Dependency-Add |

## Migration

Keine. Reiner Client-Service-Fix.

## Rollback-Safe

✅ Ja. Frontend-only Change. Wenn Fix broken → Vercel-Rollback → Pre-Fix-State zurück. Keine Schema-Änderung.

## Test-Impact

- `src/lib/services/__tests__/club.test.ts` existiert (mit `mockSupabase`/`mockTable` Infrastruktur) → neuer Test `getClubsWithStats → handles >1000 rows via chunking`.
- `src/components/providers/__tests__/ClubProvider.test.tsx` existiert → neuer Test `toggleFollow → optimistic update + revert on error`.

## Risk-Level

**Niedrig.** API unverändert, nur Timing + interne Query-Strategie. Breit-genutzte State-Consumer profitieren transparent. Detail-Page unberührt.
