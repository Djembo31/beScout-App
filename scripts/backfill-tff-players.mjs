#!/usr/bin/env node
/**
 * Backfill TFF 1. Lig player fields — image_url, nationality, shirt_number.
 *
 * Problem: TFF-Spieler haben Gaps die Major Leagues nicht haben:
 *   - image_url 73.3% (184/689 NULL)
 *   - nationality 77.9% (152/689 NULL/empty)
 *   - contract_end 76.1% (165/689 NULL — API-Football liefert es nicht, skippen)
 *   - shirt_number 82.7% (119/689 NULL)
 *
 * Strategy:
 *   - Fuer jeden der 20 TFF-Clubs (api_football_id aus DB):
 *     - Call /players?team=X&season=2025 (paginated ~3 Pages) → nationality, photo, birth
 *     - Call /players/squads?team=X                          → number (REAL shirt_number)
 *   - Match Local-Player zu API-Player via player_external_ids (source=api_football_squad)
 *     Fallback: last_name normalize-match
 *   - Delta-UPDATE nur WHERE Field IS NULL oder empty-string (kein Overwrite!)
 *   - contract_end wird NICHT gefuellt (API-Football liefert es nicht in diesen Endpoints)
 *
 * Usage:
 *   node scripts/backfill-tff-players.mjs --dry-run     # Plan only
 *   node scripts/backfill-tff-players.mjs               # Live (writes Rollback first)
 *
 * Reads .env.local from worktree OR parent main repo for
 * API_FOOTBALL_KEY (or NEXT_PUBLIC_API_FOOTBALL_KEY) + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Rollback: memory/rollback_tff_players_20260415.json wird vor UPDATEs geschrieben.
 *
 * API Cost: ~20 clubs × (3 pages + 1 squad) = ~80 calls. Pro Plan Limit: 7500/day.
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
const DRY_RUN = process.argv.includes('--dry-run');
const LEAGUE_SHORT = 'TFF1';
const SEASON = 2025;
const ROLLBACK_PATH = 'memory/rollback_tff_players_20260415.json';

// ============================================
// HELPERS
// ============================================

let apiCallCount = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiFetch(endpoint) {
  apiCallCount++;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText} for ${endpoint}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0 && json.errors.constructor === Object) {
    // Some API-Football errors come as {errors: {token: '...'}}
    const err = JSON.stringify(json.errors);
    if (err !== '{}' && err !== '[]') {
      throw new Error(`API returned errors: ${err}`);
    }
  }
  return json;
}

function normalizeForMatch(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// ============================================
// FETCH API-FOOTBALL PLAYERS
// ============================================

async function fetchPlayersForClub(apiFootballId) {
  // Paginated /players?team=X&season=2025
  const all = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await apiFetch(`/players?team=${apiFootballId}&season=${SEASON}&page=${page}`);
    totalPages = res.paging?.total ?? 1;
    all.push(...(res.response ?? []));
    page++;
    if (page <= totalPages) await sleep(150);
  }
  return all;
}

async function fetchSquadForClub(apiFootballId) {
  // Single call, returns full roster with REAL shirt numbers
  const res = await apiFetch(`/players/squads?team=${apiFootballId}`);
  return res.response?.[0]?.players ?? [];
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('');
  console.log('='.repeat(70));
  console.log(`TFF Player Backfill — ${DRY_RUN ? 'DRY RUN' : 'LIVE RUN'}`);
  console.log('='.repeat(70));
  console.log('');

  // Step 1: Get TFF league + clubs
  console.log('[1/6] Load TFF clubs from DB');
  const { data: leagues, error: lErr } = await supabase
    .from('leagues')
    .select('id, short, api_football_id')
    .eq('short', LEAGUE_SHORT);
  if (lErr || !leagues?.length) {
    console.error('Failed to load TFF league:', lErr?.message ?? 'not found');
    process.exit(1);
  }
  const leagueId = leagues[0].id;

  const { data: clubs, error: cErr } = await supabase
    .from('clubs')
    .select('id, name, api_football_id')
    .eq('league_id', leagueId)
    .order('name');
  if (cErr) {
    console.error('Failed to load TFF clubs:', cErr.message);
    process.exit(1);
  }
  console.log(`  Loaded ${clubs.length} TFF clubs`);
  console.log('');

  // Step 2: Pre-Flight — Snapshot ALL gap-players (where ANY of 4 fields is NULL/empty)
  console.log('[2/6] Pre-Flight Snapshot — collect gap-players');
  const clubIds = clubs.map((c) => c.id);
  const { data: allPlayers, error: pErr } = await supabase
    .from('players')
    .select('id, first_name, last_name, club_id, api_football_id, image_url, nationality, shirt_number, contract_end')
    .in('club_id', clubIds)
    .order('club_id');
  if (pErr) {
    console.error('Failed to load players:', pErr.message);
    process.exit(1);
  }

  // Build lookup: external_id → player_id (for primary match via player_external_ids)
  // Batched — URL-length limit bei .in() mit 689 UUIDs
  /** @type {Map<string, string>} — external_id (stringified) → player_id (uuid) */
  const mappingApiIdToPlayer = new Map();
  const BATCH = 200;
  const playerIds = allPlayers.map((p) => p.id);
  for (let i = 0; i < playerIds.length; i += BATCH) {
    const slice = playerIds.slice(i, i + BATCH);
    const { data: mappings, error: mErr } = await supabase
      .from('player_external_ids')
      .select('player_id, external_id')
      .eq('source', 'api_football_squad')
      .in('player_id', slice);
    if (mErr) {
      console.error('Failed to load player_external_ids (batch):', mErr.message);
      process.exit(1);
    }
    for (const m of mappings ?? []) {
      mappingApiIdToPlayer.set(String(m.external_id), m.player_id);
    }
  }
  console.log(`  Loaded ${allPlayers.length} players, ${mappingApiIdToPlayer.size} mappings`);

  // Identify gap-players
  const gapPlayers = allPlayers.filter(
    (p) =>
      !p.image_url ||
      !p.nationality ||
      p.nationality === '' ||
      p.shirt_number === null ||
      p.shirt_number === undefined,
  );
  console.log(`  Gap-players (at least 1 of 3 fields missing): ${gapPlayers.length}/${allPlayers.length}`);

  const snapshot = {
    generated_at: new Date().toISOString(),
    purpose: 'Rollback snapshot for TFF player backfill (image_url, nationality, shirt_number)',
    rollback_sql_template:
      "UPDATE players SET image_url = $1, nationality = $2, shirt_number = $3 WHERE id = $4; -- apply per row",
    note: 'contract_end NOT touched — API-Football does not provide contract.end in /players endpoint',
    row_count: gapPlayers.length,
    total_tff_players: allPlayers.length,
    pre_flight_baseline: {
      image_url_pct: (
        (100 * allPlayers.filter((p) => p.image_url).length) / allPlayers.length
      ).toFixed(1),
      nationality_pct: (
        (100 * allPlayers.filter((p) => p.nationality && p.nationality !== '').length) / allPlayers.length
      ).toFixed(1),
      contract_end_pct: (
        (100 * allPlayers.filter((p) => p.contract_end).length) / allPlayers.length
      ).toFixed(1),
      shirt_number_pct: (
        (100 * allPlayers.filter((p) => p.shirt_number !== null && p.shirt_number !== undefined).length) /
        allPlayers.length
      ).toFixed(1),
    },
    rows: gapPlayers,
  };
  writeFileSync(ROLLBACK_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`  Snapshot written: ${ROLLBACK_PATH}`);
  console.log('');

  // Step 3: Fetch API-Football data per club
  console.log('[3/6] Fetch API-Football data per TFF club');

  /** @type {Map<string, {image_url: string|null, nationality: string|null, shirt_number: number|null, matchSource: string}>} — player_id → update payload */
  const updates = new Map();
  let totalMatched = 0;
  let totalUnmatched = 0;
  /** @type {Array<{club: string, first_name: string, last_name: string, reason: string}>} */
  const unmatchedList = [];

  for (let i = 0; i < clubs.length; i++) {
    const club = clubs[i];
    console.log(`  [${String(i + 1).padStart(2)}/${clubs.length}] ${club.name.padEnd(22)} api:${club.api_football_id}`);

    // Get local players for this club
    const localPlayers = allPlayers.filter((p) => p.club_id === club.id);

    // Fetch API data
    let apiPlayers = [];
    let apiSquad = [];
    try {
      apiPlayers = await fetchPlayersForClub(club.api_football_id);
      await sleep(150);
      apiSquad = await fetchSquadForClub(club.api_football_id);
      await sleep(150);
    } catch (err) {
      console.error(`      ERROR fetching API data: ${err.message}`);
      console.error('      ABORT — rollback file preserved. No UPDATE executed.');
      process.exit(1);
    }

    console.log(`       /players: ${apiPlayers.length}, /squads: ${apiSquad.length}, local: ${localPlayers.length}`);

    // Build lookup by api_football_id from /players + /squads (both return same player IDs)
    /** @type {Map<number, {photo: string|null, nationality: string|null, birth: string|null, name: string, lastname: string}>} */
    const apiPlayerMap = new Map();
    for (const entry of apiPlayers) {
      const p = entry.player;
      apiPlayerMap.set(p.id, {
        photo: p.photo ?? null,
        nationality: p.nationality ?? null,
        birth: p.birth?.date ?? null,
        name: p.name ?? '',
        lastname: p.lastname ?? '',
      });
    }

    /** @type {Map<number, {photo: string|null, number: number|null, name: string}>} */
    const apiSquadMap = new Map();
    for (const p of apiSquad) {
      apiSquadMap.set(p.id, {
        photo: p.photo ?? null,
        number: typeof p.number === 'number' ? p.number : null,
        name: p.name ?? '',
      });
    }

    // Match each local player
    for (const local of localPlayers) {
      let apiId = null;
      let matchSource = '';

      // Primary: via player_external_ids (api_football_squad)
      const mapped = mappingApiIdToPlayer.get(String(local.api_football_id));
      if (local.api_football_id && apiPlayerMap.has(local.api_football_id)) {
        apiId = local.api_football_id;
        matchSource = 'db_api_football_id';
      } else if (local.api_football_id && apiSquadMap.has(local.api_football_id)) {
        apiId = local.api_football_id;
        matchSource = 'db_api_football_id_squad_only';
      } else {
        // Fallback: name-match by last_name
        const normLast = normalizeForMatch(local.last_name);
        for (const [id, data] of apiPlayerMap) {
          const apiLast = normalizeForMatch(data.lastname) || normalizeForMatch(data.name.split(' ').pop() ?? '');
          if (apiLast === normLast || (apiLast.length >= 3 && normLast.length >= 3 && (apiLast.includes(normLast) || normLast.includes(apiLast)))) {
            apiId = id;
            matchSource = 'name_fallback';
            break;
          }
        }
        if (!apiId) {
          // Final: try /squads by name
          for (const [id, data] of apiSquadMap) {
            const apiLast = normalizeForMatch(data.name.split(' ').pop() ?? '');
            if (apiLast === normLast || (apiLast.length >= 3 && normLast.length >= 3 && (apiLast.includes(normLast) || normLast.includes(apiLast)))) {
              apiId = id;
              matchSource = 'name_fallback_squad';
              break;
            }
          }
        }
      }

      if (!apiId) {
        totalUnmatched++;
        unmatchedList.push({
          club: club.name,
          first_name: local.first_name,
          last_name: local.last_name,
          reason: 'no_api_match',
        });
        continue;
      }

      // Build update payload — only fields that are currently NULL/empty
      const apiPlayer = apiPlayerMap.get(apiId);
      const apiSquadEntry = apiSquadMap.get(apiId);
      const payload = {};

      // image_url: /squads.photo and /players.photo are identical (API-Football uses player id in path)
      if (!local.image_url) {
        const photo = apiSquadEntry?.photo || apiPlayer?.photo;
        if (photo) payload.image_url = photo;
      }
      // nationality: only /players has it
      if (!local.nationality || local.nationality === '') {
        if (apiPlayer?.nationality) payload.nationality = apiPlayer.nationality;
      }
      // shirt_number: /squads.number is authoritative. /players.games.number is appearances-count (WRONG)
      // Only fill if currently NULL (NOT 0 — 0 is a legitimate value, 3 rows have it explicitly)
      if (local.shirt_number === null || local.shirt_number === undefined) {
        if (apiSquadEntry?.number !== null && apiSquadEntry?.number !== undefined) {
          payload.shirt_number = apiSquadEntry.number;
        }
      }

      if (Object.keys(payload).length === 0) continue;

      updates.set(local.id, { ...payload, matchSource, apiId, localName: `${local.first_name} ${local.last_name}`, club: club.name });
      totalMatched++;
    }
  }

  console.log('');
  console.log(`  API calls: ${apiCallCount}`);
  console.log(`  Matched: ${totalMatched}, Unmatched: ${totalUnmatched}`);
  console.log('');

  // Step 4: Show plan
  console.log('[4/6] Planned UPDATEs (by field):');
  let planImage = 0, planNat = 0, planShirt = 0;
  for (const [, u] of updates) {
    if (u.image_url !== undefined) planImage++;
    if (u.nationality !== undefined) planNat++;
    if (u.shirt_number !== undefined) planShirt++;
  }
  console.log(`  image_url:    ${planImage} players`);
  console.log(`  nationality:  ${planNat} players`);
  console.log(`  shirt_number: ${planShirt} players`);
  console.log(`  contract_end: 0 players (API-Football does not provide)`);
  console.log('');

  // Show first 5 for sanity
  console.log('  Sample (first 5):');
  let shown = 0;
  for (const [id, u] of updates) {
    if (shown >= 5) break;
    const fields = [];
    if (u.image_url !== undefined) fields.push('image');
    if (u.nationality !== undefined) fields.push(`nat=${u.nationality}`);
    if (u.shirt_number !== undefined) fields.push(`#${u.shirt_number}`);
    console.log(`    - ${u.club.padEnd(22)} ${u.localName.padEnd(32)} [${u.matchSource}] ← ${fields.join(', ')}`);
    shown++;
  }
  console.log('');

  if (DRY_RUN) {
    console.log('[5/6] DRY RUN — no UPDATE executed.');
    console.log('[6/6] Done (dry).');
    console.log('');
    console.log('To apply: node scripts/backfill-tff-players.mjs');
    // Log unmatched for review
    if (unmatchedList.length > 0) {
      console.log('');
      console.log(`  Unmatched (${unmatchedList.length}):`);
      unmatchedList.slice(0, 10).forEach((u) => {
        console.log(`    - ${u.club}: ${u.first_name} ${u.last_name}`);
      });
      if (unmatchedList.length > 10) console.log(`    ... and ${unmatchedList.length - 10} more`);
    }
    return;
  }

  // Step 5: Apply UPDATEs
  console.log('[5/6] Applying UPDATEs...');
  let appliedImage = 0, appliedNat = 0, appliedShirt = 0, failed = 0;
  let idx = 0;
  for (const [playerId, u] of updates) {
    idx++;
    const updateRow = {};
    if (u.image_url !== undefined) updateRow.image_url = u.image_url;
    if (u.nationality !== undefined) updateRow.nationality = u.nationality;
    if (u.shirt_number !== undefined) updateRow.shirt_number = u.shirt_number;

    const { error } = await supabase.from('players').update(updateRow).eq('id', playerId);
    if (error) {
      failed++;
      console.error(`    FAIL ${idx}/${updates.size}: ${u.localName} (${u.club}) — ${error.message}`);
      continue;
    }
    if (updateRow.image_url !== undefined) appliedImage++;
    if (updateRow.nationality !== undefined) appliedNat++;
    if (updateRow.shirt_number !== undefined) appliedShirt++;
  }
  console.log(`  Updates applied: ${updates.size - failed}/${updates.size} (failed: ${failed})`);
  console.log(`    image_url:    ${appliedImage}`);
  console.log(`    nationality:  ${appliedNat}`);
  console.log(`    shirt_number: ${appliedShirt}`);
  console.log('');

  // Step 6: Post-Verify via fresh SELECT
  console.log('[6/6] Post-Verify');
  const { data: afterPlayers, error: afterErr } = await supabase
    .from('players')
    .select('id, image_url, nationality, shirt_number, contract_end')
    .in('club_id', clubIds);
  if (afterErr) { console.error('Post-verify failed:', afterErr.message); process.exit(1); }

  const total = afterPlayers.length;
  const imageOk = afterPlayers.filter((p) => p.image_url).length;
  const natOk = afterPlayers.filter((p) => p.nationality && p.nationality !== '').length;
  const contractOk = afterPlayers.filter((p) => p.contract_end).length;
  const shirtOk = afterPlayers.filter((p) => p.shirt_number !== null && p.shirt_number !== undefined).length;
  const pct = (n) => ((100 * n) / total).toFixed(1);

  console.log(`  Total TFF players: ${total}`);
  console.log(`  image_url:    ${imageOk}/${total} = ${pct(imageOk)}%  (was 73.3%, target >=95%)`);
  console.log(`  nationality:  ${natOk}/${total} = ${pct(natOk)}%  (was 77.9%, target >=95%)`);
  console.log(`  contract_end: ${contractOk}/${total} = ${pct(contractOk)}%  (was 76.1%, NOT IN SCOPE)`);
  console.log(`  shirt_number: ${shirtOk}/${total} = ${pct(shirtOk)}%  (was 82.7%, target >=95%)`);
  console.log('');

  if (unmatchedList.length > 0) {
    console.log(`  Unmatched players (${unmatchedList.length}) — logged in rollback file:`);
    unmatchedList.slice(0, 10).forEach((u) => {
      console.log(`    - ${u.club}: ${u.first_name} ${u.last_name}`);
    });
    if (unmatchedList.length > 10) console.log(`    ... and ${unmatchedList.length - 10} more`);
  }

  console.log('');
  console.log('='.repeat(70));
  console.log(`DONE — Updated ${updates.size - failed}/${updates.size} players. Rollback at ${ROLLBACK_PATH}`);
  console.log('='.repeat(70));

  // Re-write snapshot with unmatched list appended
  try {
    const enriched = JSON.parse(readFileSync(ROLLBACK_PATH, 'utf-8'));
    enriched.post_run = {
      applied_at: new Date().toISOString(),
      updates_attempted: updates.size,
      updates_failed: failed,
      unmatched: unmatchedList,
      post_verify: {
        image_url_pct: pct(imageOk),
        nationality_pct: pct(natOk),
        contract_end_pct: pct(contractOk),
        shirt_number_pct: pct(shirtOk),
      },
    };
    writeFileSync(ROLLBACK_PATH, JSON.stringify(enriched, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not append post-run info to rollback:', err.message);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
