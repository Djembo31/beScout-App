# Slice 370 — E2E-Sweep „Fees REIN" ②–⑤ (IPO/Poll/Research/Bounty)

**Slice-Type:** Verify (Money, CEO-Scope §3)
**Größe:** S
**Datum:** 2026-06-24

## 1. Problem-Statement
Bei Slice 365 wurde der Trading-Fee-REIN-Pfad einmal echt End-to-End auf der Live-DB durchgespielt (Topf +35 = 3,5 %). Die vier anderen Plattform-Fee-Quellen (IPO 10 %, Poll 20 %, Research 20 %, Bounty 5 %) sind als RPC gebaut (358/360/363/364/365) + per vitest grün, aber noch **nicht** einzeln live durchgespielt. `worklog/notes/365-e2e-findings.md` führt ②–⑤ als „offen". Ziel: jede Fee real auslösen → beweisen, dass sie mit korrektem `source` + Betrag in `platform_treasury_ledger` landet → dabei Bugs jagen.

## 2. Lösungs-Design
Kein Produktionscode geplant (reine Verifikation). Pro Quelle: (1) Live-Seed via `execute_sql` (Service-Role-INSERT), (2) Fee-RPC live callen mit JWT-sub-Impersonation (Seed-Rezept `testing.md`), (3) Pot-Ledger-Delta gegen Erwartung prüfen. Funde → Findings-File; echte Bugs → je eigener Folge-Slice (Reviewer-Pflicht bei Code).

## 3. Betroffene Files
- Keine src/-Änderung erwartet. Proof: `worklog/proofs/370-fees-rein-sweep.txt`. Findings-Update: `worklog/notes/365-e2e-findings.md`.

## 4. Code-Reading (VOR Build — erledigt)
1. Live `pg_get_functiondef`: `cast_community_poll_vote` / `unlock_research` / `approve_bounty_submission` (D87) ✅ gelesen — Fee-Mathe + Booking-Stelle verifiziert.
2. `book_platform_treasury` source-CHECK (poll/research/bounty erlaubt?) — implizit durch Live-Prod-Runs der RPCs (358/363/364/365) bewiesen.
3. ② IPO: Topf hatte vor Start schon `ipo`-Zeile (500) aus dem 369-AC5-IPO-Kauf → ② bereits live bewiesen, nur Reconcile.

## 5. Pattern-References
- Seed-Rezept (JWT-sub-Impersonation in einer Transaktion) — `.claude/rules/testing.md`.
- D96/D98 voller Auffang 100 %, Variante A Saldo=SUM (D97).

## 6. Acceptance Criteria
- **AC1 (②IPO):** `platform_treasury_ledger` enthält ≥1 `source='ipo'`-Zeile aus echtem `buy_from_ipo` (Reconcile 369-AC5: 500 = 10 % von 5000). VERIFY: SQL group-by.
- **AC2 (③Poll):** echter `cast_community_poll_vote` (cost 1000) → genau +200 `source='poll'`; Creator +800; Wähler −1000. VERIFY: pre/post Pot + Wallets.
- **AC3 (④Research):** echter `unlock_research` (price 1000) → +200 `source='research'`; Autor +800. VERIFY.
- **AC4 (⑤Bounty):** echter `approve_bounty_submission` (reward 1000) → +50 `source='bounty'`; Submitter +950; Payer −1000. VERIFY.
- **AC5 (Zero-Sum):** je Quelle Wallet-Abfluss = Creator/Submitter-Share + Pot-Fee (kein Geld erzeugt/vernichtet). VERIFY arithmetisch.
- **AC6 (Reject money-safe):** mind. 1 Reject-Pfad (z.B. bereits abgestimmt) lässt Wallet + Pot unverändert. VERIFY.

## 7. Edge Cases
| Fall | Erwartung |
|---|---|
| Doppel-Vote | reject „Bereits abgestimmt", Pot unverändert |
| Eigene Poll/Research | reject, kein Booking |
| cost/price/reward = 0 | kein Pot-Booking (IF share>0) |
| Bounty bereits approved | reject „bereits bearbeitet" |
| Pot-Saldo = SUM | Delta exakt = Fee |

## 8. Self-Verification Commands
```sql
SELECT source, count(*), sum(amount) FROM platform_treasury_ledger GROUP BY source ORDER BY source;
```
Pre/Post je Szenario; Wallet-Deltas der 3 Actors.

## 9. Open-Questions
- Pflicht-Klärung: keine (Verifikation bestehender, CEO-approved Fee-Logik).
- Autonom: Seed-Beträge (runde 1000), Actor-Wahl (jarvis/nailoku/kede5).

## 10. Proof-Plan
`worklog/proofs/370-fees-rein-sweep.txt` = pre/post Pot-Ledger + RPC-Returns + Wallet-Deltas je Szenario. Findings → `365-e2e-findings.md`.

## 11. Scope-Out
- UI-Flow per Playwright (RPC-Live-Call genügt als Fee-REIN-Beweis; ① nutzte UI, ②–⑤ via RPC = gleicher Code-Pfad). Echte Bug-Fixes = Folge-Slices.
- E3 Slice 3 (Monats-Liga RAUS-Kanal) bleibt danach.

## 12. Stage-Chain
SPEC ✅ → IMPACT skipped (kein Schema/Service-Edit) → BUILD (Seeds+RPC-Calls) → REVIEW self-review (kein Prod-Code; Money-Logik unverändert) → PROVE (Pot-Deltas) → LOG.
