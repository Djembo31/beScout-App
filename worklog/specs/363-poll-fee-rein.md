# Slice 363 — Polls-Fee REIN in den Plattform-Topf

**Slice-Type:** Migration (Money-RPC) + Test
**Größe:** S
**CEO-Scope:** JA (Money §3) — Policy bereits approved (D98 100 % Auffang). Keine neue Fee-Änderung, nur Routing des bestehenden 20 %-Plattform-Anteils.
**Epic:** E3 Plattform-Treasury (D96) · Slice 2 „Fees REIN", Teil **3 von 5** Quellen (Polls). Anker: `worklog/notes/358-platform-treasury-epic.md` §Slice 2.
**Status:** SPEC fertig + BUILD-ready (Vorarbeit in Session 2026-06-24 nach Slices 360–362). Frische Session startet direkt bei BUILD.

---

## 1. Problem-Statement (Evidence)

Der **Plattform-Anteil der Poll-Fee (20 %) verbrennt.** Live-`pg_get_functiondef('cast_community_poll_vote(uuid,uuid,integer)')` gelesen 2026-06-24:
- `v_creator_share := (v_cost * 80) / 100;` · `v_platform_share := v_cost - v_creator_share;` → **20 % Plattform**.
- `v_platform_share` wird in `community_poll_votes.platform_share` **notiert**, aber in **kein Konto gebucht** — in BEIDEN Branches:
  - `source='club'` → `book_club_treasury(club_id, …, v_creator_share, …)` bucht die 80 % zum Club, **20 % verbrennt**.
  - `source='user'` → Creator-Wallet bekommt `v_creator_share` (80 %), **20 % verbrennt**.

Epic-Befund-Tabelle (358-epic) listet Polls als verbrennende Quelle (20 %, Spalte `platform_share`). Slice 360 (IPO) hat das identische Inline-Muster zuletzt etabliert.

## 2. Lösungs-Design

Eine additive Inline-Buchung in `cast_community_poll_vote`, gespiegelt aus 358/360: **ein** `book_platform_treasury`-Aufruf, der **beide** source-Branches abdeckt — platziert am **Ende des `IF v_cost > 0 THEN`-Blocks, NACH dem source-`IF/ELSE`, VOR dem `ELSE v_creator_share := 0; v_platform_share := 0; END IF;`**.

```sql
-- E3-2c (Slice 363): Polls-Plattform-Fee (20 %) in den BeScout-Topf — voller Auffang (D96/D98)
IF v_platform_share > 0 THEN
  PERFORM book_platform_treasury('credit', 'poll', v_platform_share, p_poll_id, 'Umfrage-Fee');
END IF;
```

**Exakte Einfügestelle (Live-Body):** Der `IF v_cost > 0 THEN`-Block endet so:
```
    ELSE
      IF v_poll.source = 'club' THEN RAISE EXCEPTION 'club_poll_missing_club_id…'; END IF;
      … Creator-Wallet-Payout …
      INSERT INTO transactions (… poll_vote_cost …, … poll_earn …);
    END IF;            -- ← source-Branch schließt hier
    -- >>> NEUER BLOCK HIER (deckt beide Branches) <<<
  ELSE v_creator_share := 0; v_platform_share := 0; END IF;
```

- **Inline, kein Trigger** (spiegelt PBT/Club-Inline-Booking + 358/360).
- **`p_poll_id` als `reference_id`** (konsistent mit `book_club_treasury`-Aufruf, der ebenfalls `p_poll_id` referenziert; es gibt kein `v_trade_id` in diesem RPC).
- Ledger-Desc `'Umfrage-Fee'` (admin-facing; business.md erlaubt, kein user-facing-Wording-Risiko).
- `'poll'` im `platform_treasury_ledger_source_check` **bereits erlaubt** (verifiziert 2026-06-24) → **keine CHECK-Migration**.

## 3. Betroffene Files

| File | Änderung | Begründung |
|------|----------|-----------|
| `supabase/migrations/<ts>_363_poll_fee_rein.sql` | NEU — CREATE OR REPLACE `cast_community_poll_vote` mit Inline-Booking | Money-RPC, via `mcp__supabase__apply_migration` |
| `worklog/proofs/363-money-smoke.txt` | NEU — Force-Rollback-Smoke | PROVE (Money-Pflicht) |
| (kein src/-Change) | — | Fee-Split unverändert, kein Service/UI berührt |

