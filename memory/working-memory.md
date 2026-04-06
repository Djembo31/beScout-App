# Working Memory — Session 284

## E2E Features (naechste Session)

### 1. Scout Missions (Prio hoch)
- Service: `src/lib/services/scoutMissions.ts` — `getScoutMissions()`, `getUserMissionProgress()`, `submitScoutMission()`, `claimScoutMissionReward()`
- Hooks: `useScoutMissions`, `useMissionProgress` in `src/lib/queries/misc.ts` (KEPT)
- UI: Noch NICHTS gebaut — braucht Mission-Card, Progress-Anzeige, Claim-Flow
- Referenz: Community-Page zeigt schon "Mission: 3 Posts liken" Karten — aehnliches Pattern

### 2. Following Feed
- Hooks: `useFollowingFeed`, `useFollowingIds`, `useFollowerCount`, `useFollowingCount` (KEPT in social.ts)
- Service: `getFollowingFeed()` in `src/lib/services/social.ts`
- UI: Community hat "Folge ich" Tab — pruefen ob der Feed-Hook dort angebunden ist

### 3. Transactions History
- Hook: `useTransactions` in `src/lib/queries/misc.ts` (KEPT)
- Service: `getTransactions()` in `src/lib/services/wallet.ts`
- UI: Noch NICHTS gebaut — braucht Transaction-Liste im Profil oder Wallet

## Playwright QA Account
- Email: jarvis-qa@bescout.net
- Handle: jarvisqa
- State: 8 Holdings, ~7.440 CR, 10 Tickets, Sakaryaspor-Fan, Bronze II

## Remaining QA Bugs (alle gefixt und deployed)
- Alle 7 Bugs aus Session 283 sind gefixt
