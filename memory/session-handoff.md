# Session Handoff
## Letzte Session: 2026-04-07 (Abend, ~3h)

## Was wurde gemacht (10 Commits, alle gepusht)

### Block 1: P1-P3 Bug Fixes (4 Commits)

**1. UX Fix Quick Actions Bar — `4e8ed7c`**
- `src/app/(app)/hooks/useHomeData.ts:174` 1-line change
- `showQuickActions = !!uid` (vorher nur wenn Onboarding fertig)
- Early-Stage User (1/5) sehen jetzt den Inventar-Link auf Home
- Verifiziert auf prod (jarvis-qa)

**2. score_event RPC 0-Lineup Fix — `e3d1cda`**
- Migration: `20260407190000_score_event_no_lineups_handling.sql`
- **Bug:** Wenn `current_entries > 0` (User zahlt) aber `lineups = 0` (kein Submit), returned RPC error → `scored_at` blieb NULL → Event orphaned
- **Root Cause:** `current_entries` zaehlt event_entries (Bezahlung), Scoring iteriert lineups (Submission). Nicht equivalent.
- **Fix:** Bei `v_scored_count = 0` set status='ended' + scored_at + return success+note='no_lineups'
- 1 Phantom Event geclosed (Sakaryaspor Fan Cup GW33)
- 31/31 scoring-v2 Tests gruen

**3. Tailwind features-scan Fix — `158ebcd`** ⚠️ CRITICAL FIND
- `tailwind.config.ts` content paths: `src/features/**` hinzugefuegt
- **Bug:** Tailwind JIT scannte nur `pages`/`components`/`app`. Klassen nur in `src/features/**` (118 Files) wurden silent NICHT generiert.
- Discovered durch Manager Desktop Layout Bug: `lg:flex-row` in ManagerContent.tsx war nicht im CSS Bundle
- **Impact:** Hat potentiell viele andere stille CSS-Bugs in fantasy/manager/market features gefixt
- **Lesson:** Bei jedem neuen Feature-Folder content paths in tailwind.config pruefen

**4. Manager Desktop Layout Side-by-Side — `158ebcd` (kombinierter fix)**
- War Folge des Tailwind features-Scans Fix
- Pitch + IntelPanel jetzt korrekt nebeneinander auf Desktop ≥lg

### Block 2: Cleanup + Features (3 Commits)

**5. KaderTab Cleanup — `5d3124d`**
- 7 Files geloescht (KaderTab + useKaderState + SquadSummaryStats + 3 Tests)
- −1662 LOC (15 KB)
- Nur Self-Test importierte sie noch
- bestandHelpers.tsx Comments aufgeraeumt

**6. BottomNav 5 → 7 Items horizontal scroll — `c0feef0`**
- Items: Home / Spieltag / Manager / Markt / Missionen / Inventar / Community
- `flex items-center gap-1 ... overflow-x-auto scrollbar-hide snap-x snap-mandatory`
- `w-[72px] flex-shrink-0` pro Item
- /inventory + /missions zeigen jetzt korrekten Active-State (war kein Item active)
- i18n DE+TR
- Test 4/4 gruen

**7. Equipment Detail-View — `27811d3`**
- Neue `EquipmentDetailModal.tsx` (~200 LOC)
- Tap auf Equipment-Card oeffnet Modal mit:
  - Big Icon + Multiplier (×1.10) prominent
  - Description (DE) — war hidden
  - Stats Grid: Position / Rank R/4 / Stack / Status
  - Quelle (Mystery Box / Achievement / etc) + Acquired-Date
- Mobile = Bottom-Sheet, Desktop = Modal (auto via Modal Component)
- Cards sind jetzt `<button>` mit aria-label + active scale + focus ring
- 15 neue i18n Keys DE+TR

### Block 3: Manager Team-Center Spec Process (4 Commits)

Anil zur aktuellen `/manager` Page: "Schrott, kein User-Nutzen. Sandbox ohne Output."

**8. Brainstorm Design — `4bdb3ad`**
- `docs/plans/2026-04-07-manager-team-center-design.md` (427 Zeilen)
- Process: `superpowers:brainstorming` Skill
- Vision: 3-Tab Hub
  - Tab 1 Aufstellen: LineupPanel (recycled aus EventDetailModal) + EventSelector + Direct Event Join
  - Tab 2 Kader: BestandTab migriert von /market mit Lens-System
  - Tab 3 Historie: getUserFantasyHistory mit lazy Lineup-Detail
- **Decision A:** Bestand wandert vollstaendig von /market nach /manager (loest Duplicate-Konflikt)
- Konkurrenten-Vergleich: Sorare/FPL/FM/DraftKings — niemand hat Sandbox-Lineup ohne Wirkung
- 5 Waves Migration Plan, jede shippable

**9. SPEC Phase 1 — `b83ff58`**
- `docs/plans/2026-04-07-manager-team-center-spec.md` (849 Zeilen)
- Process: `/spec` Skill Phase 1
- 1.1 Current State: 46 Features inventariert (15 MA + 14 BT + 15 LP + 2 FH)
- 1.2 Goals (6) + Non-Goals (12) + Anti-Requirements (8)
- 1.3 Migration Map: 54 Features mit Action (Move/Stays/Remove/Merge/Replace/Reuse/New)
- 1.4 Blast Radius: 7 Areas + 4 Cross-Over Analyses
- 1.5 Pre-Mortem: 12 Failure Scenarios
- 1.6 Invarianten (12) + Constraints (12)
- 1.7 Akzeptanzkriterien: 16 ACs Given/When/Then
- 6 Open Questions fuer Anil

