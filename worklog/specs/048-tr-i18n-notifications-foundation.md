# Slice 048 — TR-i18n Notifications Foundation + Pilot (reward_referral)

**Groesse:** M (1.5h — Scope reduziert von L auf Foundation + 1 Pilot)
**CEO-Scope:** JA (UI-Text-Impact, TR-i18n)
**Variante-2-Position:** #5/10 (L-Slice gesplittet)

## Ziel

Fundament legen fuer structured-key Notifications: Schema-Erweiterung + Frontend-Resolver generisch + 1 Pilot-RPC migrieren. Die restlichen 13 RPCs folgen in Slices 048b..048c nach Beta-Launch (wo TR-User priorisiert live gehen).

## Hintergrund

Existing Pattern (AR-59 price_alert): RPC schreibt i18n-KEY direkt in `notifications.title` als string (e.g. `'priceAlertDown'`). Frontend `NotificationDropdown.tsx` hat `KNOWN_TITLE_KEYS` Set + `resolveTitle`-Callback der bekannte keys via `tNotifTpl()` resolved.

**Problem mit bestehendem Pattern:**
- Title-Field wird zweckentfremdet (string = key ODER label)
- Params (playerName, amount, etc.) muessen client-side via async query geholt werden (wie in `resolveBody` fuer `price_alert` mit `getPlayerById`)
- Nicht-scalable fuer dynamic params

**Neues Pattern (Slice 048):**
- Schema: `notifications.i18n_key text NULL`, `notifications.i18n_params jsonb DEFAULT '{}'`
- RPC schreibt: title (DE fallback) + body (DE fallback) + i18n_key + i18n_params jsonb
- Client: if `notif.i18n_key`, nutze `tNotifTpl(i18n_key, i18n_params)`. Sonst fallback auf title/body.
- Params schon inline (kein async fetch noetig)

**Pilot-RPC:** `reward_referral` (einfachste Struktur: 2 notifications, klare Params `refereeHandle` + `referrerHandle`)

## Files

**NEU:**
- `supabase/migrations/NNN_slice_048_notifications_i18n_columns.sql` — add columns
- `supabase/migrations/NNN_slice_048_reward_referral_i18n.sql` — migrate reward_referral
- `worklog/proofs/048-schema-after.txt` — Schema dump
- `worklog/proofs/048-notification-sample.txt` — Sample notification mit i18n_key/params

**MODIFIZIERT:**
- `src/types/index.ts` (oder entsprechend) — DbNotification type erweitert um i18n_key + i18n_params
- `src/components/layout/NotificationDropdown.tsx` — resolveTitle/Body erweitert (generic i18n_key lookup)
- `messages/de.json` — 4 neue keys in `notifTemplates`: `referralRewardReferrerTitle`, `referralRewardReferrerBody`, `referralRewardRefereeTitle`, `referralRewardRefereeBody`
- `messages/tr.json` — analog TR-Uebersetzungen

## Acceptance Criteria

1. **Schema deployed:** `notifications.i18n_key` + `notifications.i18n_params` exist, RLS unaffected.
2. **Pilot-RPC liefert i18n-data:** neue `reward_referral` Notifications haben `i18n_key` + `i18n_params` gefuellt. Alte Rows ohne i18n_key bleiben funktional.
3. **Frontend resolved dynamisch:** NotificationDropdown zeigt TR-Text fuer TR-locale, DE-Text fuer DE-locale — beide bei gleicher Notification (Key-basiert, nicht title-basiert).
4. **DB-Defensive:** title + body weiterhin gefuellt als DE-Fallback (fuer Edge-Cases: i18n_key unbekannt / stale clients / DB-direkte Reads).
5. **tsc clean + 31 INV-Tests gruen.**
6. **DE + TR message-count identisch.**

## Edge Cases

1. **i18n_key unbekannt im Client** (z.B. neue Key seit alter App-Version) → `tNotifTpl(unknown_key)` fallback auf title.
2. **i18n_params mit fehlendem Key** (z.B. Key erwartet `{handle}` aber params hat nur `{name}`) → `tNotifTpl` rendert den raw-key-placeholder. Akzeptabel fuer Dev, CI-Guard post-Beta.
3. **Alte Rows (vor Slice 048):** `i18n_key = NULL` → fallback auf title/body, kein Break.
4. **RPC-migration-Idempotenz:** CREATE OR REPLACE ist idempotent. Zweiter apply identisch.
5. **TR messages missing:** `tNotifTpl` fallback auf `defaultLocale` (de) aktiv in next-intl — kein Crash.

## Proof-Plan

1. `worklog/proofs/048-schema-after.txt` — `\d+ notifications` output zeigt neue columns
2. `worklog/proofs/048-notification-sample.txt` — Live-INSERT via `reward_referral` Simulation → Row mit gefuelltem i18n_key+params
3. `worklog/proofs/048-frontend-render.txt` — Manual-check-Pseudocode wie Resolver ablaeuft (kein UI-Screenshot noetig da keine Visual-Aenderung)

## Scope-Out

- **13 restliche RPCs** (accept_mentee, admin_delete_post, award_dimension_score, calculate_ad_revenue_share, calculate_creator_fund_payout, claim_scout_mission_reward, notify_watchlist_price_change, refresh_user_stats, request_mentor, send_tip, subscribe_to_scout, sync_level_on_stats_update, verify_scout) → Follow-Up-Slices 048b (Trading+Money RPCs: award_dimension_score, send_tip, calculate_*) und 048c (Social + Admin: Rest).
- **Historical row rewrite mit i18n_key:** Existing 263 notifications bleiben mit title/body, kein reverse-engineering von keys.
- **DeepL-TR fuer automatische Translation:** Manuelles TR-Wording durch Anil (CEO-Gate per feedback_tr_i18n_validation).

---

**Ready fuer BUILD:** JA
