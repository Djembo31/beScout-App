# Review — Slice 499: club_votes → community_polls (§0 Schnitt, Wave 1 code-only)

**Reviewer:** Cold-Context-Reviewer-Agent · **Datum:** 2026-07-01 · **time-spent:** 26 min
**Verdict:** CONCERNS (Code merge-reif; 1 Doc-Must-Fix vor Commit)

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW→MED | `.claude/rules/community.md` (Feed Union-Type + „Votes & Polls") | Doc-Drift: FeedItem-Union enthält noch `{ type: 'vote'; data: DbClubVote }` + „Vote Gewicht … `cast_vote` RPC". Autoloaded bei Community-Edit → routet künftigen Agent auf nicht-existente Symbole (§0/D88 6. Removal-Achse). | FeedItem auf 4 Typen (post/research/bounty/poll), „Votes & Polls" auf community_polls/`cast_community_poll_vote`. VOR Commit. |
| 2 | LOW | `MitmachenSection.tsx:26-33` | `allVotes = communityPolls` ohne `status==='active'`-Filter unter Header `t('activeVotes')`. **Pre-existing** (alter Poll-Merge filterte auch nicht), aber Datei angefasst. | `.filter(p => p.status === 'active')` (Konsistenz mit CommunityFeedTab:201). Nicht blockierend. |

## Money-Pfad (community_polls) nachweislich unberührt? — JA (positiv-belegt)
Positiv-Grep (excl. `__tests__`) alle kanonischen Symbole intakt über 11 Files:
`communityPolls.ts` (3×), `queries/polls.ts` (2×), `invalidation.ts` (2×), `useCommunityActions.ts` (4× = `castCommunityPollVote` + `cancelCommunityPoll` + 2× `qk.polls`), `useCommunityData.ts` (2×), `MitmachenSection.tsx` (2×), page/types/fanRankPerks/errorMessages.
- `handleCastPollVote` unverändert (ruft `castCommunityPollVote`, invalidiert `qk.polls.all` + `qk.wallet.all` S371, `SET_POLL_VOTING_ID`).
- `cast_community_poll_vote`-RPC (70%-Treasury/Creator, D86/D92) im Diff nicht angefasst (S156-Body unberührt; nur DROP-Plan für `cast_vote` Wave 2).
- Entfernter Pfad ausschließlich der divergente `cast_vote`-Sink; Reachability Wave 1 geschlossen.

## Prüf-Fokus-Belege
1. Surviving-Path UNBERÜHRT, keine Vote-vs-Poll-Verwechslung (poll-only Props sauber durchgereicht, `SET_POLL_VOTING_ID` erhalten).
2. Vollständigkeit: Orphan-Grep src/ = 0 (einziger `votingId`-Treffer = PostReplies Reply-Upvote, unverwandt). qk-Sweep (votes/votedIds) = 0 (S267). Test-Fixtures (S375) bereinigt.
3. getClubPrestige-Swap: Query-Shape identisch, Positional-Index unverändert (votesResult Index 2), Score-Gewicht `votes*10` erhalten. Korrekt.
4. AdminRevenueTab: `totalRevenue = ipo + clubFee` null-safe, kein NaN. Grid 3 Cards ok.
5. AdminVotesTab: CreatePollButton source='club' — Funktion erhalten, i18n DE+TR vorhanden.
6. CommunityFeedTab: FeedItem 4 Typen, Switches exhaustiv, 'votes'-Pill/emptyVotes/Vote-Icon behalten (filtern community_polls active).
7. Business/Compliance: kein Wording/Money-Semantik-Bruch.

## Informational (kein Finding)
`db-invariants.test.ts:1057/1588/1626` (cast_vote-Shape, club_votes, vote_entries) bleiben Wave 1 korrekt bestehen (spiegeln Live-DB, DROP = Wave 2). Kein Halb-Removal.

## Learning (Knowledge-Capture)
Bei §0-Feature-Removal mit begleitendem autoloaded `.claude/rules/*.md`-Doc: das Doc-Update ist Teil der Schnitt-Regel (stale FeedItem-Type/RPC-Ref = ungetrackter zweiter Weg für den nächsten Agent), nicht optionale LOG-Kosmetik → **6. Removal-Achse** zu S280/S375 ergänzen.

## Positive
Vollständiges §0-Removal ohne produktiven Orphan (inkl. qk-Factory, Test-Fixtures, Barrel-Export). Money-Pfad-Trennung mustergültig. Positional-Index-Falle bei getClubPrestige bewusst vermieden (Swap statt Remove, Pre-Mortem #4).
