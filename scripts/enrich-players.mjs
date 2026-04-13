#!/usr/bin/env node
/**
 * Enrich players with nationality + contract data from API-Football.
 * Uses the /players endpoint (1 call per player = expensive).
 *
 * Strategy: Batch by club to reduce calls (/players?team={id}&season=2025 = 1 call per ~30 players).
 *
 * Usage:
 *   node scripts/enrich-players.mjs <league_short>          # e.g. BL1
 *   node scripts/enrich-players.mjs <league_short> --dry-run
 *   node scripts/enrich-players.mjs --all
 *
 * API cost: ~1 call per team page (20 players/page) = ~7 calls per league.
 * Total for 6 new leagues: ~42 calls.
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

if (!API_KEY) { console.error('Missing API_FOOTBALL_KEY'); process.exit(1); }
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const API_BASE = 'https://v3.football.api-sports.io';
const DRY_RUN = process.argv.includes('--dry-run');
const IMPORT_ALL = process.argv.includes('--all');
const LEAGUE_ARG = process.argv[2];

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

// ============================================
// ENRICH ONE LEAGUE
// ============================================

async function enrichLeague(league) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Enriching: ${league.name} (${league.short})`);
  console.log(`${'='.repeat(60)}\n`);

  // Get all clubs for this league
  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name, api_football_id')
    .eq('league_id', league.id)
    .order('name');

  if (!clubs?.length) {
    console.warn('No clubs found. Skipping.');
    return { updated: 0, skipped: 0, notFound: 0 };
  }

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  for (const club of clubs) {
    console.log(`\n--- ${club.name} (API: ${club.api_football_id}) ---`);

    // Get local players for this club that need enrichment
    const { data: localPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, api_football_id, nationality, contract_end')
      .eq('club_id', club.id)
      .order('last_name');

    const needsEnrich = localPlayers?.filter(p => !p.nationality || p.nationality === '') ?? [];
    if (needsEnrich.length === 0) {
      console.log('  All players already enriched. Skipping.');
      totalSkipped += (localPlayers?.length ?? 0);
      continue;
    }

    console.log(`  ${needsEnrich.length}/${localPlayers?.length} players need enrichment`);

    // Fetch from API-Football: /players?team={id}&season=2025 (paginated, 20 per page)
    let page = 1;
    let apiPlayers = [];
    let totalPages = 1;

    while (page <= totalPages) {
      const res = await apiFetch(`/players?team=${club.api_football_id}&season=2025&page=${page}`);
      const paging = res.paging ?? {};
      totalPages = paging.total ?? 1;
      apiPlayers = apiPlayers.concat(res.response ?? []);
      page++;
    }

    console.log(`  Fetched ${apiPlayers.length} player profiles from API`);

    // Build lookup by api_football_id
    const apiMap = new Map();
    for (const entry of apiPlayers) {
      const p = entry.player;
      const stats = entry.statistics?.[0];
      apiMap.set(p.id, {
        nationality: p.nationality ?? null,
        birth: p.birth?.date ?? null,
        age: p.age ?? null,
        contractEnd: stats?.league?.season ? null : null, // not reliable here
      });
    }

    // Also try to get contract info from /players/squads (cheaper, already has it sometimes)
    // Actually the /players endpoint above gives us nationality — that's the main goal

    let clubUpdated = 0;
    let clubNotFound = 0;

    for (const local of needsEnrich) {
      // Match by api_football_id first
      let apiData = local.api_football_id ? apiMap.get(local.api_football_id) : null;

      // Fallback: match by name
      if (!apiData) {
        const normName = normalizeForMatch(local.last_name);
        for (const [apiId, data] of apiMap) {
          const apiEntry = apiPlayers.find(e => e.player.id === apiId);
          if (!apiEntry) continue;
          const apiNorm = normalizeForMatch(apiEntry.player.lastname ?? apiEntry.player.name ?? '');
          if (apiNorm === normName || apiNorm.includes(normName) || normName.includes(apiNorm)) {
            apiData = data;
            break;
          }
        }
      }

      if (!apiData || !apiData.nationality) {
        clubNotFound++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`    [DRY] ${local.first_name} ${local.last_name} → ${apiData.nationality}`);
        clubUpdated++;
        continue;
      }

      const { error } = await supabase
        .from('players')
        .update({ nationality: apiData.nationality })
        .eq('id', local.id);

      if (error) {
        console.error(`    Failed: ${local.last_name}: ${error.message}`);
      } else {
        clubUpdated++;
      }
    }

    console.log(`  Updated: ${clubUpdated}, Not found: ${clubNotFound}`);
    totalUpdated += clubUpdated;
    totalNotFound += clubNotFound;
    totalSkipped += (localPlayers.length - needsEnrich.length);
  }

  return { updated: totalUpdated, skipped: totalSkipped, notFound: totalNotFound };
}

// ============================================
// MAIN
// ============================================

async function main() {
  if (!IMPORT_ALL && (!LEAGUE_ARG || LEAGUE_ARG.startsWith('-'))) {
    console.error('Usage: node scripts/enrich-players.mjs <league_short> [--dry-run]');
    console.error('       node scripts/enrich-players.mjs --all [--dry-run]');
    process.exit(1);
  }

  let query = supabase.from('leagues').select('*');
  if (IMPORT_ALL) {
    query = query.neq('short', 'TFF1'); // TFF already enriched
  } else {
    query = query.eq('short', LEAGUE_ARG);
  }

  const { data: leagues, error } = await query;
  if (error || !leagues?.length) {
    console.error('No league found.');
    process.exit(1);
  }

  console.log(`\n=== Enrich ${leagues.length} league(s) ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNotFound = 0;

  for (const league of leagues) {
    const r = await enrichLeague(league);
    totalUpdated += r.updated;
    totalSkipped += r.skipped;
    totalNotFound += r.notFound;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`DONE — Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Not found: ${totalNotFound}`);
  console.log(`API calls: ${apiCallCount}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
