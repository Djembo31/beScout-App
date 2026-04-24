<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-04-24 13:02)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 1 Files
```
 M memory/session-handoff.md
```

## Session Commits: 10
- 0a34c054 docs(hygiene): Priority-1-Marathon abschluss — active.md idle
- 96e78375 feat(security): Slice 178d — useSafeIdempotentMutation + Auto-Key Generation (Tier A1, Client)
- 8f7cfa4f feat(security): Slice 178e-e — open_mystery_box_v2 Idempotency-Integration (Tier A1, Money)
- 66daafa5 feat(security): Slice 178e-d — liquidate_player Idempotency-Integration (Tier A1, Money, Admin)
- 0402b60b feat(security): Slice 178e-c — place_buy_order Idempotency-Integration (Tier A1, Money)
- 7be39f14 feat(security): Slice 178e-b — place_sell_order Idempotency-Integration (Tier A1)
- 83cf5f46 feat(security): Slice 178e-a — buy_from_order Idempotency-Integration (Tier A1, Money)
- 30d4d998 feat(security): Slice 178c — subscribe_to_club Idempotency-Konsolidierung (Tier A1, Money)
- 3e6fdef5 feat(security): Slice 178b — dedup-keys Cleanup-Cron (Tier A1)
- 5c74e7c1 chore(hooks): session-handoff merge-statt-overwrite via awk state-machine

<!-- auto:handoff-end -->

---

# Rich Handoff — 2026-04-24 Autonomous-Marathon + 178a Integration

## Status
- **Branch main** — 15 Tier-Slices live (178a ergaenzt), alle Tests gruen, tsc clean, commitlint-konform.
- **active.md idle.** Tier-Plan 174-185 bei 15/15.
- **Live DB (Supabase skzjfhvgccaeplydsunz):** `buy_player_sc` mit 4-arg-Signature + DEFAULT NULL idempotency-key. 3-arg-Version entfernt.

## Slice 178a — buy_player_sc Idempotency-Integration (Tier A1, Money-Critical)

- **Autonomer CEO-Grant:** "gebe vollen zugriff, ueberspringe dangerous questions".
- **Scope XS:** Erste Money-RPC-Integration der Slice-178-Foundation. Pilot-Demonstration fuer 178c-e Pattern-Wiederholung.
- **Baseline:** Slice 034 (`20260417160000_buy_player_sc_transactions_type_fix.sql`). Patch-Audit: keine Zwischen-Patches.
- **Integration-Bloecke:**
  1. Parameter `p_idempotency_key TEXT DEFAULT NULL` (backward-compat).
  2. Early-check via `check_or_reserve_dedup_key` NACH auth-guard + qty-validation, VOR DB-writes.
  3. JSON-variable v_result statt inline-RETURN, damit Completion-UPDATE vor RETURN passieren kann.
  4. UPDATE `request_dedup_keys SET response=v_result::JSONB, status='completed'`.
- **Preserved (12/12):** auth_guard, qty_validation, liquidation_check, club_admin_guard, advisory_lock, trade_rate_limit, circular_guard, pbt_credit, floor_recalc, trans_type_correct, club_fee_treasury, subscription_discount.
- **REVOKE/GRANT renewed (AR-44).** Alte 3-arg-Signatur via DROP FUNCTION entfernt.
- **Files:** Migration (208 L) + trading.ts edit (+5 -2) + Spec + Self-Review + Proof.
- **Proof (`worklog/proofs/178a-replay.txt`):** 9 Abschnitte — Signature, Grants, Foundation-2-call-Sequence, Integration-Regex-Audit, Preserved-Guards-Audit, tsc clean, vitest 130/130 pass.

## Gesamte 2026-04-24 Marathon-Session: 15 Slices live

**Tier A Money:** 178 Idempotency Foundation + 178a buy_player_sc Integration + 179 Transactions Append-Only
**Tier B Architecture:** 177 Zod + parseBody + 177b withLogger Admin + 180 Service-Shape Pilot
**Tier D Observability:** 175/175b/175c Pino + 176/176b/176c/176d Sentry+PII+Boundaries
**Tier D Tooling:** 185 commitlint + lint-staged

## Next-Session Priority-Queue

### Priority 1 — Money-Defense-in-Depth-Loop weiter schliessen (178a Pattern replizieren)
- **178b** Cleanup-Cron (`vercel.json` + route `/api/cron/dedup-cleanup`, `expires_at < NOW()` DELETE)
- **178c** Migration `subscribe_to_club` inline-60s-idempotency → generic pattern (Konsolidierung)
- **178d** Client-side idempotency-key generation in `useSafeMutation` (crypto.randomUUID)
- **178e** Weitere Money-RPCs via 178a-Pattern:
  - `buy_from_order` (P2P buy, Slice 021 RLS-tightened)
  - `place_sell_order` (Slice 019)
  - `place_buy_order` (Slice 020)
  - `liquidate_player` (Slice 108 linear formula)
  - `openMysteryBox` (Slice J5 AR-42)
  - `subscribe_to_club` (fuer 178c migration-target)

### Priority 2 — UI-Foundation (braucht Design-Deliberation)
- **181** Radix UI-Primitives (Dialog, Dropdown, Tabs)
- **182** React Hook Form + Zod-Integration
- **183** Design Tokens (CSS Custom Properties)
- **184** Motion Design (shared animation-library)

### Priority 3 — Open Cleanup
- **180b** Service-Shape votes/adminDeletePost/adminTogglePin
- **185b** Bundle-Budget (size-limit, `next build` Baseline)
- **common-errors.md Split** in errors-db/errors-frontend/errors-infra/errors-scraper

### Priority LOW — Doc-Addendas (Sammel-Commit)
- common-errors.md "Error-Boundary 2-Scopes" Pattern (176d)
- pattern_observability_stack.md "Next.js Boundary-Instrumentation" (176d)
- serializeCause object-path Doku (176b)
- Composite-unique Regex-Edge (176c)
- trigger-cron params null-safe + prettier format (175b)
- common-errors.md "Money-RPC Idempotency-Integration Blueprint" (178a Pattern — siehe 178a-review.md)

## Live-DB-Stand (Supabase project skzjfhvgccaeplydsunz)

- **Table:** `public.request_dedup_keys(user_id, dedup_key, response JSONB, status, created_at, expires_at)` — PK composite, Index on expires_at, RLS select-own.
- **RPC:** `public.check_or_reserve_dedup_key(UUID, TEXT, INT) → (is_new BOOLEAN, existing_response JSONB)` SECURITY DEFINER.
- **RPC (Slice 178a):** `public.buy_player_sc(UUID, UUID, INT, TEXT DEFAULT NULL) → JSON` — 4-arg-Signature, alte 3-arg entfernt.
- **Trigger (Slice 179):** `transactions_append_only_guard` BEFORE UPDATE/DELETE ON transactions → RAISE EXCEPTION (mit GUC-Opt-In-Bypass).
- **Revokes (Slice 179):** UPDATE + DELETE FROM anon, authenticated.

## Notion-Action (post-commit)
- Slice 178 + 179 → „Erledigt" markieren.
- Slice 178a → Kanban-Eintrag als „Erledigt".

## CEO-Scope-Reminder
- Money-RPCs immer CEO-Scope, aber Session-Grant "voller Zugriff" bleibt bis naechste Session-Boundary.
- 178e (weitere Money-RPCs) sollte pro RPC eigenes XS-Slice sein, kein Marathon.
