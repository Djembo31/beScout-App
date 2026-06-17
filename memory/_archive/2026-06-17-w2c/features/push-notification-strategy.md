# Push Notification Strategy

## Status: Done (Audit + Quick Fixes Applied)
## Gestartet: 2026-03-14

---

## Audit Summary

### Architecture
- **Web Push** via `web-push` npm package (VAPID keys)
- **Service Worker** (`public/sw.js`) handles `push` + `notificationclick` events
- **Push Subscriptions** stored in `push_subscriptions` table (user_id, endpoint, p256dh, auth)
- **Notification Preferences**: 6 toggleable categories (trading, offers, fantasy, social, bounties, rewards) + system (always on)
- **35 notification types** mapped to 7 categories
- **Batch support**: `createNotificationsBatch()` for multi-user notifications (e.g., event scoring)

### Critical Bug Fixed: Push Never Fired (Client-Side Dead Code)
**Before:** `createNotification()` and `createNotificationsBatch()` had `typeof window === 'undefined'` guard
that only sent push on server-side. But ALL callers run client-side (services use `supabase` from `supabaseClient`).
This meant push notifications were NEVER sent for any event.

**Fix:** Created `/api/push` route that accepts push payload and calls `sendPushToUser` server-side.
Added `firePush()` helper that routes to API on client, direct import on server.

### Missing Notifications Added
| Type | Service | Before | After |
|------|---------|--------|-------|
| `tip_received` | tips.ts | No notification | Notifies receiver with amount |
| `mission_reward` | missions.ts | No notification | Notifies user with reward amount |
| `creator_fund_payout` | creatorFund.ts | No notification | TODO (needs RPC notification hook) |
| `ad_revenue_payout` | adRevenueShare.ts | No notification | TODO (needs RPC notification hook) |
| `subscription_new` | (DB trigger) | No notification | TODO (club sub event) |
| `tier_promotion` | (DB trigger) | No notification | TODO (elo rank change) |
| `level_up` | (DB trigger) | No notification | TODO (gamification triggers) |
| `rang_up` / `rang_down` | (DB trigger) | No notification | TODO (DB-trigger based) |
| `mastery_level_up` | (DB trigger) | No notification | TODO (DB-trigger based) |
| `referral_reward` | referral.ts | Handled in RPC | OK (RPC sends internally) |

---

## Complete Notification Map

### Trading & Market (category: `trading`)
| Type | Trigger | Push | Deep Link | Timing |
|------|---------|------|-----------|--------|
| `trade` | DPC sold (seller) | Yes | `/player/{id}` | Immediate |
| `price_alert` | Watchlist threshold | Yes | `/player/{id}` | Immediate |
| `new_ipo_available` | IPO goes `open` | Yes | `/player/{id}` | Immediate |
| `dpc_of_week` | Weekly DPC pick | Yes | `/player/{id}` | Immediate |
| `pbt_liquidation` | Player liquidated | Yes | `/player/{id}` | Immediate |

### Offers (category: `offers`)
| Type | Trigger | Push | Deep Link | Timing |
|------|---------|------|-----------|--------|
| `offer_received` | Direct offer sent | Yes | `/market?tab=angebote` | Immediate |
| `offer_accepted` | Offer accepted | Yes | `/market?tab=angebote` | Immediate |
| `offer_rejected` | Offer rejected | Yes | `/market?tab=angebote` | Immediate |
| `offer_countered` | Counter-offer | Yes | `/market?tab=angebote` | Immediate |

### Fantasy & Spieltag (category: `fantasy`)
| Type | Trigger | Push | Deep Link | Timing |
|------|---------|------|-----------|--------|
| `event_closing_soon` | New event created | Yes | `/fantasy` | Immediate |
| `event_starting` | Event status -> running | Yes | `/fantasy` | Immediate |
| `event_scored` | Event scored | Yes | `/fantasy` | Immediate (batch) |
| `fantasy_reward` | Top 3 placement | Yes | `/fantasy` | Immediate (batch) |
| `prediction_resolved` | 3+ predictions resolved | Yes | `/fantasy` | Immediate |

### Social & Community (category: `social`)
| Type | Trigger | Push | Deep Link | Timing |
|------|---------|------|-----------|--------|
| `follow` | New follower | Yes | `/profile/{id}` | Immediate |
| `reply` | Reply to post | Yes | `/community` | Immediate |
| `poll_vote` | Vote on poll | Yes | `/community?tab=aktionen` | Immediate |
| `research_unlock` | Research unlocked | Yes | `/community?tab=research` | Immediate |
| `research_rating` | Research rated | Yes | `/community?tab=research` | Immediate |

