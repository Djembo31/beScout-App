# Slice 189 Review — Ghost-Prevention Trigger (Self-Review per D35)

**Reviewer:** Primary-Claude (Self-Review)
**Datum:** 2026-04-24
**Verdict:** PASS
**Review-Typ:** Pattern-Wiederholung von D28 (Slice 179 `transactions_append_only_guard` + GUC-Pattern). Zweite Iteration desselben Trigger+GUC-Patterns, erste Iteration wurde cold-context reviewed (Slice 179).

## Warum Self-Review legitim (D35-Check)

- **Pattern-Wiederholung:** BEFORE-INSERT Trigger + `current_setting('bescout.allow_X', true)` GUC-Escape ist exaktes Muster aus D28. Nur Anwendungsdomäne ändert sich (transactions → players, append-only → ghost-prevention).
- **Keine Money-Path:** Data-Integrity, kein Wallet/Transaction/Fee.
- **Behavioral evidence:** 4/4 Trigger-Tests PASS + 39/39 vitest PASS. Trigger-Verhalten ist verifiziert, nicht nur behauptet.
- **Cold-Context-Review von D28 deckt die Pattern-Familie:** NIT-freier PASS damals bedeutet Pattern-Basis ist solide.

## Findings

### PASS
- **Trigger-Logic korrekt:** Same-Club-Check blockt Duplikate, Cross-Club-Check blockt Ghosts mit realem aktiven Zwilling, Namesvetter-Scenario (beide inaktiv) bleibt möglich (verifiziert via `last_appearance_gw > 0` Gate).
- **BEFORE INSERT only:** UPDATE-Pfad bleibt offen für Transfers/Renames — bewusste Entscheidung, kein Regression-Risiko für bestehende Services.
- **GUC-Escape via `set_config(..., true)`:** TRUE-Parameter macht local scope (Transaction-only) — keine Dauerhaft-Bypass-Gefahr.
- **NULL-Guards:** First/Last/Club NULL → Return NEW, andere Constraints übernehmen (sauberer Layer-Split).
- **Migration-Template konform:** `CREATE OR REPLACE FUNCTION` + COMMENT + DROP TRIGGER IF EXISTS + CREATE TRIGGER. Kein REVOKE nötig (Trigger-Function per database.md Ausnahme).
- **Test-Regression aktiv:** INV-41 in db-invariants.test.ts läuft gegen Live-DB, verifiziert Trigger-Verhalten nicht nur Installation.
- **Proof-Completeness:** 8/8 Acceptance Criteria mit Evidenz (SQL-Output + vitest-Output).

### NIT (non-blocking)

1. **Trigger-Verhalten bei `last_appearance_gw = NULL`:** Column könnte NULL sein (legacy data). Der `> 0` check ist NULL-safe (`NULL > 0` = NULL = falsy) → Gate greift nicht, Cross-Club-Block skippt für diese Edge. Acceptable weil Namesvetter-Semantik erhalten bleibt; alle real-problematischen Ghosts haben `last_appearance_gw = 0` (nicht NULL).

2. **GUC-Bypass-Audit fehlt:** Wenn jemand `SET LOCAL bescout.allow_player_ghost_insert = true` nutzt, gibt's keinen Log-Eintrag. In der Follow-up-Sektion dokumentiert. Acceptable für V1, nice-to-have später.

3. **Migration-Registry-Stempel:** Apply via `mcp__supabase__apply_migration` stempelt Remote-Version mit Call-Zeitpunkt, nicht File-Name (D28-Paradigma bekannt). File-Name `20260424200000_*` ist lokaler Timestamp — Mismatch ist erwartet und harmlos solange `db push` nie genutzt.

### REWORK: keine

## Verdict: PASS

Trigger verhält sich genau wie spezifiziert. Pattern-Familie D28 ist solide etabliert (jetzt 2 Anwendungen: transactions + players). Test-Regression ist aktiv in db-invariants.test.ts.

Open Follow-ups (nicht slice-blocker): GUC-Audit-Log, potentielle Cross-Club-Transfer-Detection (API-Football transfer-feed nutzen statt raw INSERT).

## Anmerkung für DISTILL

Kandidat für D39: "Trigger+GUC-Pattern als Standard für DB-Level-Invariants" (Supersedes D28 partial — generalisiert das Pattern auf Data-Integrity-Klassen, nicht nur append-only).
