# Proof — Slice 332: Club-Bounties ans Treasury (Escrow bei Erstellung)

Datum: 2026-06-17 · Projekt skzjfhvgccaeplydsunz · alle Mutationen force-rolled-back.
Test-Club 4ed03e4b (Admin 3c580b9e, available 2.022.182).

## Wave 1 — DB (force-rollback Lebenszyklus)
```
AC1 club-bounty:    escrowed=t  debit=100000  available 2022182->1922182  (exakt reward raus)
AC4 user-bounty:    escrowed=f  ledger=0       (Treasury unberührt)
AC2 Nicht-Admin:    INSERT Club-Bounty → RAISE not_club_admin_for_bounty  (Identitätsgrenze)
cancel  (open->cancelled):  credit=50000  (voller Refund)
closed  (open->closed):     credit=50000  (voller Refund)
completed (open->completed): credit=0  flag=f  (Escrow geliefert, kein Refund)
grandfathered (flag=false):  credit=0  (kein Refund für nie-debitierte)
```

## Kern-Beweis — approve aus Treasury statt Admin-Tasche (behavioral, force-rollback)
Escrowtes Club-Bounty (reward 100.000), Submission, `approve_bounty_submission` als Admin:
```
approve = {success:true, reward:95000}
admin  1000000 -> 1000000   (UNVERÄNDERT — escrowt → KEIN Admin-Wallet-Abzug)
submitter 4949801 -> 5044801 (+95000 = reward − 5% Plattformgebühr)
bounty status=completed  treasury_escrowed=f
```
→ Net: Treasury −100.000 (Erstellung) · Submitter +95.000 (approve) · 5.000 Plattformgebühr (burn). **Verein zahlt aus der Kasse, nicht der Admin aus eigener Tasche.** Zero-sum.

## Prereq-Fix (entdeckt in PROVE) — bounties_status_check
`bounties_status_check` kannte nur open/closed/cancelled — **NICHT 'completed'** (das approve_bounty_submission setzt) → JEDE Bounty-Annahme failte (23514). Verifiziert latent: 0 approved submissions je. Ohne Fix = kein Auszahl-Pfad (Slice unmöglich). Migration ergänzt 'completed' additiv. Approve-Behavioral-Test oben beweist Fix end-to-end.

## Wave 2 — App
- `errorMessages.ts`: +2 ERROR_MAP (`treasury_insufficient_for_bounty`→bountyTreasuryInsufficient · `not_club_admin_for_bounty`→bountyNotClubAdmin).
- i18n DE+TR (2 Keys je Locale).
- approve_bounty_submission unverändert in Verkabelung (nur Payer-Skip bei escrowt).

## tsc + Struktur
```
pnpm exec tsc --noEmit → EXIT 0
i18n: 2/2 de.json, 2/2 tr.json
4 Trigger/Funcs: escrow (BEFORE INSERT) · settle (BEFORE UPDATE OF status) · resync (BEFORE UPDATE OF reward_cents, Defense-in-Depth) · approve-Edit (PATCH-AUDIT live baseline)
```

## AC3 (Unterdeckung) = strukturell
reward_cents ist auf 100.000 (CHECK) gedeckelt; Test-Clubs haben Millionen → behavioral nicht auslösbar. Guard ist strukturell identisch zu Slice 331 AC2 (`treasury_insufficient_for_bounty`, clubs FOR UPDATE + ledger_net − withdrawals) — dort behavioral bewiesen.

## Pre-Existing geflaggt (separat)
- bounties_status_check fehlte 'completed' → Approval war komplett broken (gefixt hier, da blockierend).
- reward_cents-Max im CHECK (100.000) ≠ RPC-Fehlertext ("Maximum 1.000.000 $SCOUT") — Inkonsistenz, nicht hier gefixt.
