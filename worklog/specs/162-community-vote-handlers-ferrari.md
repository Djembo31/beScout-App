# Slice 162 — Community Vote-Handler Ferrari-Migration

**Size:** M · **Stage:** SPEC · **Started:** 2026-04-23
**Type:** Refactor (Mutation-Hardening, schliesst Vote-Handler-Block von Slice 160 ab)
**Reference:** `memory/patterns.md` #28 (Ferrari-Blueprint) · `.claude/rules/common-errors.md` §5 D18 (React setState Race) · `worklog/reviews/160-review.md` Finding #5

## Ziel

3 Community-Vote-Handler vom D17-Anti-Pattern (raw `async/try-catch` ohne synchronen Pending-Guard) auf `useSafeMutation`-Ferrari-Blueprint migrieren. Schliesst den Vote-Handler-Block nach Slice 160 (Semantik-Fix) ab — dort explizit als "Scope-Out: Tier-2 Data-Integrity Roadmap" vermerkt.

## Kontext aus Slice 160

Slice 160 hat den Vote-Toggle-Bug (Client sendete `voteType=0`, RPC rejected) über 4 UI-Files + 4 Handler semantisch gefixt. Der Semantik-Fix zog `isToggleOff` als expliziten Handler-State ein, aber ließ die Mutation-Race-Klasse D18 unberührt:
- `useCommunityActions.handleVotePost` (raw async, kein sync-Guard)
- `usePlayerCommunity.handleVotePlayerPost` (raw async, kein sync-Guard)
- `EventCommunityTab.handleVote` (raw async, kein sync-Guard)

Nur `PostReplies.voteReplyMut` war bereits auf useSafeMutation (Slice 159). Slice 162 baut das Pattern konsistent auf alle 4 Vote-Handler aus.

## Betroffene Files

1. **`src/components/community/hooks/useCommunityActions.ts`** — `handleVotePost` (komplex, mit Optimistic-Delta)
2. **`src/components/player/detail/hooks/usePlayerCommunity.ts`** — `handleVotePlayerPost` (einfacher, nur post-success-update)
3. **`src/components/fantasy/EventCommunityTab.tsx`** — `handleVote` (einfach, post-success-update)

## Fix-Strategie (Ferrari-Blueprint #28)

### Handler 1: `useCommunityActions.handleVotePost` (Optimistic)

```typescript
const votePostMut = useSafeMutation<
  Awaited<ReturnType<typeof votePost>>,
  Error,
  { postId: string; voteType: 1 | -1; isToggleOff: boolean; oldVote: number },
  { prevVotes: Map<string, number> }
>({
  mutationFn: async ({ postId, voteType, isToggleOff }) => {
    if (!userId) throw new Error('auth_required');
    return votePost(userId, postId, voteType, isToggleOff);
  },
  onMutate: async ({ postId, voteType, isToggleOff, oldVote }) => {
    const prevVotes = new Map(myPostVotes);
    // Optimistic-Delta auf posts-list cache
    queryClient.setQueryData<PostWithAuthor[]>(
      qk.posts.list({ limit: 50, clubId: scopeClubId } as Record<string, unknown>),
      (prev) => prev?.map(p => {
        if (p.id !== postId) return p;
        let up = p.upvotes, down = p.downvotes;
        if (oldVote === 1) up--;
        if (oldVote === -1) down--;
        if (!isToggleOff && voteType === 1) up++;
        if (!isToggleOff && voteType === -1) down++;
        return { ...p, upvotes: up, downvotes: down };
      }),
    );
    setMyPostVotes(prev => {
      const next = new Map(prev);
      if (isToggleOff) next.delete(postId);
      else next.set(postId, voteType);
      return next;
    });
    return { prevVotes };
  },
  onSuccess: (result, { postId }) => {
    // Server-truth override auf Optimistic
    queryClient.setQueryData<PostWithAuthor[]>(
      qk.posts.list({ limit: 50, clubId: scopeClubId } as Record<string, unknown>),
      (prev) => prev?.map(p =>
        p.id === postId ? { ...p, upvotes: result.upvotes, downvotes: result.downvotes } : p
      ),
    );
  },
  onError: (err, _vars, ctx) => {
    addToast(t('voteError'), 'error');
    if (ctx?.prevVotes) setMyPostVotes(ctx.prevVotes);
    queryClient.invalidateQueries({ queryKey: qk.posts.all });
  },
  errorTag: 'community.votePost',
});

const handleVotePost = useCallback((postId: string, voteType: 1 | -1) => {
  if (!userId) return;
  const oldVote = myPostVotes.get(postId) ?? 0;
  const isToggleOff = oldVote === voteType;
  votePostMut.safeTrigger({ postId, voteType, isToggleOff, oldVote });
}, [userId, myPostVotes, votePostMut]);
```

