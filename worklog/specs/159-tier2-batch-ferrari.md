# Slice 159 — Tier-2 Data-Integrity Batch (Phase 4 Start)

**Typ:** M-Slice (3 Files + 3 Test-Files, keine DB-Change).
**Money-Path:** Nein (Data-Integrity-Hotspots aus 150-mutation-audit.md Tier-2).
**Impact:** Skipped (UI-Component-Refactors, callbacks unveraendert).

---

## Ziel

3 Tier-2 Modals/Hooks (ReportModal + PostReplies + FanWishModal) auf `useSafeMutation` migrieren. 5 Mutations total mit Anti-Pattern-A/B → synchroner `isPending`-Guard + `errorTag` fuer Observability.

---

## Problem

| File | Handler | Aktuelles Anti-Pattern |
|------|---------|-----------------------|
| `ReportModal.tsx:38-58` | `handleSubmit` | A (`if (!canSubmit) return` mit stale-closure-race via `submitting`-derived canSubmit) |
| `PostReplies.tsx:49-62` | `handleSubmit` | A (`if (submitting) return; setSubmitting(true)`) |
| `PostReplies.tsx:64-72` | `handleDelete` | B (KEIN Guard — rapid-click 2× deletePost) |
| `PostReplies.tsx:74-93` | `handleVote` | A (`if (votingId) return; setVotingId(replyId)`) |
| `FanWishModal.tsx:37-61` | `handleSubmit` | A (`if (!canSubmit || submitting) return; setSubmitting(true)`) |

Alle 5 Handler haben state-setter-race zwischen Guard-Check und setState (React setState async).

Blueprint aus 156/157/158: `useSafeMutation` mit synchronem `isPending`-Guard, `errorTag`, onError-Toast-Routing.

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/components/community/ReportModal.tsx` | Refactor: 1x useSafeMutation. `submitting` = mut.isPending. errorTag `community.report`. |
| 2 | `src/components/community/PostReplies.tsx` | Refactor: 3x useSafeMutation (submit/delete/vote). `submitting`/`votingId` derived. errorTag `community.replySubmit` / `community.replyDelete` / `community.replyVote`. |
| 3 | `src/components/fan-wishes/FanWishModal.tsx` | Refactor: 1x useSafeMutation. errorTag `fanWish.submit`. |
| 4 | `src/components/community/__tests__/ReportModal.test.tsx` | NEU: ~4 Tests |
| 5 | `src/components/community/__tests__/PostReplies.test.tsx` | NEU: ~6 Tests |
| 6 | `src/components/fan-wishes/__tests__/FanWishModal.test.tsx` | NEU: ~4 Tests |

**Nicht geändert:**
- Services (`@/lib/services/contentReports`, `@/lib/services/fanWishes`, `@/lib/services/posts`) bleiben bei `{success, error}`-Shape bzw. `throw` — Hook-Wrapper unwrappt.
- Consumer-Pages unveraendert.

---

## Acceptance Criteria

1. **A1** — Jeder der 5 Handler via `useSafeMutation` mit `errorTag`.
2. **A2** — Rapid-Click Guard: zweite Invocation waehrend `mut.isPending` short-circuitet.
3. **A3** — Component-API unveraendert.
4. **A4** — i18n-Key-Leak-Schutz bleibt (existing `tErrors(mapErrorToKey(normalizeError(err)))` via onError-Toast).
5. **A5** — Tests gruen + tsc clean.

## Edge Cases

1. ReportModal `canSubmit`: derived aus `reason.length >= 5 && !submitting`. Nach Refactor: `!mut.isPending` ersetzt `!submitting`.
2. PostReplies `handleVote` — `votingId === replyId` pro Row. Nach Refactor: `mut.variables?.replyId === reply.id && mut.isPending`.
3. FanWishModal `canSubmit`: Name-Length + `!submitting`. Ersetzt durch `!mut.isPending`.
4. Fire-and-forget onSuccess side-effects (invalidateQueries, onRepliesCountChange callback) bleiben in onSuccess-callback.

---

## Proof-Plan

`worklog/proofs/159-vitest.txt` — Tests + Regression + tsc clean.

---

## Scope-Out

- CreatePredictionModal (nutzt bereits useCreatePrediction.mutateAsync, safe)
- LeaguesSection, AirdropScoreCard, MissionBanner (separater Slice 161+)
- Admin-Files (separater Scope — Slice 160 Admin-Tier-1)

---

## Time-Estimate

- Spec: done
- Refactor: ~60 min (3 Files, pattern repetitive)
- Tests: ~60 min
- Review: ~10 min
- Proof + Log + Commit: ~10 min

Total: ~2.5h.
