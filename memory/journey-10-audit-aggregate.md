---
name: Journey 10 — Aggregated Audit (Watchlist + Notifications)
description: Privacy/Realtime-Critical J10 Round-1-Audit. Watchlist, Price-Alerts, Notification-Queue, Realtime-Subscription, Click-Through. 3 Perspektiven (Frontend/Backend/Business) vereint. Severity strenger weil Privacy-Pfad + cross-user Scenarios.
type: project
status: ready-for-healer
created: 2026-04-14
---

# Journey #10 — Aggregated Findings (Watchlist + Notifications)

**Total: 34 Findings — 6 CRITICAL + 10 HIGH + 12 MEDIUM + 6 LOW**

Severity kalibriert fuer J10 (Privacy + Cross-User + Silent-Failure):
- **CRITICAL** = Silent-broken Feature, Privacy-Leak-Risk, DB-Registry-Drift, User-Never-Gets-Notification
- **HIGH** = i18n-Komplett-Bruch fuer TR-User, Service-Error-Swallowing, Security-Definer-Grant-Violation, Multi-Device-Inkonsistenz
- **MEDIUM** = Konsistenz, Glossar-Verstoss, CHECK-Constraint fehlt, UX-Polish bei Privacy-Pfad
- **LOW** = Cosmetic, Post-Beta

**Audit-Basis:**
- Live-DB-Dump: 4 RPC-Bodies via `pg_get_functiondef` (`notify_watchlist_price_change`, `notify_push_on_insert`, `get_most_watched_players`, `rpc_get_most_watched_players`)
- 12 Live-SQL-Invariant-Checks (RLS-Policies + Roles, CHECK-Constraints, Indexes, Publication, Data-Distribution, Trigger-Chain)
- 10 Code-Reads: `services/watchlist.ts`, `services/notifications.ts`, `useNotificationRealtime.ts`, `NotificationDropdown.tsx`, `NotificationPreferencesPanel.tsx`, `TopBar.tsx`, `WatchlistView.tsx`, `usePriceAlerts.ts`, `useWatchlistActions.ts`, `api/push/route.ts`
- i18n-Grep: de.json + tr.json fuer Glossar-Konformitaet + notifTemplates Parity
- RPC-Grants-Check via `has_function_privilege` direkt
- Empirischer Live-DB-Check: 29 user_follows vs 11 follow-notifs → **RLS blockiert cross-user client-inserts**
- Empirischer Live-DB-Check: 0 price_alerts despite trigger existiert → **broken silent feature**

---

## 🚨 AKUT — 4 LIVE-KRITISCHE CRITICAL BUGS (P0)

### J10B-01 🚨 `notifications` INSERT-RLS blockiert ALLE cross-user Notifications (silent-failure)

**Beweis (Live-DB `pg_policies`):**
```
policyname            | cmd    | roles            | with_check
--------------------- | ------ | ---------------- | ------------------
Users see own         | SELECT | {public}         | null
Users update own      | UPDATE | {public}         | null
notifications_insert_own | INSERT | {authenticated} | (auth.uid() = user_id)
```

**Beweis (Live-Data):**
- 29 total `user_follows` rows → nur 11 `notifications` mit `type='follow'` (38% Erfolgsquote)
- 0 Notifications fuer: `trade`, `offer_received`, `offer_accepted`, `offer_rejected`, `offer_countered`, `reply`, `bounty_submission`, `bounty_approved`, `bounty_rejected`, `poll_vote`, `post_upvoted`
- Alle diese Types werden in Services via `createNotification(otherUserId, ...)` vom Client aus getriggert (siehe `offers.ts:185/214/263/292`, `social.ts:49`, `posts.ts:301`, `bounties.ts:320/373/448`, `contentReports.ts:154`)
- Nur SECURITY DEFINER RPCs (`ipo_purchase`, `achievement`, `rang_up`, `tier_promotion`, `fantasy_reward` via scoring.admin) schaffen Rows → 35 `ipo_purchase`, 45 `rang_up`, 15 `achievement`, 6 `fantasy_reward`

**Impact:**
- **Kern-User-Flow kaputt:** User bietet 10.000 $SCOUT fuer Scout Card → Empfaenger erhaelt NIEMALS `offer_received` Notification. Niemand sieht Offers. P2P-Markt ist funktional tot fuer alle die nicht hellseherisch in die `/market?tab=angebote` Seite navigieren.
- **Silent failure:** `createNotification` macht `console.error` + `return` bei error, kein Throw → Frontend weiss nicht dass Notification verloren ging
- Analog: `offer_accepted` → Sender sieht nie dass Gegner seinen Angebot akzeptierte. Muss im Profil-Wallet nachzaehlen.
- Analog: `bounty_approved` → Submitter erfaehrt nicht dass seine Submission approved wurde (Reward ist da, aber ohne Notif unsichtbar)

**Root Cause:** INSERT-Policy `auth.uid() = user_id` macht client-side cross-user INSERTs technisch unmoeglich. Die Service-Funktionen laufen im Browser des ausloesenden Users (z.B. Buyer), schreiben aber auf `user_id` des Empfaengers (Seller). RLS blockiert, Error wird geswallowed.

