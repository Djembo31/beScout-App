# Manager Team-Center (2026-04-08)

> Verdichtet aus 5 Retros (retro-20260408-125307..153200) + Session-Handoff. AutoDream Output.

## Was wurde gebaut

6-Wave Feature-Migration. Alle Waves auf prod (bescout.net) deployt. 11 Commits.

| Wave | Inhalt | Commit(s) |
|------|--------|-----------|
| 0 | Hook Extraction: `useLineupBuilder` aus EventDetailModal (State-Machine Refactor) | 8553968, cae9326 |
| 1+2 | Foundation Skeleton + 3-Tab Hub + Kader Migration aus /market | 461d021, a80abb5, c0dadca, 27b36c3 |
| 3 | Aufstellen-Tab + EventSelector (Direct Event Join) | bbe6086, 4911ce0 |
| 4 | Historie-Tab + HistoryStats + Filter + Cross-Tab Action | 8ee4c0f, 5777788 |
| 5 | Cleanup + Refactor + Tests + Code Review Polish | 9646ec2, cb4ce3f, 4a300c1, 9763f95, d9c1a5a |

Begleitend: `useLineupSave` extrahiert (DRY EventDetailModal + AufstellenTab — 9763f95). 26 Unit-Tests fuer pure helpers (d9c1a5a). Visual QA Fix: PageHeader.nextEvent Pill (d16b493).

## Key Files

```
src/features/manager/
  components/PageHeader.tsx           ← Pill: squadCount, healthCounts, nextEvent
  components/ManagerContent.tsx       ← Hub: 3 Tabs + useOpenEvents() wiring
  components/aufstellen/AufstellenTab.tsx
  components/aufstellen/EventSelector.tsx
  components/kader/PlayerDetailModal.tsx
  components/historie/HistorieTab.tsx
  components/historie/historieHelpers.ts
  queries/eventQueries.ts             ← useOpenEvents() Hook
  queries/eventHelpers.ts
  queries/historyQueries.ts
  store/managerStore.ts
  lib/formations.ts
src/features/fantasy/hooks/useLineupSave.ts   ← Shared Hook (Wave 0 DRY)
```

## Architektur-Entscheidungen

### 1. Hardcoded null Anti-Pattern
Symptom: `<PageHeader nextEvent={null} />` — visuell rendert die Pille, semantisch zeigt sie "Kein Event" obwohl Events existieren.
Lehre: Wenn ein Prop erstellt wird, MUSS er in der Implementation real verbunden sein. Hardcoded null ist eine semantische Luege.
Fix: `useOpenEvents()` eingebaut, erstes Event (frueheste startTime) an PageHeader gereicht.

### 2. Dynamic Import statt Copy-Paste (Wave 5 Plan-Abweichung legitim)
Plan sah Loeschung von `intel/{Stats,Form,Markt}Tab.tsx` vor. Tatsaechlich: dynamic-imported als shared deps.
Grund: Kein Code-Duplikat, kein doppelter Maintenance-Burden. Anti-Pattern (premature copy-paste) vermieden.
Regel: DRY via dynamic-import bevorzugen ueber Copy-Paste in neue Features.

### 3. Cross-Tab State (Zustand Store)
Captain-Transfer + Player Pre-Pick aus Kader funktioniert cross-tab via `managerStore.ts`.
Pattern: Zustand als Cross-Tab-Bus fuer Feature-interne Navigation (kein URL-State noetig).

## Bugs gefunden + gefixt

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| PageHeader zeigt "Kein Event" | `nextEvent={null}` hardcoded | useOpenEvents() Hook eingebaut |
| AchievementUnlockModal Test failure | 3-Hub Refactor: Missions URL geaendert | Test-URL auf /missions aktualisiert |
| business-flows FLOW-11 failure | score_event edge case: ended event, 0 lineups | Test erganzt um migration edge case |

## Test-Status bei Abschluss

- tsc --noEmit: CLEAN
- vitest: 2347/2347 (170 Files) gruen
- ESLint manager+fantasy: 0 errors, 7 warnings (alle pre-existing, intentional)

## CI-Issue (offen)

CI-Pipeline seit mehreren Sessions rot: fehlende Supabase Env-Vars im GitHub Actions Runner + Mock-Gaps in Tests.
Nicht durch diese Session verursacht. Separater Issue.
