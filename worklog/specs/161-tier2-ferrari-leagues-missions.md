# Slice 161 — Tier-2 Ferrari Batch: LeaguesSection + MissionBanner

**Size:** M · **Stage:** SPEC · **Started:** 2026-04-23
**Type:** Refactor (Mutation-Hardening, keine user-sichtbare Verhaltensänderung)
**Reference:** `memory/patterns.md` #28 (Ferrari-Blueprint) · `.claude/rules/common-errors.md` §5 D18 (React setState Race) · `worklog/proofs/150-mutation-audit.md`

## Ziel

4 Mutation-Handler in 2 Files vom D17-Anti-Pattern (`if (loading) return; setLoading(true); try/finally`) auf `useSafeMutation`-Ferrari-Blueprint migrieren. Tier-2 Data-Integrity: race-gefährdet (Doppel-Klick = Doppel-Create/Join/Claim), aber kein Money-Path.

## Scope-Revision aus active.md-Empfehlung Option A

Active.md listete 3 Files: LeaguesSection + AirdropScoreCard + MissionBanner. **AirdropScoreCard.tsx ist display-only** (nur `useEffect` mit `refreshAirdropScore` als init-seed; kein user-getriggerter Claim-Handler — UI sagt "airdrop coming soon"). Fällt aus Tier-2-Scope raus, wird in active.md nach Slice dokumentiert.

**Netto-Scope:** 2 Files, 4 Handler.

## Betroffene Files

### `src/components/fantasy/LeaguesSection.tsx` — 3 Handler

1. **`CreateLeagueModal.handleCreate`** (Line 28-46)
   - Service: `createLeague(name, maxMembers)` → `{success, error?, leagueId?}`
   - Current: `loading` state + D17-Pattern + Success-Toast + invalidate
   - Target: `useSafeMutation<TData, Error, {name, maxMembers}>` mit `errorTag: 'leagues.create'`
   - Loading-State ersetzt durch `mut.isPending`
   - Success: Toast + invalidate + onClose + reset form

2. **`JoinLeagueModal.handleJoin`** (Line 94-112)
   - Service: `joinLeague(code)` → `{success, error?, leagueName?}`
   - Current: identisches Pattern wie handleCreate
   - Target: analog, `errorTag: 'leagues.join'`, Toast mit `result.leagueName`

3. **`LeagueCard.handleLeave`** (Line 153-168)
   - Service: `leaveLeague(leagueId)` → `{success, error?}`
   - Current: `leavingId: string | null` state pattern
   - Target: `useSafeMutation<TData, Error, {leagueId}>`, `mut.isPending` statt `leavingId === league.id`
   - Plus: `confirm()` dialog bleibt vor safeTrigger (pre-Mutation-Guard)

### `src/components/missions/MissionBanner.tsx` — 1 Handler (per-Row)

1. **`MissionBanner.handleClaim`** (Line 80-112)
   - Service: `claimMissionReward(userId, missionId)` → `{success, error?, new_balance?}`
   - Current: `claiming: string | null` per-row pattern
   - Target: `useSafeMutation<TData, Error, {missionId}>`, `mut.variables?.missionId` als claiming-id (analog PostReplies voteReplyMut in Slice 159)
   - Success: `setMissions` update + setWalletBalance (wenn `new_balance`) + delayed invalidates (tickets/wallet/notifications nach 1500ms)
   - Error-Key-Mapping: `result.error` ist i18n-key → `te(result.error)` im Component, nicht in mutationFn-throw

## Fix-Strategie (Ferrari-Blueprint)

### LeaguesSection (3 Modals/Cards — 3 separate Mutations)

**Per Handler-Pattern:**
```typescript
const createMut = useSafeMutation<CreateResult, Error, { name: string; maxMembers: number }>({
  mutationFn: async ({ name, maxMembers }) => {
    const result = await createLeague(name, maxMembers);
    if (!result.success) throw new Error(result.error ?? 'leagues.unknownError');
    return result;
  },
  onSuccess: () => {
    addToast(t('created'), 'success');
    queryClient.invalidateQueries({ queryKey: qk.fantasyLeagues.all });
    onClose();
    setName('');
  },
  errorTag: 'leagues.create',
});

<Button onClick={() => createMut.safeTrigger({ name: name.trim(), maxMembers: parseInt(maxMembers) || 20 })}
        disabled={!name.trim() || createMut.isPending}>
  {createMut.isPending ? <><Loader2 /> {t('creating')}</> : t('create')}
</Button>
```