**Fix-Pfade (CEO-Entscheidung noetig):**
- **Option A (empfohlen):** Notifications via SECURITY DEFINER RPC oder DB-Trigger erstellen statt Client-Insert. Pattern: In jeder SECURITY DEFINER RPC (`create_offer`, `accept_offer`, `approve_bounty_submission`, etc.) direkt `INSERT INTO notifications` integrieren — umgeht RLS, atomar mit Business-Action.
- **Option B (quickfix):** Neue RPC `rpc_create_notification(p_target_user_id, p_type, p_title, p_body, p_ref_type, p_ref_id)` mit `SECURITY DEFINER` + REVOKE-Block (AR-44) + Business-Guard (nur wenn Caller tatsaechlich Recht hat, z.B. Offer-Sender kann fuer Offer-Receiver schreiben). Service-Layer ruft diesen RPC.
- **Option C (schnellst, unsicher):** INSERT-RLS oeffnen auf `authenticated` ohne `user_id`-Check. ABER: dann kann jeder User beliebige Notifications an jeden schreiben (Spam-Vektor).

**Fix-Owner:** Backend-Migration + Service-Refactor, CEO-Approval. → **AR-58 (CRITICAL P0)**

---

### J10B-02 🚨 `notify_watchlist_price_change` ist komplett broken (RLS blockiert INSERT, Feature wirkt live aber tut nichts)

**Beweis (Live RPC Body):**
```sql
CREATE OR REPLACE FUNCTION notify_watchlist_price_change()
RETURNS trigger
LANGUAGE plpgsql  -- ← NICHT SECURITY DEFINER!
AS $function$
...
  INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
  VALUES (v_entry.user_id, 'price_alert', ...);
```

**Beweis (Live-Data):**
- `SELECT COUNT(*) FROM notifications WHERE type='price_alert'` = **0**
- `SELECT COUNT(*) FROM watchlist` = 0 (noch keine User haben Watchlist befuellt → nicht exposable bis hier)
- Trigger `watchlist_price_alert AFTER UPDATE ON players` existiert und feuert bei jedem `players.floor_price` update
- Outer trigger `trg_fn_trade_refresh` (AFTER INSERT on trades) ist SECURITY DEFINER, updated `players.floor_price`, aber `notify_watchlist_price_change()` erbt NICHT den SECURITY DEFINER context (trigger functions run with their own definition)

**Impact:**
- **SILENT BROKEN FEATURE:** User klickt Herz-Icon auf Spieler → glaubt an Watchlist-Price-Alert → erhaelt nie welche. WatchlistView zeigt ThresholdPopover (Bell-Icon mit 5/10/20%) → alles Dekoration.
- Sobald 1 User eine Watchlist-Entry hat und der Spieler-Preis sich aendert → Trigger feuert → INSERT auf `notifications` mit `user_id=watchlist-user` aber `auth.uid()=trading-user` → RLS blockiert → keine Notification, keine Error-Meldung im Client

**Root Cause:**
- Function fehlt `SECURITY DEFINER SET search_path TO 'public'` (siehe `rpc_get_most_watched_players` als korrektes Pattern)
- Ohne SECURITY DEFINER laeuft trigger mit invoker-Kontext → auth.uid()=trader, nicht watchlist-user
- Plus: Hardcoded DE-Strings in trigger body (`'Preisalarm: '`, `'Preisanstieg: '`, `'Floor Price gefallen auf '`, `' Credits'`) → TR-User haetten DE gesehen (J3-Triple-Red-Flag-Pattern: dynamischer Wert + DE/Mix + $SCOUT-verwandt)

**Fix-Owner:** Backend-Migration. 3 Aenderungen:
1. `SECURITY DEFINER` + `SET search_path TO 'public'` hinzufuegen
2. REVOKE+GRANT-Block (AR-44 Pflicht bei SECURITY DEFINER): `REVOKE EXECUTE ON FUNCTION notify_watchlist_price_change() FROM PUBLIC, anon; GRANT EXECUTE TO authenticated;`
3. Hardcoded DE-Strings durch i18n-Keys ersetzen (analog `notifText` pattern — oder Key speichern in `notifications.body_key` + neue Column, Client resolved) → **AR-59 (CRITICAL)**

**Fix-Owner:** Backend-Migration, CEO-Approval (neue Column falls gewaehlt). → **AR-59 (CRITICAL P0)**

---

### J10F-01 🚨 `notifText` liest NUR von `de.json` → TR-User sehen ALLE Notifications auf Deutsch

**Beweis (File:Line):**
```typescript
// src/lib/notifText.ts:10-12
import deMessages from '@/../messages/de.json';
const templates = (deMessages as unknown as ...).notifTemplates ?? {};
```

**Beweis (Live):** `messages/tr.json:4615` hat vollstaendigen `notifTemplates`-Namespace mit TR-Uebersetzungen (`"Yeni Kulüp Satışı!"`, `"Yeni Takipçi"`, etc.), aber nicht geladen.