### Bounties (category: `bounties`)
| Type | Trigger | Push | Deep Link | Timing |
|------|---------|------|-----------|--------|
| `bounty_submission` | Submission received | Yes | `/community?tab=aktionen` | Immediate |
| `bounty_approved` | Submission approved | Yes | `/community?tab=aktionen` | Immediate |
| `bounty_rejected` | Submission rejected | Yes | `/community?tab=aktionen` | Immediate |
| `bounty_expiring` | Bounty near expiry | Yes | `/community?tab=aktionen` | TODO |

### Rewards & Progress (category: `rewards`)
| Type | Trigger | Push | Deep Link | Timing |
|------|---------|------|-----------|--------|
| `achievement` | Achievement unlocked | Yes | `/profile` | Immediate |
| `mission_reward` | Mission claimed | Yes | `/missions` | Immediate |
| `tip_received` | Tip received | Yes | content deep link | Immediate |
| `referral_reward` | Referral reward | Yes | (handled in RPC) | Immediate |
| `level_up` | Level up | TODO | `/profile` | Immediate |
| `rang_up` / `rang_down` | Rank change | TODO | `/profile` | Immediate |
| `mastery_level_up` | Mastery level up | TODO | `/profile` | Immediate |
| `subscription_new` | New club subscription | TODO | `/club/{slug}` | Immediate |
| `creator_fund_payout` | Creator fund payout | TODO | `/profile` | Immediate |
| `ad_revenue_payout` | Ad revenue payout | TODO | `/profile` | Immediate |
| `tier_promotion` | Tier promotion | TODO | `/profile` | Immediate |

---

## Spam Risk Analysis

### Current State: NO Rate Limiting
There is NO rate limiting, deduplication, or batching at any level:
- `createNotification()` has no per-user throttle
- `sendPushToUser()` has no cooldown
- No deduplication of identical notifications

### Identified Spam Vectors
1. **Poll votes**: Every single vote notifies the poll creator. A popular poll = flood.
   - **Risk: HIGH** (10+ votes/minute possible)
   - **Recommendation**: Batch poll votes into digest ("5 neue Stimmen bei deiner Umfrage")

2. **IPO notifications**: When IPO opens, ALL club followers get notified individually.
   - **Risk: MEDIUM** (one-time burst, but scales with follower count)
   - **Recommendation**: Already uses batch pattern; acceptable.

3. **Event scoring**: All participants get notified (batch insert). Top 3 get TWO notifications.
   - **Risk: LOW** (one-time per event, already batched)
   - **Recommendation**: Merge event_scored + fantasy_reward into one notification for top 3.

4. **Research ratings**: Every rating notifies the author.
   - **Risk: MEDIUM** (popular research = many ratings)
   - **Recommendation**: Batch into digest ("3 neue Bewertungen")

5. **Follow notifications**: No dedup if someone follows/unfollows repeatedly.
   - **Risk: LOW** (DB unique constraint prevents re-follow without unfollow)

### Recommended Rate Limits (Future Implementation)
| Category | Limit | Window | Strategy |
|----------|-------|--------|----------|
| poll_vote | 1 push | 15 min | Batch ("X neue Stimmen") |
| research_rating | 1 push | 30 min | Batch ("X neue Bewertungen") |
| follow | 5 push | 1 hour | Drop excess |
| trade | 10 push | 1 hour | Drop excess |
| Per-user global | 20 push | 1 hour | Queue, delay excess |

---

## Files Changed (This Session)
- `src/lib/services/notifications.ts` — Fixed push delivery (client+server), added deep links
- `src/app/api/push/route.ts` — NEW: API route for client-side push proxy
- `src/lib/services/tips.ts` — Added `tip_received` notification
- `src/lib/services/missions.ts` — Added `mission_reward` notification
- `messages/de.json` — Added tipReceivedTitle/Body, missionRewardTitle/Body
- `messages/tr.json` — Added Turkish translations for same

## Remaining TODOs (Backlog)
1. Add notifications for: `level_up`, `rang_up/down`, `mastery_level_up`, `subscription_new`, `creator_fund_payout`, `ad_revenue_payout`, `tier_promotion`, `bounty_expiring`
2. Implement rate limiting / batching for poll_vote and research_rating
3. Merge `event_scored` + `fantasy_reward` notifications for top-3 players
4. Add push notification opt-in prompt during onboarding flow
5. Consider daily digest for low-priority notifications
6. Add push analytics (delivery rate, click-through rate)
