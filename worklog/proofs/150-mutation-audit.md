# Slice 150 — Mutation Race-Condition Audit

**Datum:** 2026-04-23
**Scope:** Alle async-handler in React-Components die DB-Mutationen triggern, ohne synchronen Mutex.
**Trigger:** User-Report "Follow-Button loest mehrfach aus". Bestaetigt in Slice 149-Post-Review.

## Executive Summary

| Metric | Value |
|--------|-------|
| Files mit `setLoading\|setSubmitting\|setIsPending\|setBusy` State | **63** |
| Files mit `useMutation` (race-safe) | **4** |
| Files mit inline `onClick={async` (high-risk) | **3** |
| Files mit `if (loading) return` Guard (partial safe) | **19** |

**Bewertung:** Das Projekt nutzt ein **inkonsistentes Mix** aus 3 Patterns (useState+setState, useMutation, pre-guard). Der Audit bestaetigt: Race-Condition-Bug ist systemisch, nicht vereinzelt.

**Root-Cause:** React-`setState`-async-Batching. Zwischen Guard-Check und `setLoading(true)` koennen weitere Clicks durchrutschen. Ohne `useMutation.isPending` (synchron) oder `useRef`-Mutex bleibt ein schmales, aber reproduzierbares Race-Fenster.

## Pattern-Beispiele

### Anti-Pattern A — Klassische Race (26 confirmed via Spot-Check)

```tsx
// useClubActions.ts (Slice 149-Finding)
const handleFollow = useCallback(async () => {
  if (!user || !club || followLoading) return; // check
  setFollowLoading(true);                       // async! closure bleibt stale
  try {
    await toggleFollowClub(...);
    ...
  } finally {
    setFollowLoading(false);
  }
}, [user, club, isFollowing, followLoading, ...]);
```

**Race:** 2 Clicks in <16ms derselben Render-Frame — beide Guards sehen `followLoading=false`.

### Anti-Pattern B — KEIN Guard (MembershipSection, KRITISCH)

```tsx
const handleSubscribe = async (tier) => {
  if (!userId) return;     // KEIN subscribing-Check!
  setSubscribing(tier);    // async
  try { await subscribeTo(...); } ...
};
```

**Race:** User klickt Bronze + Silber rapid → **2 parallele Wallet-Abbuchungen** moeglich. Money-Path.

### Anti-Pattern C — Async Inline-Handler (3 Files)

```tsx
<Button onClick={async () => { await doSomething(); }} />
```

**Race:** Kein State-Tracking, keine disabled-logik. Bis zu N parallele Calls moeglich.

### Safe-Pattern D — useMutation (nur 4 Files)

```tsx
const mutation = useMutation({ mutationFn, onMutate, onError, onSuccess });
// mutation.isPending wird SYNCHRON beim mutate() gesetzt, keine Race-Gap.
```

**Nutzen:** `features/market/mutations/trading.ts`, `lib/queries/predictions.ts`, `lib/queries/notifications.ts`, `lib/queries/clubChallenges.ts`

## Risk-Tier Kategorisierung

### Tier 1 — MONEY-CRITICAL (8 Files, HIGH) — **CEO-Scope**

Doppelte Ausloesung kann finanziellen Schaden verursachen (Wallet-Abbuchung, Trading-Fee doppelt, etc).

| File | Action | Risiko |
|------|--------|--------|
| `components/club/sections/MembershipSection.tsx` | subscribeTo (Bronze/Silber/Gold) | 2× Abo-Abbuchung |
| `components/player/detail/BuyModal.tsx` | buyPlayer (Market-Trade) | 2× Card-Kauf → 2× Fee |
| `features/manager/components/kader/KaderSellModal.tsx` | sellPlayer | 2× Listing |
| `features/market/hooks/useTradeActions.ts` | Multi-action Trade-Handler | 2× Order-Book-Entries |
| `components/player/detail/hooks/usePlayerTrading.ts` | Trade-Entry-Point | cascade on sub-handlers |
| `features/market/components/portfolio/useOffersState.ts` | Accept/Reject Offer | 2× Transfer |
| `app/(app)/bescout-admin/AdminWithdrawalTab.tsx` | Process club withdrawal | 2× Auszahlung |
| `app/(app)/bescout-admin/AdminFoundingPassesTab.tsx` | FP Create/Revoke | Kill-Switch-Breach |

