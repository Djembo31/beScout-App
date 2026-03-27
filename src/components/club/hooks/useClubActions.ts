import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { toggleFollowClub } from '@/lib/services/club';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import type { ClubWithAdmin } from '@/types';
import type { ClubActionsResult } from './types';

interface UseClubActionsParams {
  club: ClubWithAdmin | null | undefined;
  isFollowingData: boolean;
  followerCountData: number;
}

export function useClubActions({ club, isFollowingData, followerCountData }: UseClubActionsParams): ClubActionsResult {
  const { user, refreshProfile } = useUser();
  const { addToast } = useToast();
  const t = useTranslations('club');

  const [followLoading, setFollowLoading] = useState(false);
  const [localFollowing, setLocalFollowing] = useState<boolean | null>(null);
  const [localFollowerDelta, setLocalFollowerDelta] = useState(0);

  const isFollowing = localFollowing ?? isFollowingData;
  const followerCount = followerCountData + localFollowerDelta;

  const handleFollow = useCallback(async () => {
    if (!user || !club || followLoading) return;
    setFollowLoading(true);
    const newFollowing = !isFollowing;

    setLocalFollowing(newFollowing);
    setLocalFollowerDelta(prev => prev + (newFollowing ? 1 : -1));

    try {
      await toggleFollowClub(user.id, club.id, club.name, newFollowing);
      await refreshProfile();
      setLocalFollowerDelta(0);
      setLocalFollowing(null);
      queryClient.invalidateQueries({ queryKey: qk.clubs.isFollowing(user.id, club.id) });
      queryClient.invalidateQueries({ queryKey: qk.clubs.followers(club.id) });
    } catch (err) {
      console.error('[Club] Follow toggle failed:', err);
      setLocalFollowing(!newFollowing);
      setLocalFollowerDelta(prev => prev + (newFollowing ? -1 : 1));
      addToast(t('followError'), 'error');
    } finally {
      setFollowLoading(false);
    }
  }, [user, club, isFollowing, followLoading, refreshProfile, addToast, t]);

  return { isFollowing, followerCount, followLoading, handleFollow };
}
