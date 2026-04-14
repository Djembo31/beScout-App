---
name: Journey 2 — Aggregated Findings
description: Synthese aus 3 parallel Audits (Frontend/Backend/Business) fuer IPO-Kauf. Autonom-Fixable vs CEO-Approval-Triggers.
type: project
status: ready-for-healer
created: 2026-04-14
---

# Journey #2 — Aggregated Findings (IPO-Kauf)

**Total: 49 Findings — 8 CRITICAL + 13 HIGH + 17 MEDIUM + 11 LOW**

Quellen: [journey-2-frontend-audit.md](journey-2-frontend-audit.md) (19), [journey-2-backend-audit.md](journey-2-backend-audit.md) (16), [journey-2-business-audit.md](journey-2-business-audit.md) (14)

## Cross-Audit Overlaps (doppelt gefunden = hoch konfident)

| Bug | FE | BE | Business |
|-----|----|----|----------|
| i18n-Key-Leak Buy-Error | J2F-01 | — | C1 |
| TradingDisclaimer BuyConfirmModal fehlt | J2F-08 | — | H1 |
| IPO-Vokabel-Ambiguitaet | — | — | M2+M3 |
| hardcoded-CR/SC/$SCOUT Kuerzel | J2F-17, 19 | — | H3, M6, M7 |

## Autonome Beta-Gates (Healer jetzt, kein CEO noetig)

| ID | Severity | File | Fix |
|----|----------|------|-----|
| FIX-01 | CRITICAL | `useTradeActions.ts:38` + `MarketContent.tsx:137` | i18n-Key-Leak: `useTranslations('errors')` resolve buyError-rawKey, fallback `tc('unknownError')` |
| FIX-02 | CRITICAL | `usePlayerTrading.ts:190` | `buyFromIpo(userId, activeIpo.id, quantity, playerId)` — 1-Zeile, Security-Critical |
| FIX-03 | HIGH | `BuyConfirmModal.tsx` | `<TradingDisclaimer variant="inline" />` vor Actions-Row |
| FIX-04 | HIGH | `BuyConfirmation.tsx` | Gleicher Disclaimer-Add |
| FIX-05 | HIGH | `messages/de.json:820` + `tr.json:820` | `notEnoughScout` "$SCOUT" → "Credits" (DE+TR) |
| FIX-06 | HIGH | `PlayerIPOCard.tsx:59-105` | LeagueBadge neben PositionBadge (Multi-League P1) |
| FIX-07 | HIGH | `EndingSoonStrip.tsx:60-66` | LeagueBadge size=12px (Multi-League P1) |
| FIX-08 | HIGH | `BuyConfirmModal.tsx:91` + Call-Site | `preventClose={isPending}` |
| FIX-09 | HIGH | `TradeSuccessCard.tsx:166-172` | Zweiter Button "Zum Bestand" → `setTab('portfolio')` + Keys DE+TR |
| FIX-10 | HIGH | `ipo.ts:131` | hardcoded-DE Notification → `notifText('ipoPurchaseBody', { quantity })` + Keys |
| FIX-11 | MEDIUM | `messages/tr.json:1108` | `ipoPrice`: "IPO Fiyatı" → "Kulüp Fiyatı" |
| FIX-12 | MEDIUM | `useTradeActions.ts:75-86` | Parallel-Mutation-Guard: `if (buyPending \|\| ipoBuyPending) return;` |
| FIX-13 | MEDIUM | `ipo.ts:57-69` `getIpoForPlayer` | ORDER BY CASE status WHEN 'open' THEN 1 ... |
| FIX-14 | MEDIUM | `trading.ts:12-32` `mapRpcError` | Strikter: `lower.includes('player is liquidated')` statt `'liquidat'`. Ergaenzen `'early access'` → `'earlyAccessRequired'` |
| FIX-15 | MEDIUM | `ipo.ts:73-80` `getUserIpoPurchases` | `.limit(500)` |

