// Slice 125: Sentry client initialization moved from sentry.client.config.ts
// to instrumentation-client.ts per Sentry's Turbopack-forward guidance.
// Next.js auto-loads this file on the client at startup.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
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
