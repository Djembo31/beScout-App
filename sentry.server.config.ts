import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
  // Slice 096: GDPR defense-in-depth — strip accidental PII fields from user context.
  beforeSend(event) {
    if (event.user) {
      event.user = event.user.id ? { id: event.user.id } : {};
    }
    return event;
  },
});
