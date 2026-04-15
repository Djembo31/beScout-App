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

// 1) schema of player_gameweek_scores
const { data: cols, error } = await supabase.rpc('exec_sql', { sql: `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='player_gameweek_scores' ORDER BY ordinal_position;` });
console.log('exec_sql rpc:', error?.message ?? 'not available, trying via direct select');

// Fallback: describe via sample row
const { data: sample, error: sErr } = await supabase.from('player_gameweek_scores').select('*').limit(1);
console.log('SAMPLE player_gameweek_scores:');
console.log(JSON.stringify(sample, null, 2));
console.log('sample error:', sErr?.message);

const { data: sample2, error: s2Err } = await supabase.from('fixture_player_stats').select('*').limit(1);
console.log('\nSAMPLE fixture_player_stats:');
console.log(JSON.stringify(sample2, null, 2));
console.log('sample error:', s2Err?.message);

const { data: players } = await supabase.from('players').select('id, perf_l5').limit(3);
console.log('\nSAMPLE players.perf_l5:');
console.log(JSON.stringify(players, null, 2));
