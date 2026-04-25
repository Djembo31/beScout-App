'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import {
  getPredictions,
  getPredictionCount,
  getPredictionStats,
  getFixturesForPrediction,
  hasAnyPrediction,
  getTopPredictorsLeaderboard,
} from '@/lib/services/predictions';

const FIVE_MIN = 5 * 60 * 1000;

// Slice 163: `useCreatePrediction`-Hook entfernt — CreatePredictionModal nutzt
// useSafeMutation direkt (Ferrari-Blueprint #28, D18 Race-Class Closure).

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
    queryKey: qk.predictions.hasAny(userId!),
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

/** Fixtures available for predictions (scheduled) */
export function usePredictionFixtures(gameweek: number) {
  return useQuery({
    queryKey: qk.predictions.fixtures(gameweek),
    queryFn: () => getFixturesForPrediction(gameweek),
    enabled: gameweek > 0,
    staleTime: FIVE_MIN,
  });
}

/**
 * Slice 199 C-05 — Top-Predictor Leaderboard (anonymized aggregate).
 * Public-safe: Backend RPC returns handle/tier only. Static-cacheable.
 */
export function useTopPredictorsLeaderboard(limit = 10) {
  return useQuery({
    queryKey: qk.predictions.topPredictors(limit),
    queryFn: () => getTopPredictorsLeaderboard(limit),
    staleTime: FIVE_MIN,
  });
}

