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

// BL1 GW4 fixtures
const { data: league } = await supabase.from('leagues').select('id').eq('short', 'BL1').maybeSingle();
const { data: fx } = await supabase.from('fixtures').select('id, api_fixture_id, home_club_id, away_club_id').eq('league_id', league.id).eq('gameweek', 4);
console.log('BL1 GW4 fixtures:', fx.length, 'IDs:', fx.map(f => f.id).slice(0, 3), '...');
// Query fps rows grouped by player_id (raw) for these fixtures
const fxIds = fx.map(f => f.id);
const { data: fps } = await supabase.from('fixture_player_stats').select('player_id, fixture_id').in('fixture_id', fxIds).not('player_id', 'is', null);
console.log('FPS rows for GW4 fixtures:', (fps ?? []).length);
// Find duplicates by player_id
const byPid = new Map();
for (const r of fps ?? []) {
  if (!byPid.has(r.player_id)) byPid.set(r.player_id, []);
  byPid.get(r.player_id).push(r.fixture_id);
}
const dups = Array.from(byPid.entries()).filter(([, arr]) => arr.length > 1);
console.log('Duplicate player_ids across multiple fixtures:', dups.length);
for (const [pid, fxids] of dups.slice(0, 5)) {
  console.log(`  ${pid}: ${fxids.length} fixtures`);
}
