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

const { data: league } = await supabase.from('leagues').select('id').eq('short', 'BL1').maybeSingle();
const { data: clubs } = await supabase.from('clubs').select('id').eq('league_id', league.id);
const clubIds = clubs.map(c => c.id);
const { data: players } = await supabase.from('players').select('id').in('club_id', clubIds);
const playerIds = players.map(p => p.id);
console.log('BL1 players:', playerIds.length);

let pgwCount = 0;
let samples = [];
const BATCH = 100;
for (let i = 0; i < playerIds.length; i += BATCH) {
  const slice = playerIds.slice(i, i + BATCH);
  const { data: scores, error } = await supabase.from('player_gameweek_scores').select('score').in('player_id', slice).eq('gameweek', 1);
  if (error) { console.error('ERR', error.message); break; }
  pgwCount += (scores ?? []).length;
  samples.push(...(scores ?? []).map(s => s.score));
}
console.log('BL1 GW1 pgw scores:', pgwCount);
if (samples.length) {
  samples.sort((a, b) => a - b);
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  console.log(`Score distribution: min=${samples[0]}, max=${samples[samples.length-1]}, avg=${avg.toFixed(1)}, median=${samples[Math.floor(samples.length/2)]}`);
}
