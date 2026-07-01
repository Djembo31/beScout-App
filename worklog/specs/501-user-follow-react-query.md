# Slice 501 — W4: User-Follow auf React Query (kanonische Toggle-Mutation)

**Slice-Type:** Service/Hook (+ 2 UI-Consumer) · **Größe:** M · **Scope:** kein Money/Security, W4-Architektur (User-Follow-Rest) · **CEO:** Anil „zieh slice 501 durch" (nach W4-Lücken-Catch)

## 1. Problem-Statement (Evidence: useProfileData:49-181 + FollowListModal:75-88)
User-Follow (`user_follows`, Scouts/User folgen) trägt dieselbe Schuld wie pre-500 Club-Follow, in **2 Surfaces**:
- `useProfileData.ts`: `following`/`followerCount`/`followingCount` = page-lokales `useState`; `handleFollow`/`handleUnfollow` (Z.161-181) rufen raw `followUser`/`unfollowUser` + lokal `setState`, **keine RQ-Invalidation**.
- `FollowListModal.tsx`: `followingMap` lokal (Z.28,75-88), raw follow/unfollow, keine RQ-Invalidation.
**Cross-Surface-Staleness (code-verifiziert):** beide invalidieren `useUserSocialStats` (`qk.social.stats`, speist Community-`following_ids`-Filter) NICHT → Profil-/Listen-Follow aktualisiert den Community-„Folge ich"-Filter + Following-Feed nicht sofort.
`queries/social.ts` hat bereits `useFollowerCount`/`useFollowingCount`/`useFollowingIds`/`useUserSocialStats`/`useFollowingFeed` — aber **kein** `useIsFollowingUser` + **keine** Toggle-Mutation → die Surfaces umgehen die vorhandene RQ-Schicht.

## 2. Lösungs-Design (§0: EINE kanonische Mutation, Spiegel von useToggleFollowClub)
- NEU `qk.social.isFollowing(followerId, followingId)` Key.
- NEU `useIsFollowingUser(followerId, followingId)` (queries/social.ts) — Query-Hook.
- NEU `lib/hooks/useToggleFollowUser.ts` — Mutation-Hook (Variable-basiert `{targetUserId, follow}`, Spiegel von useToggleFollowClub):
  - `onMutate` optimistic: `qk.social.isFollowing(me, target)` → follow · `qk.social.followerCount(target)` → ±1.
  - `onError`: rollback beide.
  - `onSettled` (Cross-Surface-Fix): invalidate `qk.social.stats(me)` + `followingIds(me)` + `followingCount(me)` + `feed(me)` → Community-Filter/Feed reconcilen.
- `useProfileData.ts`: `following`+isFollowing-useEffect → `useIsFollowingUser`; `followerCount`/`followingCount` → `useFollowerCount`/`useFollowingCount` (aus Promise.allSettled raus); `handleFollow`/`handleUnfollow`/`followLoading` → `useToggleFollowUser`. **Return-Shape unverändert** (ProfileView unberührt). `handleRefreshStats` invalidiert die Count-Keys statt setState.
- `FollowListModal.tsx`: `handleToggleFollow` durch `useToggleFollowUser().toggleAsync` routen (lokale `followingMap` für per-Item-Display bleibt, Rollback bei Error) → gleiche RQ-Invalidation.

## 3. Betroffene Files
`keys.ts` (+isFollowing) · `queries/social.ts` (+useIsFollowingUser) · NEU `lib/hooks/useToggleFollowUser.ts` · `useProfileData.ts` (Migration) · `FollowListModal.tsx` (Toggle→Hook) · Tests: `useProfileData.test.ts`, `ProfileView.test.tsx`, `social.test.ts` (+ ggf. FollowListModal-Test).

