'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { followUser, unfollowUser } from '@/lib/services/social';
import { qk } from '@/lib/queries/keys';
import { useSafeMutation } from './useSafeMutation';

/**
 * Slice 501 (W4) — kanonische User-Follow-Toggle-Mutation für `user_follows`.
 * Spiegel von {@link useToggleFollowClub}. Ersetzt das lokale useState-Follow in
 * `useProfileData` + `FollowListModal` (kein dritter Follow-Pfad, §0).
 *
 * Target kommt als Mutation-Variable (nicht Hook-Param) → in Listen nutzbar
 * (FollowListModal: eine Hook-Instanz, `toggleAsync({targetUserId, follow})` pro Item).
 *
 * Optimistic (deterministic ±1) via setQueryData:
 *   1. `qk.social.isFollowing(me, target)` — boolean
 *   2. `qk.social.followerCount(target)`   — Ziel-Follower ±1
 * onSettled invalidiert die **me-scoped** Ableitungen (der Cross-Surface-Fix — Profil-/
 * Listen-Follow reconciliert den Community-„Folge ich"-Filter + Following-Feed):
 *   `stats(me)` [Community following_ids] · `followingIds(me)` · `followingCount(me)` · `feed(me)`.
 * Refetch nur wenn die jeweilige Query gemountet ist.
 */
export interface ToggleFollowUserVariables {
  targetUserId: string;
  follow: boolean;
}

interface RollbackContext {
  prevIsFollowing: boolean | undefined;
  prevFollowerCount: number | undefined;
}

export function useToggleFollowUser(): {
  toggle: (vars: ToggleFollowUserVariables) => void;
  toggleAsync: (vars: ToggleFollowUserVariables) => Promise<void>;
  isPending: boolean;
  error: Error | null;
} {
  const { user } = useUser();
  const qc = useQueryClient();
  const t = useTranslations('club'); // 'followError' = generisches „Fehler beim Folgen/Entfolgen" (DE+TR), Parität mit useToggleFollowClub

  const mutation = useSafeMutation<void, Error, ToggleFollowUserVariables, RollbackContext>({
    mutationFn: async ({ targetUserId, follow }) => {
      if (!user) throw new Error('no_user');
      if (follow) await followUser(user.id, targetUserId);
      else await unfollowUser(user.id, targetUserId);
    },
    onMutate: async ({ targetUserId, follow }) => {
      if (!user) {
        return { prevIsFollowing: undefined, prevFollowerCount: undefined };
      }
      await Promise.all([
        qc.cancelQueries({ queryKey: qk.social.isFollowing(user.id, targetUserId) }),
        qc.cancelQueries({ queryKey: qk.social.followerCount(targetUserId) }),
      ]);

      const prevIsFollowing = qc.getQueryData<boolean>(qk.social.isFollowing(user.id, targetUserId));
      const prevFollowerCount = qc.getQueryData<number>(qk.social.followerCount(targetUserId));

      qc.setQueryData<boolean>(qk.social.isFollowing(user.id, targetUserId), follow);
      qc.setQueryData<number>(qk.social.followerCount(targetUserId), (prev) =>
        prev === undefined ? prev : Math.max(0, prev + (follow ? 1 : -1)),
      );

      return { prevIsFollowing, prevFollowerCount };
    },
    onError: (_err, { targetUserId }, ctx) => {
      if (!user || !ctx) return;
      if (ctx.prevIsFollowing !== undefined) {
        qc.setQueryData(qk.social.isFollowing(user.id, targetUserId), ctx.prevIsFollowing);
      }
      if (ctx.prevFollowerCount !== undefined) {
        qc.setQueryData(qk.social.followerCount(targetUserId), ctx.prevFollowerCount);
      }
    },
    onSettled: async () => {
      if (!user) return;
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.social.stats(user.id) }),
        qc.invalidateQueries({ queryKey: qk.social.followingIds(user.id) }),
        qc.invalidateQueries({ queryKey: qk.social.followingCount(user.id) }),
        // feed-Key trägt einen limit-Parameter → Prefix invalidiert alle Varianten.
        qc.invalidateQueries({ queryKey: ['social', 'feed', user.id] }),
      ]);
    },
    errorToast: t('followError'),
    errorTag: 'profile.toggleFollowUser',
  });

  const toggle = useCallback(
    (vars: ToggleFollowUserVariables) => mutation.safeTrigger(vars),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation.safeTrigger, mutation.isPending],
  );

  const toggleAsync = useCallback(
    (vars: ToggleFollowUserVariables) => mutation.mutateAsync(vars),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation.mutateAsync],
  );

  return {
    toggle,
    toggleAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
