# Active Slice

```
status: idle
slice: 278
stage: LOG (commit pending push)
spec: in-active-md (XS-Slice Hot-Fix)
impact: page.tsx Z.386 Gate erweitert (1 Zeile)
proof: worklog/proofs/278-mystery-box-doppel-fix.txt
review: self-review (XS Pattern-Wiederholung Slice 266, vitest 135/135 PASS)
```

## Slice 278 — MysteryBox-Doppel-Render auf Home (Anil-Live-Bug 2026-05-06)

**Anil-Trigger 2026-05-06 ~15:35:** „wieviele mysteryboxen habe ich im home? ich habe das gefühl das es 2 mal auftritt"

**Diagnose (5-min Code-Reading):**

MysteryBox erscheint im Home an 2 Stellen, beide gefüttert vom selben `hasFreeBoxToday`-Flag:

| Stelle | File:Line | Sichtbarkeits-Bedingung |
|--------|-----------|------------------------|
| HomeSpotlight Slot | `HomeSpotlight.tsx:73-74` (gerendert via `page.tsx:208-216`) | `hasFreeBoxToday === true` (sonst Slot fällt raus, Cascade rückt nach) |
| Sidebar/Mobile Card | `page.tsx:386-450` | `uid !== null` (immer wenn eingeloggt) — KEIN Suppression-Gate |

**Root-Cause:** Slice 266 hat Multi-Slot-Spotlight eingeführt + Suppression-Mapping in `page.tsx` für event/ipo/topMover/trending erfasst. **MysteryBox wurde im Multi-Slot-Refactor übersehen** — Sidebar-Card hat keinen `spotlightSlots.primary !== 'mysteryBox'`-Gate.

**Fix (1 Zeile):** `page.tsx:386` Gate erweitern:
```tsx
// Vorher
{uid && (
  <Card ...>

// Nachher
{uid && spotlightSlots.primary !== 'mysteryBox' && spotlightSlots.secondary !== 'mysteryBox' && (
  <Card ...>
```

**Acceptance Criteria:**

| # | Szenario | Erwartung |
|---|----------|-----------|
| AC1 | `hasFreeBoxToday=true`, kein Live-Event, keine IPO | Spotlight zeigt MysteryBox als primary, Sidebar-Card unsichtbar (Suppression aktiv) |
| AC2 | `hasFreeBoxToday=true`, Live-Event aktiv | Spotlight zeigt liveScore (primary) + mysteryBox (secondary), Sidebar-Card unsichtbar |
| AC3 | `hasFreeBoxToday=false` | Spotlight cascade ohne mysteryBox-Slot, Sidebar-Card sichtbar (dezenter Variant „Holst du dir morgen") |
| AC4 | `uid === null` (logout) | Sidebar-Card unsichtbar (existing behavior) |

**Self-Verification:** `npx tsc --noEmit` clean + bestehende vitest-Suite Home-Tests grün.

**Knowledge-Promotion-Kandidat:** Pattern „Cross-Section-Coupling-Audit bei neuen Multi-Slot-Components" — wenn ein Slot-Container neue Slot-Types einführt, MUSS systematisch geprüft werden welche Sidebar/Mobile-Sections doppelt zeigen würden. Slice 266 hat das für 4 von 5 Slot-Types gemacht (event/ipo/topMover/trending), für mysteryBox vergessen. Errors-frontend.md-Eintrag post-Slice-278.

**Scope-Out:** Cold-Start-Latency-Optimierung (Anil's 2. Frustration) ist nicht Teil von Slice 278 — separates strategisches Thema (Lighthouse-CI-Gate, Bundle-Analysis).
