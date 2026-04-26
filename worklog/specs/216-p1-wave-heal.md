# Slice 216 — P1-Wave-Heal: FM-NEU-1 + UX-NEU-1 + K-RR-1

**Status:** SPEC · **Größe:** M (3 frontend-only Heals als Bundle, kein Money-Path) · **Scope:** CTO · **Datum:** 2026-04-26

## 1. Problem Statement

Phase-Tracker (post-Slice-217 Trial) zeigt **last_signoff=FAIL** mit P1=3 als kanten-PASS. Sign-Off-Gate-Bedingung für CLEAN-PASS: P1=0. Die 3 P1-Findings sind alle frontend-only, kein Money-Path, kein CEO-Approval-Bedarf — perfekt für Wave-Heal in einem Slice.

**Findings (aus aggregate.md + auto-generated stubs):**
1. **FM-NEU-1** (`worklog/specs/214-derived-p1-fm-001.md`): PickRateBadge nur in `cards`-View, NICHT in `compact`-View → Slice 204 Regression. FM-Power-User mit compact-Layout verliert Pick-Rate-Signal.
2. **UX-NEU-1** (`worklog/specs/214-derived-p1-ux-002.md`): FeedbackModal hat `loading`-State aber `<Dialog>` hat KEIN `preventClose={loading}` → Modal kann während async-Submit via ESC/Backdrop geschlossen werden, State-Loss möglich.
3. **K-RR-1** (`worklog/specs/214-derived-p1-k-003.md`): Casual sieht "Marktpreis" (i18n-Wert für `floorPrice`) ohne Erklärung. `floorPriceTooltip` i18n-Key existiert in DE+TR aber wird nicht verwendet. Casual-Bounce-Risk.

## 2. Lösungs-Design

**3 minimal-invasive Heals:**

**Heal 1 (FM-NEU-1):** `ClubContent.tsx:608-614` compact-Branch erweitern um PickRateBadge analog cards-Branch. Wrapper-`<div>` ggf nötig für Position-Absolute-Badge (compact ist `<div className="space-y-1">` mit `<PlayerDisplay variant="compact">` flat). Pragmatic-Pick: PickRateBadge inline neben PlayerDisplay (Layout-Drift minimiert).

**Heal 2 (UX-NEU-1):** `FeedbackModal.tsx:60` Dialog-Props erweitern: `preventClose={loading}`. Dialog-Component muss `preventClose`-Prop unterstützen — verifizieren, sonst Pattern aus anderen Modals nehmen.

**Heal 3 (K-RR-1):** `CommunityValuation.tsx:110` `<div>` mit `title={t('floorPriceTooltip')}` ergänzen — native HTML-Tooltip auf Hover (kein neue Tooltip-Component nötig). Plus optional `<Info>`-Icon (lucide) als visueller Hinweis dass Tooltip da ist. Pragmatic-Pick: nur title-Attribut, ohne Icon (minimal Change, keine Layout-Drift).

## 3. Betroffene Files

| File | Aktion | Zeilen | Begründung |
|------|--------|--------|------------|
| `src/app/(app)/club/[slug]/ClubContent.tsx` | EDIT | 608-614 (compact-Branch) | PickRateBadge in compact-View |
| `src/components/layout/FeedbackModal.tsx` | EDIT | 60 (Dialog-Props) | `preventClose={loading}` |
| `src/components/player/detail/CommunityValuation.tsx` | EDIT | 110 (Floor-Preis Label) | `title={t('floorPriceTooltip')}` |

**Total:** 3 Edits, kein neuer File, kein i18n-Edit (Keys existieren bereits).

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `src/app/(app)/club/[slug]/ClubContent.tsx:595-615` | cards vs compact view-Branch | Wie ist PickRateBadge in cards positioniert? Wrapper-relative? |
| `src/components/player/PickRateBadge.tsx` (oder ähnlich) | Badge-Component | Self-contained? Position-Pflicht? |
| `src/components/layout/FeedbackModal.tsx:55-75` | Dialog-Wrapper | preventClose-Prop akzeptiert? |
| `src/components/ui/Dialog.tsx` (oder Modal) | Dialog-API | preventClose-Prop existiert + funktioniert? |
| `src/components/player/detail/CommunityValuation.tsx:100-117` | Floor-Preis-Karte | i18n-Aufruf + DOM-Struktur |
| `messages/de.json:1469` + `messages/tr.json:1465` | `floorPriceTooltip` | Inhalt OK? business.md-konform? |
| `worklog/specs/214-derived-p1-*.md` | Auto-Generated Stubs | Reproducer-Hinweise |

## 5. Pattern-References

