# Slice 266 Pre-Review (Cold-Context)

**File:** `worklog/specs/266-spotlight-multi-slot.md`
**Verdict:** **PASS with CONCERNS** (5 MAJOR, 7 MINOR, 4 NIT — proceed to BUILD after addressing F-01 to F-05)
**Spec-Quality-Grade:** **B+** (solid M-Spec, fehlt 1 Pflicht-Sektion technisch, einige Architektur-Drifts)
**Estimated-Build-Effort:** M (1.5-2h)
**Time-spent:** 25 minutes

---

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| F-01 | **MAJOR** | Spec §2 Slot-Priority Tabelle | Inkonsistenz mit existing useHomeData spotlightType cascade. Existing hat Reihenfolge `ipo > event > topMover > trending > cta`. Neue spotlightSlots droppt 'event'. `page.tsx:312` checkt `spotlightType !== 'event'` für Sidebar-NextEvent. Wenn primarySlot=liveScore → spotlightType='cta' → Sidebar-NextEvent rendert (Doppel-Live-Hint-Risiko). | Spec §2 ergänzen: explizite Mapping-Tabelle. Vorschlag: `spotlightType = primarySlot if primary in {ipo, topMover, trending} else (event if primary === liveScore else cta)`. |
| F-02 | **MAJOR** | Spec §6 AC-09 (Mobile 393px) | jsdom kann kein Layout/scrollLeft/computed-style. AC-09 wird "always passes". | AC-09 zu Playwright (post-Deploy) hochstufen ODER downgrade auf "DOM-Struktur-Klassen vorhanden". Empfehlung: Playwright-Pflicht, Visual-Render in §10 von "optional" auf "pflicht vor LOG". |
| F-03 | **MAJOR** | Spec §13 Pre-Mortem | Fehlt: gold-pulse-bg Pattern-Falle (errors-frontend.md Slice 261). Live-Pulse-Ring + `gold-pulse-bg` ohne `motion-safe:animate-pulse motion-reduce:animate-none` rendert statisch. | Pre-Mortem #6 hinzufügen + Pattern-Reference §5 ergänzen (errors-frontend.md Slice 261 Pattern). |
| F-04 | **MAJOR** | Spec §7 Edge-Case #1 + §6 AC-02 | `useHasFreeBoxToday` returnt boolean (nie null). Echte Falle ist initial-true-state (default-truthy). | Edge-Case #1 präzisieren: zusätzlicher `isLoading`-Guard (`!isLoading && hasFreeBoxToday === true`). |
| F-05 | **MAJOR** | Spec §3 Betroffene Files | Test-Mock-Setup für neue Hooks (`useHasFreeBoxToday`, `useEvents`-status) NICHT dokumentiert. Existing Tests könnten brechen. | Spec §3 erweitern: Mock-Setup-Pattern + default-Returns spezifizieren. |
| F-06 | MINOR | Spec §2 + §6 AC-01 | `gw` aus useHomeData ist `scopedActiveEvent?.gameweek ?? 1` (per Liga). liveScore-Slot sollte `nextEvent.gameweek` (global running event) nutzen. | Klären welcher gw-Wert. Empfehlung: `nextEvent.gameweek` — konsistent mit isEventLive-Source. |
| F-07 | MINOR | Spec §2 Datenfluss | 5 neue Props redundant zu spotlightSlots-Engine (hasFreeBoxToday + isEventLive sind in primary/secondary kodiert). | Vereinfachen: `{ slots, livescoreData?, mysteryBoxData? }` statt 5 flache Props. |
| F-08 | MINOR | Spec §6 AC-07 | Compliance-grep-Pattern unvollständig. Fehlt: rendite, yatırım, portföy. | AC-07 + AC-08 erweitern: business.md erweiterte Verbots-Tabelle als Filter. |
| F-09 | MINOR | Spec §9 Autonom-Zone | "Wahl-Lähmung"-Begründung ist Hick's-Law — eigentlicher Grund: Mobile-393px-above-fold-Real-Estate. | Begründung umformulieren auf Mobile-Constraint. |
| F-10 | MINOR | Spec §13 Pre-Mortem #2 | "max-height-watching" zu vage. | Konkretisieren: collapse-able details/summary ODER reduzierte secondary-Card-Höhe. |
| F-11 | MINOR | Spec §10 Proof-Plan | Wenn AC-09 in jsdom unzureichend → Playwright wird Pflicht-Beweis. | Visual-Render auf "pflicht vor LOG". |
| F-12 | NIT | Spec §6 AC-01 EXPECTED | TR-Locale-regex fehlt. | `/Live|Canlı/` flexibel matchen. |
| F-13 | NIT | Spec §3 + §4 | "MysteryBoxButton (oder MysteryBoxModal)" — File pre-BUILD klären. | grep vor BUILD. |
| F-14 | NIT | Spec §7 Edge-Case #6 | "setState idempotent" Wording-pedantry. | Detail-Fix optional. |
| F-15 | NIT | Spec §13 Pre-Mortem | 5 Szenarien (M-Mindestmaß), aber 7 wären sicherer. | Optional ergänzen. |
| F-16 | NIT | Spec §11 Scope-Out | Sidebar-Doppelung kurzfristig OK, aber post-Telemetrie-Cleanup-Trace fehlt. | Slice 266b-Notiz ergänzen. |

