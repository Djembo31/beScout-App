import type { PostHog } from 'posthog-js';

let posthogInstance: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;
const eventQueue: Array<{ type: 'capture' | 'identify' | 'reset'; args: unknown[] }> = [];

function getPostHogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

export async function initPostHog(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return null;
  if (!getPostHogKey()) return null;
  if (posthogInstance) return posthogInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { default: posthog } = await import('posthog-js');
    posthog.init(getPostHogKey()!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.opt_out_capturing();
        }
      },
    });
    posthogInstance = posthog;

    // Flush queued events
    for (const event of eventQueue) {
      if (event.type === 'capture') posthog.capture(event.args[0] as string, event.args[1] as Record<string, unknown>);
      else if (event.type === 'identify') posthog.identify(event.args[0] as string, event.args[1] as Record<string, unknown>);
      else if (event.type === 'reset') posthog.reset();
    }
    eventQueue.length = 0;

    return posthog;
  })();

  return initPromise;
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!getPostHogKey()) return;
  if (posthogInstance) { posthogInstance.identify(userId, properties); return; }
  eventQueue.push({ type: 'identify', args: [userId, properties] });
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!getPostHogKey()) return;
  if (posthogInstance) { posthogInstance.capture(event, properties); return; }
  eventQueue.push({ type: 'capture', args: [event, properties] });
}

export function resetUser() {
  if (typeof window === 'undefined') return;
  if (!getPostHogKey()) return;
  if (posthogInstance) { posthogInstance.reset(); return; }
  eventQueue.push({ type: 'reset', args: [] });
}
