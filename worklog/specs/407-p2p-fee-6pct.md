# Slice 407 — P2P-Offer-Fee auf 6 % (= Markt) angleichen [Welle 1.4a]

**Slice-Type:** Migration (+ UI-1-Zeile + Compliance-Doc)
**Größe:** S
**CEO-Scope:** JA (Fee-Änderung) — Anil approved 2026-06-27: „P2P = 6 % wie Markt".
**Welle:** Mock→Pro Welle 1 Trading, 1.4a (aus D112 Fork-B-Härtung).

## 1. Problem-Statement (Evidence)
P2P-Angebote (`offers`/`accept_offer`) kosten **3 %** (offer_*: 200/50/50 bps), das Orderbuch **6 %** (trade_*: 600/150/100). Live verifiziert (`fee_config`, 1 Zeile club_id=NULL). Folge: einen Spieler direkt per P2P zu handeln ist **halb so teuer** wie über den Markt → unterläuft das Orderbuch und halbiert die Plattform-Fee. Unter D112 (beide Mechaniken behalten) muss die Fee kohärent sein. **CEO-Entscheid: P2P = 6 % wie Markt** (gleicher Split 3,5 % Platform + 1,5 % PBT + 1 % Club).

## 2. Lösungs-Design
Eine Migration `20260627140000_slice_407_p2p_fee_6pct.sql`:
1. `UPDATE fee_config SET offer_platform_bps=350, offer_pbt_bps=150, offer_club_bps=100` (alle Zeilen; aktuell nur die NULL-Default-Zeile).
2. `accept_offer` CREATE OR REPLACE — Body 1:1 aus Live-functiondef (Stand nach Slice 406), NUR die 3 COALESCE-Defaults `,200`→`,350` / `,50`→`,150` / `,50`→`,100` (deckt künftige NULL-offer_*-Rows ab, kein 3 %-Leak).
Plus UI + Compliance:
3. `OffersTab.tsx:103` Fee-Vorschau `total * 300 / 10000` → exakt wie RPC (3-teilig: `floor(t*350/1e4)+floor(t*150/1e4)+floor(t*100/1e4)`) → Anzeige == Charge.
4. `business.md` Fee-Split-Tabelle P2P-Zeile `2 %/0,5 %/0,5 %` → `3,5 %/1,5 %/1 %`.

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `supabase/migrations/20260627140000_slice_407_p2p_fee_6pct.sql` | NEU — UPDATE fee_config + accept_offer COALESCE 350/150/100 |
| `src/features/market/components/portfolio/OffersTab.tsx` | Z.103 Fee-Calc 300 → exakte 3-Teil-Summe (6 %) |
| `.claude/rules/business.md` | Fee-Split P2P Offers 2/0,5/0,5 → 3,5/1,5/1 |
| ggf. `src/features/market/components/portfolio/__tests__/OffersTab.test.tsx` | falls Fee-Wert asserted |

