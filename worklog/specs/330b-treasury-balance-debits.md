# Slice 330b — Treasury-Saldo Debit-Reconcile + Kontoauszug/CSF-Anzeige

**Slice-Type:** Migration (Money, CEO-Scope)
**Größe:** M
**Status:** SPEC (Anil-Approval ausstehend)
**Datum:** 2026-06-17

---

## 0. CEO-Entscheidung (2026-06-17)

**Deposit-RPC wird NICHT gebaut** (Anil). Phase-1-Haupthebel gegen CSF-Unterdeckung = Pro-Card-Cap (Cap ≤ IPO-Preis garantiert Deckung, da IPO-85 % in dasselbe Treasury fließt). Deposit erst bei echtem Funding-Bedarf. → 330b = **Balance-Reconcile (Debits) + Ledger/CSF-Debit-Anzeige**.

## 1. Problem-Statement (Evidence)

Slice 330 führte CSF-**Debits** ins `club_treasury_ledger` ein. Aber `get_club_balance` (Live, 329 `20260617120000` §7) ignoriert Debits:
```
v_total_earned := v_trade_fees + v_sub_revenue;          -- nur CREDIT-Typen
available       := v_total_earned - v_total_withdrawn;    -- Debits fehlen!
```
`request_club_withdrawal` (Live, verifiziert via pg_get_functiondef 2026-06-17) liest exakt diesen `available`:
```
v_available := (get_club_balance(p_club_id)->>'available')::BIGINT;
IF p_amount_cents > v_available THEN <reject> END IF;
```
→ **Money-Leck:** Ein Club zahlt CSF aus (Debit reduziert echten Saldo), aber `available` zeigt weiter den Brutto-Wert → der Club kann denselben Betrag **nochmal abheben**. Der 330-Guard rechnet bereits korrekt (`SUM(credit)−SUM(debit)−withdrawals`); `get_club_balance` driftet davon ab. 330b vereinheitlicht beide.

Zweitens: Die CSF-Debits sind **nirgends sichtbar** — kein Kontoauszug, keine „CSF ausgezahlt"-Anzeige im Admin-Panel (`AdminWithdrawalTab`, 4 Brutto-Karten).

## 2. Lösungs-Design

**Eine Migration** (`get_club_balance` v2 + neue `get_club_treasury_ledger`-RPC) + **Service/Type** + **UI** (`AdminWithdrawalTab`) + **i18n**.

