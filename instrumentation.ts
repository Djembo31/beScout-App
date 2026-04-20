// Slice 125: Sentry Next.js 14/15 modern setup via instrumentation hook.
//
// Replaces the previous auto-loaded sentry.server.config.ts / sentry.edge.config.ts
// pattern, which triggered the Vercel build warning
//   "Please ensure to put this file's content into the register() function of a
//    Next.js instrumentation file instead."
//
// The register() function runs once per runtime (nodejs/edge) at server startup,
// loads the matching Sentry config, and onRequestError wires Server Components,
// middleware and proxy errors into Sentry automatically.

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