---

## Architektur-Soundness

| Aspekt | Bewertung |
|--------|-----------|
| 2-Slot-Maximum | OK (mit F-09-Fix) |
| Slot-Priority-Reihenfolge | OK |
| Backward-Compat spotlightType | CONCERNS (F-01) |
| Inline-Branches ~300 LOC | OK (anti-slop-konform) |
| Mystery-Box-Click-Drilling: callback | OK |
| Live-Score-Slot KEINE Realtime | OK (Battery-Argument) |

---

## Compliance-Drahtseilakt

- 4 neue i18n-Keys: PASS für vorgeschlagene Strings
- Mystery-Box-Wording: PASS ("öffnen"/"aç")
- Live-Score-Wording: PASS (informativ)
- TR-Validation-Markierung: PASS (Anil-Pflicht-Review pre-Commit)
- Caveat: AC-07/AC-08 grep-Pattern unvollständig (F-08)

---

## Test-Strategie

| Aspekt | Bewertung | Issue |
|--------|-----------|-------|
| HomeSpotlight.test.tsx (NEU) | OK | Wrapper-Stil/useTranslations-Mock NICHT in Spec |
| useHomeData.test.ts EDIT | CONCERNS (F-05) | Mock-Setup nicht dokumentiert |
| i18n-jq-Verify | PASS | PowerShell-konform |
| Compliance-grep | MINOR (F-08) | Pattern unvollständig |
| AC-09 Mobile | MAJOR (F-02) | jsdom unzureichend |

---

## D63 Phase 3 Alignment

- **Cross-Persona-Top-Finding #1 (Mystery-Box):** VOLLSTÄNDIG ADRESSIERT
- **FM-Power-User-Befund (Live-Score):** TEILWEISE — CTA only, keine Live-Daten. Akzeptierbar pro Slice-Scope, aber Anil sollte das beim Pre-Commit-Review wissen.

---

## Empfehlung

5 MAJOR-Findings vor BUILD adressieren (Spec-Edit ~20 Min):

1. F-01 (Mapping spotlightSlots → spotlightType + Sidebar-Disambiguierung)
2. F-02 (AC-09 jsdom → Playwright-Pflicht)
3. F-03 (gold-pulse-bg + motion-safe Pattern)
4. F-04 (hasFreeBoxToday-isLoading-Guard)
5. F-05 (Test-Mock-Setup dokumentieren)

Plus 4 MINOR (F-06 gw, F-07 Prop-Surface, F-08 grep, F-13 MB-File-grep) wenn schnell-machbar.

Nach Edit: BUILD bereit.

**D62-Konformität:** 8. D62-Slice in Folge. Pre-Review-Stage durchlaufen.

**Signed:** Cold-Context-Reviewer · Slice 266 Pre-Review · 2026-05-04
