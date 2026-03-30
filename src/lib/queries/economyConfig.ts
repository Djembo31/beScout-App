'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import {
  getEloConfig,
  getRangThresholds,
  getScoreRoadConfig,
  getManagerPointsConfig,
  getStreakConfig,
  getMissionDefinitions,
} from '@/lib/services/economyConfig';

const STALE_5MIN = 5 * 60 * 1000;

export function useEloConfig() {
  return useQuery({
    queryKey: qk.economy.elo,
    queryFn: getEloConfig,
    staleTime: STALE_5MIN,
  });
}

export function useRangThresholds() {
  return useQuery({
    queryKey: qk.economy.rang,
    queryFn: getRangThresholds,
    staleTime: STALE_5MIN,
  });
}

export function useScoreRoadConfig() {
  return useQuery({
    queryKey: qk.economy.scoreRoad,
    queryFn: getScoreRoadConfig,
    staleTime: STALE_5MIN,
  });
}

export function useManagerPointsConfig() {
  return useQuery({
    queryKey: qk.economy.managerPoints,
    queryFn: getManagerPointsConfig,
    staleTime: STALE_5MIN,
  });
}

export function useStreakConfig() {
  return useQuery({
    queryKey: qk.economy.streak,
    queryFn: getStreakConfig,
    staleTime: STALE_5MIN,
  });
}

export function useMissionDefinitions() {
  return useQuery({
    queryKey: qk.economy.missions,
    queryFn: getMissionDefinitions,
    staleTime: STALE_5MIN,
  });
}
