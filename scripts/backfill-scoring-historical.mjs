#!/usr/bin/env node
/**
 * Backfill historical scoring for 6 Major Leagues (BL1, BL2, LL, PL, SA, SL).
 *
 * Problem: Cron `/api/cron/gameweek-sync` is forward-live only ("No fixtures past kickoff").
 * Historical finished fixtures (1.732 total) have home_score/away_score from import-fixtures.mjs
 * but ZERO fixture_player_stats and ZERO player_gameweek_scores rows.
 * -> Fantasy Events, Lineups and Scoring would yield 0 points for all 3.596 Major-League players.
 *
 * Solution: Per finished fixture, fetch /fixtures/lineups + /fixtures/players + /fixtures/events
 * from API-Football, build the same payload shape as cron/gameweek-sync, call
 * RPC `cron_process_gameweek(gw, fixtureResults, playerStats)`. Idempotent.
 * After all leagues done, call `cron_recalc_perf()` which updates
 * players.perf_l5, perf_l15, perf_season, goals, assists, minutes etc.
 *
 * Usage:
 *   node scripts/backfill-scoring-historical.mjs --dry-run              # plan only
 *   node scripts/backfill-scoring-historical.mjs --league=BL1 --dry-run # single league plan
 *   node scripts/backfill-scoring-historical.mjs --league=BL1           # single league live
 *   node scripts/backfill-scoring-historical.mjs                        # ALL 6 leagues live
 *   node scripts/backfill-scoring-historical.mjs --skip-recalc-perf     # skip final cron_recalc_perf call
 *
 * API cost: ~1732 fixtures * 3 endpoints = ~5196 calls. Pro plan = 7.500/day. 69% quota.
 * Rate-limit: 150ms sleep + exponential backoff on 429.
 *
 * Schema (verified against live DB 2026-04-15):
 *   fixture_player_stats(id, fixture_id, player_id, club_id, minutes_played, goals, assists,
 *     clean_sheet, goals_conceded, yellow_card, red_card, saves, bonus, fantasy_points,
 *     rating, match_position, is_starter, grid_position, api_football_player_id, player_name_api)
 *   player_gameweek_scores(id, player_id, score, created_at, gameweek) UNIQUE(player_id, gameweek)
 *
 * Rollback: memory/rollback_scoring_backfill_20260415.json — pre-migration snapshot
 *   (player_gameweek_scores + fixture_player_stats summary).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// ============================================
// ENV (Worktree-aware)
// ============================================

const ENV_PATHS = ['.env.local', 'C:/bescout-app/.env.local'];
let envFile = null;
for (const p of ENV_PATHS) {
  if (existsSync(p)) { envFile = readFileSync(p, 'utf-8'); break; }
}
if (!envFile) {
  console.error('Missing .env.local (tried:', ENV_PATHS.join(', '), ')');
  process.exit(1);
}

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

// CLI args
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_RECALC = process.argv.includes('--skip-recalc-perf');
const leagueArg = process.argv.find(a => a.startsWith('--league='))?.split('=')[1];
const gwFromArg = process.argv.find(a => a.startsWith('--gw-from='))?.split('=')[1];
const gwToArg = process.argv.find(a => a.startsWith('--gw-to='))?.split('=')[1];
const gwListArg = process.argv.find(a => a.startsWith('--gw-list='))?.split('=')[1]; // comma-separated

const ROLLBACK_PATH = 'memory/rollback_scoring_backfill_20260415.json';
const TARGET_LEAGUE_SHORTS = leagueArg ? [leagueArg] : ['BL1', 'BL2', 'LL', 'PL', 'SA', 'SL'];

// ============================================
// HELPERS
// ============================================

let apiCallCount = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiFetch(endpoint, retry = 0) {
  apiCallCount++;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (res.status === 429) {
    if (retry >= 4) throw new Error(`API 429 rate-limit after ${retry} retries: ${endpoint}`);
    const delay = 1000 * 2 ** retry;
    console.warn(`  [API 429] backoff ${delay}ms (retry ${retry + 1}/4) for ${endpoint}`);
    await sleep(delay);
    return apiFetch(endpoint, retry + 1);
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText} for ${endpoint}`);
  const json = await res.json();
  if (json.errors && typeof json.errors === 'object' && !Array.isArray(json.errors) && Object.keys(json.errors).length > 0) {
    const errStr = JSON.stringify(json.errors);
    if (errStr !== '{}' && errStr !== '[]') {
      throw new Error(`API returned errors: ${errStr} for ${endpoint}`);
    }
  }
  return json;
}

function normalizeForMatch(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function mapPosition(apiPos) {
  if (!apiPos) return 'MID';
  const p = apiPos.toUpperCase();
  if (p === 'G' || p === 'GK') return 'GK';
  if (p === 'D' || p === 'DEF') return 'DEF';
  if (p === 'F' || p === 'ATT' || p === 'FW') return 'ATT';
  return 'MID';
}

/**
 * Remove ghost starters: entries with 0 min + null rating where the same lineup
 * has 11 REAL starters (API-Football dual-ID artifact).
 */
