/**
 * BUG-004 Fix: Reset events incorrectly set to 'running'
 *
 * Problem: 13 events in GW 32-38 have status='running' but all fixtures
 * in those gameweeks are still 'scheduled' (not kicked off).
 *
 * Fix: Reset these events to 'registering'.
 *
 * Usage: npx tsx scripts/fix-bug-004.ts
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(url, serviceKey);

async function main() {
  // Step 1: Find gameweeks where ALL fixtures are still 'scheduled'
  const { data: allFixtures, error: fixErr } = await sb
    .from('fixtures')
    .select('gameweek, status');

  if (fixErr) {
    console.error('Failed to fetch fixtures:', fixErr);
    process.exit(1);
  }

  const gwMap = new Map<number, string[]>();
  for (const f of allFixtures ?? []) {
    const statuses = gwMap.get(f.gameweek) ?? [];
    statuses.push(f.status);
    gwMap.set(f.gameweek, statuses);
  }

  const fullyScheduledGWs: number[] = [];
  for (const [gw, statuses] of gwMap.entries()) {
    if (statuses.every(s => s === 'scheduled')) {
      fullyScheduledGWs.push(gw);
    }
  }

  if (fullyScheduledGWs.length === 0) {
    console.log('No fully-scheduled gameweeks found. Nothing to fix.');
    return;
  }

  console.log(`Fully scheduled gameweeks: ${fullyScheduledGWs.join(', ')}`);

  // Step 2: Find events in these GWs that are incorrectly 'running'
  const { data: badEvents, error: evtErr } = await sb
    .from('events')
    .select('id, name, status, gameweek')
    .eq('status', 'running')
    .in('gameweek', fullyScheduledGWs);

  if (evtErr) {
    console.error('Failed to fetch events:', evtErr);
    process.exit(1);
  }

  if (!badEvents || badEvents.length === 0) {
    console.log('No incorrectly-running events found. All good!');
    return;
  }

  console.log(`\nFound ${badEvents.length} events to fix:`);
  for (const evt of badEvents) {
    console.log(`  - GW${evt.gameweek}: ${evt.name} (${evt.id})`);
  }

  // Step 3: Reset to 'registering'
  const ids = badEvents.map(e => e.id);
  const { error: updateErr, count } = await sb
    .from('events')
    .update({ status: 'registering' })
    .in('id', ids);

  if (updateErr) {
    console.error('Failed to update events:', updateErr);
    process.exit(1);
  }

  console.log(`\nFixed ${count ?? ids.length} events → status='registering'`);
}

main().catch(console.error);