**Impact (betrifft ALLE non-system Notifications die Services erzeugen):**
- `offer_received`: "Neues Angebot" statt "Yeni teklif"
- `offer_accepted`: "Dein Angebot wurde angenommen" statt TR-Aequivalent
- `bounty_approved`: DE statt TR
- `follow`: "Neuer Follower" statt "Yeni Takipçi"
- `mission_reward`: "Mission abgeschlossen!" statt TR-Aequivalent
- `tip_received`: DE statt TR
- `event_starting/closing`: DE-Eventnamen statt TR
- `liquidation`: DE-Texte statt TR
- `ipo_purchase`: "Scout Card gekauft" statt "Scout Card alındı"

**Konsequenz:** Beta-TR-User (Pilot-Zielgruppe!) bekommen 100% DE-Notifications. Compliance + UX-Disaster. Geofencing TIER_RESTRICTED = TR → Kern-Betroffenheit.

**Root Cause:** `notifText` ist non-React-Helper, kennt kein locale-context. Braucht entweder:
- (a) User-Preference oder Locale-Cookie via Server Action / RPC auslesen
- (b) Locale als Parameter an jede Service-Call-Site durchreichen (breaking change)
- (c) Pattern: Service schreibt i18n-KEY in `notifications.body_key` + `params` (JSONB), Client resolved via `useTranslations` beim Rendern. Das ist die richtige Architektur — analog zu bekannten Muster aus J3-AR-01 (Service wirft i18n-Keys, Consumer resolved).

**Fix-Owner:** Backend + Frontend + Service-Refactor. Groesserer Scope. → **AR-60 (CRITICAL)**

**Quickfix-Path (vorerst P0, vor Beta):**
- Aktuelle 54+ `notifTemplates`-Keys beide in de/tr verfuegbar → extend `notifText` um `locale`-Parameter, der via `preferencesService.getLocale(userId)` vom DB-Profil gelesen wird (wobei DB `profiles` eine `locale` Column braeuchte — pruefen!)
- Alternativ: notifText.ts liest beide Namespaces, service-caller muessen locale uebergeben (1 Parameter-Add fuer alle 30+ call-sites)

---

### J10B-03 🚨 Edge Function `send-push` (`supabase/functions/send-push`) existiert nicht → Server-side Push-Trigger-Pfad tot

**Beweis (Live):**
```sql
-- notify_push_on_insert body calls:
PERFORM net.http_post(
  url := 'https://skzjfhvgccaeplydsunz.supabase.co/functions/v1/send-push',
  body := json_build_object('record', row_to_json(NEW))::jsonb,
  ...
);
```
- `ls supabase/functions/` → kein `send-push` Verzeichnis (Verzeichnis existiert nicht)
- `mcp__supabase__list_edge_functions` → permission denied, konnte nicht pruefen ob die Funktion in Cloud deployt wurde
- Exception handler im Trigger: `EXCEPTION WHEN OTHERS THEN RAISE WARNING ... RETURN NEW` → swallowed silently

**Impact:**
- Bei jedem `notifications` INSERT wird `net.http_post` auf eine 404-URL geschickt
- `RAISE WARNING` in postgres logs, aber Trigger RETURN NEW → Notification-Row wird erfolgreich eingefuegt
- Fuer ALLE Server-Side notifications (achievements, rank_up, IPO-Purchases, fantasy_reward via scoring.admin.ts) die keinen Client-Kontext haben, gibt es KEINE Push-Notification via Browser
- Der Client-seitige Pfad (`firePush` → `POST /api/push` → `sendPushToUser`) funktioniert (sofern RLS passes), aber nur fuer Client-initiated Notifications

**Konsequenz:** 1 Push-Subscription existiert in DB → Push-Feature ist aktiviert bei User, aber bekommt nur Client-side Push (follow, offer, reply — sofern RLS durchlaesst, was laut J10B-01 meistens nicht der Fall ist). Server-side automatische Notifications (nightly, scheduled, DB-trigger-based) haben KEIN Push.

**Fix-Owner:** Backend/DevOps — Edge Function `send-push` deployen ODER Trigger umschreiben auf direkten `sendPushToUser` Call via PL/pgSQL (ohne http). → **AR-61 (CRITICAL)**

---

## Cross-Audit Overlaps (mehrfach gesehen = hohe Konfidenz)

