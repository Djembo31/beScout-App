# 151b-RESET — Club-Follow State-Sync: ClubProvider.followedClubs entfernen + useSafeMutation Full-Pattern

**Datum:** 2026-04-23
**Size:** L (Cross-Domain: Provider + 12 Consumer + 1 Hook + 3 Test-Files)
**CEO-Scope:** Architektur approved via Option Z (`worklog/audits/state-sync-architecture-2026-04-23.md`). Spec zur Kontrolle.
**Trigger:** Anil-Report Club-Follow-UI "zeigt mal 0, mal 4 Scouts, blinzelt, Unfollow/Follow syncht nicht". State-Sync-Audit hat Klasse A (Dual-State-Drift) + Klasse C (Zwei-Provider) + Klasse D (Animation auf volatile Daten) als Root-Cause identifiziert.

## Ziel

Nach diesem Slice ist Club-Follow/Unfollow auf einer Single-Source-of-Truth (React-Query-Cache). Der Button zeigt in jedem Render genau **einen** Wert, der entweder Optimistic (während Pending) oder vom Server ist. Kein Blinzeln, keine Zwischenwerte, keine Desync zwischen Hero/StatsBar/Sidebar.

## Kontext — was Slice 151b gemacht hat und warum es unvollständig war

Slice 151b migrierte `useClubActions` auf `useSafeMutation` und löste das Race-Problem (rapid-fire double-click). Aber:

1. **Dual-State blieb:** `useClubActions` hat immer noch `localFollowing` + `localFollowerDelta` als `useState`. Parallel dazu lesen andere Consumer `ClubProvider.followedClubs`. 3 Quellen für den gleichen Wert.
2. **ClubProvider.toggleFollow existiert parallel:** `src/app/(app)/clubs/page.tsx` benutzt ihn, `useClubActions` umgeht ihn. Zwei Code-Pfade, zwei Optimistic-Strategien.
3. **useCountUp auf Follower-Count:** `ClubHero.tsx:63-65` + `ClubStatsBar.tsx:44-45` animieren jeden Zwischenwert, also auch stale/optimistic-0-Zustände.

Das sind die drei Klassen aus dem Audit. Dieser Slice adressiert alle drei.

## Strategy — Zielbild

**Behalten im ClubProvider** (legitimer UI-State):
- `activeClub` + `setActiveClub` — ausgewählter Club in der Sidebar-Navigation
- `loading` — initial hydration flag

**Aus ClubProvider entfernen** (Server-Daten, gehören in Query-Cache):
- `followedClubs[]` → neuer Hook `useFollowedClubs(userId)` via existierende `getUserFollowedClubs`-Service + `qk.clubs.followedClubs(userId)` Query-Key (falls noch nicht existiert: anlegen)
- `primaryClub` → abgeleitet via `useFollowedClubs()` + `.find(c => c.is_primary)` in einem kleinen Convenience-Hook `usePrimaryClub()`
- `isFollowing(clubId)` → `useIsFollowingClub(userId, clubId)` (Query existiert bereits für Follower-Count-Logik, Key `qk.clubs.isFollowing`)
- `toggleFollow()` → `useToggleFollowClub()` useSafeMutation-Hook, nutzt `onMutate`/`onError`/`onSettled` **ohne** lokale useState-Spiegel

**useClubActions** (existiert seit Slice 151b) wird auf reines Query-Cache-Pattern umgebaut:
- `localFollowing` / `localFollowerDelta` **entfernen**
- `onMutate` snapshot aller betroffenen Query-Keys + `setQueryData(optimistic)` → Rollback via Context in `onError`
- `onSettled` optional `invalidateQueries` nur auf den Follower-Count (wegen Cross-User-Drift), **nicht** auf `isFollowing(uid, clubId)` (`setQueryData` ist deterministisch)

**useCountUp-Stabilisierung:**
- `ClubHero.tsx` + `ClubStatsBar.tsx`: `useDeferredValue(followerCount)` als Input für `useCountUp`, damit React Zwischenwerte throttlet
- Alternative (weniger invasiv): `useCountUp` nur aktivieren wenn `isFetching` false — per Flag von `useClubFollowerCount`

## Betroffene Files (14 non-test, 3 test)

