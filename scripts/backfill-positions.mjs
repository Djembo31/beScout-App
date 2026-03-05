/**
 * Standalone backfill script: Fetches match_position from API-Football
 * and updates fixture_player_stats.
 *
 * Usage: node scripts/backfill-positions.mjs 1 10
 *   (backfills GW 1 through 10)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const API_BASE = 'https://v3.football.api-sports.io';
const apiKey = process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!apiKey || !supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars: API_FOOTBALL_KEY, SUPABASE_URL, or SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function mapPosition(apiPos) {
  const p = apiPos.toUpperCase().trim();
  if (p === 'G' || p.includes('GOAL')) return 'GK';
  if (p === 'D' || p.includes('DEF')) return 'DEF';
  if (p === 'M' || p.includes('MID')) return 'MID';
  if (p === 'F' || p.includes('ATT') || p.includes('FOR')) return 'ATT';
  return 'MID';
}

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${res.statusText}`);
  return res.json();
}

async function main() {
  const startGw = parseInt(process.argv[2] || '1', 10);
  const endGw = parseInt(process.argv[3] || process.argv[2] || '1', 10);

  console.log(`Backfilling match_position for GW ${startGw}-${endGw}...`);

  // Load maps (via player_external_ids)
  const { data: extIds } = await supabase
    .from('player_external_ids')
    .select('player_id, external_id')
    .in('source', ['api_football_squad', 'api_football_fixture']);

  const playerMap = new Map();
  for (const ext of (extIds ?? [])) {
    const numId = parseInt(ext.external_id, 10);
    if (!isNaN(numId)) playerMap.set(numId, ext.player_id);
  }

  const { data: clubExtIds } = await supabase
    .from('club_external_ids')
    .select('club_id, external_id')
    .eq('source', 'api_football');

  const clubMap = new Map();
  for (const ext of (clubExtIds ?? [])) {
    const numId = parseInt(ext.external_id, 10);
    if (!isNaN(numId)) clubMap.set(numId, ext.club_id);
  }

  console.log(`Loaded ${playerMap.size} players, ${clubMap.size} clubs`);

  let totalUpdated = 0;
  let totalApiCalls = 0;

  for (let gw = startGw; gw <= endGw; gw++) {
    const { data: fixtures } = await supabase
      .from('fixtures')
      .select('id, api_fixture_id, home_club_id, away_club_id')
      .eq('gameweek', gw)
      .eq('status', 'finished')
      .not('api_fixture_id', 'is', null);

    if (!fixtures || fixtures.length === 0) {
      console.log(`GW ${gw}: No finished fixtures, skipping`);
      continue;
    }

    let gwUpdated = 0;

    for (const fix of fixtures) {
      try {
        const apiStats = await apiFetch(`/fixtures/players?fixture=${fix.api_fixture_id}`);
        totalApiCalls++;

        for (const teamData of apiStats.response) {
          const clubId = clubMap.get(teamData.team.id);
          if (!clubId) continue;

          for (const pd of teamData.players) {
            const ourPlayerId = playerMap.get(pd.player.id);
            if (!ourPlayerId) continue;

            const stat = pd.statistics[0];
            if (!stat) continue;

            const minutes = stat.games.minutes ?? 0;
            if (minutes === 0) continue;

            const matchPosition = stat.games.position ? mapPosition(stat.games.position) : null;
            if (!matchPosition) continue;

            const { error } = await supabase
              .from('fixture_player_stats')
              .update({ match_position: matchPosition })
              .eq('fixture_id', fix.id)
              .eq('player_id', ourPlayerId);

            if (!error) {
              gwUpdated++;
              totalUpdated++;
            }
          }
        }
      } catch (e) {
        console.error(`  Fixture API#${fix.api_fixture_id}: ${e.message}`);
      }
    }

    console.log(`GW ${gw}: ${fixtures.length} fixtures, ${gwUpdated} positions updated (${totalApiCalls} API calls total)`);
  }

  console.log(`\nDone! Total: ${totalUpdated} positions updated, ${totalApiCalls} API calls`);
}

main().catch(console.error);
