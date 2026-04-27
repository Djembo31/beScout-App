# Slice 226 — Sentiment-Bar 3-Segment (FM-NEU-4)

**Status:** SPEC · **Größe:** XS · **Scope:** CTO · **Datum:** 2026-04-27

---

## 1. Problem Statement

Phase-A-Re-Audit 2026-04-27 (`worklog/audits/2026-04-27/aggregate.md` FM-NEU-4 P2): Sentiment-Bar in `BuyConfirmModal.tsx:154-159` visualisiert nur Bullish + Bearish-Segmente, ignoriert Neutral.

**Visual-Lie-Beispiel:** `bullish=2, bearish=1, neutral=10` (total=13). Aktueller Bar zeigt 66% emerald + 33% red — wirkt wie 2:1 Mehrheit für Bullish. Wahre Mehrheit ist aber Neutral (77%). User auf Money-Path-Step liest falsch.

**Wer betroffen:** alle BuyConfirmModal-User mit Players die viel-neutral-Sentiment haben (häufig bei nicht-polarisierenden Spielern). Compliance-nahe — Visual-Misleading auf Money-Path könnte als Action-Push gelesen werden.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/features/market/components/shared/BuyConfirmModal.tsx` | EDIT (Z154-159) | 2-Segment Bar → 3-Segment (emerald + white/20 + red) |

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/features/market/components/shared/BuyConfirmModal.tsx:154-159` | Edit-Target | Aktuelle Bar-Markup, Tailwind-Tokens für emerald-500/red-500/white/06-Background |
| `worklog/audits/2026-04-27/aggregate.md` FM-NEU-4 | Audit-Source | Visual-Lie-Beispiel + Fix-Empfehlung "3-Segment emerald + grau + red" |
| `.claude/rules/ui-components.md` Dark-UI-Opacity | Token-Wahl | "Min 5% opacity für sichtbare Surfaces" → Neutral-Segment-Color (white/20 statt white/06 — sichtbar gegen Bar-Background) |

## 6. Acceptance Criteria

```
AC-1: [HAPPY] Bar hat 3 Segmente
  VERIFY: grep -A4 "Sentiment bar" src/features/market/components/shared/BuyConfirmModal.tsx | grep -c "<div className=\"h-full"
  EXPECTED: 3 (emerald + neutral + red)
  FAIL IF: !=3

AC-2: [VISUAL-PROPORTIONS] Bar-Width-Summe = 100% bei jeder sentiment-Verteilung
  VERIFY: Code-Inspektion: 3 width-styles addieren zu (bullish+neutral+bearish) / total = 100%
  EXPECTED: Math invariant — sum of segments = total ratio
  FAIL IF: missing segment, falsche Variable referenced

AC-3: [REGRESSION-TSC] tsc clean
  VERIFY: npx tsc --noEmit
  EXPECTED: exit 0
  FAIL IF: type errors

AC-4: [VISUAL-VERIFY] Anil post-deploy: Bar bei neutral-dominantem Player zeigt graues Mittel-Segment
  VERIFY: Manual-Inspektion auf bescout.net /market mit BuyConfirmModal
  EXPECTED: bei (bullish=2, bearish=1, neutral=10) Bar ~15% grün + ~77% grau + ~8% rot
  FAIL IF: Bar zeigt weiterhin nur 2 Segmente
```

## 8. Self-Verification Commands

```bash
# AC-1: 3 segments
grep -A6 "Sentiment bar" src/features/market/components/shared/BuyConfirmModal.tsx

# AC-3: tsc
npx tsc --noEmit
```

## 10. Proof-Plan

`worklog/proofs/226-3segment-bar.txt` — git diff + tsc-Output.

## 12. Stage-Chain

```
SPEC → IMPACT (skipped — UI-only, kein RPC/Service/Schema) → BUILD → REVIEW (self-review D35: trivial visual-bug-fix, gleicher Pattern wie Slice 200a Tier-Color-Coding) → PROVE → LOG
```

**Self-Review-Begründung:** 5-Lines-Visual-Fix in 1 File. Kein Logic-Change, keine neue Dependency, keine i18n. Pattern-Wiederholung: Bar-Visualisierung mit Segment-Width-Calc ist etablierter Pattern. Reviewer-Agent Overhead > Catch-Probability.

## Open Risiko

- Bar-Border-Radius könnte bei mehr-Segmenten leicht anders aussehen (Slice 224 hatte `rounded-l-full` + `rounded-r-full` auf Endsegmenten). Mitigation: bewusst entfernt da overflow-hidden bereits am Wrapper rounded-full hat — Endsegmente erben das Clip.