### Tier 2 — DATA-INTEGRITY (18 Files, MEDIUM)

Doppelte Ausloesung erzeugt UI-Wackeln, ggf. Zombie-Rows oder falsche Counts.

| File | Action |
|------|--------|
| `components/club/hooks/useClubActions.ts` | toggleFollowClub (user-reported!) |
| `components/community/ReportModal.tsx` | submit content-report |
| `components/community/PostReplies.tsx` | submit reply |
| `components/fan-wishes/FanWishModal.tsx` | create wish |
| `components/fantasy/CreatePredictionModal.tsx` | create prediction |
| `components/fantasy/LeaguesSection.tsx` | join private league |
| `components/airdrop/AirdropScoreCard.tsx` | claim airdrop |
| `components/missions/MissionBanner.tsx` | claim mission |
| `components/admin/hooks/useClubEventsActions.ts` | create/cancel fantasy-event |
| `components/admin/hooks/useAdminEventsActions.ts` | admin-global event ops |
| `components/admin/useAdminPlayersState.ts` | player CRUD |
| `components/admin/InviteClubAdminModal.tsx` | invite admin |
| `components/admin/AddAdminModal.tsx` | add platform admin |
| `components/admin/AdminVotesTab.tsx` | create/close vote |
| `components/admin/AdminBountiesTab.tsx` | create/assign bounty |
| `components/admin/AdminSponsorTab.tsx` | sponsor CRUD |
| `components/admin/AdminFansTab.tsx` | fan-management |
| `components/admin/AdminModerationTab.tsx` | content-moderation actions |

### Tier 3 — AUTH & PROFILE (9 Files, MEDIUM-LOW)

Doppelte Ausloesung erzeugt UX-Friktion; Backend meist idempotent.

| File | Action |
|------|--------|
| `app/(auth)/login/page.tsx` | signIn |
| `app/(auth)/onboarding/page.tsx` | complete onboarding |
| `components/providers/AuthProvider.tsx` | refresh-flow |
| `app/(app)/profile/settings/page.tsx` | save profile |
| `components/profile/hooks/useProfileData.ts` | update profile |
| `components/profile/FollowListModal.tsx` | follow/unfollow user |
| `components/layout/FeedbackModal.tsx` | submit feedback |
| `components/layout/SearchOverlay.tsx` | search-submit |
| `components/providers/ClubProvider.tsx` | primary-club setter |

### Tier 4 — UI-ONLY (28 Files, LOW)

`setLoading` bzw. State ist primaer fuer Fetch-UI, nicht Mutation. Keine Race-Penalty.

(Diverse Listings wie `FollowListModal`, `TimelineTab`, diverse Admin-Read-Tabs, Loading-States fuer React-Query-queries.)

**Keine priorisierte Migration noetig** — ggf. opportunistisch wenn anderes Refactoring ansteht.

## Empfehlung: `useSafeMutation` Shared Hook

```typescript
// src/lib/hooks/useSafeMutation.ts

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { useToast } from '@/components/providers/ToastProvider';

export interface SafeMutationOptions<TData, TVariables, TError = Error>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'onError'> {
  /** i18n-key oder raw string fuer Error-Toast. Falls undefined: kein Auto-Toast. */
  errorToastKey?: string;
  /** Custom onError (wird nach auto-toast aufgerufen). */
  onError?: UseMutationOptions<TData, TError, TVariables>['onError'];
}

export function useSafeMutation<TData, TVariables, TError = Error>(
  options: SafeMutationOptions<TData, TVariables, TError>,
) {
  const { addToast } = useToast();
  return useMutation({
    ...options,
    onError: (err, variables, context) => {
      if (options.errorToastKey) addToast(options.errorToastKey, 'error');
      options.onError?.(err, variables, context);
    },
  });
}
```

