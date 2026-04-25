'use client';

import { useEffect, useState } from 'react';

/**
 * Slice 197b — Countdown-Tick-Hook.
 *
 * Triggert Re-Renders mit adaptiver Cadence:
 *  - diff > 1h        → setInterval 60_000ms (Minuten-Granularitaet reicht)
 *  - diff <= 1h       → setInterval 1_000ms  (Sekunden-Granularitaet, Last-Minute-Druck)
 *  - diff <= 0        → kein Interval (deadline gesetzt → nichts mehr zu tun)
 *
 * Returnt die verbleibenden Millisekunden (bereits floor zu 0). Die formatierte Anzeige
 * uebernimmt `formatCountdown` aus `@/features/fantasy/helpers`.
 *
 * Pattern aus FPL: 30% aller Lineup-Edits passieren in der letzten Stunde — sichtbares
 * Sekunden-Ticking ist Engagement-Treiber. Vorher: alle Caller renderten static auf
 * Mount, Anzeige driftete bis Parent re-rendered.
 */
export function useCountdownTick(deadline: number): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    // Initial-Sync: deadline kann sich aendern, now neu setzen (kein Drift bei Prop-Change)
    setNow(Date.now());

    const diffNow = deadline - Date.now();
    if (diffNow <= 0) return; // expired — nichts mehr zu tun

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setNow(Date.now()); // final tick to flip displayed value to startedLabel
        return;
      }
      // Adaptive cadence: < 1h → 1s, sonst 60s
      const intervalMs = remaining < 3_600_000 ? 1_000 : 60_000;
      intervalId = setInterval(() => {
        if (cancelled) return;
        const r = deadline - Date.now();
        setNow(Date.now());
        if (r <= 0) {
          if (intervalId) clearInterval(intervalId);
          return;
        }
        // Crossing 1h boundary: switch to faster cadence
        if (r < 3_600_000 && intervalMs === 60_000) {
          if (intervalId) clearInterval(intervalId);
          schedule();
        }
      }, intervalMs);
    };

    schedule();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [deadline]);

  return Math.max(0, deadline - now);
}
