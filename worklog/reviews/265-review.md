# Post-BUILD Review: Slice 265 — StreakRiskCard

**Reviewer:** reviewer-Agent (cold context) · **Datum:** 2026-05-02 · **Verdict:** PASS

Sauber umgesetzt. Pre-Review Findings F-01 bis F-05 alle adressiert. Render-Branch-Logik korrekt (7 Cases manuell traced, kein Catch-22). i18n-Anti-Konflikt sauber. Wording-Compliance verifiziert (kein `kazan*`/`yatırım`/`gefährdet`/`verlieren` in den neuen Keys). Test-Coverage solide (10 → 22 Tests, +120%). Commit-ready.

---

## Spec-Coverage (12 ACs)

| AC | Status | Test-Location |
|----|--------|---------------|
| AC-01 (visible streak=7+shields=0) | ✓ | `ActionRequiredStack.test.tsx` Streak-Section |
| AC-02 (invisible streak<7) | ✓ | gleiche Section |
| AC-03 (invisible shields>0) | ✓ | gleiche Section |
| AC-04 (urgent variant streak>=14, red+pulse) | ✓ | assertet `border-red-400/30` + `animate-pulse` |
| AC-05 (default variant 7-13, orange, no pulse) | ✓ | assertet `border-orange-400/30` ohne pulse |
| AC-06 (i18n DE neutral) | ~ | via messages/de.json-Inspection (kein direkter Test) |
| AC-07 (i18n TR neutral, kein `kazan*`) | ~ | via messages/tr.json-Inspection |
| AC-08 (heroMode-guard scout) | ✓ | container.firstChild === null |
| AC-09 (no-link notification) | ✓ | queryByLabelText(streakRiskAriaLabel) absent + keine Lineup/Captain Links |
| AC-10 (streak overrides lineup-done) | ✓ | only StreakTitle visible |
| AC-11 (off-GW + at-risk visible) | ✓ | locksAtIso=null + at-risk → Card visible |
| AC-12 (defensive null) | ✓ | shieldsRemaining=null → Card invisible |

