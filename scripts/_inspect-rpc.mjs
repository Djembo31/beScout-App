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

// Snapshot of cron_process_gameweek body
const { data, error } = await supabase.from('_rpc_body_snapshots').select('body').eq('rpc_name', 'cron_process_gameweek').maybeSingle();
if (error) console.error('err:', error.message);
else {
  console.log('=== cron_process_gameweek body ===');
  console.log(data?.body?.substring(0, 10000));
  console.log('...body length:', data?.body?.length);
}
