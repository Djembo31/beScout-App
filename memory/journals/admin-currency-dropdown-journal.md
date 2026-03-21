# Implementer Journal: Admin Currency Dropdown + Feature Flag Toggle (Tasks 8+9)
## Gestartet: 2026-03-21
## Spec: Inline briefing (Tasks 8+9)

### Verstaendnis
- Task 8: Add currency dropdown ('tickets' | 'scout') to both AdminEventsTab (club admin) and AdminEventsManagementTab (platform admin) event creation forms
- Task 9: Add feature flag toggle for `scout_events_enabled` in BeScout Admin
- Betroffene Files:
  - `src/components/admin/AdminEventsTab.tsx` - Club admin
  - `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` - Platform admin
  - `src/app/(app)/bescout-admin/BescoutAdminContent.tsx` - Settings tab addition
  - `src/lib/queries/keys.ts` - Add platformSettings query key
  - `src/lib/services/events.ts` - Add currency param to createEvent
  - `src/types/index.ts` - Add EventCurrency type + currency to DbEvent
  - `messages/de.json` + `messages/tr.json` - i18n keys
- Risiken/Fallstricke:
  - `useScoutEventsEnabled` hook doesn't exist yet - need to create it
  - `platform_settings` table may not exist - need to handle gracefully
  - Need to add currency to createEvent service function params
  - Need to add currency to DbEvent type

### Entscheidungen
| # | Entscheidung | Warum | Alternative |
|---|-------------|-------|-------------|
| 1 | Create useScoutEventsEnabled as simple React Query hook | Spec requires it, minimal approach | Could use Zustand but overkill |
| 2 | Add feature toggle to existing BescoutAdminContent overview | No settings tab exists; adding inline is minimal | Could create new Settings tab |
| 3 | Add currency to createEvent params as optional with default 'tickets' | Backward compatible | Required param would break existing calls |

### Fortschritt
- [ ] Task 1: Add EventCurrency type to types/index.ts + currency to DbEvent
- [ ] Task 2: Add currency param to createEvent service
- [ ] Task 3: Add platformSettings query key to keys.ts
- [ ] Task 4: Create useScoutEventsEnabled hook
- [ ] Task 5: Add currency dropdown to AdminEventsTab (club admin)
- [ ] Task 6: Add currency dropdown to AdminEventsManagementTab (platform admin)
- [ ] Task 7: Add feature flag toggle to BescoutAdminContent
- [ ] Task 8: Add i18n keys (de + tr)
- [ ] Task 9: TypeScript check

### Runden-Log

#### Runde 1 -- PASS
- All 9 sub-tasks completed in a single pass
- tsc: PASS (0 new errors, all pre-existing are in test files)
- No circuit breaker needed

### Ergebnis: PASS
- tsc: PASS
- Runden benoetigt: 1

### Geaenderte Files
- src/types/index.ts (added EventCurrency type, currency to DbEvent)
- src/lib/services/events.ts (added currency param to createEvent)
- src/lib/queries/keys.ts (added platformSettings.scoutEvents key)
- src/lib/queries/events.ts (added useScoutEventsEnabled hook)
- src/components/admin/AdminEventsTab.tsx (added currency dropdown to club admin form)
- src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx (added currency dropdown to platform admin form)
- src/app/(app)/bescout-admin/BescoutAdminContent.tsx (added ScoutEventsToggle component)
- messages/de.json (added admin + bescoutAdmin i18n keys)
- messages/tr.json (added admin + bescoutAdmin i18n keys)
