# Phase-A Targeted Re-Audit Aggregate — 2026-04-27

**Trigger:** Anil-Direktive "B" (targeted Re-Run) post-Slice-223. last_phase_run war 2026-04-26 21:30 (Slice 216).

**Scope:** Slice 222 K-RR-2 BuyConfirmModal Sentiment-Tooltips
- 1 File: `src/features/market/components/shared/BuyConfirmModal.tsx` (10 lines)
- 4 NEU i18n-Keys × 2 Locales = 8 Strings (DE + TR)
- Page: `/market` Buy-Confirm-Step

**Agents dispatched (parallel, ~60s):**
- `business` — Compliance-Wording-Audit
- `ux-coherence-auditor` — Tooltip-Pattern-Konsistenz
- `fm-mechanics-expert` — FM-Power-User-Domain-Audit

**Outcome:** 9 NEUE Findings (3 P1 + 3 P2 + 3 P3). Tech-Side war NICHT "maximal sauber" wie Slice 222 behauptet — die Behauptung war "alle Findings aus pre-Slice-222-Audit reklassifiziert", nicht "keine Findings überhaupt".

---

## Findings

### P1 (3 NEU — Beta-Blocker)

| ID | Severity | Domain | File | Issue | Fix-Empfehlung |
|----|----------|--------|------|-------|----------------|
| **BUSINESS-NEU-1** | P1 | Compliance | `messages/{de,tr}.json` (sentiment*) | "unterbewertet"/"überbewertet" + "düşük değerli"/"yüksek değerli" sind Securities-Valuation-Begriffe → Asset-Klasse-Framing gegen `business.md` Tabelle. MASAK-Risiko (TR). | DE: "stark/schwach einschätzen". TR: "güçlü/zayıf bulmak". 5-min Heal. |
| **UX-NEU-2** | P1 | Mobile-UX | `BuyConfirmModal.tsx:124-135` | HTML-`title=` zeigt KEIN Tooltip auf 393px-Mobile (kein Hover). Casual-Education-Mehrwert auf Hauptzielgerät 0%. Same-Pattern-Schwäche auch in Slice 216 K-RR-1 Floor-Preis. | Migration auf `InfoTooltip` Custom-Component (`src/components/ui/index.tsx:184`, click-to-toggle, Mobile-friendly, A11y-konform). 2-Slice-Heal (216 + 222). |
| **FM-NEU-2** | P1 | Money-Path Action-Bias | `BuyConfirmModal.tsx` + `messages/{de,tr}.json` | Tooltip-Wording "X halten für unterbewertet" im Buy-Confirm-Step triggert Spekulations-Action-Push (Casual). Cross-Cutting mit BUSINESS-NEU-1 — gleiche Wurzel, doppelter Punkt durch Money-Path-Lokation. | Heilt sich mit BUSINESS-NEU-1-Fix automatisch. |

### P2 (3 NEU)

| ID | Severity | Domain | File | Issue | Fix-Empfehlung |
|----|----------|--------|------|-------|----------------|
| **FM-NEU-3** | P2 | Domain Asymmetry | `src/lib/services/research.ts:20-33` (`getPlayerSentimentCounts`) | Sentiment-Counts unweighted by `reliability_tier`. ScoutConsensus im Player-Detail (Slice 200a) hat aber Reliability-Tier-Badges. Information-Asymmetrie zwischen 2 Surfaces für selben Player. | Service erweitern um `weighted_bullish/bearish` (high=3x, medium=2x, low=1x). Tooltip: "X Scouts (Y High-Reliability)". |
| **FM-NEU-4** | P2 | Visual-Lie | `BuyConfirmModal.tsx` Sentiment-Bar | Bar visualisiert nur Bullish/Bearish, ignoriert Neutral → bei `bullish=2, bearish=1, neutral=10` zeigt Bar 66% grün obwohl wahre Mehrheit Neutral. Misleading. | Bar 3-segmentig (emerald + grau + red) ODER nur rendern wenn `(bullish+bearish)/total >= 0.5`. |
| **UX-NEU-3** | P2 | Discoverability | `BuyConfirmModal.tsx:124-135` | Kein Visual-Hint dass Tooltip existiert (kein `?`-Icon, kein `cursor-help`, kein dotted-underline). User weiß nicht dass Hover etwas zeigt. | `cursor-help` + dezenter `border-b border-dotted` ODER `?`-Suffix-Icon. Heilt sich teilweise mit UX-NEU-2 (InfoTooltip hat `?`-Icon by-Design). |

### P3 (3 NEU)

