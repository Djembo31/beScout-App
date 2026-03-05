#!/usr/bin/env node
/**
 * Import fixture_player_stats for Bandırmaspor fixtures.
 * Only inserts stats that don't exist yet (safe to re-run).
 *
 * Usage: node scripts/import-ban-stats.mjs
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

const API_KEY = env.API_FOOTBALL_KEY || env.NEXT_PUBLIC_API_FOOTBALL_KEY;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY) { console.error('Missing API_FOOTBALL_KEY'); process.exit(1); }
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const API_BASE = 'https://v3.football.api-sports.io';

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return await res.json();
}

console.log('\n=== Import BAN Fixture Stats ===\n');

// Load all clubs (apiFootballId → club_id) via club_external_ids
const { data: clubExtIds } = await supabase.from('club_external_ids').select('club_id, external_id').eq('source', 'api_football');
const clubApiMap = new Map();
for (const ext of (clubExtIds ?? [])) {
  const numId = parseInt(ext.external_id, 10);
  if (!isNaN(numId)) clubApiMap.set(numId, ext.club_id);
}

// Load BAN club
const { data: banClub } = await supabase.from('clubs').select('id').eq('short', 'BAN').single();

// Load ALL player external IDs (via player_external_ids)
const [{ data: extIds }, { data: allPlayerRows }] = await Promise.all([
  supabase.from('player_external_ids').select('player_id, external_id').in('source', ['api_football_squad', 'api_football_fixture']),
  supabase.from('players').select('id, position'),
]);
const posLookup = new Map((allPlayerRows ?? []).map(p => [p.id, p.position]));
const playerMap = new Map();
for (const ext of (extIds ?? [])) {
  const numId = parseInt(ext.external_id, 10);
  if (isNaN(numId)) continue;
  playerMap.set(numId, { id: ext.player_id, api_football_id: numId, position: posLookup.get(ext.player_id) ?? 'MID' });
}
console.log(`Players mapped: ${playerMap.size}`);

// Load BAN finished fixtures
const { data: fixtures } = await supabase
  .from('fixtures')
  .select('id, api_fixture_id, gameweek, home_club_id, away_club_id')
  .or(`home_club_id.eq.${banClub.id},away_club_id.eq.${banClub.id}`)
  .eq('status', 'finished')
  .not('api_fixture_id', 'is', null)
  .order('gameweek');

console.log(`BAN finished fixtures: ${fixtures?.length ?? 0}\n`);

// Load existing stats to avoid duplicates
const { data: existingStats } = await supabase
  .from('fixture_player_stats')
  .select('fixture_id, player_id')
  .in('fixture_id', (fixtures ?? []).map(f => f.id));

const existingSet = new Set((existingStats ?? []).map(s => `${s.fixture_id}_${s.player_id}`));
console.log(`Existing stats in BAN fixtures: ${existingSet.size}\n`);

let totalInserted = 0;
let totalApiCalls = 0;
const errors = [];

for (const fix of (fixtures ?? [])) {
  try {
    const data = await apiFetch(`/fixtures/players?fixture=${fix.api_fixture_id}`);
    totalApiCalls++;

    const inserts = [];

    for (const teamData of data.response) {
      const teamClubId = clubApiMap.get(teamData.team.id);
      if (!teamClubId) continue;

      for (const pd of teamData.players) {
        const player = playerMap.get(pd.player.id);
        if (!player) continue;

        // Skip if already exists
        if (existingSet.has(`${fix.id}_${player.id}`)) continue;

        const stat = pd.statistics?.[0];
        if (!stat) continue;

        const minutes = stat.games?.minutes ?? 0;
        if (minutes === 0) continue;

        const ratingStr = stat.games?.rating;
        const rating = ratingStr ? parseFloat(ratingStr) : null;
        const fantasyPoints = rating ? Math.round(rating * 10) : 0;

        inserts.push({
          fixture_id: fix.id,
          player_id: player.id,
          club_id: teamClubId,
          minutes_played: minutes,
          goals: stat.goals?.total ?? 0,
          assists: stat.goals?.assists ?? 0,
          clean_sheet: false,
          goals_conceded: stat.goals?.conceded ?? 0,
          saves: stat.goals?.saves ?? 0,
          bonus: 0,
          fantasy_points: fantasyPoints,
          rating,
          yellow_card: (stat.cards?.yellow ?? 0) > 0,
          red_card: (stat.cards?.red ?? 0) > 0,
        });
      }
    }

    if (inserts.length > 0) {
      const { error: insErr } = await supabase
        .from('fixture_player_stats')
        .insert(inserts);

      if (insErr) {
        errors.push(`GW${fix.gameweek}: ${insErr.message}`);
      } else {
        totalInserted += inserts.length;
        console.log(`GW${fix.gameweek}: +${inserts.length} stats`);
        // Mark as existing to prevent duplicates in case of re-run
        for (const ins of inserts) {
          existingSet.add(`${ins.fixture_id}_${ins.player_id}`);
        }
      }
    } else {
      console.log(`GW${fix.gameweek}: all stats exist`);
    }

    await new Promise(r => setTimeout(r, 200));
  } catch (e) {
    errors.push(`GW${fix.gameweek}: ${e.message}`);
  }
}

// Sync GW scores
console.log('\nSyncing GW scores...');
const gws = [...new Set((fixtures ?? []).map(f => f.gameweek))].sort((a, b) => a - b);
for (const gw of gws) {
  await supabase.rpc('admin_resync_gw_scores', { p_gameweek: gw });
}

// Recalc perf
console.log('Recalculating perf...');
await supabase.rpc('cron_recalc_perf');

// Summary
console.log(`\n=== Summary ===`);
console.log(`API calls: ${totalApiCalls}`);
console.log(`Stats inserted: ${totalInserted}`);

if (errors.length > 0) {
  console.log(`\nErrors (${errors.length}):`);
  for (const e of errors) console.log(`  - ${e}`);
}

console.log('\nDone! Run SQL to verify BAN stats.');
