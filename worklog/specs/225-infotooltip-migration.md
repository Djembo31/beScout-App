# Slice 225 — InfoTooltip-Migration (UX-NEU-2 + UX-NEU-3 + UX-NEU-4 + Slice 216 K-RR-1 Heal)

**Status:** SPEC · **Größe:** S · **Scope:** CTO (UI-Pattern-Migration, kein Money-Path-Logic) · **Datum:** 2026-04-27

---

## 1. Problem Statement

Phase-A-Re-Audit 2026-04-27 (`worklog/audits/2026-04-27/aggregate.md`) hat 3 zusammenhängende UX-Findings:

- **UX-NEU-2 (P1):** HTML-`title=` zeigt KEIN Tooltip auf 393px-Mobile (kein Hover-Event). BeScout ist Mobile-First (CLAUDE.md). Casual-Education-Mehrwert auf Hauptzielgerät 0%.
- **UX-NEU-3 (P2):** Kein Visual-Hint dass Tooltip existiert (kein `?`-Icon, kein `cursor-help`). User weiß nicht dass Hover etwas zeigt.
- **UX-NEU-4 (P3):** A11y `aria-label` fehlt parallel zu `title` auf Sentiment-Spans.

Pattern-Drift trifft 2 Slices gleich: **Slice 222 K-RR-2** (`BuyConfirmModal.tsx` Sentiment-Block, 4 title=) UND **Slice 216 K-RR-1** (`CommunityValuation.tsx` Floor-Preis-Label, 1 title=). Beide nutzten HTML-`title=` für **Education-Tooltips** im Money-Path — der falsche Pattern für Education.

**Wer betroffen:** Mobile-User auf 393px-Touch (laut VISION.md primärer Beachhead) sieht die Education-Tooltips **nie**. Slice 216 + 222 wurden deployt aber ihr Education-Mehrwert kommt nicht an.

## 2. Lösungs-Design

Migration auf existing `InfoTooltip` Custom-Component (`src/components/ui/index.tsx:184`) — click-to-toggle, Mobile-friendly, A11y-konform (aria-label + aria-expanded), `anim-dropdown`-Animation, click-outside-close.

**BuyConfirmModal.tsx Sentiment-Block:**
- 4× `title=` entfernen
- 1× `<InfoTooltip text={t('sentimentLabel')} />` next zu "Community:"-Label
- Counter-Spans: `aria-label={t('sentimentBullish', { count })}` (etc.) für Screen-Reader
- "Community:"-Label + InfoTooltip in `inline-flex items-center gap-1`-Wrapper

**CommunityValuation.tsx Floor-Preis:**
- 1× `title=` entfernen
- 1× `<InfoTooltip text={t('floorPriceTooltip')} />` next zu Floor-Preis-Label
- Label + InfoTooltip in `inline-flex items-center gap-1`-Wrapper

**ui-components.md Pattern-Regel** (neu):
Neuer Block "Tooltip-Pattern" — Decision-Tree wann `title=` vs InfoTooltip.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/features/market/components/shared/BuyConfirmModal.tsx` | EDIT (~Z121-148) | UX-NEU-2/-3/-4 Heal — 4 title= → 1 InfoTooltip + per-Counter aria-label |
| `src/components/player/detail/CommunityValuation.tsx` | EDIT (Z110) | Slice 216 K-RR-1 Heal — 1 title= → 1 InfoTooltip |
| `.claude/rules/ui-components.md` | EDIT | Pattern-Regel ergänzen — Education-Tooltip vs Trivial-Hint |

**Keine i18n-Änderungen** — Existing Keys (`sentimentLabel`, `sentimentBullish/Bearish/Neutral`, `floorPriceTooltip`) werden weiterverwendet.

**Imports**: BuyConfirmModal + CommunityValuation müssen `InfoTooltip` aus `@/components/ui` importieren.

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/components/ui/index.tsx:184-216` | InfoTooltip-Component-Source | Props-Signatur (`{ text: string }`), DOM-Struktur (`relative inline-flex` wrapper), Mobile-Behavior (click-toggle, click-outside-close) |
| `src/components/player/detail/OrderbookSummary.tsx:56` | Existing-Usage-Pattern | Wie wird InfoTooltip layoutet? `inline-flex items-center gap-1` Standard? |
| `src/features/market/components/shared/BuyConfirmModal.tsx:120-150` | Edit-Target | Genaue title= Stellen identifizieren, Counter-Layout (flex gap-1/gap-3), Color-Tokens (emerald-400/red-400/white/40) erhalten |
| `src/components/player/detail/CommunityValuation.tsx:103-117` | Edit-Target | Floor-Preis-Card-Layout (`bg-surface-base border ... rounded-xl p-3 text-center` — InfoTooltip darin? oder right neben Label?) |
| `.claude/rules/ui-components.md` (komplett) | Pattern-Regel-Source | Wo neuer Block ergänzen? Style-Konsistenz mit existing Sektionen |
| `worklog/audits/2026-04-27/aggregate.md` | Audit-Source | Exakte Pattern-Lehre + ux-coherence-auditor Empfehlung-Detail |

