# Phase 4: Economy Balance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix ticket inflation (HIGH), bCredits accumulation (MEDIUM), and add missing spending sinks to create a sustainable closed economy.

**Architecture:** All guards are DB-level (triggers + RPCs). Cosmetic shop table + purchase RPC provide new ticket sink. No client-side UI changes needed — errors map to existing i18n system.

**Tech Stack:** PostgreSQL RPCs (ALTER existing), Supabase migrations, i18n error messages

---

## Context

### Economy Analysis (Pre-Phase 4)

| Currency | Sources | Sinks | Risk |
|----------|---------|-------|------|
| bCredits | Welcome, Missions (daily/weekly), Referral, Achievements, Fantasy, Research sales, Bounties, Mentorship, Score Road | Trading fees (6%), IPO, Entry fees, Votes, Research purchases, Bounties | MEDIUM inflation |
| Tickets | Daily login (5-40), Missions, Challenges, Streaks, Achievements, Content creation | Mystery boxes (15 tickets only) | HIGH inflation |

### Key Issues
- No diminishing returns on repeatable rewards (missions farm infinitely)
- Research posts unlimited (no author cap)
- Mystery box cost fixed at 15 (doesn't scale with usage)
- No cosmetic shop (cosmetics only earned, never bought)
- Referral reward doesn't decay (500 bCredits per referral forever)

---

### Task 1: Mission Reward Diminishing Returns

**DB Migration:** Modify `assign_user_missions` to apply monthly decay.

Decay based on claimed missions this calendar month:
- 0-14 claims: 100% reward
- 15-29 claims: 80% reward
- 30-59 claims: 60% reward
- 60+ claims: 50% reward (floor)

Minimum rewards: 1000 cents (daily), 5000 cents (weekly)

**Impact:** Prevents infinite mission farming. Casual players (< 15 claims/month) unaffected. Heavy farmers hit 50% floor after ~2 months of daily maxing.

---

### Task 2: Research Weekly Cap

**DB Migration:** BEFORE INSERT trigger on `research_posts`.

- Max 3 research posts per author per 7-day rolling window
- Server-side enforcement (trigger), cannot be bypassed
- Error: `research_weekly_cap` mapped to i18n

**Impact:** Prevents content spam. 3/week is generous for quality research. Authors can still publish 12+/month.

---

### Task 3: Mystery Box Progressive Cost

**DB Migration:** Modify `open_mystery_box` to scale ticket cost based on 24h usage.

- 1-3 openings/24h: 15 tickets (base)
- 4-6: 20 tickets
- 7-10: 25 tickets
- 11+: 30 tickets (cap)

Resets daily. Free openings don't count toward threshold.

**Impact:** Casual users always pay base price. Heavy users pay 2x base. Makes mystery boxes a better ticket sink without punishing normal usage.

---

### Task 4: Cosmetic Shop + Referral Decay

**Task 4a — Cosmetic Shop Infrastructure:**
- New table: `cosmetic_shop_listings` (cosmetic_id, price_tickets, stock_limit, availability window)
- New RPC: `purchase_cosmetic_listing` (ticket deduction + cosmetic grant)
- Updated CHECK constraint: `user_cosmetics.source` now includes `'shop'`
- RLS: read-only for authenticated, write via service role only

**Task 4b — Referral Reward Decay:**
Modified `reward_referral` with count-based decay for referrer:
- 1-5 referrals: 500 bCredits (full)
- 6-10: 350 bCredits
- 11-20: 200 bCredits
- 21+: 100 bCredits (floor)

Referee always gets 250 bCredits (unchanged).

**Impact:** Shop creates major new ticket sink (UI to be built separately). Referral decay prevents farming rings while still rewarding early growth.

---

## Client Changes

### Error Mapping (`src/lib/errorMessages.ts`)
- Added keys: `researchWeeklyCap`, `cosmeticAlreadyOwned`, `cosmeticOutOfStock`
- Added regex patterns for matching

### i18n (`messages/de.json`, `messages/tr.json`)
- DE: "Max 3 Research-Posts pro Woche erlaubt..."
- TR: "Haftada maksimum 3 arastirma yazisi..."

---

## Impact Summary

| Guard | Blocks | False Positive Risk |
|-------|--------|---------------------|
| Mission decay (monthly) | Infinite mission farming | None — casual users (< 15/month) unaffected |
| Research cap (3/week) | Content spam | Very low — quality authors rarely post >3/week |
| Mystery box scaling (24h) | Ticket-neutral box farming | None — first 3 always base price |
| Cosmetic shop (new sink) | Ticket inflation | N/A — new spending option |
| Referral decay (count) | Referral farming rings | Low — first 5 referrals get full reward |
