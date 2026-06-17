# Proof — Slice 330b: Treasury-Saldo Debit-Reconcile + Kontoauszug

Datum: 2026-06-17 · Projekt skzjfhvgccaeplydsunz · mutierende Smokes force-rolled-back.

## AC1–AC3 — available reflektiert Debits (behavioral, force-rollback)
Club von Spieler 2a2fee38 liquidiert (CSF 770.000), get_club_balance vor/nach im selben TX:
```
csf_debited=770000 | available 886347 -> 116347 (delta 770000) | csf_paid=770000
drop_matches=t   (avail-delta == csf_debited AND csf_paid == csf_debited)
ledger_top_type=csf   csf_rows_in_top5=1
(ROLLED BACK)
```
→ `available = Ledger-Netto − Withdrawals` (identisch 330-Guard-Maß). csf_paid + total_debited exposed.

## AC4 — get_club_treasury_ledger admin-Guard
```
non-admin (random uuid) → AC4_RESULT: not_authorized: Kein Club-Admin oder Platform-Admin
```
Ledger-Top-Eintrag im Reconcile-Test war direction=debit type=csf (JSONB-Array, newest-first).

## AC5 — Grants beide RPCs
```
get_club_balance         : authenticated,postgres,service_role
get_club_treasury_ledger : authenticated,postgres,service_role
(kein anon, kein PUBLIC)
```

## AC7 — tsc + vitest
```
pnpm exec tsc --noEmit → EXIT 0
vitest (club.test + admin): 10 Files / 217 Tests passed
  inkl. neu: getClubTreasuryLedger (3 cases) + getClubBalance csf_paid-Assertion
```

## AC8 — i18n DE+TR
```
wdCsfPaid/ledgerTitle/ledgerEmpty: 3/3 in de.json, 3/3 in tr.json
ledgerType: 13 Typen je Locale (trade_fee…bounty)
TR (Anil-bestätigt): Hesap Hareketleri / Ödenen CSF
```

## AC6 — UI (post-deploy, Anil-Visual)
AdminWithdrawalTab: 5. Balance-Karte „CSF ausgezahlt" (rose) + Kontoauszug-Section (Credits grün +, Debits rose −, Typ-Label, balance_after, timeAgo). Owner-gated Tab → Anil verifiziert post-Vercel-Deploy auf bescout.net /club/<slug>/admin → Tab „withdrawal". Daten-Pfad bereits SQL-bewiesen (AC1-4).

## Konsistenz-Kern
Guard (330) == get_club_balance.available (330b) == request_club_withdrawal-Gate: alle drei rechnen jetzt `SUM(credit)−SUM(debit)−Withdrawals`. Das Withdrawal-Leck (CSF doppelt abhebbar) ist geschlossen.
