# Slice 319 — Notification/Push Delivery Hygiene (S7 Phase-2 P1-Demo: Social #1 + Identity #4)

**Slice-Type:** Service (Frontend-Delivery)
**Größe:** XS
**Datum:** 2026-06-14
**CEO-Scope:** Nein (kein Money, keine Daten-Mutation, keine RLS-Änderung).

## 1. Problem-Statement (Evidence: S7-Registry P1-Demo, live-verifiziert 2026-06-14)

- **Social #1:** `getNotifications` (`notifications.ts:142`) SELECT enthält `i18n_key`/`i18n_params` NICHT, obwohl `DbNotification` (types:1227-1228) sie hat + der Client via `tNotifTpl(key, params)` lokalisiert. → beim Reload kommt der rohe DE-Fallback-String, der Realtime-Push-Pfad ist lokalisiert → Divergenz (TR-User sieht DE bei Reload).
- **Identity #4:** `unsubscribeFromPush` (`pushSubscription.ts:78`) verwirft den `.delete()`-Fehler komplett (`await supabase...delete()` ohne error-Check) = Silent-Fail. `isPushEnabled()` liest nur `localStorage` (UI-Cache) → Dual-State zur DB/Browser-PushManager-Wahrheit.

## 2. Lösungs-Design
- **Social #1:** `i18n_key, i18n_params` in den `getNotifications`-SELECT aufnehmen (1 Zeile). Consumer + Type unverändert.
- **Identity #4:** `.delete()`-Fehler erfassen + loggen (Observability statt Swallow). localStorage bleibt UI-Cache, aber Dual-State self-healt: bleibt eine DB-Row nach Browser-`unsubscribe()` stehen, liefert der nächste Push-Versuch 410 Gone → `pushSender` löscht die stale Subscription (bestehend). Verhalten dokumentieren; kein RPC nötig (push_subscriptions RLS ist CRUD-vollständig, Registry-Identity bestätigt).

## 3. Betroffene Files
- `src/lib/services/notifications.ts` — getNotifications SELECT.
- `src/lib/services/pushSubscription.ts` — unsubscribeFromPush error-capture.

## 4. Code-Reading-Liste (erledigt)
- `notifications.ts:142-156` getNotifications + `DbNotification` (types:1223-1229 i18n-Felder). ✓
- `pushSubscription.ts` subscribe/unsubscribe/isPushEnabled. ✓
- push_subscriptions RLS CRUD-vollständig (Registry Identity, Slice 315). ✓

## 5. Pattern-References
- `errors-frontend.md` i18n-Key/Locale-Drift; `errors-db.md` Service Error-Swallowing (swallow→log/throw).

## 6. Acceptance Criteria
- **AC1:** getNotifications SELECT enthält `i18n_key, i18n_params`; tsc clean; bestehende notifications-Tests grün.
- **AC2:** unsubscribeFromPush erfasst den delete-Fehler (logSupabaseError/console.error mit message) statt ihn zu verwerfen; Rückgabe spiegelt Erfolg.
- **AC3:** Kein Verhaltensbruch für subscribe/isPushEnabled; localStorage-UI-Cache + 410-self-heal dokumentiert im Code-Kommentar.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Reload nach Notification mit i18n_key | jetzt lokalisiert (vorher DE-Fallback) |
| Notification ohne i18n_key (alt) | fällt weiter auf title/body zurück |
| unsubscribe delete schlägt fehl | geloggt; Browser-unsubscribe läuft trotzdem; stale Row self-healt via 410 |
| Browser ohne ServiceWorker | bestehender early-return unverändert |

## 8. Self-Verification Commands
- `pnpm exec tsc --noEmit`
- `CI=true pnpm exec vitest run src/lib/services/__tests__/notifications-v2.test.ts src/lib/services/__tests__/notifications-batch.test.ts`
- grep: getNotifications SELECT enthält i18n_key.

## 9. Open-Questions — keine (rein Hygiene, autonom CTO).

## 10. Proof-Plan
`worklog/proofs/319-notif-push-hygiene.txt`: tsc + vitest + grep (SELECT enthält i18n_key, delete-error erfasst).

## 11. Scope-Out
- Vollständige Dual-State-Reconciliation (async isPushEnabled gegen Browser/DB) — Over-Engineering, 410-self-heal genügt.
- Übrige P1-Demo (Club #3 Decision, Club #4 RPC, Gamif #1/#2/#3, Identity #3) — separate Slices.

## 12. Stage-Chain (geplant)
SPEC ✓ → IMPACT (skipped, 2 Files, kein Consumer-Contract-Change) → BUILD → REVIEW (self-review, XS kein Money/Security) → PROVE → LOG.

## 13. Pre-Mortem
1. i18n_params JSONB-Cast — DbNotification-Type deckt es; Supabase deserialisiert JSONB. 2. delete-error-Handling ändert Rückgabe-Semantik — bestehende Caller behandeln bool best-effort. 3. notifications-Tests asserten SELECT-Cols? → verifizieren grün.
