# Slice 318 — /api/push Row-Derived (S7 Phase-2 #4)

**Slice-Type:** Service + API-Route (Security)
**Größe:** S
**Datum:** 2026-06-14
**CEO-Scope:** JA — P1 Security. REVIEW Pflicht.

## 1. Problem-Statement (Evidence: S7-Registry Phase-2 #4, live-verifiziert 2026-06-14)

`POST /api/push` (`route.ts`) prüft nur, dass der Caller authenticated ist, akzeptiert dann aber **beliebige** `userId` + freie `title`/`body`/`url`/`tag` aus dem Request-Body und schickt eine Web-Push an diese userId. → jeder eingeloggte User kann an beliebige Opfer eine Push mit **frei wählbarem Text + externer URL** senden = Phishing/Spam-Vektor. Der Code-Kommentar behauptet „notification was already RLS-checked on INSERT" — **wird aber nicht verifiziert**.

Verstärkt durch RLS `notifications_insert_any_authenticated` = `WITH CHECK (auth.uid() IS NOT NULL)` → cross-user-Insert beliebiger Notification-Rows ist erlaubt (so funktionieren Follow/Trade/Offer-Notifications client-seitig).

## 2. Lösungs-Design

Push-Inhalt **server-seitig aus der Notification-Row ableiten**, nie aus Client-Free-Text:

- Client (`firePush`) sendet nur noch `{ notificationId }` an `/api/push` (keine userId/title/body/url).
- `createNotification`/`createNotificationsBatch` erzeugen die Row-`id` client-seitig (`crypto.randomUUID()`) und INSERTen sie explizit (Read-Back via `.select()` scheitert bei cross-user wegen SELECT-RLS auth.uid()=user_id → daher Client-generierte id).
- `/api/push`: auth-Check (bleibt) → `notificationId` parsen → `sendPushForNotification(notificationId)` (neu in pushSender, nutzt service-role Admin-Client = bypassed SELECT-RLS):
  - Row lesen (`user_id, type, title, body, reference_id, reference_type`); nicht gefunden → 404.
  - URL **server-seitig** via `resolveDeepLink` (interner Deep-Link, NIE Client-URL) → externer-Phishing-URL-Vektor geschlossen.
  - `sendPushToUser(row.user_id, {title: row.title, body: row.body, url: resolved, tag: row.type})`.
- `resolveDeepLink` in pures Util `src/lib/notificationDeepLink.ts` extrahiert (von notifications.ts + pushSender geteilt, kein supabase-Import → server/client-safe, keine Drift).

**Residual (dokumentiert, eigener Slice):** `notifications_insert_any_authenticated` erlaubt cross-user Row-Insert mit Free-Text → Angreifer kann weiterhin eine sichtbare in-app-Notification + Push mit Text (aber **interner URL**, **DB-Trace**) erzeugen. Echte Wurzel = cross-user Notification-Creation auf SECURITY-DEFINER-RPCs umstellen (großer Cross-Cutting-Refactor, Beta-Regressionsrisiko) → Scope-Out + Follow-up-Finding.

## 3. Betroffene Files
- `src/app/api/push/route.ts` — Contract `{notificationId}`, Row-derived send.
- `src/lib/services/pushSender.ts` — NEU `sendPushForNotification(notificationId)`.
- `src/lib/notificationDeepLink.ts` — NEU pures Util `resolveDeepLink`.
- `src/lib/services/notifications.ts` — firePush(id-basiert), client-id-Generierung in create*, resolveDeepLink-Import.

