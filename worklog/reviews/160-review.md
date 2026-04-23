# Slice 160 Review

**Verdict:** CONCERNS (HIGH-Finding blockt Commit — muss im selben Slice gefixt werden)
**Reviewer:** reviewer-agent (cold-context, via Agent-tool dispatch)
**Date:** 2026-04-23
**Scope:** 7 Files (4 UI-Call-Sites + 4 Handler-Logik, davon 1 ueberlappt; + Type-Propagation CommunityFeedTab)

## Spec-Coverage

- [x] UI-Call-Sites (8 Zeilen): PostReplies 171/188 · PostCard 106/125 · EventCommunityTab 247/263 · CommunityTab 128/133 — alle senden `1`/`-1`, kein `0` mehr
- [x] Handler PostReplies.voteReplyMut: variables.prevVote → onSuccess `prevVote === voteType ? delete : set`
- [x] Handler useCommunityActions.handleVotePost: `oldVote = ?? 0`, `isToggleOff`, Optimistic-Delta mit `!isToggleOff` Guards
- [x] Handler usePlayerCommunity.handleVotePlayerPost: `prevVote`, `isToggleOff`
- [x] Handler EventCommunityTab.handleVote: `prevVote`, `isToggleOff`
- [x] Type-Narrowing `voteType: 1 | -1`: Component/Hook-Boundaries; Service `votePost(voteType: number)` bleibt offen (OK, Service-Boundary)
- [x] Proof: tsc clean + vitest 179/179

## Findings

| # | Severity | File:Line | Issue | Fix-Strategie |
|---|----------|-----------|-------|---------------|
| 1 | **HIGH** | `src/lib/services/posts.ts:286-306` | **Side-Effect-Regression durch Fix.** Pre-160 sendete Client `0` fuer Toggle-Off → Service-Guards `if (voteType === 1)` false → Missions + Notification feuerten NICHT. Post-160 sendet Client `voteType=1` auch bei Toggle-Off → Guards true → Mission-Progress + Notification + Activity-Log feuern bei JEDEM Click → **Mission-Exploit + Notification-Spam** (Upvote-Unvote-Spam fuer unlimited progress). | Service `votePost` nimmt `isToggleOff: boolean` Param, skipped Side-Effects wenn true. 4 Caller updaten (je 1 extra Arg). **In-Slice Fix, kein Migration.** |
| 2 | MEDIUM | `src/lib/services/posts.ts:274-284` | Silent-Cast-Vulnerability: `data as { upvotes, downvotes }` ohne `success`-Discriminator. Ungültige voteTypes oder auth.uid()-Mismatch → `{success:false, error:"..."}` → `result.upvotes = undefined`, UI broken ohne Toast. Pfad heute unerreichbar durch Client-Narrow, bleibt aber als latentes Risiko. | Out-of-Scope: Separater Silent-Fail-Audit-Slice. Dokumentiert in common-errors.md §5 als latentes Risiko. |
| 3 | MEDIUM | `.claude/rules/common-errors.md:301-306` | Stale: §5 Entry sagt "Slice 159 erhaltene Legacy-Behavior, out-of-scope-Dokumentation". Nach 160 falsch. | **FIXED in dieser Session** — Entry zu "FIXED in Slice 160" umgeschrieben, Fix-Pattern dokumentiert, Audit-Command als Regression-Guard. |
| 4 | MEDIUM | Community-Handler-Tests | Stale Test-Descriptions/Comments erwaehnen `0`-Verhalten. `toHaveBeenCalled()` ohne `toHaveBeenCalledWith(args)` laesst Regressions durchrutschen. | Description + `toHaveBeenCalledWith(USER_ID, POST_ID, 1)` Assertion — in-Slice if fast, sonst Tier-2-Roadmap. |
| 5 | LOW | 3 Vote-Handler ohne useSafeMutation | Pre-existing D18 Race. Slice 160 = Semantik-Fix, keine Ferrari-Migration. | **Scope-Out:** Tier-2 Data-Integrity Roadmap. |
| 6 | LOW | useCommunityActions Rollback-Snapshot | Non-deterministisch bei parallel-clicks. | Gehoert zu #5 useSafeMutation-Migration. |
| 7 | LOW | useCommunityActions Optimistic-Delta | Korrekt aber dichte Lesbarkeit. | Optionaler Kommentar — nicht blockierend. |

## RPC-Paritaet / Side-Effects Komplett

- Mission-Tracking: **INKONSISTENT** ← Finding #1 fix
- Notification-Trigger: **INKONSISTENT** ← Finding #1 fix
- Activity-Log: LOGGT ALLE vote_post Events inkl. Toggle-Off ← Finding #1 fix
- DB-Trigger `trg_fn_post_vote_gamification`: KORREKT (liest Row-Delta, nicht Intent)
- Cache-Invalidation: OK
- Cross-Handler-Konsistenz: alle 4 Handler uniform `prevVote === voteType`

## Positive

- Pattern-Konsistenz ueber 7 Stellen: `isToggleOff = prevVote === voteType` — textbook Uniform
- Type-Narrowing sauber propagiert (Component/Hook-Boundaries)
- useSafeMutation-Variables-Snapshot-Pattern in PostReplies korrekt (kein stale closure)
- Optimistic-Delta in useCommunityActions korrekt fuer alle 4 Uebergangsfaelle (neu/wechsel/toggle-off/race)

## Follow-up-Action-Items (im selben Slice)

1. **Service Fix (HIGH):** `votePost(userId, postId, voteType, isToggleOff)` — skip Mission + Notification wenn isToggleOff. Activity-Log ebenfalls skippen oder `voteType: 0` mitschreiben.
2. **Caller-Updates (4 Stellen):** PostReplies.voteReplyMut, useCommunityActions.handleVotePost, usePlayerCommunity.handleVotePlayerPost, EventCommunityTab.handleVote — `isToggleOff` durchreichen.
3. **Test-Update (Finding #4):** useCommunityActions test description + assertion auf `(USER_ID, POST_ID, 1, true)` fuer toggle-off-case.
4. **tsc + vitest:** re-run.
5. **LOG-Entry:** In log.md Slice 160 notieren mit beiden findings (Pattern-Fix + Side-Effect-Guard) + links zu review + proof.

## Summary

Semantischer Fix ist sauber implementiert und konsistent ueber 7 Code-Stellen. Ein verdeckter Side-Effect-Regression (Finding #1) macht den Fix **im jetzigen Zustand schlechter als vorher** (Mission-Exploit + Notification-Spam). Fix ist klein (4-5 Zeilen in Service + je 1 Caller-Arg), klar lokalisiert, kein Migration. Muss vor Commit.

Findings #3 (common-errors.md) bereits erledigt in derselben Session. #4 (Test-Hygiene) wird mitgefixt. #2/#5/#6/#7 = Tier-2-Roadmap.