## 5. Pattern-References

- `decisions.md` D35 — Self-Review-Begründung für UI-Pattern-Migration ohne Logic-Change
- `errors-frontend.md` "Modal preventClose Pattern" — Dialog/Modal-A11y-Pflichten (analog A11y-Pflichten für InfoTooltip)
- `ui-components.md` "Accessibility" — Icon-only Buttons brauchen aria-label (InfoTooltip-`?`-Button hat das via `aria-label={tc('info')}`)
- `ui-components.md` "Animations" — `anim-dropdown` für InfoTooltip-Popover (InfoTooltip nutzt das schon)

## 6. Acceptance Criteria

```
AC-1: [HAPPY-DESKTOP] BuyConfirmModal Sentiment-Block zeigt InfoTooltip mit click-to-open
  VERIFY: Visual-Inspektion — beim Render: 1 `?`-Icon next zu "Community:" Label.
          Click öffnet Popover mit sentimentLabel-Text. Click outside schließt.
  EXPECTED: 1× InfoTooltip rendered, Popover-Content = "Scout-Stimmung aus der Community: ..."
  FAIL IF: 0 InfoTooltip ODER mehrere ODER Popover-Content abweicht von t('sentimentLabel')

AC-2: [HAPPY-MOBILE] InfoTooltip funktioniert auf 393px-Touch (click statt hover)
  VERIFY: Manual-test post-deploy auf bescout.net via mobile-Browser
  EXPECTED: Tap auf `?`-Icon öffnet Popover. Tap außerhalb schließt.
  FAIL IF: Tap funktioniert nicht ODER Popover hängt sich auf

AC-3: [REGRESSION-TITLE-FREE] Keine HTML-title= mehr in den 5 Slice-216/222-Stellen
  VERIFY: grep -nE 'title=\{t\(.sentiment(Label|Bullish|Bearish|Neutral)' src/features/market/components/shared/BuyConfirmModal.tsx
          grep -nE 'title=\{t\(.floorPriceTooltip' src/components/player/detail/CommunityValuation.tsx
  EXPECTED: 0 hits
  FAIL IF: ≥1 hit

AC-4: [A11Y] Counter-Spans haben aria-label per Screen-Reader-Pflicht
  VERIFY: grep -nE 'aria-label=\{t\(.sentiment(Bullish|Bearish|Neutral)' src/features/market/components/shared/BuyConfirmModal.tsx
  EXPECTED: 3 hits (bullish + bearish + neutral)
  FAIL IF: <3 hits

AC-5: [REGRESSION-TSC] tsc clean
  VERIFY: npx tsc --noEmit
  EXPECTED: exit 0
  FAIL IF: Type-Errors

AC-6: [PATTERN-DOC] ui-components.md hat neuen Tooltip-Pattern-Block
  VERIFY: grep -nE "InfoTooltip|Tooltip-Pattern" .claude/rules/ui-components.md
  EXPECTED: ≥3 hits (Block-Header + Decision-Tree + Beispiele)
  FAIL IF: 0 hits

AC-7: [INFOTOOLTIP-IMPORT] Beide Components importieren InfoTooltip korrekt
  VERIFY: grep -E "import.*InfoTooltip" src/features/market/components/shared/BuyConfirmModal.tsx src/components/player/detail/CommunityValuation.tsx
  EXPECTED: Both files import InfoTooltip from '@/components/ui'
  FAIL IF: Eine ohne Import

AC-8: [LAYOUT-NICHT-BROKEN] Sentiment-Block + Floor-Preis-Card visual-konsistent
  VERIFY: Screenshot-Compare-Plan (manual post-deploy): Sentiment-Bar bleibt rendered, Counter-Numbers bleiben sichtbar, Floor-Preis-Card 3-Column-Grid intakt
  EXPECTED: Layout 1:1 wie vorher, plus zusätzlicher `?`-Icon
  FAIL IF: Layout-Shift, Counter überlappen, Card overflows
```

