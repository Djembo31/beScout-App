# Slice 319 Review — Notification/Push Delivery Hygiene

**Verdict: PASS (self-review)** · 2026-06-14 · XS, kein Money/Security/Daten/RLS.

Self-review begründet (workflow.md): XS-Slice, 2 isolierte Service-Edits, kein Money-/Security-/Migration-Pfad, Pattern-Wiederholung (swallow→log, i18n-SELECT-Fix). tsc + 29 vitest grün als Gate.

## Coverage
- AC1 getNotifications SELECT enthält i18n_key, i18n_params; tsc clean; notifications-Tests 29/29 grün ✓
- AC2 unsubscribeFromPush erfasst+loggt delete-error statt Swallow ✓
- AC3 subscribe/isPushEnabled unverändert; 410-self-heal + localStorage-Cache im Kommentar dokumentiert ✓

## Risiko-Check
- DbNotification hatte i18n_key/i18n_params bereits → keine Type/Consumer-Änderung, nur Daten-Lieferung.
- unsubscribe-Rückgabe bleibt best-effort bool; Caller behandeln das so.
- Kein neuer Silent-Fail; keine RLS/Money-Berührung.

## Findings
Keine. (i18n_params JSONB wird von Supabase-JS deserialisiert; DbNotification-Type deckt es.)
