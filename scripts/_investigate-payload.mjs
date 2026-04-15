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

// What other fps rows exist in BL1 with gameweek=4 (through fixtures.gameweek=4, not restricted to this league)?
// The RPC does WHERE f.gameweek = p_gameweek — GLOBAL across leagues!
// This is the bug — BL1 GW4 AND TFF1 GW4 fixtures get processed together.
const { data: otherLeagueFpsGw4 } = await supabase
  .from('fixtures')
  .select('id, league_id')
  .eq('gameweek', 4)
  .eq('status', 'finished');
const leagueIds = new Set(otherLeagueFpsGw4.map(f => f.league_id));
console.log('Leagues with finished GW4 fixtures:', leagueIds.size, 'fixtures total:', otherLeagueFpsGw4.length);
// Count fps rows per league for GW4
for (const lid of leagueIds) {
  const leagueFxs = otherLeagueFpsGw4.filter(f => f.league_id === lid).map(f => f.id);
  const { data: fps } = await supabase.from('fixture_player_stats').select('player_id').in('fixture_id', leagueFxs).not('player_id', 'is', null);
  const { data: leagueInfo } = await supabase.from('leagues').select('short').eq('id', lid).maybeSingle();
  console.log(`  ${leagueInfo?.short}: ${leagueFxs.length} fixtures, ${(fps ?? []).length} fps rows with player_id`);
}

// If any pgw for GW4 exists that would conflict with incoming BL1 GW4 data?
const { data: bl1Clubs } = await supabase.from('clubs').select('id').eq('league_id', (await supabase.from('leagues').select('id').eq('short','BL1').maybeSingle()).data.id);
const { data: bl1Players } = await supabase.from('players').select('id').in('club_id', bl1Clubs.map(c => c.id));
const bl1PlayerIds = bl1Players.map(p => p.id);
// any pgw for GW4 with these players?
let pgwCount = 0;
for (let i = 0; i < bl1PlayerIds.length; i += 100) {
  const slice = bl1PlayerIds.slice(i, i + 100);
  const { data: pgw } = await supabase.from('player_gameweek_scores').select('player_id').in('player_id', slice).eq('gameweek', 4);
  pgwCount += (pgw ?? []).length;
}
console.log(`BL1 players with pgw.gameweek=4: ${pgwCount}`);
