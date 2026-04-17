'use client';

import { useRef, useEffect, useState } from 'react';
import { useUser } from '@/components/providers/AuthProvider';
import type { FantasyEvent } from '../types';
import type { LeaderboardEntry } from '../services/scoring.queries';
import { getEventLeaderboard } from '../services/scoring.queries';
import { isEventSeen, markEventSeen } from '@/components/fantasy/EventSummaryModal';

/**
 * Detects unseen scored events for the current GW, shows the summary modal
 * once per page load, and loads leaderboard data for the unseen event.
 *
 * Source: FantasyContent.tsx lines 167-181
 */
export function useScoredEvents(
  currentGw: number,
  events: FantasyEvent[],
  joinedSet: Set<string>,
) {
  const { user } = useUser();
  const summaryShownRef = useRef(false);
  const [summaryEvent, setSummaryEvent] = useState<FantasyEvent | null>(null);
  const [summaryLeaderboard, setSummaryLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (summaryShownRef.current || !user || !currentGw || events.length === 0) return;
    // Slice 042: warten bis userPoints geladen ist (useLineupScores async),
    // sonst Modal opens mit userPoints=undefined → myScore=0 trotz scored event.
    const scoredJoined = events.filter(e =>
      e.scoredAt &&
      e.gameweek === currentGw &&
      joinedSet.has(e.id) &&
      e.userPoints != null
    );
    const unseen = scoredJoined.find(e => !isEventSeen(e.id));
    if (!unseen) return;
    summaryShownRef.current = true;
    setSummaryEvent(unseen);
    // Mark all unseen for this GW as seen immediately
    scoredJoined.filter(e => !isEventSeen(e.id)).forEach(e => markEventSeen(e.id));
    getEventLeaderboard(unseen.id).then(setSummaryLeaderboard).catch(err => console.error('[Fantasy] Leaderboard load failed:', err));
  }, [events, joinedSet, user, currentGw]);

  const dismissSummary = () => {
    if (summaryEvent) markEventSeen(summaryEvent.id);
    setSummaryEvent(null);
    setSummaryLeaderboard([]);
  };

  return { summaryEvent, summaryLeaderboard, dismissSummary };
}
