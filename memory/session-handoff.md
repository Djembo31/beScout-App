# Session Handoff — 2026-04-23 Session-End

## Was war in dieser Session

**5 Themen, 13 Commits, 1 Money-Bug verhindert.**

### Club-Page Polish (Slices 149, 149b, 149c, 149d)
- `/club/galatasaray` Deep-Dive: Labels, Mobile-Overflow, Tabellenplatz-Integration
- PlayerPhoto imageUrl-prop fix (3 Components hatten Initials statt Photos)
- sync-standings + sync-fixtures-future + sync-transfers Cron-Gap-Close

### Phase 1 Mutation-Hardening (Slices 150, 151a-d, 151c.2) — **NEW & COMPLETE**
- **150 Audit:** 63 Files identifiziert, 5-Phasen-Plan
- **151a Primitive:** `useSafeMutation` Hook (src/lib/hooks/useSafeMutation.ts) — 11 Tests
- **151b Pilot 1:** useClubActions (Follow) — 9 Tests, Slice 143 pattern regression fixed
- **151c Pilot 2:** MembershipSection (Subscribe) — 5 Tests
- **151c.2 Server-Hardening:** subscribe_to_club RPC Idempotency-Window (60s) live
- **151d Infrastructure:** Pattern D18 + Audit-Script + ESLint-Rule

### Strategic Decisions (memory/decisions.md)
- **D17:** useSafeMutation als Standard-Primitive für alle Mutations
- **D18:** Money-RPC Idempotency-Window als Pflicht-Pattern
- **D19:** Cron-Route-Registry (jede route.ts MUSS in vercel.json)

## Uncommitted Changes
```
M .claude/settings.local.json (local ignore)
```

## Recent Commits (letzte 5)
```
d8dbe5d8 docs(session): log Phase 1 Mutation-Hardening complete
016bcb74 feat(rules): Slice 151d — Pattern D18 + Audit-Script + ESLint-Rule
a76ddc62 feat(club): Slice 151c+151c.2 — MembershipSection Money-Path
789c0816 feat(club): Slice 151b — useClubActions Migration
a840beb8 feat(hooks): Slice 151a — useSafeMutation Primitive
```

---

## Start HERE Next Session — Phase 2 Money-Tier

**Status:** Phase 1 Mutation-Hardening COMPLETE. Phase 2 bereit zum Start. Anil hat "vollkommen dir" delegiert — Claude darf autonom durchziehen.

### Next Slice: 152 — AdminFoundingPassesTab Migration

**Warum dieser File zuerst?**
- Tier-1 Money (Slice 150 Audit) — Founding-Pass = €-Kill-Switch-Money
- Nur 1 File, isolated (keine cross-cutting refactor)
- Kick-Start Phase 2 mit kleiner Migration

**Preflight Commands:**
```bash
# 1. Audit-Script zeigt Progress
npm run audit:mutation-race

# 2. File lesen
# src/app/(app)/bescout-admin/AdminFoundingPassesTab.tsx
# + RPC-Identifikation (welcher RPC wird aufgerufen?)

# 3. RPC-Audit VOR Client-Migration (D18 pattern!)
# mcp__supabase__execute_sql: SELECT pg_get_functiondef('<rpc_name>'::regproc);
# Prüfe: Idempotency-Check vor Wallet-Deduct?
#   - Wenn JA: Client-Migration sicher, direkt weitergehen.
#   - Wenn NEIN: Erst RPC-Hardening als Slice 152.2 (wie 151c.2), dann Client.
```

**Pattern from 151c (als Template):**
1. `import { useSafeMutation } from '@/lib/hooks/useSafeMutation'`
2. Replace `useState(loading)` + `handleX` mit `const mut = useSafeMutation<TData, Error, TVars>({ mutationFn, onSuccess, errorToast, errorTag })`
3. Button: `onClick={() => mut.safeTrigger(vars)}`, `disabled={mut.isPending}`, `loading={mut.isPending}`
4. Tests: QueryClientProvider wrapper, rapid-click-guard test
5. Reviewer-Agent dispatchen (PFLICHT, Money-Path Tier 1)
6. Inline-Fix Reviewer-Findings vor Commit
7. Commit `feat(admin): Slice 152 — AdminFoundingPassesTab Migration`

### Phase 2 Queue (Tier-1 Money-Path)

| Slice | File | Action | RPC-Audit nötig? |
|-------|------|--------|------------------|
| 152 | AdminFoundingPassesTab.tsx | Founding-Pass CRUD | JA (`mint_founding_pass` o.ä.) |
| 153 | AdminWithdrawalTab.tsx | Club-Withdrawal | JA (`request_club_withdrawal`) |
| 154 | OffersTab + useOffersState | Accept/Reject Offer | JA (`accept_offer` / `cancel_offer`) |
| 155 | BuyModal / usePlayerTrading | Scout-Card Buy (Market + IPO) | JA (`buy_player_dpc` — Slice 108 hardened?) |
| 156 | KaderSellModal.tsx | Sell Scout Card | JA (`sell_player_dpc`) |

### Backlog aus Phase 1 (nicht Blocker)

- Slice 151c-Backlog MEDIUM #3: Wallet-Balance via setQueryData(new_balance) statt invalidate — 7+ Stellen project-weit
- Slice 151b-Backlog MEDIUM #2+#3: Snapshot-rollback isolated test + useCallback-deps-stability
- Slice 151c-Backlog MEDIUM #4: ActivityLog in RPC-Body statt Service-Layer (für atomic audit-trail)

### Test-Account Credentials (Reminder für Playwright)

- **bescout.net**
- Email: `jarvis-qa@bescout.net`
- Password: `JarvisQA2026!`
- Siehe: `e2e/mystery-box-qa.spec.ts:5`

## Beta-Launch Status (CEO-Anil)

- **Infrastructure:** CI, smoke/synthetic-tests, CSP/Sentry, secrets rotated — all green
- **Money-Safety:** subscribe_to_club idempotent (Slice 151c.2) ✅
- **Next Money-Audit:** Slice 152+ will audit remaining RPCs pre-migration
- **Anil-Action-Items:** 3 Tester (min 1 TR-sprachig, 1 ohne Football-Kontext)
- **Testplan:** `memory/beta-testplan.md` (8 Tasks pro Zoom-Call)

## Session-Metrics (diese Session)

| Metric | Value |
|--------|-------|
| Slices | 9 (149/b/c/d + 150 + 151a/b/c/c.2/d) |
| Commits | 13 |
| Tests added | 30 (11+9+5+4+1) |
| Migration live | 1 (subscribe_to_club idempotency) |
| Code changes | ~1.400 LOC (±) |
| Reviewer-Dispatches | 3 (all found real bugs, all inline-fixed) |
| Money-Bugs Prevented | 1 (doppelte Wallet-Abbuchung bei Network-Retry) |

Session-Ende: 2026-04-23 ~19:48 UTC