- **decisions.md D50** (Slice 211) — Spec-Standard
- **errors-frontend.md** "Modal preventClose Pattern (J2 + J3)" — UX-NEU-1 Heal exakt dieses Pattern
- **errors-frontend.md** "Multi-League Props-Propagation" — FM-NEU-1 verwandt (Feature in 1 Branch nicht propagiert)
- **patterns.md #36** (Polish-Audit Pre-Existing-Code-Grep) — vor Heal: grep ob Code bereits existiert (Audit-Stale-Catcher)
- **business.md** Asset-Klasse-Wording — bei Floor-Preis-Tooltip nicht "Marktpreis steigt mit MV", "Anteilseigner"-Framing vermeiden

## 6. Acceptance Criteria

**AC-01:** [FM-NEU-1] PickRateBadge in compact-View sichtbar
- VERIFY: `grep -A 5 "squadView === 'cards' ? (" "src/app/(app)/club/[slug]/ClubContent.tsx" | grep PickRateBadge` UND analoger compact-Branch hat auch PickRateBadge
- EXPECTED: Badge in beiden Branches
- FAIL IF: Nur cards-Branch hat Badge

**AC-02:** [UX-NEU-1] FeedbackModal Dialog hat preventClose={loading}
- VERIFY: `grep "preventClose" src/components/layout/FeedbackModal.tsx`
- EXPECTED: 1 Treffer
- FAIL IF: 0 Treffer

**AC-03:** [K-RR-1] Floor-Preis Label hat title-Attribut mit Tooltip-i18n
- VERIFY: `grep "floorPriceTooltip" src/components/player/detail/CommunityValuation.tsx`
- EXPECTED: 1 Treffer
- FAIL IF: 0

**AC-04:** [STRUCTURAL] tsc clean
- VERIFY: `npx tsc --noEmit`
- EXPECTED: keine Output
- FAIL IF: Type-Errors

**AC-05:** [REGRESSION] vitest existing Tests bleiben grün
- VERIFY: `npx vitest run src/app/\(app\)/club src/components/layout src/components/player/detail 2>&1 | tail -3`
- EXPECTED: Tests grün die existieren
- FAIL IF: neuer Failure

**AC-06:** [I18N] floorPriceTooltip existiert in DE+TR (pre-existing)
- VERIFY: `grep "floorPriceTooltip" messages/de.json messages/tr.json | wc -l`
- EXPECTED: ≥2 Treffer
- FAIL IF: <2

**AC-07:** [PHASE-TRACKER] beta-phase.md findings_open.P1 = 0
- VERIFY: post-Heal `grep "P1:" worklog/beta-phase.md`
- EXPECTED: P1: 0
- FAIL IF: P1 unverändert

**AC-08:** [HOOK-LIVE-TEST] ship-spec-quality-gate WARN/silent korrekt
- VERIFY: Hook silent während Slice 216 BUILD (Spec hat 13 Sektionen)
- EXPECTED: silent
- FAIL IF: false-positive WARN

**AC-09:** [REVIEWER] Reviewer-Agent PASS or PASS-with-Heal
- VERIFY: `worklog/reviews/216-review.md` verdict
- EXPECTED: PASS oder REWORK→PASS post-Heal
- FAIL IF: FAIL

## 7. Edge Cases

| # | Heal | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | FM | compact-View hat keine pickRateMap | Badge silent ausblenden (`pickRate !== undefined`) | analog cards-Branch |
| 2 | UX | loading-state bleibt true forever (Server timeout) | preventClose blockt User permanent | loading-Reset im finally-Block (existing) |
| 3 | UX | Dialog-Component akzeptiert preventClose nicht | TypeScript-Error oder silent ignored | Pre-Implementation-Check Dialog.tsx-API |
| 4 | K-RR-1 | title-Attribut nicht touch-friendly auf Mobile | iOS Hover existiert nicht | Pragmatic-trade-off: Desktop+Tablet Casual 80% Use, Mobile-Popover wäre eigener Slice |
| 5 | K-RR-1 | Tooltip-Text zu lang | Native title browser-truncated | i18n-Wert ist 1 Satz, ~80 Zeichen — OK |
| 6 | FM | PickRateBadge in compact-View bricht Layout (compact ist tight) | Visual-Drift | inline-position vorerst, falls broken: absolute mit z-index |

## 8. Self-Verification Commands