**AR-44-Pflicht:** Migration endet mit `REVOKE EXECUTE … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated;` für `cast_community_poll_vote(uuid,uuid,integer)` (CREATE OR REPLACE resettet Grants).

## 4. Code-Reading-Liste (Pflicht VOR Code, D87)

1. ✅ **Live `pg_get_functiondef('cast_community_poll_vote(uuid,uuid,integer)')`** — Source-of-Truth, gelesen 2026-06-24 (Body unten in §Anhang gespiegelt). Einfügestelle bestätigt.
2. ✅ **`pg_get_constraintdef('platform_treasury_ledger_source_check')`** — `'poll'` erlaubt (gelesen 2026-06-24).
3. ✅ **`book_platform_treasury`-Signatur** — `(p_direction text, p_source text, p_amount bigint, p_ref uuid DEFAULT NULL, p_desc text DEFAULT NULL)` (gelesen 2026-06-24).
4. **Live `buy_from_ipo` / `worklog/specs/360-ipo-fee-rein.md`** — 360-Vorbild (identisches Muster, EIN Pfad). Hier: EIN Booking, aber Einfügung deckt 2 source-Branches.
5. `worklog/proofs/360-money-smoke.txt` + `358-money-smoke.txt` — Smoke-Technik (in-txn `set_config('request.jwt.claim.sub', user, true)` für `auth.uid()`-Guard + `RAISE EXCEPTION 'SMOKE_RESULT: …'` für Output+Rollback).
6. **`.claude/rules/business.md`** — Polls-Fee-Split **20 % Platform / 80 % Creator** (zum Assert der Konstante).
7. **`.claude/rules/errors-db.md` PATCH-AUDIT (S356-Eintrag)** — **kritisch:** die Konstante `(v_cost * 80) / 100` ist genau die, die 343 still auf 70 revertierte (in 356 geheilt). CREATE OR REPLACE MUSS `* 80) / 100` verbatim erhalten; Money-RPC-Patch-Audit assertet die Fee-Konstante, nicht nur `%book_platform_treasury%`-Präsenz.

## 5. Pattern-References

- **D96** (Plattform-Treasury Epic), **D98** (voller Auffang 100 %), **D97** (Saldo Variante A), **D86/D92** (Polls-Modell/Stimmgewicht) — `memory/decisions.md`.
- **Slice 358 + 360** — identisches Inline-Muster (Trading/IPO).
- **errors-db.md PATCH-AUDIT + Konstanten-Audit (S356)** — Money-RPC-Body-Rewrite muss Fee-Konstanten gegen business.md/trading.md asserten.
- **treasury.md §10** — WIE Plattform-Topf.

## 6. Acceptance Criteria

- **AC-1 [HAPPY]** Nach `cast_community_poll_vote` mit cost>0 ist der Topf-Saldo um exakt `v_platform_share` (= cost − 80 %) gestiegen.
  VERIFY: Smoke Ledger-SUM (oder `get_platform_balance()`) vorher/nachher. EXPECTED: Δ = platform_share. FAIL-IF: Δ=0 oder ≠ platform_share.