| ID | Severity | Domain | File | Issue | Fix-Empfehlung |
|----|----------|--------|------|-------|----------------|
| **FM-NEU-5** | P3 | Empty-State Discovery | `BuyConfirmModal.tsx` Sentiment-Block | Block rendert nur wenn `sentiment.total > 0` → Casual versteht nicht dass Sentiment nutzergetrieben ist. FM-Veteran würde gerne als Erster scouten. | Bei `total === 0`: "Noch keine Scout-Bewertungen — schreib selbst eine nach dem Kauf" + Link Player-Detail Research-Tab. |
| **UX-NEU-4** | P3 | A11y | `BuyConfirmModal.tsx:124-135` | `aria-label` fehlt parallel zu `title` auf Sentiment-Spans. Screen-Reader-Inkonsistenz. | `aria-label={t('sentiment...', { count })}` ergänzen. Heilt sich mit UX-NEU-2 (InfoTooltip hat aria-Attribute by-Design). |
| **BUSINESS-NEU-2** | P3 | Wording | `messages/{de,tr}.json` (sentimentNeutral) | "Position" (DE) / "pozisyon" (TR) ist Trading-Vokabular (long/short position). Driftet Trader-Identität. | DE: "{count} Scouts unentschieden". TR: "{count} Scout kararsız". |

---

## Pattern-Lehren (cross-cutting, doku-Pflicht)

### Pattern: HTML-`title=` vs Custom-`InfoTooltip` — Pattern-Regel benötigt

- HTML-`title="..."`: ~236 Treffer codebase. Funktioniert auf Desktop-Hover, NICHT auf Mobile (393px-Touch hat kein Hover).
- `InfoTooltip` Custom-Component: existiert in `src/components/ui/index.tsx:184`, click-to-toggle, Mobile-friendly, A11y-konform. Verwendet z.B. in `OrderbookSummary.tsx:56`.
- 0 Radix-UI/shadcn Tooltip-Imports.

**Regel-Vorschlag für `.claude/rules/ui-components.md`:**
- Education/Edutorial Tooltip → `InfoTooltip` (User braucht Discovery + Mobile-Funktion).
- Triviale Hints (Icon-Disambiguation, collapsed-NavItem-Names) → `title=` ist OK.

**Slice 216 + 222 sind gleicher Pattern-Drift:** beide nutzen `title=` für Education (Floor-Preis-Erklärung + Sentiment-Erklärung). Beide gleichzeitig auf InfoTooltip migrieren ist 1 Slice-Heal-Wave.

### Pattern: business.md "Verbots-Register" zu eng

Securities-Adjektive ("unterbewertet", "überbewertet") fehlen explizit in der Tabelle. Existing Tabelle listet "Rendite", "Marktwert", "Asset-Klasse" — aber nicht Valuation-Adjektive. Should-be-added.

Auch: "Position" (Trading-Sinn, singular) fehlt — analog zu "Portfolio" das gelistet ist.

**business-Agent hat Draft `memory/learnings/drafts/2026-04-27-business-sentiment-wording.md` empfohlen** für `/promote-rule` later.

---

## Severity-Sort + Recommended Heal-Sequence

1. **5-Min-Heal — BUSINESS-NEU-1 + BUSINESS-NEU-2 (P1+P3):** Wording-only in `messages/{de,tr}.json`. Heilt FM-NEU-2 automatisch (Action-Bias-Wurzel). Compliance-Win mit minimaler Code-Änderung.

2. **1-Slice-Heal-Wave — UX-NEU-2 + UX-NEU-3 + UX-NEU-4 (P1+P2+P3):** Migration `BuyConfirmModal.tsx` + `MostOwnedSection.tsx` (Slice 216) auf `InfoTooltip`. Pattern-Regel-Update in `ui-components.md`. Mobile-friendly + Discoverable + A11y-clean.

3. **Backend-S-Slice — FM-NEU-3 (P2):** `getPlayerSentimentCounts` Reliability-Weighting. Symmetrie zu ScoutConsensus.

4. **UI-Polish — FM-NEU-4 + FM-NEU-5 (P2+P3):** 3-Segment-Bar + Empty-State-CTA.

---

## Phase-Tracker-Update

```yaml
findings_open:
  P0: 0
  P1: 3   # BUSINESS-NEU-1, UX-NEU-2, FM-NEU-2 (NEU 2026-04-27)
  P2: 3   # FM-NEU-3, FM-NEU-4, UX-NEU-3 (NEU 2026-04-27)
  P3: 3   # FM-NEU-5, UX-NEU-4, BUSINESS-NEU-2 (NEU 2026-04-27)
```

Sign-Off-Re-Trial-Prognose: HARD-NO-GO mit P1=3 zurück. Nicht READY.

**Aber: Targeted-Audit-Wert war hoch — 9 echte Findings aus 1 mini-Slice.** Re-Audit-Pattern lohnt sich.

---

## Audit-Source-References

- `worklog/proofs/223-audit-stale-output.txt` — Slice 223 D48-Tool-Run-Result (separater Tool-Slice, nicht Teil dieses Re-Audits)
- Slice 222 commit `5b50bfe1` — Audit-Subjekt-Diff
- `business`-Agent Output (a49ab58dea98328d3) — Wording-Audit
- `ux-coherence-auditor`-Agent Output (ad70644554e4e2145) — Tooltip-Pattern-Audit
- `fm-mechanics-expert`-Agent Output (a71299b0d20798085) — Domain-Audit