```bash
# AC-01 + AC-02 + AC-03:
grep -A 7 "squadView === 'cards'" "src/app/(app)/club/[slug]/ClubContent.tsx" | grep -c "PickRateBadge"
grep "PickRateBadge" "src/app/(app)/club/[slug]/ClubContent.tsx"
grep "preventClose" src/components/layout/FeedbackModal.tsx
grep "floorPriceTooltip" src/components/player/detail/CommunityValuation.tsx

# AC-04 + AC-05:
npx tsc --noEmit
npx vitest run src/app/\(app\)/club src/components/layout src/components/player/detail 2>&1 | tail -5

# AC-06 (pre-existing):
grep "floorPriceTooltip" messages/de.json messages/tr.json

# AC-08 Hook live-test:
echo '{"file_path":"src/app/(app)/club/[slug]/ClubContent.tsx"}' | bash .claude/hooks/ship-spec-quality-gate.sh 2>&1
echo "Exit: $?"

# Pre-Existing-Code-Grep (D48 catcher) — kein duplicate Audit
grep -rn "PickRateBadge" "src/app/(app)/club/" | head -5
```

## 9. Open-Questions

**Pflicht-Klärung:**
1. **PickRateBadge in compact: Position-Strategie?** → **Antwort:** inline neben PlayerDisplay (gleiches Wrapper-`<div>`-Pattern wie cards). Falls Layout bricht → absolute mit small-position.
2. **Dialog akzeptiert preventClose?** → muss Code-Read verifizieren.
3. **Touch-friendly Tooltip nötig?** → **Antwort:** Nein für Slice 216 (native title reicht für Desktop-Casual). Mobile-Popover wäre eigener Slice 219+.

**Autonom-Zone:** Component-Naming, exact JSX-Struktur, Helper-Variablen.

**Nicht-Autonom:** i18n-Keys (existieren), Wording (business.md-konform).

## 10. Proof-Plan

1. AC-Audit-Block 9/9 grün
2. Phase-Tracker-Update: P1=3→0, last_signoff weiter FAIL (Tester-List + Onboarding-Doc fehlen, P1=0 alleine reicht nicht für PASS)
3. Output: `worklog/proofs/216-p1-wave-heal.txt`
4. Reviewer-Agent dispatcht: prüft Visual-Behavior + Pattern-Konformität + Wave-Bundle-Kohärenz
5. Stub-Files (`214-derived-p1-fm-001.md` + `-ux-002.md` + `-k-003.md`) als "closed by Slice 216" markieren ODER löschen

## 11. Scope-Out

- **Mobile-Popover für Floor-Preis** (touch-Tooltip-Substitut) — Slice 219+
- **PickRateBadge Position-Refactor** (cards + compact einheitlich) — Slice 219+ falls Visual-Drift
- **Tooltip-Component-Library** (Generic-Component, kein native title) — premature abstraction
- **i18n neue Keys** — existieren bereits

## 12. Stage-Chain

SPEC → IMPACT (skipped: 3 frontend-only-Files) → BUILD (3 sequenzielle Edits + tsc nach jedem) → REVIEW (reviewer-Agent — pflicht ab S-Größe, hier M-Bundle) → PROVE (AC-Audit + Phase-Tracker-Update) → LOG.

## 13. Pre-Mortem (M-Slice optional, hier 5 Szenarien)

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | Dialog akzeptiert preventClose nicht | LOW | mittel | Code-Read pre-impl | grep Dialog.tsx |
| 2 | PickRateBadge in compact bricht Layout (zu eng) | MED | niedrig (visuelles Drift) | Smoke-Test gegen bescout.net post-deploy, Anil verify | manual-Inkognito |
| 3 | title-Attribut nicht-mobil reicht nicht für Casual-Bounce-Vermeidung | MED | niedrig (Findings bleibt teil-offen) | Mobile-Popover Slice 219 als Backlog | echte Tester-Feedback |
| 4 | Slice-Heal hinterlässt PickRateBadge-Wrapper-Drift in cards (Regression) | LOW | mittel | Reviewer-Agent fängt | git diff comparing pre/post |
| 5 | tsc/vitest crash bei einer der 3 Edits → Slice partial | LOW | mittel | sequenziell + tsc nach jedem File | per-Edit-Verify |

---

## Compliance-Check

- Kein Money-Path (Floor-Preis-Tooltip ist informativ, kein Trade-Action)
- TR-Wording: `floorPriceTooltip` in TR existiert ("Floor Price = Bu oyuncu için piyasadaki en ucuz mevcut teklif") — neutrales Marktplatz-Vokabel ✓
- DE-Wording: "Floor Price = günstigstes verfügbares Angebot..." — neutral ✓
- Asset-Klasse-Drift: kein "Marktwert steigt", kein "Investiere"-Framing ✓

## TR-Wording

`floorPriceTooltip` (TR) existiert: "Floor Price = Bu oyuncu için piyasadaki en ucuz mevcut teklif." — business.md-konform, kein "yatırım/kazanmak/kar"-Drift.

## Open Risiko

3 Heals in 1 Slice — wenn 1 fail, Slice partial. Mitigation: sequenziell + tsc nach jedem File. Falls 1 broken → Stub-File für den einen behält offen, Slice schließt mit 2/3.
