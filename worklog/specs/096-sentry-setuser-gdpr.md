# Slice 096 — Sentry.setUser GDPR-conservative

## Ziel (1 Satz)
Sentry-Events bekommen pseudonyme user-Zuordnung (nur UUID) auf SIGNED_IN + Clear auf SIGNED_OUT, plus beforeSend-Scrubber als PII-Schutz.

## CEO-Delegation
Anil: "mit sentry kenne ich mich nicht so gut aus, die entscheidung überlasse ich dir".

## GDPR-Safe Defaults (meine Entscheidungen)

- **User-ID**: UUID plain senden. UUIDs sind pseudonymisierte Identifier (DSGVO Art. 4) — kein PII. Kein Hash nötig.
- **Email**: NIEMALS senden. Direktes PII.
- **Handle**: NIEMALS senden. Indirekt identifizierend (user kann handle frei lookup).
- **Cookie-Consent**: Sentry ist per Config `enabled: NODE_ENV === 'production'` gated. Wenn BeScout einen späteren Consent-Banner hat, muss Sentry zusätzlich opt-in gated werden. Aktuell bei launch-stage 0-user = no pre-existing consent-flow → erstmal okay.
- **beforeSend**: Defense-in-depth — scrubt versehentliche email/username/handle-Felder aus events falls Code irgendwo fehlerhaft setzt.

## Betroffene Files

| Path | Fix |
|------|-----|
| `src/components/providers/AuthProvider.tsx` | `Sentry.setUser({id: u.id})` in SIGNED_IN branch + `Sentry.setUser(null)` in clearUserState |
| `sentry.client.config.ts` | `beforeSend` hook: scrub user.email, user.username, user.handle, user.email_address |
| `sentry.server.config.ts` | Gleiche beforeSend-Scrubbing |
| `sentry.edge.config.ts` | Gleiche beforeSend-Scrubbing |

## Implementation

### AuthProvider

```ts
import * as Sentry from '@sentry/nextjs';

// In onAuthStateChange SIGNED_IN branch (nach loadProfile):
Sentry.setUser({ id: u.id });
Sentry.addBreadcrumb({ category: 'auth', message: 'signed_in', level: 'info' });

// In clearUserState:
Sentry.setUser(null);
Sentry.addBreadcrumb({ category: 'auth', message: 'signed_out', level: 'info' });
```

### sentry.*.config.ts beforeSend

```ts
Sentry.init({
  dsn: ...,
  beforeSend(event) {
    // GDPR: scrub accidental PII fields
    if (event.user) {
      const { id } = event.user;
      event.user = { id }; // strip everything except id
    }
    return event;
  },
});
```

## Acceptance Criteria

1. AuthProvider ruft `Sentry.setUser({id})` genau beim SIGNED_IN event.
2. AuthProvider ruft `Sentry.setUser(null)` beim SIGNED_OUT / clear-state.
3. Breadcrumbs auth.signed_in + auth.signed_out sichtbar in zukünftigen Sentry-Events.
4. Alle 3 Sentry-configs haben beforeSend-Scrubbing.
5. tsc clean.
6. Existing AuthProvider-Tests (falls vorhanden) unverändert grün.

## Edge Cases

- Anonymous user (NO auth): Sentry.setUser ist nicht gesetzt → Events ohne user-context. OK.
- Re-login nach SIGNED_OUT: neuer setUser mit neuer UUID. OK.
- User-ID-Wechsel während session: nicht möglich (Supabase Auth issued neue session).
- beforeSend kann null returnen um Event zu suppressen — wir returnen immer event (nur scrubben).

## Proof

- tsc clean
- Manual-Test: grep Sentry.setUser im AuthProvider → 2 Stellen (SIGNED_IN + clearUserState)
- Manual-Test: grep beforeSend in sentry.*.config.ts → 3 Stellen
- common-errors / memory-doc erweitert

## Scope-Out

- **User-Consent-Banner** — kein existing Banner, bei späterem Launch einführen
- **Release-Tracking** (Sentry-release version) — separate Slice, braucht Build-Config
- **Performance-Tracing** über `tracesSampleRate` — schon auf 0.1 konfiguriert
