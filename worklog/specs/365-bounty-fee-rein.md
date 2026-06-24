# Slice 365 — Bounty-Fee REIN in den Plattform-Topf

**Slice-Type:** Migration (Money-RPC) + Test
**Größe:** S
**CEO-Scope:** JA (Money §3) — Policy bereits approved (D98 100 % Auffang). Keine neue Fee-Änderung, nur Routing des bestehenden 5 %-Plattform-Anteils.
**Epic:** E3 Plattform-Treasury (D96) · Slice 2 „Fees REIN", Teil **5 von 5** (Bounty = LETZTE Quelle). Anker: `worklog/notes/358-platform-treasury-epic.md` §Slice 2.
**Status:** SPEC fertig + BUILD-ready. **Live-Body + alle 3 Zahlungspfade + Escrow-Trigger D87-verifiziert 2026-06-24** (Vorarbeit der Vor-Session). Frische Session startet direkt bei BUILD.

---

## 1. Problem-Statement (Evidence)

Der **Plattform-Anteil der Bounty-Fee (5 %) verbrennt** — und wird, anders als bei 358–364, **heute nicht einmal notiert** (keine Spalte). Live-`pg_get_functiondef('approve_bounty_submission(uuid,uuid,text)')` gelesen 2026-06-24:
- `v_reward := v_bounty.reward_cents;`
- `v_platform_fee := (v_reward * 500) / 10000;` → **5 % (500 bps)**.
- `v_creator_net := v_reward - v_platform_fee;` → 95 % an den Einreicher.
- `v_platform_fee` wird **nirgends gebucht** — die 5 % fallen aus dem Umlauf.

**Drei Zahlungspfade (alle verbrennen exakt die 5 %):**
1. **User-Bounty** (`is_user_bounty=true`): Ersteller-Wallet −`v_reward` (100 %), Einreicher +95 % → 5 % verbrennt.
2. **Club-Bounty, NICHT escrowed** (`treasury_escrowed=false`): Admin-Wallet −100 %, Einreicher +95 % → 5 % verbrennt.
3. **Club-Bounty, escrowed** (`treasury_escrowed=true`): **kein Wallet-Abzug im RPC** — die 100 % wurden bei Bounty-Erstellung aus dem Club-Treasury escrowt (`trg_bounties_escrow_reward`, Slice 332). Einreicher +95 % → 5 % verbrennt.

**Escrow-Trigger-Befund (kritisch, live gelesen):** `trg_bounties_settle` feuert bei `status`→`completed` (das macht der RPC), bewegt aber **KEIN Geld** — es flippt nur `treasury_escrowed := false`. Geld-Bewegung gibt es nur bei `cancelled`/`closed` (Refund). **→ Die 5 % werden in KEINEM Trigger gebucht.** Eine einzige Buchung im RPC deckt alle drei Pfade, **ohne Doppelbuchungs-Risiko**.

## 2. Lösungs-Design

Eine additive Inline-Buchung in `approve_bounty_submission`, gespiegelt aus 358/360/363/364: **ein** `book_platform_treasury`-Aufruf — platziert **direkt VOR dem finalen `RETURN jsonb_build_object('success', true, 'reward', v_creator_net)`**, also nach Einreicher-Payout + allen Status-Updates.

```sql
-- E3-2e (Slice 365): Bounty-Plattform-Fee (5 %) in den BeScout-Topf — voller Auffang (D96/D98)
IF v_platform_fee > 0 THEN
  PERFORM book_platform_treasury('credit', 'bounty', v_platform_fee, v_sub.bounty_id, 'Bounty-Fee');
END IF;
```

**Warum diese Stelle:** alle Reject-Pfade (`success=false`) RETURNen vorher; die finale Position wird nur auf dem vollständigen Erfolgsweg erreicht (Einreicher wurde bezahlt). `v_platform_fee` ist oben einmal berechnet → deckt alle 3 Pfade.

- **Inline, kein Trigger** (spiegelt 358–364; die Bounty-Trigger buchen die Fee NICHT).
- **`v_sub.bounty_id` als `reference_id`** — konsistent mit den Escrow-Ledger-Referenzen (`trg_bounties_escrow_reward`/`settle` referenzieren `NEW.id` = bounty_id). Kein `v_trade_id` im RPC.
- Ledger-Desc `'Bounty-Fee'` (admin-facing; business.md-konform).
- `'bounty'` im `platform_treasury_ledger_source_check` **bereits erlaubt** (verifiziert 2026-06-24) → **keine CHECK-Migration**.
- **Zero-Sum je Pfad** (alle = 100 % raus, 95 % + 5 % rein): Pfad 1 Ersteller −100 %; Pfad 2 Admin −100 %; Pfad 3 Club-Treasury −100 % (bei Erstellung) = Einreicher +95 % + Topf +5 %. Integer-Division leakt nicht (`v_creator_net = v_reward - v_platform_fee` exakt).

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `supabase/migrations/<ts>_365_bounty_fee_rein.sql` | NEU — CREATE OR REPLACE `approve_bounty_submission` mit Inline-Booking | Money-RPC, via `mcp__supabase__apply_migration` |
| `worklog/proofs/365-money-smoke.txt` | NEU — Force-Rollback-Smoke (mind. User-Bounty-Pfad) | PROVE (Money-Pflicht) |
| (kein src/-Change) | — | Fee-Split unverändert, kein Service/UI berührt |

