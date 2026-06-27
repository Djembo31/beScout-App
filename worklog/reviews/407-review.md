# Review — Slice 407 (P2P-Offer-Fee auf 6% = Markt)

**Reviewer:** Cold-Context reviewer-Agent · 2026-06-27 · time-spent ~7 min
**Verdict: CONCERNS → geheilt → PASS**

## Findings
| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | LOW | `src/types/index.ts:1041-1044` | Stale-Kommentar: FeeConfig-Typ sagte noch „3% = 2%+0,5%+0,5%" / default 200/50/50. Kein Code-Effekt, aber Stale-Trap-Klasse. | **GEHEILT** — Kommentare auf 6% / 350/150/100 aktualisiert. |

## Belege (5 Prüfpunkte)
1. **PATCH-AUDIT (S156): PASS** — accept_offer-Body 1:1 aus 406-Stand, NUR die 3 COALESCE-Defaults (350/150/100) geändert. Alle Guards erhalten: auth_uid_mismatch, Escrow-Unlock buy-offer (3 Stellen), self-offer-Block, liquidation, club-admin-Verbot, circular 7d, 20/24h-Limit, advisory_lock. Counter-Write-Kommentar (406) erhalten — kein treasury_balance_cents-Write zurück.
2. **Fee-Korrektheit: PASS** — 350+150+100=600 bps=6%=Markt-Split. Smoke total=20000 → platform=700/pbt=300/club=200, Σ=1200, seller_net=18800.
3. **UI Anzeige==Charge: PASS** — OffersTab 3 separate Math.floor (350/150/100) spiegelt RPC byte-genau, kein 1×600-Rundungsdrift.
4. **Konsistenz: PASS (nach Heal)** — business.md + trading.md angeglichen; OfferModal hat keine Fee-Vorschau (einzige UI-Stelle = OffersTab); index.ts-Kommentar geheilt.
5. **Zero-Sum/Routing: PASS** — platform→book_platform_treasury('p2p'), club→trades-Trigger-Ledger, pbt→pbt_treasury alle erhalten; Smoke diff=0.

Migration-Hygiene: kein REVOKE/GRANT-Block korrekt (CREATE OR REPLACE bestehender Fn, gleiche Signatur → ACL erhalten, S368c).

## One-Line
Ja — Senior merged das: saubere, atomare, CEO-approvte Fee-Änderung, byte-genaue RPC, Routing/Zero-Sum erhalten, UI==Charge, Docs synchron; einziges Finding (Stale-Kommentar) geheilt.

## Knowledge (Reviewer-Vorschlag)
Fee-Bps-Wert-Migration = zusätzliche Sync-Achse `// default N`-Kommentare in index.ts (verwandt S330 4-File-Sync, rein dokumentarisch) — optional Halbsatz bei S356.
