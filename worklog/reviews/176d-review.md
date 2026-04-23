# CTO Review: Slice 176d — Error-Boundaries Batch-Migration auf captureError

**Verdict:** PASS (Scope-Gap Finding #1 in-slice resolved)
**time-spent:** 18 min
**reviewer:** cold-context reviewer-agent (2026-04-23)
**note:** Original Scope-Gap Finding #1 (`src/components/ui/ErrorBoundary.tsx` class-based + 6 Call-Sites) wurde IN 176c-Scope geschlossen.

---

## Spec-Coverage

| AC | Status | Evidence |
|----|--------|----------|
| A1 — 15 Files importieren `captureError` | PASS | grep = 15 imports |
| A2 — `console.error` ersetzt | PASS | 0 matches in src/app/**/error.tsx |
| A3 — `feature`-Tag eindeutig pro Boundary | PASS | 15 distinct kebab-case-tags + 6 Call-Site-Tags |
| A4 — `error.digest` in extra | PASS | Pattern in allen 15 Files konsistent |
| A5 — `(app)/error.tsx` Stale-Code-Recovery intakt | PASS | `captureError` VOR recovery-check (korrekte Reihenfolge) |
| A6 — Kein verbleibendes `console.error` | PASS | 0 matches |
| A7 — tsc clean | PASS | Proof-File |

**Erweitert um Finding-#1-Resolution:** class-based ErrorBoundary migriert + 6 Call-Sites mit feature-Tag.

## Findings

| # | Severity | Status | Issue | Fix |
|---|----------|--------|-------|-----|
| 1 | MEDIUM (Scope-Gap) | ✅ RESOLVED in-slice | `src/components/ui/ErrorBoundary.tsx:29` `console.error` + 4× aktive Usage (FantasyContent 3×, PlayerContent 3×). Route-Scope hätte das verpasst. | In-slice: class-based Boundary auf `captureError` migriert. Neuer `feature?: string` optional prop. 6 Call-Sites mit spezifischen Tags: `fantasy-event-detail-modal`, `fantasy-create-event-modal`, `fantasy-event-summary-modal`, `player-buy-modal`, `player-sell-modal`, `player-offer-modal`. Default-Fallback `component-error-boundary`. |
| 2 | LOW (Doc-Drift) | Follow-Up | `.claude/rules/common-errors.md` Section 8 Pattern "Error-Boundary-Migration: 2 Scopes, nicht 1" fehlt. Zukünftige Audits könnten wieder nur `src/app/**/error.tsx` greppen + class-based verpassen. | Pattern-Addendum: grep BEIDE (`error.tsx` + `componentDidCatch\|getDerivedStateFromError`). Als LOW-Doc-Commit separat. |

## Pattern-Konformität

- ✅ **Slice 176/176b Pattern** 1:1 repliziert (digest-conditional, feature-tag)
- ✅ **captureError-Wrapper** vollständig adoptiert — keine direkten `Sentry.captureException`-Calls mehr
- ✅ **error.digest** Next.js App-Router korrekt behandelt (Prod-Build-Korrelations-Key)
- ✅ **Scope-Gap-Pattern aus Slice 166** angewendet — Reviewer fing class-based Gap, in-slice geschlossen
- ✅ **componentStack als extra** — React-Error-Info wird korrekt via `errorInfo.componentStack` als extra durchgereicht (bei class-based einzigartig-nützlich)

## Fokus-Antworten

**Alle 15 Files migriert?** JA, 15/15 Route-Boundaries + 1 class-based + 6 Call-Sites.

**feature-Tag eindeutig?** JA, alle 21 distinct: 15 Route-Tags + 6 Modal-Call-Site-Tags. Default-Fallback `component-error-boundary` für Call-Sites ohne feature-prop.

**digest korrekt?** JA, identisch in allen 15 Route-Files.

**(app)/error.tsx Stale-Code-Recovery intakt?** JA. `captureError` Z.46-49 VOR `attemptStaleCodeRecovery` Z.53. Sentry-Flush garantiert vor Page-Reload.

**kebab-case-Format konsistent?** JA, 21 Tags alle kebab-case.

**Andere Boundary-Klassen?** Nein mehr. Finding #1 deckt den einzigen class-based Case ab. Keine weiteren `componentDidCatch`-Usages in src/.

## Positive

- Konsistenz über 15+1 Files
- digest-Conditional elegant (keine leeren extra-Objects)
- Stale-Code-Recovery-Reihenfolge richtig
- Proof-File minimal aber ausreichend
- 21 distinct feature-Tags ermöglichen Cohort-Alerts in Sentry-UI
- Scope-Gap in-slice resolved statt Follow-Slice-Backlog
- Class-based ErrorBoundary erhält `componentStack` als extra (React-spezifischer Debug-Wert)
- ErrorBoundary-API bleibt backward-compatible (neuer `feature?` ist optional)
- Tests grün: 39 observability + 20 FantasyContent/PlayerContent

## Learnings für Knowledge-Capture

**Pattern für `.claude/rules/common-errors.md` Section 8:**
```
Error-Boundary-Migration: 2 Scopes, nicht 1 (Slice 176d)
- Next.js App-Router: `src/app/**/error.tsx` (Route-level, 15 Files)
- React class-based: `class extends Component` mit `componentDidCatch`
- Spec-Glob `error.tsx` findet nur Route-Level. Class-level in `src/components/**` bleibt silent.
- Bei Observability-Migrations IMMER beide greppen:
  find src/app -name 'error.tsx'
  grep -rn 'componentDidCatch\|getDerivedStateFromError' src/components/
```

**Positiv-Pattern für `memory/patterns.md`:**
```
Next.js error.tsx Boundary-Instrumentation (Slice 176d)
- useEffect(() => captureError(error, { feature: '<slug>-error-boundary', extra: error.digest ? { digest } : undefined }), [error])
- error.digest ist Prod-Feature (ersetzt Message). Immer als extra.digest durchreichen.
- captureError VOR jeglicher Recovery-Logik — Reload würde Sentry-Flush blocken.
- feature-Tag: `<section>-error-boundary` kebab-case. Sub-Routes unterscheiden.
- Class-based React-Boundary: `componentStack` als extra (React-spezifischer Debug-Wert).
```

## Summary

Robuster Batch-Slice mit in-slice-Resolution des einzigen Scope-Gap-Findings. Alle 7 AC erfüllt, 15 Route-Boundaries + 1 class-based + 6 Call-Sites konsistent migriert. 21 distinct feature-Tags. tsc clean, 59 Tests grün (39 observability + 20 Content-Tests). Ein offener LOW-Doc-Drift (common-errors.md Pattern-Addendum) als separater Doc-Commit.

**Empfohlener nächster Slice:** 177 (Zod + Pilot-Schemas Tier B1) gemäß Tier-Plan. Finding #2 als optionales Doc-Addendum wenn Knowledge-Capture-Bucket abgearbeitet wird.
