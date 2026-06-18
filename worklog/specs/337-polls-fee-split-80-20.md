# Slice 337 — Polls-Fee-Split 30/70 → 20/80

**Slice-Type:** Migration + i18n + Doc · **Größe:** S · **CEO-Scope:** Ja — Fee-Change (CLAUDE.md §3, Anil 2026-06-18: 20% Plattform / 80% Creator, „passend zum BeScout-Konzept"). Money-Code → selbst.

## 1. Problem
Polls hatte mit **30% Plattform / 70% Creator** den höchsten Plattform-Cut aller Kanäle (Research 20, IPO 10, Trading ~3,5). Polls sind die Vereins-Geldmaschine (REIN, D86) → Verein/Creator soll mehr behalten. Anil-Entscheidung: **20/80** (wie Research). Kein Player-Pool-Anteil (Variante B verworfen — minimaler Eingriff).

## 2. Lösung
`cast_community_poll_vote`: `v_creator_share := (v_cost * 80) / 100` (war 70). Rest (Wallet-Abzug, Treasury/Wallet-Routing, transactions, weight-Logik aus 336) **byte-identisch**. Plattform-Anteil bleibt impliziter Burn (jetzt 20%). + alle 70/30-Referenzen (i18n DE+TR, business.md, polls.md, treasury.md, trading.md) auf 80/20.

## 3. Files
| File | Änderung |
|------|----------|
| `supabase/migrations/20260618180000_slice_337_polls_fee_80_20.sql` | cast_community_poll_vote `*80/100`, AR-44 |
| `messages/de.json` + `tr.json` | createPollSubtitle, pollClubRevenueHint, pollPriceHint (70→80, 30→20) |
| `.claude/rules/business.md` | Fee-Split-Tabelle Polls 30→20 / 70→80 |
| `docs/knowledge/domain/polls.md` | §3/§9 „70 % Creator / 30 % Plattform" + „(70/30)" → 80/20 |
| `docs/knowledge/domain/treasury.md` | Fee-Splits-Zeile „Polls 30/70" → „Polls 20/80" |
| `.claude/rules/trading.md` | „Polls: 70% Creator, 30% Platform" → 80/20 |

## 4. Code-Reading (erledigt)
1. ✅ Live `cast_community_poll_vote` (pg_get_functiondef, post-336) — `v_creator_share := (v_cost * 70) / 100` ist die einzige %-Zeile; `v_platform_share := v_cost - v_creator_share` (Rest = Burn) bleibt korrekt bei 80.
2. ✅ grep aller 70/30-Poll-Referenzen (6 Doc/i18n-Stellen).
3. ✅ 336-Money-Branches als Baseline (Treasury/Wallet/weight) — unverändert übernehmen.

## 5. Pattern-Refs
- errors-db.md „CREATE OR REPLACE PATCH-AUDIT" (156) — Body = 336-Live + nur %-Zeile.
- CLAUDE.md §3 Fee-Change = CEO (approved). AR-44 REVOKE/GRANT.
- business.md Fee-Split = SSOT → Tabelle mit-anpassen (sonst Drift).

## 6. Acceptance Criteria
- AC-01 cast_community_poll_vote: creator_share = 80% von cost, platform_burn = 20%. VERIFY: Money-Smoke (Rollback) cost=1000 → creator_share=800, wallet-Routing +800.
- AC-02 Geld-Routing unverändert (source='club'→Treasury 800, source='user'→Wallet 800). VERIFY: Smoke beide Pfade.
- AC-03 weight-Logik (336) erhalten. VERIFY: Smoke Abonnent weight=2, creator_share trotzdem 800 (Geld ≠ Gewicht).
- AC-04 AR-44 anon=false. VERIFY: has_function_privilege.
- AC-05 i18n DE+TR + business.md/polls.md/treasury.md/trading.md alle 80/20, keine 70/30-Poll-Referenz mehr. VERIFY: grep.

## 7. Edge Cases
| # | Fall | Erwartet |
|---|------|----------|
| 1 | cost=0 Gratis-Poll | creator_share=0 (unverändert) |
| 2 | Bestehende Votes (vor Change) | creator_earned historisch 70% — kein Backfill (Vergangenheit korrekt) |
| 3 | Abo weight=2 | Tally 2, Geld 80% von 1×cost |
| 4 | Rundung cost ungerade | (cost*80)/100 Integer-Division — Rest bleibt Burn (kein Verlust) |

## 8. Self-Verify
```
Money-Smoke (BEGIN;…ROLLBACK;): club-Poll cost=1000 → creator_share 800, Treasury +800; user-Poll → Wallet +800.
mcp: has_function_privilege('anon', cast_community_poll_vote) = false
grep -rn "70%|30%|70 %|30 %|70/30|30/70" messages .claude/rules docs | grep -i poll → 0
pnpm exec tsc --noEmit · vitest communityPolls
```

## 9. Open-Q
✅ CEO: 20/80 (Anil). Variante mit Player-Pool verworfen. Autonom: Doc-Wording.

## 10. Proof
- Money-Smoke (Rollback): creator_share=800/platform 200 beide Routing-Pfade → 337-smoke.txt
- grep 0 stale 70/30-Poll-Refs · vitest · tsc

## 11. Scope-Out
- Kein Player-Pool/PBT-Anteil für Polls (Variante B, verworfen). Andere Kanäle (Trading/IPO/Research/Bounty) unverändert. Predictions-Removal = Slice 338.

## 12. Stage-Chain
SPEC → IMPACT (trivial, in §3) → BUILD → REVIEW (Money-Fokus %-Erhalt) → PROVE (Money-Smoke) → LOG.

## 13. Pre-Mortem
1. %-Zeile geändert, aber platform_share-Berechnung (`cost - creator_share`) muss Rest nehmen → 20% automatisch. ✓ (kein zweiter Hardcode).
2. Doc-Drift: business.md-Tabelle = SSOT; alle 6 Stellen mit-anpassen sonst Reviewer-Catch.
3. Money-Branch-Erhalt: nur die eine %-Zeile, sonst 336-Body identisch.
4. AR-44 Grant-Reset.
