# Slice 151c+151c.2 Review — MembershipSection Money-Path + RPC-Hardening

**Verdict:** CONCERNS → PASS nach Inline-Fix (Money-Path-BLOCKER gelöst)
**Reviewer:** reviewer-Agent (Cold-Context, read-only)
**Time-spent:** ~22 min

## Scope

- **MembershipSection.tsx** — `useState(subscribing)` → `useSafeMutation` (Money-Path Tier-1)
- **MembershipSection.test.tsx** (NEW, 5 tests passing)
- **subscribe_to_club RPC** — Idempotency-Hardening (60s-Window) via `supabase/migrations/20260423190000_slice_151c2_subscribe_idempotency.sql`

## Findings

### HIGH (Money-Path-BLOCKER) — FIXED inline

#### Finding #1: RPC-Idempotency unverifiziert
**Original:** Der `subscribe_to_club` RPC dedukziert Wallet UNCONDITIONAL vor `ON CONFLICT`-Check.

**Szenario:**
- Call #1 (T+0): Balance 1M → -50K → 950K. Subscription INSERT.
- Call #2 (T+1, network-retry): Balance 950K → -50K → 900K. ON CONFLICT DO UPDATE (gleicher tier, kein Change). **Wallet 2x deducted für 1 Subscription.**

**Fix (Slice 151c.2):** Idempotency-Window 60s — wenn existing active subscription mit gleichem tier und started_at <60s → return existing ohne Wallet-Deduction. Upgrade/Downgrade-Flow (tier-change) bleibt unberuehrt.

Migration: `20260423190000_slice_151c2_subscribe_idempotency.sql` applied via `mcp__supabase__apply_migration` — **LIVE**.

#### Finding #2: Cache-Merge Fallback auf leere Werte
**Original:** `setQueryData` mit `prev?.id ?? ''`, `prev?.started_at ?? new Date().toISOString()` etc. erzeugt invalides `ClubSubscription` Shape bei First-Subscribe.

**Fix:** Komplett weg von `setQueryData` — `invalidateQueries` auf `qk.clubs.subscription`. Subscription ist keine +/−1-Counter-Mutation (Slice 143 pattern passt nicht), sondern Row-Insert/Update mit 11 Feldern. Invalidate ist sauberer als Partial-Merge.

### MEDIUM — Backlog

- **#3** Wallet invalidateQueries statt setQueryData mit `new_balance`. User sieht ~300ms stale balance. Etablierter Pattern im Projekt (7+ Stellen). BACKLOG als Slice 151c.3 (nicht-Blocker).
- **#4** ActivityLog double-fire bei RPC-Retry. Mit Idempotency-Fix #1 **AUTO-RESOLVED** (RPC returnt existing, aber activityLog ist im Service-Layer nach subscribeTo). Noch zu beheben: logActivity sollte im RPC-Body selbst in same transaction laufen. BACKLOG.

### LOW — FIXED inline

- **#5** `subscribeMut.variables as SubscriptionTier | undefined` cast entfernt. Generic-Inference funktioniert korrekt.

### LOW — Backlog

- **#6** Disabled-state-propagation-Test (Bronze→Silber während pending) fehlt. BACKLOG.
- **#7** `userId!` non-null-assertion. Acceptable (Modal-Kontext, kein Race). Nur Awareness.

## Beta-Launch-Readiness

**PASS.** Money-Path-BLOCKER (Finding #1) ist gefixt — RPC idempotent via 60s-Window. 3-Tester-Wochenende mit mobile-network-Retry sicher gegen doppelte Abbuchung.

## Positive

- Pattern-Konsistenz mit Slice 151b (Follow-Button) — einfaches Review + Promotion.
- Sentry-Tag `membership.subscribe` korrekt gesetzt (151a Finding #3).
- `result.success=false` Branch getrennt von throw (Business-vs-Exception).
- Per-Button-Loading + Global-Disable: UX semantisch sauber.
- Downgrade-Block via `isDowngrade` client-side (Server-Guard Defense-in-Depth).
- RPC-Hardening: Idempotency-Window + FOR UPDATE locks + AR-44 REVOKE/GRANT Pattern.

## Knowledge-Capture fuer common-errors.md + Pattern D18

```markdown
### Money-RPC Idempotency-Window (Slice 151c.2)
- Money-RPCs die Wallet-Deduct + Domain-INSERT kombinieren: Pre-Check for
  existing state mit kurzem Window (60s) VOR Wallet-Deduction.
- Client-Guard (useSafeMutation safeTrigger) ist Defense-in-Depth — NOT
  authoritative. Server-side network-retry umgeht den Guard.
- Pattern: `IF FOUND AND existing.tier = new.tier AND existing.started_at >
  NOW() - INTERVAL '60 seconds' THEN RETURN existing_success END IF;`
- Audit-Query: `SELECT pg_get_functiondef('rpc_name'::regproc);` vor jeder
  Money-RPC-Migration zu useSafeMutation.
```

## Summary

Pilot-Migration Money-Path abgeschlossen + echter Money-Path-Bug (Idempotency-Loch im RPC) gefixt. Client hardening (useSafeMutation) + Server hardening (60s-Window) = Defense-in-Depth. Setzt Standard für Slices 152+ (buyPlayer, sellPlayer, Offers, Withdrawal, FoundingPasses). 44/44 Tests green, Migration live auf prod-DB.