function deduplicateGhostStarters(stats) {
  const byFixtureAndClub = new Map();
  for (const s of stats) {
    const key = `${s.fixture_id}|${s.club_id}`;
    if (!byFixtureAndClub.has(key)) byFixtureAndClub.set(key, []);
    byFixtureAndClub.get(key).push(s);
  }
  const result = [];
  for (const [, group] of byFixtureAndClub) {
    const starters = group.filter(s => s.is_starter);
    if (starters.length <= 11) {
      result.push(...group);
      continue;
    }
    // Remove ghost starters: is_starter + 0 min + null rating + player_id null
    const ghosts = starters.filter(s => s.is_starter && s.minutes_played === 0 && s.rating === null);
    const realStarters = starters.filter(s => !(s.is_starter && s.minutes_played === 0 && s.rating === null));
    const benches = group.filter(s => !s.is_starter);
    // If removing all ghosts yields <=11 starters, drop them
    if (realStarters.length <= 11) {
      result.push(...realStarters, ...benches);
    } else {
      // Still too many — keep all (rare)
      result.push(...group);
    }
  }
  return result;
}

function nameMatchPlayer(apiName, clubPlayers, shirtNumber) {
  const normalized = normalizeForMatch(apiName);
  const parts = normalized.split(/\s+/);
  const apiLast = parts[parts.length - 1];
  let best = null;
  let bestScore = 0;
  for (const p of clubPlayers) {
    const normFirst = normalizeForMatch(p.first_name);
    const normLast = normalizeForMatch(p.last_name);
    let score = 0;
    if (normLast === apiLast) score += 50;
    else if (normalized.includes(normLast) && normLast.length >= 3) score += 35;
    else if (normLast.includes(apiLast) && apiLast.length >= 3) score += 25;
    if (parts.length > 1 && normFirst === parts[0]) score += 30;
    else if (normalized.includes(normFirst) && normFirst.length >= 3) score += 15;
    if (shirtNumber != null && p.shirt_number != null && p.shirt_number === shirtNumber) score += 25;
    if (score > bestScore && score >= 40) {
      if (best && bestScore > 0 && score - bestScore < 15) continue;
      bestScore = score;
      best = { id: p.id, position: p.position };
    }
  }
  return best;
}

// ============================================
// MAIN PER-LEAGUE LOGIC
// ============================================

/**
 * Build playerStats + fixtureResults for a single finished fixture.
 * Returns { playerStats: [], fixtureResult: { fixture_id, home_score, away_score } }
 */
