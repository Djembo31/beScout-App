#!/usr/bin/env node
/**
 * Import fixtures for 6 Major Leagues (BL1, BL2, LL, PL, SA, SL).
 * TFF1 is skipped — already has 380 fixtures.
 *
 * Usage:
 *   node scripts/import-fixtures.mjs --dry-run
 *   node scripts/import-fixtures.mjs             # live run
 *   node scripts/import-fixtures.mjs --league=BL1 [--dry-run]
 *
 * Reads .env.local for API_FOOTBALL_KEY and SUPABASE_SERVICE_ROLE_KEY.
 * API cost: 1 call per league = 6 calls total for --all. Rate-limited 150ms/call.
 *
 * Target schema (verified against live DB 2026-04-15):
 *   fixtures(id, gameweek, home_club_id, away_club_id, home_score, away_score,
 *            status, played_at, league_id, api_fixture_id UNIQUE)
 *
 * Rollback:
 *   DELETE FROM fixtures WHERE league_id IN (<6 UUIDs>);
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
const leagueArg = process.argv.find(a => a.startsWith('--league='))?.split('=')[1];
const SEASON = 2025;

// Target leagues (TFF1 excluded — already has 380 fixtures)
const TARGET_LEAGUE_SHORTS = ['BL1', 'BL2', 'LL', 'PL', 'SA', 'SL'];

// ============================================
// HELPERS
// ============================================

let apiCallCount = 0;
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function apiFetch(endpoint) {
  apiCallCount++;
  console.log(`  [API ${apiCallCount}] ${endpoint}`);
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return await res.json();
}

/**
 * Parse gameweek from API-Football round string.
 * Happy path: "Regular Season - 15" -> 15
 * Edge: "Playoffs - Final", "Group Stage - 3", etc. -> null (skip)
 */
function parseGameweek(round) {
  if (!round) return null;
  const m = /^Regular Season\s*-\s*(\d+)$/i.exec(round.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1 || n > 50) return null;
  return n;
}

/**
 * Map API-Football status.short to DB status values.
 * DB-use: 'scheduled' or 'finished' (confirmed via live introspection).
 */
function mapStatus(apiStatusShort) {
  if (!apiStatusShort) return 'scheduled';
  const s = String(apiStatusShort).toUpperCase();
  // Finished states
  if (['FT', 'AET', 'PEN'].includes(s)) return 'finished';
  // Everything else (NS, TBD, PST, CANC, ABD, AWD, WO, LIVE, 1H, HT, 2H, BT, SUSP, INT) = scheduled
  // Scoring-Cron will later transition live states to finished.
  return 'scheduled';
}

// ============================================
// IMPORT ONE LEAGUE
// ============================================

async function importLeagueFixtures(league, clubsByApiId) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Importing fixtures: ${league.name} (${league.short})`);
  console.log(`  api_football_id=${league.api_football_id}  season=${SEASON}  league_id=${league.id}`);
  console.log(`${'='.repeat(60)}\n`);

  await sleep(150);
  const res = await apiFetch(`/fixtures?league=${league.api_football_id}&season=${SEASON}`);

  if (res.errors && (Array.isArray(res.errors) ? res.errors.length > 0 : Object.keys(res.errors).length > 0)) {
    console.error('  API errors:', res.errors);
    return { inserted: 0, updated: 0, skipped: 0, reasons: { apiError: 1 } };
  }

  const apiFixtures = res.response ?? [];
  console.log(`  API returned ${apiFixtures.length} fixtures (results=${res.results})`);

  const stats = { inserted: 0, updated: 0, skipped: 0, reasons: {} };
  const skipReasons = stats.reasons;
  const bumpSkip = (reason) => { skipReasons[reason] = (skipReasons[reason] ?? 0) + 1; };

  // Pre-fetch existing api_fixture_ids for this league to decide insert vs update
  const { data: existingFixtures } = await supabase
    .from('fixtures')
    .select('api_fixture_id')
    .eq('league_id', league.id)
    .not('api_fixture_id', 'is', null);
  const existingApiIds = new Set((existingFixtures ?? []).map(r => r.api_fixture_id));

  const rowsToUpsert = [];
  const sampleWarnings = [];

  for (const fx of apiFixtures) {
    const apiFixId = fx.fixture?.id;
    if (!apiFixId) { stats.skipped++; bumpSkip('noApiFixtureId'); continue; }

    const round = fx.league?.round;
    const gameweek = parseGameweek(round);
    if (gameweek === null) {
      stats.skipped++;
      bumpSkip('roundNotRegularSeason');
      if (sampleWarnings.length < 3) sampleWarnings.push(`  SKIP apiFix=${apiFixId} round="${round}" (not Regular Season)`);
      continue;
    }

    const homeApi = fx.teams?.home?.id;
    const awayApi = fx.teams?.away?.id;
    const homeClub = clubsByApiId.get(homeApi);
    const awayClub = clubsByApiId.get(awayApi);

    if (!homeClub) {
      stats.skipped++;
      bumpSkip('homeClubNotMapped');
      if (sampleWarnings.length < 3) sampleWarnings.push(`  SKIP apiFix=${apiFixId} unknown home-team api_id=${homeApi} name="${fx.teams?.home?.name}"`);
      continue;
    }
    if (!awayClub) {
      stats.skipped++;
      bumpSkip('awayClubNotMapped');
      if (sampleWarnings.length < 3) sampleWarnings.push(`  SKIP apiFix=${apiFixId} unknown away-team api_id=${awayApi} name="${fx.teams?.away?.name}"`);
      continue;
    }

    const status = mapStatus(fx.fixture?.status?.short);
    const homeScore = fx.goals?.home ?? null;
    const awayScore = fx.goals?.away ?? null;
    const playedAt = fx.fixture?.date ?? null;

    rowsToUpsert.push({
      league_id: league.id,
      gameweek,
      home_club_id: homeClub,
      away_club_id: awayClub,
      home_score: homeScore,
      away_score: awayScore,
      status,
      played_at: playedAt,
      api_fixture_id: apiFixId,
    });
  }

  if (sampleWarnings.length > 0) {
    console.log('  WARNINGS (sample, up to 3):');
    for (const w of sampleWarnings) console.log(w);
  }

  console.log(`  Prepared ${rowsToUpsert.length} rows for upsert (skipped ${stats.skipped} — reasons: ${JSON.stringify(skipReasons)})`);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would upsert ${rowsToUpsert.length} fixtures`);
    // Emulate insert/update split for reporting
    for (const row of rowsToUpsert) {
      if (existingApiIds.has(row.api_fixture_id)) stats.updated++;
      else stats.inserted++;
    }
    return stats;
  }

  // Chunked upsert (100/batch to stay under payload limits)
  const CHUNK_SIZE = 100;
  for (let i = 0; i < rowsToUpsert.length; i += CHUNK_SIZE) {
    const chunk = rowsToUpsert.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('fixtures')
      .upsert(chunk, { onConflict: 'api_fixture_id' });
    if (error) {
      console.error(`  UPSERT chunk ${i}-${i + chunk.length} failed:`, error.message);
      // Continue with next chunk to maximize success
      continue;
    }
    // Track insert vs update
    for (const row of chunk) {
      if (existingApiIds.has(row.api_fixture_id)) stats.updated++;
      else stats.inserted++;
    }
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  console.log(`  Upserted ${stats.inserted} inserted, ${stats.updated} updated`);

  return stats;
}

