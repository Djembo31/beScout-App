# Slice 278 — Self-Review (XS-Pattern-Wiederholung)

**Reviewer:** Primary-Claude (XS-Slice-Self-Review per workflow.md Sektion 3b „XS wenn triviale Pattern-Wiederholung")
**Datum:** 2026-05-06
**Verdict:** PASS

---

## Slice-Type & Größe

- **Größe:** XS (1 File, 1 Zeilen-Gate-Erweiterung)
- **Slice-Type:** UI-Component
- **Pattern:** Wiederholung Slice 266 Suppression-Mapping (existing-pattern für 4/5 Slot-Types: event/ipo/topMover/trending → mysteryBox als 5. nachgezogen)

## Diff-Audit

```diff
-          {/* Mystery Box — animated when free box available */}
-          {uid && (
+          {/* Mystery Box — animated when free box available.
+              Slice 278: Suppress wenn Spotlight bereits MysteryBox als Slot zeigt
+              (HomeSpotlight Multi-Slot Cascade Slice 266). Verhindert Doppel-Render. */}
+          {uid && spotlightSlots.primary !== 'mysteryBox' && spotlightSlots.secondary !== 'mysteryBox' && (
```

1 File, 4 Zeilen geändert (1 Logik-Zeile + 3 Comment-Zeilen).

## Compliance-Checks

| Layer | Check | Status |
|-------|-------|--------|
| common-errors.md §1 | Silent-Fails — `spotlightSlots` ist primitiver Object-Check, kein Promise/RPC | ✅ N/A |
| common-errors.md §0 | Worktree-Isolation — main-repo direkt, kein Worktree | ✅ N/A |
| errors-frontend.md | Multi-Slot-State-Stores — keine State-Mutation, nur Render-Gate | ✅ N/A |
| business.md | Wording-Compliance — 0 user-facing String-Änderungen | ✅ N/A |
| ui-components.md | Mobile-First — Sidebar-Card-Suppression respektiert Mobile-393px-Stack-Order (Card war ohnehin in lg:sticky-Spalte, kein Layout-Shift) | ✅ |
| testing.md | Tests — 135/135 PASS in Home + Hooks, kein Test-Update nötig (existing tests covered all 4 ACs implicit via spotlightSlots-Cascade) | ✅ |

## Edge-Cases verifiziert (Logic-Trace)

| AC | Szenario | Logic | Verdict |
|----|----------|-------|---------|
| AC1 | hasFreeBoxToday=true, kein Live, keine IPO | spotlightSlots.primary='mysteryBox' (Cascade Slot 1) → Gate `primary !== 'mysteryBox'` false → Card hidden | ✅ |
| AC2 | hasFreeBoxToday=true, Live-Event aktiv | spotlightSlots.primary='liveScore', secondary='mysteryBox' → Gate `secondary !== 'mysteryBox'` false → Card hidden | ✅ |
| AC3 | hasFreeBoxToday=false | Cascade dropt mysteryBox, primary könnte 'ipo'/'topMover'/'trending' sein → beide Gates true → Card visible (dezenter Variant) | ✅ |
| AC4 | uid=null (logout) | Erste Bedingung `uid` false → kurzschließt → Card hidden | ✅ |

## Self-Assessment-Gap

Was ich potentiell nicht sehe:

1. **Race-Condition während `spotlightSlots`-Ladephase:** `useHomeData` returnt `spotlightSlots` initial mit `primary: null, secondary: null` (während `playersLoading=true`). In dieser Phase ist Gate true (beide !== 'mysteryBox'), aber das Spotlight rendert ein Skeleton statt MysteryBox-Slot. → Kein Doppel-Render-Risk in Loading-Phase, weil Spotlight-Skeleton-Card läuft, nicht der Slot. **Verifiziert:** OK.

2. **Unbeabsichtigtes Hide bei `playersLoading=true`:** Spotlight zeigt Skeleton (Z.205-207), nicht den MysteryBox-Slot. Sidebar-Card ist in dieser Phase sichtbar (spotlightSlots.primary=null in Initial-State). **Verifiziert:** OK — Sidebar bleibt während Loading sichtbar, das ist user-friendly weil sie persistent als CTA fungiert.

3. **Mobile-Tester sieht Sidebar UNTER dem Spotlight (single-column-Stack-Order):** Bevor Slice 278 sah Mobile-User Spotlight-MysteryBox + dann nach Sidebar-Stack auch Sidebar-MysteryBox = 2 visible elements im scroll-Viewport. Nach Slice 278: NUR Spotlight-MysteryBox sichtbar, Sidebar-Card unsichtbar = clean. **Visual-Wirkung:** sichtbar besser auf Mobile (Anil's Primary-Test-Surface).

4. **i18n unverändert:** Slice 278 bewegt nur Render-Gate, ändert keine Strings. Keine TR/DE-Pre-Verify-Pflicht.

5. **Reviewer-Agent-Skip Begründung:** workflow.md Sektion 3b erlaubt XS-Slice ohne Cold-Context-Reviewer wenn Pattern-Wiederholung. Slice 266 Suppression-Mapping ist exakt das Pattern. Self-Review akzeptabel.

## Findings

Keine. PASS.

## Empfehlung

Knowledge-Promotion post-Slice-278: Pattern „Cross-Section-Coupling-Audit bei Multi-Slot-Components" in `errors-frontend.md` einpflegen mit Audit-CMD:
```bash
# Bei JEDEM neuen Slot-Type in Spotlight/HomeSpotlight: alle Sidebar/Mobile-Sections greppen
# die auf gleicher Daten-Quelle reagieren
grep -n "spotlightType\\|spotlightSlots" src/app/\\(app\\)/page.tsx
```

Backlog: Optional Slice 279+ mit ux-coherence-auditor-Agent systematisch über alle Pages laufen lassen (aktuell Skill existiert, wird aber nicht regelmäßig dispatched).