---

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| F-265-01 | MINOR | `ActionRequiredStack.tsx:56,61` | `countdownMs` destructured aber unused. **Pre-existing aus Slice 264, nicht in 265 eingeführt.** | Optional-Cleanup, kein Fix-Pflicht für 265. |
| F-265-02 | MINOR | `ActionRequiredStack.test.tsx` | Direkter String-Test für DE+TR-Wording fehlt (AC-06/07). Translation-Key-Mock returnt nur Key-Pfad. Wording-Compliance ist via messages/*.json-Inspection belegt. | Optional Snapshot-Test oder explicit `it('verifies wording is neutral DE')` mit Key→String-Map-Mock. **Nice-to-have.** |

---

## Render-Branch-Logik (7 Cases manuell traced, kein Catch-22)

| Case | locksAtIso | hasLineup | hasCaptain | isStreakAtRisk | Expected | Actual |
|------|------------|-----------|------------|----------------|----------|--------|
| A | null | * | * | true | Streak only | ✓ |
| B | valid | true | true | true | Streak only | ✓ |
| C | valid | false | * | true | Lineup + Streak | ✓ |
| D | valid (isLocked) | * | * | true | Streak only | ✓ |
| E | valid (isLocked) | * | * | false | null | ✓ |
| F | null | * | * | false | null | ✓ |
| G | valid | true | true | false | null | ✓ |

F-03 Render-Branch-Refactor ist konsistent. **Kein Catch-22.**

---

## Pre-Review-Followup (alle 5 Findings)

- **F-01 (P1, CTA-Drift):** ✓ ADRESSIERT — Card ist `<div role="status">`, kein `<Link>`, kein `href`, kein ArrowRight im Streak-Branch.
- **F-02 (P1, Wording):** ✓ ADRESSIERT — Title=`Streak-Erinnerung` / `Seri hatırlatması`, Subtitle deskriptiv, Badge=`Ohne Schild` / `Kalkan yok`. Kein `kazan*`/`yatırım`/`kayıp`/`gefährdet`/`verlieren`/`investier` (Grep-verifiziert).
- **F-03 (P2, Render-Branch Catch-22):** ✓ ADRESSIERT — 4 Guard-Branches mit korrekter Override-Logic. Streak-Card sichtbar in allen at-risk Edge-Cases.
- **F-04 (P2, defensive null):** ✓ ADRESSIERT — `streak >= 7 && shieldsRemaining === 0` (strict). AC-12 Test verifiziert.
- **F-05 (MINOR, Icon-Inventar):** ✓ ADRESSIERT — Nur `Flame`, kein Shield, kein ArrowRight im Streak-Branch.

---

## i18n Anti-Konflikt-Check (Slice 263-Lehre)

- 4 Einträge in DE + 4 in TR unter `home.actionStack.streakRisk*`
- Keine Top-Level-String-Variante `home.streakRisk` (verifiziert)
- Object/String-Drift: kein Konflikt ✓

---

## Wording-Compliance (business.md)

| Verbotenes Wort | DE | TR |
|-----------------|----|----|
| `kazan*` | n/a | ✗ |
| `yatırım` | n/a | ✗ |
| `kayıp`/`kayb*` | n/a | ✗ |
| `gefährdet` | ✗ (zu „Erinnerung" neutralisiert) | n/a |
| `verlieren`/`verlust` | ✗ | n/a |
| `investier*` | ✗ | n/a |

Information-only-Frame korrekt eingehalten ✓

---

## Mobile 393px-Layout

- Card-Pattern identisch zu Lineup/Captain (`px-4 py-3.5 rounded-2xl border min-h-[64px]`) ✓
- Touch-Target ≥ 44px (`min-h-[64px]`) ✓
- `flex-1 min-w-0` auf Title/Subtitle-Container — kein horizontaler Overflow ✓
- `flex-wrap` auf Title-Row ✓
- Stack `space-y-3` zwischen 1-3 Cards ✓
- `motion-safe:animate-pulse motion-reduce:animate-none` konsistent ✓

---

## Memo-Performance

- `memo(ActionRequiredStackInner)` korrekt wrapped ✓
- 8 Props alle Primitive (kein Object-Identity-Issue) ✓
- `useMemo` für countdown-Derivation mit `[locksAtIso, scopedActiveEventStatus]` deps korrekt ✓

---

## page.tsx-Verkabelung

- ActionRequiredStack-Call hat `streak={streak}` + `shieldsRemaining={shieldsRemaining}` aus `useHomeData()` ✓
- TypeScript-Compatibility: types match ✓
- D54 Definition-of-Done UI-Slice: Component in 1+ Page-Render-Tree importiert ✓

---

## Positive

- F-03-Refactor ist klean — 4 sequentielle Guard-Branches statt nested-conditional, jede mit klarem Inline-Kommentar
- Defensive null-State (F-04) mit strict `===` — eliminiert Silent-Fail-Klasse
- Wording-Vorab in Spec §13 wortgetreu in messages/*.json gespiegelt — keine Drift
- Test-Coverage 22 Tests (10 → 22, +120%) — alle 12 ACs (10 explizit, 2 via Inspection)
- Stateless-Component-Pattern konsequent durchgehalten
- Slice 263-Lehre angewandt — Pre-Build-i18n-Audit in Spec §8 explizit
- Pre-Review D62-Pattern wirkt: 5 Findings vor BUILD gefangen, 0 post-BUILD — ROI 4-8x bestätigt

---

## Learnings für Knowledge Capture

1. **patterns.md-Kandidat:** "Render-Branch-Refactor für Multi-Action-Stack" — Pattern-Sequenz `if guard-1 return null; ... if (allDone-1 && !optionalAction) return null; const showX = baseShow && !blockingState && !!sourceTrue;`. Slice 264+265 ist 2. Iteration.
2. **Pre-Review-Wirksamkeit:** D62 Pattern liefert konsistent ROI ≥ 4x bei Wording-heiklen UI-Slices. Slice 265 = Beleg #6.
3. **errors-frontend.md-Kandidat:** "Defensive null-strict-equality bei optional-resolved Hook-Daten" — `=== 0` strict statt `!value` für `number | null`-Hooks.

---

**Time-Spent:** 42 min (Cold-Context Read + Trace + Verify + Write)
