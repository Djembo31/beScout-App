# Review — Slice 330b: Treasury-Saldo Debit-Reconcile + Kontoauszug

Reviewer: Cold-Context-Agent · 2026-06-17 · time-spent: 9 min

## Verdict: PASS

3 NITs, keine BLOCKER/MAJOR.

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | migration get_club_treasury_ledger | Doppeltes ORDER BY (Subquery-LIMIT + jsonb_agg) — korrekt & nötig; nur Anzeige-Reihenfolge, kein Money-Effekt. created_at-Tiebreaker wie 329. | Belassen; optional seq-Spalte (Backlog). |
| 2 | NIT | AdminWithdrawalTab:12-16 | KNOWN_LEDGER_TYPES = 2. Kopie der Typ-Liste (Migration + i18n). Drift-Risiko, aber Fallback `?? type` crasht nicht. | Optional: Set aus i18n-Map ableiten. |
| 3 | INFO | club.ts:756 | DbTreasuryLedgerEntry-Cast ohne Discriminator — hier korrekt (RPC liefert garantiert []/Array fixer Shape, kein Union). `?? []` + error-throw. | Kein Fix. |

## Kern-Verifikation (Money)
**Konsistenz available == 330-Guard == request_club_withdrawal:** alle drei rechnen `SUM(credit)−SUM(debit)−Withdrawals` mit identischem Withdrawal-Status-Filter (pending/approved/paid). `request_club_withdrawal` liest `get_club_balance` intern via PL/pgSQL → Fix propagiert automatisch, keine Redefinition nötig. **Withdrawal-Leck geschlossen.**
**Keine Doppel-Zählung:** Withdrawals nur in club_withdrawals (nicht im Ledger) → ledger_net − withdrawals zählt nicht doppelt.
**total_earned (excl. deposit) vs available (alle Credits):** bewusst — „verdient" ≠ „verfügbar".

## Fokus-Fragen
- Ledger-RPC JSONB-Return korrekt gegen 1000-Cap (270d-Pattern); LIMIT clamped (50/200/1, NULL-safe); admin-Guard 1:1; AR-44 ✓.
- i18n business.md-konform: ipo_fee→„Erstverkauf-Gebühr" (kein user-facing IPO), event_prize/poll_reward→„Belohnung" (kein „Preis", StGB §284), csf neutral.
- UI: Mobile 393px (2 cols), Loading/Empty-States, formatScout, ledgerTypeLabel-Fallback (kein i18n-Crash), aria-hidden, U+2212 Minus.
- 5 alte Keys erhalten, additive Type-Erweiterung, beide Consumer wollen korrigierten Wert.

## Security (AR-44/095)
Beide RPCs REVOKE PUBLIC+anon, GRANT authenticated/postgres/service_role. Ledger-Return = Geld-Bewegungen → club-admin/platform-admin-Guard (verifiziert non-admin → not_authorized).

## Summary
Minimal-invasiver Money-Fix: ein Saldo-RPC korrigiert, propagiert auf Guard + Withdrawal-Gate. Patterns (270d JSONB, 329 SUM, AR-44, 095) korrekt wiederverwendet. PASS.
