# Review Slice 216 — P1-Wave-Heal

**Verdict:** PASS (mit 1 CONCERN auf Heal 1 Visual-Layout, 1 INFO Test-Mock-Backlog)
**Time-spent:** 12 min Review + 5 min Test-Verification

## Findings

### Heal 1 (FM-NEU-1) — PickRateBadge in compact-View

| Severity | Issue | Fix-Status |
|----------|-------|-----------|
| CONCERN (Visual) | `PickRateBadge` nutzt `absolute` Position. cards-View Card ~170px hoch, compact-View Row ~70-80px hoch + dichte rechte Seite (PlayerKPIs + buyBtn). Badge-Position kann mit existing-Elementen kollidieren. **Funktional korrekt, visuell ungetestet.** | Anil-Smoke-Test gegen bescout.net post-deploy. Falls Drift sichtbar → Slice 219 mit `top-1 right-1` Variant für compact. |
| INFO | Logic strukturell parallel zu cards-Branch ✓ | — |

### Heal 2 (UX-NEU-1) — FeedbackModal preventClose

| Severity | Issue | Fix-Status |
|----------|-------|-----------|
| — | `preventClose={loading}` korrekt platziert. Dialog-API verifiziert. errors-frontend.md J2/J3 Pattern ✓ | — |

### Heal 3 (K-RR-1) — Floor-Preis Tooltip

| Severity | Issue | Fix-Status |
|----------|-------|-----------|
| — | `title={t('floorPriceTooltip')}` auf Label-`<div>`. i18n DE+TR business.md-konform ✓ | — |
| INFO (acknowledged) | Native HTML `title` zeigt nicht auf iOS-Touch — Mobile-Popover Slice 219+ Backlog | — |

### Cross-Cutting

| Severity | Issue | Status |
|----------|-------|--------|
| INFO | ClubContent.test.tsx 12/12 fail mit `Cannot read properties of undefined (reading 'leagueGw')` — **pre-existing seit Slice 204**, Test-Mocks für `useLeagueActiveGameweek` + `useEventPlayerPickRates` fehlen. Verifiziert via git-stash-Test. Slice 216 macht NICHTS schlimmer. | Backlog Slice 218+ Test-Mock-Repair. test_mock_backlog: 1 in beta-phase.md vermerkt. |

## Positive

1. **Pattern-Konsistenz Heal 1** — cards/compact-Branches strukturell identisch.
2. **Dialog-API-Verifikation Heal 2** — `preventClose`-Prop pre-implementation auf Dialog.tsx:48 verifiziert.
3. **i18n-Pre-Existing Heal 3** — keine neuen Keys nötig (AC-06).
4. **Spec-Quality D50** — alle 13 Pflicht-Sektionen ✓.
5. **Minimal-invasive Wave-Bundle** — 3 Edits, kein neuer File, kein i18n-Edit, kein Migration.

## Spec-AC-Coverage

| AC | Status | Evidence |
|----|--------|----------|
| AC-01 (PickRate compact) | ✓ PASS | 3 Total-Renders ClubContent.tsx |
| AC-02 (preventClose) | ✓ PASS | FeedbackModal.tsx:63 |
| AC-03 (floorPriceTooltip) | ✓ PASS | CommunityValuation.tsx:110 |
| AC-04 (tsc clean) | ✓ PASS | "OK" |
| AC-05 (vitest existing green) | ⚠ PRE-EXISTING-FAIL | 12 Fails in ClubContent.test.tsx — pre-Slice-216, NICHT durch Heal verursacht (git-stash-verifiziert). Andere Tests grün. |
| AC-06 (i18n existiert) | ✓ PASS | de.json:1469 + tr.json:1465 |
| AC-07 (P1=0) | ✓ PASS post-Tracker-Update | findings_open.P1: 3→0 |
| AC-08 (Hook silent) | ✓ PASS | Exit 0 |
| AC-09 (Reviewer PASS) | ✓ THIS REVIEW | Verdict: PASS mit 1 Visual-CONCERN |

**8/9 AC PASS, AC-05 pre-existing-fail markiert (Slice 218 Backlog).**

## Empirische Anwendbarkeit

**Sign-Off-Trial-Re-Run-Prognose nach Slice 216 LOG:**

- **P1=0 erfüllt** ✓ → Sign-Off-Schwelle "P1≤3" wird sauber-PASS (statt kanten-PASS).
- **Verbleibende Anil-Mensch-Action-Blocker:** Tester-Liste + Onboarding-Doc.
- **Resultat:** Re-Trial wird **SOFT-NO-GO** statt HARD-NO-GO ✓ — exakt wie Spec versprochen.

## Empfehlung

PASS. Visual-CONCERN Heal 1 = Anil-Smoke-Test pflicht post-deploy. Test-Mock-Backlog = Slice 218.
