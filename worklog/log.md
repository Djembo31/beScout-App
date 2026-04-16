# Ship Log

Chronologische Liste aller abgeschlossenen Slices. Neueste oben.

Jeder Eintrag beginnt mit `H2-Header` `NNN | YYYY-MM-DD | Titel`, gefolgt von:
- Stage-Chain (SPEC → IMPACT → BUILD → PROVE → LOG)
- Files (git diff --stat summary)
- Proof (Pfad zu worklog/proofs/NNN-xxx.png|txt)
- Commit (hash)
- Notes (optional, 1-2 Saetze)

---

## 007 | 2026-04-17 | RPC Response Shape Audit (A-07)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417020000_audit_helper_rpc_jsonb_keys.sql` (new, Helper-RPC `get_rpc_jsonb_keys(text)`)
  - `src/lib/__tests__/db-invariants.test.ts` (+225 Zeilen, INV-23 + 68-RPC Whitelist)
  - `src/lib/services/mysteryBox.ts` (`cosmeticName` entfernt — dead field, RPC emits only `cosmeticKey`)
  - `src/types/index.ts` (`cosmetic_name?` aus `MysteryBoxResult` entfernt)
  - `src/app/(app)/hooks/useHomeData.ts` (pass-through `cosmetic_name` entfernt)
  - `src/components/gamification/MysteryBoxModal.tsx` (Fallback-Chain bereinigt)
  - `src/components/inventory/MysteryBoxHistorySection.tsx` (Fallback-Chain bereinigt)
  - `src/lib/services/__tests__/smallServices.test.ts` (Mock-Fixture angepasst)
- Proofs: `worklog/proofs/007-rpc-shape-audit.txt` (116 RPCs tabelliert), `worklog/proofs/007-inv23.txt` (vitest green)
- Commit: (pending)
- Notes: A-07 schließt Blocker-A komplett. Audit-Helper parsed plpgsql-Body mit echtem Paren/String/Comment-Tokenizer (kein Regex) und extrahiert Top-Level `jsonb_build_object`/`json_build_object` Keys. INV-23 lockt 68 Service-konsumierte RPCs (alle Money-Pfade inkl. Trading/IPO/Offers/Liquidation/Mystery) gegen Service-Cast-Drift (AR-42-Klasse: camelCase RPC vs snake_case Cast → silent `undefined`). 1 echte Drift gefunden und behoben: `cosmeticName` in mysteryBox.ts war seit RPC-Deploy tot (RPC emits nur `cosmeticKey`), Consumer-Fallback-Chain hat es kompensiert → User-visible Behavior UNVERAENDERT. 2 RPCs (admin_delete_post, update_community_guidelines) in RPC_SHAPE_EXCLUDED dokumentiert wegen string-literal-cast Returns. Pre-existing INV-07/INV-08 failures (Holdings/Wallet Data-Drift) nicht Scope 007 — separater Data-Cleanup.

---

## 006 | 2026-04-17 | ALL_CREDIT_TX_TYPES ⊇ DB alignment (A-05 Follow-up)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files: `src/lib/transactionTypes.ts` (+10 canonical DB types), `src/lib/__tests__/db-invariants.test.ts` (+INV-22)
- Proof: `worklog/proofs/006-inv22.txt` — 28 DB types, all in TS
- Commit: (pending)
- Notes: TS Union war subset drift vs DB (fehlten: admin_adjustment, order_cancel, offer_execute, liga_reward, mystery_box_reward, tip_send, subscription, founding_pass, referral_reward, withdrawal). Pragmatischer Fix: ADD (keep TS-extras fuer activityHelpers compat), KEINE removals. INV-22 guard'd. activityHelpers-Labels+Icons fuer neue DB-types: separater CEO-Slice (TR-i18n).

---

## 005 | 2026-04-17 | Auth-Guard Hardening (A-02)
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260417000000_auth_guard_hardening.sql` (4 RPCs hardened)
  - `supabase/migrations/20260417010000_audit_helper_auth_guard.sql` (INV-21 helper)
  - `src/lib/__tests__/db-invariants.test.ts` (+55 Zeilen, INV-21)
- Proofs: `worklog/proofs/005-{before,after}-grants.txt`, `005-inv21.txt`
- Commit: (pending)
- Notes: 4 SECURITY DEFINER RPCs hatten authenticated+p_user_id+kein auth.uid() (A-02 exploit class, P3-22 in phase3-db-audit). Fix: REVOKE authenticated + defense-in-depth body guard (`IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE`). Cron (service_role) bleibt funktional. Client nutzt Wrapper (lock_event_entry, refresh_my_airdrop_score) unveraendert. INV-21 meta-test: 193 SECURITY DEFINER geprueft, 0 violations. CEO-approved 2026-04-17.
- Severity: [HIGH] rpc_lock_event_entry + renew_club_subscription (fremdes Wallet/Tickets deduct), [MED] check_analyst_decay (Score-Penalty auf fremde User), [LOW] refresh_airdrop_score (recompute).

---

## 004 | 2026-04-16 | RLS Policy Coverage Audit (A-03)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260416250000_audit_helper_rls_coverage.sql` (new, Helper-RPC `get_rls_policy_coverage()`)
  - `src/lib/__tests__/db-invariants.test.ts` (+80 Zeilen, INV-19 + INV-20)
