'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { DbNotification } from '@/types';
import { getAchievementDef } from '@/lib/achievements';
import type { AchievementDef } from '@/lib/achievements';

const AchievementUnlockModal = dynamic(() => import('@/components/gamification/AchievementUnlockModal'), { ssr: false });

const SEEN_PREFIX = 'bescout-achievement-seen-';

/**
 * Watches the notifications array for achievement-type notifications
 * and shows a celebration modal with confetti.
 */
export default function AchievementListener({
  notifications,
}: {
  notifications: DbNotification[];
}) {
  const [queue, setQueue] = useState<{ notifId: string; achievement: AchievementDef }[]>([]);
  const [current, setCurrent] = useState<{ notifId: string; achievement: AchievementDef } | null>(null);
  const processedRef = useRef(new Set<string>());

  // Watch for new achievement notifications
  useEffect(() => {
    for (const n of notifications) {
      if (n.type !== 'achievement' || !n.reference_id) continue;
      if (processedRef.current.has(n.id)) continue;
      if (n.read) continue;

      // Check localStorage to avoid showing on page reload
      const seen = localStorage.getItem(SEEN_PREFIX + n.id);
      if (seen) {
        processedRef.current.add(n.id);
        continue;
      }

      const def = getAchievementDef(n.reference_id);
      if (def) {
        processedRef.current.add(n.id);
        localStorage.setItem(SEEN_PREFIX + n.id, '1');
        setQueue(prev => [...prev, { notifId: n.id, achievement: def }]);
      }
    }
  }, [notifications]);

  // Process queue — show one at a time
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [current, queue]);

  const handleClose = useCallback(() => {
    setCurrent(null);
  }, []);

  if (!current) return null;

  return (
    <AchievementUnlockModal
      achievement={current.achievement}
      open={true}
      onClose={handleClose}
    />
  );
}
