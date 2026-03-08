/**
 * Diagnose: Why do some teams have < 11 players in fixture stats?
 * Checks API-Football vs our DB for a specific fixture.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const API_BASE = 'https://v3.football.api-sports.io';
const apiKey = process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function main() {
  // Fixture 1398319 = ERK vs ADM, GW1 — ADM only has 6 players
  const apiFixtureId = parseInt(process.argv[2] || '1398319', 10);

  console.log(`\n=== Diagnosing API fixture ${apiFixtureId} ===\n`);

  // 1. Get our fixture
  const { data: fix } = await supabase
    .from('fixtures')
    .select('id, home_club_id, away_club_id, gameweek')
    .eq('api_fixture_id', apiFixtureId)
    .single();

  if (!fix) { console.log('Fixture not found in DB'); return; }

  // 2. Get player map (via player_external_ids)
  const [{ data: extIds }, { data: allPlayers }] = await Promise.all([
    supabase.from('player_external_ids').select('player_id, external_id').in('source', ['api_football_squad', 'api_football_fixture']),
    supabase.from('players').select('id, first_name, last_name, club_id'),
  ]);

  const playerInfoMap = new Map((allPlayers ?? []).map(p => [p.id, p]));
  const playerMap = new Map();
  for (const ext of (extIds ?? [])) {
    const numId = parseInt(ext.external_id, 10);
    if (isNaN(numId)) continue;
    const info = playerInfoMap.get(ext.player_id);
    if (info) playerMap.set(numId, { ...info, api_football_id: numId });
  }

  // 3. Get club map (via club_external_ids)
  const [{ data: clubExtIds }, { data: clubRows }] = await Promise.all([
    supabase.from('club_external_ids').select('club_id, external_id').eq('source', 'api_football'),
    supabase.from('clubs').select('id, short'),
  ]);

  const clubShortMap = new Map((clubRows ?? []).map(c => [c.id, c.short]));
  const clubByApiId = new Map();
  const clubById = new Map();
  for (const ext of (clubExtIds ?? [])) {
    const numId = parseInt(ext.external_id, 10);
    if (isNaN(numId)) continue;
    const club = { id: ext.club_id, short: clubShortMap.get(ext.club_id) ?? '', api_football_id: numId };
    clubByApiId.set(numId, club);
    clubById.set(ext.club_id, club);
  }

  // 4. Get existing stats
  const { data: existingStats } = await supabase
    .from('fixture_player_stats')
    .select('player_id, club_id, minutes_played')
    .eq('fixture_id', fix.id);

  const existingPlayerIds = new Set(existingStats.map(s => s.player_id));

  // 5. Call API
  const apiStats = await apiFetch(`/fixtures/players?fixture=${apiFixtureId}`);

  // 6. Also get lineups (formation data)
  const apiLineups = await apiFetch(`/fixtures/lineups?fixture=${apiFixtureId}`);

  console.log('--- API Lineups (Formations) ---');
  for (const lineup of apiLineups.response) {
    const club = clubByApiId.get(lineup.team.id);
    console.log(`${club?.short || lineup.team.name}: Formation ${lineup.formation}`);
    console.log(`  Starting XI: ${lineup.startXI.map(p => p.player.name).join(', ')}`);
    console.log(`  Subs: ${lineup.substitutes.map(p => p.player.name).join(', ')}`);
  }

  console.log('\n--- Player Stats Comparison ---');
  for (const teamData of apiStats.response) {
    const club = clubByApiId.get(teamData.team.id);
    const clubName = club?.short || `API#${teamData.team.id}`;

    let apiTotal = 0;
    let mapped = 0;
    let unmapped = [];
    let zeroMinutes = 0;

    for (const pd of teamData.players) {
      const stat = pd.statistics[0];
      const minutes = stat?.games?.minutes ?? 0;
      apiTotal++;

      const ourPlayer = playerMap.get(pd.player.id);
      if (!ourPlayer) {
        if (minutes > 0) {
          unmapped.push(`${pd.player.name} (API#${pd.player.id}, ${minutes}min)`);
        }
      } else {
        if (minutes > 0) mapped++;
        else zeroMinutes++;
      }
    }

    const inDb = existingStats.filter(s => s.club_id === club?.id).length;

    console.log(`\n${clubName}:`);
    console.log(`  API returned: ${apiTotal} players`);
    console.log(`  With minutes > 0 & mapped: ${mapped}`);
    console.log(`  With minutes > 0 & NOT mapped: ${unmapped.length}`);
    console.log(`  With 0 minutes (skipped): ${zeroMinutes}`);
    console.log(`  In our DB stats: ${inDb}`);

    if (unmapped.length > 0) {
      console.log(`  MISSING players:`);
      unmapped.forEach(p => console.log(`    - ${p}`));
    }
  }
}

main().catch(console.error);
