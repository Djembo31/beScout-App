import { supabase } from '@/lib/supabaseClient';
import { trackEvent } from '@/lib/posthog';

// ============================================
// Sponsor Impression & Click Tracking
// Batch queue pattern (like activityLog.ts)
// ============================================

type SponsorEvent = {
  sponsor_id: string;
  placement: string;
  impressions: number;
  clicks: number;
};

let queue: SponsorEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 10_000; // 10s

/** Merge duplicate sponsor_id+placement entries */
function mergeQueue(batch: SponsorEvent[]): SponsorEvent[] {
  const map = new Map<string, SponsorEvent>();
  for (const ev of batch) {
    const key = `${ev.sponsor_id}:${ev.placement}`;
    const existing = map.get(key);
    if (existing) {
      existing.impressions += ev.impressions;
      existing.clicks += ev.clicks;
    } else {
      map.set(key, { ...ev });
    }
  }
  return Array.from(map.values());
}

async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const batch = mergeQueue(queue.splice(0));
  try {
    const { error } = await supabase.rpc('record_sponsor_events', {
      p_events: batch,
    });
    if (error) {
      console.error('[SponsorTracking] RPC failed:', error);
      // Re-queue failed batch (capped)
      queue.push(...batch);
      if (queue.length > 100) queue.splice(0, queue.length - 100);
    }
  } catch (err) {
    console.error('[SponsorTracking] flush error:', err);
    queue.push(...batch);
    if (queue.length > 100) queue.splice(0, queue.length - 100);
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL);
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flush();
  });
}

/** Track a sponsor impression (batched, fire-and-forget) */
export function trackImpression(sponsorId: string, placement: string): void {
  queue.push({ sponsor_id: sponsorId, placement, impressions: 1, clicks: 0 });
  scheduleFlush();
  // Dual-track to PostHog
  trackEvent('sponsor_impression', { sponsor_id: sponsorId, placement });
}

/** Track a sponsor click (batched, fire-and-forget) */
export function trackClick(sponsorId: string, placement: string): void {
  queue.push({ sponsor_id: sponsorId, placement, impressions: 0, clicks: 1 });
  scheduleFlush();
  // Dual-track to PostHog
  trackEvent('sponsor_click', { sponsor_id: sponsorId, placement });
}

/** Immediately flush pending events (e.g. on logout) */
export function flushSponsorEvents(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  return flush();
}
