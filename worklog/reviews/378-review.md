# Review — Slice 378: special-Events zahlen Prize aus dem Plattform-Topf (E3 RAUS-Kanal #3)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-25 · **Scope:** Money/CEO · **time-spent:** 14 min

## verdict: PASS

Money-sauberer, chirurgischer additiver Spiegel von Slice 377. Zero-Sum über den ganzen Flow bewiesen (9/9 Force-Rollback-Smokes), source-CASE diskriminiert special/bescout ohne Regression, Club-Pfad byte-identisch, CHECK-Widen vollständig, i18n beide Locales mit MISSING_MESSAGE-sicherem Fallback. Einziger offener Punkt (tenant-only-Edit-Label-Drift) ist pre-existing, kosmetisch und bewusst dokumentiert. Merge-ready.

## findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW | resync, BEFORE UPDATE OF prize_pool,type | Pre-existing tenant-only-Edit-Lücke (377-Finding #1), jetzt auch für special. type-Switch bescout↔special bei gleichem Betrag → delta=0, Altzeilen-Label bleibt alte source. | Out-of-scope, Money korrekt (Geld im Topf), nur Label kosmetisch. Dokumentiert Spec §2/Edge 4/Pre-Mortem #3. |
| 2 | NIT | Migration | CREATE OR REPLACE ohne Trigger-Re-Attach (Bindings stabil, Proof bestätigt), identisch 377. | Kein Fix. |

## Money-Fokus (6 Punkte) — alle ✓
1. **Zero-Sum** ✓ — Escrow −P / score_event +D / Settle +(P−D); AC-03 net −8000, AC-04 net 0. Deckungs-Check strikt `<` unter `platform_treasury FOR UPDATE`.
2. **source-CASE, keine bescout-Regression** ✓ — `CASE WHEN type='special' THEN special_event ELSE bescout_event`; AC-06 empirisch: bescout bleibt bescout_event.
3. **Refund-source by OLD.type (Halter)** ✓ — resync delta<0 nutzt OLD.type (377-Learning), debit delta>0 nutzt NEW.type.
4. **CHECK-Widen vollständig** ✓ — alle 9 Altwerte + special_event; AC-08 constraintdef wortgleich.
5. **club + bescout byte-identisch zu 377** ✓ — AC-07 functiondef-Asserts true.
6. **i18n + Map** ✓ — DE „Sonder-Event"/TR „Özel Etkinlik" + Fallback `key?t(key):source` (kein MISSING_MESSAGE). Compliance neutral.

## errors-db.md Regression-Check — alle ✓
CREATE OR REPLACE PATCH-AUDIT (Baseline live), Escrow+Settle+Resync S331 + Multi-Treasury S377, status/type-CHECK-Drift (db-invariants trackt Tabelle nicht), Bank-Ledger SUM unter Row-Lock.

## Learnings
Kein neues Pattern — sauberer Anwendungsfall der bereits kodifizierten S377-Multi-Treasury-Generalisierung. Bestätigt: dritter platform-finanzierter Event-Typ rein additiv anschließbar (source-CASE + Refund-by-Halter trug perfekt).
