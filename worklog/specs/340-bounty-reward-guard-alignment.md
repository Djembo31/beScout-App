# Slice 340 — create_user_bounty Reward-Guard an CHECK angleichen

**Slice-Type:** Migration (Money-RPC)
**Größe:** S
**CEO-Scope:** Ja — Money-RPC-Guard. Wert-Entscheid liegt vor (Anil 2026-06-18: Max = 1.000 $SCOUT / 100.000 cents ist korrekt, CHECK gewinnt). Min = 5 $SCOUT aus bestehendem CHECK.

---

## 1. Problem-Statement (Evidence)

`bounties_reward_cents_check` (live verifiziert): `reward_cents BETWEEN 500 AND 100000` (5–1.000 $SCOUT). Die Live-RPC `create_user_bounty` (D87 `pg_get_functiondef`, NICHT alte Migration-Datei) ist davon gedriftet:
- Min-Guard `IF p_reward_cents < 100` → „Mindestbetrag: 1 $SCOUT" — **zu niedrig** (CHECK will ≥500).
- **Kein Max-Guard** mehr (die alte 100M-Guard/„1.000.000 $SCOUT"-Meldung aus Migration `20260404191000` wurde durch ein späteres CREATE OR REPLACE entfernt — Handoff-Annahme „RPC-Text 1M" ist bzgl. Live bereits überholt).

**Folge:** reward 100–499 cents ODER >100.000 cents passiert den RPC-Guard, schlägt dann an `bounties_reward_cents_check` mit rohem **23514** fehl → kein sauberer discriminated Error, UI zeigt rohen Constraint-Crash statt Meldung. CHECK schützt das Geld (kein Overspend), aber die Guards lügen über das erlaubte Band.

Quelle: Handoff „STOLPERFALLEN #3 — bounty reward_cents-Max-Drift (CHECK 100k vs RPC-Text 1M)" + Proof 332 Zeile 47.

---

## 2. Lösungs-Design

`create_user_bounty` per `CREATE OR REPLACE` neu — **Body byte-identisch** zur Live-Baseline (D87-Dump), nur der Amount-Guard-Block angeglichen:

```sql
-- vorher:
IF p_reward_cents < 100 THEN
  RETURN jsonb_build_object('success', false, 'error', 'Mindestbetrag: 1 $SCOUT');
END IF;
-- nachher (an bounties_reward_cents_check 500–100000 gespiegelt):
IF p_reward_cents < 500 THEN
  RETURN jsonb_build_object('success', false, 'error', 'Mindestbetrag: 5 $SCOUT');
END IF;
IF p_reward_cents > 100000 THEN
  RETURN jsonb_build_object('success', false, 'error', 'Maximum: 1.000 $SCOUT');
END IF;
```

Alles andere (auth-guard, wallet FOR UPDATE, available-check, lock, INSERT, RETURN) **unverändert**. AR-44 REVOKE/GRANT auf der 9-arg-Signatur am Ende. Migration-Timestamp > letzte (Slice 326-Regel): `20260618210000`.

**Kein UI-Change nötig:** reward 1–4 $SCOUT war schon kaputt (23514); Guard macht den Fehler nur sauber. Discriminated-Union-Shape (`{success:false,error}`) wie bestehend.

---

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `supabase/migrations/20260618210000_slice_340_bounty_reward_guard.sql` | NEU — CREATE OR REPLACE create_user_bounty + AR-44 | Guard an CHECK angleichen |

Kein Service/Type/UI-Change (Return-Shape unverändert, nur zusätzlicher Error-Pfad).

---

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. **`pg_get_functiondef('public.create_user_bounty(...)')` LIVE** — Body-Baseline. ✅ gemacht (D87).
2. **`bounties_reward_cents_check`** live def — Zielband 500–100000. ✅ gemacht.
3. Single-Insert-Pfad-Check: nur `create_user_bounty` inserted in `bounties`. ✅ verifiziert (pg_proc-Scan).
4. `src/lib/services/bounties.ts` (oder wo `create_user_bounty` aufgerufen wird) — Return-Shape-Erwartung (discriminated `{success,error}`)? ZU PRÜFEN dass Service neuen Max-Error sauber durchreicht (kein neuer i18n-Key nötig, RPC liefert literal-DE wie bestehend).

---

## 5. Pattern-References

- **errors-db.md** „CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT" (Slice 156) → Live-functiondef = Baseline, keine Patches verlieren.
- **database.md** AR-44 → REVOKE PUBLIC+anon + GRANT authenticated auf neuer Signatur.
- **errors-db.md** „Same-Day-Migration mit FRÜHEREM Timestamp" (Slice 326) → Timestamp > letzter.
- **database.md** Discriminated-Union-Return → `{success:false, error}` konsistent.
- **errors-db.md** Status/Type-CHECK-Drift-Familie (330/332/335) → hier umgekehrt: Guard an bestehenden CHECK angleichen (CHECK ist Wahrheit).