async function buildFixtureData(fixture, mappings) {
  const apiFixId = fixture.api_fixture_id;
  // Parallel fetch — /events NOT needed (we only populate scoring, not substitutions)
  const [lineupsData, apiStats] = await Promise.all([
    apiFetch(`/fixtures/lineups?fixture=${apiFixId}`).catch(() => ({ response: [] })),
    apiFetch(`/fixtures/players?fixture=${apiFixId}`),
  ]);

  const playerStats = [];

  // Build lineup maps
  const lineupMap = new Map();
  const lineupByName = new Map();
  const lineupByLastName = new Map();
  const lineupByShirtNumber = new Map();

  for (const teamLineup of lineupsData.response ?? []) {
    const clubId = mappings.clubMap.get(teamLineup.team.id);
    if (!clubId) continue;

    const addToMaps = (entry, info) => {
      lineupMap.set(entry.player.id, info);
      lineupByName.set(normalizeForMatch(entry.player.name), info);
      const parts = normalizeForMatch(entry.player.name).split(/\s+/);
      const last = parts[parts.length - 1];
      if (last && last.length >= 3) {
        lineupByLastName.set(last, lineupByLastName.has(last) ? null : info);
      }
      if (info.shirtNumber > 0) {
        lineupByShirtNumber.set(info.shirtNumber, info);
      }
    };

    for (const entry of teamLineup.startXI ?? []) {
      addToMaps(entry, {
        isStarter: true,
        gridPosition: entry.player.grid,
        name: entry.player.name,
        apiId: entry.player.id,
        shirtNumber: entry.player.number,
      });
    }
    for (const entry of teamLineup.substitutes ?? []) {
      addToMaps(entry, {
        isStarter: false,
        gridPosition: null,
        name: entry.player.name,
        apiId: entry.player.id,
        shirtNumber: entry.player.number,
      });
    }
  }

  const processedApiIds = new Set();

  for (const teamData of apiStats.response ?? []) {
    const clubId = mappings.clubMap.get(teamData.team.id);
    if (!clubId) continue;

    const isHome = fixture.home_club_id === clubId;
    const goalsAgainst = isHome
      ? fixture.away_score ?? 0
      : fixture.home_score ?? 0;
    const isCleanSheet = goalsAgainst === 0;

    for (const pd of teamData.players ?? []) {
      const apiPlayerId = pd.player.id;
      processedApiIds.add(apiPlayerId);

      const stat = pd.statistics?.[0];
      if (!stat) continue;

      const matchPosition = stat.games?.position ? mapPosition(stat.games.position) : null;
      const minutes = stat.games?.minutes ?? 0;
      let lineupInfo = lineupMap.get(apiPlayerId);

      // Name fallback for lineup info
      if (!lineupInfo && pd.player.name) {
        const nn = normalizeForMatch(pd.player.name);
        lineupInfo = lineupByName.get(nn) ?? undefined;
        if (!lineupInfo) {
          const parts = nn.split(/\s+/);
          const last = parts[parts.length - 1];
          if (last && last.length >= 3) {
            const ln = lineupByLastName.get(last);
            if (ln) lineupInfo = ln;
          }
        }
      }

      if (lineupInfo && lineupInfo.apiId !== apiPlayerId) {
        processedApiIds.add(lineupInfo.apiId);
      }
      const isStarter = lineupInfo?.isStarter ?? false;
      const gridPosition = lineupInfo?.gridPosition ?? null;

      if (minutes === 0 && !lineupInfo) continue;

      // Match to our player: 1) DB api_football_id 2) Name-match with shirt bonus
      let ourPlayer = mappings.playerMap.get(apiPlayerId);
      const apiPlayerName = lineupInfo?.name ?? pd.player.name ?? `Player ${apiPlayerId}`;

      if (!ourPlayer) {
        const clubPlayers = mappings.clubPlayersMap.get(clubId);
        if (clubPlayers) {
          const sn = lineupInfo?.shirtNumber ?? undefined;
          ourPlayer = nameMatchPlayer(apiPlayerName, clubPlayers, sn) ?? undefined;
        }
      }

      const goals = stat.goals?.total ?? 0;
      const assists = stat.goals?.assists ?? 0;
      const goalsConceded = stat.goals?.conceded ?? 0;
      const yellowCard = (stat.cards?.yellow ?? 0) > 0;
      const redCard = (stat.cards?.red ?? 0) > 0;
      const saves = stat.goals?.saves ?? 0;

      const apiRating = stat.games?.rating ? parseFloat(stat.games.rating) : null;
      const fantasyPoints = apiRating != null ? Math.round(apiRating * 10) : null;

      playerStats.push({
        fixture_id: fixture.id,
        player_id: ourPlayer?.id ?? null,
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
        fantasy_points: fantasyPoints ?? 0,
        rating: apiRating,
        match_position: matchPosition,
        is_starter: isStarter,
        grid_position: gridPosition,
        api_football_player_id: apiPlayerId,
        player_name_api: apiPlayerName,
      });
    }
  }

  // Add lineup players without stats (unused subs)
  for (const teamLineup of lineupsData.response ?? []) {
    const clubId = mappings.clubMap.get(teamLineup.team.id);
    if (!clubId) continue;
    const isHome = fixture.home_club_id === clubId;
    const goalsAgainst = isHome
      ? fixture.away_score ?? 0
      : fixture.home_score ?? 0;
    const isCleanSheet = goalsAgainst === 0;

    const allLP = [
      ...(teamLineup.startXI ?? []).map(e => ({ ...e, isStarter: true })),
      ...(teamLineup.substitutes ?? []).map(e => ({ ...e, isStarter: false })),
    ];

    for (const entry of allLP) {
      if (processedApiIds.has(entry.player.id)) continue;
      processedApiIds.add(entry.player.id);

      let ourPlayer = mappings.playerMap.get(entry.player.id);
      if (!ourPlayer) {
        const clubPlayers = mappings.clubPlayersMap.get(clubId);
        if (clubPlayers) {
          ourPlayer = nameMatchPlayer(entry.player.name, clubPlayers, entry.player.number) ?? undefined;
        }
      }

      playerStats.push({
        fixture_id: fixture.id,
        player_id: ourPlayer?.id ?? null,
        club_id: clubId,
        minutes_played: 0,
        goals: 0,
        assists: 0,
        clean_sheet: isCleanSheet,
        goals_conceded: 0,
        yellow_card: false,
        red_card: false,
        saves: 0,
        bonus: 0,
        fantasy_points: 0,
        rating: null,
        match_position: entry.player.pos ? mapPosition(entry.player.pos) : null,
        is_starter: entry.isStarter,
        grid_position: entry.isStarter ? entry.player.grid : null,
        api_football_player_id: entry.player.id,
        player_name_api: entry.player.name,
      });
    }
  }

  return {
    fixtureResult: {
      fixture_id: fixture.id,
      home_score: fixture.home_score ?? 0,
      away_score: fixture.away_score ?? 0,
    },
    playerStats,
  };
}

