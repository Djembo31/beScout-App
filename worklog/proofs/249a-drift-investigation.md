# Slice 249 Phase A — Wallet-Drift Investigation Findings

**Datum:** 2026-04-28
**Phase:** A (read-only Investigation — KEIN Code-Change, KEINE writes)
**Status:** COMPLETE — Phase B/C wartet auf CEO-Decision

## Executive Summary

44 user-wallets out-of-sync mit transactions-Ledger in Production-Supabase. **Total absolute Drift: ~1,624,450 $SCOUT** verteilt auf 44 user (Range: -134k bis +66k $SCOUT pro Wallet).

Drift ist real und in 4 distinkte Klassen aufteilbar. Drift-Source nicht eindeutig in Phase A identifizierbar (read-only kann audit-trail nicht rekonstruieren).

## Drift-Klassifikation (alle 44 betroffenen Wallets)

| Group | Pattern | User | Total Drift | Max Drift |
|-------|---------|------|-------------|-----------|
| **Group 2** | `balance > latest_tx_balance_after` (gain AFTER last tx, no ledger) | 20 | **1,127,063 $SCOUT** (70%) | +124,959 $SCOUT |
| **Group 1** | `tx_sum < balance, latest_tx_balance_after = balance` (missing tx-records BEFORE last tx) | 13 | 367,922 $SCOUT (23%) | +66,836 $SCOUT |
| **Group 3** | `balance < latest_tx_balance_after` (loss AFTER last tx, no ledger) | 9 | 98,583 $SCOUT (6%) | -24,170 $SCOUT |
| **Group 4** | `tx_sum > balance, latest_tx_balance_after = balance` (excess tx-records) | 2 | 30,881 $SCOUT (1%) | -18,197 $SCOUT |
| **Total** | — | **44** | **1,624,450 $SCOUT** | — |

## Smoking-Gun-Beispiel (User 86e7147a — Group 1)

```
2026-03-25 13:55:02  trade_sell   +27,901   balance_after=4,876,210  ← letzte tx vor Lücke
2026-04-25 12:57:40  ipo_buy      -40,000   balance_after=11,519,873 ← +6,683,663 ohne Ledger!
2026-04-25 14:52:48  ipo_buy      -40,000   balance_after=11,479,873
... (10 weitere ipo_buys, 40k jeweils)
2026-04-25 18:23:19  ipo_buy      -40,000   balance_after=11,159,873
```

**Diagnose:** Zwischen 2026-03-25 13:55 und 2026-04-25 12:57 (30 Tage) ist die Wallet von 4,876,210 auf 11,559,873 (vor dem -40k ipo_buy) gewachsen. **+6,683,663 cents (~67k $SCOUT) Gain ohne ein einziges transaction-record.**

**Activity-Quellen geprüft (alle null oder irrelevant):**
- `lineups.reward_amount > 0` für diesen User: **0 Treffer**
- `mystery_box_results`: 0
- `streak_milestones_claimed`: 0
- `score_road_claims`: 0
- `monthly_liga_winners`: 0
- `user_missions WHERE completed_at IS NOT NULL`: 4, aber alle `claimed_at IS NULL` (nicht ausgezahlt, total nur 31k cents)
- `activity_log`: 0

**Drift-Source nicht im standard reward-pipeline lokalisiert.**

## Konzentration auf 2026-04-25

Group 1 (13 user) hat **alle latest_tx ipo_buys vom 2026-04-25** zwischen 12:57-18:46. Vor diesem Tag hatten sie alle Wallet-Balances ~5M cents (welcome_bonus-Niveau). Am 2026-04-25 sprangen sie plötzlich auf 5-12M cents BEFORE den ipo_buys ausgeführt wurden.

**Hypothese (verifizierbar in Phase B):** Ein Event/Cron/Script am 2026-04-25 (oder davor und versteckt) hat 13+ Wallets zwischen ~+1M und +6M cents erhöht ohne entsprechende transactions-Inserts.

## Migration-Datums-Korrelation

Migrations am 2026-04-25 (mögliche Auslöser, alle in Production deployed):
- `20260425130000_slice_195a_captain_multiplier_1p1x.sql` — Score-Event Captain-Multiplier
- `20260425140000_slice_195b_captain_boost_rename.sql` — Score-Event Boost
- `20260425170000_slice_195d_bench_autosub.sql` — Score-Event Bench-Autosub
- `20260425220000_slice_199_top_predictors.sql` — Predictions
- `20260425220100_slice_199_most_owned_per_club.sql` — Most-Owned

`score_event` RPC schreibt SOWOHL `UPDATE wallets SET balance` ALS AUCH `INSERT INTO transactions (..., 'tier_bonus' / 'fantasy_reward', ...)` (verifiziert in `slice_195d_bench_autosub.sql:817-822 + 877-884`).

→ **Korrekte Money-RPC.** Score-Event ist nicht der Drift-Source.

## RPC-Audit (UPDATE wallets ohne INSERT INTO transactions)

