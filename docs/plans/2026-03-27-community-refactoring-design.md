# Community Refactoring — Design

**Date:** 2026-03-27
**Scope:** Orchestrator slim-down — extract 2 hooks from page.tsx (751 LOC)
**Approach:** Same pattern as PlayerDetail: data hook + actions hook

## Problem

`src/app/(app)/community/page.tsx` is 751 LOC with:
- Reducer + 18 actions (L42-110): ~70 LOC — UI state, stays
- 14 React Query hooks (L157-169): ~15 LOC
- 4 side-effect useEffects (L188-250): ~65 LOC (club resolution, vote data, poll votes, subscriptions)
- 12 handler functions (L252-529): ~280 LOC — biggest chunk
- Render (L533-750): ~220 LOC

## Solution: 2 New Hooks

### Hook 1: `useCommunityData`
Moves into hook:
- All 14 React Query hooks
- 4 side-effect useEffects (club resolution, vote data, poll votes, subscription map)
- Derived data (followingIds Set, ownedPlayerIds Set, userRangTier)
- Map/Set state (myPostVotes, userVotedIds, userPollVotedIds, subscriptionMap)

Stays in page.tsx:
- `scopeClubId` computation (depends on reducer state)

Signature:
```ts
function useCommunityData(userId: string | undefined, profile: ..., scopeClubId: string | undefined, state: CommunityState, dispatch: Dispatch)
```

Returns: posts, clubVotes, leaderboard, followingIds, ownedPlayerIds, researchPosts, bounties, communityPolls, subscription, userStats, userRangTier, myPostVotes, userVotedIds, userPollVotedIds, subscriptionMap, postsLoading, postsError, allPlayers

### Hook 2: `useCommunityActions`
Moves into hook:
- All 12 handler functions (handleVotePost, handleDeletePost, handleAdminDeletePost, handleTogglePin, handleCreatePost, handleCreateResearch, handleBountySubmit, handleUnlockResearch, handleRateResearch, handleCastVote, handleCastPollVote, handleCancelPoll, handleCreateBounty)

Needs as input: userId, state (clubId, clubName), dispatch, scopeClubId, myPostVotes, setMyPostVotes (from data hook)

### File locations
- `src/components/community/hooks/useCommunityData.ts`
- `src/components/community/hooks/useCommunityActions.ts`
- `src/components/community/hooks/index.ts`

## Expected Result
- **page.tsx**: 751 → ~300 LOC (reducer + UI state + render)
- **useCommunityData**: ~150 LOC
- **useCommunityActions**: ~300 LOC
- No bridges needed — no file moves
- No breaking changes

## Out of Scope
- No file moves to `features/community/`
- No sub-component changes
- No reducer refactoring
- No UI changes
