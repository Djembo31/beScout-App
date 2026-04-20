# Silent-Fail-Audit 2026-04-20

- Files scanned: 1008
- Total findings: 211
- High severity: 111
- Medium severity: 100
- Total risk: **HIGH**

---

## Pattern: in-without-chunking (138 findings)

- `e2e/qa-realtime-feed.ts:81` [MEDIUM] — const { error } = await admin.from('activity_log').delete().in('id', ids);
- `scripts/backfill-complete-stats.mjs:552` [MEDIUM] — .in('fixture_id', gwFixtureIds);
- `scripts/backfill-scoring-historical.mjs:417` [MEDIUM] — .in('club_id', clubIds);
- `scripts/backfill-scoring-historical.mjs:432` [MEDIUM] — .in('player_id', slice)
- `scripts/backfill-scoring-historical.mjs:634` [MEDIUM] — .in('short', TARGET_LEAGUE_SHORTS);
- `scripts/backfill-scoring-historical.mjs:657` [MEDIUM] — const { data: players } = await supabase.from('players').select('id').in('club_id', clubIds);
- `scripts/backfill-tff-players.mjs:166` [MEDIUM] — .in('club_id', clubIds)
- `scripts/backfill-tff-players.mjs:452` [MEDIUM] — .in('club_id', clubIds);
- `scripts/fix-bug-004.ts:61` [MEDIUM] — .in('gameweek', fullyScheduledGWs);
- `scripts/fix-bug-004.ts:83` [MEDIUM] — .in('id', ids);
- `scripts/fix-tff-logos.mjs:128` [MEDIUM] — .in('id', ids)
- `scripts/fix-tff-logos.mjs:236` [MEDIUM] — .in('id', ids)
- `scripts/import-ban-stats.mjs:81` [MEDIUM] — .in('fixture_id', (fixtures ?? []).map(f => f.id));
- `scripts/import-fixtures.mjs:242` [MEDIUM] — .in('short', shorts);
- `scripts/import-fixtures.mjs:265` [MEDIUM] — .in('league_id', leagueIds)
- `scripts/import-league.mjs:299` [MEDIUM] — .in('id', leagueIds);
- `scripts/rebuild-ban-squad.mjs:141` [MEDIUM] — .in('id', oldIds);
- `scripts/rebuild-ban-squad.mjs:197` [MEDIUM] — .in('player_id', (verify ?? []).map(v => v.id));
- `scripts/seed-multi-league-events.mjs:125` [MEDIUM] — .in('short', TARGET_LEAGUES.map(l => l.short));
- `scripts/seed-multi-league-events.mjs:216` [MEDIUM] — .in('club_id', pilotIds)
- `scripts/seed-multi-league-events.mjs:217` [MEDIUM] — .in('gameweek', gws);
- `scripts/seed-multi-league-events.mjs:310` [MEDIUM] — .in('id', (inserted ?? []).map(e => e.id));
- `scripts/silent-fail-audit.ts:174` [MEDIUM] — md += `- \`.in()\` in .test.ts files → filter later\n`;
- `scripts/tm-profile-local.ts:92` [MEDIUM] — .in('club_id', slice)
- `scripts/tm-rescrape-stale.ts:132` [MEDIUM] — if (clubFilter) q = q.in('club_id', clubFilter);
- `scripts/tm-rescrape-stale.ts:324` [MEDIUM] — .in('club_id', clubIds);
- `scripts/tm-rescrape-stale.ts:329` [MEDIUM] — .in('club_id', clubIds);
- `scripts/tm-search-local.ts:106` [MEDIUM] — .in('club_id', slice)
- `scripts/tm-search-scrape-unknown.ts:118` [MEDIUM] — if (clubFilter) q = q.in('club_id', clubFilter);
- `scripts/verify-multi-league-events.mjs:35` [MEDIUM] — .in('club_id', clubIds)
- `scripts/verify-multi-league-events.mjs:72` [MEDIUM] — .in('club_id', (clubs ?? []).map(c => c.id))
- `scripts/_investigate-gw4.mjs:18` [MEDIUM] — const { data: fps } = await supabase.from('fixture_player_stats').select('player_id, fixture_id').in('fixture_id', fxIds
- `scripts/_investigate-payload.mjs:25` [MEDIUM] — const { data: fps } = await supabase.from('fixture_player_stats').select('player_id').in('fixture_id', leagueFxs).not('p
- `scripts/_investigate-payload.mjs:32` [MEDIUM] — const { data: bl1Players } = await supabase.from('players').select('id').in('club_id', bl1Clubs.map(c => c.id));
- `scripts/_investigate-payload.mjs:38` [MEDIUM] — const { data: pgw } = await supabase.from('player_gameweek_scores').select('player_id').in('player_id', slice).eq('gamew
- `scripts/_preflight-stats.mjs:20` [MEDIUM] — const { count: playerCount } = await supabase.from('players').select('*', { head: true, count: 'exact' }).in('club_id', 
- `scripts/_preflight-stats.mjs:24` [MEDIUM] — const { data: players } = await supabase.from('players').select('id, perf_l5').in('club_id', ids);
- `scripts/_verify-bl1-gw1.mjs:15` [MEDIUM] — const { data: players } = await supabase.from('players').select('id').in('club_id', clubIds);
- `src/app/api/cron/gameweek-sync/route.ts:241` [HIGH] — .in('id', leagueIds)
- `src/app/api/cron/gameweek-sync/route.ts:482` [HIGH] — .in('home_club_id', allLeagueClubIds)
- `src/app/api/cron/gameweek-sync/route.ts:491` [HIGH] — .in('club_id', clubsToProcess.map(c => c.id))
- `src/app/api/cron/gameweek-sync/route.ts:521` [HIGH] — .in('home_club_id', allLeagueClubIds)
- `src/app/api/cron/gameweek-sync/route.ts:599` [HIGH] — .in('home_club_id', allLeagueClubIds)
- `src/app/api/cron/gameweek-sync/route.ts:608` [HIGH] — .in('club_id', allLeagueClubIds),
- `src/app/api/cron/gameweek-sync/route.ts:613` [HIGH] — .in('club_id', allLeagueClubIds),
- `src/app/api/cron/gameweek-sync/route.ts:712` [HIGH] — .in('home_club_id', allLeagueClubIds)
- `src/app/api/cron/gameweek-sync/route.ts:1254` [HIGH] — .in('club_id', allLeagueClubIds)
- `src/app/api/cron/gameweek-sync/route.ts:1294` [HIGH] — .in('home_club_id', allLeagueClubIds);
- `src/app/api/cron/gameweek-sync/route.ts:1378` [HIGH] — .in('event_id', eventIds);
- `src/app/api/cron/gameweek-sync/route.ts:1455` [HIGH] — .in('home_club_id', allLeagueClubIds);
- ... +88 more

## Pattern: error-check-without-throw-or-return (43 findings)

- `src/lib/services/adRevenueShare.ts:26` [MEDIUM] — if (error) {
- `src/lib/services/adRevenueShare.ts:44` [MEDIUM] — if (error) {
- `src/lib/services/adRevenueShare.ts:62` [MEDIUM] — if (error) {
- `src/lib/services/club.ts:110` [MEDIUM] — if (error) { console.error('[Club] getClubFollowerCount failed:', error); return 0; }
- `src/lib/services/club.ts:636` [MEDIUM] — if (error) return { success: false, error: error.message };
- `src/lib/services/cosmetics.ts:98` [MEDIUM] — if (error) {
- `src/lib/services/creatorFund.ts:20` [MEDIUM] — if (error) {
- `src/lib/services/creatorFund.ts:55` [MEDIUM] — if (error) {
- `src/lib/services/dailyChallenge.ts:35` [MEDIUM] — if (error) {
- `src/lib/services/economyConfig.ts:93` [MEDIUM] — if (error) return { ok: false, error: error.message };
- `src/lib/services/economyConfig.ts:106` [MEDIUM] — if (error) return { ok: false, error: error.message };
- `src/lib/services/economyConfig.ts:119` [MEDIUM] — if (error) return { ok: false, error: error.message };
- `src/lib/services/economyConfig.ts:132` [MEDIUM] — if (error) return { ok: false, error: error.message };
- `src/lib/services/economyConfig.ts:154` [MEDIUM] — if (error) return { ok: false, error: error.message };
- `src/lib/services/economyConfig.ts:180` [MEDIUM] — if (error) return { ok: false, error: error.message };
- `src/lib/services/economyConfig.ts:193` [MEDIUM] — if (error) return { ok: false, error: error.message };
- `src/lib/services/economyConfig.ts:205` [MEDIUM] — if (error) return { ok: false, error: error.message };
- `src/lib/services/economyConfig.ts:262` [MEDIUM] — if (error) return { ok: false, error: error.message };
- `src/lib/services/economyConfig.ts:275` [MEDIUM] — if (error) return { ok: false, error: error.message };
- `src/lib/services/fanRanking.ts:64` [MEDIUM] — if (error) {
- `src/lib/services/fanRanking.ts:98` [MEDIUM] — if (error) {
- `src/lib/services/fanWishes.ts:18` [MEDIUM] — if (error) return { success: false, error: error.message };
- `src/lib/services/fanWishes.ts:46` [MEDIUM] — if (error) return { success: false, error: error.message };
- `src/lib/services/foundingPasses.ts:47` [MEDIUM] — if (error) {
- `src/lib/services/gamification.ts:59` [MEDIUM] — if (error) {
- `src/lib/services/liquidation.ts:20` [MEDIUM] — if (error) return { success: false, error: mapRpcError(error.message) };
- `src/lib/services/liquidation.ts:47` [MEDIUM] — if (error) return { success: false, error: mapRpcError(error.message) };
- `src/lib/services/missions.ts:134` [MEDIUM] — if (error) return { success: false, error: mapErrorToKey(normalizeError(error)) };
- `src/lib/services/mysteryBox.ts:43` [MEDIUM] — if (error) {
- `src/lib/services/players.ts:250` [MEDIUM] — if (error) return { success: false, error: error.message };
- `src/lib/services/pushSender.ts:52` [MEDIUM] — if (error) {
- `src/lib/services/referral.ts:19` [MEDIUM] — if (error) return 0;
- `src/lib/services/referral.ts:52` [MEDIUM] — if (error) return { success: false, error: error.message };
- `src/lib/services/referral.ts:62` [MEDIUM] — if (error) {
- `src/lib/services/sponsors.ts:106` [MEDIUM] — if (error) return { success: false, error: error.message };
- `src/lib/services/sponsors.ts:119` [MEDIUM] — if (error) return { success: false, error: error.message };
- `src/lib/services/sponsors.ts:129` [MEDIUM] — if (error) return { success: false, error: error.message };
- `src/lib/services/sponsorTracking.ts:42` [MEDIUM] — if (error) {
- `src/lib/services/tickets.ts:91` [MEDIUM] — if (error) {
- `src/lib/services/tickets.ts:121` [MEDIUM] — if (error) {
- `src/lib/services/tips.ts:72` [MEDIUM] — if (error) {
- `src/lib/services/trading.ts:505` [MEDIUM] — if (error) return { success: false, error: mapRpcError(error.message) };
- `src/lib/services/valuations.ts:87` [MEDIUM] — if (error) return { success: false, error: error.message };

## Pattern: select-without-range-or-limit (16 findings)

- `src/app/api/admin/sync-contracts/route.ts:93` [HIGH] — supabaseAdmin.from('clubs').select('id, name'),
- `src/app/api/admin/sync-contracts/route.ts:94` [HIGH] — supabaseAdmin.from('player_external_ids').select('player_id, external_id').in('source', ['api_football_squad', 'api_foot
- `src/app/api/cron/sync-players-daily/route.ts:141` [HIGH] — const { data: clubs, error: clubErr } = await supabaseAdmin.from('clubs').select('id, name');
- `src/lib/services/contentReports.ts:54` [HIGH] — ? supabase.from('profiles').select('id, handle, display_name').in('id', reporterIds)
- `src/lib/services/contentReports.ts:57` [HIGH] — ? supabase.from('posts').select('id, content, user_id, club_id').in('id', postIds)
- `src/lib/services/contentReports.ts:60` [HIGH] — ? supabase.from('research_posts').select('id, title, user_id').in('id', researchIds)
- `src/lib/services/footballData.ts:124` [HIGH] — supabase.from('clubs').select('id, name'),
- `src/lib/services/offers.ts:21` [HIGH] — supabase.from('players').select('id, first_name, last_name, position, club').in('id', playerIds),
- `src/lib/services/offers.ts:22` [HIGH] — supabase.from('profiles').select('id, handle, display_name, avatar_url').in('id', userIds),
- `src/lib/services/social.ts:125` [HIGH] — supabase.from('profiles').select('id, handle, display_name, avatar_url, level').in('id', ids),
- `src/lib/services/social.ts:126` [HIGH] — supabase.from('user_stats').select('user_id, total_score').in('user_id', ids),
- `src/lib/services/social.ts:154` [HIGH] — supabase.from('profiles').select('id, handle, display_name, avatar_url, level').in('id', ids),
- `src/lib/services/social.ts:155` [HIGH] — supabase.from('user_stats').select('user_id, total_score').in('user_id', ids),
- `src/lib/__tests__/db-invariants.test.ts:71` [HIGH] — const { data: allClubs } = await sb.from('clubs').select('id, league_id');
- `src/lib/__tests__/db-invariants.test.ts:134` [HIGH] — const { data: allClubs } = await sb.from('clubs').select('id, league_id');
- `src/lib/__tests__/db-invariants.test.ts:1877` [HIGH] — const { data, error } = await sb.from('clubs').select('id, name, logo_url');

## Pattern: destructure-data-without-error (11 findings)

- `scripts/tm-profile-local.ts:69` [HIGH] — const { data } = await supabase
- `src/app/(app)/bescout-admin/AdminFoundingPassesTab.tsx:71` [HIGH] — const { data } = await supabase
- `src/app/(app)/club/[slug]/page.tsx:9` [HIGH] — const { data } = await supabaseAdmin
- `src/app/(app)/player/[id]/page.tsx:9` [HIGH] — const { data } = await supabaseAdmin
- `src/app/(app)/profile/[handle]/layout.tsx:11` [HIGH] — const { data } = await supabaseAdmin
- `src/app/api/admin/backfill-ratings/route.ts:175` [HIGH] — const { data } = await supabaseAdmin.rpc('admin_resync_gw_scores', { p_gameweek: gw });
- `src/features/fantasy/services/events.queries.ts:62` [HIGH] — const { data } = await supabase
- `src/features/fantasy/services/events.queries.ts:85` [HIGH] — const { data } = await supabase
- `src/features/fantasy/services/lineups.queries.ts:50` [HIGH] — const { data } = await supabase
- `src/features/fantasy/services/predictions.mutations.ts:95` [HIGH] — const { data } = await supabase
- `src/lib/supabaseMiddleware.ts:57` [HIGH] — const { data } = await supabase.auth.getUser();

## Pattern: silent-catch-comment (2 findings)

- `scripts/fetch-stadium-images.mjs:91` [HIGH] — } catch (err) { (only-comment catch)
- `scripts/fetch-stadium-images.mjs:113` [HIGH] — } catch (err) { (only-comment catch)

## Pattern: script-hardcoded-state-check (1 findings)

- `scripts/silent-fail-audit.ts:106` [MEDIUM] — if (rel.startsWith('scripts/') && /'transfermarkt_stale'|'transfermarkt_verified'|'transfermarkt_unknown'|'unknown'/.tes

---

## Next Actions (priority order)

1. HIGH-severity findings in `src/app/api/` or `src/lib/services/` (Money-critical path)
2. HIGH-severity findings in scripts/ that run in Production (Cron)
3. MEDIUM-severity as weekly cleanup

## False-Positive-Patterns

- `.in()` in .test.ts files → filter later
- Error-check followed by `logSupabaseError()` + throw → false positive
- `.select()` in .eq() context → false positive
