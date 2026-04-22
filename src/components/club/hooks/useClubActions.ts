import { useCallback } from 'react';
import { useToggleFollowClub } from '@/lib/hooks/useToggleFollowClub';
import type { ClubWithAdmin } from '@/types';
import type { ClubActionsResult } from './types';

/**
 * Slice 151b-RESET — dünner Wrapper um `useToggleFollowClub`.
 *
 * Vorher (Slice 151b): lokaler `useState(localFollowing)` + `useState(localFollowerDelta)`
 * parallel zum Query-Cache → Dual-State-Drift (Klasse A im
 * State-Sync-Audit 2026-04-23). Rapid-Click-Race war zwar durch
 * `useSafeMutation.safeTrigger` gefixt, aber die 3 parallelen Quellen
 * (local + `isFollowingData` prop + `ClubProvider.followedClubs`) konnten
 * divergieren.
 *
 * Nachher: Keine lokalen Spiegel mehr. `isFollowingData` / `followerCountData`
 * kommen vom Query-Cache (Consumer nutzt `useIsFollowingClub` + `useClubFollowerCount`).
 * Während des Mutation-Pending schreibt `useToggleFollowClub.onMutate` den
 * optimistischen Wert direkt in den Cache — `isFollowingData` liefert ihn
 * beim nächsten Render. onError rollt den Cache zurück (auch ohne Rerender
 * dieses Hook-Consumers). Single Source of Truth.
 */

interface UseClubActionsParams {
  club: ClubWithAdmin | null | undefined;
  isFollowingData: boolean;
  followerCountData: number;
}

export function useClubActions({
  club,
  isFollowingData,
  followerCountData,
}: UseClubActionsParams): ClubActionsResult {
  const { toggle, isPending } = useToggleFollowClub();

  const handleFollow = useCallback(() => {
    if (!club) return;
    toggle({ club, follow: !isFollowingData });
  }, [club, isFollowingData, toggle]);

  return {
    isFollowing: isFollowingData,
    followerCount: followerCountData,
    followLoading: isPending,
    handleFollow,
  };
}
