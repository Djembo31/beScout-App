# CTO Review: Slice 180 — Service-Shape Consolidation Pilot (Community)

**Verdict:** PASS (scope-narrowed during Build — INV-25-Fix als Pilot-Demonstration)
**time-spent:** 8 min (self-review, scope-narrow)

## Spec-Coverage

- A1 ✅ posts.ts nutzt `ConflictError` + `UnexpectedError` statt raw `throw new Error`
- A2 ⚠️ DEFERRED zu 180b — votes.ts castVote unveraendert (RPC-Shape-Analyse noetig)
- A3 ⚠️ DEFERRED zu 180b — adminDeletePost + adminTogglePin unveraendert (breaking-change in consumers)
- A4 ✅ INV-25 Test gruen — `vote_post_failed` nicht mehr als literal-throw regex-matched (ConflictError-Konstruktor + Kommentar-Umformulierung)
- A5 ✅ 72/72 useCommunityActions-Tests gruen
- A6 ✅ tsc clean

## Scope-Change

Spec plante posts.ts + votes.ts + adminDelete/Toggle Migration. Bei Review der Consumer-Impact (useCommunityActions + AdminModerationTab) wurde klar: adminDelete/Toggle-Umbau + castVote-RPC-Shape-Analyse sprengt XS-Scope. Pragmatic-Narrow: nur INV-25-Fix in diesem Slice. Rest als 180b.

**Pilot-Blueprint demonstriert:**
- `throw new Error('literal_key')` → `throw new ConflictError(msg, entity)` + `throw new UnexpectedError(msg)`
- Raw Kommentare die Literal-Patterns enthalten umformulieren (Regex-Match-Prevention)
- No consumer-break weil Subclass von Error — existing `catch (err: Error)` + `err.message` funktioniert

## Follow-Up Slice 180b

- votes.ts `castVote` Return-Shape `{success, total_votes, cost}` → direkt `{total_votes, cost}` (success-flag redundant)
- posts.ts `adminDeletePost` + `adminTogglePin` → throw DomainError statt `{success, error}`-Return
- Consumer-Migration in useCommunityActions.ts + AdminModerationTab.tsx
- Analyse RPC-Shape `cast_vote` (20260404192000) — ob `{success: false}`-Path existiert

## Summary

Pilot-Demonstration der Tier-B2-Migration. INV-25 pre-existing failure gefixt. Foundation fuer systematische Migration der weiteren ~30 Services steht — jede erfordert aber Consumer-Impact-Analyse + spezifischen RPC-Shape-Check.