**AR-44-Pflicht:** Migration endet mit `REVOKE EXECUTE … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated;` für `approve_bounty_submission(uuid,uuid,text)` (CREATE OR REPLACE resettet Grants). Live aktuell: anon=false, auth=true.

⚠️ **Hinweis Live-Body-Original:** Der RPC hat **kein** `SET search_path TO 'public'` in seinem Header (anders als 364). CREATE OR REPLACE = **exakter** Live-Body inkl. dieser Eigenheit — Header NICHT „aufhübschen", sonst Verhaltens-/Security-Drift.

## 4. Code-Reading-Liste (Pflicht VOR Code, D87)

1. ✅ **Live `pg_get_functiondef('approve_bounty_submission(uuid,uuid,text)')`** — gelesen 2026-06-24 (Body unten in §Anhang gespiegelt). Einfügestelle = vor finalem success-RETURN.
2. ✅ **`trg_bounties_settle()` + `trg_bounties_escrow_reward()`** — gelesen 2026-06-24. Settle bei `completed` bewegt KEIN Geld (nur Flag) → keine Doppelbuchung der Fee.
3. ✅ **`pg_get_constraintdef('platform_treasury_ledger_source_check')`** — `'bounty'` erlaubt.
4. ✅ **`book_platform_treasury`-Signatur** — `(text, text, bigint, uuid, text)`.
5. ✅ **AR-44-Grants** — anon=false, auth=true (CREATE OR REPLACE resettet → REVOKE/GRANT-Block Pflicht).
6. ✅ **`worklog/specs/364-research-fee-rein.md`** — Vorbild (identisches Single-Booking-Muster).
7. ✅ **`.claude/rules/business.md`** — Bounty-Fee-Split **5 % Platform / 95 % Creator** (zum Assert der Konstante).
8. ✅ **`.claude/rules/errors-db.md` PATCH-AUDIT (S356)** — `(v_reward * 500) / 10000` verbatim erhalten; Konstanten-Audit nach apply.

## 5. Pattern-References

- **D96** (Plattform-Treasury Epic), **D98** (voller Auffang 100 %), **D97** (Saldo Variante A) — `memory/decisions.md`.
- **Slice 358 + 360 + 363 + 364** — identisches Inline-Muster.
- **errors-db.md** — „Escrow-bei-INSERT + Settle-bei-status" (S331) + Konstanten-Audit (S356) + Trigger-Guard `IS DISTINCT FROM`.
- **treasury.md §10** + Slice 332 (Bounty-RAUS-Kanal/Escrow).

## 6. Acceptance Criteria

- **AC-1 [HAPPY]** Nach `approve_bounty_submission` ist der Topf-Saldo um exakt `v_platform_fee` (= reward·5 %) gestiegen.
  VERIFY: Smoke Ledger-SUM vorher/nachher. EXPECTED: Δ = platform_fee. FAIL-IF: Δ=0 oder ≠ platform_fee.
- **AC-2 [ZERO-SUM User-Bounty]** Ersteller-Abzug `v_reward` = creator_net (95 %) + platform_fee (5 %). VERIFY: Smoke-Zahlen Pfad 1. EXPECTED: `v_reward = creator_net + platform_fee` UND Topf-Δ = platform_fee.
- **AC-3 [LEDGER-ROW]** Genau 1 `'bounty'`-Ledger-Row pro Approval, reference_id = bounty_id. VERIFY: Smoke COUNT. EXPECTED: 1 Row.
- **AC-4 [GUARD/FREE]** reward=0 → kein Booking (Guard `IF v_platform_fee > 0`). EXPECTED: 0 Ledger-Row. (Edge praktisch selten: Escrow-Trigger escrowt nur reward>0.)
- **AC-5 [NO-DRIFT / KONSTANTE]** **`(v_reward * 500) / 10000` unverändert** (S356). VERIFY: `pg_get_functiondef` ILIKE `'%(v_reward * 500) / 10000%'`; nur der eine IF-Block neu. EXPECTED: 1 Block hinzugefügt, Konstante=500/10000.
- **AC-6 [CHECK]** `'bounty'` braucht keine CHECK-Migration. VERIFY: `pg_get_constraintdef` enthält `'bounty'`. EXPECTED: bereits vorhanden.
- **AC-7 [GUARDS + 3 PFADE INTAKT]** auth.uid()-Mismatch, status<>'pending', bounty status<>'open', club_admin-Check, alle 3 Zahlungspfade (user/club-escrow/club-nonescrow) unverändert. VERIFY: PATCH-AUDIT `git diff`. EXPECTED: nur Booking-Block neu, Header (kein search_path) erhalten.
- **AC-8 [AR-44]** `has_function_privilege('anon', …)` = false nach apply. EXPECTED: false.
- **AC-9 [TSC/TESTS]** `tsc --noEmit` grün, INV-18-Snapshot unberührt (kein neuer transactions.type — `bounty_cost`/`bounty_reward` existieren). VERIFY: tsc.

