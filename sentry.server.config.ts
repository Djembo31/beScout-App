import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  // Slice 126: 1% trace sampling for Beta — Sentry dashboards still get enough
  // data; server-side overhead stays low.
  tracesSampleRate: 0.01,
  enabled: process.env.NODE_ENV === "production",
  // Slice 096: GDPR defense-in-depth — strip accidental PII fields from user context.
  beforeSend(event) {
    if (event.user) {
      event.user = event.user.id ? { id: event.user.id } : {};
    }
    return event;
  },
});
