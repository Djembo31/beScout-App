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

// GW-distribution per league
const leagues = ['BL1','BL2','LL','PL','SA','SL'];
for (const ls of leagues) {
  const { data: league } = await supabase.from('leagues').select('id, short').eq('short', ls).maybeSingle();
  const { data: fx } = await supabase.from('fixtures').select('gameweek, status').eq('league_id', league.id);
  const byGw = {};
  for (const f of fx ?? []) {
    byGw[f.gameweek] = byGw[f.gameweek] ?? { total: 0, finished: 0 };
    byGw[f.gameweek].total++;
    if (f.status === 'finished') byGw[f.gameweek].finished++;
  }
  const gwKeys = Object.keys(byGw).map(Number).sort((a,b) => a-b);
  const allFin = gwKeys.filter(gw => byGw[gw].finished === byGw[gw].total);
  const parFin = gwKeys.filter(gw => byGw[gw].finished > 0 && byGw[gw].finished < byGw[gw].total);
  const noFin = gwKeys.filter(gw => byGw[gw].finished === 0);
  console.log(`${ls}: GWs ${gwKeys[0]}-${gwKeys[gwKeys.length-1]} | allFin=[${allFin.join(',')}] partial=[${parFin.join(',')}] noFin=[${noFin.slice(0,3).join(',')}...+${noFin.length-3 > 0 ? noFin.length-3 : 0}]`);
}
