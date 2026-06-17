# Review — Slice 330: CSF-Engine ans Treasury

Reviewer: Cold-Context-Agent · 2026-06-17 · time-spent: 14 min

## Verdict: PASS

3 NITs, keine BLOCKER/MAJOR.

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `liquidation.ts:33-42` | Service-Return-Type nicht um `csf_debited_cents` erweitert (Spec: additiv-safe, Service liest nicht). Korrekt & ungefährlich, aber neues Feld für 330b-Treasury-UI nicht durchgereicht. | Optional 330b: `csf_debited_cents?: number` aufnehmen. |
| 2 | NIT | `migration 130000` | `liquidation_events.success_fee_cents` initial 0, danach korrigiert — 2 Writes (Baseline-Verhalten, kein Bug). | Belassen (Baseline-Treue > Mikro-Opt). |
| 3 | NIT | TR-i18n | `successFee: "Topluluk Bonusu"` neu — per feedback_tr_i18n_validation Anil-Sichtung. Identisch zu 8+ bestehenden approveten "Topluluk Bonusu"-Strings. | Anil kurz bestätigen. |

## Fokus-Fragen (durchgeprüft)
1. **Guard race-frei?** JA — `clubs FOR UPDATE` = selber Serialisierungspunkt wie book_club_treasury (329b). SUM-Read + Debit atomar.
2. **Debit == verteilte Summe?** JA — Debit = `v_actual_sf_distributed` (Σ FLOOR), nicht pool. Ledger==Wallets exakt, Staub bleibt im Treasury.
3. **RAISE rollt dedup zurück?** JA — Guard vor allen Writes + Completion-Update. Replay sauber.
4. **Pre-Loop-Entfernung?** Kein Seiteneffekt — Nenner `v_total_dpcs` korrekt, PBT+CSF teilen ihn.
5. **PBT proportional?** JA (CEO D-C), Quelle/Decrement unverändert, kein Consumer erwartet Gewichtung.
6. **Timestamp-Ordnung?** Korrekt (120000<120500<130000<130500), Greenfield-safe, keine Same-Day-Inversion.
7. **Übersehene Promise/tote Keys?** Sauber — 0 Treffer src/render + messages/. RewardsTab kein Treffer.

## Security (AR-44/J4)
REVOKE PUBLIC+anon, GRANT authenticated/postgres/service_role (Proof AC11). auth.uid()+club-admin-Guard 1:1. book_club_treasury REVOKE anon/authenticated → kein Client-Direkt-Debit.

## Business/Wording
"Community-Bonus"/"Topluluk Bonusu" glossar-konform. RAISE-Message intern (kein User-Leak). Ledger-Desc admin-intern ("CSF" erlaubt). Transaction-Desc "Community Bonus" user-facing wording-konform.

## Prereq-Fix (130500)
Echter latenter Money-Bug sauber gefangen: transactions_type_check fehlten pbt_liquidation+success_fee seit Slice 178 → jede Liquidation mit Auszahlung 23514-Fail. Additive Werte-Erweiterung, idempotent. Proof sf_tx_rows=11 beweist Fix end-to-end.

## Learnings (Knowledge-Flywheel)
- **errors-db.md (neu):** "transactions.type-CHECK-Drift — RPC schreibt neuen Typ ohne 4-File-Sync (CHECK+activityHelpers+de+tr)". Verwandt mit Slice-027 (activityHelpers Sync) + J5 AR-42 (Column-Mismatch). liquidate_player hatte 3/4 seit Slice 178.
- **patterns.md:** Treasury-Debit-Blueprint "Guard (SUM unter FOR UPDATE) → Writes → book-Debit der tatsächlich-verteilten Summe" für kommende RAUS-Kanäle.

## Summary
Solide konzept-treue Money-Migration. Race korrekt serialisiert, Ledger==Wallets exakt, UI-Promise vollständig zurückgebaut, latenter Prereq-Bug sauber mitgenommen. PASS.