## 4. Code-Reading (erledigt)
- ✅ `useToggleFollowClub` (Spiegel-Template: onMutate/onError/onSettled + toggle/toggleAsync via useSafeMutation) · ✅ `queries/social.ts` (vorhandene Hooks + qk.social) · ✅ `social.ts` (followUser/unfollowUser/isFollowing/getFollowerCount/getFollowingCount RPCs) · ✅ `useProfileData` Follow-Section + Return-Shape (ProfileView-Contract) · ✅ `FollowListModal` (eigene followingMap-Toggle) · ✅ `useUserSocialStats` = `qk.social.stats` (Community following_ids).

## 5. Pattern-References
- useToggleFollowClub (Slice 151b/500 — Query-Cache = Wahrheit, deterministic ±1 via setQueryData, indeterministic via invalidate) · S143 · §0 (EINE Mutation für 2 Surfaces, kein 3. Follow-Pfad).

## 6. Acceptance Criteria
1. `useToggleFollowUser` existiert, von useProfileData UND FollowListModal genutzt (kein raw followUser/unfollowUser mehr in den Consumern außer via Hook).
2. Profil-Follow invalidiert `qk.social.stats(me)` → Community-„Folge ich"-Filter reconciled (Cross-Surface-Fix).
3. useProfileData Return-Shape unverändert → ProfileView ohne Change.
4. tsc 0 · useProfileData/ProfileView/social-Tests grün.
5. **Live-Walk Gesamtflow:** Profil eines anderen Users folgen → Button-Toggle + Follower-Count → „Folge ich"-Tab im Community-Feed zeigt dessen Posts → unfollow → sauber zurück. Console 0 Errors.

## 7. Edge Cases
- isSelf → kein Follow-Button/Query (`enabled: !isSelf && !!user`).
- followerCount=TARGET, followingCount=TARGET (Display); die me-scoped Invalidation betrifft `stats(me)`/`followingCount(me)` — nicht die Target-Display-Counts (die kommen aus useFollowerCount(target)).
- FollowListModal: Liste kann den aktuellen User enthalten (isMe) → kein Toggle.
- Optimistic followerCount `Math.max(0,…)`.
- FollowListModal per-Item: Hook-Instanz 1×, `toggleAsync({targetUserId, follow})` pro Klick (kein Hook-in-Loop).

## 8. Self-Verification
- `npx tsc --noEmit` · `npx vitest run src/components/profile src/lib/services/__tests__/social.test.ts`
- grep: raw `followUser(`/`unfollowUser(` nur noch in social.ts (Service) + useToggleFollowUser (Hook), nicht mehr in useProfileData/FollowListModal.
- Live: Profil-Follow → Community-„Folge ich"-Reconcile.

## 9. Open-Questions
- Geklärt: kanonische Mutation für beide Surfaces (§0).

## 10. Proof-Plan
- `worklog/proofs/501-user-follow-rq.txt`: tsc + vitest + grep + Live-Walk Gesamtflow (Screenshots/State).

## 11. Scope-Out
- `getFollowingFeed`-Realtime (useFollowingFeed) unberührt.
- Follow-Notifications (followUser RPC macht sie server-seitig) unberührt.
- FollowListModal per-Item-isFollowing bleibt Promise.allSettled-Batch (kein N-Query-RQ).

## 12. Stage-Chain
SPEC → BUILD → REVIEW (Cold-Context, cross-surface: profile+modal+community-filter) → PROVE (tests + Live-Walk-Gesamtflow) → LOG.

## 13. Pre-Mortem
1. Return-Shape-Drift bricht ProfileView → Shape strikt erhalten, tsc+ProfileView-Test. 
2. isSelf-Query feuert → `enabled:!isSelf`.
3. FollowListModal Hook-in-Loop → 1 Hook-Instanz + variable-basierter Toggle.
4. Optimistic + onSettled-Refetch Flicker → Werte stimmen (Server committed), keepPreviousData.
5. Community-Feed „Folge ich" bricht durch stats-Invalidation → invalidate refetcht korrekte following_ids (kein Bruch).
6. followingCount(me) nicht invalidiert → im onSettled mit drin.
