# Slice 055 — TR-i18n Social/Admin RPCs (048c Follow-Up)

**Groesse:** M (umfangreich — 8 RPCs + 4 latent Bug-Fixes)
**CEO-Scope:** JA (UI-Text-Impact + Latent-Bug-Fix)
**Position:** Slice 048 Follow-Up

## Ziel

Schließt die TR-i18n-Migration fuer alle notification-schreibenden RPCs (13/14). Nebenbei 4 Latent-Bugs gefixt: RPCs nutzten `message`-Column die nicht existiert (notifications hat `body`).

## RPCs migriert

| RPC | i18n_key | Params | Extra-Fix |
|-----|----------|--------|-----------|
| `accept_mentee` | `mentorAccepted` | `{}` | **message→body Bug-Fix** |
| `admin_delete_post` | `postRemovedByAdmin` | `{contentSnippet}` | — |
| `claim_scout_mission_reward` | `scoutMissionReward` | `{amount}` | **message→body + BSD→Credits** |
| `refresh_user_stats` | `tierPromotion` | `{tier}` | — |
| `request_mentor` | `mentorRequest` | `{}` | **message→body Bug-Fix** |
| `subscribe_to_scout` | `scoutSubscriptionNew` | `{subscriberName}` | BSD→Credits in error msg |
| `sync_level_on_stats_update` | `tierPromotionLevel` | `{tier, level}` | Trigger-fn |
| `verify_scout` | `scoutVerified` | `{badgeLevel}` | **message→body Bug-Fix** |

## Skip

**`notify_watchlist_price_change`** bleibt AR-59 Pattern (title-as-key, body=NULL + client-side playerName-resolve). Separate Case — body kann nicht in jsonb_build_object serialisiert werden weil playerName async vom Client kommt. AR-59 ist hier optimal.

## Nebenbei-Fixes (4 Latent-Bugs)

`accept_mentee`, `request_mentor`, `claim_scout_mission_reward`, `verify_scout` nutzten `INSERT INTO notifications (..., message, ...)` — aber notifications-Schema hat nur `body` (nicht `message`). Beim ersten echten RPC-Call wuerde Postgres ERROR `column "message" does not exist` werfen → Silent-Fail im Feature.

Jetzt korrigiert auf `body`. Feature-Go-Live kann ohne Crash passieren.

## Files

**NEU:**
- `supabase/migrations/20260418180000_slice_055_tr_i18n_social_admin_rpcs.sql` — 8 RPC-Bodies
- `messages/de.json` + `messages/tr.json` — je +16 neue notifTemplates keys

**MODIFIZIERT:** siehe oben

## Acceptance Criteria

1. 13/14 notification-RPCs schreiben i18n_key + i18n_params. ✅
2. 4 Latent-Bugs (message-col) gefixt. ✅
3. DE+TR synchron 4878 keys (+16 neu). ✅
4. 31/31 INV-Tests gruen. ✅
5. tsc clean. ✅

## Status nach 055

**Complete: 13/14 RPCs auf structured i18n.**
- 1 Pilot (Slice 048): reward_referral
- 4 Money-Path (Slice 054): award_dimension_score, send_tip, calculate_ad_revenue_share, calculate_creator_fund_payout
- 8 Social/Admin (Slice 055): accept_mentee, admin_delete_post, claim_scout_mission_reward, refresh_user_stats, request_mentor, subscribe_to_scout, sync_level_on_stats_update, verify_scout

**Ausstehend:** `notify_watchlist_price_change` — braucht async-resolver-Pattern (Client holt playerName). AR-59-Legacy-Pattern bleibt bis Resolver v2.

## Proof

`worklog/proofs/055-i18n-verify.txt`
