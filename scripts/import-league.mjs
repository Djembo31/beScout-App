#!/usr/bin/env node
/**
 * Import a new league: Fetch clubs + players from API-Football,
 * insert into DB, create external_id mappings.
 *
 * Usage:
 *   node scripts/import-league.mjs <league_short>          # e.g. BL1, PL, SA, LL, SL, BL2
 *   node scripts/import-league.mjs <league_short> --dry-run
 *   node scripts/import-league.mjs --all                   # import all inactive leagues
 *
 * Reads .env.local for API_FOOTBALL_KEY and SUPABASE_SERVICE_ROLE_KEY.
 * API cost: ~21 calls per league (1 teams + ~20 squads).
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// ============================================
// ENV
// ============================================

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
const DRY_RUN = process.argv.includes('--dry-run');
const IMPORT_ALL = process.argv.includes('--all');
const LEAGUE_ARG = process.argv[2];
const SEASON = 2025;

// ============================================
// API HELPERS
// ============================================

let apiCallCount = 0;

async function apiFetch(endpoint) {
  apiCallCount++;
  console.log(`  [API ${apiCallCount}] ${endpoint}`);
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return await res.json();
}

function normalizeForMatch(text) {
  return text.toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ä/g, 'ae').replace(/ß/g, 'ss').replace(/é/g, 'e').replace(/è/g, 'e').replace(/ñ/g, 'n')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapPosition(apiPos) {
  switch (apiPos) {
    case 'Goalkeeper': return 'GK';
    case 'Defender': return 'DEF';
    case 'Midfielder': return 'MID';
    case 'Attacker': return 'ATT';
    default: return 'MID';
  }
}

// ============================================
// IMPORT ONE LEAGUE
// ============================================

async function importLeague(league) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Importing: ${league.name} (${league.short}) — API-Football ID: ${league.api_football_id}`);
  console.log(`${'='.repeat(60)}\n`);

  // 1. Fetch teams from API-Football
  const teamsRes = await apiFetch(`/teams?league=${league.api_football_id}&season=${SEASON}`);
  const apiTeams = teamsRes.response ?? [];
  console.log(`Found ${apiTeams.length} teams from API-Football\n`);

  if (apiTeams.length === 0) {
    console.warn(`No teams found for ${league.name} (season ${SEASON}). Skipping.`);
    return { clubs: 0, players: 0 };
  }

  let clubsInserted = 0;
  let playersInserted = 0;

  for (const teamEntry of apiTeams) {
    const team = teamEntry.team;
    const venue = teamEntry.venue;
    const slug = slugify(team.name);

    console.log(`\n--- ${team.name} (ID: ${team.id}) ---`);

    // 2. Check if club already exists
    const { data: existingClub } = await supabase
      .from('clubs')
      .select('id')
      .eq('api_football_id', team.id)
      .maybeSingle();

    let clubId;

    if (existingClub) {
      clubId = existingClub.id;
      console.log(`  Club already exists: ${clubId}`);
    } else if (DRY_RUN) {
      console.log(`  [DRY RUN] Would insert club: ${team.name}`);
      continue;
    } else {
      // Insert new club
      const { data: newClub, error: clubErr } = await supabase
        .from('clubs')
        .insert({
          name: team.name,
          slug,
          short: team.code || slug.slice(0, 3).toUpperCase(),
          league: league.name,
          league_id: league.id,
          country: league.country,
          city: venue?.city ?? null,
          stadium: venue?.name ?? null,
          logo_url: team.logo ?? null,
          primary_color: '#666666',
          secondary_color: '#FFFFFF',
          api_football_id: team.id,
          is_verified: false,
          active_gameweek: 1,
        })
        .select('id')
        .single();

      if (clubErr) {
        console.error(`  Failed to insert club ${team.name}:`, clubErr.message);
        continue;
      }
      clubId = newClub.id;
      clubsInserted++;
      console.log(`  Inserted club: ${clubId}`);

      // Insert club_external_ids mapping
      await supabase.from('club_external_ids').upsert({
        club_id: clubId,
        source: 'api_football',
        external_id: String(team.id),
      }, { onConflict: 'club_id,source' });
    }

    // 3. Fetch squad for this team
    const squadRes = await apiFetch(`/players/squads?team=${team.id}`);
    const squads = squadRes.response ?? [];
    const players = squads[0]?.players ?? [];
    console.log(`  Found ${players.length} players in squad`);

    for (const p of players) {
      // Check if player already exists by api_football_id
      const { data: existingMapping } = await supabase
        .from('player_external_ids')
        .select('player_id')
        .eq('source', 'api_football_squad')
        .eq('external_id', String(p.id))
        .maybeSingle();

      if (existingMapping) {
        continue; // Already mapped
      }

      // Check if player exists by name match in this club
      const nameParts = (p.name ?? '').split(' ');
      const lastName = nameParts[nameParts.length - 1] ?? p.name;
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

      if (DRY_RUN) {
        console.log(`    [DRY RUN] Would insert: ${p.name} (${mapPosition(p.position)}, #${p.number})`);
        playersInserted++;
        continue;
      }

      // Insert player (column names from actual schema: nationality, club = club name)
      // Defaults: dpc_total=10000, max_supply=300 → CHECK violation. Set explicitly.
      const clubName = team.name;
      const { data: newPlayer, error: playerErr } = await supabase
        .from('players')
        .insert({
          first_name: firstName || lastName,
          last_name: lastName,
          club: clubName,
          club_id: clubId,
          position: mapPosition(p.position),
          shirt_number: p.number,
          age: p.age ?? 0,
          image_url: p.photo ?? null,
          status: 'fit',
          api_football_id: p.id,
          nationality: '',
          ipo_price: 10000,       // 100 $SCOUT (cents)
          floor_price: 10000,     // 100 $SCOUT (cents)
          dpc_total: 0,           // No DPCs minted yet
          dpc_available: 0,       // No DPCs available yet
          max_supply: 10000,      // Max 10K DPCs per player
        })
        .select('id')
        .single();

      if (playerErr) {
        // Might be duplicate — skip
        if (playerErr.code === '23505') continue;
        console.error(`    Failed to insert ${p.name}:`, playerErr.message);
        continue;
      }

      playersInserted++;

      // Insert player_external_ids mapping
      await supabase.from('player_external_ids').upsert({
        player_id: newPlayer.id,
        source: 'api_football_squad',
        external_id: String(p.id),
      }, { onConflict: 'player_id,source' });
    }

    console.log(`  Players inserted for ${team.name}: done`);
  }

  return { clubs: clubsInserted, players: playersInserted };
}

// ============================================
// MAIN
// ============================================

async function main() {
  if (!IMPORT_ALL && (!LEAGUE_ARG || LEAGUE_ARG.startsWith('-'))) {
    console.error('Usage: node scripts/import-league.mjs <league_short> [--dry-run]');
    console.error('       node scripts/import-league.mjs --all [--dry-run]');
    console.error('Available: BL1, BL2, PL, SA, LL, SL');
    process.exit(1);
  }

  // Fetch leagues from DB
  let query = supabase.from('leagues').select('*');
  if (IMPORT_ALL) {
    query = query.eq('is_active', false);
  } else {
    query = query.eq('short', LEAGUE_ARG);
  }

  const { data: leagues, error } = await query;
  if (error) { console.error('Failed to fetch leagues:', error.message); process.exit(1); }
  if (!leagues?.length) {
    console.error(`No league found for: ${IMPORT_ALL ? 'inactive leagues' : LEAGUE_ARG}`);
    process.exit(1);
  }

  console.log(`\n=== Import ${leagues.length} league(s) ${DRY_RUN ? '(DRY RUN)' : ''} ===`);
  console.log(`Season: ${SEASON}`);
  console.log(`API-Football Pro Plan (7,500 calls/day)\n`);

  let totalClubs = 0;
  let totalPlayers = 0;

  for (const league of leagues) {
    const result = await importLeague(league);
    totalClubs += result.clubs;
    totalPlayers += result.players;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`DONE — ${totalClubs} clubs, ${totalPlayers} players inserted`);
  console.log(`API calls used: ${apiCallCount}`);
  console.log(`${'='.repeat(60)}\n`);

  // Activate leagues after successful import
  if (!DRY_RUN && totalClubs > 0) {
    const leagueIds = leagues.map(l => l.id);
    console.log('Activating imported leagues...');
    const { error: activateErr } = await supabase
      .from('leagues')
      .update({ is_active: true })
      .in('id', leagueIds);
    if (activateErr) {
      console.error('Failed to activate leagues:', activateErr.message);
    } else {
      console.log(`Activated ${leagueIds.length} league(s)`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
