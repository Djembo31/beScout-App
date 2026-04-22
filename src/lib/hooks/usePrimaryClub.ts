'use client';

import { useMemo } from 'react';
import { useFollowedClubs } from './useFollowedClubs';
import type { DbClub } from '@/types';

/**
 * Slice 151b-RESET — Convenience-Hook, derived aus useFollowedClubs.
 *
 * `getUserFollowedClubs` sortiert primary-first → Fallback auf erstes Element
 * wenn kein Row `is_primary=true` hat (DB-Invariante 1-Primary-pro-User wird
 * via Service `setUserPrimaryClub` sichergestellt, aber defensiv ist nicer).
 *
 * Kein eigener Query — konsumiert denselben Cache wie `useFollowedClubs`, damit
 * Follow/Unfollow beide Views synchron updated.
 */
export function usePrimaryClub(): {
  data: DbClub | null | undefined;
  isLoading: boolean;
} {
  const { data, isLoading } = useFollowedClubs();

  const primary = useMemo<DbClub | null | undefined>(() => {
    if (!data) return undefined;
    return data[0] ?? null;
  }, [data]);

  return { data: primary, isLoading };
}
