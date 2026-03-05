/**
 * Reconciliation Script: Match API-Football fixture player IDs to our DB players.
 *
 * Problem: API-Football uses DIFFERENT player IDs between /players/squads (initial mapping)
 * and /fixtures/players (match stats). This script finds those alternate IDs via name-matching
 * and stores them in the player_external_ids table (source: 'api_football_fixture').
 *
 * Usage: node scripts/reconcile-player-ids.mjs [startGw] [endGw]
 *   Default: GW 1-28 (all played gameweeks)
 *
 * ~162 API calls for fixtures with < 14 players per team.
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

/**
 * Normalize text for player name matching — handles Turkish characters
 * İ→i, ı→i, ş→s, ç→c, ğ→g, ö→o, ü→u, ä→a + strip remaining diacritics
 */
function normalizeForMatch(text) {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')  // Turkish dotless ı (not decomposed by NFD)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Strip all combining diacritics
    .trim();
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
  const endGw = parseInt(process.argv[3] || '28', 10);

  console.log(`\n=== Reconcile Player IDs: GW ${startGw}-${endGw} ===\n`);

  // 1. Load all DB players with clubs + existing external IDs
  const [{ data: allPlayers }, { data: extIds }] = await Promise.all([
    supabase.from('players').select('id, first_name, last_name, club_id, shirt_number, position'),
    supabase.from('player_external_ids').select('player_id, source, external_id').in('source', ['api_football_squad', 'api_football_fixture']),
  ]);

  if (!allPlayers || allPlayers.length === 0) {
    console.error('No players in DB');
    process.exit(1);
  }

  // Track which players already have fixture IDs
  const playersWithFixtureId = new Set();
  for (const ext of (extIds ?? [])) {
    if (ext.source === 'api_football_fixture') playersWithFixtureId.add(ext.player_id);
  }

  // Build club → players lookup (add hasFixtureId flag)
  const clubPlayers = new Map();
  for (const p of allPlayers) {
    const arr = clubPlayers.get(p.club_id) || [];
    arr.push({ ...p, hasFixtureId: playersWithFixtureId.has(p.id) });
    clubPlayers.set(p.club_id, arr);
  }

  // Build existing API ID set (to avoid double-mapping)
  const existingApiIds = new Set();
  for (const ext of (extIds ?? [])) {
    const numId = parseInt(ext.external_id, 10);
    if (!isNaN(numId)) existingApiIds.add(numId);
  }

  // 2. Load club mapping (via club_external_ids)
  const [{ data: clubExtIds }, { data: clubRows }] = await Promise.all([
    supabase.from('club_external_ids').select('club_id, external_id').eq('source', 'api_football'),
    supabase.from('clubs').select('id, name'),
  ]);

  const clubNameMap = new Map((clubRows ?? []).map(c => [c.id, c.name]));
  const clubMap = new Map();
  const clubIdToApiId = new Map();
  for (const ext of (clubExtIds ?? [])) {
    const numId = parseInt(ext.external_id, 10);
    if (isNaN(numId)) continue;
    clubMap.set(numId, { id: ext.club_id, name: clubNameMap.get(ext.club_id) ?? '' });
    clubIdToApiId.set(ext.club_id, numId);
  }

  // 3. Find fixtures with incomplete player data
  const { data: fixtureStats } = await supabase
    .from('fixture_player_stats')
    .select('fixture_id, club_id');

  // Count players per fixture+club
  const fixtureClubCounts = new Map();
  for (const s of (fixtureStats ?? [])) {
    const key = `${s.fixture_id}::${s.club_id}`;
    fixtureClubCounts.set(key, (fixtureClubCounts.get(key) || 0) + 1);
  }

  // 4. Load fixtures in range
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id, api_fixture_id, home_club_id, away_club_id, gameweek')
    .gte('gameweek', startGw)
    .lte('gameweek', endGw)
    .eq('status', 'finished')
    .not('api_fixture_id', 'is', null);

  if (!fixtures || fixtures.length === 0) {
    console.log('No finished fixtures in range');
    process.exit(0);
  }

  // Filter to fixtures with < 14 players for either team
  const incompleteFixtures = fixtures.filter(f => {
    const homeCount = fixtureClubCounts.get(`${f.id}::${f.home_club_id}`) || 0;
    const awayCount = fixtureClubCounts.get(`${f.id}::${f.away_club_id}`) || 0;
    return homeCount < 14 || awayCount < 14;
  });

  console.log(`Total fixtures: ${fixtures.length}, incomplete (< 14 players): ${incompleteFixtures.length}`);

  let totalApiCalls = 0;
  let totalReconciled = 0;
  const ambiguous = [];
  const trulyUnmapped = [];

  for (const fix of incompleteFixtures) {
    try {
      const apiStats = await apiFetch(`/fixtures/players?fixture=${fix.api_fixture_id}`);
      totalApiCalls++;

      for (const teamData of apiStats.response) {
        const club = clubMap.get(teamData.team.id);
        if (!club) continue;

        const ourPlayers = clubPlayers.get(club.id) || [];

        for (const pd of teamData.players) {
          const apiPlayerId = pd.player.id;

          // Skip if already known
          if (existingApiIds.has(apiPlayerId)) continue;

          const stat = pd.statistics?.[0];
          const minutes = stat?.games?.minutes ?? 0;
          if (minutes === 0) continue;

          // Try name matching against our DB players for this club
          const apiName = normalizeForMatch(pd.player.name);
          const apiParts = apiName.split(/\s+/).filter(p => p.length > 0);

          const candidates = [];
          for (const p of ourPlayers) {
            // Skip if this player already has a fixture external ID
            if (p.hasFixtureId) continue;

            const lastName = normalizeForMatch(p.last_name);
            const firstName = normalizeForMatch(p.first_name);
            let score = 0;

            const lastNameExact = apiParts.some(part => lastName === part && lastName.length >= 3);
            const firstNameExact = apiParts.some(part => firstName === part && firstName.length >= 3);

            // Full name match
            if (lastNameExact && firstNameExact) {
              score = 90;
            }
            // Last name exact (5+ chars to avoid false positives)
            else if (apiParts.some(part => part.length >= 5 && lastName === part && lastName.length >= 5)) {
              score = 60;
            }
            // Partial last name (both 4+ chars)
            else if (apiParts.some(part =>
              part.length >= 4 && lastName.length >= 4 &&
              (lastName.startsWith(part) || part.startsWith(lastName))
            )) {
              score = 40;
            }

            if (score > 0) {
              candidates.push({ player: p, score });
            }
          }

          if (candidates.length === 0) {
            trulyUnmapped.push(`${pd.player.name} (API#${apiPlayerId}, ${teamData.team.name ?? 'Unknown'}, GW${fix.gameweek})`);
            continue;
          }

          candidates.sort((a, b) => b.score - a.score);

          // Ambiguous: two top candidates with same score
          if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
            const names = candidates
              .filter(c => c.score === candidates[0].score)
              .map(c => `${c.player.first_name} ${c.player.last_name}`)
              .join(', ');
            ambiguous.push(`${pd.player.name} (API#${apiPlayerId}) → [${names}]`);
            continue;
          }

          const best = candidates[0];

          // Write fixture external ID to player_external_ids
          const { error } = await supabase
            .from('player_external_ids')
            .upsert({
              player_id: best.player.id,
              source: 'api_football_fixture',
              external_id: String(apiPlayerId),
            }, { onConflict: 'player_id,source' });

          if (!error) {
            totalReconciled++;
            existingApiIds.add(apiPlayerId);
            best.player.hasFixtureId = true; // Prevent re-matching
            console.log(`  ✓ ${pd.player.name} (API#${apiPlayerId}) → ${best.player.first_name} ${best.player.last_name} (score: ${best.score})`);
          } else {
            console.error(`  ✗ Update failed for ${best.player.first_name} ${best.player.last_name}: ${error.message}`);
          }
        }
      }

      // Rate limit: 10 calls/minute for API-Football
      if (totalApiCalls % 10 === 0) {
        console.log(`  ... ${totalApiCalls} API calls, pausing 60s ...`);
        await new Promise(r => setTimeout(r, 60_000));
      }
    } catch (e) {
      console.error(`Fixture API#${fix.api_fixture_id} (GW${fix.gameweek}): ${e.message}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`API calls: ${totalApiCalls}`);
  console.log(`Reconciled: ${totalReconciled}`);
  console.log(`Ambiguous: ${ambiguous.length}`);
  console.log(`Truly unmapped: ${trulyUnmapped.length}`);

  if (ambiguous.length > 0) {
    console.log('\n--- Ambiguous (manual review needed) ---');
    for (const a of ambiguous) console.log(`  ? ${a}`);
  }

  if (trulyUnmapped.length > 0) {
    // Deduplicate
    const unique = [...new Set(trulyUnmapped)].sort();
    console.log(`\n--- Truly Unmapped (${unique.length} unique) ---`);
    for (const u of unique) console.log(`  ✗ ${u}`);
  }
}

main().catch(console.error);