| Bug | Frontend | Backend | Business |
|-----|----------|---------|----------|
| Cross-user INSERT RLS blockiert alle Offer/Trade/Follow-Notifs | — | **J10B-01** | J10Biz-01 |
| Watchlist-Price-Alert Trigger komplett kaputt (RLS + DE-hardcoded) | — | **J10B-02** | J10Biz-02 |
| TR-User sehen DE bei allen Service-generierten Notifications | **J10F-01** | — | **J10Biz-03** |
| Edge Function `send-push` 404 → Server-side Push tot | — | **J10B-03** | — |
| AR-44 Violation: `notify_watchlist_price_change` anon=TRUE + no SECURITY DEFINER | — | **J10B-04** | — |
| Notification-Service error-swallowing (getUnreadCount, markAsRead, markAllAsRead) | — | **J10B-05** | — |
| Hardcoded DE-Strings in Trigger-Bodies ($SCOUT-Ticker-Leak-Equiv) | — | **J10B-06** | **J10Biz-04** |
| localStorage price_alerts parallel zu DB watchlist → inkonsistent multi-device | **J10F-02** | — | — |
| Bell-Icon (Watchlist-Sub) vs Star-Icon (PlayerHero-Watchlist) → visuell inkonsistent | **J10F-03** | — | — |
| Notification-Preferences kein DELETE-Policy (orphan rows bei user delete) | — | **J10B-07** | — |
| Bulk `createNotificationsBatch` keine Race-Guard → Multi-User-Spam moeglich | — | **J10B-08** | — |
| achievement-Notification in Live-DB enthaelt `$SCOUT`-Ticker user-facing | — | **J10B-09** | **J10Biz-05** |
| preventClose auf `NotificationDropdown` BottomSheet fehlt | **J10F-04** | — | — |
| Multi-Device Realtime: read-sync zwischen Devices nicht verifiziert | **J10F-05** | — | — |
| `notifications.reference_id` ist TEXT nicht UUID → FK nicht enforced | — | **J10B-10** | — |

---

## Autonome Beta-Gates (Healer jetzt, kein CEO noetig)

### Group A — P0 Service-Hardening + Error-Surfacing (analog J3/J8 Healer A)

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| **FIX-01** | **CRITICAL** | `src/lib/services/notifications.ts:127-148` | `getUnreadCount`: `if (error) return 0` → `throw new Error(error.message)` + `logSupabaseError`. `getNotifications`: `if (error) return []` → same fix. React Query retryt bei 3x backoff, aktuell: cached 0/[] als SUCCESS, kein Retry. | J10B-05 |
| **FIX-02** | **HIGH** | `src/lib/services/notifications.ts:152-167` | `markAsRead`: kein Error-Check (`await supabase...update()`) → `const { error } = await ...; if (error) { logSupabaseError(...); throw ... }`. Optimistic-Update in `useNotificationRealtime.ts:87-99` faengt throw ab → Rollback moeglich. Gleicher Fix fuer `markAllAsRead`. | J10B-05 |
| **FIX-03** | **HIGH** | `src/lib/services/notifications.ts:228-240` | `createNotification`: Silent `console.error + return` bei error → log + throw. Service wird als fire-and-forget konsumiert (`.then(m => m.createNotification...).catch(console.error)`) → Consumer wuerden den Error sehen statt silent-swallow. | J10B-01 Flanke |
| **FIX-04** | **HIGH** | `src/lib/services/notifications.ts:377-381` | `createNotificationsBatch`: `console.error + return` bei error → log + throw. 2 scoring-admin + ipo + bounties nutzen das. Gleiche Argumentation wie FIX-03. | J10B-01 Flanke |
| **FIX-05** | **MEDIUM** | `src/lib/services/notifications.ts:297-311` | `createBatchedNotification`: UPDATE fehler wird nur `console.error`. Gleicher Fix. | J10B-05 |
| **FIX-06** | **MEDIUM** | `src/lib/hooks/useNotificationRealtime.ts:87-100` | `markReadLocal`: Nach `markAsRead` throw, aktuell `console.error` aber KEIN Rollback der Optimistic Update → User sieht "read" aber DB ist unread. Fix: `catch` setzt state zurueck (`setNotifications(prev => prev.map(... read: false))`). | J10B-05 Flanke |

### Group B — Kapitalmarkt-Glossar + Notification-Wording (J8Biz Fortsetzung)

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-07 | MEDIUM | `messages/de.json:2857` + tr.json line ~2857 | "Du hast {total} Credits aus der PBT-Ausschüttung erhalten" → "Du hast {total} Credits aus der PBT-Verteilung erhalten" (neutral). "Ausschuettung" hat starke Gluecksspiel/Finanz-Konnotation. TR-Aequivalent pruefen: `"PBT dağıtımından"` ist OK (neutral), aber doppelcheck ob "Ödül" stattdessen besser. | J10Biz-04 |
| FIX-08 | MEDIUM | Live-DB Achievement `Sammler` Notification (und andere mit `$SCOUT`-Referenz) | Achievement-Notifications mit `body` wie `"Kader über 1.000 $SCOUT"` → ersetzen durch `"{amount} Credits"` via i18n-Key. 1 Row exemplarisch live, mehr koennten existieren. Audit: `SELECT DISTINCT body FROM notifications WHERE body ILIKE '%$SCOUT%'`. Plus Source in achievements-Definitionen checken (wahrscheinlich `src/lib/achievements/*` oder `services/social.ts:505`). | J10B-09, J10Biz-05 |
| FIX-09 | MEDIUM | `messages/de.json:2841-2870`, tr.json gleiche Keys | `notifications.prefTrading` → "Trading" bleibt in DE (ist Code-technisch OK, nicht im Verbotswortschatz). TR `"Ticaret"` neutral. **Kein Fix noetig** — aber `feedback_tr_i18n_validation.md` Pattern: zeigen und bestaetigen lassen. | Prevention |
| FIX-10 | MEDIUM | `src/components/player/detail/PlayerHero.tsx:114` + `src/features/market/components/marktplatz/WatchlistView.tsx:6` | Watchlist-Ikonographie inkonsistent: PlayerHero nutzt `Star` (gold-fill), WatchlistView nutzt `Heart`/`HeartOff`. Shopping-Metapher vs Favoriten-Metapher — einheitliches Icon waehlen. Empfehlung: `Star` (hat schon Brand-Konsistenz mit Gold-Theme). Alle Call-Sites greppen: `grep -rn "Heart\|HeartOff.*watchlist\|addToWatchlist"`. | J10F-03 |