- **AC-2 [ZERO-SUM]** Voter-Abzug `v_cost` = creator_share (80 %) + platform_share (20 %). VERIFY: Smoke-Zahlen. EXPECTED: `v_cost = creator_share + platform_share` UND Topf-Δ = platform_share.
- **AC-3 [BEIDE BRANCHES]** Buchung passiert sowohl bei `source='club'` (Club-Treasury-Pfad) ALS AUCH `source='user'` (Creator-Wallet-Pfad). VERIFY: Smoke je 1 Vote pro source-Typ → je 1 `'poll'`-Ledger-Row. EXPECTED: 2 Rows, je Δ=platform_share.
- **AC-4 [GUARD/FREE-POLL]** cost=0 (Gratis-Umfrage) → kein Booking, kein CHECK-Fehler. VERIFY: Guard `IF v_platform_share > 0` (+ `v_platform_share:=0` im ELSE-Zweig). EXPECTED: 0 Ledger-Row.
- **AC-5 [NO-DRIFT / KONSTANTE]** Kein anderer Verhaltens-Diff. **Insbesondere `(v_cost * 80) / 100` unverändert** (S356-Klasse). VERIFY: `git diff` der Migration zeigt NUR den einen IF-Block; `pg_get_functiondef` ILIKE `'%(v_cost * 80) / 100%'` nach apply. EXPECTED: 1 Block hinzugefügt, Fee-Konstante=80.
- **AC-6 [CHECK]** `'poll'` braucht keine CHECK-Migration. VERIFY: `pg_get_constraintdef` enthält `'poll'`. EXPECTED: bereits vorhanden.
- **AC-7 [WEIGHT/GATE INTAKT]** Stimmgewicht (Abo/Fan-Rang, S343), min_fan_rank_tier-Tor (S356), Already-Voted-/Self-Poll-/Status-Guards unverändert. VERIFY: PATCH-AUDIT `git diff`. EXPECTED: nur Booking-Block neu.
- **AC-8 [TSC/TESTS]** `tsc --noEmit` grün, `db-invariants.test.ts` grün (kein CHECK/Type-Snapshot-Change — `poll_vote_cost`/`poll_earn` existieren bereits). VERIFY: vitest run.

## 7. Edge Cases

| Fall | Verhalten | Abgedeckt durch |
|------|-----------|-----------------|
| cost = 0 (Gratis-Vote) | keine Buchung | `IF v_platform_share > 0` + ELSE-Reset (AC-4) |
| source='club' mit club_id | Club-Treasury 80 % + Topf 20 % | Einfügung nach source-if/else (AC-3) |
| source='user' | Creator-Wallet 80 % + Topf 20 % | dieselbe Einfügung (AC-3) |
| source='club' OHNE club_id | RAISE EXCEPTION VOR Einfügestelle | unverändert (Buchung nie erreicht) |
| Voter = Creator (Self-Poll) | RETURN vor Wallet/Buchung | unverändert |
| Bereits abgestimmt | RETURN vor Wallet/Buchung | unverändert |
| min_fan_rank_tier zu niedrig | RETURN vor Wallet/Buchung (money-safe, S356) | unverändert |
| Creator-Wallet fehlt (source=user) | creator_share „verbrennt" (pre-existing), Topf-20 % bucht trotzdem | Booking unabhängig vom Creator-Payout — pre-existing Edge, NICHT in Scope |
| Concurrent Votes | je eigene Buchung | `community_polls FOR UPDATE` + Topf-Row-Lock in `book_platform_treasury` |

## 8. Self-Verification Commands

```sql
-- 'poll' im CHECK (erwartet: Treffer)
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='platform_treasury_ledger_source_check';
-- Booking-Zeile live drin + Fee-Konstante intakt (nach apply)
SELECT
  pg_get_functiondef('public.cast_community_poll_vote(uuid,uuid,integer)'::regprocedure) LIKE '%book_platform_treasury(''credit'', ''poll''%' AS has_booking,
  pg_get_functiondef('public.cast_community_poll_vote(uuid,uuid,integer)'::regprocedure) LIKE '%(v_cost * 80) / 100%' AS fee_constant_intact;
```
```bash
npx tsc --noEmit
CI=true pnpm exec vitest run src/lib/services/__tests__/db-invariants.test.ts
```

## 9. Open-Questions

- **Pflicht-Klärung:** keine. Quelle (Polls) ist nächste in Sequenz, Policy D98 approved, CHECK deckt `'poll'`, Fee-Split aus business.md fix (20/80).
- **Autonom-Zone (CTO):** Ledger-Description-Text (`'Umfrage-Fee'`), exakte Einfügestelle (dokumentiert), Migrations-Timestamp, `reference_id`=`p_poll_id`.
- **CEO-Zone:** keine offen (keine Fee-Höhen-Änderung).

## 10. Proof-Plan

