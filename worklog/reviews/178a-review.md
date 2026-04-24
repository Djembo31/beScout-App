# Review — Slice 178a (Self-Review, XS Pattern-Repetition)

**Type:** Self-Review (kein Reviewer-Agent, weil XS pattern-Repetition von Slice 178 + 151c.2).
**Verdict:** PASS
**Time-spent:** ~45 min incl. spec/build/migrate/proof.

## Warum Self-Review ausreichend

Gemaess `.claude/rules/workflow.md`:
> Ausnahme XS wenn triviale Pattern-Wiederholung und active.md `review: skipped (Grund)`.

- Muster exakt aus Slice 178 (Foundation) + Slice 151c.2 (Blueprint `subscribe_to_club` inline-60s).
- Keine neue DB-Primitive, keine neue Architektur, kein neuer Angriffsvektor.
- Baseline-Body (Slice 034) 1:1 kopiert, nur 2 neue Code-Bloecke (beide aus Foundation-Spec).

## Findings

### MUST-FIX: keine

### CONCERNS: keine

### CONSIDERED + ADDRESSED

1. **Patch-Audit (common-errors.md §2):**
   - Latest `CREATE OR REPLACE FUNCTION buy_player_sc` = `20260417160000_buy_player_sc_transactions_type_fix.sql`.
   - Grep auf `buy_player_sc` in `2026042*.sql` → keine Treffer → keine Patches zwischen 034 und 178a.
   - Baseline-Body 1:1 uebernommen; nur 2 neue Bloecke eingefuegt (early-check + deferred-UPDATE + JSON-variable).
   - Preserved-Guards-Audit (siehe Proof §5) bestaetigt 12/12 Guards erhalten.

2. **auth.uid()-Guard Reihenfolge:**
   - Original Slice 034: guard als FIRST-LINE. Beibehalten.
   - Idempotency-Check kommt NACH auth-guard + quantity-validation, aber VOR jeder money-Operation. Verhindert cross-user-replay (auth.uid() != p_user_id wuerde schon vor check_or_reserve_dedup_key die RAISE EXCEPTION werfen).
   - zusaetzlich: `check_or_reserve_dedup_key` hat eigenen auth.uid()-Guard fuer authenticated (Slice 005 Pattern). Double-Defense.

3. **Backward-Compat:**
   - `p_idempotency_key TEXT DEFAULT NULL` — bestehende 3-arg-PostgREST-calls funktionieren unveraendert.
   - Alte 3-arg-Signatur explicit DROPped zur Vermeidung von pg_proc-Ambiguity.
   - Service-Layer `buyFromMarket(userId, playerId, quantity, idempotencyKey?)` — optional-Parameter am Ende, alle 130 bestehenden Tests gruen.

4. **Edge-Case pending-response (common-errors.md §1, RPC-Pattern):**
   - Wenn RPC mid-transaction crashed (z.B. exception NACH INSERT trades aber VOR UPDATE dedup_keys), bleibt dedup-row `status='pending'`, response=NULL.
   - Replay liefert `is_new=FALSE, existing_response=NULL`.
   - Neue RPC returnt `{success:false, error:'idempotency_pending', idempotent_replay:true}` statt v_dedup_cached::JSON NULL-cast zu machen.
   - Client kann darauf reagieren: kurzes retry (~1s) oder User-Feedback "wird noch verarbeitet".

5. **Response-Shape-Konsistenz (database.md Return-Shape):**
   - v_result hat `success: true` als discriminator (unchanged).
   - Error-Pfade `success: false` + `error`-key (unchanged).
   - Replay-Pfad returnt v_dedup_cached::JSON — gleiche Shape wie original (weil genau das in UPDATE gespeichert wurde).
   - Pending-Pfad returnt `success: false` + error — konsistent.

6. **REVOKE/GRANT (AR-44):**
   - CREATE OR REPLACE + neue Signatur = neue Funktion in pg_proc, Privilegien default `PUBLIC EXECUTE`.
   - REVOKE FROM PUBLIC + REVOKE FROM anon + GRANT TO authenticated am Migration-Ende explicit.
   - Post-apply verify: nur authenticated + postgres + service_role haben EXECUTE. Kein anon.

7. **DROP FUNCTION IF EXISTS (uuid,uuid,integer):**
   - Nach dem neuen CREATE OR REPLACE existieren in pg_proc kurzzeitig beide Signaturen (3-arg + 4-arg).
   - DROP cleaned die alte Signatur. 3-arg-PostgREST-calls ohne idempotency-key werden nun auf 4-arg-Version geroutet (PostgREST matched positional args, fehlendes Arg = NULL).
   - Post-apply verify: pronargs = 4 (nur eine Version), kein Duplikat.

## Proof-Completeness

Siehe `worklog/proofs/178a-replay.txt`. Enthaelt:
1. Signature-Verify (pg_proc, 4 args, returns json)
2. Grant-Verify (kein anon, kein PUBLIC)
3. Foundation-Proof (2-call sequence with UPDATE-simulation)
4. Integration-Proof (regex-audit auf 4 Idempotency-Bloecke)
5. Preserved-Guards-Audit (12/12 Slice-034-Guards)
6. tsc clean
7. vitest 130/130 grün
8. Scope-Out-Reminder (E2E-money-test = 178d)

## Post-Slice-Knowledge-Updates

**common-errors.md Pattern-Addendum** (kein neuer Bug, aber Pattern-Reference fuer 178c-178d):
> Money-RPC Idempotency-Integration Blueprint:
> 1. Parameter `p_idempotency_key TEXT DEFAULT NULL` (backward-compat via default).
> 2. `check_or_reserve_dedup_key` call NACH auth-guard + cheap-validation, VOR DB-writes.
> 3. Early-Return auf `is_new=FALSE`: cached non-NULL → JSON-cast+RETURN; cached NULL → `success:false, error:'idempotency_pending'`.
> 4. v_result JSON-variable statt inline-RETURN, damit Completion-UPDATE vor RETURN passieren kann.
> 5. UPDATE `request_dedup_keys SET response=v_result::JSONB, status='completed'` NACH allen Inserts.
> 6. REVOKE/GRANT renew (AR-44) fuer CREATE OR REPLACE.
> 7. DROP FUNCTION IF EXISTS (old signature) bei Parameter-Erweiterung.

Das Pattern ist replizierbar fuer: `buy_from_order`, `place_sell_order`, `place_buy_order`, `cancel_order`, `cancel_buy_order`, `liquidate_player`, `openMysteryBox`. Jeder einzeln via XS-Slice, gleiche Struktur.

## Follow-ups (NICHT in 178a)

- **178b:** Cleanup-Cron fuer expired dedup-keys (`expires_at < NOW()` → DELETE). Runs 1x/h.
- **178c:** Migration `subscribe_to_club` von inline-60s auf generic `check_or_reserve_dedup_key` (Konsolidierung).
- **178d:** Client-side auto-generation von idempotency-keys in `useSafeMutation` (crypto.randomUUID + pass-through).
- **178e (neu entdeckt, low-prio):** Weitere Money-RPCs via Pattern-Wiederholung rollout.

## Sign-Off

Verdict: **PASS**. Slice 178a ist ready-to-ship. Alle Acceptance-Criteria erfuellt, Proof vollstaendig, kein Rework noetig.
