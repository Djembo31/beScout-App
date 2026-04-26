# Slice [TBD] — multi P2 batch (5 Findings)

**Status:** SPEC · **Größe:** S · **Scope:** CTO · **Datum:** 2026-04-26
**Auto-generated:** Slice 214 findings-to-slices Pipeline aus `worklog/audits/2026-04-26/aggregate.md`.
**Severity:** P2

## 1. Problem Statement

5 Findings in Domain "multi" gebündelt.

**Source:** persona-t · **Date:** 2026-04-26

## 2. Lösungs-Design

(Auto-Stub — manuell ausfüllen vor BUILD-Stage)

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| TBD | TBD | aus Reproducer ableiten |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| messages/tr.json:3082 | Existing-Stelle des Findings | Wie ist es heute implementiert? |
| `worklog/audits/2026-04-26/aggregate.md` | Source-of-Truth Aggregate | Vollständigkeit prüfen |

## 5. Pattern-References

- `memory/decisions.md` D48 (Audit-Stale-Catcher) — vor Implementation: Pattern bereits gefixt?
- `memory/decisions.md` D50 (Spec-Standard-Pflicht)

## 6. Acceptance Criteria

**AC-01:** [REGRESSION] `event_winnerDesc` Wert da, aber `event_winner` Key-Title fehlt → Loca...
  - VERIFY: messages/tr.json:3082
  - EXPECTED: Issue nicht mehr reproduzierbar
  - FAIL IF: Original-Issue TR-NEU-1 kommt zurück

**AC-02:** [REGRESSION] FPL hat 60-min-Mindest-Regel für Auto-Sub-Trigger — BeScout nutzt nur ...
  - VERIFY: score_event RPC
  - EXPECTED: Issue nicht mehr reproduzierbar
  - FAIL IF: Original-Issue FANTASY-NEU-1 kommt zurück

**AC-03:** [REGRESSION] TrendSparkline (Slice 208) hat KEIN Hover/Crosshair für Datum+Wert pro...
  - VERIFY: `src/components/transactions/TransactionsPageContent.tsx:213-243` (TrendSparkline-Component, kein onPointerMove-Handler)
  - EXPECTED: Issue nicht mehr reproduzierbar
  - FAIL IF: Original-Issue FM-RR-1 kommt zurück

**AC-04:** [REGRESSION] Punch-List 2026-04-25 markierte FM 4.2 "Trending Hot/Rising/Faller/IPO...
  - VERIFY: trending.?hot\
  - EXPECTED: Issue nicht mehr reproduzierbar
  - FAIL IF: Original-Issue FM-RR-3 kommt zurück

**AC-05:** [REGRESSION] BuyConfirmModal (`src/features/market/components/shared/BuyConfirmModa...
  - VERIFY: `BuyConfirmModal.tsx:60` (`usePlayerSentiment`) ohne Tooltip
  - EXPECTED: Issue nicht mehr reproduzierbar
  - FAIL IF: Original-Issue K-RR-2 kommt zurück

**Plus pflicht zusätzliche ACs:** STRUCTURAL (tsc clean), I18N (wenn user-facing), MOBILE (wenn UI), PENDING (wenn async).

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | TBD | TBD | TBD | TBD |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
# Plus Slice-spezifische greps
```

## 9. Open-Questions

(Auto-Stub — Pflicht-Klärungen vor Implementation auflisten)

## 10. Proof-Plan

(Auto-Stub — wie wird verifiziert?)

## 11. Scope-Out

- (Auto-Stub)

## 12. Stage-Chain (geplant)

SPEC (manuell ausfüllen) → IMPACT → BUILD → REVIEW → PROVE → LOG.

---

## Findings (raw)

| ID | Page | Severity | Issue | Reproducer | Source |
|----|------|----------|-------|-----------|--------|
| TR-NEU-1 | i18n keys event_winner | P2 | `event_winnerDesc` Wert da, aber `event_winner` Key-Title fehlt → Locale-Mismatch im UI | messages/tr.json:3082 | persona-t |
| FANTASY-NEU-1 | Fantasy-Scoring-Engine | P2 | FPL hat 60-min-Mindest-Regel für Auto-Sub-Trigger — BeScout nutzt nur `v_starter_minutes <= 0`. Plus: BeScout `fantasy_points` aus `perfL5` 40-150 derived (nicht direkt FPL-vergleichbar). Top-FPL-Manager merkt das bei genauem Hinschauen. | score_event RPC | fantasy-scoring |
| FM-RR-1 | /transactions Sparkline | P2 | TrendSparkline (Slice 208) hat KEIN Hover/Crosshair für Datum+Wert pro Tag — FM-Power-User kann bei 30/90 Buckets nicht spezifischen Tag abfragen. PriceChart.tsx hat Crosshair (Slice 198), Sparkline bewusst weggelassen. Bei 90-Bucket-Density wird Visual-Indicator zur Pseudo-Visualisierung ohne Decision-Helper-Wert. | `src/components/transactions/TransactionsPageContent.tsx:213-243` (TrendSparkline-Component, kein onPointerMove-Handler) |  |
| FM-RR-3 | Trending-Pills /market | P3 | Punch-List 2026-04-25 markierte FM 4.2 "Trending Hot/Rising/Faller/IPO-Soon Pills" als deferred zu Slice 198. grep auf `Trending\ | trending.?hot\ |  |
| K-RR-2 | BuyConfirmModal First-Buy | P2 | BuyConfirmModal (`src/features/market/components/shared/BuyConfirmModal.tsx`) zeigt für Casual-First-Buy: PlayerIdentity + priceCents + maxQty + balanceCents + Sentiment-Counts. Sentiment ohne Erklärung wirft Fragen auf ("Bullish/Bearish was bedeutet das?"). TradingDisclaimer ist da (gut), aber Casual-Fragen sind: "Was kaufe ich? Wann kann ich verkaufen? Verliere ich Geld?". | `BuyConfirmModal.tsx:60` (`usePlayerSentiment`) ohne Tooltip |  |

## Hinweis

Dies ist ein **auto-generated Slice-Stub** (Slice 214 Pipeline). Vor BUILD-Stage:
1. Anil reviewt Stub
2. Sektionen 2, 6, 7, 9, 10, 11 manuell ausfüllen (jetzt nur Stub-Text)
3. Slice-Größe verifizieren (Pipeline default-classified)
4. Slice-Nummer korrigieren (Pipeline nutzt 214-derived-*, manuell zu echter ID-Range renamen)
