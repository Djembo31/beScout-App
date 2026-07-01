# Slice 499 — W4-Konsolidierung: club_votes → community_polls (§0 Schnitt)

**Slice-Type:** Migration (+ Service + UI) · **Größe:** L · **Scope:** §3 Money-Path (cast_vote entfernen) + Feature-Removal (Admin-Tab) + Cross-Domain (community/club/admin/DB) · **CEO:** Anil „Voll konsolidieren (§0)" (2026-07-01, AskUserQuestion)

## 1. Problem-Statement (Evidence: Live-DB + functiondef + Grep)
`club_votes` ist ein **altes Voting-System, von `community_polls` vollständig abgelöst, nie entfernt** (§0-R1-Krankheit). Live-verifiziert:
- **`club_votes` = 0 Rows** (Live-DB), `vote_entries` = 0 Rows. `community_polls` = 4 aktiv / `community_poll_votes` = 3 (bis 2026-06-24) → das lebende System.
- **`community_polls` ist ein strikter Superset:** `create_community_poll` deckt `p_source='club'` (Club-Admin-Poll, 70% → Vereins-Treasury) UND `p_source='user'` ab, plus fan-rank-Gating/Player-Bezug/Follower-Notifs (Slices 333-356, D86/D92, „komplett & live"). Der Club-Admin hat die kanonische Poll-Create-UI (`CreatePollButton source="club"`) **bereits im selben AdminVotesTab**.
- **Money-Divergenz (P1-Kern, `pg_get_functiondef` verifiziert):** `cast_vote` belastet den Voter (`balance -= cost_bsd` + `vote_fee`-Ledger), routet aber **kein Gegenkonto** (kein Treasury/Creator/PBT) — Credits verschwinden ersatzlos (reiner Sink), während `cast_community_poll_vote` 70% an Treasury/Creator routet. Reachable via live „Neu Vote"-Button.

**Klasse:** §0-R1 (zweiter Weg, nie geschlossen). **P1-latent** — reachable money-model-divergenter Zweitweg im aktuellen W4-Domänenpfad, 0 Daten (kein aktiver Bug). Richtung fakten-eindeutig: **community_polls überlebt, club_votes raus.**

## 2. Lösungs-Design (§0 Schnitt, 2-phasig)
**Wave 1 (code-only, reversibel):** alle club_votes-Reader/Writer/Render + der `cast_vote`-Service-Caller raus → schließt die P1-Reachability (kein Create, kein Cast, kein Render mehr). community_polls-Pfad überall parallel + **unberührt**.
**Wave 2 (nach Live-Verify, gated — CEO-Check vor irreversiblem Schritt):** DROP `cast_vote` RPC + `club_votes` + `vote_entries` Tabellen + db-invariants-Eintrag.

## 3. Betroffene Files (Impact-Map, grep-verifiziert)
**Löschen ganz:**
- `src/lib/services/votes.ts` (getAllVotes/getUserVotedIds/castVote/createVote — alle club_votes/vote_entries/cast_vote)
- `src/lib/queries/votes.ts` (useClubVotes/useUserVotedIds)

**Reader/Writer umbauen:**
- `src/lib/queries/index.ts:21` — Export `useClubVotes` raus (+ useUserVotedIds falls exportiert)
- `src/lib/queries/keys.ts` — `votes:{all,byClub}` (149-151) + `clubs.votedIds` (226) raus (orphan nach Removal, S267)
- `src/types/index.ts:1220` — `DbClubVote` raus
- `src/components/community/CommunityFeedTab.tsx` — 'vote'-FeedItem-Union, `InlineFeedVoteCard`, `clubVotes`-Prop, Vote-Handler-Props (`userVotedIds`/`onCastVote`/`votingId`), Vote-Build-Block (264-266), Vote-Search-Case (304-305), Vote-Render-Case (509-518), `case 'vote'` in itemPlayerId/itemPlayerName raus. **BEHALTEN:** `'votes'`-Filter-Pill + `emptyVotes` (filtern jetzt nur community_polls — semantisch korrekt). `Vote`-Icon-Import bleibt (emptyVotes nutzt es).
- `src/components/community/hooks/types.ts` — `votingId` (22) + `SET_VOTING_ID` (43) raus
- `src/components/community/hooks/useCommunityData.ts` — getUserVotedIds-Import (10), useClubVotes (17), clubVotes (49), userVotedIds-State (74), getUserVotedIds-Branch im loadVoteIds-Effect (Poll-Branch behalten), Return-Felder clubVotes/userVotedIds/setUserVotedIds raus
- `src/components/community/hooks/useCommunityActions.ts` — castVote-Import (8), setUserVotedIds-Param (24,30), `handleCastVote` (286-300), Return-Feld raus
- `src/app/(app)/community/page.tsx` — `SET_VOTING_ID`-Reducer-Case (62), votingId-Init (100), setUserVotedIds-Wiring (114), Props clubVotes/userVotedIds/onCastVote/votingId an CommunityFeedTab (269,278-280) raus
- `src/components/club/sections/MitmachenSection.tsx` — useClubVotes-Import (9), clubVotes (24), clubVotes im allVotes-Merge (28-31) → `allVotes = communityPolls`
- `src/lib/services/club.ts:90` — `getClubPrestige`: `club_votes`-Count-Source → `community_polls` (Konzept „aktive Polls = Prestige" überlebt, kanonische Tabelle; positional-Ergebnis-Index unverändert = 5 Sources)
- `src/components/admin/AdminVotesTab.tsx` — getAllVotes/createVote-Import, DbClubVote, alte Create-Dialog + „Neu Vote"-Button + Vote-Liste + club_votes-State raus. **BEHALTEN:** `CreatePollButton source="club"`-Card (kanonisch). Tab wird schlank.
- `src/components/admin/AdminRevenueTab.tsx` — getAllVotes-Import, DbClubVote, votes-State, `voteRevenue`-Calc, Vote-Revenue-Card (82-90) raus. `totalRevenue = ipo + clubFee`. Grid 4→3 Cards.

**Tests:**
- `CommunityFeedTab.test.tsx` (DbClubVote/makeClubVote/vote-Tests) · `useCommunityData.test.ts` (useClubVotes/getUserVotedIds/votingId) · `useCommunityActions.test.ts` (castVote/SET_VOTING_ID/handleCastVote-Tests) · `AdminRevenueTab.test.tsx` (getAllVotes-Mock/voteRevenue) · `club.test.ts` (getClubPrestige club_votes→community_polls)

**Wave 2 (DROP):** `cast_vote(uuid,uuid,smallint)` · `club_votes` · `vote_entries` · `db-invariants.test.ts:1057` cast_vote-Shape-Eintrag

**Docs (LOG/Knowledge-Kopplung):** `.claude/rules/community.md` (FeedItem 'vote' + „Votes & Polls"-Sektion + cast_vote) · `docs/knowledge/domain/polls.md` (club_votes) · MASTERPLAN W4 · disease-register (neuer Heal-Eintrag) · TODO · session-handoff

## 4. Code-Reading-Liste (erledigt VOR Build)
1. ✅ Live `pg_get_functiondef('cast_vote')` — Money-Sink ohne Treasury-Route bestätigt.
2. ✅ `communityPolls.ts` `create_community_poll` — Superset (source='club'+'user', Treasury-Route) bestätigt.
3. ✅ AdminVotesTab — CreatePollButton (kanonisch) + alte createVote koexistent → CreatePollButton bleibt, kein Feature-Verlust.
4. ✅ AdminRevenueTab voteRevenue — liest club_votes (0) + cast_vote routet eh nicht → Card entfernen (nicht ersetzen; Poll-Revenue-Display = separater P2-Enhancement).
5. ✅ CommunityFeedTab Feed-Union — 'votes'-Filter zeigt beide → nach Removal nur polls (korrekt).
6. ✅ useCommunityData/Actions/page + reducer — Vote-vs-Poll-State getrennt; Poll-Branch bleibt vollständig.

## 5. Pattern-References
- §0 Schnitt-Regel (Subtraktion first-class), disease-register R1.
- S280/S375 (Removal deckt Code+DB+i18n+Tooling+Test-Fixtures — grep `__tests__` einschließen).
- S267 (orphan qk-Keys nach Query-Removal cleanen).
- database.md DROP COLUMN/TABLE: vor DROP ALLE Reader raus (2-Phasen, Wave 1 Code → Wave 2 DROP).
- S156 (kein CREATE OR REPLACE auf Money-RPC — hier nur DROP + reine Removal, community_polls-RPCs unberührt).

## 6. Acceptance Criteria (executable)
1. `grep -rn "club_votes\|vote_entries\|cast_vote\b\|DbClubVote\|getAllVotes\|castVote\|createVote\|useClubVotes\|useUserVotedIds" src/ | grep -v __tests__` → 0 (nach Wave 1; community_polls/cast_community_poll_vote bleiben)
2. `npx tsc --noEmit` → 0 Fehler
3. `npx vitest run` betroffene Suites (community, admin, club) → grün
4. Live-Walk (nach Deploy): Community-Feed 'votes'-Filter rendert Polls · Club-MitmachenSection rendert Polls · AdminVotesTab zeigt CreatePollButton (Poll erstellen funktioniert) · AdminRevenueTab rendert (3 Cards, kein NaN) · Console 0 neue Errors
5. Wave 2: `SELECT to_regclass('public.club_votes'), to_regclass('public.vote_entries'), to_regproc('public.cast_vote(uuid,uuid,smallint)')` → alle NULL

## 7. Edge Cases
- `qk.votes.all`/`byClub`/`clubs.votedIds` orphan → mit-entfernen (sonst S267-orphan-Export).
- `voteCast`-Toast-Key: SHARED mit handleCastPollVote → BEHALTEN.
- `Vote`-lucide-Icon: nach InlineFeedVoteCard-Removal noch von emptyVotes genutzt → Import bleibt.
- getClubPrestige: Promise.allSettled positional (5 Sources) — Source-Swap hält Index, kein Reindex nötig.
- AdminRevenueTab Grid `grid-cols-2 lg:grid-cols-4` mit 3 Cards → Layout ok (kein Fix nötig).
- Wave 1 lässt `cast_vote`/Tabellen live (kein SELECT mehr darauf) → kein 400; DROP erst Wave 2 nach Deploy-Verify.
- `useUserVotedIds` (queries/votes.ts) — Consumer-grep vor Delete (falls extern genutzt).

## 8. Self-Verification Commands
- `grep -rnE "\b(club_votes|vote_entries|cast_vote|DbClubVote|getAllVotes|castVote|createVote|useClubVotes|useUserVotedIds)\b" src/ | grep -v __tests__` (0 nach Wave 1)
- `npx tsc --noEmit`
- `npx vitest run src/components/community src/components/admin src/lib/services/__tests__/club.test.ts`
- Wave 2 Live: `SELECT to_regclass('public.club_votes'), to_regclass('public.vote_entries')`

## 9. Open-Questions
- **Geklärt (CEO):** Voll konsolidieren, community_polls überlebt. DROP gated (Wave 2 nach Wave-1-Deploy-Verify).
- **Autonom:** AdminVotesTab-Schlankung (CreatePollButton bleibt), Prestige-Source-Swap, Revenue-Card-Removal.
- **Notiert (nicht jetzt, P2-Enhancement):** Poll-Revenue in AdminRevenueTab anzeigen (Treasury poll_revenue) — separater Slice.

## 10. Proof-Plan
- `worklog/proofs/499-*.txt`: (a) grep-0-Beleg, (b) tsc+vitest, (c) Live-Walk-Screenshots (Community-Feed/MitmachenSection/AdminVotesTab/AdminRevenueTab), (d) Wave 2: to_regclass-NULL-Beleg.

## 11. Scope-Out
- `community_polls`/`cast_community_poll_vote`/`create_community_poll` — unberührt (kanonisch).
- Poll-Revenue-Display in AdminRevenueTab — separater P2.
- `post_votes` (Community-Post-Upvotes) — anderes Konzept, unberührt.
- D-18 (events-Spalten) bleibt geparkt (P2).

## 12. Stage-Chain (geplant)
SPEC ✅ → IMPACT (in §3) → **Wave 1 BUILD** (code-only) → tsc+vitest → REVIEW (Cold-Context, Money-Removal-Fokus: community_polls-Pfad unberührt?) → Deploy → **Live-Verify Wave 1** → **CEO-Check** → **Wave 2 DROP** → Live-Verify → PROVE → LOG.

## 13. Pre-Mortem (5+)
1. **Surviving community_polls-Pfad versehentlich mit-gebrochen** → Reviewer-Fokus + Live-Walk (Poll erstellen + voten). tsc + vitest fangen Import-Bruch.
2. **Orphan qk-Keys übersehen** (votes.all/byClub/votedIds) → S267-grep vor Commit.
3. **AdminVotesTab-Schlankung bricht CreatePollButton** (gemeinsame Imports) → nach Edit tsc + Render-Walk.
4. **getClubPrestige positional-Index-Shift** durch Source-Swap → Swap statt Remove (Index bleibt 5).
5. **Test-Fixtures mit DbClubVote/votingId** (5 Files) → vitest rot → in Wave 1 mit-bereinigen (S375).
6. **DROP vor Deploy** (Wave 2 zu früh) → strikt gated: DROP erst nach Wave-1-Deploy-Verify + CEO-Check.
7. **useUserVotedIds extern genutzt** → Consumer-grep vor Delete (Edge 7.9).
