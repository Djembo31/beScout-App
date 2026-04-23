# Slice 160 — Vote-Toggle Bug Fix (Batch, 4 Files)

**Size:** S · **Stage:** SPEC · **Started:** 2026-04-23
**Type:** Bug-Fix Class (live-sichtbar, pre-existing aus Slice 159 Review-Finding)
**Reference:** `.claude/rules/common-errors.md` §5 "Vote-Toggle Client-Intent vs RPC-Constraint"

## Scope-Expansion (nach Pre-Build Grep)

Ursprünglich dokumentiert: `PostReplies.tsx:171/188`.
Grep `myVote === 1 ? 0 : 1|myVote === -1 ? 0 : -1` findet Bug-Klasse in **4 Files, 8 Call-Sites**:
1. `src/components/community/PostReplies.tsx` (Line 171, 188) — dokumentiert
2. `src/components/community/PostCard.tsx` (Line 106, 125)
3. `src/components/fantasy/EventCommunityTab.tsx` (Line 247, 263)
4. `src/components/player/detail/CommunityTab.tsx` (Line 128, 133)

Plus **4 Handler-Files** mit `voteType === 0` Anti-Pattern (delete-on-zero-sent):
- `src/components/community/PostReplies.tsx` (voteReplyMut onSuccess)
- `src/components/community/hooks/useCommunityActions.ts` (handleVotePost)
- `src/components/player/detail/hooks/usePlayerCommunity.ts` (handleVotePlayerPost)
- `src/components/fantasy/EventCommunityTab.tsx` (handleVote)

**Scope-Begruendung:** Gleiche Bug-Klasse, gleicher RPC-Guard, Single-Scope-Fix verhindert Splitters und hält Pattern-Konsistenz. Batch analog Slice 159 (3-File-Batch fuer Mutation-Race).

## Ziel

Upvote/Downvote-Toggle-Off in `PostReplies.tsx` funktioniert ohne Error-Toast und UI-State-Breakage: User clickt seinen Upvote erneut → Vote wird entfernt, Score geht zurueck, `myVotes` wird korrekt gecleart.

## Bug-Beschreibung

**Aktuelles Verhalten (Zeile 171/188):**
```tsx
onClick={() => handleVote(reply.id, myVote === 1 ? 0 : 1)}
onClick={() => handleVote(reply.id, myVote === -1 ? 0 : -1)}
```

Client sendet `voteType=0` fuer Toggle-Off. RPC `vote_post` (Migration `20260404192000`, Line 312-314) hat aber early-return-Guard:
```sql
IF p_vote_type NOT IN (1, -1) THEN
  RETURN json_build_object('success', false, 'error', 'Ungueltiger vote_type');
END IF;
```

**Folge:**
1. RPC returnt `{success: false, error: 'Ungueltiger vote_type'}` (kein HTTP-Error, kein throw).
2. Service `votePost` castet `data as { upvotes: number; downvotes: number }` → **silent type-cast**, `result.upvotes === undefined`.
3. `onSuccess` setzt `setReplies(... upvotes: undefined, downvotes: undefined ...)` → UI rendert NaN/broken.
4. User sieht Vote "haenge", Page-Refresh = Vote ist wieder da (RPC hat nicht geDELETE-t).

**Korrekter RPC-Pfad (vorhanden, Zeile 320-323):**
```sql
IF FOUND THEN
  IF v_existing.vote_type = p_vote_type THEN
    DELETE FROM post_votes WHERE id = v_existing.id;  -- ← same-vote = toggle-off
  ELSE
    UPDATE post_votes SET vote_type = p_vote_type WHERE id = v_existing.id;
  END IF;
END IF;
```

RPC erwartet vom Client **denselben vote_type** nochmal zu senden, nicht `0`.

## Fix-Strategie (Client-only, kein Migration)

**Ebene 1 — UI-Buttons:** Nur `1` oder `-1` senden (nie `0`).
**Ebene 2 — Handler-Logic:** Handler liest `prevVote` aus eigenem State (`myVotes.get(postId)`), ermittelt Toggle-Off via `prevVote === voteType`, updated State entsprechend.

**Begruendung:** Handler kennt `myVotes`-State selbst. Prev-Vote-Intent muss nicht als Parameter durchgereicht werden. Minimal-invasive Änderung je Handler: 2-3 Zeilen.

## Betroffene Files

