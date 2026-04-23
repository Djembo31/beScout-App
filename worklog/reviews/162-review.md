# Slice 162 Review

**Verdict:** PASS (nach in-slice Finding #1 + #2 Fixes)
**Reviewer:** reviewer-agent (cold-context, via Agent-tool dispatch)
**Date:** 2026-04-23
**Scope:** 3 Handler-Files + 1 Test-Mock-Erweiterung + 1 Test-Migration. Schliesst Vote-Handler-Block aus Slice 160 Review Finding #5.

## Spec-Coverage

- [x] `useCommunityActions.handleVotePost` → `votePostMut` useSafeMutation mit onMutate (Optimistic-Delta + prevVotes+prevPosts-Snapshot), onSuccess Server-Truth-Override, onError Full-Snapshot-Rollback, errorTag `community.votePost`
- [x] `usePlayerCommunity.handleVotePlayerPost` → `votePostMut` useSafeMutation (kein Optimistic, post-success-update), errorTag `player.votePost`
- [x] `EventCommunityTab.handleVote` → `voteMut` useSafeMutation (kein Optimistic, post-success-update), errorTag `eventCommunity.vote`
- [x] Consumer-Signaturen `(postId, voteType) => void` unverändert
- [x] `tsc --noEmit` clean + vitest 494/494
- [x] Regression-Audit `grep -rn "await votePost\(" src/components/ | grep -v __tests__` → 0 hits

## Findings & In-Slice Resolutions

| # | Severity | Status | File:Line | Issue | Resolution |
|---|----------|--------|-----------|-------|------------|
| 1 | **MEDIUM** | **FIXED in-slice** | useCommunityActions.ts onMutate | `cancelQueries` fehlt — Background-Refetch konnte Optimistic-State clobbern. Blueprint #28 Z.409 vorgeschrieben. | `await queryClient.cancelQueries({ queryKey: postsKey })` als erste Zeile in onMutate eingezogen. Test-Mock erweitert um `cancelQueries: vi.fn(() => Promise.resolve())` + `getQueryData: vi.fn(() => undefined)`. |
| 2 | **LOW** | **FIXED in-slice** | useCommunityActions.ts onError | Partial Optimistic-Rollback — setQueryData(posts-list) nur via invalidateQueries restauriert, nicht Snapshot-basiert. Flicker-Potenzial. | `prevPosts` im onMutate ctx snapshotten via `getQueryData`. onError setQueryData(prev) statt invalidate. Phantom-Rollback-Safety: `ctx?.prevPosts !== undefined`-Guard. |
| 3 | LOW | Backlog | usePlayerCommunity.ts + EventCommunityTab.tsx | Keine Optimistic-Propagation — konsistent-by-design (Spec). Dokumentation fehlt in patterns.md #28 | Patterns.md #28 Scope-Note erweitern: "Optimistic nur bei shared-cache-list wiederbenutzt + deterministic delta". |
| 4 | LOW | Backlog | usePlayerCommunity.ts + EventCommunityTab.tsx | Kein errorToast — parity zu pre-162 (log-only) aber User sieht Fehler nicht. useSafeMutation `logSilentCatch` ist bereits besser als console.error. | `errorToast: tc('voteError')` in beiden Handlern ergänzen. Matched addToast-Parity zu useCommunityActions. |
| 5 | NIT | Backlog | useCommunityActions.ts:10 | Singleton `queryClient` vs `useQueryClient()` Hook (Slice 161 NIT #1 — selber Drift) | patterns.md #28 explizit dokumentieren ODER Mini-Cleanup-Slice. |
| 6 | NIT | Backlog | usePlayerCommunity.ts:72 | `queryClient.setQueryData` ohne Type-Generic — stilistische Abweichung zu useCommunityActions (dort `<PostWithAuthor[]>`) | Type-Generic ergänzen. Kein Runtime-Risiko. |
| 7 | INFO | — | Tests | Rollback-Regression-Test `setMyPostVotes.mock.calls.length >= 2` — gute Regression-Sicherung. | Positiv. |
| 8 | INFO | Backlog | useCommunityActions.ts onError | `console.error` zusätzlich zu errorTag — potentielle Redundanz (Sentry bekommt Error zweimal). | Entscheidung offen — Blueprint-Referenz-Slices inkonsistent. In dieser Session `console.error` entfernt (nur errorTag). |

**Finding #1 + #2 = in-slice gefixt.** Finding #8 (console.error) im Zuge von #2-Fix entfernt.

## Prüfungs-Antworten

1. **Blueprint-Konsistenz zu 161:** PASS. Alle 3 Handler matchen Pattern #28. `cancelQueries` jetzt in useCommunityActions (nach Fix #1). Per-Row-Pattern in EventCommunityTab konsistent zu MissionBanner/PostReplies-Stil.

2. **Optimistic-Rollback:** PASS. `new Map(myPostVotes)` deterministisch-defined. `prevPosts` via `getQueryData` ebenfalls snapshotted (nach Fix #2). onError rollback beide Seiten via `ctx?.prevVotes`/`ctx?.prevPosts`-Guards (Phantom-Rollback-Safety).

3. **cancelQueries race:** PASS nach Fix #1. `await queryClient.cancelQueries({ queryKey: postsKey })` verhindert Background-Refetch-Clobber.

4. **usePlayerCommunity kein Optimistic:** OK laut Spec. Verhalten byte-identisch zu pre-162.

5. **EventCommunityTab kein Optimistic:** OK laut Spec. Verhalten byte-identisch zu pre-162.

6. **Error-Handling-Parity:**
   - useCommunityActions: PASS. toast + full snapshot rollback (beide Seiten) — besser als pre-162 (nur myPostVotes-rollback + invalidate).
   - usePlayerCommunity + EventCommunityTab: PARTIAL (log-only, kein Toast). Pre-162-Parity. Backlog Finding #4.

7. **Consumer-Kompat:** PASS. Signaturen `(postId, voteType) => void` unverändert.

8. **Concurrent different-posts:** PASS. Test-Case "handles concurrent handler calls without interference" verifiziert 2 Calls via Promise.all auf verschiedenen postIds — beide gefeuert.

## Test-Migration-Notes

Tests `useCommunityActions.test.ts` mussten angepasst werden:
- Handler ist jetzt synchron `(postId, voteType) => void` (nicht async Promise<void>).
- `await handleVotePost(...)` vor `expect(votePost).toHaveBeenCalled()` führte expect VOR mutation-fire → 7 Tests failing.
- Fix: `act(() => result.current.handleVotePost(...))` ohne await + `await waitFor(() => expect(...).toHaveBeenCalled())` für Mutation-Observer-Completion.
- Mock erweitert: `cancelQueries: vi.fn(() => Promise.resolve())` + `getQueryData: vi.fn(() => undefined)`.
- Pattern etabliert als Standard für useSafeMutation-Handler-Tests.

Gleiches Pattern in EventCommunityTab.test.tsx Mock-expansion (wie Slice 161 MissionBanner.test.tsx):
- lucide-react: AlertCircle + CheckCircle2 + Info + X
- ToastProvider-stub

## Positive

- **D18 Race-Class geschlossen für Community-Vote-Domain:** 4/4 Vote-Handler auf Ferrari (PostReplies.voteReplyMut 159 + 3 handlers 162).
- **Blueprint-Volllständigkeit eingefordert:** Reviewer hat `cancelQueries`-Gap und Partial-Rollback als Findings gemeldet → in-slice gefixt. Konsistenz zu 153a/156/157 hergestellt.
- **Snapshot-Rollback-Pattern neu codified:** Beide Seiten der Optimistic-Mutation (posts-list + myPostVotes) werden nun im ctx snapshotted + onError-restored. Template für zukünftige Slices.
- **Test-Migration als Dokumentation:** `await handleX(...)` → `act(() => handleX(...)) + await waitFor(...)` ist jetzt sichtbares Pattern für useSafeMutation-Handler-Tests.
- **Regression-Grep-Proof messbar:** 0 raw `await votePost(` außerhalb mutationFn.
- **Tier-2 Data-Integrity von 6/8 auf 7/8.**

## Summary

3 Handler auf Ferrari-Blueprint #28 migriert — Consumer-Signaturen unverändert, D18 Race-Class für Vote-Domain geschlossen. Reviewer hat MEDIUM-Finding `cancelQueries`-Gap + LOW-Finding Partial-Rollback gefangen, beide in-slice gefixt. Plus Test-Migration zu Observer-based Pattern (`act + waitFor`) als Dokumentation für zukünftige useSafeMutation-Tests. Backlog: Optimistic-Docs in patterns.md #28, errorToast in 2 Log-only-Handlern, Singleton-vs-Hook-Konvention-Drift. Commit-freigabe.