Suspect-Migrations (UPDATE wallets count > INSERT transactions count):
- `20260314190000_buy_orders.sql` (UPDATE=2, INSERT=0) — könnte alter Bug
- `20260315_fix_cancel_buy_order_lock.sql` (UPDATE=1, INSERT=0)
- `20260331_place_buy_order_velocity_guard.sql` (UPDATE=1, INSERT=0)
- `20260404192000_votes_polls_rpcs_rls.sql` (UPDATE=3, INSERT=0)
- `20260404191000_bounty_rpcs_rls.sql` (UPDATE=5, INSERT=1)

**Vote/Poll und Bounty-RPCs schreiben wallets ohne ledger** — möglicher historischer Bug (gefixt in späteren Slices?). Aber: Keine Vote/Bounty-Activity für 86e7147a.

## Phase A Limitationen (Phase B+C nötig)

Phase A ist read-only. Folgende Mittel sind nötig für Root-Cause-Identifikation:
1. **pg_audit-Logs** — falls aktiviert, zeigt jeder UPDATE wallets.balance mit Zeitstempel + RPC-Call
2. **wallet_history-Trigger** einbauen + 2-3 Wochen mitlaufen lassen
3. **`git log --all`** für scripts/manual-fix*.{sql,ts,mjs} um manuelle Eingriffe zu finden
4. **MCP-SQL-History**: gibt es ein Log der mcp__supabase-Calls? (vermutlich nein)

Wahrscheinliche Drift-Sources (Hypothesen, ranked):
1. **Manuelle SQL durch CTO/Anil** zur Beta-Phase-Vorbereitung (high prior — Anil hat oft zu Demo-Zeiten Wallets ad-hoc aufgefüllt)
2. **Backfill-Script** das nicht im scripts/ liegt (mid prior)
3. **Pre-Slice-179-Migration** die transactions deleted/updated hat (mid — append-only-Trigger erst seit Slice 179)
4. **Bug in alter RPC** die mittlerweile gefixt ist (low — würde alle Tester treffen)

## Reconcile-Strategien (für Phase B Anil-Decision)

| Option | Mechanik | Pro | Contra |
|--------|----------|-----|--------|
| **A — Tx-Sum als Truth** | wallet.balance := SUM(transactions.amount). Insert "reconciliation" tx für Differenz. | Ledger-konsistent, Drift verschwindet. | User mit Group 2 Drift verliert echte $SCOUT (1.13M $SCOUT total). User-Trust-Issue. |
| **B — Balance als Truth** | INSERT correction-Transaction um latest tx-Balance auf wallet.balance zu bringen. | User-freundlich, behält $SCOUT-Werte. | Legitimiert den Drift-Source rückwirkend. Wenn Source ein Bug war, wird er nicht gefunden. |
| **C — Drift-Snapshot + Future-Strict** | Pre-Beta einmal Snapshot, Future-RPCs ledger-discipline durchsetzen. Drift bleibt aber gequarantäned. | Pragmatisch. | Keine Daten-Hygiene-Recovery. Drift wandert in Beta. |
| **D — Investigation-First** | Phase B+ deeper bevor reconcile. | Findet Root-Cause, kann Bug fixen. | Verzögert Beta. |

## CEO-Decision-Punkte (für Phase B)

1. **Reconcile-Strategy:** A, B, C oder D?
2. **User-Disclosure:** Silent reconcile oder transparent kommunizieren?
3. **Timing:** Vor Beta-Launch oder post-Beta wenn Drift-Tester mehr werden?
4. **Beta-Blocker?** 44 Wallets in Production, kein End-User-Impact akut sichtbar (User sehen ihre balance, kein Ledger). Skala-Issue post-Beta?
5. **Investigation-Budget:** Wieviel Zeit in Phase B Root-Cause investieren?

## Empfehlung CTO

**Option C + D-Mix für Pre-Beta** + **Option B (silent) post-Beta** falls keine Root-Cause:

1. Phase B (1-2h Investigation): `git log --all -p -- scripts/` für manual-fix-Scripts, MCP-SQL-History falls verfügbar
2. Wenn Root-Cause gefunden: Bug fixen + Reconcile-Migration mit transparency (pseudo-anonymous metric: "wallet drift erkannt + reconciled")
3. Wenn nicht: Option B silent reconcile + ledger-discipline-Pattern in errors-db.md codifizieren
4. Beta-Phase NICHT blocken (44 user, kein User-Impact, weniger als 1.7M $SCOUT total)

## Phase A Self-Review

- ✅ Read-only — kein Code-Change, keine writes
- ✅ Drift-Klassifikation komplett (4 Groups, 44 user)
- ✅ Smoking-Gun-Beispiel dokumentiert (User 86e7147a)
- ✅ Standard reward-pipeline ausgeschlossen (mystery_box, lineups.reward, missions, etc.)
- ✅ Migration-Datums-Korrelation 2026-04-25 identifiziert
- ✅ Reconcile-Strategien aufgelistet mit Trade-Offs
- ⚠️ Drift-Source nicht eindeutig identifiziert — Phase B nötig
- ⚠️ Phase A war Read-only-Limitiert (kein pg_audit, kein git-history-of-MCP-calls)

**Phase A done. Phase B/C wartet auf CEO-Decision.**
