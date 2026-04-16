#!/usr/bin/env node
/**
 * Enrich players by individual API-Football ID lookup.
 * For players not found in season-based squad responses.
 *
 * Usage: node scripts/enrich-by-id.mjs [--league=BL2]
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
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const API_BASE = 'https://v3.football.api-sports.io';

let apiCalls = 0;

async function apiFetch(endpoint) {
  apiCalls++;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return await res.json();
}

async function main() {
  // Get all players with missing nationality and valid api_football_id
  const LEAGUE_FILTER = process.argv.find(a => a.startsWith('--league='))?.split('=')[1] ?? null;

  let query = supabase
    .from('players')
    .select('id, api_football_id, first_name, last_name, nationality, age, clubs!inner(league_id, leagues!inner(short))')
    .or('nationality.is.null,nationality.eq.')
    .not('api_football_id', 'is', null);

  const { data: players, error } = await query.limit(500);
  if (error) { console.error(error.message); process.exit(1); }

  // Filter by league if specified
  let filtered = players ?? [];
  if (LEAGUE_FILTER) {
    filtered = filtered.filter(p => p.clubs?.leagues?.short === LEAGUE_FILTER);
  }

  console.log(`Found ${filtered.length} players needing nationality enrichment\n`);

  let updated = 0;
  let notFound = 0;

  for (const player of filtered) {
    try {
      const res = await apiFetch(`/players?id=${player.api_football_id}&season=2025`);
      const apiPlayer = res.response?.[0]?.player;

      if (!apiPlayer) {
        // Try without season
        const res2 = await apiFetch(`/players?id=${player.api_football_id}`);
        const apiPlayer2 = res2.response?.[0]?.player;
        if (!apiPlayer2) {
          notFound++;
          continue;
        }
        // Use latest data
        const update = {};
        if (apiPlayer2.nationality) update.nationality = apiPlayer2.nationality;
        if (apiPlayer2.age) update.age = apiPlayer2.age;

        if (Object.keys(update).length > 0) {
          await supabase.from('players').update(update).eq('id', player.id);
          updated++;
          console.log(`  ✅ ${player.first_name} ${player.last_name}: ${update.nationality ?? '?'}`);
        }
        continue;
      }

      const update = {};
      if (apiPlayer.nationality) update.nationality = apiPlayer.nationality;
      if (apiPlayer.age && (!player.age || player.age === 0)) update.age = apiPlayer.age;

      if (Object.keys(update).length > 0) {
        await supabase.from('players').update(update).eq('id', player.id);
        updated++;
        console.log(`  ✅ ${player.first_name} ${player.last_name}: ${update.nationality ?? '?'}`);
      }
    } catch (err) {
      console.error(`  ❌ ${player.first_name} ${player.last_name}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${updated} updated, ${notFound} not found, ${apiCalls} API calls`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