### UI-Call-Sites (8 Zeilen insgesamt)
- `src/components/community/PostReplies.tsx` — Line 171 (`1`), 188 (`-1`)
- `src/components/community/PostCard.tsx` — Line 106 (`1`), 125 (`-1`)
- `src/components/fantasy/EventCommunityTab.tsx` — Line 247 (`1`), 263 (`-1`)
- `src/components/player/detail/CommunityTab.tsx` — Line 128 (`1`), 133 (`-1`)

### Handler-Logic (4 Files)
- `src/components/community/PostReplies.tsx` voteReplyMut — `onSuccess` liest `myVotes.get(replyId)` im Handler (nicht in variables, weil useSafeMutation den snapshot braucht). Pattern: `safeTrigger` mit `prevVote` in variables, `onSuccess` nutzt variables.prevVote.
- `src/components/community/hooks/useCommunityActions.ts` `handleVotePost` — `prevVote = myPostVotes.get(postId)`, `isToggleOff = prevVote === voteType`, State-Update mit `isToggleOff` statt `voteType === 0`.
- `src/components/player/detail/hooks/usePlayerCommunity.ts` `handleVotePlayerPost` — gleiche Änderung wie useCommunityActions.
- `src/components/fantasy/EventCommunityTab.tsx` inline `handleVote` — gleiche Änderung.

## Acceptance Criteria

1. User clickt Upvote (myVote=undefined) → `votePost(uid, replyId, 1)` → RPC INSERT → `myVotes.set(replyId, 1)` → grüner Pfeil.
2. User clickt Upvote erneut (myVote=1) → `votePost(uid, replyId, 1)` → RPC DELETE → `myVotes.delete(replyId)` → weißer Pfeil.
3. User clickt Downvote bei myVote=1 → `votePost(uid, replyId, -1)` → RPC UPDATE → `myVotes.set(replyId, -1)` → roter Pfeil.
4. User clickt Downvote bei myVote=-1 → `votePost(uid, replyId, -1)` → RPC DELETE → `myVotes.delete(replyId)` → weißer Pfeil.
5. `result.upvotes` und `result.downvotes` nie `undefined` nach erfolgreicher Mutation (weil RPC nicht mehr early-rejected).
6. `tsc --noEmit` clean.
7. Vitest alle bisherigen PostReplies-Tests gruen.

## Edge Cases

1. **Race-Condition** zwei schnelle Clicks: useSafeMutation synchroner `isPending`-Guard blockt zweiten Click (Slice 151 Pattern, bereits vorhanden).
2. **prevVote stale** zwischen Click und Mutation-Fire: React setState-Batching ist synchron in handleVote — `myVotes.get(replyId)` liest aktuellen State. Selbst wenn stale: worst case ist `DELETE` statt `INSERT` → Server korrigiert automatisch (INSERT wenn nicht da, DELETE wenn da).
3. **Upvote zu Downvote Wechsel** (myVote=1 → user clickt Downvote): `prevVote=1`, `voteType=-1` → `prevVote !== voteType` → `myVotes.set(replyId, -1)` korrekt.
4. **Server-Error** (network, auth, etc.): useSafeMutation auto-Toast via errorTag `community.replyVote`, kein State-Update → UI bleibt konsistent.
5. **Nie-gevoteter Reply** (myVote=undefined → undefined !== 1/-1): `prevVote=undefined`, `voteType=1` → `prevVote !== voteType` → `myVotes.set(replyId, 1)` → INSERT-Pfad serverseitig, passt.

## Proof-Plan

- `git diff --stat` Summary
- `npx tsc --noEmit` clean
- `npx vitest run src/components/community` (bestehende Tests + neuer Test) clean
- Optional: Playwright gegen bescout.net nach Deploy (Upvote, Re-Click, Score zurück, keine Error-Toast)

## Scope-Out

- Keine RPC-Änderung (`vote_post` bleibt unverändert).
- Keine Änderungen an anderen Consumern von `votePost` (z.B. `CommunityFeed` falls sie 0 senden — out-of-scope, nicht reportet).
- Keine `aria-label` für Vote-Buttons (separater Backlog-Punkt aus 159 Review).
- Kein neues RPC-Return-Feld (`wasRemoved`).

## Open Questions (Self-Answered)

**Q:** Gibt es andere Call-Sites, die `votePost` mit `0` aufrufen?
**A:** Grep notwendig. Falls ja: separater Slice oder erweitern.

**Q:** Sollte der Service `votePost` den `success:false`-JSON-Body in einen throw umwandeln (Hardening)?
**A:** Out-of-scope — separater Silent-Fail-Audit-Punkt. Heute fixen wir nur den Client-Aufruf.
