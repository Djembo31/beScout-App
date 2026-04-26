'use client';

/**
 * Slice 201c (M-01): Fantasy-Context-Hints derived aus existing Event-State.
 *
 * Closes Phase-A Audit-Finding M-01: "Mission-Hints kontextabhaengig: Fantasy-Tab
 * nur generic Missions statt 'Beende dein Lineup für GW X' / 'Captain-Bonus 2× sichern'."
 *
 * Approach: derived hints aus useFantasyEvents-State, KEIN neuer DB-Query.
 * Hints werden in MissionHintList neben DB-Mission-Hints gerendert (context='fantasy').
 *
 * Hint-Logik:
 *   1. Joined upcoming Event mit nicht-abgelaufenem lock-time + ohne userPoints (= nicht scored)
 *      -> "Stelle dein Lineup fuer GW X auf" (CTA: scrolls/navigates to event)
 *   2. Joined live Event (status='running') ohne lineup-points-mismatch
 *      -> "Captain-Bonus sichern (1.1× Punkte)" als Reminder
 *
 * Note: Wir koennen lineup-submission-status nicht ohne extra DB-Query feststellen.
 * Konservativ zeigen wir Hint nur wenn lock-time noch >0 (User kann eh aendern).
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { FantasyEvent } from '../types';

export type FantasyContextHint = {
  id: string; // synthetic id, format: "ctx-fantasy-{eventId}-{kind}"
  kind: 'lineup-needed' | 'captain-pick';
  title: string;
  icon: string;
  ctaHref: string; // /fantasy?event=...
  gameweek?: number;
  eventName?: string;
};

/**
 * Pure deriver — testable ohne React.
 * @param events - All FantasyEvents (filtered to current GW + isJoined upstream by caller).
 * @param now - Wall-clock-ms (injectable for tests).
 * @param maxHints - Max hints to return (default 2 — analog DB-Mission-Hints).
 */
export function deriveFantasyContextHints(
  events: FantasyEvent[],
  now: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
  maxHints = 2,
): FantasyContextHint[] {
  const hints: FantasyContextHint[] = [];

  for (const event of events) {
    if (hints.length >= maxHints) break;
    if (!event.isJoined) continue;

    // Hint 1: Lineup-Needed — joined upcoming event with lock-time in future
    if (event.status === 'upcoming' && event.lockTime > now) {
      hints.push({
        id: `ctx-fantasy-${event.id}-lineup`,
        kind: 'lineup-needed',
        title: event.gameweek
          ? t('hintLineupNeededWithGw', { gw: event.gameweek })
          : t('hintLineupNeeded'),
        icon: 'Target',
        ctaHref: `/fantasy?event=${event.id}`,
        gameweek: event.gameweek,
        eventName: event.name,
      });
      continue;
    }

    // Hint 2: Captain-Reminder — joined running event ohne userPoints (Captain-Bonus relevant)
    if (event.status === 'running' && (event.userPoints ?? 0) === 0) {
      hints.push({
        id: `ctx-fantasy-${event.id}-captain`,
        kind: 'captain-pick',
        title: t('hintCaptainBonus'),
        icon: 'Crown',
        ctaHref: `/fantasy?event=${event.id}`,
        gameweek: event.gameweek,
        eventName: event.name,
      });
    }
  }

  return hints;
}

/**
 * React Hook — wraps deriver with i18n + clock.
 */
export function useFantasyContextHints(
  events: FantasyEvent[],
  maxHints = 2,
): FantasyContextHint[] {
  const t = useTranslations('missions');

  return useMemo(
    () => deriveFantasyContextHints(events, Date.now(), t as never, maxHints),
    [events, t, maxHints],
  );
}