## CEO-Approval-Triggers (siehe journey-2-ceo-approvals-needed.md)

| ID | Trigger | Item |
|----|---------|------|
| AR-5 | Architektur-Lock-In + Geld | Multi-League IPO-Launch-Strategie (87% Markt ohne IPO) |
| AR-6 | Geld-Migration | Zero-Price Exploit Guards (15 Spieler ipo_price=0) |
| AR-7 | Compliance-Wording | IPO-Vokabel-Regel in business.md |
| AR-8 | Externe Systeme | Migration-Drift 3 IPO-RPCs (buy_from_ipo, create_ipo, update_ipo_status) |
| AR-9 | Compliance-Wording | IPO Fee-Transparenz (10/5/85 zeigen oder verstecken?) |
| AR-10 | Architektur-Lock-In | `players.ipo_price` vs `ipos.price` Source-of-Truth (79% Drift live) |

## Post-Beta (nicht Beta-Blocker)

FE: J2F-09 (Inhalts-Dichte iPhone-SE), J2F-11 (Retry-Toast), J2F-12 (Progress-Bar-Shared), J2F-13 (Countdown-Hoist), J2F-14 (IPO-Fee-Breakdown — haengt an AR-9), J2F-15 (ClubCard-Truncate), J2F-16 ("Nur Ansicht"-Status), J2F-17+19 (CR/SC-Kuerzel), J2F-18 (Empty-State-CTA)
BE: J2B-05 (RPC-Body-Audit = haengt an AR-8), J2B-07 (dead fee-columns ipo_purchases), J2B-11 (RLS-Audit), J2B-13 (Live-Money-Invariants), J2B-14 (Kommentar), J2B-15+16 (AbortSignal, Edge-Cases)
Business: L1 (`strengthTaktischerInvestor` Key-Rename), L3 (Club Verkauf DE), L4 (Marktwert), M5 (Admin-Labels)

## VERIFIED OK (Live-DB 2026-04-14)

- Fee-Split 10/5/85 korrekt
- Supply-Invariant clean
- Club-Treasury live
- Profiles↔Wallets sync (125=125)
- 0 Double-Buy-Pattern
- auth.uid() Guards live
- CHECK constraints aktiv
- max_per_user enforced
- /market via GeoGate TR-compliant
- Disclaimers auf MarktplatzTab, PortfolioTab, IPOBuySection
- 0 forbidden-words in Market-UI

## LEARNINGS (Drafts, Reviewer promoten)

1. **i18n-Key-Leak Pattern nicht propagiert:** Journey #1 Learning "Caller muss `t()` aufrufen" nicht auf IPO-Flow uebertragen. common-errors.md braucht konkretes Beispiel mit `buyMutError?.message`.
2. **Modal mit Geld-Transaktion braucht eigenen Disclaimer** (visuelle Ueberdeckung der Parent-Page).
3. **business.md braucht IPO-Begriff-Regel** — aktuell ambigous, schafft Audit-Gap.
4. **Migration-Drift-Pattern wiederholt sich** (J1-AR-1 + J2B-01). Systematischer Scan aller public-Functions.
5. **Backend-Agent Worktree braucht MCP-Supabase-Zugriff** fuer RPC-Body-Audits.
6. **Inkonsistente Service-Signaturen zwischen Call-Sites** (J2B-04) — Konsistenz-Audit-Rule: Nach Service-Aenderung alle Konsumenten greppen.
7. **Multi-League-Expansion ohne IPO-Launch-Path** = fundamental missing wave. 87% Markt nicht tradebar.
8. **E2E-Rule:** Letzten Screen gegen SSOT-Journey-Ziel pruefen (TradeSuccess → Bestand-CTA fehlt).
9. **Dead Props nach Feature-Pivots** (J2F-06: `onBuy`/`buyingId` in EndingSoonStrip deklariert, ignoriert).
10. **players.ipo_price vs ipos.price** — 79% Drift. Source-of-Truth-Entscheidung ueberfaellig.