- Proof: `worklog/proofs/004-rls-coverage.txt`
  - INV-19: 120 RLS-tables, 4 whitelisted zero-policy, 0 violations
  - INV-20: 14 critical money/trading tables, 0 coverage drifts
- Commit: (pending)
- Notes: Zwei Guards gegen die "RLS enabled + 0 policies" Silent-Fail-Klasse (common-errors Session 255). Whitelist = 4 server-only-Tabellen (`_rpc_body_snapshots`, `club_external_ids`, `player_external_ids`, `mystery_box_config`). Folge-Investigation: `footballData.ts` nutzt regularen Client auf `club_external_ids` + `player_external_ids` → wahrscheinlich nur von API-Routes gecalled (service-role). Visual-QA waere noetig um zu bestaetigen dass KEIN Browser-Path sie direkt liest.

---

## 003 | 2026-04-16 | CHECK Constraint → TS Alignment (A-05)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files:
  - `supabase/migrations/20260416240000_audit_helper_check_enum_values.sql` (new, Audit-Helper-RPC)
  - `src/lib/__tests__/db-invariants.test.ts` (+145 Zeilen, INV-18)
- Proof: `worklog/proofs/003-check-alignment.txt` — 14 Constraints checked, 0 drifts
- Commit: (pending)
- Notes: INV-18 lockt 14 Money/Identity-CHECK-Enums als Snapshot (transactions.type, orders.*, offers.*, events.*, players.position, user_stats.tier, research_posts.*, lineups.captain_slot, club_subscriptions.tier, user_founding_passes.tier). Jede Schema-Aenderung an einer dieser triggert Fail → Reminder TS/UI syncen. Audit-Helper-RPC `get_check_enum_values(text)` als public SECURITY INVOKER, REVOKE anon/GRANT auth nach AR-44-Template.
- Follow-up-Backlog (aus Recherche, nicht in diesem Slice gefixt): `src/lib/transactionTypes.ts` hat Drift zu DB (`buy`/`sell` statt `trade_buy`/`trade_sell`, `poll_earning` statt `poll_earn`, `scout_subscription_earning` statt `subscription`, fehlt `admin_adjustment`/`order_cancel`/`offer_execute`/`liga_reward`/`mystery_box_reward`/`tip_send`/`founding_pass`/`referral_reward`/`withdrawal`). Fix-Slice spaeter (CEO-Scope: Money-Labels).

---

## 002 | 2026-04-16 | Wallet Profile FK + Orphan Cleanup
- Stage-Chain: SPEC → IMPACT(inline) → BUILD → PROVE → LOG
- Files: `supabase/migrations/20260416230000_wallets_profile_fk_cascade.sql` (new, 68 lines), `src/lib/__tests__/db-invariants.test.ts` (+44 lines, INV-17)
- Proofs:
  - `worklog/proofs/002-migration-before.txt` — 2 orphans, 0 FK
  - `worklog/proofs/002-migration-after.txt` — 0 orphans, CASCADE FK live
  - `worklog/proofs/002-inv17.txt` — INV-16 + INV-17 beide gruen
- Commit: (pending)
- Notes: CEO-approved Option B (modified). Orphan 1 (`9e0edfed` taki.okuyucu@gmx.de, abandoned signup, 1M balance, 0 activity) → DELETE. Orphan 2 (`862c96a1` testtrading@bescout.test, 2 tx, 0 trades/holdings) → Profile-Backfill mit is_demo=true. FK `wallets_user_id_profiles_fkey` auf profiles(id) ON DELETE CASCADE. Zukuenftige profile-deletes cascaden Wallet automatisch. INV-17 als permanenter Regression-Guard.

---

## 001 | 2026-04-16 | Wallet-Konsistenz-Check (Blocker A-04)
- Stage-Chain: SPEC → IMPACT(skipped) → BUILD → PROVE → LOG
- Files: `src/lib/__tests__/db-invariants.test.ts` (+87 Zeilen, INV-16 hinzugefuegt)
- Proof: `worklog/proofs/001-wallet-invariant.txt` — 127 Wallets geprueft, 124 mit Transactions, 0 Violations
- Commit: (pending)
- Notes: Invariante `wallets.balance == latest transactions.balance_after` haelt live. Ledger-Drift-Risiko aus Blocker A-04 damit fuer Pilot-DB verifiziert, kein Folge-Fix noetig. Health-Check bleibt als Regression-Guard dauerhaft.
