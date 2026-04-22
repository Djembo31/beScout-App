import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { toggleFollowClub } from '@/lib/services/club';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import type { ClubWithAdmin } from '@/types';
import type { ClubActionsResult } from './types';

/**
 * Slice 151b — Pilot-Migration zu useSafeMutation (Phase 1 Mutation Hardening).
 *
 * Vorher (Slice 149b-Bug): useState(followLoading) + handleFollow mit async +
 * `if (followLoading) return`-Guard. React setState async → Rapid-Click-Race
 * konnte 2 parallele toggleFollowClub-Calls + 2 optimistic-Updates ausloesen.
 *
 * Nachher: useSafeMutation mit synchron-gepruefter isPending. `safeTrigger`
 * kurzschliesst rapid-fire calls auf Hook-Level. Keine Race-Gap.
 *
 * Optimistic-Update-Pattern: onMutate snapshots prev-state + mutiert lokal,
 * onError rollback via snapshot-context, onSuccess reset lokal + invalidate.
 */

interface UseClubActionsParams {
  club: ClubWithAdmin | null | undefined;
  isFollowingData: boolean;
  followerCountData: number;
}

interface OptimisticContext {
  prevLocalFollowing: boolean | null;
  prevLocalFollowerDelta: number;
}

export function useClubActions({
  club,
  isFollowingData,
  followerCountData,
}: UseClubActionsParams): ClubActionsResult {
  const { user, refreshProfile } = useUser();
  const t = useTranslations('club');

  const [localFollowing, setLocalFollowing] = useState<boolean | null>(null);
  const [localFollowerDelta, setLocalFollowerDelta] = useState(0);

  const isFollowing = localFollowing ?? isFollowingData;
  const followerCount = followerCountData + localFollowerDelta;

  const followMut = useSafeMutation<void, Error, boolean, OptimisticContext>({
    mutationFn: async (newFollowing) => {
      if (!user || !club) throw new Error('no_user_or_club');
      await toggleFollowClub(user.id, club.id, club.name, newFollowing);
      await refreshProfile();
    },
    onMutate: (newFollowing) => {
      const prevLocalFollowing = localFollowing;
      const prevLocalFollowerDelta = localFollowerDelta;
      setLocalFollowing(newFollowing);
      setLocalFollowerDelta((prev) => prev + (newFollowing ? 1 : -1));
      return { prevLocalFollowing, prevLocalFollowerDelta };
    },
    onSuccess: (_data, newFollowing) => {
      if (!user || !club) return;
      setLocalFollowerDelta(0);
      setLocalFollowing(null);
      // Slice 143 pattern: setQueryData statt invalidateQueries fuer deterministic
      // ±1-Mutation. Vermeidet pgBouncer-read-after-write-Drift (siehe
      // .claude/rules/common-errors.md §2 "pgBouncer Read-After-Write").
      queryClient.setQueryData<boolean>(
        qk.clubs.isFollowing(user.id, club.id),
        newFollowing,
      );
      queryClient.setQueryData<number>(qk.clubs.followers(club.id), (prev) =>
        prev === undefined ? prev : Math.max(0, prev + (newFollowing ? 1 : -1)),
      );
    },
    onError: (_err, _variables, ctx) => {
      setLocalFollowing(ctx?.prevLocalFollowing ?? null);
      setLocalFollowerDelta(ctx?.prevLocalFollowerDelta ?? 0);
    },
    errorToast: t('followError'),
    errorTag: 'club.follow',
  });

  const handleFollow = useCallback(() => {
    if (!user || !club) return;
    followMut.safeTrigger(!isFollowing);
  }, [user, club, isFollowing, followMut]);

  return {
    isFollowing,
    followerCount,
    followLoading: followMut.isPending,
    handleFollow,
  };
}