## 4. Code-Reading-Liste (vor BUILD — erledigt, Live)
1. `fee_config` live: 1 Zeile club_id=NULL, offer 200/50/50, trade 600/150/100. ✓
2. `pg_proc` prosrc ILIKE offer_*_bps → nur `accept_offer` liest sie. ✓
3. `accept_offer` Live-Body (aus 406): `v_platform_fee=(total*COALESCE(offer_platform_bps,200))/10000`, analog pbt/club, `v_total_fee=Σ`, Routing platform→`book_platform_treasury('p2p')`, club→trades-Trigger-Ledger, pbt→pbt_treasury. ✓
4. `OffersTab.tsx:103` `fee = Math.floor(total*300/10000)` = hartcodiert 3 % (Vorschau „Verkäufer erhält"). Einzige UI-Fee-Stelle (OfferModal hat keine). ✓
5. `business.md` Fee-Split-Tabelle Zeile „P2P Offers | 2% | 0.5% | 0.5%". ✓

## 5. Pattern-References
- **§3 CLAUDE.md:** Fee-Änderung = CEO approved (✓ Anil). Money selbst, nicht delegieren.
- **S156 PATCH-AUDIT:** accept_offer Body aus Live-functiondef, nur 3 Konstanten ändern, Rest byte-identisch.
- **S356 Konstanten-Audit:** Money-RPC-Patch MUSS Fee-Konstanten asserten (hier 350/150/100, Σ=600).
- **Welle-1 „was du siehst = was du zahlst" (S404/405):** UI-Fee-Vorschau muss exakt der RPC-Berechnung folgen.

## 6. Acceptance Criteria
- **AC-1 [HAPPY] 6 % live:** force-rollback `accept_offer`-Smoke → `platform_fee=3,5 %`, `pbt_fee=1,5 %`, `club_fee=1 %` von total, Σ=6 %. FAIL-IF: ≠.
- **AC-2 [ZERO-SUM]:** TOTAL (Σwallets+platform_net+club_ledger_net+Σpbt) vor==nach diff=0. FAIL-IF: ≠0.
- **AC-3 [DATA]:** `fee_config` offer_platform_bps=350/pbt=150/club=100 alle Zeilen. FAIL-IF: noch 200/50/50.
- **AC-4 [DEFAULT]:** `accept_offer` functiondef enthält `,350)`/`,150)`/`,100)` (nicht mehr `,200)`/`,50)`). FAIL-IF: alte Defaults.
- **AC-5 [UI] Anzeige==Charge:** OffersTab Fee-Preview = RPC-Fee (3-Teil-Floor, 6 %). tsc+vitest grün. FAIL-IF: zeigt noch 3 %.
- **AC-6 [REGRESSION] accept_offer byte-identisch außer 3 Konstanten:** auth_uid_mismatch + book_platform_treasury('p2p') + pbt-Insert + circular/limit-Guards erhalten. FAIL-IF: Guard fehlt.
- **AC-7 [COMPLIANCE]:** business.md P2P-Zeile = 3,5/1,5/1.

## 7. Edge Cases
| Fall | Verhalten | AC |
|------|-----------|----|
| buy-offer (sender lockt total) | total unverändert (price*qty), nur Fee-Split↑ → Seller nettet weniger | AC-1 |
| sell-offer | identisch, gemeinsamer Fee-Block | AC-1 |
| club_id NULL Spieler | club_fee>0 aber club_id NULL → kein Ledger (Trigger no-op), platform+pbt normal; Zero-Sum hält (Geld bleibt bei Buyer-Abzug→platform+pbt) | AC-2 |
| Rundung (3× floor vs 1× floor) | UI spiegelt RPC exakt (3-Teil) | AC-5 |
| künftige per-club fee_config-Row mit NULL offer_* | COALESCE-Default jetzt 6 % statt 3 % | AC-4 |

## 8. Self-Verification
```sql
SELECT offer_platform_bps, offer_pbt_bps, offer_club_bps FROM fee_config;  -- 350/150/100
SELECT pg_get_functiondef('public.accept_offer(uuid,uuid)'::regprocedure) ILIKE '%offer_platform_bps, 350%';  -- true
```
```bash
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/features/market/components/portfolio/__tests__/OffersTab.test.tsx
```

## 9. Open-Questions
- **CEO (geklärt):** P2P-Fee = 6 % wie Markt, Split 3,5/1,5/1. ✓
- **Autonom (CTO):** Migrations-Timestamp, UI-Fee-Berechnung exakt-3-Teil, Test-Anpassung.

## 10. Proof-Plan
- `worklog/proofs/407-money-smoke.txt` — force-rollback accept_offer: Fee-Split 6 % + Zero-Sum diff=0 + fee_config-Werte + functiondef-Konstanten.
- `worklog/proofs/407-vitest.txt` — OffersTab-Test grün.

## 11. Scope-Out
- IPO-Ledger-Label `trade_fee`→`ipo_fee` (eigener Mini-Slice, aus 406). · 1.4b UI-Klarheit · 1.4c offers-Robustheit · 1.4d Buy-Limit-Doc.

## 12. Stage-Chain
SPEC ✅ → IMPACT skipped (Consumer §4 live-gegreppt: nur accept_offer liest bps, 1 UI-Stelle) → BUILD (1 Migration + 1 UI + business.md + ggf. Test) → REVIEW (Money-Pflicht) → PROVE (force-rollback 6 %+Zero-Sum + vitest) → LOG.

## 13. Pre-Mortem (S, Money)
1. **accept_offer-Body bei Replace verändert** → Live-Body 1:1, nur 3 Konstanten; AC-6 Guard-ILIKE + Reviewer.
2. **UI-Rundung ≠ RPC** → 3-Teil-Floor exakt spiegeln (AC-5).
3. **business.md vergessen** → AC-7 + Compliance-Pflicht.
4. **fee_config-UPDATE trifft 0 Zeilen** (Filter falsch) → `WHERE TRUE` (alle), AC-3 verifiziert.
5. **Zero-Sum-Bruch** → Fee bleibt vollständig verteilt (platform+pbt+club), nur Split↑; AC-2 beweist diff=0.
