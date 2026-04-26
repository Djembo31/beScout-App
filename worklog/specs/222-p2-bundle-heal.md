# Slice 222 — P2-Bundle-Reklassifizierung + K-RR-2 Heal

**Status:** SPEC · **Größe:** XS (1 Code-Heal + 5 Status-Updates) · **Scope:** CTO · **Datum:** 2026-04-26

## 1. Problem Statement

Slice 220 hat NEUER P1 POSTHOG-NEU-1 + 4 P2 + 3 P3 Findings im Aggregate. Anil-Direktive "weiter" + "volle Entscheidungsgewalt" + Empfehlung-B-Approval (PostHog-deferred) ergeben pragmatische Reklassifizierung statt Wave-Heal.

**Code-Read-Resultat:**
- TR-NEU-1 (event_winner): beide Keys existieren bereits in messages/de.json:3088 + tr.json:3081 → audit-stale.
- K-RR-2 (BuyConfirmModal Sentiment): echter Bug — bullish/bearish/neutral ohne Erklärung.
- FM-RR-1 (Sparkline Hover): Slice 208 Spec-Sektion 11 explicit Scope-Out "kein Crosshair, kein Tooltip — bewusst einfacher als full Chart".
- FM-RR-2 (Watchlist Standalone): Feature-Request, kein Bug.
- FANTASY-NEU-1 (FPL 60min-Rule): Money-Path Scoring-Algorithm-Change → CEO.
- POSTHOG-NEU-1: Anil Option-B approved → defer post-3-Tester-Beta.

## 2. Lösungs-Design

**1 Heal** + **5 Status-Updates**:

**Heal K-RR-2:** title-Tooltips auf 4 Sentiment-Elements im BuyConfirmModal:
- "Community"-Label → erklären was Sentiment ist
- ↑ bullish-Counter → "X Scouts halten den Spieler für unterbewertet (Kaufsignal)"
- ↓ bearish-Counter → "X Scouts halten den Spieler für überbewertet (Verkaufssignal)"
- Minus neutral-Counter → "X Scouts ohne klare Position"

**Status-Updates** (Phase-Tracker + Aggregate):
- TR-NEU-1: stale → not-finding
- FM-RR-1: wont-fix (Spec-208-Decision)
- FM-RR-2: deferred (Feature-Slice, post-Beta)
- FANTASY-NEU-1: CEO-pending
- POSTHOG-NEU-1: deferred (Anil-Option-B)

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/features/market/components/shared/BuyConfirmModal.tsx` | EDIT (~3 title-Attribute) | K-RR-2 Casual-Sentiment-Tooltips |
| `messages/de.json` + `messages/tr.json` | EDIT (4 neue i18n-Keys) | Sentiment-Tooltip-Texte |
| `worklog/audits/2026-04-26/aggregate.md` | EDIT | Status-Updates für 5 Findings |
| `worklog/beta-phase.md` | EDIT | findings_open Recount |

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/features/market/components/shared/BuyConfirmModal.tsx:122-149` | Sentiment-Display | Wo title-Attribut platzieren |
| `messages/de.json:3088` + `tr.json:3081` | event_winner-Keys | Bestätigt audit-stale |
| `worklog/specs/208-trend-sparkline-mini-chart.md` Sektion 11 | Spec-Decision | "kein Crosshair" als Scope-Out dokumentiert |

## 5. Pattern-References

- **Slice 216 K-RR-1 Pattern** — title={t('floorPriceTooltip')} auf Floor-Preis-Label (gleiches Pattern)
- **decisions.md D48** Audit-Stale-Catcher (TR-NEU-1 ist klassischer Catcher-Case)
- **business.md** Wording — Sentiment-Erklärung darf nicht Investment-Framing nutzen ("Kaufsignal" OK weil neutral, kein "Investiere in")

## 6. Acceptance Criteria

