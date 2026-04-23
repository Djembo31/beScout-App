# CTO Review: Slice 159 — Tier-2 Data-Integrity Batch

**Reviewer:** reviewer-agent (Cold-Context)
**Date:** 2026-04-23
**Duration:** ~25 minutes

---

## Verdict: **PASS**

Ferrari-Pattern-Migration korrekt umgesetzt fuer 3 Files / 5 Mutations. errorTag-Observability sauber verdrahtet, i18n-key-leak-Schutz auf Modal-onError-Paths. Reviewer-NITs (Blueprint-Stil-Drift `mutate` vs `safeTrigger` + 1 fehlender Test) inline gefixt.

---

## Spec-Coverage

- [x] **A1** — 5 Handler via useSafeMutation + errorTag:
  - `community.report`
  - `community.replySubmit`
  - `community.replyDelete`
  - `community.replyVote`
  - `fanWish.submit`
- [x] **A2** — Rapid-Click Guards via `safeTrigger` (synchroner isPending-Check)
- [x] **A3** — Component-API unveraendert
- [x] **A4** — i18n-Key-Leak-Schutz erhalten
- [x] **A5** — 14 Tests gruen + tsc clean

## Findings (alle gefixt oder out-of-scope)

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | NIT | `mut.mutate` statt `mut.safeTrigger` — Blueprint-Stil-Drift gegen 156/157/158 | **FIXED** — alle 5 Handler auf `safeTrigger` migriert (Drop-in), inline-Guards entfernt wo durch Primitive abgedeckt |
| 2 | INFO (pre-existing) | PostReplies.tsx:183/199 sendet `voteType=0` fuer Toggle-Off, aber `vote_post` RPC constraint `p_vote_type IN (1,-1)` rejected. Client-Intent vs DB-Contract drift. | Backlog — separater Slice. In `worklog/active.md` dokumentiert. |
| 3 | NIT | `community.replyDelete` errorTag nicht getestet | **FIXED** — Test hinzugefuegt (`errorTag community.replyDelete on delete failure`) mit Confirm-Dialog-Flow |

## Positive Highlights

- **i18n-Key-Leak-Schutz:** `tErrors(mapErrorToKey(normalizeError(err)))` in ReportModal + FanWishModal onError — J3-Lesson verinnerlicht.
- **Vote-pro-Row-Pattern:** `voteReplyMut.variables?.replyId` derived statt legacy `setVotingId(replyId)` — per-Row disabled-Attribution ohne State-Race.
- **Service-Layer-Contract-Respect:** `mutationFn` wrappt `{success, error}`-Shape zu `throw` → einheitlicher Toast+Sentry-Pfad.
- **Fire-and-forget Side-Effects:** `queryClient.invalidateQueries({ queryKey: qk.fanWishes.mine() })` in onSuccess — sauber.
- **Derived State:** `submitting`/`votingId` aus mut.isPending vollstaendig durchgezogen in allen Render-Spots.
- **Test-Pattern-Pragmatismus:** "disabled during in-flight + service-count = 1" statt `disabled=false`-Post-Resolve-Assert. Korrekt weil onSuccess form-clear.

## Pruefung gegen CLAUDE-Rules

- `common-errors.md §1` (silent-catch): PASS — `throw new Error(...)` in mutationFn, onError via `logSilentCatch(errorTag, err)` im Primitive.
- `common-errors.md §6` (i18n-key-leak J3): PASS — Resolver-Pfad auf Consumer-Seite.
- `community.md` (`post_votes.vote_type` SMALLINT 1/-1): Pre-existing Bug erhalten, nicht Slice 159 Scope.
- `database.md` (Service-Layer-Pattern): PASS — keine direkten supabase-Calls.
- `ui-components.md` (Loading-States, Touch-44px): PASS.

## Learnings

- **Blueprint-Konsistenz-Check fuer Folge-Slices:** `grep -rn "\.mutate(" src/<geaendert>` vs `\.safeTrigger(` sollte Reviewer explizit pruefen — Stil-Drift frueh fangen.
- **Pre-existing Toggle-Vote-Bug** Kandidat fuer `common-errors.md §5` Eintrag (separater Slice): "Client sendet 0 fuer Toggle-Off, RPC rejected `NOT IN (1,-1)`. RPC hat Toggle-Off-Pfad wenn `p_vote_type = v_existing.vote_type`."

## Summary

Commit-freigabe. Blueprint-Konsistenz durch `safeTrigger`-Migration wiederhergestellt. 14 Tests gruen, 182 Regression-Tests in community/fan-wishes gruen, tsc clean.
