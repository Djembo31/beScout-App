# Event Ownership & Attribution System — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix event type/scope confusion, show correct badges per event type, implement configurable fee splits per type, enforce club subscription gates server-side, and integrate club membership into event access.

**Architecture:** Multi-phase refactor touching badge UI, fee-split RPCs, admin config, and subscription enforcement. Each phase is independently deployable.

**Tech Stack:** Supabase (PostgreSQL RPCs + migrations), Next.js, TypeScript, Tailwind, next-intl

---

## Context

### The Problem
- `EventScopeBadge` shows `scope` (global/club) instead of `type` (bescout/club/sponsor/special)
- 99/100 events have `scope=global` → ALL show "BeScout Event" badge
- Club events like "Sakaryaspor Fan Cup" wrongly display "BeScout Event"
- Fee split is hardcoded 3.5%/1.5%/1% for all types — no differentiation
- `min_subscription_tier` is UI-only, not enforced in RPC
- No admin UI to configure fee splits per event type

### Business Model (validated by competitor research + business analysis)

**Key Insight:** Event fees are a supplementary revenue stream, not the primary one. Trading fees (6%) on secondary market will be 10-50x larger. Events drive engagement → engagement drives trading → trading generates revenue.

**Competitor Benchmark:**
| Platform | Take Rate |
|----------|-----------|
| Dream11 | 15-25% |
| PrizePicks | 15-20% |
| DraftKings | 8-15% |
| Sorare | ~5% marketplace |
| **BeScout** | **5-10%** |

BeScout's 5-10% is competitive and user-friendly for a new platform.

---

## Design

### 1. Fee Split per Event Type

| Type | Platform | Club/Creator | Prize Pool | Total Take |
|------|----------|-------------|-----------|------------|
| **bescout** | 5% | 0% | 95% | 5% |
| **club** | 5% | 5% Club | 90% | 10% |
| **sponsor** | 5% | 5% Club (Hosting) | 90% | 10% |
| **special** | 5% | 0% | 95% | 5% |
| **creator** | 5% | 5% Creator | 90% | 10% |

- **No PBT** — removed for simplicity
- **Platform always 5%** — simple, predictable
- **Club/Creator gets 5%** when they organize — meaningful incentive
- **Sponsor events**: Club gets 5% hosting fee. Sponsor pays separately (flat B2B fee, off-platform)
- **Ticket events (pilot)**: No fees apply. Tickets are free engagement currency. Fee split is stored but not deducted.

### 2. Configurable Fee Splits via Admin

New DB table `event_fee_config`:
```sql
CREATE TABLE event_fee_config (
  event_type TEXT PRIMARY KEY,  -- 'bescout' | 'club' | 'sponsor' | 'special' | 'creator'
  platform_pct SMALLINT NOT NULL DEFAULT 500,  -- basis points (500 = 5%)
  beneficiary_pct SMALLINT NOT NULL DEFAULT 0, -- club/creator cut in bps
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- Seed defaults
INSERT INTO event_fee_config VALUES
  ('bescout', 500, 0, now(), NULL),
  ('club', 500, 500, now(), NULL),
  ('sponsor', 500, 500, now(), NULL),
  ('special', 500, 0, now(), NULL),
  ('creator', 500, 500, now(), NULL);
```

**Admin UI** (BeScout Admin → new "Fee Config" section):
- Table showing all 5 types with editable Platform % and Beneficiary %
- Prize Pool % auto-calculated (100% - platform - beneficiary)
- Audit trail via `updated_at` + `updated_by`

### 3. Badge Refactor: EventTypeBadge

Replace `EventScopeBadge` (scope-based) with `EventTypeBadge` (type-based):

| Type | Badge Text | Color | Icon | Club Branding |
|------|-----------|-------|------|--------------|
| bescout | "BeScout" | Gold | BeScout icon | — |
| club | Club name (e.g. "Sakaryaspor") | Emerald | Club logo | Yes |
| sponsor | Sponsor name (e.g. "Nike") | Sky | Gift icon | Sponsor logo if available |
| special | "Special Event" | Purple | Star | — |
| creator | Creator name | Orange | UserPlus | — |

**Fallbacks:**
- Club event without club_id → "Club Event" (generic)
- Sponsor event without sponsor_name → "Sponsor Event" (generic)
- Creator event without creator_name → "Community Event"