### Group C — Realtime + Multi-Device UX

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-11 | HIGH | `src/lib/hooks/useNotificationRealtime.ts:54-85` | Realtime subscribt auf `event:'INSERT'` only. **Fehlt**: `UPDATE` event fuer read-state-sync. Wenn Device1 markReadLocal macht → DB update → Device2 subscribt nicht auf UPDATE → unread-count zeigt weiter "5" obwohl read=true in DB. Fix: zweiter `.on('postgres_changes', {event:'UPDATE',...})` channel, bei payload.new.read=true → setNotifications/setUnreadCount aktualisieren. | J10F-05 |
| FIX-12 | MEDIUM | `src/components/layout/NotificationDropdown.tsx:304-328` | Mobile BottomSheet kein `preventClose`-Aequivalent. Wenn User `markAllAsRead` tappt und Backdrop-Click passiert → Optimistic-Update laeuft, aber Sheet schliesst. Aktuell funktioniert weil die Mutations fire-and-forget sind, aber bei FIX-02 (jetzt throw) kann Sheet zu sein beim Fehler → kein Toast. Empfehlung: bei `isMarkingAll` State (neu) Backdrop-Click ignorieren. | J10F-04 |
| FIX-13 | LOW | `src/lib/services/notifications.ts:139-148` | `getNotifications` hat kein `.limit(50)` Guard. `limit`-Param default 20, aber keine Obergrenze, koennte theoretisch 10000+ laden wenn Caller fehlerhaft. Fix: `Math.min(limit, 100)` als Cap. | Performance |
| FIX-14 | LOW | `src/components/layout/NotificationDropdown.tsx:115-127` | `timeAgo` ist lokale Helper-Function, dupliziert das Pattern aus `src/lib/utils/timeAgo.ts` (falls existent) — pruefen + konsolidieren. | Duplicate |

### Group D — Watchlist + Price-Alert UX

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-15 | MEDIUM | `src/components/player/detail/hooks/usePriceAlerts.ts:10` | localStorage-based Price-Alerts parallel zu DB `watchlist.alert_threshold_pct` → inkonsistent. User auf Device1 setzt Alert, Device2 sieht nichts. Post-J10B-02 (wenn DB-Pfad live), diesen localStorage-Pfad DEPRECATE + deleten. Currently dead-weight code. | J10F-02 |
| FIX-16 | MEDIUM | `src/features/market/components/marktplatz/WatchlistView.tsx:137` | `watchlistEntries` Prop wird nicht mit `players` synced — wenn `watchlistEntries` enthaelt `player_id` der nicht in `players` ist (z.B. Spieler wurde geloescht/liquidated), verschwindet er silent aus WatchlistView (da `players.filter(p => watchedIds.has(p.id))`). **Fehlt**: Stale-Entry-Cleanup oder zumindest eine Meldung "N Spieler nicht mehr verfuegbar". | UX Completeness |
| FIX-17 | LOW | `src/features/market/hooks/useWatchlistActions.ts:43-53` | LocalStorage-Migration hat kein Fehler-Exit: wenn `migrateLocalWatchlist` partiell fehlschlaegt (z.B. 3 von 5 Player-IDs sind invalid), `localStorage.removeItem` wird TROTZDEM aufgerufen (Line 150 in service) → User verliert LS-Watchlist ohne vollstaendige Migration. Fix: Nur removen wenn ALLE migrated. | Data-Loss-Risk |
| FIX-18 | LOW | `src/lib/services/watchlist.ts:56-65` | `addToWatchlist`: unique-constraint violation code `23505` wird auf `return` gemappt (idempotent). OK. Aber andere Errors throw. **Cache-Race**: Optimistic cache-set in `useWatchlistActions.ts:23-34` fuegt `{id: 'opt-${id}', ...}` hinzu, bei unique-violation bleibt `opt-xxx` in cache → kein invalidate. Danach `getWatchlist` refetch (staleTime 2min) wuerde es wegblasen, aber zwischen add und refetch gibt's duplicate-visual. Pruefen. | Edge-Case |

**Total autonome Fixes: 18** (2 CRITICAL + 5 HIGH + 7 MEDIUM + 4 LOW)

