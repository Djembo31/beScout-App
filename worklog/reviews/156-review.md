# CTO Review: Slice 156 — Event+Lineup Ferrari-Refactor + P2.3 Migration

**Reviewer:** reviewer-agent (Cold-Context, 1M-window)
**Date:** 2026-04-23
**Duration:** 42 minutes initial review + fix-cycle

---

## Verdict History

| Iteration | Verdict | Trigger |
|-----------|---------|---------|
| v1 (initial) | **FAIL** | Migration war Massen-Regression (CREATE OR REPLACE ohne Patch-Audit — 3 zwischengeschaltete Migrations komplett ueberschrieben) |
| v2 (nach Fix) | **PASS** | Migration als 1:1-Baseline-Kopie von 20260417000000 + 20260325_sc_blocking_rpcs neu geschrieben, NUR 3 Zeilen-Delta (2x NULL + 1x COALESCE weg). DB-Audit zeigt alle 10 Checks gruen. |

---

## v1 Findings (alle gefixt in v2)

### HIGH

1. **Auth-Guard entfernt** (`rpc_lock_event_entry`, Slice 005 J4-Live-Exploit-Fix)
   → Fix v2: `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id` als erstes Statement wieder drin. DB-Audit: `F1_auth_guard=true`.

2. **`min_subscription_tier`-Gate entfernt** (Slice 20260325_event_fee_from_config)
   → Fix v2: Server-Block mit `tier_rank`-Compare wieder drin. DB-Audit: `F2_subscription_gate=true`.

3. **`min_tier`-Gamification-Gate entfernt** (Slice 20260417000000)
   → Fix v2: Server-Block mit `gamification_tier_rank`-Compare wieder drin. DB-Audit: `F3_tier_gate=true`.

4. **Fee-Config-Lookup entfernt + Shape-Drift** (`{platform, beneficiary, prize_pool}` → `{platform, pbt, club}`)
   → Fix v2: `SELECT platform_pct, beneficiary_pct FROM event_fee_config WHERE event_type = ...` + Fallback 500/0 wieder drin. Shape zurueck auf `{platform, beneficiary, prize_pool}`. DB-Audit: `F4_fee_config_lookup=true`, `F4b_fee_shape_beneficiary=true`, `F4c_fee_shape_prize_pool=true`.

5. **`holding_locks`-Cleanup entfernt** in `rpc_unlock_event_entry` (Slice 20260325_sc_blocking_rpcs)
   → Fix v2: `DELETE FROM public.holding_locks WHERE event_id=... AND user_id=...` zwischen Currency-Branch und event_entries-DELETE wieder drin. DB-Audit: `F5_holding_locks_cleanup=true`.

### MED

6. **Header-Kommentar irrefuehrend** (verbirgt Massen-Revert)
   → Fix v2: Header erweitert mit "Source-of-Truth-Baseline" + "Applied Patches"-Liste + "Diff-Intent (nur 3 Zeilen)". Future-Me weiss jetzt genau was die Migration tut und was die Baseline ist.

7. **`not_entered`-Error nicht i18n-gemappt** (`events.mutations.ts` unlockEventEntry)
   → Fix v2: In `useEventActions.leaveMut.mutationFn` wird `not_entered` als stale-cache behandelt und als Success-Path zurueckgegeben (`{ ok: true, balanceAfter: null }`). Optimistic filter-out bleibt (richtig: User-Intent "weg aus Event" wurde bereits bei Server-Side erfuellt). Kein Error-Toast, kein Rollback. Neuer Test `Finding #7: not_entered treats as success-path` verifiziert.

### LOW

8. **Dead-Branches `subscription_required`/`tier_required` im Client-onError**
   → v2 Status: cases bleiben (nicht dead). Server-Guards wurden durch v2-Migration wieder eingefuehrt — die client-side error-cases matchen die server-errors.

9. **Test-Pattern Abweichung zu trading.test.ts (`safeTrigger` vs `mutateAsync`-waitFor)**
   → Akzeptabel. Unterschied ist strukturell: Wrapper-API nutzt `mut.isPending`-Guard + `mutateAsync`, deshalb Test-Proxy `toHaveBeenCalledTimes(1)` vor 2. Trigger. Pattern dokumentiert als Kommentar in Test-File.

### NIT

10. Destructuring `{ event }` in `joinMut.onError` nicht notwendig im Rollback-Block — minor style.
    → Nicht geaendert. Lesbarkeit OK.

11. Client-Pre-Checks vs. onError Toast-Routing doppelt — `event.status === 'ended'` + RPC-Error `event_not_open` beide zeigen `t('eventEndedError')`.
    → Nicht geaendert. Defensive duplication ist akzeptabel (Client-Pre-Check ist billiger Early-Exit, Server ist authoritative).

12. Migration-Timestamp `20260423210000` (21:00 lokal) — kein Problem, nur Notiz.

