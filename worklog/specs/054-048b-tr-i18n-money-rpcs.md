# Slice 054 — TR-i18n Money-Path RPCs (048b Follow-Up)

**Groesse:** M
**CEO-Scope:** JA (UI-Text-Impact + Money-Notifications)
**Position:** Slice 048 Follow-Up

## Ziel

Migriere 4 Money-Path RPCs auf structured i18n_key + i18n_params Pattern (Slice 048 Foundation):
`award_dimension_score`, `send_tip`, `calculate_ad_revenue_share`, `calculate_creator_fund_payout`.

## Files

**NEU:**
- `supabase/migrations/20260418170000_slice_054_tr_i18n_money_rpcs.sql`

**MODIFIZIERT:**
- `messages/de.json` + `messages/tr.json` — je +10 neue Keys in notifTemplates

## Migrations-Details

| RPC | i18n_key | Params |
|-----|----------|--------|
| `award_dimension_score` (rang-up) | `rangUp` / `rangUpBody` | `{dim, rang}` |
| `award_dimension_score` (rang-down) | `rangDown` / `rangDownBody` | `{dim, rang}` |
| `send_tip` | `tipReceivedNotif` / `tipReceivedNotifBody` | `{senderName, amount}` |
| `calculate_ad_revenue_share` | `adRevenuePayout` / `adRevenuePayoutBody` | `{amount}` |
| `calculate_creator_fund_payout` | `creatorFundPayout` / `creatorFundPayoutBody` | `{amount}` |

## Bug-Fixes Nebenbei

1. **`send_tip` `v_receiver_name` Bug:** Query nutzt `WHERE id = p_sender_id` (korrekt — Sender) aber Variable hieß `v_receiver_name`. Umbenannt zu `v_sender_name` für Klarheit.
2. **BSD → Credits Wording (AR-32/39):** `calculate_ad_revenue_share` + `calculate_creator_fund_payout` hatten `BSD` in Notification-Body. Jetzt `Credits`.

## Acceptance Criteria

1. 4 RPCs schreiben i18n_key + i18n_params. ✅ (verifiziert via `pg_get_functiondef ~ 'i18n_key'`)
2. DE + TR Messages synchron (4862 keys both). ✅
3. `award_dimension_score` Grants unverändert (service_role_only seit Slice 044). ✅
4. tsc clean + 31/31 INV-Tests grün. ✅
5. title + body weiterhin gefüllt als DE-Fallback. ✅

## Scope bleibt

Nach Slice 054: 5/14 notification-schreibende RPCs auf structured i18n migriert
(`reward_referral` Slice 048, 4 neue hier). Rest (9 RPCs) als 048c:
`accept_mentee`, `admin_delete_post`, `claim_scout_mission_reward`, `notify_watchlist_price_change`,
`refresh_user_stats`, `request_mentor`, `subscribe_to_scout`, `sync_level_on_stats_update`, `verify_scout`.

## Proof

`worklog/proofs/054-i18n-verify.txt`