| # | File | Change |
|---|------|--------|
| 1 | `src/components/providers/ClubProvider.tsx` | `followedClubs`/`primaryClub`/`isFollowing`/`toggleFollow` entfernen. Nur noch `activeClub`/`setActiveClub`/`loading`. Datei von 255 auf ~80 LOC. |
| 2 | `src/lib/queries/keys.ts` | Key `qk.clubs.followedClubs(userId)` prüfen/ergänzen |
| 3 | `src/lib/hooks/useFollowedClubs.ts` | **NEU** — `useQuery` auf `getUserFollowedClubs(userId)` mit 30s staleTime |
| 4 | `src/lib/hooks/usePrimaryClub.ts` | **NEU** — convenience, returns `useFollowedClubs().data?.find(is_primary)` |
| 5 | `src/lib/hooks/useToggleFollowClub.ts` | **NEU** — `useSafeMutation` mit onMutate/onError/onSettled auf Query-Cache |
| 6 | `src/components/club/hooks/useClubActions.ts` | `localFollowing`/`localFollowerDelta` raus. Nutze `useToggleFollowClub` + `useIsFollowingClub` + `useClubFollowerCount`. Pending-Flag direkt von mutation. |
| 7 | `src/app/(app)/clubs/page.tsx` | `useClub().isFollowing/toggleFollow/activeClub/setActiveClub` → `useIsFollowingClub` + `useToggleFollowClub` + behaltene `useClub().activeClub`/`setActiveClub` |
| 8 | `src/app/(app)/club/[slug]/ClubContent.tsx` | `useClub().followedClubs` → `useFollowedClubs()` |
| 9 | `src/app/(app)/hooks/useHomeData.ts` | `useClub().followedClubs` → `useFollowedClubs()` |
| 10 | `src/components/missions/MissionBanner.tsx` | `useClub().followedClubs` → `useFollowedClubs()` |
| 11 | `src/components/onboarding/OnboardingChecklist.tsx` | `useClub().followedClubs` → `useFollowedClubs()` |
| 12 | `src/features/market/components/marktplatz/ClubVerkaufSection.tsx` | `useClub().followedClubs` → `useFollowedClubs()` |
| 13 | `src/components/layout/ClubSwitcher.tsx` | `useClub().followedClubs` → `useFollowedClubs()`; `activeClub/setActiveClub/loading` bleiben auf ClubProvider |
| 14 | `src/components/club/ClubHero.tsx` | `useCountUp(followerCount)` → `useCountUp(useDeferredValue(followerCount))` |
| 15 | `src/components/club/ClubStatsBar.tsx` | dito |
| T1 | `src/components/providers/__tests__/ClubProvider.test.tsx` | Tests für entfernte APIs raus, bleibt activeClub-Test |
| T2 | `src/lib/hooks/__tests__/useToggleFollowClub.test.ts` | **NEU** — onMutate snapshot, onError rollback, onSuccess deterministic |
| T3 | `src/components/club/hooks/__tests__/useClubActions.test.ts` | Assertions auf localFollowing raus; Query-Cache-Assertions rein |

**Unverändert** (activeClub-only Consumer, nichts zu tun):
- `AdminGameweeksTab.tsx`, `community/page.tsx`, `FantasyContent.tsx`, `SideNav.tsx`, `ClubLeaderboard.tsx` — nutzen nur `useClub().activeClub`

## Acceptance Criteria

1. **Keine Dual-State-Drift:** `ClubProvider` exportiert kein `followedClubs`/`primaryClub`/`isFollowing`/`toggleFollow` mehr. `grep -rn "\.followedClubs\|\.primaryClub\|useClub().*isFollowing\|useClub().*toggleFollow" src/` zeigt 0 Treffer (außer Test-Entfernungs-Doku).
2. **useClubActions hat keine useState für Server-Daten mehr:** `grep "useState" src/components/club/hooks/useClubActions.ts` → 0 Zeilen.
3. **Keine Blinzler beim Follow:** Manueller Test (2 Accounts, A folgt B, dann A unfollow): Button wechselt exakt einmal von "Folgen" → "Entfolgen" und zurück, ohne Zwischenwerte.
4. **Follower-Count in ClubHero + ClubStatsBar sind gleich:** Während des Mutations-Pending zeigen beide denselben optimistischen Wert. Keine 2 Animations-Zyklen.
5. **Error-Rollback funktioniert:** Bei simuliertem `toggleFollowClub`-Throw rollt die UI zurück. Test-Proof.
6. **tsc --noEmit clean.**
7. **`npx vitest run src/lib/hooks src/components/club/hooks src/components/providers` green.**
8. **Playwright gegen bescout.net:** Follow/Unfollow-Button funktioniert, Count stimmt. Screenshot pre + post commit.

## Edge Cases

