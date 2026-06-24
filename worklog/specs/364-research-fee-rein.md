# Slice 364 — Research-Fee REIN in den Plattform-Topf

**Slice-Type:** Migration (Money-RPC) + Test
**Größe:** S
**CEO-Scope:** JA (Money §3) — Policy bereits approved (D98 100 % Auffang). Keine neue Fee-Änderung, nur Routing des bestehenden 20 %-Plattform-Anteils.
**Epic:** E3 Plattform-Treasury (D96) · Slice 2 „Fees REIN", Teil **4 von 5** Quellen (Research). Anker: `worklog/notes/358-platform-treasury-epic.md` §Slice 2.
**Status:** SPEC fertig + BUILD-ready. Live-Body D87-verifiziert 2026-06-24.

---

## 1. Problem-Statement (Evidence)

Der **Plattform-Anteil der Research-Fee (20 %) verbrennt.** Live-`pg_get_functiondef('unlock_research(uuid,uuid)')` gelesen 2026-06-24:
- `v_author_share := (v_price * 80) / 100;` · `v_platform_fee := v_price - v_author_share;` → **20 % Plattform**.
- `v_platform_fee` wird in `research_unlocks.platform_fee` **notiert**, aber in **kein Konto gebucht** — es verbrennt.
- Autor-Anteil (80 %) → Autor-Wallet (`IF FOUND`). Plattform-Anteil (20 %) → nirgendwo.

Epic-Befund-Tabelle (358-epic) listet Research als verbrennende Quelle (20 %, Spalte `platform_fee`). Slice 360 (IPO) hat das identische Single-Path-Inline-Muster zuletzt etabliert.

## 2. Lösungs-Design

Eine additive Inline-Buchung in `unlock_research`, gespiegelt aus 358/360/363: **ein** `book_platform_treasury`-Aufruf — platziert **nach dem `transactions`-INSERT, VOR dem `RETURN jsonb_build_object('success', true, …)`**.

```sql
-- E3-2d (Slice 364): Research-Plattform-Fee (20 %) in den BeScout-Topf — voller Auffang (D96/D98)
IF v_platform_fee > 0 THEN
  PERFORM book_platform_treasury('credit', 'research', v_platform_fee, p_research_id, 'Research-Fee');
END IF;
```

**Exakte Einfügestelle (Live-Body):**
```
  INSERT INTO transactions (...) VALUES
    (p_user_id, 'research_unlock', -v_price, ...),
    (v_post.user_id, 'research_earn', v_author_share, ...);
  -- >>> NEUER BLOCK HIER <<<
  RETURN jsonb_build_object('success', true, 'amount_paid', v_price, ...);
```

- **Inline, kein Trigger** (spiegelt PBT/Club-Inline-Booking + 358/360/363).
- **`p_research_id` als `reference_id`** (konsistent mit den `transactions`-Zeilen, die ebenfalls `p_research_id` referenzieren; es gibt kein `v_trade_id` in diesem RPC).
- Ledger-Desc `'Research-Fee'` (admin-facing; business.md erlaubt, kein user-facing-Wording-Risiko).
- `'research'` im `platform_treasury_ledger_source_check` **bereits erlaubt** (verifiziert 2026-06-24) → **keine CHECK-Migration**.
- **Single-Path** (wie IPO 360, einfacher als Polls 363): kein source-Branching, kein `v_cost>0`-Outer-Guard. Bei price=0 ist platform_fee=0 → `IF v_platform_fee > 0`-Guard schützt.

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `supabase/migrations/<ts>_364_research_fee_rein.sql` | NEU — CREATE OR REPLACE `unlock_research` mit Inline-Booking | Money-RPC, via `mcp__supabase__apply_migration` |
| `worklog/proofs/364-money-smoke.txt` | NEU — Force-Rollback-Smoke | PROVE (Money-Pflicht) |
| (kein src/-Change) | — | Fee-Split unverändert, kein Service/UI berührt |

**AR-44-Pflicht:** Migration endet mit `REVOKE EXECUTE … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated;` für `unlock_research(uuid,uuid)` (CREATE OR REPLACE resettet Grants).

## 4. Code-Reading-Liste (Pflicht VOR Code, D87)

1. ✅ **Live `pg_get_functiondef('unlock_research(uuid,uuid)')`** — Source-of-Truth, gelesen 2026-06-24 (Body unten in §Anhang gespiegelt). Einfügestelle bestätigt (nach `transactions`-INSERT, vor RETURN).
2. ✅ **`pg_get_constraintdef('platform_treasury_ledger_source_check')`** — `'research'` erlaubt (gelesen 2026-06-24).
3. ✅ **`book_platform_treasury`-Signatur** — `(p_direction text, p_source text, p_amount bigint, p_ref uuid, p_desc text)` (gelesen 2026-06-24).
4. ✅ **AR-44-Grants live** — anon=false, auth=true (gelesen 2026-06-24); CREATE OR REPLACE resettet → REVOKE/GRANT-Block trotzdem Pflicht.
5. ✅ **`worklog/specs/360-ipo-fee-rein.md` + `363-poll-fee-rein.md`** — Vorbild (identisches Single-Booking-Muster).
6. ✅ **`.claude/rules/business.md`** — Research-Fee-Split **20 % Platform / 80 % Autor** (zum Assert der Konstante).
7. ✅ **`.claude/rules/errors-db.md` PATCH-AUDIT (S356-Eintrag)** — CREATE OR REPLACE MUSS `(v_price * 80) / 100` verbatim erhalten; Money-RPC-Patch-Audit assertet die Fee-Konstante, nicht nur `%book_platform_treasury%`-Präsenz.