## 7. Edge Cases

| Fall | Verhalten | Abgedeckt durch |
|------|-----------|-----------------|
| reward = 0 | keine Buchung | `IF v_platform_fee > 0` (AC-4) |
| User-Bounty (Pfad 1) | Ersteller −100 %, Einreicher +95 %, Topf +5 % | Einfügung vor success-RETURN (AC-1/2) |
| Club-Bounty nicht-escrowed (Pfad 2) | Admin −100 %, Einreicher +95 %, Topf +5 % | dieselbe Einfügung |
| Club-Bounty escrowed (Pfad 3) | Club-Treasury −100 % (@Erstellung), Einreicher +95 %, Topf +5 % | dieselbe Einfügung; Settle-Trigger bewegt kein Geld → keine Doppelbuchung |
| Einreichung bereits bearbeitet / Auftrag nicht offen / keine Admin-Berechtigung | RETURN success=false VOR Buchung | unverändert |
| User-Wallet (Einreicher) nicht gefunden | RETURN success=false (pre-existing: Payer evtl. schon debitiert — NICHT in Scope) | unverändert; Booking nie erreicht |
| Integer-Division (reward nicht durch 20 teilbar) | `creator_net = reward − platform_fee` exakt, kein Leak | Zero-Sum hält (AC-2) |
| Concurrent Approvals | `bounty_submissions FOR UPDATE` + `bounties FOR UPDATE` serialisieren; Topf-Row-Lock in book_platform_treasury | unverändert |

## 8. Self-Verification Commands

```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='platform_treasury_ledger_source_check';
SELECT
  pg_get_functiondef('public.approve_bounty_submission(uuid,uuid,text)'::regprocedure) LIKE '%book_platform_treasury(''credit'', ''bounty''%' AS has_booking,
  pg_get_functiondef('public.approve_bounty_submission(uuid,uuid,text)'::regprocedure) LIKE '%(v_reward * 500) / 10000%' AS fee_constant_intact,
  has_function_privilege('anon', 'public.approve_bounty_submission(uuid,uuid,text)', 'EXECUTE') AS anon_can;
```
```bash
npx tsc --noEmit
```

## 9. Open-Questions

- **Pflicht-Klärung:** keine. Letzte Quelle in Sequenz, Policy D98 approved, CHECK deckt `'bounty'`, Fee-Split fix (5/95). Escrow-Interaktion live geklärt (Settle bewegt kein Geld).
- **Autonom-Zone (CTO):** Ledger-Desc (`'Bounty-Fee'`), Einfügestelle (dokumentiert), Timestamp, `reference_id`=`v_sub.bounty_id`.
- **CEO-Zone:** keine offen.

## 10. Proof-Plan

