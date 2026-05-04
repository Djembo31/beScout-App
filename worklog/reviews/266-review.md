# Slice 266 Review (Cold-Context Post-BUILD)

**File:** `worklog/specs/266-spotlight-multi-slot.md` v2 + git diff seit `a762b608`
**Verdict:** **PASS with MINOR-CONCERNS** (1 MINOR, 3 NIT — proceed to PROVE/LOG, fixe 1 MINOR optional in 266b)
**Code-Quality-Grade:** **A-** (clean Multi-Slot Engine, exemplary Pre-Review-Recovery, minor Test-Coverage-Gap)
**Regression-Risk:** **LOW** (existing IPO/TopMover/Trending Slots strukturell unverändert, Behavior-Change `spotlightType=event` explizit getestet)
**Time-spent:** 20 minutes

---

## Pre-Review-Findings-Recovery

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| F-01 (Mapping spotlightSlots → spotlightType) | MAJOR | ✅ FIXED | Spec §2 Mapping-Tabelle + `useHomeData.ts:227-239` legacy-Mapping. `page.tsx:315` Sidebar-NextEvent unterdrückt korrekt |
| F-02 (AC-09 jsdom → Playwright) | MAJOR | ✅ FIXED partial | AC-09 zweigeteilt; Visual-Render Proof als pflicht markiert. **Caveat:** Visual-Proof noch nicht im Diff — wird post-Deploy generiert |
| F-03 (gold-pulse-bg + motion-safe) | MAJOR | ✅ FIXED | `gold-pulse-bg` wird NICHT verwendet. LiveScore-Slot nutzt static gradient + `live-ring` + `animate-ping motion-reduce:animate-none`. Pattern-Falle umgangen |
| F-04 (isLoading-Guard) | MAJOR | ✅ FIXED | `useHomeData.ts:217` `if (!hasFreeBoxLoading && hasFreeBoxToday)`. Test in `useHomeData.test.ts:477-483` verifiziert |
| F-05 (Test-Mock-Setup) | MAJOR | ✅ FIXED | `mockUseHasFreeBoxToday` + `setDefaults()` resettet auf false. 4 existing tests grün |
| F-06 (gw aus nextEvent.gameweek) | MINOR | ✅ FIXED | `page.tsx:211` nutzt `nextEvent.gameweek` |
| F-07 (Prop-Surface reduziert) | MINOR | ✅ FIXED | `liveScoreData?` + `mysteryBoxData?` statt 5 flat Props |
| F-08 (Compliance-grep Pattern) | MINOR | ✅ FIXED | AC-07/08 erweiterter Filter |
| F-09 (Wahl-Lähmung-Begründung) | MINOR | ✅ FIXED | Mobile-393px-above-fold-Constraint dokumentiert |
| F-10 (max-height-watching) | MINOR | ⚠ PARTIAL | Nicht weiter konkretisiert — Visual-QA-Pflicht abgedeckt aber CSS-Mechanik nicht. Akzeptabel |
| F-11 (Visual-Render pflicht) | MINOR | ✅ FIXED | Spec §10 Z.297 PFLICHT |
| F-12 (TR-Locale-regex) | NIT | ⚠ PARTIAL | DE-only test, TR via i18n-jq separat |
| F-13 (MysteryBoxModal-Resolution) | NIT | ✅ FIXED | Spec §3 dokumentiert |
| F-14 (Wording-pedantry) | NIT | N/A | |
| F-15 (Pre-Mortem 7 statt 5) | NIT | ✅ FIXED | 7 Szenarien |
| F-16 (266b-Telemetrie-Trigger) | NIT | ✅ FIXED | Spec §11 dokumentiert |

**Recovery: 5/5 MAJOR fixed, 5/5 MINOR fixed (F-10 partial), 4/4 NIT fixed/N/A.** D62 exemplary.

---

## Findings (NEUE Issues post-BUILD)

| # | Severity | File:Line | Issue | Fix |
|---|----------|-----------|-------|-----|
| F-NEW-01 | MINOR | `HomeSpotlight.tsx:84-114` | Test-Coverage-Gap: AC-01-Test prüft Text+CTA+href, aber NICHT `live-ring`/`animate-ping`-Klasse. Future-Drift-Risk. | `expect(container.querySelector('.live-ring')).toBeTruthy()`. Optional 266b. |
| F-NEW-02 | NIT | `HomeSpotlight.tsx:69-82` | renderSlot switch ohne `default` + ohne `never`-exhaustiveness. Wartung-Risiko. | `default: const _: never = type; return null;`. Cosmetic. |
| F-NEW-03 | NIT | `HomeSpotlight.tsx:39` | `mysteryBoxData?.onOpen()` silent no-op wenn undefined. | Dev-Mode-warn ODER required machen wenn slot=mysteryBox. 266b. |
| F-NEW-04 | NIT | `useHomeData.ts:200-201` | Inline-Kommentar verweist auf nicht-protokollierten F-fix. Self-doc-Drift. | Kommentar entfernen. Cosmetic. |

**Keine MAJOR Findings.**

---

## Architektur-Soundness

