# Slice 318 Review — /api/push Row-Derived

**Verdict: PASS** (merge-ready) · Reviewer: cold-context reviewer-Agent · time-spent: 14 min · 2026-06-14

P1 Security.

## Spec-Coverage (alle bestätigt)
- AC1 nur {notificationId}; 400/404/401 (route.ts:33-49) ✓
- AC2 Inhalt 100% server-derived, url via resolveDeepLink (pushSender.ts) ✓
- AC3 service-role Admin-Client ✓
- AC4 crypto.randomUUID()-id in create* + firePush mit id ✓
- AC5 resolveDeepLink pures geteiltes Util, kein supabase-Import, keine Drift ✓
- AC6 tsc clean ✓

## Security-Fokus (bestätigt)
1. Phishing-Vektor (arbitrary userId + Free-Text + externe URL) am Push-Layer vollständig zu; Residual (cross-user notifications_insert RLS) korrekt+ehrlich dokumentiert, als Follow-up ausgelagert.
2. client-id kein neues Risiko (Angreifer kann ohnehin cross-user inserten; UUIDv4 enum-resistent).
3. service-role korrekt, maybeSingle (kein 406), cross-user-Push = legit Fall, dokumentiert.
4. route exportiert nur POST → next-build-safe; Auth + Fehlercodes korrekt.
5. insert awaited vor firePush → Row committed; fire-and-forget ok.
6. Util pur → kein browser-client im Server-Bundle.
7. Batch id pro Row durchgereicht; Preference-Filter + Batched-Update-Pfad unberührt.
8. Keine Regression (in-app + push funktionieren; i18n unberührt).

## Findings
| # | Severity | Location | Issue | Resolution |
|---|----------|----------|-------|------------|
| 1 | LOW | spec §4 / proof | „keine notifications.test.ts" faktisch falsch — notifications-v2 + -batch existieren. Push-agnostisch → keine Regression, aber Audit-Behauptung ungenau. | **KORRIGIERT** spec §4 + proof [7b]; Tests verifiziert 29/29 grün. |
| 2 | LOW | pushSender.ts:113 | Push liest title/body, nicht i18n_key/i18n_params → DE-Fallback. Kein Regression (alter Pfad gab gleiche raw-Strings; notifications.ts schreibt nie i18n_key). | Backlog: Push-Lokalisierung falls gewünscht. |
| 3 | INFO | Threat-Model | Push-Replay-Restspam (fremde valide id → Re-Push der LEGITIMEN Notification an deren Owner, benign, UUIDv4-enum-resistent). | Untermenge des Residuals; vom Follow-up + opt. Rate-Limit abgedeckt. |

## Knowledge-Capture (Pattern-Kandidat)
„Client-trusted Push/Notification-Content → server-derive aus DB-Row, Client liefert nur Row-id" — generalisierbar auf Email/SMS/Webhook-Relay. + „cross-user-INSERT-RLS bricht .select()-Read-Back → client-generierte UUID statt RLS lockern".

## Positive
Trust-Boundary sauber an die DB-Row verlegt; externe-URL-Phishing strukturell unmöglich (resolveDeepLink-Zwang); Residual ehrlich dokumentiert (kein „closed"-Overclaim); maybeSingle + throw-statt-swallow; Pre-Mortem deckte alle realen Fallen ab.