`worklog/proofs/363-money-smoke.txt` — Force-Rollback-Smoke (358/360-Technik): **zwei** echte Votes in `BEGIN…ROLLBACK` (je 1× source='club' und source='user'), `set_config('request.jwt.claim.sub', voter, true)` für `auth.uid()`-Guard, `RAISE EXCEPTION 'SMOKE_RESULT: …'` gibt Topf-Δ + Zero-Sum-Zahlen je Branch zurück und rollt zurück. Plus `pg_get_functiondef`-Snippet (Booking present + Fee-Konstante=80) + `db-invariants.test.ts`-Output. **Setup-Hinweis:** temp-Poll(s) mit `cost_bsd>0` und Voter-Wallet mit Deckung anlegen; bei source='club' ein club_id setzen.

## 11. Scope-Out

- **Nicht** Research/Bounty (je eigener Slice: 364/365).
- **Keine** Fee-Höhen-/Split-Änderung (20/80 bleibt).
- **Keine** Admin-UI-Änderung (Topf-Card aus 357 zeigt Saldo; neue Quelle erscheint automatisch im Ledger).
- **Kein** `transactions`/Vote-CHECK-Touch.
- **Kein** Touch an Stimmgewicht/Fan-Rang-Gate-Logik.

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (skipped: additive Inline-Buchung, 0 Consumer-Contract-Change, kein Schema-Shape-Change) → BUILD (1 Migration + AR-44) → REVIEW (reviewer-Agent, Money-Pflicht) → PROVE (Money-Smoke, 2 Branches) → LOG (+ Tracker/MASTERPLAN/TODO reconcile, Epic-Note §Slice 2 Teil-Polls abhaken).

## 13. Pre-Mortem (kurz)

1. **Fee-Konstante still gedriftet** (`* 80` → `* 70`, S356-Klasse) → Money-Drift, 5 Tage unbemerkt wie 343. Mitigation: AC-5 ILIKE-Assert `%(v_cost * 80) / 100%` + exakter Live-Body, nur 1 Block.
2. **Booking nur in EINEM source-Branch** (z.B. innerhalb des `IF source='club'`-Zweigs platziert) → User-Polls verbrennen weiter. Mitigation: Einfügung NACH dem source-`END IF`, vor `ELSE v_creator_share:=0` → deckt beide. AC-3 testet beide Branches.
3. **Einfügung außerhalb `IF v_cost > 0`** (nach dem ELSE-Reset) → bei Gratis-Poll wäre v_platform_share=0, Guard schützt; aber bei cost>0 würde Position trotzdem stimmen. Sicherste Position = innerhalb `IF v_cost>0`, vor dessen ELSE. Mitigation: §2 exakte Stelle.
4. **AR-44 vergessen** → CREATE OR REPLACE öffnet anon-Grant. Mitigation: §3 REVOKE/GRANT-Block Pflicht, Self-Check `has_function_privilege('anon', …)` = false.
5. **Doppelbuchung** — Vote ist 1×/User (`v_already`-Guard) + `community_polls FOR UPDATE`. Kein dedup-key nötig. Mitigation: AC-3 Smoke = 1 Row/Vote.

## Anhang — Live-Body-Kernzeilen (gelesen 2026-06-24, gekürzt)

```
v_cost := v_poll.cost_bsd;
v_creator_share := (v_cost * 80) / 100;          -- ← KONSTANTE NICHT ÄNDERN (S356)
v_platform_share := v_cost - v_creator_share;     -- 20 %
IF v_cost > 0 THEN
  SELECT balance INTO v_voter_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR (insufficient) THEN RETURN error; END IF;
  UPDATE wallets SET balance = balance - v_cost … ;        -- Voter-Debit
  IF v_poll.source = 'club' AND v_poll.club_id IS NOT NULL THEN
    PERFORM book_club_treasury(club_id,'credit','poll_revenue',v_creator_share,p_poll_id,…);  -- 80 % → Club
    INSERT INTO transactions (… 'poll_vote_cost' …);
  ELSE
    IF v_poll.source = 'club' THEN RAISE EXCEPTION 'club_poll_missing_club_id…'; END IF;
    … UPDATE creator-wallet + v_creator_share …;            -- 80 % → Creator
    INSERT INTO transactions (… 'poll_vote_cost' …, … 'poll_earn' …);
  END IF;
  -- >>> Slice 363 Booking-Block HIER (deckt beide Branches) <<<
ELSE v_creator_share := 0; v_platform_share := 0; END IF;
INSERT INTO community_poll_votes (…, creator_share, platform_share, weight) VALUES (…);
…
```