## 5. Pattern-References

- **D96** (Plattform-Treasury Epic), **D98** (voller Auffang 100 %), **D97** (Saldo Variante A) — `memory/decisions.md`.
- **Slice 358 + 360 + 363** — identisches Inline-Muster (Trading/IPO/Polls).
- **errors-db.md PATCH-AUDIT + Konstanten-Audit (S356)** — Money-RPC-Body-Rewrite muss Fee-Konstanten gegen business.md asserten.
- **treasury.md §10** — WIE Plattform-Topf.

## 6. Acceptance Criteria

- **AC-1 [HAPPY]** Nach `unlock_research` mit price>0 ist der Topf-Saldo um exakt `v_platform_fee` (= price − 80 %) gestiegen.
  VERIFY: Smoke `get_platform_balance()` vorher/nachher. EXPECTED: Δ = platform_fee. FAIL-IF: Δ=0 oder ≠ platform_fee.
- **AC-2 [ZERO-SUM]** Buyer-Abzug `v_price` = author_share (80 %) + platform_fee (20 %). VERIFY: Smoke-Zahlen. EXPECTED: `v_price = author_share + platform_fee` UND Topf-Δ = platform_fee.
- **AC-3 [LEDGER-ROW]** Genau 1 `'research'`-Ledger-Row pro Unlock. VERIFY: Smoke COUNT der neuen Topf-Rows. EXPECTED: 1 Row, Δ=platform_fee, reference_id=p_research_id.
- **AC-4 [GUARD/FREE]** price=0 → kein Booking, kein CHECK-Fehler. VERIFY: Guard `IF v_platform_fee > 0`. EXPECTED: 0 Ledger-Row.
- **AC-5 [NO-DRIFT / KONSTANTE]** Kein anderer Verhaltens-Diff. **Insbesondere `(v_price * 80) / 100` unverändert** (S356-Klasse). VERIFY: `pg_get_functiondef` ILIKE `'%(v_price * 80) / 100%'` nach apply; nur der eine IF-Block neu. EXPECTED: 1 Block hinzugefügt, Fee-Konstante=80.
- **AC-6 [CHECK]** `'research'` braucht keine CHECK-Migration. VERIFY: `pg_get_constraintdef` enthält `'research'`. EXPECTED: bereits vorhanden.
- **AC-7 [GUARDS INTAKT]** auth.uid()-Mismatch-Guard, Eigener-Bericht-Guard, Bereits-freigeschaltet-Guard, Nicht-genug-BSD-Guard unverändert. VERIFY: PATCH-AUDIT `git diff`. EXPECTED: nur Booking-Block neu.
- **AC-8 [AR-44]** `has_function_privilege('anon', …)` = false nach apply. VERIFY: SQL. EXPECTED: false.
- **AC-9 [TSC/TESTS]** `tsc --noEmit` grün, `db-invariants.test.ts` grün (kein CHECK/Type-Snapshot-Change). VERIFY: vitest run.

## 7. Edge Cases

| Fall | Verhalten | Abgedeckt durch |
|------|-----------|-----------------|
| price = 0 (Gratis-Bericht) | keine Buchung | `IF v_platform_fee > 0` (AC-4) |
| price > 0, Autor-Wallet existiert | Autor 80 % + Topf 20 % | Einfügung nach transactions-INSERT (AC-1/3) |
| price > 0, Autor-Wallet fehlt (`IF FOUND` false) | author_share verbrennt (pre-existing), Topf-20 % bucht trotzdem | Booking unabhängig vom Autor-Payout — pre-existing Edge, NICHT in Scope |
| auth.uid() ≠ p_user_id | RAISE EXCEPTION VOR allem | unverändert (Buchung nie erreicht) |
| Eigener Bericht | RETURN success=false VOR Wallet/Buchung | unverändert |
| Bereits freigeschaltet | RETURN success=false VOR Wallet/Buchung | unverändert |
| Nicht genug BSD | RETURN success=false VOR Wallet/Buchung | unverändert |
| Concurrent Unlocks | je eigene Buchung; `research_unlocks`-PK/Unique verhindert Doppel-Unlock | `wallets FOR UPDATE` + Topf-Row-Lock in `book_platform_treasury` |

## 8. Self-Verification Commands

