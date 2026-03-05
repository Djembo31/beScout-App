#!/usr/bin/env node
/**
 * Backfill real API-Football ratings for completed gameweeks.
 *
 * Usage: node scripts/backfill-ratings.mjs [startGW] [endGW]
 * Default: GW 1-28 (all completed)
 *
 * Reads .env.local for API_FOOTBALL_KEY and SUPABASE_SERVICE_ROLE_KEY.
 * Rate limit: ~10 API calls per GW, 100/day on Plus plan.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local (handle Windows \r\n)
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

if (!API_KEY) { console.error('Missing API_FOOTBALL_KEY in .env.local'); process.exit(1); }
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

// Parse args
const startGW = parseInt(process.argv[2] || '1', 10);
const endGW = parseInt(process.argv[3] || '28', 10);

console.log(`\n=== Backfill Ratings GW ${startGW}-${endGW} ===\n`);

// Load maps (via player_external_ids)
const [{ data: extIds }, { data: playerRows }, { data: clubExtIds }, { data: clubRows }] = await Promise.all([
  supabase.from('player_external_ids').select('player_id, external_id').in('source', ['api_football_squad', 'api_football_fixture']),
  supabase.from('players').select('id, first_name, last_name, position, club_id'),
  supabase.from('club_external_ids').select('club_id, external_id').eq('source', 'api_football'),
  supabase.from('clubs').select('id, short'),
]);

const playerInfoMap = new Map();
for (const p of (playerRows ?? [])) {
  playerInfoMap.set(p.id, { clubId: p.club_id, position: p.position, name: `${p.first_name} ${p.last_name}`.trim() });
}

const playerMap = new Map();
for (const ext of (extIds ?? [])) {
  const numId = parseInt(ext.external_id, 10);
  if (isNaN(numId)) continue;
  const info = playerInfoMap.get(ext.player_id);
  if (info) playerMap.set(numId, { id: ext.player_id, ...info });
}

const clubShortMap = new Map((clubRows ?? []).map(c => [c.id, c.short]));
const clubMap = new Map();
for (const ext of (clubExtIds ?? [])) {
  const numId = parseInt(ext.external_id, 10);
  if (!isNaN(numId)) clubMap.set(numId, { id: ext.club_id, short: clubShortMap.get(ext.club_id) ?? '' });
}

console.log(`Players mapped: ${playerMap.size}, Clubs mapped: ${clubMap.size}`);

let totalApiCalls = 0;
let totalUpdated = 0;
const allUnmapped = new Set();
const allErrors = [];

for (let gw = startGW; gw <= endGW; gw++) {
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id, api_fixture_id, home_club_id, away_club_id')
    .eq('gameweek', gw)
    .eq('status', 'finished')
    .not('api_fixture_id', 'is', null);

  if (!fixtures || fixtures.length === 0) {
    console.log(`GW${gw}: No finished fixtures, skipping`);
    continue;
  }

  let gwUpdated = 0;
  let gwCalls = 0;

  for (const fix of fixtures) {
    try {
      const data = await apiFetch(`/fixtures/players?fixture=${fix.api_fixture_id}`);
      gwCalls++;
      totalApiCalls++;

      for (const teamData of data.response) {
        const club = clubMap.get(teamData.team.id);
        if (!club) {
          allErrors.push(`GW${gw}: Club not mapped: ${teamData.team.name} (API#${teamData.team.id})`);
          continue;
        }

        for (const pd of teamData.players) {
          const ourPlayer = playerMap.get(pd.player.id);
          if (!ourPlayer) {
            allUnmapped.add(`${pd.player.name} (API#${pd.player.id}, ${teamData.team.name})`);
            continue;
          }

          const stat = pd.statistics?.[0];
          if (!stat) continue;

          const minutes = stat.games?.minutes ?? 0;
          if (minutes === 0) continue;

          const ratingStr = stat.games?.rating;
          const rating = ratingStr ? parseFloat(ratingStr) : null;
          if (rating === null) continue;

          const fantasyPoints = Math.round(rating * 10);

          const { error } = await supabase
            .from('fixture_player_stats')
            .update({ rating, fantasy_points: fantasyPoints })
            .eq('fixture_id', fix.id)
            .eq('player_id', ourPlayer.id);

          if (error) {
            allErrors.push(`GW${gw}: Update ${ourPlayer.name}: ${error.message}`);
          } else {
            gwUpdated++;
            totalUpdated++;
          }
        }
      }

      // Small delay between API calls to be nice
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      allErrors.push(`GW${gw}: Fixture API#${fix.api_fixture_id}: ${e.message}`);
    }
  }

  console.log(`GW${gw}: ${gwCalls} API calls, ${gwUpdated} ratings updated`);

  // Re-sync GW scores
  await supabase.rpc('admin_resync_gw_scores', { p_gameweek: gw });
}

// Recalc perf L5/L15
console.log('\nRecalculating perf L5/L15...');
const { data: perfResult } = await supabase.rpc('cron_recalc_perf');
console.log('Perf result:', perfResult);

// Summary
console.log(`\n=== Summary ===`);
console.log(`API calls: ${totalApiCalls}`);
console.log(`Ratings updated: ${totalUpdated}`);
console.log(`Unmapped players: ${allUnmapped.size}`);
if (allErrors.length > 0) {
  console.log(`\nErrors (${allErrors.length}):`);
  for (const e of allErrors.slice(0, 20)) console.log(`  - ${e}`);
  if (allErrors.length > 20) console.log(`  ... and ${allErrors.length - 20} more`);
}
if (allUnmapped.size > 0) {
  console.log(`\nUnmapped players (${allUnmapped.size}):`);
  const sorted = [...allUnmapped].sort();
  for (const p of sorted.slice(0, 30)) console.log(`  - ${p}`);
  if (sorted.length > 30) console.log(`  ... and ${sorted.length - 30} more`);
}

// Final verification
const { data: verif } = await supabase.rpc('admin_resync_gw_scores', { p_gameweek: startGW });
console.log(`\nVerification - GW${startGW} sync:`, verif);

const { data: topRatings } = await supabase
  .from('fixture_player_stats')
  .select('rating, fantasy_points, player_id')
  .not('rating', 'is', null)
  .order('rating', { ascending: false })
  .limit(5);

console.log('\nTop 5 ratings after backfill:');
for (const r of topRatings ?? []) {
  const player = playerRows?.find(p => p.id === r.player_id);
  console.log(`  ${(player?.first_name ?? '')} ${(player?.last_name ?? '')}: ${r.rating}`);
}

console.log('\nDone!');
