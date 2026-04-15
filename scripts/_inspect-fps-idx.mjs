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

// Trigger a pg_indexes lookup via a custom RPC
const { data, error } = await supabase.rpc('pg_get_indexdef_compat', { p_name: 'fixture_player_stats' });
if (error) console.log('rpc err:', error.message);
console.log('--- trying via select ---');

// Get indexes via pg_indexes (maybe available)
const { data: indexes } = await supabase.from('pg_indexes').select('*').eq('tablename', 'fixture_player_stats');
if (indexes) console.log(JSON.stringify(indexes, null, 2));
else console.log('pg_indexes not exposed');