```sql
-- 'research' im CHECK (erwartet: Treffer)
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='platform_treasury_ledger_source_check';
-- Booking-Zeile live drin + Fee-Konstante intakt + AR-44 (nach apply)
SELECT
  pg_get_functiondef('public.unlock_research(uuid,uuid)'::regprocedure) LIKE '%book_platform_treasury(''credit'', ''research''%' AS has_booking,
  pg_get_functiondef('public.unlock_research(uuid,uuid)'::regprocedure) LIKE '%(v_price * 80) / 100%' AS fee_constant_intact,
  has_function_privilege('anon', 'public.unlock_research(uuid,uuid)', 'EXECUTE') AS anon_can;
```
```bash
npx tsc --noEmit
CI=true pnpm exec vitest run src/lib/services/__tests__/db-invariants.test.ts
```

## 9. Open-Questions

- **Pflicht-Klärung:** keine. Quelle (Research) ist nächste in Sequenz, Policy D98 approved, CHECK deckt `'research'`, Fee-Split aus business.md fix (20/80).
- **Autonom-Zone (CTO):** Ledger-Description-Text (`'Research-Fee'`), exakte Einfügestelle (dokumentiert), Migrations-Timestamp, `reference_id`=`p_research_id`.
- **CEO-Zone:** keine offen (keine Fee-Höhen-Änderung).

## 10. Proof-Plan

`worklog/proofs/364-money-smoke.txt` — Force-Rollback-Smoke (358/360/363-Technik): ein echter Unlock in `BEGIN…ROLLBACK`. Setup in-txn: Temp-Autor + Temp-Käufer-Wallet (Deckung) + Temp-`research_posts`-Row mit `price>0` (live 0 Posts mit Preis). `set_config('request.jwt.claim.sub', buyer, true)` für `auth.uid()`-Guard, `RAISE EXCEPTION 'SMOKE_RESULT: …'` gibt Topf-Δ + Zero-Sum-Zahlen zurück und rollt zurück. Plus `pg_get_functiondef`-Snippet (Booking present + Fee-Konstante=80 + anon=false) + `db-invariants.test.ts`-Output.

## 11. Scope-Out

- **Nicht** Bounty (eigener Slice 365).
- **Keine** Fee-Höhen-/Split-Änderung (20/80 bleibt).
- **Keine** Admin-UI-Änderung (Topf-Card aus 357 zeigt Saldo; neue Quelle erscheint automatisch im Ledger).
- **Kein** `transactions`/`research_unlocks`-CHECK-Touch.
- **Kein** Touch an den Vor-Guards (auth/eigener/bereits/Deckung).

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (skipped: additive Inline-Buchung, 0 Consumer-Contract-Change, kein Schema-Shape-Change) → BUILD (1 Migration + AR-44) → REVIEW (reviewer-Agent, Money-Pflicht) → PROVE (Money-Smoke) → LOG (+ Tracker/MASTERPLAN/TODO reconcile, Epic-Note §Slice 2 Teil-Research abhaken).

## 13. Pre-Mortem (kurz)

1. **Fee-Konstante still gedriftet** (`* 80` → `* 70`, S356-Klasse) → Money-Drift. Mitigation: AC-5 ILIKE-Assert `%(v_price * 80) / 100%` + exakter Live-Body, nur 1 Block.
2. **Einfügung an falscher Stelle** (z.B. vor dem Buyer-Balance-Guard) → bucht obwohl Kauf fehlschlägt. Mitigation: §2 exakte Stelle = NACH transactions-INSERT, vor success-RETURN (nur erreicht wenn Kauf vollständig).
3. **AR-44 vergessen** → CREATE OR REPLACE öffnet anon-Grant. Mitigation: §3 REVOKE/GRANT-Block Pflicht, Self-Check `has_function_privilege('anon', …)` = false (AC-8).
4. **Doppelbuchung** — Unlock ist 1×/User (`v_already`-Guard + `research_unlocks`-Unique). Kein dedup-key nötig. Mitigation: AC-3 Smoke = 1 Row/Unlock.
5. **price=0-Post bucht 0/wirft CHECK** → Guard `IF v_platform_fee > 0` schützt. Mitigation: AC-4.

## Anhang — Live-Body-Kernzeilen (gelesen 2026-06-24, gekürzt)

```
v_price := v_post.price;
v_author_share := (v_price * 80) / 100;       -- ← KONSTANTE NICHT ÄNDERN (S356)
v_platform_fee := v_price - v_author_share;    -- 20 %
SELECT balance INTO v_buyer_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
IF NOT FOUND OR (insufficient) THEN RETURN error; END IF;
UPDATE wallets SET balance = balance - v_price ... ;            -- Buyer-Debit
SELECT balance INTO v_author_balance FROM wallets WHERE user_id = v_post.user_id FOR UPDATE;
IF FOUND THEN UPDATE wallets SET balance = balance + v_author_share ...; END IF;  -- 80 % → Autor
INSERT INTO research_unlocks (..., amount_paid, author_earned, platform_fee) VALUES (...);
UPDATE research_posts SET unlock_count = unlock_count + 1, total_earned = total_earned + v_author_share ...;
INSERT INTO transactions (...) VALUES
  (p_user_id, 'research_unlock', -v_price, ...),
  (v_post.user_id, 'research_earn', v_author_share, ...);
-- >>> Slice 364 Booking-Block HIER <<<
RETURN jsonb_build_object('success', true, ...);
```
