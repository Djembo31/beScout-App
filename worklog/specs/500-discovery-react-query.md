# Slice 500 — W4: Discovery-Liste in React Query + onSettled-Reconciliation

**Slice-Type:** Service/Hook (+ UI-Refactor) · **Größe:** S · **Scope:** kein Money/Security, W4-Architektur · **CEO:** Anil „mach W4 fertig"

## 1. Problem-Statement (Evidence: clubs/page.tsx:37-80 + useToggleFollowClub)
Die Discovery-Liste (`/clubs`) lädt `getClubsWithStats`+`getNextFixturesByClub` via page-lokalem `useState`+`useEffect` (Promise.all), **nicht** React Query: kein Cache (Re-Fetch pro Mount), kein Cache-Sharing, kein Background-Refetch; die eingebettete `follower_count` wird nur page-lokal optimistisch gebumpt und driftet von der Server-Wahrheit (fremde Follows sichtbar erst nach Reload). = Architektur-Inkonsistenz im W4-Domänenpfad (P1 per Framework „Architekturproblem im aktuellen Pfad"). `useToggleFollowClub` ist bereits vollständig RQ-basiert, invalidiert die Discovery-Liste aber nicht (weil sie kein RQ-Key war).

**W4-Item 2 (`fanRanking`-Freshness): bereits erledigt** — `useFanRanking` hat `staleTime:30s` (FIX-06/J9F-08, „tier-up feedback needs to feel live"). MASTERPLAN-Eintrag war stale → nur reconcilen, nicht bauen.

## 2. Lösungs-Design
- NEU `useClubsWithStats({activeOnly})` (`lib/hooks/`) + `qk.clubs.withStats(activeOnly)` — RQ-Wrap um `getClubsWithStats`, staleTime 2min (semi-statisch, follower_count driftet).
- Fixtures: bestehenden `useNextFixtures` (`queries/managerData`, staleTime 10min, gleicher Service) **wiederverwenden** (kein 3. Duplikat).
- `clubs/page.tsx`: useState/useEffect-Ladung → Hooks; `loading`/`dataError` aus Query-State, Retry via `refetch()`; Optimistic follower_count via `setQueryData` auf `qk.clubs.withStats(true)` statt lokalem `setClubs`.
- `useToggleFollowClub.onSettled`: `invalidateQueries(['clubs','withStats'])` (Prefix, both activeOnly-Varianten) → Server-Reconciliation der Discovery-Liste. Refetch nur wenn /clubs gemountet.

## 3. Betroffene Files
`keys.ts` (+withStats-Key) · NEU `lib/hooks/useClubsWithStats.ts` · `clubs/page.tsx` (Refactor) · `lib/hooks/useToggleFollowClub.ts` (onSettled +1 invalidate) · Test `ClubsDiscoveryPage.test.tsx` (mockt Service-Layer → kein Change nötig, Hook ruft Service).

## 4. Code-Reading (erledigt)
- ✅ `getClubsWithStats(club.ts:372)` Signatur/Return · ✅ `useToggleFollowClub` onMutate/onSettled (isFollowing/followers/followedByUser via setQueryData; Button-State bereits instant) · ✅ `useNextFixtures(managerData:63)` reusable · ✅ `useFanRanking` staleTime 30s (Item 2 done).

## 5. Pattern-References
- S143 (setQueryData bei deterministic optimistic vs invalidate bei indeterministic) · S371/performance.md (invalidate nach Writes) · §0 (Reuse `useNextFixtures` statt 3. Duplikat).

## 6. Acceptance Criteria
1. `/clubs` lädt via `useClubsWithStats` (RQ-Cache, kein Mount-Re-Fetch) + `useNextFixtures`.
2. Follow-Toggle: Button instant (isFollowing) + follower_count Sofort-Bump + Server-Reconciliation nach onSettled.
3. tsc 0 · ClubsDiscoveryPage-Test grün · Follow-Tests grün (useClubActions/ClubProvider/ClubContent).
4. Live-Walk `/clubs` (post-Deploy): Liste rendert, Follow/Unfollow funktioniert, follower_count aktualisiert, Console 0 Errors.

## 7. Edge Cases
- nextFixtures undefined während Loading → optional chaining `nextFixtures?.get()`.
- onSettled-Invalidate bei Follow von anderer Seite (Club-Page) → markiert /clubs stale, refetch erst bei Mount (kein Waste).
- Optimistic + onSettled-Refetch: Werte stimmen überein (Server committed vor onSettled) → kein Flicker.
- follower_count Math.max(0, …) gegen Negativ-Drift.

## 8. Self-Verification
- `npx tsc --noEmit` · `npx vitest run "src/app/(app)/clubs" src/components/club/hooks src/components/providers/__tests__/ClubProvider.test.tsx`
- Live: `/clubs` Follow-Walk.

## 9. Open-Questions
- Geklärt: Item 2 (fanRanking) bereits erledigt → nur MASTERPLAN reconcilen.

## 10. Proof-Plan
- `worklog/proofs/500-discovery-rq.txt`: tsc + vitest + diff-stat + Live-Walk /clubs.

## 11. Scope-Out
- `useNextFixtures`-Doppel (managerData vs fantasyPicker) = bestehende §0-Notiz, nicht dieser Slice.
- getClubsWithStats-Service-Body unberührt.

## 12. Stage-Chain
SPEC → BUILD → REVIEW (self, Frontend-RQ-Pattern, kein Money/Security) → PROVE (tests+diff, Refactor-ohne-Behavior-Change) + Live-Walk → LOG.

## 13. Pre-Mortem
1. onSettled-Invalidate zu breit → nur `['clubs','withStats']`, refetcht nur mounted. ✓
2. Optimistic-Bump verloren durch Refetch → Werte stimmen (Server committed) → kein sichtbarer Flicker. ✓
3. Test bricht (Service-Mock) → Hook ruft Service, renderWithProviders liefert QueryClient → 7/7 grün. ✓
4. nextFixtures-undefined-Crash → optional chaining. ✓
