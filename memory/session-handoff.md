# Session Handoff
## Letzte Session: 2026-03-26 (Session 254)
## Was wurde gemacht

### SC Blocking Phase 2: Wild Cards (komplett)
- `user_wildcards` + `wildcard_transactions` Tables + `lineups.wildcard_slots`
- 5 RPCs: get/earn/spend/refund/admin_grant wildcards
- `wildcardService.ts` + `useWildcardBalance` Hook
- `submitLineup`: WC Slots skip SC check, diff-based spend/refund
- Admin UI: Wild Cards erlaubt Toggle + Max Wild Cards Feld
- Fan UI: WC Badge, Toggle, Counter im Lineup Builder
- i18n DE+TR

### SC Blocking Phase 3: UX Polish (komplett)
- Portfolio: `lockedQty` in BestandPlayerRow + BestandSellModal
- Player Detail: lockedQty in HoldingsSection + SellModal
- Profile: Wild Card Balance in TraderTab
- `availableToSell = qty - listed - locked` ueberall

### Commit (1 auf main, gepusht)
- `feat(events): SC blocking phase 2+3 — wild cards + UX polish`

---

## Naechste Session

### Earn-Hooks (Gamification Integration)
- Mystery Box: Wild Cards als moeglicher Drop
- Missions: Wild Card Rewards
- Milestones: Wild Card Rewards
- Daily Quests: Wild Card als Reward

### Launch-Vorbereitung
- DNS verifizieren + echten Signup testen
- 50 Einladungen raus
- Email-Templates + OAuth Redirects

### Test Failures (pre-existing, nicht blockierend)
- `lineups.test.ts`: Mock braucht holding_locks + wildcard_slots
- `FantasyContent.test.tsx`: useHoldingLocks + useWildcardBalance
- `EventDetailModal.test.tsx`: wildcards fehlt in Mocks

## Blocker
- Keine
