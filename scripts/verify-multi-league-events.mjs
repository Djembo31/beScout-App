#!/usr/bin/env node
/**
 * Post-Verify: Count active events per league.
 * Expected: TFF=13 unchanged, BL1/BL2/LL/PL/SA/SL each >=3.
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const clean = line.replace(/\r$/, '');
  const eqIdx = clean.indexOf('=');
  if (eqIdx < 1 || clean.startsWith('#')) continue;
  env[clean.slice(0, eqIdx).trim()] = clean.slice(eqIdx + 1).trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('=== Post-Verify: Events per League (active only) ===\n');
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, short, name')
    .eq('is_active', true)
    .order('short');

  const report = [];
  for (const l of leagues ?? []) {
    const { data: clubs } = await supabase.from('clubs').select('id').eq('league_id', l.id);
    const clubIds = (clubs ?? []).map(c => c.id);
    if (clubIds.length === 0) { report.push({ short: l.short, events: 0 }); continue; }
    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .in('club_id', clubIds)
      .in('status', ['registering', 'upcoming']);
    report.push({ short: l.short, name: l.name, events: count ?? 0 });
  }

  console.log('short | active_events | name');
  console.log('------|---------------|--------------------------------');
  for (const r of report) {
    console.log(`${r.short.padEnd(5)} | ${String(r.events).padStart(13)} | ${r.name}`);
  }
  console.log('');

  // Expected thresholds
  const expectations = {
    TFF1: 13,
    BL1: 3, BL2: 3, LL: 3, PL: 3, SA: 3, SL: 3
  };
  console.log('=== Validation ===');
  let allPass = true;
  for (const [short, minExpected] of Object.entries(expectations)) {
    const entry = report.find(r => r.short === short);
    const actual = entry?.events ?? 0;
    const pass = actual >= minExpected;
    console.log(`  ${short.padEnd(5)}: actual=${actual} expected>=${minExpected} ${pass ? 'PASS' : 'FAIL'}`);
    if (!pass) allPass = false;
  }
  console.log('');
  console.log(allPass ? '=== ALL CHECKS PASS ===' : '=== FAILURE ===');

  // Sanity: sample 1 event per major league
  console.log('\n--- Sample event per league (for visual sanity) ---');
  for (const short of ['BL1', 'BL2', 'LL', 'PL', 'SA', 'SL']) {
    const { data: l } = await supabase.from('leagues').select('id').eq('short', short).maybeSingle();
    const { data: clubs } = await supabase.from('clubs').select('id').eq('league_id', l.id);
    const { data: evts } = await supabase
      .from('events')
      .select('name, gameweek, status, event_tier, format, lineup_size, max_entries')
      .in('club_id', (clubs ?? []).map(c => c.id))
      .in('status', ['registering', 'upcoming'])
      .order('name');
    console.log(`\n  ${short}:`);
    for (const e of evts ?? []) {
      console.log(`    ${e.name} | gw=${e.gameweek} | ${e.event_tier}/${e.format} | size=${e.lineup_size} | max=${e.max_entries}`);
    }
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