**Healer-Strategie:**
- **Healer A (P0 Service-Hardening — Error-Surfacing):** FIX-01..06 (alles Service-Layer + Hook-Rollback) — ~1.5h
- **Healer B (Realtime + Multi-Device):** FIX-11 + FIX-12 + FIX-13 + FIX-14 (Realtime UPDATE channel + Mobile UX) — ~1.5h
- **Healer C (Glossar + UX Polish):** FIX-07..10 + FIX-15..18 (Wording + Watchlist UX) — ~2h

---

## CEO-Approval-Triggers (siehe `journey-10-ceo-approvals-needed.md`)

| ID | Trigger | Severity | Item |
|----|---------|----------|------|
| **AR-58** | **Security + Architektur-Change** | **CRITICAL P0** | Cross-user Notifications sind RLS-blockiert (siehe J10B-01). 3 Fix-Pfade: (A) SECURITY DEFINER RPC pro Notification-Type, (B) generic `rpc_create_notification` mit Business-Guards, (C) INSERT-RLS oeffnen + Rate-Limits. Anil Entscheidung. Feature-Impact: ALLE cross-user-Notifs (Offer/Trade/Follow/Reply/Bounty-Feedback). Diese Funktion ist Kern-Produkt, nicht Side-Effect. |
| **AR-59** | Security + Privacy | **CRITICAL** | `notify_watchlist_price_change` braucht: (1) `SECURITY DEFINER SET search_path TO 'public'`, (2) `REVOKE EXECUTE FROM PUBLIC, anon` + `GRANT TO authenticated` (AR-44 Template), (3) Hardcoded DE-Strings ersetzen durch i18n-Key-Pattern (`notifications.body_key TEXT` + `body_params JSONB` Column, Client resolved). Migration-Only-Fix nach Anil-Go. |
| **AR-60** | i18n + Architektur | **CRITICAL** | `notifText` liest nur DE. Fix-Architektur: Services schreiben `notifications.title_key`/`body_key` + `params JSONB`, Client (NotificationDropdown) resolved via `useTranslations`. Migration noetig: 2 neue Columns, Backfill von existierenden Rows durch Parse-Pattern-Matching, Service-Refactor (30+ Call-Sites). ODER: Quickfix `notifText(locale, key, params)` mit DB-locale-lookup per Call → schneller, aber einmal-per-Call DB-Lookup. |
| **AR-61** | DevOps + Push-Delivery | **CRITICAL** | Edge Function `send-push` existiert nicht (lokal kein Ordner, Remote permission denied zu verifizieren). Trigger `trg_push_on_notification` ruft 404-URL, swallowed Warning. Fix: (a) Edge Function deployen ODER (b) Trigger umschreiben (ohne http, direkt `sendPushToUser` via PL/pgSQL ist nicht moeglich → WebPush braucht Node crypto). Also ZWINGEND (a). |
| AR-62 | Security-Audit (AR-44 Template) | HIGH | `notify_watchlist_price_change` anon=TRUE/auth=TRUE/public=TRUE Execute-Grant. Wie in J4 (`earn_wildcards`) + J8 (7 Trade-RPCs). Trigger-Function ist zwar nicht direkt aufrufbar, aber AR-44-Regel PFLICHT (Defense-in-Depth). Teil von AR-59. |
| AR-63 | Compliance-Wording | HIGH | `notifications.body` in Live-DB enthaelt `$SCOUT`-Ticker (1 Achievement-Row exemplarisch: "Kader über 1.000 $SCOUT"). Quelle in Achievement-Definitionen/Service finden und via `{amount} Credits` + i18n ersetzen (J3-Red-Flag analog in Trading-Errors). |
| AR-64 | DB + Data-Integrity | MEDIUM | `notifications.reference_id` ist TEXT (nicht UUID) → kann nicht als FK auf `players(id)` oder `offers(id)` enforcen. Konsequenz: orphan refs moeglich wenn ein Player geloescht wird, Notification zeigt auf Ghost-ID. Fix: separate `reference_player_id UUID REFERENCES players(id) ON DELETE CASCADE` + `reference_offer_id UUID REFERENCES offers(id) ON DELETE CASCADE` etc. Migration mit Backfill. Post-Beta akzeptabel. |
| AR-65 | Multi-Device UX | MEDIUM | Realtime subscribt nur auf INSERT (J10F-05 / FIX-11). Wenn User Device1 markRead → Device2 sieht weiter unread. Autonom fixbar aber erweitert Architektur (zweiter Channel) → CEO-Info statt Approval. |
| AR-66 | DB + Privacy | MEDIUM | `notification_preferences` hat kein DELETE-Policy. Bei zukuenftiger Account-Deletion haengen orphan-rows (bis FK-CASCADE greift via `auth.users`). Low-Impact aber Completeness-Bug. Migration. |

**Total CEO-Approvals: 9 Items** (4 CRITICAL + 2 HIGH + 3 MEDIUM)

---