// ============================================
// MAIN
// ============================================

async function main() {
  const shorts = leagueArg ? [leagueArg] : TARGET_LEAGUE_SHORTS;

  console.log(`\n=== Import Fixtures ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'} ===`);
  console.log(`Target leagues: ${shorts.join(', ')}`);
  console.log(`Season: ${SEASON}`);
  console.log(`API-Football Pro (7,500 calls/day)\n`);

  // Fetch leagues
  const { data: leagues, error: lErr } = await supabase
    .from('leagues')
    .select('id, short, name, country, api_football_id')
    .in('short', shorts);

  if (lErr) { console.error('Failed to fetch leagues:', lErr.message); process.exit(1); }
  if (!leagues?.length) { console.error('No leagues found for:', shorts); process.exit(1); }

  for (const l of leagues) {
    if (!l.api_football_id) {
      console.error(`League ${l.short} has NULL api_football_id — aborting.`);
      process.exit(1);
    }
  }

  console.log('Leagues resolved:');
  for (const l of leagues) {
    console.log(`  ${l.short.padEnd(5)} ${l.name.padEnd(20)} api_id=${l.api_football_id}  uuid=${l.id}`);
  }

  // Fetch all clubs with api_football_id (for fast lookup)
  // Note: clubs have league_id → build per-league lookup map
  const leagueIds = leagues.map(l => l.id);
  const { data: clubs, error: cErr } = await supabase
    .from('clubs')
    .select('id, api_football_id, league_id, name')
    .in('league_id', leagueIds)
    .not('api_football_id', 'is', null);

  if (cErr) { console.error('Failed to fetch clubs:', cErr.message); process.exit(1); }

  // Build per-league Map<api_football_id, club_id>
  const clubMapByLeague = new Map();
  for (const l of leagues) clubMapByLeague.set(l.id, new Map());
  for (const c of clubs ?? []) {
    clubMapByLeague.get(c.league_id)?.set(c.api_football_id, c.id);
  }
  for (const l of leagues) {
    const m = clubMapByLeague.get(l.id);
    console.log(`  ${l.short} club-lookup size: ${m?.size ?? 0}`);
  }

  // Per-league import
  const overall = {};
  for (const l of leagues) {
    const clubsMap = clubMapByLeague.get(l.id) ?? new Map();
    overall[l.short] = await importLeagueFixtures(l, clubsMap);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`DONE ${DRY_RUN ? '(DRY RUN — nothing written)' : ''}`);
  console.log(`${'='.repeat(60)}`);
  for (const [short, s] of Object.entries(overall)) {
    console.log(`  ${short.padEnd(5)} inserted=${s.inserted} updated=${s.updated} skipped=${s.skipped} reasons=${JSON.stringify(s.reasons)}`);
  }
  console.log(`\nAPI calls used: ${apiCallCount}`);
  console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
