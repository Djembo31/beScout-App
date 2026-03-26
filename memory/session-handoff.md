# Session Handoff
## Letzte Session: 2026-03-26 (Session 254)
## Was wurde gemacht

### SC Blocking Phase 2: Wild Cards (komplett)
- `user_wildcards` Table: Balance + earned/spent Tracking
- `wildcard_transactions` Table: Audit Log (8 Sources)
- `lineups.wildcard_slots` Column: TEXT[] trackt WC-Slots pro Lineup
- 5 RPCs: `get_wildcard_balance`, `earn_wildcards`, `spend_wildcards`, `refund_wildcards_on_leave`, `admin_grant_wildcards`
- `wildcardService.ts`: balance, earn, spend, history, adminGrant
- `useWildcardBalance` Query Hook + `qk.events.wildcardBalance` Key
- `submitLineup`: WC Slot-Logik — skip SC check, spend/refund WC diff
- `removeLineup`: WC Refund vor Lineup-Loeschung
- Admin UI: "Wild Cards erlaubt" Toggle + "Max Wild Cards" Feld
- `EDITABLE_FIELDS`: `wildcards_allowed`, `max_wildcards_per_lineup` in upcoming/registering
- `createEvent`: `wildcardsAllowed` + `maxWildcardsPerLineup` Params
- Fan UI: WC Badge auf Slots, WC Toggle-Button, WC Counter-Banner
- Player Picker: WC-Slots zeigen auch gelockte Spieler
- FantasyEvent Type: `wildcardsAllowed`, `maxWildcardsPerLineup`
- i18n: 4 Keys (insufficientWildcards, wildcardsNotAllowed, tooManyWildcards, wildcardCounter) DE+TR
- Migration auf Supabase applied
- tsc: 0 Errors

### Geaenderte Files (12)
- `supabase/migrations/20260326_wildcards.sql` (neu)
- `src/lib/services/wildcards.ts` (neu)
- `src/types/index.ts` — DbUserWildcard, DbWildcardTransaction, DbLineup.wildcard_slots
- `src/lib/services/lineups.ts` — WC Slot-Logik in submitLineup + removeLineup
- `src/lib/services/events.ts` — wildcardAllowed/maxWildcards in createEvent + EDITABLE_FIELDS
- `src/lib/queries/events.ts` — useWildcardBalance Hook
- `src/lib/queries/keys.ts` — wildcardBalance Key
- `src/components/fantasy/types.ts` — FantasyEvent WC Props
- `src/components/fantasy/EventDetailModal.tsx` — WC State + Picker WC-Modus
- `src/components/fantasy/event-tabs/LineupPanel.tsx` — WC UI (Badge, Toggle, Counter)
- `src/app/(app)/fantasy/FantasyContent.tsx` — WC Mapping + Error Handling
- `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` — WC Admin Form
- `messages/de.json` + `messages/tr.json` — 4 WC Keys

---

## Naechste Session

### SC Blocking Phase 3: UX Polish
- Portfolio: "X gesperrt" Display bei Holdings
- Sell Button disabled + Tooltip wenn available_qty < 1
- Wild Card Inventory im Profil
- Wild Card Transaction History

### Earn-Hooks (Gamification Integration)
- Mystery Box: Wild Cards als moeglicher Drop
- Missions: "Use X Wild Cards" Mission
- Milestones: Wild Card Rewards
- Daily Quests: Wild Card als Quest-Reward

### Test Failures (pre-existing, nicht blockierend)
- `lineups.test.ts`: Mock braucht holding_locks + wildcard_slots
- `FantasyContent.test.tsx`: useHoldingLocks + useWildcardBalance nicht gemocked
- `EventDetailModal.test.tsx`: min_sc_per_slot + wildcards fehlt in Mocks

### Danach
- DNS verifizieren + echten Signup testen
- 50 Einladungen raus

## Blocker
- Keine