---

## v2 Positive Highlights (unveraendert aus v1-Review)

1. **Phantom-Rollback-Fix korrekt uebernommen** (153a Finding #1 nicht wiederholt) — `removeQueries`-fallback bei `ctx.prev... === undefined`. Tests verifizieren explizit.
2. **Ferrari-Pattern-Konsistenz** mit 153a — `useQueryClient()` statt Singleton, snapshot+optimistic+rollback, `errorTag` fuer Sentry, `onSettled: invalidateWallet(qc)`.
3. **P2.3 Semantik-Fix korrekt** — Free-Events: `balance_after=null` = "Wallet nicht beruehrt", `balance_after=0` = "auf 0 deducted". Client-Check `!= null` ersetzt `> 0`-Heuristik sauber.
4. **Idempotency-Window ist gratis** (rpc_lock Pre-Check via event_entries PK) — kein Fenster, sondern PK-Guard. Client skippt Toast+setWalletBalance korrekt.
5. **Money-Path Observability** — `errorTag: 'fantasy.joinEvent'/'fantasy.leaveEvent'/'fantasy.submitLineup'`.
6. **Breaking-Kompat-Wrapper** — `joinEvent/leaveEvent/submitLineup` bleiben `async (...) => Promise<void>`. `useLineupSave` nutzt unveraendert.
7. **pgBouncer Read-After-Write (Slice 152c)** — `onSettled: invalidateWallet(qc)` bei Money-Path-Mutations.
8. **Client-Pre-Checks** — billige Early-Exit, Server-Truth authoritative.

---

## Spec-Coverage (v2)

- [x] A1 — RPC returnt `balance_after: null` bei Free-Event (DB-Audit grün, Guards preserved)
- [x] A2 — unlock returnt `balance_after: null` bei amount_locked=0 (DB-Audit grün, holding_locks cleanup preserved)
- [x] A3 — rapid-click race-safe
- [x] A4 — Optimistic join + Snapshot + Rollback
- [x] A5 — Optimistic leave analog
- [x] A6 — submitLineup race-safe
- [x] A7 — `onSettled` invalidateWallet
- [x] A8 — Consumer-API unveraendert
- [x] A9 — `useLineupSave.onJoin` Callback unveraendert nutzbar
- [x] A10 — Tests gruen (25 tests inkl. Finding #7, +1 neu aus v2)
- [x] A11 — tsc clean
- [x] A12 — errorTag gesetzt

---

## Learnings fuer Knowledge Capture

**Promoted to `.claude/rules/common-errors.md` Section 2:**

> **CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT vor Body-Rewrite (Slice 156 Post-Mortem)**
> Beim Body-Rewrite einer SECURITY DEFINER RPC: IMMER erst alle Vorgaenger-Migrations greppen.
> Audit: `grep -rn 'CREATE OR REPLACE FUNCTION public.<name>' supabase/migrations/` + zeitlich sortieren.
> Neuester Body = current DB-State. Nicht vom ersten Create ableiten.
> Gefahr: Silent-Revert aller Patches zwischen Original-Create und aktuellem Stand. Slice 156 v1 hatte:
> - auth.uid()-Guard (Slice 005) entfernt
> - min_subscription_tier-Gate entfernt
> - min_tier-Gate entfernt
> - event_fee_config-Lookup + Shape-Drift
> - holding_locks-Cleanup entfernt
> Bei SECURITY DEFINER RPCs ist Scope oft defense-in-depth — Guards in einer Schicht weg wird nur in Prod sichtbar.
> Template fuer Migration-Header:
> ```
> -- Source-of-truth: <last-CREATE-OR-REPLACE-of-this-fn>.sql
> -- Applied patches ueber dem Baseline: ...
> -- This migration: nur diff-related Aenderungen. Alles andere ist 1:1-Kopie.
> ```

**Hook-Idee (backlog):** `ship-migration-rewrite-gate` — Bei neuer Migration mit `CREATE OR REPLACE FUNCTION public.<name>` auto-grep andere Migrations mit gleichem Function-Namen und WARN wenn Anzahl > 1.

---

## Time Spent

- v1 Review: 42 min
- v1→v2 Fix-Cycle: ~35 min (Baseline-Read, Migration-Rewrite, Re-Apply, Audit-Verify, Test-Adjust, Finding #7 Fix, Doc-Update)

**Total:** ~77 minutes.

---

## Final Verdict: **PASS**

Slice 156 v2 ist clean.
- Migration: Baselines preserved, 3-Zeilen-Delta exakt P2.3-Intent.
- Client-Code: Ferrari-Pattern-Qualitaet wie 153a/b.
- Tests: 25/25 grün, Regression 184/184 grün (fantasy + event-entries + lineups + FantasyContent + useEventActions).
- tsc: clean.
- Knowledge-Capture: CREATE OR REPLACE-Learning nach common-errors promoted.
