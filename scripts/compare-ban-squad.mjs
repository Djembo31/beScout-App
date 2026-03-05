#!/usr/bin/env node
/**
 * Compare Bandirmaspor squad: API-Football vs local DB, side-by-side.
 * Shows which API players might match which local players.
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

function normalizeForMatch(text) {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Fetch API squad
const res = await fetch('https://v3.football.api-sports.io/players/squads?team=3584', {
  headers: { 'x-apisports-key': API_KEY },
});
const data = await res.json();
const apiSquad = data.response?.[0]?.players ?? [];

// Fetch local BAN players
const { data: banClub } = await supabase
  .from('clubs')
  .select('id')
  .eq('short', 'BAN')
  .single();

const [{ data: localPlayersRaw }, { data: extIds }] = await Promise.all([
  supabase.from('players').select('id, first_name, last_name, shirt_number, position').eq('club_id', banClub.id).order('last_name'),
  supabase.from('player_external_ids').select('player_id').eq('source', 'api_football_squad'),
]);
const mappedPlayerIds = new Set((extIds ?? []).map(e => e.player_id));
const localPlayers = (localPlayersRaw ?? []).map(p => ({ ...p, isMapped: mappedPlayerIds.has(p.id) }));

console.log(`\n=== Bandırmaspor Squad Comparison ===\n`);
console.log(`API-Football: ${apiSquad.length} players`);
console.log(`Local DB: ${localPlayers?.length ?? 0} players\n`);

// Show API squad
console.log('--- API-Football Squad ---');
for (const p of apiSquad.sort((a, b) => a.name.localeCompare(b.name))) {
  const norm = normalizeForMatch(p.name);
  console.log(`  #${String(p.number ?? '?').padStart(2)} ${p.position.padEnd(12)} ${p.name.padEnd(30)} (API#${p.id}) [norm: ${norm}]`);
}

console.log('\n--- Local DB Squad (unmapped) ---');
for (const p of (localPlayers ?? [])) {
  if (p.isMapped) continue;
  const normFirst = normalizeForMatch(p.first_name);
  const normLast = normalizeForMatch(p.last_name);
  console.log(`  #${String(p.shirt_number).padStart(2)} ${p.position.padEnd(4)} ${(p.first_name + ' ' + p.last_name).padEnd(30)} [norm: ${normFirst} ${normLast}]`);
}

// Try relaxed matching: any shared word >= 4 chars
console.log('\n--- Potential Matches (relaxed, shared words >= 4 chars) ---');
for (const apiP of apiSquad) {
  const apiParts = normalizeForMatch(apiP.name).split(/\s+/).filter(p => p.length >= 4);

  for (const localP of (localPlayers ?? [])) {
    if (localP.isMapped) continue;
    const localParts = [
      ...normalizeForMatch(localP.first_name).split(/\s+/).filter(p => p.length >= 4),
      ...normalizeForMatch(localP.last_name).split(/\s+/).filter(p => p.length >= 4),
    ];

    const shared = apiParts.filter(ap => localParts.some(lp => ap === lp || ap.startsWith(lp) || lp.startsWith(ap)));

    if (shared.length > 0) {
      console.log(`  API: ${apiP.name} (#${apiP.number}) → DB: ${localP.first_name} ${localP.last_name} (#${localP.shirt_number}) — shared: [${shared.join(', ')}]`);
    }
  }
}

console.log('\nDone!');
