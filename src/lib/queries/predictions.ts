'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from './keys';
import {
  getPredictions,
  getPredictionCount,
  getPredictionStats,
  getResolvedPredictions,
  getFixturesForPrediction,
  createPrediction,
  hasAnyPrediction,
  type CreatePredictionParams,
} from '@/lib/services/predictions';

const FIVE_MIN = 5 * 60 * 1000;

/** Own predictions for a gameweek (pending + resolved) */
export function usePredictions(userId: string | undefined, gameweek: number) {
  return useQuery({
    queryKey: qk.predictions.byUserGw(userId!, gameweek),
    queryFn: () => getPredictions(userId!, gameweek),
    enabled: !!userId && gameweek > 0,
    staleTime: FIVE_MIN,
  });
}

/** Prediction count for limit check (max 5 per GW) */
export function usePredictionCount(userId: string | undefined, gameweek: number) {
  return useQuery({
    queryKey: qk.predictions.countGw(userId!, gameweek),
    queryFn: () => getPredictionCount(userId!, gameweek),
    enabled: !!userId && gameweek > 0,
    staleTime: 30_000,
  });
}

/** Whether user has created any prediction (onboarding check) */
export function useHasAnyPrediction(userId: string | undefined) {
  return useQuery({
    queryKey: [...qk.predictions.stats(userId!), 'any'],
    queryFn: () => hasAnyPrediction(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}

/** Prediction stats (accuracy, streak) for profile */
export function usePredictionStats(userId: string | undefined) {
  return useQuery({
    queryKey: qk.predictions.stats(userId!),
    queryFn: () => getPredictionStats(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}

/** Resolved predictions for public profile */
export function useResolvedPredictions(userId: string | undefined) {
  return useQuery({
    queryKey: qk.predictions.resolved(userId!),
    queryFn: () => getResolvedPredictions(userId!),
    enabled: !!userId,
    staleTime: FIVE_MIN,
  });
}

/** Fixtures available for predictions (scheduled) */
export function usePredictionFixtures(gameweek: number) {
  return useQuery({
    queryKey: qk.predictions.fixtures(gameweek),
    queryFn: () => getFixturesForPrediction(gameweek),
    enabled: gameweek > 0,
    staleTime: FIVE_MIN,
  });
}

/** Mutation: create a new prediction */
export function useCreatePrediction(userId: string | undefined, gameweek: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (params: CreatePredictionParams) => createPrediction(params),
    onSuccess: () => {
      if (userId) {
        qc.invalidateQueries({ queryKey: qk.predictions.byUserGw(userId, gameweek) });
        qc.invalidateQueries({ queryKey: qk.predictions.countGw(userId, gameweek) });
        qc.invalidateQueries({ queryKey: qk.predictions.stats(userId) });
      }
    },
  });
}
