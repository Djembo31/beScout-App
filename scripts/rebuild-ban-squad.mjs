#!/usr/bin/env node
/**
 * Rebuild Bandırmaspor squad from API-Football data.
 *
 * Old squad (29 players) has 0 stats, 0 holdings, 0 lineups — safe to replace.
 * New squad from API-Football will have api_football_id set immediately.
 *
 * Usage: node scripts/rebuild-ban-squad.mjs [--dry-run]
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

if (!API_KEY) { console.error('Missing API_FOOTBALL_KEY'); process.exit(1); }
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');

function mapPosition(apiPos) {
  const p = apiPos.toUpperCase();
  if (p.includes('GOAL')) return 'GK';
  if (p.includes('DEF')) return 'DEF';
  if (p.includes('MID')) return 'MID';
  return 'ATT';
}

function parseApiName(fullName) {
  // API names are like "A. Özçimen" or "Douglas Tanque" or "Enes Aydın"
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };

  // If first part is single letter with dot (e.g. "A."), it's an initial
  if (parts[0].length <= 2 && parts[0].endsWith('.')) {
    return { first: parts[0].replace('.', ''), last: parts.slice(1).join(' ') };
  }

  // Otherwise: last part(s) are last name, first part(s) are first name
  // For 2-part names: "Douglas Tanque" → first=Douglas, last=Tanque
  // For 3-part names: "Y. Can Esendemir" → first=Y, last=Can Esendemir
  if (parts[0].length <= 2) {
    return { first: parts[0].replace('.', ''), last: parts.slice(1).join(' ') };
  }

  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

console.log(`\n=== Rebuild Bandırmaspor Squad ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

// Get BAN club + its API-Football external ID
const { data: banClub } = await supabase
  .from('clubs')
  .select('id, name')
  .eq('short', 'BAN')
  .single();

if (!banClub) { console.error('BAN club not found'); process.exit(1); }

const { data: banExtId } = await supabase
  .from('club_external_ids')
  .select('external_id')
  .eq('club_id', banClub.id)
  .eq('source', 'api_football')
  .single();

const banApiFootballId = banExtId ? parseInt(banExtId.external_id, 10) : null;
if (!banApiFootballId) { console.error('BAN has no api_football external ID'); process.exit(1); }
console.log(`Club: ${banClub.name} (API#${banApiFootballId})`);

// Fetch API squad
const res = await fetch(`https://v3.football.api-sports.io/players/squads?team=${banApiFootballId}`, {
  headers: { 'x-apisports-key': API_KEY },
});
const data = await res.json();
const apiSquad = data.response?.[0]?.players ?? [];
console.log(`API squad: ${apiSquad.length} players\n`);

// Get old players
const { data: oldPlayers } = await supabase
  .from('players')
  .select('id, first_name, last_name')
  .eq('club_id', banClub.id);

console.log(`Old DB players: ${oldPlayers?.length ?? 0}\n`);

// Build new player records (without api_football_id — goes to player_external_ids)
const newPlayers = apiSquad.map(ap => {
  const { first, last } = parseApiName(ap.name);
  return {
    first_name: first,
    last_name: last,
    club_id: banClub.id,
    position: mapPosition(ap.position),
    shirt_number: ap.number ?? 0,
    _apiFootballId: ap.id, // Stored in player_external_ids after insert
    // Default values for required fields
    market_value_eur: 0,
    ipo_price: 100,  // Minimum
    total_shares: 1000,
    available_shares: 1000,
    perf_l5: 0,
    perf_l15: 0,
    goals: 0,
    assists: 0,
    clean_sheets: 0,
    yellow_cards: 0,
    red_cards: 0,
  };
});

console.log('New players to insert:');
for (const p of newPlayers) {
  console.log(`  #${String(p.shirt_number).padStart(2)} ${p.position.padEnd(3)} ${p.first_name} ${p.last_name} (API#${p._apiFootballId})`);
}

if (DRY_RUN) {
  console.log('\nDRY RUN — no changes made');
  process.exit(0);
}

// Step 1: Delete old players
console.log(`\nStep 1: Deleting ${oldPlayers?.length ?? 0} old players...`);
const oldIds = (oldPlayers ?? []).map(p => p.id);
if (oldIds.length > 0) {
  const { error: delErr } = await supabase
    .from('players')
    .delete()
    .in('id', oldIds);

  if (delErr) {
    console.error(`Delete error: ${delErr.message}`);
    process.exit(1);
  }
  console.log(`  Deleted ${oldIds.length} old players`);
}

// Step 2: Insert new players (strip _apiFootballId before insert)
console.log(`\nStep 2: Inserting ${newPlayers.length} new players...`);
const playersToInsert = newPlayers.map(({ _apiFootballId, ...rest }) => rest);
const { data: inserted, error: insErr } = await supabase
  .from('players')
  .insert(playersToInsert)
  .select('id, first_name, last_name');

if (insErr) {
  console.error(`Insert error: ${insErr.message}`);
  process.exit(1);
}
console.log(`  Inserted ${inserted?.length ?? 0} new players`);

// Step 2b: Insert external IDs into player_external_ids
console.log(`\nStep 2b: Writing external IDs to player_external_ids...`);
const extIdRows = [];
for (let i = 0; i < (inserted ?? []).length; i++) {
  const player = inserted[i];
  const apiId = newPlayers[i]._apiFootballId;
  if (player && apiId) {
    extIdRows.push({
      player_id: player.id,
      source: 'api_football_squad',
      external_id: String(apiId),
    });
  }
}
if (extIdRows.length > 0) {
  const { error: extErr } = await supabase
    .from('player_external_ids')
    .upsert(extIdRows, { onConflict: 'player_id,source' });
  if (extErr) console.error(`External ID insert error: ${extErr.message}`);
  else console.log(`  Mapped ${extIdRows.length} external IDs`);
}

// Step 3: Verify
const { data: verify } = await supabase
  .from('players')
  .select('id, first_name, last_name, position, shirt_number')
  .eq('club_id', banClub.id)
  .order('last_name');

const { data: verifyExtIds } = await supabase
  .from('player_external_ids')
  .select('player_id')
  .eq('source', 'api_football_squad')
  .in('player_id', (verify ?? []).map(v => v.id));

console.log(`\nVerification: ${verify?.length ?? 0} BAN players in DB`);
console.log(`  With external ID: ${verifyExtIds?.length ?? 0}`);

console.log('\nDone! Next: run backfill-ratings for BAN fixtures.');
