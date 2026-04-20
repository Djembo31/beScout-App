import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  enabled: process.env.NODE_ENV === "production",
  // Slice 096: GDPR defense-in-depth — strip accidental PII fields from user context.
  // AuthProvider setzt nur { id }, aber beforeSend fängt Fremdcode der email/handle setzen würde.
  beforeSend(event) {
    if (event.user) {
      event.user = event.user.id ? { id: event.user.id } : {};
    }
    return event;
  },
});
