# Slice 165 Review

**Verdict:** PASS (NITPICK in-slice gefixt)
**Reviewer:** reviewer-agent (cold-context, via Agent-tool dispatch)
**Date:** 2026-04-23
**Scope:** 2 Files (posts.ts votePost-Service + common-errors.md §1 Docs).

## Spec-Coverage

- [x] AC1: `votePost` wirft `Error` bei RPC `{success: false}`
- [x] AC2: `votePost` wirft `Error` bei `typeof upvotes !== 'number'`
- [x] AC3: Return-Shape garantiert `{upvotes: number, downvotes: number}`
- [x] AC4: Bestehende Tests grün (Mocks nutzen success-shape, Guard passt durch)
- [x] AC5: tsc clean
- [x] AC6: common-errors.md §1 Entry "Silent-Cast ohne Discriminator-Check" mit Audit-Tabelle (8 Services) + Fix-Pattern + Audit-Command

## Findings

| # | Severity | Status | File:Line | Issue | Resolution |
|---|----------|--------|-----------|-------|------------|
| 1 | NITPICK | **FIXED in-slice** | posts.ts:329 | Edge Case #3 aus Spec — wenn `data === null`, werfen `result.success` / `result.upvotes` TypeError statt freundlichem `'vote_post_failed'`. Dead-Path (RPC nutzt immer `json_build_object`), aber Defense-in-Depth-Policy. | `if (!data || typeof data !== 'object') throw new Error('vote_post_failed');` vor dem Cast eingefügt. |

**Keine HIGH / MEDIUM / REWORK / FAIL.**

## Positive (aus Reviewer)

- **Kommentar-Qualität:** Erklärt inkonsistenten Shape ("success:true fehlt im Success-Path"), warum Guard nötig. Zukünftiger Dev versteht in 20 Sekunden.
- **RPC-Body verifiziert:** Migration-Referenz (`20260404192000:292-343`) bestätigt beide Shapes exakt wie Spec.
- **Audit-Tabelle komplett:** 8 Services mit `return data as {...}` gegrept + bewertet. `referral.getInviter` korrekt als "grey" (explicit-null-path).
- **Consumer-Chain-Analyse:** Alle 3 Consumer (useCommunityActions + PostReplies + EventCommunityTab) nutzen `useSafeMutation` + `errorTag` → thrown Error landet in onError + Sentry-Breadcrumb. Regression-Risk NULL.
- **Side-Effects-Order-Check:** Mission/Activity/Notification feuern vor dem neuen Guard — bei Error-Response fire-and-forget-Side-Effects laufen. Spec-konform, kein Exploit weil DB-Server-Trigger gegen Row-State dedupliziert.
- **Knowledge-Capture-Quality:** common-errors.md Entry selbstständig lesbar (Symptom + Variante + Fix + Audit + Narrative). Karpathy-Flywheel-ready.

## Consumer-Chain Impact

| Consumer | errorTag | onError | Status |
|----------|----------|---------|--------|
| useCommunityActions.ts | community.votePost | addToast + snapshot-rollback | ✓ |
| PostReplies.tsx (voteReplyMut) | community.replyVote | kein explizit onError → Sentry-only | Status-quo 159, out-of-scope |
| EventCommunityTab.tsx | eventCommunity.vote | kein explizit onError → Sentry-only | Status-quo 162, out-of-scope |

**Regression-Risk:** NULL. Kein Consumer behandelte `undefined`-Fall vorher, also keiner wird durch `throw` schlechter gestellt.

## Learnings (für Session-End)

- **RPC-Shape-Konsistenz-Regel für database.md (Backlog):** "Jede RPC die `json_build_object` returnt MUSS im Success-Path `{success: true, ...}`-flag setzen — sonst Discriminator ist Feld-Existenz, fehleranfällig". Würde zukünftige RPC-Drift der gleichen Klasse verhindern.

## Summary

Slice 165 schließt Slice 160 Finding #2 (latent Silent-Cast-Vulnerability) sauber: 1 Service-Fix (~12 Zeilen inkl. null-Guard), 1 Docs-Update (common-errors.md §1 Klassifikation + 8-Service-Audit). Reviewer NITPICK zur null-data-Edge-Case in-slice gefixt (Defense-in-Depth). Spec-Discipline mit explizitem Scope-Out vorbildlich. **Ready to merge.**