**Error-Handling:** useSafeMutation wirft `Error` via `mutationFn`-throw. Der Fehler muss via `onError` in `addToast` gemappt werden ODER im Component über `mut.error?.message` gelesen. Empfehlung: `onError: (err) => addToast(err.message ?? t('unknownError'), 'error')` für Consumer-facing Error-Toast.

### MissionBanner (per-Row claiming)

```typescript
const claimMut = useSafeMutation<ClaimResult, Error, { missionId: string }>({
  mutationFn: async ({ missionId }) => {
    const result = await claimMissionReward(userId, missionId);
    if (!result.success) throw new Error(result.error ?? 'generic_error');
    return result;
  },
  onSuccess: (result, { missionId }) => {
    setMissions(prev => prev.map(m =>
      m.id === missionId ? { ...m, status: 'claimed', claimed_at: new Date().toISOString() } : m
    ));
    if (result.new_balance != null) setWalletBalance(queryClient, userId, result.new_balance);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: qk.tickets.balance(userId) });
      queryClient.invalidateQueries({ queryKey: qk.wallet.all });
      queryClient.invalidateQueries({ queryKey: qk.notifications.unread(userId) });
    }, 1500);
  },
  onError: (err) => setClaimError(te(mapErrorToKey(normalizeError(err)))),
  errorTag: 'missions.claim',
});

// claiming: string | null ersetzt durch:
const claiming = claimMut.isPending ? claimMut.variables?.missionId ?? null : null;

const handleClaim = (missionId: string) => {
  setClaimError(null);
  claimMut.safeTrigger({ missionId });
};
```

## Acceptance Criteria

1. Alle 4 Handler nutzen `useSafeMutation` + `safeTrigger`, kein `useState<boolean>` / `useState<string|null>` für Loading.
2. `disabled`-Prop auf Buttons nutzt `mut.isPending` (nicht mehr `loading` state).
3. Per-Row pending in MissionBanner: `claiming === mission.id` über `mut.variables?.missionId` abgeleitet.
4. Error-Handling: Service `{success: false, error: "..."}` → `throw new Error(error)` in mutationFn → `onError` addToast/setClaimError.
5. Success-Path: identisch zu vorher (Toast, invalidate, close, state-update).
6. Bestehende Tests grün: `LeaguesSection.test.tsx` + `MissionBanner.test.tsx`.
7. `tsc --noEmit` clean.

## Edge Cases

1. **Rapid double-click**: `safeTrigger` synchroner MutationObserver-Guard → zweiter Click ignored (Blueprint-Eigenschaft).
2. **Service wirft unexpected**: `mutationFn.catch` nicht nötig — throw propagiert zu `onError`. `onError` addToast via `err.message`.
3. **Service `result.success=false` mit i18n-key**: MissionBanner setzt `setClaimError(te(mappedKey))`. LeaguesSection addToast mit `err.message ?? t('unknownError')` (englische error-string-pass-through OK weil bestehende Service-Returns haben oft deutsche i18n-keys).
4. **Closed-Modal während Mutation**: `preventClose={mut.isPending}` nicht explizit hier, da Modals nicht `Modal preventClose` Prop verwenden. Vorerst kein Change — out-of-scope Polish.
5. **Mission-Claim mit stale-data**: `setMissions` optimistic-update setzt `status: 'claimed'` sofort; wenn RPC fehlschlägt, throw → onError; kein optimistic rollback (state nicht überschrieben vor success).
6. **`confirm()` in handleLeave**: native dialog bleibt (kein ConfirmDialog-Upgrade in-scope). User cancelt → `safeTrigger` wird nicht aufgerufen, kein Mutation-State-Change.

## Proof-Plan

- `npx tsc --noEmit` clean
- `npx vitest run src/components/fantasy/__tests__/LeaguesSection.test.tsx src/components/missions/__tests__/MissionBanner.test.tsx` grün
- `git diff --stat` Summary
- Regression-Audit: `grep -rn "if.*loading.*return\|if.*leavingId\|if.*claiming" src/components/fantasy/LeaguesSection.tsx src/components/missions/MissionBanner.tsx` → 0 matches nach Slice

## Scope-Out

- **AirdropScoreCard.tsx:** Display-only, keine Mutation. Fällt aus Tier-2-Audit raus (initiale Liste war stale).
- **Zusätzliche Modal-preventClose:** Out-of-Scope Polish, separater Slice.
- **ConfirmDialog-Migration** (`confirm()` → Custom): Separate UX-Sweep.
- **Service-Error-Pattern-Change** (von `{success, error}` zu `throw`): Blueprint-Normalisierung out-of-scope; wir wrappen mutationFn-seitig.
