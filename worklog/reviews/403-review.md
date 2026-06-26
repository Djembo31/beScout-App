# Slice 403 Review — Welle 1.2: buy_from_ipo Idempotency-Key

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-26 · **Scope:** Money/Trading

## Verdict: PASS

Sauberer, eng gescopter Money-Slice. Doppelkauf-Schutz korrekt platziert (Reserve nach auth+quantity-Guard, vor advisory-lock; Completion vor RETURN), Money-Math nachweislich byte-identisch (PATCH-AUDIT + force-rollback Zero-Sum=0), AR-44 vollständig, beide Hooks verkabelt, Tests 97/97 grün. Keine kritischen/mittleren Findings — nur 2 NITs ohne Handlungsbedarf. **Mergebar.**

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `20260626190000_…sql:17` | `CREATE OR REPLACE` nach `DROP` statt `CREATE`. Funktional identisch; Geschwister-Migs (178e_a, 358) ebenso → konsistent. | Optional künftig `CREATE` ohne OR REPLACE. Keine Änderung nötig. |
| 2 | NIT | `e2e/bots/ai/actions.ts:149` | Bot-Caller ruft 3-Arg (kein Key) → läuft via DEFAULT NULL, kein Idempotenz-Schutz. Bewusst (QA-Bots, jeder Call neue Intent), in Spec §3 dokumentiert. | Belassen. |

## Money-Math-Verifikation (streng geprüft)

1. **Idempotenz-Platzierung:** Reserve-Block nach auth+quantity-Guard, VOR advisory-lock/DB-writes; Completion-UPDATE nach v_result-Assemble, vor RETURN. Cached-Replay-Pfad geschwister-identisch (358/178e_a). ✅
2. **Byte-identisch:** Fee-Split 85/10/5 (`ipo_club_bps,8500`/`ipo_platform_bps,1000`/pbt-Rest), clubs-UPDATE, pbt_treasury/_transactions, `book_platform_treasury('credit','ipo',…)`, holdings/trades/ipo_purchases/wallets/transactions(`ipo_buy`) — alle unverändert. Einzige Neuerungen = Signatur + 3 DECLARE + Reserve-Block + v_result-Indirektion + Completion. Laufzeit-Beweis: club_delta=8500 (2×4250), pbt=500 (2×250), topf=1000 (2×500), Zero-Sum=0. ✅
3. **DROP+CREATE + AR-44:** Signatur-Change = neue Funktion (sig_count=1, keine Overload); REVOKE PUBLIC+anon, GRANT authenticated+service_role vollständig. ✅
4. **Hook-Verkabelung:** beide IPO-Buy-Pfade reichen Key durch (market `useBuyFromIpo` umgestellt auf idempotent + player-detail `ipoBuyMut`); Optimistic/Invalidation unverändert; kein Build-without-Wire. ✅
5. **Edge Replay-nach-Fehler:** Key reserviert/response NULL → idempotency_pending bis TTL; Client mintet pro safeTrigger neuen Key → kein Reuse-Lockout. Geschwister-identisch (Welle-1-Konsistenz). ✅
6. **Tests:** Assertions korrekt angepasst (p_idempotency_key:null bzw. expect.any(String)). 97/97. ✅

## Blindspots geprüft — keine Regression
maxQuantityExceeded-Asymmetrie (Scope-Out 1.5), v_result::JSONB-Round-Trip verlustfrei, transactions append-only nicht berührt, kein CHECK-Drift (S330), Migration-Timestamp höher als Vorgänger (S326), kein neuer Wording-Drift („BSD" bleibt = Scope-Out 1.5).

## Knowledge Capture
Kein neues Pattern — saubere Anwendung von errors-db.md S178a-f. buy_from_ipo ist jetzt der 4. Money-RPC auf diesem Muster → Blueprint als Standard etabliert. Laufzeit-Delta-Assertion statt ILIKE (S356) ist gutes Anwendungsbeispiel.

**time-spent:** 14 min
