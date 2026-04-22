'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { toggleFollowClub } from '@/lib/services/club';
import { qk } from '@/lib/queries/keys';
import { useSafeMutation } from './useSafeMutation';
import type { DbClub } from '@/types';

/**
 * Slice 151b-RESET — Mutation-Hook fuer Follow/Unfollow.
 *
 * Nachfolger von `ClubProvider.toggleFollow` + `useClubActions.followMut`.
 * Query-Cache ist einzige Wahrheit; Optimistic-Updates via setQueryData auf
 * drei deterministische Keys:
 *   1. `qk.clubs.isFollowing(uid, cid)` — boolean toggle
 *   2. `qk.clubs.followers(cid)` — count +1 / -1
 *   3. `qk.clubs.followedByUser(uid)` — List add/remove (optimistic)
 *
 * Das nachgelagerte `is_primary`-Promotion beim Unfollow-des-Primary-Clubs ist
 * server-side nicht-deterministic (DB `limit(1)` ohne ORDER BY) — daher
 * onSettled-invalidate auf `followedByUser`. Die anderen zwei Keys sind
 * deterministic (±1) → nur setQueryData, kein invalidate → vermeidet
 * pgBouncer-read-after-write-Transient (Slice 139 Pattern).
 */

export interface ToggleFollowClubVariables {
  club: DbClub;
  follow: boolean;
}

interface RollbackContext {
  prevIsFollowing: boolean | undefined;
  prevFollowerCount: number | undefined;
  prevFollowedList: DbClub[] | undefined;
}

export function useToggleFollowClub(): {
  toggle: (vars: ToggleFollowClubVariables) => void;
  toggleAsync: (vars: ToggleFollowClubVariables) => Promise<void>;
  isPending: boolean;
  error: Error | null;
} {
  const { user, refreshProfile } = useUser();
  const qc = useQueryClient();
  const t = useTranslations('club');

  const mutation = useSafeMutation<void, Error, ToggleFollowClubVariables, RollbackContext>({
    mutationFn: async ({ club, follow }) => {
      if (!user) throw new Error('no_user');
      await toggleFollowClub(user.id, club.id, club.name, follow);
    },
    onMutate: async ({ club, follow }) => {
      if (!user) {
        return {
          prevIsFollowing: undefined,
          prevFollowerCount: undefined,
          prevFollowedList: undefined,
        };
      }
      await Promise.all([
        qc.cancelQueries({ queryKey: qk.clubs.isFollowing(user.id, club.id) }),
        qc.cancelQueries({ queryKey: qk.clubs.followers(club.id) }),
        qc.cancelQueries({ queryKey: qk.clubs.followedByUser(user.id) }),
      ]);

      const prevIsFollowing = qc.getQueryData<boolean>(
        qk.clubs.isFollowing(user.id, club.id),
      );
      const prevFollowerCount = qc.getQueryData<number>(qk.clubs.followers(club.id));
      const prevFollowedList = qc.getQueryData<DbClub[]>(qk.clubs.followedByUser(user.id));

      qc.setQueryData<boolean>(qk.clubs.isFollowing(user.id, club.id), follow);
      qc.setQueryData<number>(qk.clubs.followers(club.id), (prev) =>
        prev === undefined ? prev : Math.max(0, prev + (follow ? 1 : -1)),
      );
      qc.setQueryData<DbClub[]>(qk.clubs.followedByUser(user.id), (prev) => {
        if (prev === undefined) return prev;
        if (follow) {
          return prev.some((c) => c.id === club.id) ? prev : [...prev, club];
        }
        return prev.filter((c) => c.id !== club.id);
      });

      return { prevIsFollowing, prevFollowerCount, prevFollowedList };
    },
    onError: (_err, { club }, ctx) => {
      if (!user || !ctx) return;
      if (ctx.prevIsFollowing !== undefined) {
        qc.setQueryData(qk.clubs.isFollowing(user.id, club.id), ctx.prevIsFollowing);
      }
      if (ctx.prevFollowerCount !== undefined) {
        qc.setQueryData(qk.clubs.followers(club.id), ctx.prevFollowerCount);
      }
      if (ctx.prevFollowedList !== undefined) {
        qc.setQueryData(qk.clubs.followedByUser(user.id), ctx.prevFollowedList);
      }
    },
    onSettled: async () => {
      if (!user) return;
      // Primary-Promotion bei Unfollow-des-Primary ist server-side nicht-
      // deterministic → Liste frisch holen. Die anderen beiden Keys bleiben
      // auf optimistic-value (deterministic ±1), kein invalidate noetig.
      await qc.invalidateQueries({ queryKey: qk.clubs.followedByUser(user.id) });
      await refreshProfile();
    },
    errorToast: t('followError'),
    errorTag: 'club.follow',
  });

  // Reviewer Finding #1: useMutation-Result-Identity wechselt jeden Render.
  // `[mutation]` als Dep haette toggle/toggleAsync jeden Render neu erzeugt
  // und `<Button onClick={toggle}>`-Memoization sowie `React.memo`-Children
  // gebrochen. Mirror der useSafeMutation-Konvention: stable observer-bound
  // function refs als Deps + exhaustive-deps disable.
  const toggle = useCallback(
    (vars: ToggleFollowClubVariables) => mutation.safeTrigger(vars),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation.safeTrigger, mutation.isPending],
  );

  // Awaitable Variante fuer Caller die per-call Optimistic-State (z.B. lokale
  // Card-Listen) bei Fehlern selbst rollbacken muessen. Kein safeTrigger-Guard,
  // weil mutateAsync die in-flight-Promise zurueckgibt.
  const toggleAsync = useCallback(
    (vars: ToggleFollowClubVariables) => mutation.mutateAsync(vars),
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