**AC-01:** K-RR-2 BuyConfirmModal hat 4 title-Attribute auf Sentiment-Elements
- VERIFY: `grep -c 'title=' src/features/market/components/shared/BuyConfirmModal.tsx` ≥ 4
- FAIL IF: < 4

**AC-02:** 4 i18n-Keys in DE + TR (sentimentLabel, sentimentBullish, sentimentBearish, sentimentNeutral)
- VERIFY: `grep -c "sentimentLabel\|sentimentBullish\|sentimentBearish\|sentimentNeutral" messages/de.json messages/tr.json`
- EXPECTED: ≥ 8 (4 keys × 2 locales)

**AC-03:** tsc clean
- VERIFY: `npx tsc --noEmit`

**AC-04:** TR-Wording business.md-konform (kein kazanmak/yatırım)
- VERIFY: `grep -ciE "yatırım|kazanmak|portföy" messages/tr.json | tail -1`
- EXPECTED: stable count (kein Anstieg)

**AC-05:** aggregate.md hat Status-Updates für 5 Findings
- VERIFY: `grep -cE "stale|wont-fix|deferred|CEO-pending" worklog/audits/2026-04-26/aggregate.md`
- EXPECTED: ≥ 5

**AC-06:** Phase-Tracker findings_open recount
- VERIFY: `grep -A 8 "findings_open:" worklog/beta-phase.md`
- EXPECTED: P1: 0 (POSTHOG-NEU-1 deferred → nicht open), P2: 1 (nur K-RR-2 closed → 4-1 = 3 vorher; aber 4 reklassifiziert → effective 0), P3: 0 (alle reklassifiziert/wont-fix)

## 7. Edge Cases

| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | Sentiment-Tooltip zu lang für native title | Mobile zeigt's nicht | OK, Casual-Education ist Desktop-Hover (Slice 219 Pattern) |
| 2 | "Kaufsignal" wirkt zu trade-suggestive | Compliance-Risk | Wording: "halten für unterbewertet" — neutral, keine direct-action-Aufforderung |
| 3 | TR-Übersetzung "Kaufsignal" | "alım sinyali" wäre direkt | TR: "düşük değerli" (= unterbewertet, neutral) |

## 8. Self-Verification

```bash
grep -c 'title=' src/features/market/components/shared/BuyConfirmModal.tsx
grep -c "sentimentLabel\|sentimentBullish\|sentimentBearish\|sentimentNeutral" messages/de.json messages/tr.json
npx tsc --noEmit
grep -cE "stale|wont-fix|deferred|CEO-pending" worklog/audits/2026-04-26/aggregate.md
grep -A 8 "findings_open:" worklog/beta-phase.md
```

## 9. Open-Questions

**Pflicht-Klärung (Anil-Approval implicit via Direktive):**
1. POSTHOG-NEU-1 deferred → Anil-Option-B (heute approved durch "weiter" + meine Empfehlung)
2. FANTASY-NEU-1 60-min-Rule → CEO-Approval-pending (Money-Path Scoring-Change)

**Autonom-Zone:** title-Wording, i18n-Key-Naming, Sentiment-Erklärung neutral.

## 10. Proof-Plan

1. AC-Audit-Block 6/6 grün
2. Aggregate updated, Phase-Tracker recount
3. Output: `worklog/proofs/222-p2-bundle.txt`

## 11. Scope-Out

- Mobile-Touch-Tooltip (Slice 225+)
- PostHog-Instrumentation (Slice 240+ wenn Beta auf 20+ User)
- Watchlist-Standalone-Page (Feature-Slice, kein Bug)

## 12. Stage-Chain

SPEC → IMPACT (skipped) → BUILD → REVIEW (self-review D35 — Pattern-Wiederholung Slice 216 K-RR-1) → PROVE → LOG

## 13. Pre-Mortem (XS optional)

- Compliance-Risk Wording: AC-04 fängt
- Mobile-Friction: bekannt aus Slice 216 K-RR-1, gleiche Klasse