async function processLeague(league, globalStats) {
  console.log('');
  console.log('='.repeat(70));
  console.log(`League: ${league.short} — ${league.name} (api=${league.api_football_id})`);
  console.log('='.repeat(70));

  // 1) Load mappings: clubs + players + external_ids
  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, api_football_id, name')
    .eq('league_id', league.id);
  const clubMap = new Map();
  for (const c of clubs ?? []) {
    if (c.api_football_id != null) clubMap.set(c.api_football_id, c.id);
  }
  const clubIds = (clubs ?? []).map(c => c.id);

  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, club_id, api_football_id, position, shirt_number')
    .in('club_id', clubIds);

  // playerMap: api_football_id -> {id, position}
  const playerMap = new Map();
  for (const p of players ?? []) {
    if (p.api_football_id != null) playerMap.set(p.api_football_id, { id: p.id, position: p.position });
  }
  // Also load player_external_ids (api_football_fixture + api_football_squad)
  const playerIds = (players ?? []).map(p => p.id);
  const BATCH = 200;
  for (let i = 0; i < playerIds.length; i += BATCH) {
    const slice = playerIds.slice(i, i + BATCH);
    const { data: xids } = await supabase
      .from('player_external_ids')
      .select('player_id, external_id, source')
      .in('player_id', slice)
      .in('source', ['api_football_fixture', 'api_football_squad']);
    const playerById = new Map((players ?? []).map(p => [p.id, p]));
    for (const x of xids ?? []) {
      const p = playerById.get(x.player_id);
      const apiId = parseInt(x.external_id, 10);
      if (!isNaN(apiId) && p && !playerMap.has(apiId)) {
        playerMap.set(apiId, { id: p.id, position: p.position });
      }
    }
  }

  // clubPlayersMap: club_id -> [{id, first_name, last_name, position, shirt_number}]
  const clubPlayersMap = new Map();
  for (const p of players ?? []) {
    if (!clubPlayersMap.has(p.club_id)) clubPlayersMap.set(p.club_id, []);
    clubPlayersMap.get(p.club_id).push({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      position: p.position,
      shirt_number: p.shirt_number,
    });
  }

  const mappings = { clubMap, playerMap, clubPlayersMap };
  console.log(`  Mappings: ${clubMap.size} clubs (api_id), ${playerMap.size} players (api_id), ${(players ?? []).length} local players`);

  // 2) Load finished fixtures grouped by gameweek
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id, gameweek, home_club_id, away_club_id, home_score, away_score, api_fixture_id')
    .eq('league_id', league.id)
    .eq('status', 'finished')
    .not('api_fixture_id', 'is', null)
    .order('gameweek', { ascending: true });

  const byGw = new Map();
  for (const f of fixtures ?? []) {
    if (!byGw.has(f.gameweek)) byGw.set(f.gameweek, []);
    byGw.get(f.gameweek).push(f);
  }
  const gwList = Array.from(byGw.keys()).sort((a, b) => a - b);
  console.log(`  Finished fixtures: ${(fixtures ?? []).length} across ${gwList.length} GWs: [${gwList[0]}..${gwList[gwList.length - 1]}]`);

  // Filter by --gw-list (comma-sep) OR --gw-from/--gw-to (inclusive range)
  let targetGws;
  if (gwListArg) {
    const wanted = new Set(gwListArg.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)));
    targetGws = gwList.filter(gw => wanted.has(gw));
  } else {
    const gwFrom = gwFromArg ? parseInt(gwFromArg, 10) : gwList[0];
    const gwTo = gwToArg ? parseInt(gwToArg, 10) : gwList[gwList.length - 1];
    targetGws = gwList.filter(gw => gw >= gwFrom && gw <= gwTo);
  }
  console.log(`  Target GWs: ${targetGws.join(',')}`);

  // 3) Per-GW processing
  const leagueStats = {
    gwsProcessed: 0,
    fixturesProcessed: 0,
    fixturesImported: 0,
    statsImported: 0,
    scoresSynced: 0,
    unmatchedPlayers: 0,
    apiCallsUsed: 0,
  };

  const apiCallsStart = apiCallCount;

  for (const gw of targetGws) {
    const gwFixtures = byGw.get(gw) ?? [];
    console.log(`  GW${String(gw).padStart(2)}: ${gwFixtures.length} fixtures →`);

    const fixtureResults = [];
    const playerStats = [];
    const startCalls = apiCallCount;

    for (const fx of gwFixtures) {
      try {
        const { fixtureResult, playerStats: ps } = await buildFixtureData(fx, mappings);
        fixtureResults.push(fixtureResult);
        playerStats.push(...ps);
        await sleep(150);
      } catch (err) {
        console.error(`    ERROR fixture=${fx.id} api=${fx.api_fixture_id}: ${err.message}`);
        // Skip this fixture, continue the rest
      }
    }

    // Dedupe ghost starters (structural)
    const beforeDedup = playerStats.length;
    const deduped = deduplicateGhostStarters(playerStats);
    const ghostsRemoved = beforeDedup - deduped.length;

    // Pre-RPC unique-dedup:
    //   (a) idx_fps_fixture_player_unique (fixture_id, player_id)
    //   (b) idx_fps_fixture_api_player_unique (fixture_id, api_football_player_id)
    //   (c) player_gameweek_scores (player_id, gameweek) — if SAME player_id appears in
    //       DIFFERENT fixtures of same GW (name-match mis-assignment), the RPC's
    //       INSERT ... ON CONFLICT DO UPDATE fails with "cannot affect row a second time"
    //       because the SELECT returns 2 rows with same (player_id, GW).
    //       -> We keep the FIRST occurrence of each player_id for this GW, drop rest.
    const seenFpPlayerId = new Set();
    const seenFpApiId = new Set();
    const seenPlayerForGw = new Set(); // cross-fixture player_id uniqueness per GW
    const uniqueStats = [];
    let dupPlayerId = 0;
    let dupApiId = 0;
    let dupPlayerCrossFixture = 0;
    for (const s of deduped) {
      // (a) (fixture_id, player_id) when matched
      if (s.player_id != null) {
        const key = `${s.fixture_id}|${s.player_id}`;
        if (seenFpPlayerId.has(key)) { dupPlayerId++; continue; }
        seenFpPlayerId.add(key);
      }
      // (b) (fixture_id, api_football_player_id)
      if (s.api_football_player_id != null) {
        const key = `${s.fixture_id}|${s.api_football_player_id}`;
        if (seenFpApiId.has(key)) { dupApiId++; continue; }
        seenFpApiId.add(key);
      }
      // (c) player_id already used for THIS GW in another fixture (name-match artifact)?
      //     Drop to avoid pgw_scores ON CONFLICT crash.
      if (s.player_id != null) {
        if (seenPlayerForGw.has(s.player_id)) {
          dupPlayerCrossFixture++;
          continue;
        }
        seenPlayerForGw.add(s.player_id);
      }
      uniqueStats.push(s);
    }

    // Count unmatched after dedup
    const unmatched = uniqueStats.filter(s => s.player_id === null).length;
    leagueStats.unmatchedPlayers += unmatched;

    console.log(`         → api-calls ${apiCallCount - startCalls}, stats ${uniqueStats.length} (unmatched ${unmatched}, ghosts ${ghostsRemoved}, dup_pid ${dupPlayerId}, dup_apiid ${dupApiId}, dup_pxfix ${dupPlayerCrossFixture})`);

    if (DRY_RUN) {
      leagueStats.gwsProcessed++;
      leagueStats.fixturesProcessed += gwFixtures.length;
      leagueStats.fixturesImported += fixtureResults.length;
      leagueStats.statsImported += uniqueStats.length;
      continue;
    }

    // 4) Call RPC cron_process_gameweek
    if (fixtureResults.length === 0) {
      console.log(`         SKIP (0 fixtures built)`);
      continue;
    }
    const { data, error } = await supabase.rpc('cron_process_gameweek', {
      p_gameweek: gw,
      p_fixture_results: fixtureResults,
      p_player_stats: uniqueStats,
    });
    if (error) {
      console.error(`         RPC ERROR: ${error.message}`);
      // Debug trace: write payload to /tmp for inspection
      if (process.env.DEBUG_PAYLOAD) {
        writeFileSync(`memory/debug-backfill-payload-${league.short}-gw${gw}.json`, JSON.stringify({ gw, fixtureResults, uniqueStats }, null, 2), 'utf-8');
      }
      continue;
    }
    const result = data ?? {};
    leagueStats.gwsProcessed++;
    leagueStats.fixturesProcessed += gwFixtures.length;
    leagueStats.fixturesImported += result.fixtures_imported ?? 0;
    leagueStats.statsImported += result.stats_imported ?? 0;
    leagueStats.scoresSynced += result.scores_synced ?? 0;
    console.log(`         RPC ✓ fixtures=${result.fixtures_imported} stats=${result.stats_imported} scores=${result.scores_synced}`);
  }

  leagueStats.apiCallsUsed = apiCallCount - apiCallsStart;

  // Merge into global
  globalStats[league.short] = leagueStats;

  console.log(`  League ${league.short} done: ${JSON.stringify(leagueStats)}`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('');
  console.log('='.repeat(70));
  console.log(`Backfill Historical Scoring — ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('='.repeat(70));
  console.log(`Leagues:     ${TARGET_LEAGUE_SHORTS.join(', ')}`);
  console.log(`GW range:    ${gwFromArg ?? '(auto)'} → ${gwToArg ?? '(auto)'}`);
  console.log(`Skip recalc: ${SKIP_RECALC}`);
  console.log('');

  // 1) Load target leagues
  const { data: leagues, error: lErr } = await supabase
    .from('leagues')
    .select('id, short, name, api_football_id')
    .in('short', TARGET_LEAGUE_SHORTS);
  if (lErr) { console.error('Failed to load leagues:', lErr.message); process.exit(1); }
  if (!leagues?.length) { console.error('No leagues found for:', TARGET_LEAGUE_SHORTS); process.exit(1); }
  for (const l of leagues) {
    if (!l.api_football_id) { console.error(`League ${l.short} missing api_football_id`); process.exit(1); }
  }

  // 2) Rollback snapshot (pre-migration) — lightweight: per-league counts BEFORE
  console.log('[ROLLBACK] Snapshot pre-migration counts...');
  const preSnapshot = {
    generated_at: new Date().toISOString(),
    purpose: 'Pre-migration counts for scoring backfill rollback. Delete inserted rows to revert.',
    rollback_sql_template: [
      '-- Per league, delete fps + pgw rows inserted by this script:',
      "-- DELETE FROM fixture_player_stats WHERE fixture_id IN (SELECT id FROM fixtures WHERE league_id = '<UUID>' AND status = 'finished');",
      "-- DELETE FROM player_gameweek_scores WHERE player_id IN (SELECT p.id FROM players p JOIN clubs c ON p.club_id=c.id WHERE c.league_id = '<UUID>') AND gameweek BETWEEN <FROM> AND <TO>;",
      '-- Then rerun: SELECT cron_recalc_perf();',
    ].join('\n'),
    pre_counts: {},
  };
  for (const l of leagues) {
    const { data: clubs } = await supabase.from('clubs').select('id').eq('league_id', l.id);
    const clubIds = (clubs ?? []).map(c => c.id);
    const { data: players } = await supabase.from('players').select('id').in('club_id', clubIds);
    const playerIds = (players ?? []).map(p => p.id);
    const { count: fpsCount } = await supabase.from('fixtures').select('*', { head: true, count: 'exact' }).eq('league_id', l.id).eq('status', 'finished');
    let pgwCount = 0;
    if (playerIds.length > 0) {
      const BATCH = 500;
      for (let i = 0; i < playerIds.length; i += BATCH) {
        const slice = playerIds.slice(i, i + BATCH);
        const { count } = await supabase.from('player_gameweek_scores').select('*', { head: true, count: 'exact' }).in('player_id', slice);
        pgwCount += count ?? 0;
      }
    }
    preSnapshot.pre_counts[l.short] = {
      league_id: l.id,
      finished_fixtures: fpsCount ?? 0,
      pgw_scores: pgwCount,
      players: playerIds.length,
    };
  }
  writeFileSync(ROLLBACK_PATH, JSON.stringify(preSnapshot, null, 2), 'utf-8');
  console.log(`[ROLLBACK] Written: ${ROLLBACK_PATH}`);
  console.log('');

  // 3) Process each league
  const globalStats = {};
  for (const l of leagues) {
    try {
      await processLeague(l, globalStats);
    } catch (err) {
      console.error(`League ${l.short} FAILED:`, err.message);
      globalStats[l.short] = { error: err.message, apiCallsUsed: 0 };
    }
  }

  // 4) After ALL leagues: call cron_recalc_perf once (unless skipped or dry run)
  if (!DRY_RUN && !SKIP_RECALC) {
    console.log('');
    console.log('='.repeat(70));
    console.log('[RECALC] Running cron_recalc_perf()...');
    const { data, error } = await supabase.rpc('cron_recalc_perf');
    if (error) {
      console.error(`[RECALC] ERROR: ${error.message}`);
    } else {
      console.log(`[RECALC] ✓ ${JSON.stringify(data)}`);
    }
  } else if (SKIP_RECALC) {
    console.log('[RECALC] Skipped via --skip-recalc-perf');
  }

  // 5) Post-run summary
  console.log('');
  console.log('='.repeat(70));
  console.log(`DONE ${DRY_RUN ? '(DRY RUN — nothing written)' : ''}`);
  console.log('='.repeat(70));
  for (const [short, s] of Object.entries(globalStats)) {
    console.log(`  ${short.padEnd(5)} ${JSON.stringify(s)}`);
  }
  console.log(`\nTotal API calls: ${apiCallCount} (of 7.500 daily quota)`);

  // 6) Append post-run summary to rollback
  if (!DRY_RUN) {
    try {
      const rb = JSON.parse(readFileSync(ROLLBACK_PATH, 'utf-8'));
      rb.post_run = {
        ran_at: new Date().toISOString(),
        api_calls: apiCallCount,
        global_stats: globalStats,
      };
      writeFileSync(ROLLBACK_PATH, JSON.stringify(rb, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not append post-run to rollback:', err.message);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
