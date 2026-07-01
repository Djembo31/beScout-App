# Review — Slice 501: User-Follow auf React Query (kanonische useToggleFollowUser)

**Reviewer:** Cold-Context-Reviewer-Agent · **Datum:** 2026-07-01 · **time-spent:** 24 min
**Verdict:** PASS (1:1-Spiegel von useToggleFollowClub; 2 kosmetische Nitpicks, beide gefixt)

## Kernfragen (positiv belegt)
- **(a) Kein 3. Follow-Pfad mehr:** JA. `grep followUser|unfollowUser` nur noch in `social.ts` (Service) + `useToggleFollowUser.ts` (Hook). Weder useProfileData noch FollowListModal rufen sie direkt. Keine Orphans (`getFollowerCount`/`getFollowingCount` weiter legitim via RQ-Hooks + CreatePollModal; `isFollowing` via useIsFollowingUser + FollowListModal). §0-Schnitt-Regel erfüllt.
- **(b) Cross-Surface-Invalidation korrekt:** JA. `onSettled` invalidiert exakt me-scoped `stats(me)` (Community following_ids), `followingIds(me)`, `followingCount(me)`, `['social','feed',me]` (Prefix). Optimistic auf `isFollowing(me,target)` + `followerCount(target)` — `followerCount(target)` bewusst NICHT in onSettled (deterministic ±1, S143, pgBouncer-read-after-write vermieden).
- **(c) me/target-Verwechslung:** NEIN. Follower-Count=target, Following/Ids/Stats/Feed=me. handleRefreshStats invalidiert bewusst target-scoped Count-Keys (Profil-Refresh-Kontext) — anderer Scope als Toggle, beide korrekt.

## Findings (beide gefixt)
| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | NITPICK | useToggleFollowUser kein errorToast (Abweichung vom Club-Mirror) | ✅ `useTranslations('club')` + `errorToast: t('followError')` (DE+TR verifiziert, generische Follow-Fehler-Wording) — Parität hergestellt. |
| 2 | NITPICK | Tote Test-Mocks (S375): mockFollowUser/mockUnfollowUser/mockCheckIsFollowing + 5 follow-Service-Mock-Einträge | ✅ entfernt (consts + social-Mock-Einträge + beforeEach-Resets); getUserStats/refresh/checkAndUnlock/getUserAchievements bleiben. |
| 3 | INFO | Feed-Invalidation als `['social','feed',me]`-Prefix statt qk-Factory (wg. limit-Param) | Kein Handlungsbedarf — bewusstes Prefix-Pattern, konsistent mit useToggleFollowClub. |

## Checklist
- isSelf-Guard: `useIsFollowingUser(isSelf?undefined:me, …)` → disabled; handleFollow/Unfollow früh-return. Defense-in-Depth `followerId !== followingId`. ✓
- Return-Shape unverändert (ProfileDataResult) → ProfileView unberührt. ✓
- Promise.allSettled 9→7 re-indiziert korrekt (holdings[0]/stats[1]/research[2]/track[3]/trades[4]/fantasy[5]/payouts[6]). ✓
- FollowListModal: lokale followingMap (Display) + toggleFollowAsync + Rollback + isMe-Guard. ✓
- Pattern-Konsistenz mit useToggleFollowClub: sauber gespiegelt. ✓
- Tests portiert (nicht nur grün): useProfileData mockt RQ-Hooks + assertet toggleAsync-Calls/me-target-Params; ProfileView nutzt echte Hooks via QueryClientProvider (Integration).

## Summary
Vorbildlicher Konsolidierungs-Slice: eine kanonische Mutation ersetzt zwei divergente useState-Follow-Pfade, Cross-Surface-Fix auf korrekten me-scoped Keys, keine me/target-Verwechslung. Nitpicks nachträglich gefixt. Merge-reif.