## 7. Edge Cases Table

| # | Flow | Case | Input/State | Expected | Mitigation |
|---|------|------|-------------|----------|------------|
| 1 | Render | sentiment.total === 0 | Sentiment-Block hidden komplett | InfoTooltip nicht rendered (Block ist `{sentiment.total > 0 && ...}`) | Existing Conditional bleibt — InfoTooltip ist innerhalb der Bedingung |
| 2 | Render | sentiment.neutral === 0 | Neutral-Span hidden | Bullish + Bearish Counter rendered, Neutral-Span hidden, InfoTooltip rendered | InfoTooltip zeigt sentimentLabel — generisch, nicht Counter-spezifisch |
| 3 | Click | Popover open, click `?`-Icon erneut | Toggle-Behavior | Popover schließt | InfoTooltip nutzt `setOpen(!open)` — Toggle ✓ |
| 4 | Click | Popover open, click anderswo im Modal | Click-outside | Popover schließt, Modal bleibt offen | InfoTooltip nutzt `mousedown`-Listener mit ref-contains-Check ✓ |
| 5 | Mobile | Tap `?`-Icon mehrmals schnell | Race-Condition | Toggle bleibt deterministisch | React-State synchronisiert, kein Async-Bug |
| 6 | Layout | Modal smal (393px) + InfoTooltip-Popover overflows | Viewport-Edge | Popover wird `w-[min(13rem,calc(100vw-2rem))]` clipped → fits | Existing-Style in InfoTooltip-Component ✓ |
| 7 | A11y | Screen-Reader liest Counter-Span | aria-label = "{count} Scouts schätzen den Spieler stark ein" | Screen-Reader liest count + Bedeutung | Slice 224 Wording-Heal stellt sicher Wording ist neutral |
| 8 | Layout | Floor-Preis-Card hat Width-Constraint (3-Col-Grid) | InfoTooltip overflow | Card-Padding + InfoTooltip-Inline = OK | Test mit längstem TR-Text "Floor: zayıf bulunuyor" — Mitigation falls overflow: max-width auf Label |

## 8. Self-Verification Commands

```bash
# AC-3: Keine title= mehr
grep -nE 'title=\{t\(.sentiment' src/features/market/components/shared/BuyConfirmModal.tsx
grep -nE 'title=\{t\(.floorPriceTooltip' src/components/player/detail/CommunityValuation.tsx

# AC-4: aria-label statt title=
grep -nE 'aria-label=\{t\(.sentiment' src/features/market/components/shared/BuyConfirmModal.tsx

# AC-5: tsc
npx tsc --noEmit

# AC-6: ui-components.md
grep -nE "InfoTooltip|Tooltip-Pattern" .claude/rules/ui-components.md

# AC-7: Imports
grep -E "import.*InfoTooltip" src/features/market/components/shared/BuyConfirmModal.tsx src/components/player/detail/CommunityValuation.tsx

# Bonus: dev-server-render-test (lokal, nicht required)
# pnpm dev → /market öffnen → Buy-Card klicken → BuyConfirmModal → ?-Icon klicken → Popover sichtbar?
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — InfoTooltip-Pattern existing, ux-coherence-auditor hat exakte Empfehlung.

**Autonom-Zone:**
- Genaue Position des `?`-Icons (rechts neben Label vs links davor)
- Inline-flex gap-Größe (gap-1 vs gap-2 — beobachten OrderbookSummary-Pattern)
- ui-components.md-Block Position (in welcher Sektion einfügen — Mobile-First-Block? Accessibility-Block? Eigene Sektion?)

**Nicht-Autonom-Zone:** keine — kein Money-Path-Touch, keine RPC, kein Schema, keine Compliance-Wording-Frage (Slice 224 schon erledigt).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| UI-Pattern-Migration | `worklog/proofs/225-infotooltip-diff.txt` (git diff für die 3 Files + grep-Outputs für AC-3/4/6/7) |
| Visual-Inspect | Manual Post-Deploy auf bescout.net (Anil-Verify) — `worklog/proofs/225-screenshot-plan.md` als Verify-Anweisung |

## 11. Scope-Out

- **Sentiment-Bar 3-Segment:** FM-NEU-4 → Slice 226+ (anders Visualisierungs-Bug). Begründung: andere Bug-Klasse, eigene Spec.
- **Reliability-Weighting Service:** FM-NEU-3 → Slice 226+. Begründung: Backend-Service-Erweiterung.
- **Empty-State-CTA:** FM-NEU-5 → Slice 227+. Begründung: Discovery-Feature, kein Bug.
- **Audit auf andere `title=`-Stellen:** ~236 Treffer codebase. Migration aller wäre M-L-Slice — hier nur die 2 Audit-Findings. Begründung: Pattern-Regel in ui-components.md ergänzt, Future-Slices respektieren das. Existing-Code bleibt — Migration nur on-demand.

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped — UI-only, kein RPC/Service/Schema/Consumer-Cascade) → BUILD → REVIEW (self-review D35: UI-Pattern-Migration ohne Logic-Change, existing Component reused) → PROVE → LOG
```