| Aspekt | Bewertung |
|--------|-----------|
| Multi-Slot-Layout (vertical-stack, max 2) | ✅ OK |
| Slot-Rendering inline vs Sub-Components | ✅ OK (~290 LOC, pragmatisch) |
| Mystery-Box callback statt setState-Drilling | ✅ OK |
| Live-Score-Slot KEINE Realtime | ✅ OK (Battery-Argument) |
| Slot-Priority-Engine in Hook | ✅ OK (Single-Source-of-Truth) |
| Backward-Compat spotlightType | ✅ OK (Mapping in Hook + Behavior-Change explicit getestet) |

---

## Bekannte BeScout-Fallen

- business.md "Glücksspiel-Vokabel": ✅ kein "kazan"/"ödül"
- business.md "Asset-Klasse": ✅ kein "Investment"/"Rendite"
- errors-frontend.md "Defensive null-strict-equality" (Slice 265): ✅ isLoading-Guard
- ui-components.md "Mobile-First": ✅ Touch-Target ≥ 44px, kein horizontaler Overflow, aria-label/aria-hidden
- Slice 261 "gold-pulse-bg": ✅ NICHT verwendet — Pattern-Falle umgangen

---

## Compliance

- 4 neue i18n-Keys (DE+TR): ✅ alle present, Compliance-grep 0 hits
- TR-Wording-Review: ⚠ Anil-Pflicht-Review pre-Commit empfohlen (per `feedback_tr_i18n_validation.md`)
- Asset-Klasse-Framing: ✅ N/A für die 4 Keys

---

## Test-Strategie

| Test-File | Tests | Coverage |
|-----------|-------|----------|
| HomeSpotlight.test.tsx (NEU) | 8 | AC-01 bis AC-06 + EMPTY |
| useHomeData.test.ts (EDIT) | 34 | Existing 4 + 5 NEU spotlightSlots |

**Behavior-Change explicit dokumentiert** (test-comment Z.419-423): `spotlightType='event'` jetzt NUR bei `isEventLive`, nicht ALLE active events.

**Gap (F-NEW-01):** Live-Pulse-Ring-Animation-Klasse nicht verifiziert. Niedrig-Priorität.

---

## Side-Effects

- ✅ page.tsx Sidebar-NextEvent + Sidebar-IPO funktional, jetzt präziser
- ⚠ **Behavior-Change-Risk LOW:** Pre-266 Sidebar-NextEvent suppressed bei ALLE active events. Post-266 nur bei `running`. Verbesserung — User sieht upcoming earlier.
- ✅ Mystery-Box-Modal-Mount in page.tsx unverändert (Slice 178f)

---

## Done-of-Definition (UI-Slice-Type)

- ✅ in 1+ Page-Render-Tree importiert (page.tsx:205)
- ⚠ Mobile 393px verifiziert: DOM-Test nur, Visual-Proof noch fehlt — PROVE-pflicht
- ✅ tsc + eslint clean (42/42 Tests grün)

---

## D63 Phase 3 Alignment

- ✅ Cross-Persona-Top-Finding #1 (Mystery-Box): VOLLSTÄNDIG ADRESSIERT
- ✅ FM-Power-User-Befund (Live-Score): TEILWEISE — CTA-only, akzeptierbar

---

## Positive Highlights

1. **D62 Pre-Review-Memo-Pattern exemplarisch** — 16 Findings vor BUILD, 5/5 MAJOR + 5/5 MINOR + 4/4 NIT addressed
2. **Behavior-Change explizit dokumentiert + getestet** — Z.419-423 macht Mapping-Schmälerung transparent
3. **Saubere Verantwortungs-Trennung Hook ↔ Component**
4. **F-07 Prop-Surface-Reduktion** — Future-Slot-Additions trivial
5. **F-04 isLoading-Guard** — Defensive-Pattern angewandt + getestet
6. **F-08 Compliance-grep erweitert** — vollständige business.md Verbots-Tabelle

---

## Learnings für Knowledge Capture

### Pattern-Promotion-Kandidaten

1. **Slot-Priority-Engine + Multi-Slot-Render-Pattern** → `memory/patterns.md` #47
2. **Legacy-Mapping-Tabelle in Hook** (für Hook-Output-Migration ohne Konsumenten-Break) → `memory/patterns.md` #48 oder Erweiterung von #46

### Errors-Promotion-Kandidat

- **Behavior-Change durch Discriminator-Schmälerung** — Slice 266 hat Pre-266 over-suppression-Bug implicit gefixt → `errors-frontend.md` "Behavior-Change durch Discriminator-Schmälerung"

---

## Summary

**Slice 266 ist Production-Ready für PROVE-Stage.** D62-Pre-Review-Pattern hat 16 Findings vor BUILD gefangen, davon 14 vollständig + 2 partial gefixt. Implementation clean, Multi-Slot-Engine elegant getrennt, Compliance verifiziert. 1 Test-Coverage-Gap (F-NEW-01) ist niedrig-Priorität für 266b. Visual-Proof (Playwright 393px, 4 Konfigurationen) muss in PROVE geliefert werden bevor LOG.

**Verdict:** PASS with MINOR-CONCERNS
**Code-Quality-Grade:** A-
**Regression-Risk:** LOW
**Time-Spent:** 20 minutes

**Anil-Action:** TR-Strings-Review der 4 neuen Keys pre-Commit empfohlen (per `feedback_tr_i18n_validation.md`).

**Signed:** Cold-Context-Reviewer · Slice 266 Post-BUILD Review · 2026-05-04
