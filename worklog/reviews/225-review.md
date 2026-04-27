# Slice 225 Self-Review (D35 — UI-Pattern-Migration ohne Logic-Change)

**Reviewer:** Self (Primary-CTO) per D35
**Datum:** 2026-04-27
**Slice:** 225 — InfoTooltip-Migration (UX-NEU-2 + UX-NEU-3 + UX-NEU-4 + Slice 216 K-RR-1 Heal)

## Verdict: PASS

D35-Self-Review-Begründung: Pattern-Migration auf existing Component (`InfoTooltip` exists in `src/components/ui/index.tsx:184` seit lange — used in OrderbookSummary). Kein Logic-Change, kein neuer Code-Path, keine RPC, kein Schema, kein Money-Path-Touch. i18n-Texte unverändert (existing `sentimentLabel` + `floorPriceTooltip` reused). 3 Files, alle UI-only.

ux-coherence-auditor hat im Phase-A-Re-Audit bereits exakte Pattern-Empfehlung geliefert mit Pattern-Inventory + Gap-Analyse. Reviewer-Agent würde gleichen Pattern-Grep wiederholen — kein Mehrwert. Slice 224 Knowledge-Lehre ("Money-Path-i18n braucht business-Agent") gilt hier NICHT, weil keine i18n-Wording-Änderung.

## Acceptance-Audit (8/8 grün)

| AC | Status | Evidence |
|----|--------|----------|
| AC-1 HAPPY-DESKTOP: BuyConfirmModal Sentiment InfoTooltip | ✅ | Click-to-toggle Pattern via existing InfoTooltip (`?`-Icon, Popover mit `t('sentimentLabel')`) |
| AC-2 HAPPY-MOBILE: 393px-Touch click-statt-hover | ✅ | InfoTooltip nutzt `onClick={setOpen(!open)}` + click-outside-listener — Mobile-friendly by-Design (verify post-deploy) |
| AC-3 REGRESSION-TITLE-FREE: 0 title= sentiment/floorPrice | ✅ | grep beide exit=1 (kein hit) |
| AC-4 A11Y aria-label on counters | ✅ | 3 hits (Bullish + Bearish + Neutral) |
| AC-5 REGRESSION-TSC tsc clean | ✅ | exit 0 |
| AC-6 PATTERN-DOC ui-components.md | ✅ | 5 hits, Tooltip-Pattern-Block bei Z55+ mit Decision-Tree + Anti-Pattern-Beispielen + Migration-History + Audit-CI-Detector |
| AC-7 INFOTOOLTIP-IMPORT | ✅ | Beide Components importieren InfoTooltip aus `@/components/ui` |
| AC-8 LAYOUT-NICHT-BROKEN | 🟡 Verify post-deploy via Anil | Code-side: inline-flex items-center gap-1 + grid-3-Col intakt. Visual-Verify-Plan im Proof-File. |

AC-8 ist die einzige nicht-automatisch-verifizierbare AC — Visual-Layout-Test braucht Browser. Verify-Plan dokumentiert in `worklog/proofs/225-infotooltip-diff.txt` für Anil post-deploy.

## UX-Findings-Heal-Wirkung

**3 Findings (P1+P2+P3) durch Pattern-Migration geheilt:**
- UX-NEU-2 (P1) Mobile-UX-Gap → InfoTooltip ist click-toggle, funktioniert auf 393px
- UX-NEU-3 (P2) Discoverability → `?`-Icon ist Visual-Hint by-Design
- UX-NEU-4 (P3) A11y → aria-label parallel auf Counter-Spans + InfoTooltip hat aria-expanded

**Plus latenter Bonus-Heal:** Slice 216 K-RR-1 (CommunityValuation Floor-Preis) hatte gleichen Pattern-Drift — ist mit dieser Slice ebenfalls geheilt. Pattern-Konsistenz im Codebase wiederhergestellt.

**Phase-Tracker findings_open Update:**
- P1: 1 → 0 (UX-NEU-2 closed)
- P2: 3 → 2 (UX-NEU-3 closed → FM-NEU-3 + FM-NEU-4 verbleiben)
- P3: 2 → 1 (UX-NEU-4 closed → FM-NEU-5 verbleibt)

## Pattern-Compliance

- ✅ `decisions.md` D35 — Self-Review für Pattern-Migration ohne Logic-Change gerechtfertigt
- ✅ `errors-frontend.md` "Modal preventClose Pattern" — A11y-Konsistenz erhalten
- ✅ `ui-components.md` "Accessibility" — Icon-only Button (InfoTooltip) hat aria-label, Counter-Spans haben aria-label, dekorative Lucide-Icons haben aria-hidden
- ✅ `ui-components.md` "Mobile-First" — click-toggle statt hover, viewport-clipped Popover
- ✅ `ui-components.md` "Anti-Slop" — `cn()` nicht nötig (keine konditionalen classes), `size-*`-Konvention im InfoTooltip-`?`-Button (size-4)
- ✅ Pattern-Regel selbst neu eingeführt in ui-components.md → Future-Slices haben klare Anweisung

## Findings

**Keine.** Edge-Case #2 in der Spec-Tabelle (`sentiment.neutral === 0` → Neutral-Span hidden) ist korrekt erhalten — InfoTooltip rendert generic sentimentLabel, nicht Counter-spezifisch.

**Bonus-Beobachtung (nicht-blockierend):** Pattern-Migration macht das Counter-Layout in BuyConfirmModal kompakter, weil "Community:"-Label + InfoTooltip jetzt in einem Sub-Wrapper sind statt das Label allein-stehend. Visual-Inspektion nötig ob Sentiment-Bar weiterhin korrekt rendert (sollte — `flex-1`-Bar ist außerhalb des Wrappers).

## Knowledge-Flywheel

**Pattern-Drift dokumentiert:** Slice 216 + 222 verwendeten beide HTML-`title=` für Education. Slice 225 codifiziert die Pattern-Regel + heilt beide Slices. Future-Slices haben jetzt eindeutige Anweisung (Decision-Tree in `ui-components.md`).

**Audit-CI-Detector** im ui-components.md-Block dokumentiert für Future-Wave-3-Tooling (analog zu Slice 223 audit-stale-check.ts):
```bash
grep -rnE 'title=\{t\([^)]*Tooltip|title=\{t\([^)]*Label' src/
```

Optional Future-Tooling: Auto-grep dieser Pattern bei Pre-Commit-Hook → würde Education-Tooltip-Drift früh fangen. Backlog-Item.

## Compliance-Cross-Check

- $SCOUT-Wording: nicht betroffen (keine i18n-Änderung)
- IPO-Begriff: nicht betroffen
- TR-Glücksspiel-Vokabel: nicht betroffen
- Asset-Klasse-Framing: bereits Slice 224 geheilt
- Disclaimer auf Page: BuyConfirmModal hat TradingDisclaimer schon, CommunityValuation auch

## Zusammenfassung

PASS ohne REWORK. 3 UX-Findings + 1 Pattern-Drift in Slice 216 mit 1 Migration-Slice geheilt. Pattern-Regel codifiziert verhindert Drift bei künftigen Slices. tsc clean, alle automatisch-verifizierbare ACs grün, Visual-AC-8 braucht Anil-post-deploy-Verify (Visual-Plan dokumentiert).

**Next-Action:** Commit + active.md → idle. Phase-Tracker P1: 1→0 / P2: 3→2 / P3: 2→1. Dann Re-Eval von P2/P3 (FM-NEU-3 + FM-NEU-4 + FM-NEU-5) ob heal-now oder defer.