`worklog/proofs/365-money-smoke.txt` — Force-Rollback-Smoke (358–364-Technik). **Setup in-txn (live 0 open bounties):** Temp-Bounty (`is_user_bounty=true` = einfachster Pfad, self-contained) mit `reward_cents>0` + Ersteller-Wallet (Deckung) + Einreicher-Wallet + Temp-`bounty_submissions`-Row (status='pending'). Admin = Ersteller? Nein — bei user_bounty ist `created_by` der Zahler, Approval-Admin braucht `club_admins`-Eintrag NUR bei club-Bounty; bei user_bounty greift der club_admin-Check trotzdem (Body: er prüft `v_bounty.club_id` — bei user_bounty ggf. NULL → EXISTS leer → „Keine Admin-Berechtigung"!).
**⚠️ Smoke-Setup-Stolperstein:** Der club_admin-Check (`NOT EXISTS … club_admins WHERE club_id=v_bounty.club_id`) läuft VOR den Zahlungspfaden — auch für user_bounty. Prüfen ob user_bounties eine `club_id` tragen; falls ja, Admin als club_admin dieses Clubs setzen; falls `club_id` NULL → Check schlägt fehl. **Daher im Smoke evtl. einfacher: Club-Bounty nicht-escrowed (Pfad 2)** mit Admin als echtem `club_admins`-Eintrag + Admin-Wallet-Deckung. Setup-Pfad in der Session final wählen, sobald `bounties`-Spalten (`club_id` nullable bei user_bounty?) live geprüft.
- `set_config('request.jwt.claim.sub', admin, true)` für `auth.uid()`-Guard.
- **Topf-Saldo direkt aus `platform_treasury_ledger`-SUM lesen** (credit−debit) — NICHT `get_platform_balance()` (hat Platform-Admin-Guard, blockt im Nicht-Admin-Kontext; **364-Lehre**).
- `RAISE EXCEPTION 'SMOKE_RESULT: …'` für Output + Rollback. Plus `pg_get_functiondef`-Snippet (Booking + Konstante + anon=false).

## 11. Scope-Out

- **Keine** Fee-Höhen-/Split-Änderung (5/95 bleibt).
- **Kein** Touch an Escrow-/Settle-Triggern.
- **Kein** Fix des pre-existing „Payer debitiert, dann success=false bei fehlendem Einreicher-Wallet" (eigener Slice falls relevant).
- **Keine** Admin-UI-Änderung (Topf-Card aus 357 zeigt neue Quelle automatisch).
- **Kein** neuer `transactions.type` / CHECK-Touch.

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (skipped: additive Inline-Buchung, 0 Consumer-Contract-Change, kein Schema-Shape-Change) → BUILD (1 Migration + AR-44) → REVIEW (reviewer-Agent, Money-Pflicht) → PROVE (Money-Smoke, ≥1 Pfad) → LOG (+ Tracker/MASTERPLAN/TODO reconcile, Epic-Note §Slice 2 Teil-Bounty abhaken → **Fees-REIN dann KOMPLETT**, treasury.md §10 Tabelle letzte Zeile auf ✅).

## 13. Pre-Mortem (kurz)

1. **Fee-Konstante still gedriftet** (`* 500) / 10000` → andere bps) → Money-Drift. Mitigation: AC-5 ILIKE-Assert + exakter Live-Body, nur 1 Block.
2. **Doppelbuchung über Escrow-Trigger** — WIDERLEGT: `trg_bounties_settle` bei `completed` bewegt kein Geld (nur Flag). Booking nur im RPC. Mitigation: AC-7 PATCH-AUDIT zeigt Trigger ungetoucht.
3. **Booking in nur EINEM Pfad** (z.B. innerhalb des `IF is_user_bounty`-Zweigs) → Club-Bounties verbrennen weiter. Mitigation: Einfügung NACH allen Pfaden, vor success-RETURN; `v_platform_fee` global berechnet.
4. **Header `aufgehübscht`** (search_path ergänzt) → Verhaltens-/Security-Drift. Mitigation: §3-Hinweis, exakter Live-Body.
5. **AR-44 vergessen** → anon-Grant offen. Mitigation: §3 REVOKE/GRANT-Block, AC-8 Self-Check.
6. **Smoke-Setup club_admin-Check** blockt → falscher Pfad/Setup. Mitigation: §10 Stolperstein-Hinweis, Pfad in Session final wählen.

## Anhang — Live-Body-Kernzeilen (gelesen 2026-06-24, gekürzt)

```
-- Header: KEIN "SET search_path" (Original-Eigenheit, exakt erhalten!)
v_reward := v_bounty.reward_cents;
v_platform_fee := (v_reward * 500) / 10000;   -- ← KONSTANTE NICHT ÄNDERN (5 %, S356)
v_creator_net := v_reward - v_platform_fee;    -- 95 %
IF v_bounty.is_user_bounty = true THEN
  -- Pfad 1: Ersteller(created_by)-Wallet -v_reward, INSERT bounty_cost
ELSE
  IF NOT COALESCE(v_bounty.treasury_escrowed, false) THEN
    -- Pfad 2: Admin-Wallet -v_reward, INSERT bounty_cost
  END IF;   -- Pfad 3 (escrowed): kein Wallet-Abzug (Escrow @Erstellung via trg_bounties_escrow_reward)
END IF;
-- Einreicher-Wallet +v_creator_net, INSERT bounty_reward
-- UPDATE bounty_submissions status='approved', reward_paid=v_creator_net
-- UPDATE bounties status='completed'  → feuert trg_bounties_settle (NUR Flag-Flip, kein Geld)
-- UPDATE übrige pending submissions → 'rejected'
-- >>> Slice 365 Booking-Block HIER (deckt alle 3 Pfade) <<<
RETURN jsonb_build_object('success', true, 'reward', v_creator_net);
```