1. **pgBouncer read-after-write-transient:** Slice 139 Pattern — nach `toggleFollowClub()` liefert Re-Fetch manchmal stale Row. Mitigation: `setQueryData(optimistic)` in onMutate + `invalidateQueries` nur für Follower-Count (nicht für isFollowing), weil isFollowing deterministic ±1 ist.
2. **User-Switch beim Login/Logout:** Beim sign-out alle `qk.clubs.*(oldUserId)` Queries removen (`queryClient.removeQueries`). Wird in `AuthProvider`/`signOut` gemacht falls nicht bereits.
3. **SSR / Hydration-Mismatch:** `useFollowedClubs(null)` wenn kein User → Query disabled. Muss `data: undefined` sein, nicht lokale `[]`-Defaultierung in Consumer.
4. **Rapid Click:** `useSafeMutation.safeTrigger` hat synchronen Pending-Guard (Slice 151a) — weiterhin gültig.
5. **onError Rollback Partial:** Wenn `setQueryData(optimistic)` für 2 Keys rollbacked werden muss, beide aus snapshot zurücksetzen. Sonst Drift.
6. **Follower-Count < 0:** `Math.max(0, prev + delta)` — bereits in existing useClubActions (Zeile 75). Behalten.
7. **Provider.activeClub Memory-Leak beim Logout:** `setActiveClubState(null)` + sessionStorage clear — bereits implementiert (Zeile 96-98).
8. **Test-Mocks:** ClubProvider-Tests die `toggleFollow` mocken müssen auf `useToggleFollowClub`-Mock umgestellt werden. Alle 3 Test-Files prüfen.
9. **Race zwischen 2 parallel-open Tabs:** setQueryData in Tab 1, Tab 2 sieht erst beim nächsten Focus / invalidate den Wert. Akzeptiert — wird via invalidate-on-focus automatisch reconciled (React Query default).
10. **i18n:** `followError` Toast bleibt i18n-gekapselt, wie in useClubActions 151b.

## Proof-Plan

1. **tsc + vitest** — Output `worklog/proofs/151b-RESET-tsc-vitest.txt`
2. **Playwright screenshot** gegen bescout.net (`jarvis-qa@bescout.net`):
   - Pre: `/club/galatasaray` als jarvis-qa, NOT following → Screenshot
   - Click Follow → wait pending → success → Screenshot (shows "Entfolgen" + count +1)
   - Click Unfollow → Screenshot (shows "Folgen" + count -1)
   - Speichere nach `worklog/proofs/151b-RESET-screenshot-follow.png`, `-unfollow.png`
3. **State-Audit-Grep:** `grep -rn "followedClubs\|primaryClub\|isFollowing.*useClub\|toggleFollow.*useClub" src/` — Output nach `worklog/proofs/151b-RESET-state-audit.txt`, muss 0 non-test-Treffer ergeben
4. **Review:** `worklog/reviews/151b-RESET-review.md` von reviewer-Agent

## Scope-Out

- **WalletProvider / usePlayerTrading Refactor** → Slice 152-153 (Phase 2 Money)
- **useEventActions / FantasyStore** → Slice 156 (Phase 3)
- **useWatchlistActions opt-id-Refactor** → Slice 157
- **useCommunityActions Votes/Bounties** → Slice 158
- **Profile Follower/Following** → Slice 159
- **ESLint-Rule gegen Dual-State-Pattern** → Slice 161
- **Audit-File committen** → bereits Commit `f0cfbc6b`

## Implementation Order (one file at a time)

1. Keys hinzufügen (`qk.clubs.followedClubs`) — tsc check
2. `useFollowedClubs` Hook erstellen — tsc check, kleiner unit-test
3. `usePrimaryClub` Hook erstellen — tsc check
4. `useToggleFollowClub` Hook erstellen + Test — vitest green
5. `useClubActions` refactor — test update + vitest green
6. 7 Consumer migrieren (alphabetisch) — tsc check nach jedem
7. ClubHero / ClubStatsBar `useDeferredValue` — tsc check
8. ClubProvider schrumpfen — tsc check, vitest
9. ClubProvider-Test update — vitest green
10. Full suite `npx vitest run` — all green
11. Playwright manual
12. Review Agent

## Risk / Rollback

- Alle Änderungen sind client-side. Kein DB-Migration, keine RPC-Änderung.
- Rollback = `git revert <commit>` reicht. Service-Layer (`toggleFollowClub`) bleibt unverändert.
- Deploy-Risk: mittel — ClubProvider-API-Breaking würde zur Runtime-Crash führen wenn Consumer übersehen. Mitigation: tsc-Check fängt fehlende Consumer, visual Test verifiziert keine Runtime-Errors.