**IMPACT-Skip-Begründung:** InfoTooltip ist bereits im Use (OrderbookSummary). Migration ist drop-in: gleicher i18n-Text, andere Render-Methode. Kein neuer Code-Path, keine Cache-Invalidation, kein State-Management-Change. tsc würde Type-Mismatch fangen.

**REVIEW Self-Review-D35-Begründung:**
- Pattern-Migration nicht Pattern-Innovation (Component existing seit lange)
- Kein Logic-Change (gleicher i18n-Text, andere Render-DOM)
- Kein Money-Path-Touch
- Kein neuer Service/RPC
- Reviewer-Agent würde gleiche Pattern-Source-Audit wiederholen den ux-coherence-auditor schon gemacht hat
- Slice 224 Lehre bleibt aber wirksam: bei Money-Path-Touch business-Agent dispatchen → hier KEIN Wording-Touch (existing i18n-Keys, gerade Slice 224 vetted)

## 13. Pre-Mortem (S-Slice optional, hier kurz)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | InfoTooltip-Popover Layout overflowed in 393px-Modal | LOW | UX | InfoTooltip hat `w-[min(13rem,calc(100vw-2rem))]` already — viewport-clipped | Manual-Mobile-Test |
| 2 | Counter-Layout drifts wegen "Community:" + InfoTooltip-`?`-Icon nimmt mehr horizontalen Raum | MED | Visual | inline-flex items-center gap-1 statt gap-2 — kompakter | Manual-Visual-Test post-Deploy |
| 3 | aria-label statt title fehlt → Screen-Reader-Regression | LOW | A11y | AC-4 grep-Verify | grep -c |
| 4 | Floor-Preis-Card 3-Col-Grid bricht bei langem TR-Text | LOW | Visual | InfoTooltip ist Inline-Block, nimmt feste Größe | Manual-TR-Test |
| 5 | ui-components.md Pattern-Regel ist nicht klar genug → Future-Slices machen wieder title= | MED | Quality | Decision-Tree mit Code-Beispielen + 2 Slice-References (216/222) | Future-Slice-Review pflicht |

---

## Compliance-Check

- $SCOUT-Wording: nicht betroffen
- IPO-Begriff user-facing: nicht betroffen
- TR-Glücksspiel: nicht betroffen
- Asset-Klasse-Framing: bereits Slice 224 geheilt
- Disclaimer auf Page: BuyConfirmModal hat TradingDisclaimer schon, CommunityValuation auch — bleibt unverändert

## Open Risiko

**Risiko 1:** InfoTooltip-Popover Layout-Verhalten in BuyConfirmModal (eingeschachtelter Modal). **Mitigation:** Manual-Test post-deploy. Worst-case: z-index erhöhen (popover ist z-50, modal ist auch z-Layer — Conflict möglich). Falls Bug: schneller Heal mit z-[60] oder portal.

**Risiko 2:** Sentiment-Counter-Layout zerläuft wenn `?`-Icon hinzugefügt wird (mobile 393px). **Mitigation:** flex-wrap-Override falls overflow, ODER Counter-gap-3 → gap-2.

**Risiko 3:** ux-coherence-auditor sagte "Slice 216 + 222 sind gleicher Pattern-Drift, beide migrieren ist 1 Heal-Wave". Wenn Slice 222 fix ist aber Slice 216 nicht — dann ist Pattern-Inkonsistenz im Codebase. **Mitigation:** beide Slices in dieser einer Slice-Migration zusammen, kein partial-migration.
