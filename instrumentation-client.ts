// Slice 125: Sentry client initialization moved from sentry.client.config.ts
// to instrumentation-client.ts per Sentry's Turbopack-forward guidance.
// Next.js auto-loads this file on the client at startup.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  // Slice 126: Beta-tuned sampling. Pre-126 values (0.1 / 1.0) added ~1.2s of
  // client instrumentation overhead vs the pre-Sentry baseline. For Beta traffic
  // volumes, 1% trace sampling and 10% error-replay is plenty to diagnose issues.
  tracesSampleRate: 0.01,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
  // Slice 096: GDPR defense-in-depth — strip accidental PII fields from user context.
  // AuthProvider sets only { id }, but beforeSend catches third-party code that may
  // set email/handle.
  beforeSend(event) {
    if (event.user) {
      event.user = event.user.id ? { id: event.user.id } : {};
    }
    return event;
  },
});

// Slice 125: required by @sentry/nextjs v10 to instrument App Router navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
