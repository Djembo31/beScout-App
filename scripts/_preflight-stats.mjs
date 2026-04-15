import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = {};
for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const clean = line.replace(/\r$/, '');
  const eqIdx = clean.indexOf('=');
  if (eqIdx < 1 || clean.startsWith('#')) continue;
  env[clean.slice(0, eqIdx).trim()] = clean.slice(eqIdx + 1).trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1) Per-League: counts of players, clubs, finished fixtures, pgw_scores, players with real perf_l5
const leagues = ['TFF1','BL1','BL2','LL','PL','SA','SL'];
for (const ls of leagues) {
  const { data: league } = await supabase.from('leagues').select('id, short, name, api_football_id').eq('short', ls).maybeSingle();
  if (!league) { console.log(`${ls}: not found`); continue; }
  const { count: clubCount } = await supabase.from('clubs').select('*', { head: true, count: 'exact' }).eq('league_id', league.id);
  const { data: clubIds } = await supabase.from('clubs').select('id').eq('league_id', league.id);
  const ids = (clubIds ?? []).map(c => c.id);
  const { count: playerCount } = await supabase.from('players').select('*', { head: true, count: 'exact' }).in('club_id', ids);
  const { count: finishedFixtures } = await supabase.from('fixtures').select('*', { head: true, count: 'exact' }).eq('league_id', league.id).eq('status', 'finished');
  const { count: totalFixtures } = await supabase.from('fixtures').select('*', { head: true, count: 'exact' }).eq('league_id', league.id);
  // Players of this league with real perf_l5 (not default 50)
  const { data: players } = await supabase.from('players').select('id, perf_l5').in('club_id', ids);
  const realPerf = (players ?? []).filter(p => p.perf_l5 !== 50 && p.perf_l5 !== null).length;
  const totalPlayers = (players ?? []).length;
  // pgw scores for league players
  const playerIdsOfLeague = (players ?? []).map(p => p.id);
  let pgwCount = 0;
  if (playerIdsOfLeague.length > 0) {
    // batched
    const BATCH = 500;
    for (let i = 0; i < playerIdsOfLeague.length; i += BATCH) {
      const slice = playerIdsOfLeague.slice(i, i + BATCH);
      const { count } = await supabase.from('player_gameweek_scores').select('*', { head: true, count: 'exact' }).in('player_id', slice);
      pgwCount += count ?? 0;
    }
  }
  // fixture_player_stats for league
  const { data: leagueFixtures } = await supabase.from('fixtures').select('id').eq('league_id', league.id);
  const fixtureIds = (leagueFixtures ?? []).map(f => f.id);
  let fpsCount = 0;
  if (fixtureIds.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < fixtureIds.length; i += BATCH) {
      const slice = fixtureIds.slice(i, i + BATCH);
      const { count } = await supabase.from('fixture_player_stats').select('*', { head: true, count: 'exact' }).in('fixture_id', slice);
      fpsCount += count ?? 0;
    }
  }
  console.log(`${ls.padEnd(5)} api=${String(league.api_football_id).padEnd(4)} clubs=${String(clubCount).padEnd(3)} players=${String(playerCount).padEnd(4)} fixtures=${String(totalFixtures).padEnd(4)} finished=${String(finishedFixtures).padEnd(4)} fps=${String(fpsCount).padEnd(6)} pgw=${String(pgwCount).padEnd(6)} real_l5=${realPerf}/${totalPlayers}`);
}