---

## 6. Acceptance Criteria

- **AC-01** [EDGE] reward < 500 → `{success:false, error:'Mindestbetrag: 5 $SCOUT'}` (kein 23514). VERIFY: RPC-Call mit 499.
- **AC-02** [EDGE] reward > 100000 → `{success:false, error:'Maximum: 1.000 $SCOUT'}` (kein 23514). VERIFY: RPC-Call mit 100001 (Rollback).
- **AC-03** [HAPPY] reward genau 500 + genau 100000 mit ausreichend Wallet → erstellt (BEGIN; … ROLLBACK;). VERIFY: source-Smoke, bounty_id zurück, CHECK nicht verletzt.
- **AC-04** [HAPPY] genau 1 Signatur, AR-44: anon=false, authenticated=true. VERIFY: `\df` + has_function_privilege.
- **AC-05** [REGRESSION] Body byte-identisch außer Guard: auth-guard, wallet-lock, available-check, INSERT-Spalten, RETURN unverändert. VERIFY: Diff Live-alt vs neu = nur Guard-Block.

---

## 7. Edge Cases

| # | Fall | Erwartet |
|---|------|----------|
| 1 | reward = 499 | Min-Error 5 $SCOUT |
| 2 | reward = 500 | erlaubt (Grenze inklusiv, = CHECK) |
| 3 | reward = 100000 | erlaubt (Grenze inklusiv) |
| 4 | reward = 100001 | Max-Error 1.000 $SCOUT |
| 5 | reward < 500 aber Wallet leer | Min-Guard greift VOR wallet-lock (billig-zuerst) |
| 6 | auth.uid() ≠ p_user_id | auth_uid_mismatch (unverändert) |

---

## 8. Self-Verification Commands

```sql
-- nach apply:
SELECT pg_get_functiondef('public.create_user_bounty(uuid,uuid,text,text,text,bigint,integer,integer,uuid)'::regprocedure);  -- Guard 500/100000 drin, Rest gleich
SELECT has_function_privilege('anon', oid,'EXECUTE') a, has_function_privilege('authenticated', oid,'EXECUTE') au FROM pg_proc WHERE proname='create_user_bounty';
-- Boundary-Smokes (BEGIN; … ROLLBACK;): 499 → min-error, 100001 → max-error, 100000 → ok
```

---

## 9. Open-Questions

- **CEO:** ✅ erledigt — Max 1.000 $SCOUT (Anil 2026-06-18).
- **Autonom (CTO):** Error-Text-Wording (literal-DE wie bestehend, kein i18n-Key — RPC nutzt schon literal-DE), Migration-Timestamp.
- **Scope-Out:** Club-Bounty-Direkt-Insert-Pfad (falls Admin-UI direkt inserted) — eigener Check; auto_close_expired_bounties AR-43 (eigener Slice).

---

## 10. Proof-Plan

- `pg_get_functiondef`-Dump (Guard 500/100000 + Rest unverändert) → `worklog/proofs/340-rpc.txt`.
- Boundary-Smokes (499/100000/100001) Live-Call → `340-rpc.txt`.
- AR-44 Grant-Audit → `340-rpc.txt`.

---

## 11. Scope-Out

- `auto_close_expired_bounties` AR-43-Migration (eigener Slice).
- Club-Bounty-Create-Pfad (falls separat) — nur create_user_bounty inserted via RPC (verifiziert).
- UI-seitige Max-Validierung im Bounty-Erstell-Modal (optional später; RPC ist jetzt die saubere Boundary).

---

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped: 1 RPC, kein neuer Consumer, Return-Shape unverändert) → BUILD (Migration apply) → REVIEW (Cold-Context, Money-RPC) → PROVE (functiondef + Boundary-Smokes + AR-44) → LOG.

---

## 13. Pre-Mortem

1. **Patch-Verlust:** CREATE OR REPLACE ohne exakte Body-Kopie → verliert auth-guard/escrow-Logik. → Body 1:1 aus D87-Dump, nur Guard-Block ändern; AC-05 Diff-Verify.
2. **AR-44-Reset:** Grants resetten → anon execute. → REVOKE/GRANT-Block Pflicht, AC-04 verifiziert.
3. **Grenz-off-by-one:** CHECK ist `>=500 AND <=100000` (inklusiv). Guard muss `<500` / `>100000` sein (nicht `<=`/`>=`), sonst 500/100000 fälschlich abgelehnt. → AC-03 testet beide Grenzen.