### Handler 2: `usePlayerCommunity.handleVotePlayerPost` (kein Optimistic)

Behält aktuelles post-success-update-Verhalten (kein breaking change). `mutationFn` + `onSuccess` (setQueryData + setMyPostVotes) + `onError` (log). `errorTag: 'player.votePost'`.

### Handler 3: `EventCommunityTab.handleVote` (inline, kein Optimistic)

Analog zu Handler 2. `onSuccess` (setPosts + setMyVotes). `errorTag: 'eventCommunity.vote'`.

## Acceptance Criteria

1. Alle 3 Handler nutzen `useSafeMutation` + `safeTrigger`, keine raw `async`/`try`/`catch` mehr.
2. `useCommunityActions.handleVotePost` behält Optimistic-Delta-Logic byte-identisch (up++/down++ mit isToggleOff-Guard).
3. Rollback-Semantik in `useCommunityActions` via `onError` + `ctx.prevVotes`-Snapshot (Blueprint-Phantom-Rollback-Fix-Pattern).
4. Per-Call-Pending via `mut.isPending` (kein lokaler Loading-State nötig).
5. Bestehende Tests grün: `useCommunityActions.test.ts` mit neuen 4-Arg-Assertions aus Slice 160.
6. `tsc --noEmit` clean.

## Edge Cases

1. **Rapid double-click**: `safeTrigger` synchroner MutationObserver-Guard blockt zweiten Click.
2. **Unauthenticated user**: `handleVotePost` early-return wenn `!userId` — MutationFn erzwingt Auth via throw.
3. **Service-Error**: mutationFn throws → onError → rollback + toast. Phantom-Rollback (prevVotes leer) via ctx-undefined-Guard.
4. **Concurrent votes auf verschiedene Posts**: useSafeMutation's MutationObserver isPending ist per-Observer-Instance — rapid clicks auf verschiedene Posts triggern separate calls OK, nur gleicher Click-auf-gleichen-Post blockiert.
5. **Race gegen optimistic rollback**: Wenn User Click#1 (A) → Click#2 (B, nachdem #1 fertig), dann Fail von #2 — rollback setzt myPostVotes zurück auf Snapshot AFTER #1. Server-truth via invalidate refresht. OK.

## Proof-Plan

- `npx tsc --noEmit` clean
- `npx vitest run src/components/community src/components/fantasy src/components/player` grün
- `git diff --stat` Summary
- Regression-Audit: `grep -rnE "const result = await votePost|await votePost\(.*\).*\\ncatch" src/components/` nach Slice → 0 raw-async-votePost-Pattern

## Scope-Out

- **Typed `votePost` service params** auf `1 | -1` strikt statt `1 | -1` + default `isToggleOff` — wurde in Slice 160 gesetzt, bleibt so.
- **Zusätzliche Optimistic-Updates** auf usePlayerCommunity/EventCommunityTab — könnte Consistency bringen, aber ist Verhalten-Änderung (UX-Diff). Separater Slice.
- **Konvention-Codification** `useQueryClient()` Hook vs Singleton (Slice 161 NIT #1) — orthogonaler Cleanup.
