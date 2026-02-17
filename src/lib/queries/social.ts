'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getFollowingFeed, getFollowerCount, getFollowingCount, getFollowingIds } from '@/lib/services/social';
import { getClubFollowerCount, isUserFollowingClub } from '@/lib/services/club';

const TWO_MIN = 2 * 60 * 1000;

export function useFollowingFeed(userId: string | undefined) {
  return useQuery({
    queryKey: qk.social.feed(userId!),
    queryFn: () => getFollowingFeed(userId!, 15),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

export function useFollowerCount(userId: string | undefined) {
  return useQuery({
    queryKey: qk.social.followerCount(userId!),
    queryFn: () => getFollowerCount(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

export function useFollowingCount(userId: string | undefined) {
  return useQuery({
    queryKey: qk.social.followingCount(userId!),
    queryFn: () => getFollowingCount(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

export function useFollowingIds(userId: string | undefined) {
  return useQuery({
    queryKey: qk.social.followingIds(userId!),
    queryFn: () => getFollowingIds(userId!),
    enabled: !!userId,
    staleTime: TWO_MIN,
  });
}

export function useClubFollowerCount(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.clubs.followers(clubId!),
    queryFn: () => getClubFollowerCount(clubId!),
    enabled: !!clubId,
    staleTime: TWO_MIN,
  });
}

export function useIsFollowingClub(userId: string | undefined, clubId: string | undefined) {
  return useQuery({
    queryKey: qk.clubs.isFollowing(userId!, clubId!),
    queryFn: () => isUserFollowingClub(userId!, clubId!),
    enabled: !!userId && !!clubId,
    staleTime: TWO_MIN,
  });
}