**2.1 `get_club_balance` v2** (Baseline = live functiondef 329):
- `available = v_ledger_net − v_total_withdrawn`, wobei `v_ledger_net = SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END)` über ALLE Ledger-Zeilen — **identisch zur 330-Guard-Logik** (Konsistenz Guard==UI==Withdrawal).
- Neue Return-Keys (additiv, 5 alte erhalten): `csf_paid` (SUM debit type='csf'), `total_debited` (SUM aller Debits).
- `total_earned`/`trade_fees`/`sub_revenue` bleiben Brutto-Credits (Anzeige „verdient"); nur `available` reflektiert jetzt Debits.
- REVOKE/GRANT 1:1 (authenticated+postgres+service_role, live verifiziert).

**2.2 NEU `get_club_treasury_ledger(p_club_id uuid, p_limit int DEFAULT 50)`** — Kontoauszug:
- SECURITY DEFINER, club-admin ODER platform-admin Guard (analog get_club_balance; Ledger-Tabelle ist RLS default-deny).
- Return **JSONB-Array** (PostgREST-1000-Cap-safe, errors-db.md „RPC ignoriert .range()"): `[{id, direction, type, amount, balance_after, description, created_at}]`, ORDER BY created_at DESC, id DESC LIMIT p_limit.
- REVOKE/GRANT AR-44 (authenticated; postgres/service_role).

**2.3 Service** `club.ts`: `getClubBalance` Return-Type erweitern; neu `getClubTreasuryLedger(clubId, limit?)` (throw-on-error, JSONB-Array-Parse).

**2.4 Types** `index.ts`: `ClubBalance` +`csf_paid`+`total_debited`; neu `DbTreasuryLedgerEntry`.

**2.5 UI** `AdminWithdrawalTab`:
- Balance-Karten: 5. Karte „CSF ausgezahlt" (`csf_paid`, rose/amber für Outflow). `available` zeigt jetzt korrekt (reflektiert Debits) — keine Code-Änderung am available-Render nötig (Wert kommt korrigiert).
- Neue „Kontoauszug"-Card: Liste der Ledger-Bewegungen (Credit grün +, Debit rose −, Typ-Label, Datum, balance_after). Loading-Skeleton + Empty-State.
- `load()` um `getClubTreasuryLedger` erweitern (Promise.all).

**2.6 i18n** DE+TR: `wdCsfPaid`, `ledgerTitle`, `ledgerEmpty`, Typ-Labels (`ledgerType.trade_fee`/`csf`/`subscription`/…). business.md-konform.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `supabase/migrations/20260617140000_slice_330b_treasury_balance_debits.sql` | NEU: get_club_balance v2 + get_club_treasury_ledger |
| `src/lib/services/club.ts` | getClubBalance-Type + neu getClubTreasuryLedger |
| `src/types/index.ts` | ClubBalance +2 Felder · DbTreasuryLedgerEntry |
| `src/components/admin/AdminWithdrawalTab.tsx` | csf_paid-Karte + Kontoauszug-Section |
| `messages/de.json`, `messages/tr.json` | wdCsfPaid, ledger*, ledgerType.* |
| `src/lib/services/__tests__/club.test.ts` | getClubBalance neue Felder + getClubTreasuryLedger |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

1. **Live-Verify** `pg_get_functiondef('public.get_club_balance(uuid)')` — Baseline (auth+admin-Guard 1:1 erhalten, Slice-156 PATCH-AUDIT).
2. `supabase/migrations/20260617120000_slice_329_club_treasury_ledger.sql` §7 — exakte get_club_balance-Struktur + Guard.
3. `supabase/migrations/20260617120000…` §1 — `club_treasury_ledger`-Spalten (direction/type/amount/balance_after/description/created_at) + CHECK-Typen.
4. `request_club_withdrawal` (live functiondef, schon gelesen) — bestätigt: liest `available` → mein Fix wirkt automatisch auf den Withdrawal-Gate.
5. `src/lib/services/club.ts:722-759` — getClubBalance + getClubWithdrawals Pattern (für getClubTreasuryLedger spiegeln).
6. `src/components/admin/AdminWithdrawalTab.tsx` — Karten-Grid (grid-cols-2 lg:grid-cols-4 → -5) + load()-Promise.all + formatScout.
7. `src/types/index.ts:384` — ClubBalance.
8. `src/lib/services/wallet.ts:279` — formatScout (cents → CR-String).
9. `.claude/rules/errors-db.md` „PostgREST RPC-Pfad ignoriert .range()" — JSONB-Return für Ledger.
10. `src/lib/activityHelpers.ts` — gibt es wiederverwendbare Typ→Label/Color für die Ledger-Typen? (trade_fee/csf etc. sind club_treasury-Typen, NICHT transactions.type — eigene Label-Map nötig, NICHT activityHelpers wiederverwenden.)

## 5. Pattern-References

- **errors-db.md „CREATE OR REPLACE — PATCH-AUDIT PFLICHT" (156)** — get_club_balance Baseline = live functiondef.
- **errors-db.md „PostgREST RPC ignoriert .range()" (270d)** — Ledger-RPC = JSONB-Array-Return, kein TABLE+range.
- **database.md „Migration-Template AR-44"** — REVOKE/GRANT-Block beide RPCs.
- **database.md „SECURITY DEFINER Guard Admin-only" (095)** — Ledger-Return enthält Geld-Bewegungen → club-admin/platform-admin-Guard pflicht.
- **errors-frontend.md „Missing i18n-Key bei neuer CTA" (198)** — neue Keys in BEIDE Locales.
- **performance.md** — getClubTreasuryLedger `.limit`/JSONB; getClubBalance NICHT cachen (RLS-nah, money).

## 6. Acceptance Criteria

| # | Kriterium | VERIFY |
|---|-----------|--------|
| AC1 | get_club_balance.available subtrahiert Debits | Live-SQL: für Club mit CSF-Debit ist `available == ledger_net − withdrawn` (nicht brutto) |
| AC2 | csf_paid + total_debited im Return | functiondef enthält beide Keys; SQL-Call zeigt korrekte Summen |
| AC3 | available == 330-Guard-Maß | `(SUM credit − SUM debit) − withdrawals` == get_club_balance.available für Stichproben-Club |
| AC4 | get_club_treasury_ledger Guard + Return | non-admin → RAISE/leer; admin → JSONB-Array korrekt sortiert |
| AC5 | REVOKE/GRANT beide RPCs | pg-Grants: authenticated(+postgres+service_role), kein anon |
| AC6 | UI zeigt csf_paid + Kontoauszug | Playwright bescout.net (nach Deploy) Admin-Withdrawal-Tab — Screenshot |
| AC7 | tsc + vitest grün | tsc --noEmit + vitest club.test |
| AC8 | i18n DE+TR vollständig | grep neue Keys in beiden Locales |

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| Club ohne Ledger-Zeilen | ledger_net=0, csf_paid=0, available=−withdrawn (oder 0); Kontoauszug Empty-State |
| Club mit CSF-Debit | available sinkt um Debit; csf_paid zeigt Summe; Withdrawal-Gate greift korrekt |
| available < 0 theoretisch | Sollte nicht (330-Guard + withdrawal-check verhindern Über-Debit); falls doch, anzeigen as-is (nicht clampen — Wahrheit) |
| Ledger > 50 Einträge | LIMIT 50, neueste zuerst; (Pagination = Future, nicht jetzt) |
| non-admin ruft Ledger-RPC | Guard RAISE not_authorized |
| Typ ohne Label-Map-Eintrag | Fallback auf rohen Typ-String (kein Crash) |
| TR-Locale | alle Karten + Kontoauszug TR |

## 8. Self-Verification Commands

```bash
# AC1/AC3 — available reflektiert Debits + == Guard-Maß (Stichprobe Club mit CSF):
mcp__supabase__execute_sql: |
  WITH g AS (SELECT (get_club_balance('<club>')::jsonb) b)
  SELECT b->>'available' AS rpc_available,
    ((SELECT COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE -amount END),0)
      FROM club_treasury_ledger WHERE club_id='<club>')
     - (SELECT COALESCE(SUM(amount_cents),0) FROM club_withdrawals
        WHERE club_id='<club>' AND status IN ('pending','approved','paid'))) AS expected
  FROM g;   -- müssen gleich sein
# (Aufruf als Admin: set_config request.jwt.claims im selben TX-Block.)

# AC2 — Keys vorhanden
mcp__supabase__execute_sql: SELECT pg_get_functiondef('public.get_club_balance(uuid)'::regprocedure) ILIKE '%csf_paid%';

# AC4 — Ledger-RPC
mcp__supabase__execute_sql: SELECT public.get_club_treasury_ledger('<club>', 10);  -- als admin

# AC5
SELECT grantee FROM information_schema.routine_privileges WHERE routine_name IN ('get_club_balance','get_club_treasury_ledger');

# AC7/AC8
pnpm exec tsc --noEmit && CI=true pnpm exec vitest run club.test
grep -c "wdCsfPaid\|ledgerTitle" messages/de.json messages/tr.json
```

## 9. Open-Questions

- **OQ1 (CTO-autonom):** csf_paid-Karte ersetzt KEINE bestehende — Grid wird lg:grid-cols-5 (oder 2×3). Default: 5 Karten in einer Reihe lg.
- **OQ2 (CTO-autonom):** Kontoauszug LIMIT 50, keine Pagination jetzt.
- **OQ3 (Anil, i18n):** TR-Wording neue Keys (Kontoauszug = „Hesap Hareketleri", CSF ausgezahlt = „Ödenen CSF"/neutral) — vor Commit zeigen.
- Keine Money-Design-Frage offen (Deposit gestrichen).

## 10. Proof-Plan

| Artefakt | Beweist |
|----------|---------|
| `worklog/proofs/330b-balance-reconcile.txt` — SQL available==Guard-Maß + csf_paid + Block-Pfad-Stichprobe | AC1/AC2/AC3 |
| `worklog/proofs/330b-ledger-rpc.txt` — functiondef + Grants + admin/non-admin-Call | AC2/AC4/AC5 |
| `worklog/proofs/330b-ui.png` — Playwright bescout.net Withdrawal-Tab (csf_paid + Kontoauszug), DE+TR | AC6 |
| `worklog/proofs/330b-vitest.txt` | AC7 |

## 11. Scope-Out

- **Deposit-RPC** (Anil-Entscheidung) — später bei Funding-Bedarf.
- Ledger-Pagination, Filter, CSV-Export.
- Per-Spieler-CSF-Breakdown (liquidation_events hat das bereits separat).
- Umbenennung Tab „withdrawal" → „treasury" (nur Anzeige ergänzt, Tab-Name bleibt).
- RAUS-Kanäle (Events/Polls/Bounties), Fan-Reward-Engine.

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT (get_club_balance-Consumer = AdminWithdrawalTab + request_club_withdrawal-RPC; beide wollen korrigierten Wert — additive Type-Erweiterung) → BUILD (selbst, Money) → REVIEW (reviewer Pflicht) → PROVE (4 Artefakte) → LOG.

## 13. Pre-Mortem

1. **get_club_balance v2 bricht request_club_withdrawal** — available sinkt, Withdrawal-Gate strenger. → Gewollt (das ist der Fix). Verifizieren dass kein bestehender Pending-Withdrawal dadurch inkonsistent wird (Pending zählt schon im Guard ab).
2. **PATCH-AUDIT** — Datei-Baseline ≠ live. → live functiondef als Baseline.
3. **Ledger-RPC 1000-Cap** — TABLE+range ignoriert. → JSONB-Array-Return.
4. **Ledger-Guard fehlt** — Geld-Bewegungen an non-admin. → club-admin/platform-admin-Guard wie get_club_balance.
5. **i18n-Leak** — Ledger-Typ ohne Label → roher Key im UI. → Fallback auf Typ-String + beide Locales.
6. **Doppel-Zählung withdrawals** — wenn ich Withdrawals SOWOHL als debit im ledger ALS AUCH separat zähle. → Withdrawals sind NICHT im Ledger (nur club_withdrawals-Tabelle); available = ledger_net − withdrawals bleibt korrekt, kein Doppelzug.

---

*Anil-Approval erbeten. Nach Approval: BUILD selbst (Money §3), dann Reviewer-Agent.*
