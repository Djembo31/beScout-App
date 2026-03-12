'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from './keys';
import { getClubChallenges, createClubChallenge } from '@/lib/services/clubChallenges';
import type { ClubChallenge } from '@/lib/services/clubChallenges';

const FIVE_MIN = 5 * 60 * 1000;

/** Fetch all challenges for a club */
export function useClubChallenges(clubId: string) {
  return useQuery({
    queryKey: qk.clubChallenges.byClub(clubId),
    queryFn: () => getClubChallenges(clubId),
    enabled: !!clubId,
    staleTime: FIVE_MIN,
  });
}

/** Create a new club challenge (mutation) */
export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clubId, data }: {
      clubId: string;
      data: {
        title: string;
        description: string | null;
        type: ClubChallenge['type'];
        referenceId: string | null;
        fanRankPoints: number;
        cosmeticRewardKey: string | null;
        startsAt: string;
        endsAt: string;
      };
    }) => createClubChallenge(clubId, data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: qk.clubChallenges.byClub(variables.clubId) });
    },
  });
}