**Konsumenten-Beispiel:**
```tsx
const followMut = useSafeMutation({
  mutationFn: (newFollowing: boolean) => toggleFollowClub(user.id, club.id, club.name, newFollowing),
  onMutate: async (newFollowing) => { /* optimistic */ },
  onError: (err, variables, context) => { /* rollback */ },
  onSuccess: () => queryClient.invalidateQueries(...),
  errorToastKey: t('followError'),
});

// Button:
<Button
  onClick={() => !followMut.isPending && followMut.mutate(!isFollowing)}
  disabled={followMut.isPending}
>
```

**Vorteil gegenueber raw useMutation:** Einheitliches Error-Handling + Toast-Integration, erzwingt race-safe-Pattern im Codebase durch Naming-Convention.

## Migrations-Plan

Sofern jede Migration 1 File + 1 Test touched:

### Phase 1 — Primitive (Slice 151)

1. **Slice 151a**: Schreibe `useSafeMutation` hook + Tests (src/lib/hooks/useSafeMutation.ts).
2. **Slice 151b**: Refactor **Pilot 1** — `useClubActions.ts` (Follow-Button, user-reported Bug).
3. **Slice 151c**: Refactor **Pilot 2** — `MembershipSection.tsx` (CEO-Approval pflicht, Money-Path).
4. **Slice 151d**: ESLint-Rule `no-async-state-mutation-in-onclick` (custom) die das Anti-Pattern in neuem Code verhindert.

### Phase 2 — Tier 1 Money (Slice 152-155, 1 pro Money-Handler)

CEO-Approval pro Slice noetig (money = CEO-Scope). Tests zwingend (`vitest run`).

### Phase 3 — Tier 2 Data-Integrity (Slice 156-159, batched)

Max 5 Files pro Slice. Batched weil Pattern trivial.

### Phase 4 — Tier 3 Auth & Profile (Slice 160, batched)

### Phase 5 — Tier 4 nur opportunistisch (kein dedicated Slice)

## Begleitmassnahmen

1. **`common-errors.md` Pattern D18**: "React setState Race in async onClick" — post-Phase 1 schreiben.
2. **CI-Gate**: ESLint-Rule `error` auf `src/components/**/Admin*Tab.tsx` + `**/hooks/useXActions.ts` nach Phase 1.
3. **AsyncButton Component** (Optional, Phase 6): `<AsyncButton onClick={asyncFn} />` wrapper der `useSafeMutation` intern nutzt — fuer legacy-sites wo kein grosses Refactor noetig.

## Risk-Mitigation waehrend Migration

- Tests VOR jeder Migration (TDD via test-writer-agent).
- `git diff` pro Migration <100 Zeilen — leicht reviewbar.
- Slice 151b/c sind Piloten: wenn dort schmerzhaft, Plan adjustieren vor Mass-Migration.

## Knowledge-Capture nach Phase 1

- Pattern D18 in `common-errors.md` (React setState Race)
- `memory/patterns.md`: `useSafeMutation` als Standard fuer alle Mutations
- Entry in `memory/decisions.md`: "Ab 2026-04-23 alle neuen Mutation-Handler MUESSEN useSafeMutation nutzen"

## Schaetzung

- Phase 1: 4-6 h (Primitive + 2 Piloten + ESLint-Rule)
- Phase 2 (Money): 8-12 h (8 Files × 1h Review/Test)
- Phase 3 (Data): 4-6 h (18 Files, 5 pro Slice batched)
- Phase 4 (Auth): 2-3 h
- **Total: 18-27 h verteilt ueber ~2 Wochen**

## Appendix — Vollstaendige File-Liste (63)

