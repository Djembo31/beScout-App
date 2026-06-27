# Slice 410 Review — Club-Treasury-Ledger Quellen-Labels

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-27 · **time-spent:** 11 min

## Verdict: PASS (merge-fähig)

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | migration:36 | ELSIF prüft auch `buy_order_id IS NOT NULL` — heute toter Teilzweig (FEATURE_BUY_ORDERS gated), aber bewusste Forward-Compat (Spec §7). | — (intentional) |
| 2 | NIT | migration:35 / §11 | `v_desc='Erstverkauf-Anteil (85%)'` ist hardcoded DE-Sekundärzeile (nicht i18n). Konsistent mit Bestand (`'Trade-Fee'` ebenso); Display-Label kommt aus i18n. | Optional künftig desc i18n-fähig (eigene Slice) |

## Spec-Coverage
AC1 (3-Wege-Branch) ✅ · AC2 (IPO→ipo_fee) ✅ · AC3 (Markt→trade_fee, Regression) ✅ · AC4 (P2P→p2p_fee) ✅ · AC5 (Zero-Sum net_delta=300=Σclub_fee) ✅ · AC6 (ACL unverändert) ✅

## Detail-Verifikation
1. **Discriminator code-level eindeutig:** `buy_from_ipo` setzt `ipo_id`; `buy_player_sc`/`buy_from_order` setzen `sell_order_id` (immer); `accept_offer`-INSERT listet buy/sell_order_id/ipo_id GAR NICHT → alle NULL → ELSE fängt ausschließlich P2P. Kein Markt-/IPO-Buy fällt durch.
2. **Geldneutral:** `get_club_balance` v_trade_fees = `type IN ('trade_fee','ipo_fee','p2p_fee','opening_trade_fees')` → alle drei im selben Bucket, total_earned/available unverändert. Einziger type-Consumer = AdminWithdrawalTab (reines Display-Label); Withdrawal/CSF lesen Saldo nicht type → kein Consumer verzweigt bei den neuen Werten.
3. **Robustheit:** künftiges `buy_order_id` → ELSIF → `trade_fee` (korrekt Markt-Kategorie).
4. **PATCH-AUDIT (S156) byte-äquivalent:** club_fee<=0-Guard, club_id-NULL-Guard, book_club_treasury-Signatur unverändert; einzige Änderung = type/desc-Zuweisung. AR-44-Ausnahme (Trigger-Funktion, kein REVOKE/GRANT). ACL erhalten (S368c, AC6).
5. **Blindspots:** kein CHECK auf type (kein Widen/S330-Risiko); KNOWN_LEDGER_TYPES + i18n DE/TR vorhanden (kein Roh-Key-Leak S333); kein Backfill historischer 7 Rows = korrekte fix-forward-Hygiene.

## Knowledge
Kein neuer Bug → keine errors-*.md-Ergänzung. Pattern bereits durch S329/S406/S156 gedeckt.

## Summary
Sauberer geldneutraler Re-Label am einzigen kanonischen Club-Fee→Ledger-Writer. Discriminator code-level korrekt, Zero-Sum + ACL bewiesen, kein verzweigender Consumer. PASS.
