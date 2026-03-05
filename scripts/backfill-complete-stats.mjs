#!/usr/bin/env node
/**
 * Backfill COMPLETE fixture stats — never skip unmatched players.
 *
 * Usage: node scripts/backfill-complete-stats.mjs [startGW] [endGW]
 * Default: GW 1-28
 *
 * For each fixture:
 * 1. Fetches lineups → is_starter, grid_position, formations
 * 2. Fetches player stats → full stats
 * 3. Matches via Dual-ID → Name Match → null (but still saved)
 * 4. Calls cron_process_gameweek RPC (idempotent: DELETE + INSERT)
 *
 * Rate limit: ~20 calls per GW (10 fixtures × 2 endpoints), 100/min on Plus plan
 * ~560 API calls total for 28 GWs → ~10 minutes
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
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
const LEAGUE_ID = parseInt(env.NEXT_PUBLIC_LEAGUE_ID || '204', 10);
const SEASON = parseInt(env.NEXT_PUBLIC_SEASON || '2025', 10);

if (!API_KEY) { console.error('Missing API_FOOTBALL_KEY in .env.local'); process.exit(1); }
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const API_BASE = 'https://v3.football.api-sports.io';

// ============================================
// Helpers
// ============================================

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return await res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function mapPosition(apiPos) {
  const p = (apiPos || '').toUpperCase().trim();
  if (p === 'G' || p.includes('GOAL')) return 'GK';
  if (p === 'D' || p.includes('DEF')) return 'DEF';
  if (p === 'M' || p.includes('MID')) return 'MID';
  if (p === 'F' || p.includes('ATT') || p.includes('FOR')) return 'ATT';
  return 'MID';
}

function normalizeForMatch(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/gi, 'i')
    .replace(/ş/gi, 's')
    .replace(/ç/gi, 'c')
    .replace(/ğ/gi, 'g')
    .replace(/ö/gi, 'o')
    .replace(/ü/gi, 'u')
    .toLowerCase()
    .trim();
}

function nameMatchPlayer(apiName, clubPlayers, shirtNumber) {
  const normalized = normalizeForMatch(apiName);
  const parts = normalized.split(/\s+/);
  const apiLast = parts[parts.length - 1];

  let bestMatch = null;
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

    // Shirt-number bonus (strong signal when shirt numbers match)
    if (shirtNumber != null && p.shirt_number != null && p.shirt_number === shirtNumber) score += 25;

    if (score > bestScore && score >= 40) {
      bestScore = score;
      bestMatch = { id: p.id, position: p.position };
    }
  }
  return bestMatch;
}

// ============================================
// Main
// ============================================

const startGW = parseInt(process.argv[2] || '1', 10);
const endGW = parseInt(process.argv[3] || '28', 10);

console.log(`\n=== Backfill Complete Stats GW ${startGW}-${endGW} ===`);
console.log(`League: ${LEAGUE_ID}, Season: ${SEASON}\n`);

// Load DB mappings (via external_ids tables)
const [{ data: extIds }, { data: playerRows }, { data: clubExtIds }] = await Promise.all([
  supabase.from('player_external_ids').select('player_id, external_id').in('source', ['api_football_squad', 'api_football_fixture']),
  supabase.from('players').select('id, position, first_name, last_name, club_id, shirt_number'),
  supabase.from('club_external_ids').select('club_id, external_id').eq('source', 'api_football'),
]);

// Player info lookup
const playerInfoMap = new Map();
for (const p of playerRows) {
  playerInfoMap.set(p.id, { position: p.position, first_name: p.first_name, last_name: p.last_name, club_id: p.club_id, shirt_number: p.shirt_number });
}

// Player ID map (api_football_id → {id, position})
const playerMap = new Map();
for (const ext of (extIds ?? [])) {
  const numId = parseInt(ext.external_id, 10);
  if (isNaN(numId)) continue;
  const info = playerInfoMap.get(ext.player_id);
  playerMap.set(numId, { id: ext.player_id, position: info?.position ?? 'MID' });
}

// Club ID map (api_football_id → uuid)
const clubMap = new Map();
for (const ext of (clubExtIds ?? [])) {
  const numId = parseInt(ext.external_id, 10);
  if (!isNaN(numId)) clubMap.set(numId, ext.club_id);
}

// Club players map for name matching
const clubPlayersMap = new Map();
for (const p of playerRows) {
  if (!p.club_id) continue;
  const arr = clubPlayersMap.get(p.club_id) || [];
  arr.push({ id: p.id, first_name: p.first_name, last_name: p.last_name, position: p.position, shirt_number: p.shirt_number });
  clubPlayersMap.set(p.club_id, arr);
}

// Shirt-number index: clubId → shirtNumber → player
const clubPlayersByShirtNumber = new Map();
for (const [cid, players] of clubPlayersMap) {
  const snMap = new Map();
  for (const p of players) {
    if (p.shirt_number != null) snMap.set(p.shirt_number, p);
  }
  clubPlayersByShirtNumber.set(cid, snMap);
}

console.log(`Loaded: ${playerMap.size} player IDs, ${clubMap.size} clubs, ${clubPlayersMap.size} club rosters, ${[...clubPlayersByShirtNumber.values()].reduce((s, m) => s + m.size, 0)} shirt numbers\n`);

let totalMatched = 0;
let totalUnmatched = 0;
let totalNameMatched = 0;
let totalShirtBridged = 0;
let totalStats = 0;
let totalReconciled = 0;
let apiCalls = 0;

for (let gw = startGW; gw <= endGW; gw++) {
  console.log(`--- GW ${gw} ---`);

  // Get our fixtures for this GW
  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id, home_club_id, away_club_id, api_fixture_id')
    .eq('gameweek', gw)
    .not('api_fixture_id', 'is', null);

  if (!fixtures || fixtures.length === 0) {
    console.log('  No fixtures, skipping');
    continue;
  }

  // Fetch API fixtures for scores
  const apiFixData = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}&round=Regular Season - ${gw}`);
  apiCalls++;

  const fixtureResults = [];
  const playerStats = [];
  let gwMatched = 0;
  let gwUnmatched = 0;
  let gwNameMatched = 0;
  let gwShirtBridged = 0;
  const newExternalIds = [];

  for (const fixture of fixtures) {
    const apiMatch = apiFixData.response.find(f => f.fixture.id === fixture.api_fixture_id);
    if (apiMatch && apiMatch.goals.home != null && apiMatch.goals.away != null) {
      fixtureResults.push({
        fixture_id: fixture.id,
        home_score: apiMatch.goals.home,
        away_score: apiMatch.goals.away,
      });
    }

    // Fetch lineups + stats
    let lineupsData = { response: [] };
    try {
      lineupsData = await apiFetch(`/fixtures/lineups?fixture=${fixture.api_fixture_id}`);
      apiCalls++;
    } catch (e) {
      console.log(`  Lineups fetch failed for fixture ${fixture.api_fixture_id}: ${e.message}`);
    }

    const apiStats = await apiFetch(`/fixtures/players?fixture=${fixture.api_fixture_id}`);
    apiCalls++;

    // Build lineup map (by ID + by name + by last-name for dual-ID cross-reference)
    const lineupMap = new Map();
    const lineupByName = new Map();
    const lineupByLastName = new Map(); // null = ambiguous
    const lineupByShirtNumber = new Map();
    const formationUpdates = {};

    function addToLineupMaps(entry, info) {
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
    }

    for (const teamLineup of lineupsData.response) {
      const clubId = clubMap.get(teamLineup.team.id);
      if (!clubId) continue;

      if (teamLineup.formation) {
        if (clubId === fixture.home_club_id) formationUpdates.home_formation = teamLineup.formation;
        if (clubId === fixture.away_club_id) formationUpdates.away_formation = teamLineup.formation;
      }

      for (const entry of teamLineup.startXI || []) {
        addToLineupMaps(entry, {
          isStarter: true,
          gridPosition: entry.player.grid,
          name: entry.player.name,
          apiId: entry.player.id,
          shirtNumber: entry.player.number,
        });
      }
      for (const entry of teamLineup.substitutes || []) {
        addToLineupMaps(entry, {
          isStarter: false,
          gridPosition: null,
          name: entry.player.name,
          apiId: entry.player.id,
          shirtNumber: entry.player.number,
        });
      }
    }

    // Save formations
    if (Object.keys(formationUpdates).length > 0) {
      await supabase.from('fixtures').update(formationUpdates).eq('id', fixture.id);
    }

    const processedApiIds = new Set();

    // Process stats
    for (const teamData of apiStats.response) {
      const clubId = clubMap.get(teamData.team.id);
      if (!clubId) continue;

      const isHome = fixture.home_club_id === clubId;
      const goalsAgainst = apiMatch
        ? (isHome ? apiMatch.goals.away : apiMatch.goals.home) ?? 0
        : 0;
      const isCleanSheet = goalsAgainst === 0;

      for (const pd of teamData.players) {
        const apiPlayerId = pd.player.id;
        processedApiIds.add(apiPlayerId);

        const stat = pd.statistics[0];
        if (!stat) continue;

        const matchPosition = stat.games.position ? mapPosition(stat.games.position) : null;
        const minutes = stat.games.minutes ?? 0;
        // Resolution order: 1) Direct API-ID  2) Shirt-Number Bridge  3) Name fallback
        let lineupInfo = lineupMap.get(apiPlayerId);

        // 2) Shirt-Number Bridge: stats-player → DB player → shirt_number → lineup
        if (!lineupInfo && clubId) {
          const clubPlayers = clubPlayersMap.get(clubId);
          if (clubPlayers) {
            const dbMatch = nameMatchPlayer(pd.player.name ?? '', clubPlayers, undefined);
            if (dbMatch) {
              const dbPlayer = clubPlayers.find(cp => cp.id === dbMatch.id);
              if (dbPlayer?.shirt_number != null) {
                const byShirt = lineupByShirtNumber.get(dbPlayer.shirt_number);
                if (byShirt) {
                  lineupInfo = byShirt;
                  gwShirtBridged++;
                  console.log(`  [SHIRT_BRIDGE] ${pd.player.name}(${apiPlayerId}) → ${byShirt.name}(${byShirt.apiId}) via #${dbPlayer.shirt_number}`);
                }
              }
            }
          }
        }

        // 3) Name fallback: exact name → fuzzy last-name
        if (!lineupInfo && pd.player.name) {
          const normalizedName = normalizeForMatch(pd.player.name);
          lineupInfo = lineupByName.get(normalizedName);
          if (!lineupInfo) {
            const parts = normalizedName.split(/\s+/);
            const last = parts[parts.length - 1];
            if (last && last.length >= 3) {
              lineupInfo = lineupByLastName.get(last) || undefined;
            }
          }
        }

        // If cross-referenced (not direct), mark lineup API ID as processed to prevent ghost duplicates
        if (lineupInfo && lineupInfo.apiId !== apiPlayerId) {
          processedApiIds.add(lineupInfo.apiId);
        }
        const isStarter = lineupInfo?.isStarter ?? false;
        const gridPosition = lineupInfo?.gridPosition ?? null;

        if (minutes === 0 && !lineupInfo) continue;

        let ourPlayer = playerMap.get(apiPlayerId);
        const apiPlayerName = lineupInfo?.name ?? pd.player.name ?? `Player ${apiPlayerId}`;

        if (!ourPlayer) {
          const clubPlayers = clubPlayersMap.get(clubId);
          if (clubPlayers) {
            const sn = lineupInfo?.shirtNumber ?? undefined;
            ourPlayer = nameMatchPlayer(apiPlayerName, clubPlayers, sn);
            if (ourPlayer) gwNameMatched++;
          }
        }

        // Auto-reconcile: collect newly discovered fixture API IDs
        if (ourPlayer && !playerMap.has(apiPlayerId)) {
          newExternalIds.push({ player_id: ourPlayer.id, external_id: apiPlayerId });
        }

        if (ourPlayer) gwMatched++;
        else gwUnmatched++;

        const position = ourPlayer?.position ?? (matchPosition || 'MID');
        const goals = stat.goals.total ?? 0;
        const assists = stat.goals.assists ?? 0;
        const goalsConceded = stat.goals.conceded ?? 0;
        const yellowCard = (stat.cards.yellow ?? 0) > 0;
        const redCard = (stat.cards.red ?? 0) > 0;
        const saves = stat.goals.saves ?? 0;
        const rating = stat.games.rating ? parseFloat(stat.games.rating) : null;
        const fantasyPoints = rating ? Math.round(rating * 10) : 0;

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
          fantasy_points: fantasyPoints,
          rating,
          match_position: matchPosition,
          is_starter: isStarter,
          grid_position: gridPosition,
          api_football_player_id: apiPlayerId,
          player_name_api: apiPlayerName,
        });
      }
    }

    // Add lineup-only players (no stats entry)
    for (const teamLineup of lineupsData.response) {
      const clubId = clubMap.get(teamLineup.team.id);
      if (!clubId) continue;

      const isHome = fixture.home_club_id === clubId;
      const goalsAgainst = apiMatch
        ? (isHome ? apiMatch.goals.away : apiMatch.goals.home) ?? 0
        : 0;
      const isCleanSheet = goalsAgainst === 0;

      const allPlayers = [
        ...(teamLineup.startXI || []).map(e => ({ ...e, isStarter: true })),
        ...(teamLineup.substitutes || []).map(e => ({ ...e, isStarter: false })),
      ];

      for (const entry of allPlayers) {
        if (processedApiIds.has(entry.player.id)) continue;
        processedApiIds.add(entry.player.id);

        let ourPlayer = playerMap.get(entry.player.id);
        if (!ourPlayer) {
          const clubPlayers = clubPlayersMap.get(clubId);
          if (clubPlayers) {
            ourPlayer = nameMatchPlayer(entry.player.name, clubPlayers, entry.player.number);
            if (ourPlayer) gwNameMatched++;
          }
        }

        // Auto-reconcile: collect newly discovered fixture API IDs
        if (ourPlayer && !playerMap.has(entry.player.id)) {
          newExternalIds.push({ player_id: ourPlayer.id, external_id: entry.player.id });
        }

        if (ourPlayer) gwMatched++;
        else gwUnmatched++;

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

    // Rate limit: pause between fixtures
    await sleep(500);
  }

  // Structural dedup: remove ghost starters (dual-ID entries with 0 min, null rating)
  // A team has EXACTLY 11 starters — if >11, the 0-min entries are ghosts
  const beforeDedup = playerStats.length;
  const byClub = new Map();
  for (const s of playerStats) {
    const key = `${s.fixture_id}:${s.club_id}`;
    const arr = byClub.get(key) || [];
    arr.push(s);
    byClub.set(key, arr);
  }
  const dedupedPlayerStats = [];
  for (const [, clubStats] of byClub) {
    const starters = clubStats.filter(s => s.is_starter);
    if (starters.length <= 11) {
      dedupedPlayerStats.push(...clubStats);
      continue;
    }
    const ghosts = starters.filter(s => s.minutes_played === 0 && s.rating === null);
    const ghostIds = new Set(ghosts.map(g => g.api_football_player_id));
    if (ghosts.length === 0) { dedupedPlayerStats.push(...clubStats); continue; }
    const grids = ghosts.filter(g => g.grid_position).map(g => g.grid_position);
    const cleaned = clubStats.filter(s => !ghostIds.has(s.api_football_player_id));
    const curStarters = cleaned.filter(s => s.is_starter);
    const nonStarters = cleaned.filter(s => !s.is_starter && s.minutes_played > 0)
      .sort((a, b) => b.minutes_played - a.minutes_played);
    const need = 11 - curStarters.length;
    for (let i = 0; i < Math.min(need, nonStarters.length); i++) {
      nonStarters[i].is_starter = true;
      if (grids.length > 0) { nonStarters[i].grid_position = grids.shift(); }
    }
    dedupedPlayerStats.push(...cleaned);
  }
  const ghostsRemoved = beforeDedup - dedupedPlayerStats.length;
  if (ghostsRemoved > 0) console.log(`  Ghost dedup: removed ${ghostsRemoved} entries`);

  // Direct import (bypass RPC to avoid unique constraint issues)
  const gwFixtureIds = fixtures.map(f => f.id);

  // 1. Update fixture scores
  for (const fr of fixtureResults) {
    await supabase.from('fixtures')
      .update({ home_score: fr.home_score, away_score: fr.away_score, status: 'finished' })
      .eq('id', fr.fixture_id);
  }

  // 2. Delete ALL existing stats for this GW's fixtures
  const { error: delErr } = await supabase.from('fixture_player_stats')
    .delete()
    .in('fixture_id', gwFixtureIds);
  if (delErr) {
    console.error(`  Delete error: ${delErr.message}`);
    continue;
  }

  // 3. Deduplicate: same (fixture_id, player_id) can appear if name-match hits same player
  const seen = new Set();
  const dedupedStats = [];
  for (const s of dedupedPlayerStats) {
    const key = s.player_id ? `${s.fixture_id}:${s.player_id}` : `${s.fixture_id}:api:${s.api_football_player_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedStats.push({ ...s, id: crypto.randomUUID() });
  }

  // 4. Batch insert (Supabase max ~1000 rows per request)
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < dedupedStats.length; i += BATCH) {
    const batch = dedupedStats.slice(i, i + BATCH);
    const { error: insErr } = await supabase.from('fixture_player_stats').insert(batch);
    if (insErr) {
      console.error(`  Insert error (batch ${i}): ${insErr.message}`);
    } else {
      inserted += batch.length;
    }
  }

  // 5. Sync player_gameweek_scores for matched players
  const matchedStats = dedupedStats.filter(s => s.player_id);
  for (const s of matchedStats) {
    const score = s.rating ? Math.min(100, Math.max(0, Math.round(s.rating * 10))) : Math.min(100, Math.max(0, s.fantasy_points * 5));
    await supabase.from('player_gameweek_scores')
      .upsert({ player_id: s.player_id, gameweek: gw, score }, { onConflict: 'player_id,gameweek' });
  }

  // Auto-reconcile: persist newly discovered fixture API IDs
  if (newExternalIds.length > 0) {
    const seen = new Set();
    const uniqueIds = newExternalIds.filter(e => {
      if (seen.has(e.player_id)) return false;
      seen.add(e.player_id);
      return true;
    });

    const { error: reconcileErr } = await supabase
      .from('player_external_ids')
      .upsert(
        uniqueIds.map(e => ({ player_id: e.player_id, source: 'api_football_fixture', external_id: String(e.external_id) })),
        { onConflict: 'player_id,source' },
      );

    if (reconcileErr) {
      console.log(`  [AUTO-RECONCILE] Error: ${reconcileErr.message}`);
    } else {
      console.log(`  [AUTO-RECONCILE] Persisted ${uniqueIds.length} new fixture API IDs`);
      totalReconciled += uniqueIds.length;
      // Update local playerMap for subsequent GWs (self-healing across GWs)
      for (const e of uniqueIds) {
        const info = playerInfoMap.get(e.player_id);
        if (info) playerMap.set(e.external_id, { id: e.player_id, position: info.position });
      }
    }
  }

  console.log(`  Imported: ${inserted}/${dedupedStats.length} stats (deduped from ${playerStats.length}) | Matched: ${gwMatched}, Name: ${gwNameMatched}, ShirtBridge: ${gwShirtBridged}, Unmatched: ${gwUnmatched}`);

  totalMatched += gwMatched;
  totalUnmatched += gwUnmatched;
  totalNameMatched += gwNameMatched;
  totalShirtBridged += gwShirtBridged;
  totalStats += playerStats.length;

  // Rate limit between GWs
  await sleep(2000);
}

console.log(`\n=== Summary ===`);
console.log(`Total stats: ${totalStats}`);
console.log(`Matched: ${totalMatched} | Name-matched: ${totalNameMatched} | Shirt-bridged: ${totalShirtBridged} | Unmatched: ${totalUnmatched}`);
console.log(`Auto-reconciled: ${totalReconciled} new fixture API IDs`);
console.log(`API calls: ${apiCalls}`);
console.log('\nRun this SQL to verify:');
console.log(`SELECT COUNT(*) FROM (SELECT fixture_id, club_id FROM fixture_player_stats GROUP BY fixture_id, club_id HAVING COUNT(*) < 11) sub;`);
console.log('\nDone!');