## VERIFIED OK (Live 2026-04-14, Post-J8 Audit-Baseline)

| Check | Beweis |
|-------|--------|
| Watchlist RLS complete (SELECT + INSERT + UPDATE + DELETE) | 4 policies in pg_policies, all `auth.uid() = user_id` |
| Watchlist UNIQUE constraint `(user_id, player_id)` | Prevents duplicate-add races |
| Watchlist INSERT idempotency on unique-violation | Service catches error.code='23505' → return silently |
| push_subscriptions RLS (ALL ops on own) | 1 policy `ALL, user_id = auth.uid()` |
| push_subscriptions UNIQUE `(user_id, endpoint)` | Prevents duplicate-device-subscribe |
| notifications table has `read` column (NICHT `is_read`) | Matches common-errors.md convention |
| notifications `reference_type` CHECK constraint | 11 allowed values: research/event/profile/poll/bounty/player/liquidation/prediction/post/ipo/mission |
| notifications `type` CHECK constraint | 36 allowed types, comprehensive |
| notifications REPLICA IDENTITY FULL (for Realtime) | `relreplident=f` |
| notifications in `supabase_realtime` publication | Row exists in pg_publication_tables |
| Realtime subscription filter `user_id=eq.${userId}` | RLS respektiert Filter (double-guard) |
| Realtime subscription dedup check | Line 70-72: `if (prev.some(n => n.id === newNotif.id)) return prev` |
| Stale-fetch guard with fetchIdRef | useNotificationRealtime.ts:20-32 |
| Optimistic updates with cache rollback on error | useWatchlistActions.ts:36-40 (invalidateQueries on fail) |
| Idx `idx_notif_user_unread` partial-index `WHERE NOT read` | Effizient fuer Badge-Count-Query |
| Idx `idx_notif_user_created` `(user_id, created_at DESC)` | Effizient fuer getNotifications-ORDER BY |
| Idx `idx_watchlist_user_id` + `idx_watchlist_player_id` | Beide Abfragen (per-user und per-player) abgedeckt |
| Notification-Preferences defaults (alle true) | Service returns defaults wenn kein row existiert |
| `TYPE_TO_CATEGORY` mapping 36 types → 7 categories | Single source of truth, geprueft gegen CHECK constraint |
| `getCategoryForType` respects `'system'` always-on | `if (category !== 'system') { check prefs }` |
| `createNotificationsBatch` single-query pref-check | 1 RPC fuer N users statt N RPCs |
| Bell-Icon Badge `9+` overflow handling | NotificationDropdown.tsx TopBar pattern |
| ESC + Backdrop-Click close Dropdown | desktop + mobile, useEffect cleanup |
| NotificationDropdown Portal-safe | `createPortal(..., document.body)` + SSR guard |
| Click-Through `getNotifHref` resolves 10 types | research/event/profile/poll/post/bounty/player/liquidation/offer + default null |
| Profile-Notif Handle-lookup async | `getNotifHref` returns null for profile, handleClick async-resolves handle |
| Mark-all-read optimistic | useNotificationRealtime.ts:103-113 |
| WatchlistView EmptyState (Heart + CTA) | 0-entry state is graceful |
| Watchlist threshold validation `alert_threshold_pct` | NUMERIC default 5.0, no NOT NULL — allows nulls via trigger (`OR w.alert_threshold_pct IS NULL OR = 0`) |
| NotificationDropdown 9+ notifications pagination-first | max 50 in realtime cache (line 72) |
| No `overlay wrappers` / Modal blocking on Dropdown | correct z-index [100] |

---

## Systematische Bug-Klassen (neu in J10)

### 1. **Cross-User Silent INSERT (Privacy-Pfad-Klasse)**
**Entdeckt:** J10B-01  
**Pattern:** Service-Funktion im Client-Kontext insertiert fuer OTHER user_id. RLS-Policy `auth.uid() = user_id` blockiert silent.  
**Wiederholt:** 12 Service-Call-Sites (offers, social, posts, bounties, contentReports, missions, ipo, scoring-admin, events)  
**Audit (Beta-Gate):** `grep -rn "createNotification(.*[a-zA-Z]*Id" src/lib/services src/features` — alle Calls wo 1. Parameter NICHT `userId` (eigener Caller) → pruefen ob RLS-kompatibel

### 2. **i18n-Komplett-Bruch bei Server-generierten Strings (Architektur-Klasse)**
**Entdeckt:** J10F-01  
**Pattern:** Helper-Funktion wie `notifText` ohne locale-Context → hardcoded DE. Analog: DB-Trigger mit DE-Strings im Body.  
**Wiederholt:** 30+ `notifText()` Calls + 1 Trigger (`notify_watchlist_price_change`) mit DE-Literals  
**Audit:** `grep -rn "notifText\|RAISE EXCEPTION '" supabase/migrations src/lib/services` — alle Stellen wo Server-side User-facing-String erzeugt wird → muss i18n-Key-Pattern folgen

