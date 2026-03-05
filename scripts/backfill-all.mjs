/**
 * Unified Backfill Script: Re-imports all fixture stats with dual-ID player map
 * AND stores real formations from API-Football lineups endpoint.
 *
 * Per fixture: 2 API calls (/fixtures/players + /fixtures/lineups)
 * 280 fixtures × 2 = ~560 API calls total, split across batches.
 *
 * Usage: node scripts/backfill-all.mjs <startGw> <endGw>
 *   Example: node scripts/backfill-all.mjs 1 10
 *
 * API-Football Plus: 100 calls/day → max ~5 GWs/day (~50 fixtures × 2 = 100 calls)
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

function calcFantasyPoints(position, minutes, goals, assists, cleanSheet, goalsConceded, yellowCard, redCard, saves, bonus) {
  let pts = 0;
  if (minutes > 0) pts += 1;
  if (minutes >= 60) pts += 1;

  const pos = position.toUpperCase();
  if (pos === 'GK' || pos === 'DEF') pts += goals * 6;
  else if (pos === 'MID') pts += goals * 5;
  else pts += goals * 4;

  pts += assists * 3;

  if (cleanSheet && minutes >= 60) {
    if (pos === 'GK' || pos === 'DEF') pts += 4;
    else if (pos === 'MID') pts += 1;
  }

  if ((pos === 'GK' || pos === 'DEF') && goalsConceded >= 2) {
    pts -= Math.floor(goalsConceded / 2);
  }

  if (yellowCard) pts -= 1;
  if (redCard) pts -= 3;
  if (pos === 'GK') pts += Math.floor(saves / 3);
  pts += bonus;

  return Math.max(0, pts);
}

async function main() {
  const startGw = parseInt(process.argv[2] || '1', 10);
  const endGw = parseInt(process.argv[3] || process.argv[2] || '1', 10);

  console.log(`\n=== Backfill All: GW ${startGw}-${endGw} ===\n`);

  // 1. Load dual-ID player map
  const { data: playerRows } = await supabase
    .from('players')
    .select('id, api_football_id, fixture_api_football_id, position')
    .not('api_football_id', 'is', null);

  const apiPlayerMap = new Map();
  for (const p of (playerRows ?? [])) {
    const entry = { id: p.id, position: p.position };
    if (p.api_football_id) apiPlayerMap.set(p.api_football_id, entry);
    if (p.fixture_api_football_id) apiPlayerMap.set(p.fixture_api_football_id, entry);
  }

  // 2. Load club map
  const { data: clubRows } = await supabase
    .from('clubs')
    .select('id, api_football_id')
    .not('api_football_id', 'is', null);

  const apiClubMap = new Map((clubRows ?? []).map(c => [c.api_football_id, c.id]));

  console.log(`Loaded ${apiPlayerMap.size} player IDs (dual), ${apiClubMap.size} clubs\n`);

  let totalApiCalls = 0;
  let totalStatsImported = 0;
  let totalFormationsStored = 0;

  for (let gw = startGw; gw <= endGw; gw++) {
    // 3. Load fixtures
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

    // 4. Fetch GW results for scores
    const leagueId = process.env.NEXT_PUBLIC_LEAGUE_ID || '204';
    const season = process.env.NEXT_PUBLIC_SEASON || '2025';
    const apiFixData = await apiFetch(
      `/fixtures?league=${leagueId}&season=${season}&round=Regular Season - ${gw}`
    );
    totalApiCalls++;

    const fixtureResults = [];
    const playerStats = [];
    let gwFormations = 0;

    for (const fixture of fixtures) {
      try {
        // Fetch player stats
        const apiStats = await apiFetch(`/fixtures/players?fixture=${fixture.api_fixture_id}`);
        totalApiCalls++;

        // Fetch lineups for formation
        const lineupsData = await apiFetch(`/fixtures/lineups?fixture=${fixture.api_fixture_id}`);
        totalApiCalls++;

        // Store formations
        const homeLineup = lineupsData.response.find(t => {
          const clubId = apiClubMap.get(t.team.id);
          return clubId === fixture.home_club_id;
        });
        const awayLineup = lineupsData.response.find(t => {
          const clubId = apiClubMap.get(t.team.id);
          return clubId === fixture.away_club_id;
        });

        const formationUpdates = {};
        if (homeLineup?.formation) formationUpdates.home_formation = homeLineup.formation;
        if (awayLineup?.formation) formationUpdates.away_formation = awayLineup.formation;

        if (Object.keys(formationUpdates).length > 0) {
          await supabase
            .from('fixtures')
            .update(formationUpdates)
            .eq('id', fixture.id);
          gwFormations++;
          totalFormationsStored++;
        }

        // Get match result
        const apiMatch = apiFixData.response.find(f => f.fixture.id === fixture.api_fixture_id);
        if (apiMatch && apiMatch.goals.home != null && apiMatch.goals.away != null) {
          fixtureResults.push({
            fixture_id: fixture.id,
            home_score: apiMatch.goals.home,
            away_score: apiMatch.goals.away,
          });
        }

        // Process player stats
        for (const teamData of apiStats.response) {
          const clubId = apiClubMap.get(teamData.team.id);
          if (!clubId) continue;

          const isHome = fixture.home_club_id === clubId;
          const goalsAgainst = apiMatch
            ? (isHome ? apiMatch.goals.away : apiMatch.goals.home) ?? 0
            : 0;
          const isCleanSheet = goalsAgainst === 0;

          for (const pd of teamData.players) {
            const ourPlayer = apiPlayerMap.get(pd.player.id);
            if (!ourPlayer) continue;

            const stat = pd.statistics?.[0];
            if (!stat) continue;

            const matchPosition = stat.games.position ? mapPosition(stat.games.position) : null;
            const minutes = stat.games.minutes ?? 0;
            if (minutes === 0) continue;

            const goals = stat.goals.total ?? 0;
            const assists = stat.goals.assists ?? 0;
            const goalsConceded = stat.goals.conceded ?? 0;
            const yellowCard = (stat.cards.yellow ?? 0) > 0;
            const redCard = (stat.cards.red ?? 0) > 0;
            const saves = stat.goals.saves ?? 0;

            const rating = stat.games.rating ? parseFloat(stat.games.rating) : null;
            const fantasyPoints = rating
              ? Math.round(rating * 10)
              : calcFantasyPoints(
                  ourPlayer.position, minutes, goals, assists,
                  isCleanSheet && minutes >= 60, goalsConceded,
                  yellowCard, redCard, saves, 0
                );

            playerStats.push({
              fixture_id: fixture.id,
              player_id: ourPlayer.id,
              club_id: clubId,
              minutes_played: minutes,
              goals,
              assists,
              clean_sheet: isCleanSheet && minutes >= 60,
              goals_conceded: goalsConceded,
              yellow_card: yellowCard,
              red_card: redCard,
              saves,
              bonus: 0,
              fantasy_points: fantasyPoints,
              rating,
              match_position: matchPosition,
            });
          }
        }

        // Rate limit: pause every 10 API calls (API-Football: 10/min on Plus)
        if (totalApiCalls % 10 === 0) {
          console.log(`  ... ${totalApiCalls} API calls, pausing 65s ...`);
          await new Promise(r => setTimeout(r, 65_000));
        }
      } catch (e) {
        console.error(`  Fixture API#${fixture.api_fixture_id}: ${e.message}`);
      }
    }

    // 5. Import via RPC (idempotent: cron_process_gameweek does DELETE + INSERT)
    if (fixtureResults.length > 0 || playerStats.length > 0) {
      const { data, error } = await supabase.rpc('cron_process_gameweek', {
        p_gameweek: gw,
        p_fixture_results: fixtureResults,
        p_player_stats: playerStats,
      });

      if (error) {
        console.error(`GW ${gw} RPC error: ${error.message}`);
      } else {
        const result = data;
        totalStatsImported += result?.stats_imported ?? 0;
        console.log(`GW ${gw}: ${fixtures.length} fixtures, ${result?.stats_imported ?? 0} stats, ${gwFormations} formations (${totalApiCalls} API calls total)`);
      }
    }

    // 6. Re-sync GW scores
    const { error: syncErr } = await supabase.rpc('admin_resync_gw_scores', { p_gameweek: gw });
    if (syncErr) console.error(`GW ${gw} score sync error: ${syncErr.message}`);
  }

  // 7. Recalc perf
  console.log('\nRecalculating performance metrics...');
  const { error: perfErr } = await supabase.rpc('cron_recalc_perf');
  if (perfErr) console.error(`Perf recalc error: ${perfErr.message}`);

  console.log('\n=== Summary ===');
  console.log(`API calls: ${totalApiCalls}`);
  console.log(`Stats imported: ${totalStatsImported}`);
  console.log(`Formations stored: ${totalFormationsStored}`);
}

main().catch(console.error);