```
src\components\providers\ClubProvider.tsx
src\app\(app)\clubs\page.tsx
src\components\admin\CreateClubModal.tsx
src\components\providers\AuthProvider.tsx
src\components\profile\FollowListModal.tsx
src\components\profile\hooks\useProfileData.ts
src\app\(app)\bescout-admin\AdminGameweeksTab.tsx
src\components\admin\AdminRevenueTab.tsx
src\components\admin\AdminOverviewTab.tsx
src\app\(app)\bescout-admin\BescoutAdminContent.tsx
src\components\admin\AdminSettingsTab.tsx
src\components\community\ReportModal.tsx
src\components\player\detail\hooks\usePlayerTrading.ts
src\components\fantasy\CreatePredictionModal.tsx
src\components\admin\hooks\useClubEventsActions.ts
src\app\(auth)\onboarding\page.tsx
src\lib\hooks\useNotificationRealtime.ts
src\components\airdrop\AirdropScoreCard.tsx
src\features\manager\components\kader\KaderSellModal.tsx
src\components\missions\MissionBanner.tsx
src\app\(auth)\login\page.tsx
src\components\profile\TimelineTab.tsx
src\components\club\sections\MembershipSection.tsx
src\features\market\components\portfolio\useOffersState.ts
src\app\(app)\bescout-admin\AdminFoundingPassesTab.tsx
src\app\(app)\profile\[handle]\page.tsx
src\app\(app)\bescout-admin\AdminEconomyTab.tsx
src\components\fantasy\EventCommunityTab.tsx
src\components\community\PostReplies.tsx
src\features\market\components\portfolio\OffersTab.tsx
src\components\player\detail\CommunityValuation.tsx
src\components\layout\SearchOverlay.tsx
src\components\layout\FeedbackModal.tsx
src\components\fantasy\spieltag\FixtureDetailModal.tsx
src\components\fantasy\LeaguesSection.tsx
src\components\fantasy\ErgebnisseTab.tsx
src\components\fan-wishes\FanWishModal.tsx
src\components\admin\InviteClubAdminModal.tsx
src\components\admin\AdminWithdrawalTab.tsx
src\components\admin\AdminVotesTab.tsx
src\components\admin\AdminSponsorTab.tsx
src\components\admin\AdminModerationTab.tsx
src\components\admin\AdminFansTab.tsx
src\components\admin\AdminBountiesTab.tsx
src\components\admin\AdminAnalyticsTab.tsx
src\components\admin\AddAdminModal.tsx
src\app\(app)\profile\settings\page.tsx
src\app\(app)\founding\page.tsx
src\app\(app)\club\[slug]\admin\AdminContent.tsx
src\app\(app)\bescout-admin\AdminUsersTab.tsx
src\app\(app)\bescout-admin\AdminTreasuryTab.tsx
src\app\(app)\bescout-admin\AdminSponsorsTab.tsx
src\app\(app)\bescout-admin\AdminFeesTab.tsx
src\app\(app)\bescout-admin\AdminFanWishesTab.tsx
src\app\(app)\bescout-admin\AdminEventFeesSection.tsx
src\app\(app)\bescout-admin\AdminCreatorFundTab.tsx
src\app\(app)\bescout-admin\AdminClubsTab.tsx
src\app\(app)\bescout-admin\AdminAirdropTab.tsx
src\components\admin\useAdminPlayersState.ts
src\components\club\hooks\useClubActions.ts
src\components\admin\hooks\useClubEventsData.ts
src\components\admin\hooks\useAdminEventsData.ts
src\components\admin\hooks\useAdminEventsActions.ts
```

---

## Decision-Points fuer CEO (Anil)

1. **Reihenfolge Phase 1**: Hook zuerst (safer) oder Pilot zuerst (fail-fast)?
2. **Phase 2 CEO-Gate**: Jedes Money-File einzeln approven ODER Batch-Approval mit Test-Evidenz?
3. **Scope-Cut**: Tier 4 (28 Files) komplett skippen oder opportunistisch nachziehen?
4. **ESLint-Rule**: Warning oder Error auf CI? Error blockt PR, Warning nicht.
5. **Beta-Launch-Prio**: Tier 1 MUSS vor 3-Tester-Run durch (Money-sicherheit). Tier 2/3 kann post-launch?

Empfehlung der Technik (Claude): **Phase 1 diese Session** (2-3h), Phase 2 naechste Woche, Phase 3-4 post-Beta. Tier 4 opportunistisch. ESLint als Error, aber per-Path opt-in.
