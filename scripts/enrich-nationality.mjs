#!/usr/bin/env node
/**
 * PLAYER NATIONALITY ENRICHMENT
 *
 * Fetches nationality from API-Football /players endpoint for all players
 * missing nationality data. Updates DB directly.
 *
 * Usage:
 *   node scripts/enrich-nationality.mjs                    # All leagues
 *   node scripts/enrich-nationality.mjs --league=BL2       # Single league
 *   node scripts/enrich-nationality.mjs --dry-run          # Report only
 *
 * API cost: ~2 calls per club (paginated, 20 players/page) = ~270 total
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

if (!API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars'); process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const API_BASE = 'https://v3.football.api-sports.io';
const SEASON = 2025;
const DRY_RUN = process.argv.includes('--dry-run');
const LEAGUE_FILTER = process.argv.find(a => a.startsWith('--league='))?.split('=')[1] ?? null;

let apiCallCount = 0;

async function apiFetch(endpoint) {
  apiCallCount++;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return await res.json();
}

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  NATIONALITY ENRICHMENT ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(60)}\n`);

  // Load leagues
  let leagueQuery = supabase.from('leagues').select('*').order('country').order('name');
  if (LEAGUE_FILTER) leagueQuery = leagueQuery.eq('short', LEAGUE_FILTER);
  const { data: leagues } = await leagueQuery;
  if (!leagues?.length) { console.error('No leagues found'); process.exit(1); }

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const league of leagues) {
    console.log(`\n--- ${league.name} (${league.country}) ---`);

    // Load clubs for this league
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id, name, api_football_id')
      .eq('league_id', league.id)
      .order('name');

    for (const club of clubs ?? []) {
      if (!club.api_football_id) continue;

      // Load DB players missing nationality
      const { data: dbPlayers } = await supabase
        .from('players')
        .select('id, api_football_id, first_name, last_name, nationality, age')
        .eq('club_id', club.id);

      const needsNationality = (dbPlayers ?? []).filter(p => !p.nationality || p.nationality === '');
      const needsAge = (dbPlayers ?? []).filter(p => !p.age || p.age === 0);

      if (needsNationality.length === 0 && needsAge.length === 0) {
        continue; // All data complete for this club
      }

      // Fetch all pages of /players endpoint
      let page = 1;
      let allApiPlayers = [];
      let totalPages = 1;

      while (page <= totalPages) {
        const res = await apiFetch(`/players?team=${club.api_football_id}&league=${league.api_football_id}&season=${SEASON}&page=${page}`);
        const players = res.response ?? [];
        allApiPlayers.push(...players);
        totalPages = res.paging?.total ?? 1;
        page++;
      }

      // Build api_id → nationality map
      const apiDataMap = new Map();
      for (const entry of allApiPlayers) {
        apiDataMap.set(entry.player.id, {
          nationality: entry.player.nationality ?? '',
          age: entry.player.age ?? 0,
          birth_date: entry.player.birth?.date ?? null,
          height: entry.player.height ?? null,
          weight: entry.player.weight ?? null,
        });
      }

      let clubUpdated = 0;

      for (const dbPlayer of dbPlayers ?? []) {
        if (!dbPlayer.api_football_id) continue;
        const apiData = apiDataMap.get(dbPlayer.api_football_id);
        if (!apiData) continue;

        const update = {};

        // Nationality
        if ((!dbPlayer.nationality || dbPlayer.nationality === '') && apiData.nationality) {
          update.nationality = apiData.nationality;
        }

        // Age
        if ((!dbPlayer.age || dbPlayer.age === 0) && apiData.age) {
          update.age = apiData.age;
        }

        if (Object.keys(update).length === 0) {
          totalSkipped++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`    [DRY] ${dbPlayer.first_name} ${dbPlayer.last_name}: ${JSON.stringify(update)}`);
          clubUpdated++;
        } else {
          const { error } = await supabase.from('players').update(update).eq('id', dbPlayer.id);
          if (!error) clubUpdated++;
        }
      }

      if (clubUpdated > 0) {
        console.log(`  ${club.name}: ${clubUpdated} players enriched (${allApiPlayers.length} from API)`);
        totalUpdated += clubUpdated;
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  DONE — ${totalUpdated} updated, ${totalSkipped} skipped`);
  console.log(`  API calls: ${apiCallCount}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