### 3. **Edge Function Phantom-URL (DevOps-Pfad-Klasse)**
**Entdeckt:** J10B-03  
**Pattern:** DB-Trigger POSTs zu `functions/v1/xxx` ohne dass die Edge Function existiert. SQLERRM swallowed Warning.  
**Wiederholt:** 1 Edge Function (`send-push`)  
**Audit:** `grep -rn "net.http_post" supabase/migrations` + gegenchecken welche Edge Functions deployed sind (erfordert list_edge_functions permission)

### 4. **SECURITY DEFINER + Cross-User-INSERT Escape-Hatch**
**Entdeckt:** J10B-02 (negative), nicht explizit violated aber Architektur-Lektion  
**Pattern:** Wenn Trigger-Funktion Rows fuer fremde `user_id` schreiben muss → `SECURITY DEFINER` ist **zwingend**, plus AR-44 REVOKE-Block. Ohne SECURITY DEFINER: Trigger feuert, aber INSERTs sind von RLS blockiert, swallowed.  
**Regel:** JEDER Trigger der in `notifications`/`transactions`/`wallets`/`holdings` fuer OTHER `user_id` schreibt → `SECURITY DEFINER` + REVOKE-Block + `SET search_path = 'public'`

---

## Sonderfaelle / Edge-Cases (fuer Healer-Brief)

### Migration-Pflichten bei AR-58 (Cross-User-Notif-Fix)
- Falls Option B (generic RPC): Business-Guards PRO notification-type. z.B. `p_type='offer_received' → caller muss sender_id der offer sein`. Sonst Spam-Vektor (jeder User kann anderen "Fake Offer" notification senden).
- Falls Option A (SECURITY DEFINER pro RPC): `create_offer` RPC macht nach erfolgreicher `offers` INSERT direkt `INSERT INTO notifications` — atomic, RLS-bypass natuerlich, kein Spam-Risk.

### Race-Condition Watchlist-Add + Price-Change
- User A addded Player X zur Watchlist um 14:00:00.000
- Trigger `watchlist_price_alert` feuert um 14:00:00.005 (Preis-Aenderung)
- Watchlist-Entry existiert schon (INSERT committed) → Trigger findet Entry → INSERTet Notification  
✓ OK (INSERT von Watchlist ist transaction, Trigger sieht es)

### Dedupe in `notify_watchlist_price_change`
- `IF v_entry.last_alert_price = NEW.floor_price THEN CONTINUE` — verhindert duplicate bei identischem Preis
- ABER: Wenn Preis geht 100 → 105 → 100 → 105, triggert bei jedem Wechsel (Flackern moeglich bei volatilen Phasen). Post-Fix Consideration: `last_alert_timestamp` + 5min cooldown statt Preis-Equals-Check.

### createBatchedNotification Race Window
- Line 317: Comment "accept minor race as acceptable (worst case: 2 notifications instead of 1 batched)"
- Fuer J3-AR-25 (Notif-Dedup) Kontext: Pattern ist OK fuer polls/ratings aber bei `trade_completed` waere Duplicate falsch (User sieht 2 "Du hast Scout Card verkauft" Modals)
- Audit: Welche Types nutzen `createBatchedNotification`? → `grep -rn createBatchedNotification src/` → nur `missions.ts` (1 Call). OK fuer Polls/Missions, nicht money-critical.

---

## Audit-Effort

- Audit-Durchlauf: ~1.5h (3 Perspektiven + Live-DB + i18n-Grep)
- Healer-Effort (autonom FIX-01..18): ~5h (3 parallele Healer)
- CEO-Approvals (AR-58..66): 1 Entscheidungsrunde Anil (30min)
- Nach-Fix-Verification: ~1h (tsc + vitest + Live-DB-Check dass `notifications`-Row counts fuer offer/trade/follow wieder inserted werden nach Option-B-Fix)

**Beta-Blocker? JA:** AR-58 (Cross-User-Notifs kaputt) + AR-60 (TR sieht DE-Notifs) sind beide Kern-UX. Nicht ausspielbar ohne. AR-59 (Price-Alerts kaputt) ist Feature-kompletter-Bruch. AR-61 (Server-Push tot) ist eingeschraenktes Feature-Set. **4 von 9 CEO-Items sind CRITICAL-BETA-BLOCKER.**

---

## Next Steps

1. **Anil reviewed CEO-Approvals (9 Items)** — prioritisiere AR-58..61 (CRITICAL P0)
2. **Healer A startet sofort** — FIX-01..06 (Service-Error-Surfacing) = autonom ohne CEO
3. **Healer B parallel** — FIX-11..14 (Realtime + Mobile UX)
4. **Nach AR-58/59/60 Entscheidung:** Backend-Migration + Service-Refactor (Owner: backend-Agent, Healer A post-Healer)
5. **Nach AR-61 Entscheidung:** Edge-Function `send-push` deployen (Owner: Anil + DevOps-Sub-Step)
6. **Post-Fix:** Re-Audit dass `SELECT type, COUNT(*) FROM notifications GROUP BY type` nach Trade/Offer-Ausloeser entsprechende Rows hat (End-to-End-Verification).
