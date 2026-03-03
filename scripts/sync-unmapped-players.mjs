#!/usr/bin/env node
/**
 * Sync unmapped players: Fetch API-Football squads for all clubs,
 * match unmapped local players by name/shirt-number, update api_football_id.
 *
 * Usage: node scripts/sync-unmapped-players.mjs [--dry-run]
 *
 * Reads .env.local for API_FOOTBALL_KEY and SUPABASE_SERVICE_ROLE_KEY.
 * API cost: 20 calls (1 per club).
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local (handle Windows \r\n)
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

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return await res.json();
}

function normalizeForMatch(text) {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

console.log(`\n=== Sync Unmapped Players ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

// Load all clubs with api_football_id
const { data: clubs } = await supabase
  .from('clubs')
  .select('id, name, short, api_football_id')
  .not('api_football_id', 'is', null)
  .order('short');

console.log(`Clubs with API mapping: ${clubs?.length ?? 0}`);

// Load ALL players (not just unmapped, we need to prevent duplicate mappings)
const { data: allPlayers } = await supabase
  .from('players')
  .select('id, first_name, last_name, shirt_number, position, club_id, api_football_id');

const alreadyMappedApiIds = new Set(
  (allPlayers ?? []).filter(p => p.api_football_id).map(p => p.api_football_id)
);
const alreadyMappedPlayerIds = new Set(
  (allPlayers ?? []).filter(p => p.api_football_id).map(p => p.id)
);

const unmappedByClub = new Map();
for (const p of (allPlayers ?? [])) {
  if (p.api_football_id) continue;
  const arr = unmappedByClub.get(p.club_id) || [];
  arr.push(p);
  unmappedByClub.set(p.club_id, arr);
}

const totalUnmapped = Array.from(unmappedByClub.values()).reduce((s, a) => s + a.length, 0);
console.log(`Total unmapped players: ${totalUnmapped}\n`);

let totalApiCalls = 0;
let totalMatched = 0;
let totalSkipped = 0;
const allUnmatched = [];
const allMatches = [];
const allErrors = [];

for (const club of (clubs ?? [])) {
  const unmapped = unmappedByClub.get(club.id);
  if (!unmapped || unmapped.length === 0) {
    continue;
  }

  console.log(`\n--- ${club.short} (${club.name}) — ${unmapped.length} unmapped ---`);

  try {
    const data = await apiFetch(`/players/squads?team=${club.api_football_id}`);
    totalApiCalls++;
    const squad = data.response?.[0]?.players ?? [];
    console.log(`  API squad: ${squad.length} players`);

    for (const apiPlayer of squad) {
      // Skip if this API player is already mapped to someone
      if (alreadyMappedApiIds.has(apiPlayer.id)) continue;

      const apiName = normalizeForMatch(apiPlayer.name);
      const apiNameParts = apiName.split(/\s+/).filter(p => p.length > 0);

      const candidates = [];

      for (const p of unmapped) {
        // Skip if already matched in this run
        if (alreadyMappedPlayerIds.has(p.id)) continue;

        const lastName = normalizeForMatch(p.last_name);
        const firstName = normalizeForMatch(p.first_name);
        let score = 0;

        const shirtMatch = apiPlayer.number != null && p.shirt_number === apiPlayer.number;
        const lastNameExact = apiNameParts.some(part => lastName === part);
        const firstNameExact = apiNameParts.some(part =>
          firstName === part || (firstName.length >= 3 && firstName.startsWith(part) && part.length >= 3)
        );

        // Tier 1: Last name exact + shirt number — score 100
        if (shirtMatch && lastNameExact) {
          score = 100;
        }
        // Tier 2: Full name parts match (first + last) — score 80-90
        else if (lastNameExact && firstNameExact) {
          score = shirtMatch ? 90 : 80;
        }
        // Tier 3: Last name exact match only — must be 5+ chars — score 60-70
        else if (apiNameParts.some(part => part.length >= 5 && lastName === part && lastName.length >= 5)) {
          score = shirtMatch ? 70 : 60;
        }
        // Tier 4: Shirt number + partial last name (min 5 chars) — score 50
        else if (shirtMatch && apiNameParts.some(part =>
          part.length >= 5 && (lastName.startsWith(part) || part.startsWith(lastName)) && lastName.length >= 4
        )) {
          score = 50;
        }
        // Tier 5 (NEW): First name exact + shirt number — score 45
        else if (shirtMatch && firstNameExact && firstName.length >= 4) {
          score = 45;
        }

        if (score > 0) {
          candidates.push({ player: p, score });
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];

        // Skip ambiguous
        if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
          const names = candidates
            .filter(c => c.score === best.score)
            .map(c => `${c.player.first_name} ${c.player.last_name}`)
            .join(', ');
          allUnmatched.push(`  ${apiPlayer.name} (API#${apiPlayer.id}, ${club.short}) — AMBIGUOUS: ${names}`);
          continue;
        }

        allMatches.push({
          playerId: best.player.id,
          apiFootballId: apiPlayer.id,
          localName: `${best.player.first_name} ${best.player.last_name}`,
          apiName: apiPlayer.name,
          club: club.short,
          score: best.score,
          shirt: apiPlayer.number,
        });

        alreadyMappedApiIds.add(apiPlayer.id);
        alreadyMappedPlayerIds.add(best.player.id);
        totalMatched++;

        console.log(`  ✓ ${best.player.first_name} ${best.player.last_name} → ${apiPlayer.name} (API#${apiPlayer.id}, score=${best.score})`);
      }
    }

    // Report unmapped API players (not in our DB at all)
    const mappedApiIdsForClub = new Set(allMatches.filter(m => m.club === club.short).map(m => m.apiFootballId));
    const unmatchedApi = squad.filter(s =>
      !alreadyMappedApiIds.has(s.id) || mappedApiIdsForClub.has(s.id) ? false : !alreadyMappedApiIds.has(s.id)
    );

    // Report our players that still have no match
    const matchedLocalIds = new Set(allMatches.filter(m => m.club === club.short).map(m => m.playerId));
    const stillUnmapped = unmapped.filter(p => !matchedLocalIds.has(p.id) && !alreadyMappedPlayerIds.has(p.id));
    if (stillUnmapped.length > 0) {
      for (const p of stillUnmapped) {
        allUnmatched.push(`  ${p.first_name} ${p.last_name} #${p.shirt_number} (${club.short}) — NO API MATCH`);
      }
    }

    // Small delay between API calls
    await new Promise(r => setTimeout(r, 200));
  } catch (e) {
    allErrors.push(`${club.short}: ${e.message}`);
    console.log(`  ERROR: ${e.message}`);
  }
}

// Apply updates
if (!DRY_RUN && allMatches.length > 0) {
  console.log(`\n=== Applying ${allMatches.length} mappings... ===`);

  let updated = 0;
  let errors = 0;

  for (const m of allMatches) {
    const { error } = await supabase
      .from('players')
      .update({ api_football_id: m.apiFootballId })
      .eq('id', m.playerId);

    if (error) {
      allErrors.push(`Update ${m.localName}: ${error.message}`);
      errors++;
    } else {
      updated++;
    }
  }

  console.log(`Updated: ${updated}, Errors: ${errors}`);
}

// Summary
console.log(`\n=== Summary ===`);
console.log(`API calls: ${totalApiCalls}`);
console.log(`Matched: ${totalMatched}`);
console.log(`DRY_RUN: ${DRY_RUN}`);

if (allMatches.length > 0) {
  console.log(`\nAll matches (${allMatches.length}):`);
  for (const m of allMatches) {
    console.log(`  ${m.club}: ${m.localName} → ${m.apiName} (API#${m.apiFootballId}, score=${m.score}, shirt=${m.shirt})`);
  }
}

if (allUnmatched.length > 0) {
  console.log(`\nStill unmatched (${allUnmatched.length}):`);
  for (const u of allUnmatched) {
    console.log(u);
  }
}

if (allErrors.length > 0) {
  console.log(`\nErrors (${allErrors.length}):`);
  for (const e of allErrors) {
    console.log(`  - ${e}`);
  }
}

// Final status check
if (!DRY_RUN) {
  const { data: finalStatus } = await supabase
    .from('players')
    .select('id, api_football_id')
    .not('api_football_id', 'is', null);

  const { data: totalPlayers } = await supabase
    .from('players')
    .select('id');

  console.log(`\nFinal mapping: ${finalStatus?.length ?? 0}/${totalPlayers?.length ?? 0} players mapped`);
}

console.log('\nDone!');