## 4. Code-Reading-Liste (erledigt)
- `route.ts` — akzeptiert userId/title/body/url frei. ✓
- `notifications.ts` firePush + createNotification + createNotificationsBatch — einzige /api/push-Caller. ✓
- `pushSender.ts` — service-role Admin-Client vorhanden (`SUPABASE_SERVICE_ROLE_KEY`), sendPushToUser. ✓
- `pg_policy notifications` — INSERT cross-user erlaubt, SELECT/UPDATE own-only (→ Read-Back-Problem → client-id). ✓
- Keine weiteren /api/push- oder firePush-Caller. ✓
- **KORREKTUR (Reviewer-Finding #1):** notifications-v2.test.ts + notifications-batch.test.ts existieren (initialer Audit nur auf `notifications.test.ts` gegrept). Beide push-agnostisch (jsdom-Client-Pfad, fetch-Fehler swallowed) → durch Contract-Wechsel unberührt. Verifiziert: 29/29 grün post-Build.

## 5. Pattern-References
- `errors-db.md` „RLS qual=true/permissiv auf sensiblen Tabellen" — gleiche Familie.
- `database.md` „RLS `.update()`/Cross-User → IMMER SECURITY DEFINER" (hier: Push-Inhalt server-derived statt client-trusted).
- `business.md` — Push-Text user-facing → keine Compliance-Verschlechterung (Inhalt kommt aus bestehenden Notification-Rows, unverändert).

## 6. Acceptance Criteria
- **AC1:** `/api/push` akzeptiert nur `{notificationId}`; ohne → 400; unbekannte id → 404; unauth → 401.
- **AC2:** Push-Inhalt (title/body/userId/url/tag) wird 100% aus der DB-Row + server-resolveDeepLink abgeleitet — kein Client-title/body/url/userId mehr.
- **AC3:** `sendPushForNotification` nutzt service-role Admin-Client (liest cross-user Row).
- **AC4:** `createNotification` + `createNotificationsBatch` setzen explizite `crypto.randomUUID()`-id, firePush mit id; legitime Notifications funktionieren weiter (in-app + push).
- **AC5:** `resolveDeepLink` als pures Util geteilt, keine Logik-Drift, kein supabase-Import.
- **AC6:** tsc clean; kein verbleibender Caller sendet altes {userId,title,...}-Shape.

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| Angreifer POST {userId,title,url} (altes Shape) | kein notificationId → 400, nichts gesendet |
| Angreifer POST {notificationId: <fremde row>} | server liest Row, pusht an row.user_id mit row-Inhalt — kann nur existierende Rows pushen, URL intern |
| notificationId existiert nicht | 404 |
| cross-user legit (A's Aktion → B's Notification) | A insertet B-Row (RLS ok) + client-id, POST id → server liest via admin → push an B. Funktioniert |
| Push deaktiviert / keine Subscription | sendPushToUser no-op (bestehend) |
| Batched-Update-Pfad | pusht nicht (bestehend, unverändert) |
| server-seitiger createNotification (API-Route) | firePush server-Pfad sendet direkt mit server-konstruiertem Inhalt (trusted, kein /api/push) |

## 8. Self-Verification Commands
- `pnpm exec tsc --noEmit`
- grep: kein `fetch('/api/push'` mehr mit title/body; route liest notificationId.
- Live-Smoke: POST /api/push mit altem Shape → 400; mit gültiger notificationId (Testrow) → ok + Row-Inhalt; via curl gegen bescout.net post-Deploy (Anil) ODER lokale Logik-Verifikation.

## 9. Open-Questions
- **Pflicht (geklärt):** Inhalt server-derived; client-id wegen cross-user-SELECT-RLS.
- **Autonom (CTO):** notificationId-Contract statt self-push-only (self-push würde legitime cross-user-Notifications brechen); Residual (cross-user Insert RLS) = Scope-Out + Follow-up.

## 10. Proof-Plan
`worklog/proofs/318-api-push-row-derived.txt`: tsc + grep (kein client-content an /api/push) + route-Logik-Walkthrough + RLS-Kontext + Residual-Doku.

## 11. Scope-Out
- `notifications_insert_any_authenticated` RLS-Tightening / cross-user-Notification-Creation auf SEC-DEFINER-RPCs → eigener (großer) Slice, Follow-up-Finding.
- Kein Rate-Limiting (separater Infra-Concern).
- Kein Backward-Compat für altes {userId,title}-Shape (sauberer Security-Break; einziger Caller migriert).

## 12. Stage-Chain (geplant)
SPEC ✓ → IMPACT (inline §4) → BUILD → REVIEW (Pflicht, Security) → PROVE → LOG.

## 13. Pre-Mortem
1. `.select()` Read-Back bei cross-user-Insert scheitert (SELECT-RLS) → client-id statt Read-Back (AC4).
2. resolveDeepLink-Duplikat driftet → ein geteiltes pures Util (AC5).
3. pushSender importiert notifications.ts (browser supabase) in Server-Bundle → stattdessen pures Util ohne supabase-Import.
4. Race: firePush vor Insert-Commit → Insert wird vor firePush awaited; Row committed bevor /api/push liest.
5. Anderer /api/push-Caller übersehen → grep bestätigt nur firePush.