**10. SPEC GATE PASSED — `756460f`**
- Anil's Antworten Q1-Q6 integriert:
  - Q1: expandedClubs nur BestandTab → managerStore
  - Q2: PortfolioTab Default 'angebote'
  - Q3: Single Open History Cards (Slidebar als Future Enhancement)
  - Q4: Stille localStorage Loeschung alte Presets
  - Q5: Wave 0 dedicated useLineupBuilder Hook Extraction
  - Q6: mySquadPlayers.length fuer PageHeader Stats
- SPEC GATE: 9/9 ✓

**11. PLAN Phase 2 — `e5ac3bc`**
- `docs/plans/2026-04-07-manager-team-center-plan.md` (817 Zeilen)
- Process: `/spec` Skill Phase 2
- 6 Waves + 18 Tasks + Agent-Dispatch Regeln
- PLAN GATE: 8/8 ✓

## Build Status
- `tsc --noEmit`: CLEAN
- Tests: alle gruen (scoring-v2 31/31, BottomNav 4/4, portfolio 17/17)
- 11 Commits gepusht zu main, alle deployed
- BescoutNet auf prod verifiziert (Mobile + Desktop, mehrere Rounds)

## Stand jetzt — wartet auf naechste Session

### PLAN GATE bestanden — bereit fuer Wave 0

Naechste Session startet hier: **Wave 0 — Hook Extraction `useLineupBuilder`**.

**Wave 0 Risk:** Refactor in EventDetailModal /fantasy. Wenn ein State-Update vergessen wird, koennen User keine Lineups mehr speichern. Wave 0 ist **reines Refactor** — keine neuen Features. Alte Tests muessen alle gruen bleiben. Manueller Smoke Test in /fantasy nach Wave 0 PFLICHT.

**Wave 0 Tasks:**
- T0.1: useLineupBuilder Hook erstellen (Extract State + Handlers aus EventDetailModal Z.51-489)
- T0.2: EventDetailModal nutzt den Hook (refactor von 637 → ~250 LOC)
- T0.3: Manueller Smoke Test in /fantasy

**Files Wave 0:**
- Create: `src/features/fantasy/hooks/useLineupBuilder.ts`
- Modify: `src/components/fantasy/EventDetailModal.tsx`

**DONE Wave 0 means:**
- [ ] Hook exportiert mit ~25 Returns
- [ ] EventDetailModal kompiliert + ist ~440 LOC kuerzer
- [ ] tsc 0 errors
- [ ] Alle vorhandenen Tests gruen
- [ ] Manueller Smoke Test in /fantasy: 1 Lineup join + 1 Lineup edit + 1 Equipment assign + 1 Reset

**Pause-Punkte nach jeder Wave:**
- Nach W0 → Anil verifiziert /fantasy
- Nach W1+W2 (Bundle) → Anil verifiziert Manager-Kader
- Nach W3 → Anil verifiziert Aufstellen
- Nach W4 → Anil verifiziert Historie
- W5 → DONE

## Wichtige Dateien fuer naechste Session

- `docs/plans/2026-04-07-manager-team-center-design.md` — Brainstorm Output
- `docs/plans/2026-04-07-manager-team-center-spec.md` — SPEC (54 Features Migration Map)
- `docs/plans/2026-04-07-manager-team-center-plan.md` — PLAN (6 Waves + 18 Tasks)
- `src/components/fantasy/EventDetailModal.tsx` — Source fuer Hook Extraction (Z.51-489)
- `src/components/fantasy/event-tabs/LineupPanel.tsx` — bleibt unangetastet (922 LOC)

## Architektur-Notizen

### Tailwind features-scan Bug
- `tailwind.config.ts` `content` muss `src/features/**` enthalten
- Bei jedem neuen Top-Level Folder mit React Components → content paths pruefen
- JIT generiert nur Klassen die es findet — fehlende paths = silent CSS bugs
- Heute: Manager Desktop Layout Bug exposed dies, fixed mit 1-Zeilen-Aenderung
- Latente Risiko: andere features-only Klassen koennten betroffen sein, sichtbar nur wenn jemand sie testet

### score_event 0-Lineup Pattern
- `current_entries` = paid event_entries
- `lineups` = submitted lineups
- Diese 2 sind NICHT equivalent — User kann zahlen aber nie submitten
- Scoring loops `lineups`, also Filter mit `current_entries > 0` ist falscher Indikator
- Heute fix: 0-lineup events werden gracefully closed mit success+note='no_lineups'

### 3-Hub-Konsequenz im Mobile Nav
- /inventory + /missions sind first-class Destinations seit 3-Hub Refactor
- BottomNav muss sie zeigen — sonst sehen User auf diesen Pages keinen Hierarchie-Anker
- 7 Items in horizontalem Snap-Scroll ist die Loesung
- Per-Item: 72px width, fits ~5 visible auf 360px viewport

## QA Account (unveraendert)
- Email: jarvis-qa@bescout.net / Handle: jarvisqa
- Password: `JarvisQA2026!` (in `e2e/mystery-box-qa.spec.ts:5`)
- ~7.540 CR, 8 Holdings, 7 Equipment Items
- Onboarding 1/5, Streak 5 Tage
- 1 Manager-Lineup (von letzter Session)