**Scope badge is REMOVED** from event cards. Scope (global/club) remains in DB for access control but is no longer displayed as a badge.

### 4. Server-Side Subscription Gate

Currently `min_subscription_tier` is UI-only. Must be enforced in `rpc_lock_event_entry`:

```sql
-- Inside rpc_lock_event_entry, after capacity guard:
IF v_event.min_subscription_tier IS NOT NULL THEN
  SELECT tier INTO v_user_tier
  FROM club_subscriptions
  WHERE user_id = p_user_id
    AND club_id = v_event.club_id
    AND status = 'active'
    AND expires_at > now();

  IF v_user_tier IS NULL OR
     tier_rank(v_user_tier) < tier_rank(v_event.min_subscription_tier) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'subscription_required',
      'need', v_event.min_subscription_tier);
  END IF;
END IF;
```

`tier_rank()` helper: bronze=1, silber=2, gold=3.

### 5. RPC Fee Split Update

`rpc_lock_event_entry` currently hardcodes fees. Refactor to read from `event_fee_config`:

```sql
-- Replace hardcoded fee calculation with:
SELECT platform_pct, beneficiary_pct
INTO v_platform_pct, v_beneficiary_pct
FROM event_fee_config
WHERE event_type = v_event.type;

v_platform_fee := (v_amount * v_platform_pct) / 10000;
v_beneficiary_fee := (v_amount * v_beneficiary_pct) / 10000;
v_prize_amount := v_amount - v_platform_fee - v_beneficiary_fee;
```

Fee split stored in `event_entries.fee_split` JSONB changes from `{platform, pbt, club}` to `{platform, beneficiary, prize_pool}`.

### 6. DB Event Data Fix

All 100 current events need type review:
- Events with `club_id` set + `type='bescout'` → check if they should be `type='club'`
- Scope remains as-is (functional for access control)
- Club logo/name now comes from FK join (already implemented in API route)

### 7. Files Affected (from Impact Analysis)

**HIGH risk (money/business logic):**
- `supabase/migrations/` — New migration for fee config + RPC update
- `src/lib/services/events.ts` — `isClubEvent()` logic
- `src/lib/services/lineups.ts` — Club-scope lineup enforcement
- `src/components/ui/EventScopeBadge.tsx` → rename to EventTypeBadge

**MEDIUM risk (UI/display):**
- `src/components/fantasy/events/EventCardView.tsx` — Badge swap
- `src/components/fantasy/EventDetailModal.tsx` — Badge swap + scope logic
- `src/app/(app)/bescout-admin/` — Fee config admin UI
- `src/app/api/events/route.ts` — Already has club join

**LOW risk (cosmetic/tests):**
- `messages/de.json`, `messages/tr.json` — Badge labels
- 8 test files — Update mocks and assertions

---

## Phases

### Phase 1: Badge Fix (Tier 2, ~30min)
- Refactor EventScopeBadge → EventTypeBadge
- Show correct type with club/sponsor branding
- Update 3 consumers (EventCardView, EventDetailModal, tests)
- Zero DB changes, zero risk

### Phase 2: Fee Config Table + Admin UI (Tier 3, ~1h)
- New migration: `event_fee_config` table with seed data
- BeScout Admin: Fee Config section (read/write)
- No RPC changes yet — just the config infrastructure

### Phase 3: RPC Fee Split + Subscription Gate (Tier 3, ~1.5h)
- Update `rpc_lock_event_entry` to read from `event_fee_config`
- Add `min_subscription_tier` enforcement in RPC
- Update `rpc_unlock_event_entry` and `rpc_cancel_event_entries`
- Update `event_entries.fee_split` JSONB structure
- Add `tier_rank()` SQL helper function

### Phase 4: Data Cleanup + Verification (Tier 2, ~30min)
- Review all 100 events: correct type assignments
- Verify badge displays correctly for each type
- E2E test: join event → check fee split → check subscription gate

---

## Out of Scope (tracked in memory/project_missing_revenue_streams.md)
1. Sponsor Flat Fee (B2B, off-platform)
2. Event Boost / Featured Placement
3. Chip/Power-Up Economy
4. B2B Event-as-a-Service Overage
5. Event Analytics & Data Licensing
6. Event Replay/Post-Game Insights
7. Guaranteed Prize Pool Subsidies
8. Creator event UI flow (deferred until 5K+ users)
