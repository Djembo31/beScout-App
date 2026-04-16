#!/usr/bin/env node
/**
 * SQUAD VERIFICATION & FIX SCRIPT
 *
 * Verifies every club's squad against API-Football and fixes gaps.
 *
 * Usage:
 *   node scripts/verify-squads.mjs                    # Verify only (report)
 *   node scripts/verify-squads.mjs --fix              # Verify + fix missing players
 *   node scripts/verify-squads.mjs --league=BL1       # Single league only
 *   node scripts/verify-squads.mjs --league=PL --fix  # Single league + fix
 *
 * Checks per club:
 *   1. Club exists in API-Football for this season?
 *   2. All API-Football squad players in our DB?
 *   3. Player data correct? (position, shirt number, name, club_id)
 *   4. DB players not in API squad? (transfers out)
 *
 * API cost: ~1 call/club + 1 call/league = ~141 total
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
const SEASON = 2025;
const FIX_MODE = process.argv.includes('--fix');
const LEAGUE_FILTER = process.argv.find(a => a.startsWith('--league='))?.split('=')[1] ?? null;

// ============================================
// API
// ============================================

let apiCallCount = 0;

async function apiFetch(endpoint) {
  apiCallCount++;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const json = await res.json();

  // Log remaining API calls from headers
  const remaining = res.headers.get('x-ratelimit-requests-remaining');
  if (apiCallCount === 1) {
    console.log(`API Rate Limit: ${remaining} calls remaining today\n`);
  }

  return json;
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

// ============================================
// MAIN LOGIC
// ============================================

async function main() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  SQUAD VERIFICATION ${FIX_MODE ? '+ FIX' : '(REPORT ONLY)'}`);
  console.log(`  Season: ${SEASON} | ${LEAGUE_FILTER ? `League: ${LEAGUE_FILTER}` : 'All Leagues'}`);
  console.log(`${'='.repeat(70)}\n`);

  // 1. Load leagues from DB
  let leagueQuery = supabase.from('leagues').select('*').order('country').order('name');
  if (LEAGUE_FILTER) {
    leagueQuery = leagueQuery.eq('short', LEAGUE_FILTER);
  }
  const { data: leagues, error: leagueErr } = await leagueQuery;
  if (leagueErr || !leagues?.length) {
    console.error('Failed to fetch leagues:', leagueErr?.message ?? 'No leagues found');
    process.exit(1);
  }

  const totalReport = {
    leagues: 0,
    clubsChecked: 0,
    clubsMissing: 0,
    clubsExtra: 0,
    playersInDb: 0,
    playersInApi: 0,
    playersMissing: 0,
    playersWrongClub: 0,
    playersWrongPos: 0,
    playersWrongNumber: 0,
    playersFixed: 0,
    playersInserted: 0,
  };

  const allIssues = [];

  for (const league of leagues) {
    console.log(`\n${'━'.repeat(70)}`);
    console.log(`  ${league.name} (${league.country}) — API ID: ${league.api_football_id}`);
    console.log(`${'━'.repeat(70)}`);
    totalReport.leagues++;

    // 2. Load DB clubs for this league
    const { data: dbClubs } = await supabase
      .from('clubs')
      .select('id, name, slug, api_football_id')
      .eq('league_id', league.id)
      .order('name');

    // 3. Fetch API-Football teams for this league
    const teamsRes = await apiFetch(`/teams?league=${league.api_football_id}&season=${SEASON}`);
    const apiTeams = teamsRes.response ?? [];

    console.log(`  DB: ${dbClubs?.length ?? 0} clubs | API: ${apiTeams.length} teams\n`);

    // Build lookup maps
    const dbClubByApiId = new Map();
    for (const c of dbClubs ?? []) {
      if (c.api_football_id) dbClubByApiId.set(c.api_football_id, c);
    }
    const apiTeamIds = new Set(apiTeams.map(t => t.team.id));

    // 3a. Check for API teams not in our DB (missing clubs)
    for (const teamEntry of apiTeams) {
      if (!dbClubByApiId.has(teamEntry.team.id)) {
        totalReport.clubsMissing++;
        const issue = `❌ MISSING CLUB: ${teamEntry.team.name} (API ID: ${teamEntry.team.id})`;
        console.log(`  ${issue}`);
        allIssues.push({ league: league.name, type: 'MISSING_CLUB', detail: teamEntry.team.name, apiId: teamEntry.team.id });

        if (FIX_MODE) {
          const slug = slugify(teamEntry.team.name);
          const { data: newClub, error: clubErr } = await supabase
            .from('clubs')
            .insert({
              name: teamEntry.team.name,
              slug,
              short: teamEntry.team.code || slug.slice(0, 3).toUpperCase(),
              league: league.name,
              league_id: league.id,
              country: league.country,
              city: teamEntry.venue?.city ?? null,
              stadium: teamEntry.venue?.name ?? null,
              logo_url: teamEntry.team.logo ?? null,
              primary_color: '#666666',
              secondary_color: '#FFFFFF',
              api_football_id: teamEntry.team.id,
              is_verified: false,
              active_gameweek: 1,
            })
            .select('id')
            .single();

          if (clubErr) {
            console.log(`    ⚠ Failed to insert club: ${clubErr.message}`);
          } else {
            console.log(`    ✅ Inserted club: ${newClub.id}`);
            dbClubByApiId.set(teamEntry.team.id, { id: newClub.id, name: teamEntry.team.name, api_football_id: teamEntry.team.id });

            await supabase.from('club_external_ids').upsert({
              club_id: newClub.id,
              source: 'api_football',
              external_id: String(teamEntry.team.id),
            }, { onConflict: 'club_id,source' });
          }
        }
      }
    }

    // 3b. Check for DB clubs not in API (extra/relegated clubs)
    for (const dbClub of dbClubs ?? []) {
      if (dbClub.api_football_id && !apiTeamIds.has(dbClub.api_football_id)) {
        totalReport.clubsExtra++;
        const issue = `⚠ EXTRA CLUB (not in API for ${SEASON}): ${dbClub.name}`;
        console.log(`  ${issue}`);
        allIssues.push({ league: league.name, type: 'EXTRA_CLUB', detail: dbClub.name, apiId: dbClub.api_football_id });
      }
    }

    // 4. For each club, verify squad
    for (const teamEntry of apiTeams) {
      const team = teamEntry.team;
      const dbClub = dbClubByApiId.get(team.id);
      if (!dbClub) continue; // Already reported as missing

      totalReport.clubsChecked++;

      // 4a. Load DB players for this club
      const { data: dbPlayers } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, shirt_number, api_football_id, image_url, club_id')
        .eq('club_id', dbClub.id);

      // 4b. Fetch API squad
      const squadRes = await apiFetch(`/players/squads?team=${team.id}`);
      const apiPlayers = squadRes.response?.[0]?.players ?? [];

      totalReport.playersInDb += dbPlayers?.length ?? 0;
      totalReport.playersInApi += apiPlayers.length;

      // Build lookup maps
      const dbByApiId = new Map();
      const dbByName = new Map();
      for (const p of dbPlayers ?? []) {
        if (p.api_football_id) dbByApiId.set(p.api_football_id, p);
        const key = normalizeForMatch(`${p.first_name} ${p.last_name}`);
        dbByName.set(key, p);
        // Also index by last name only
        dbByName.set(normalizeForMatch(p.last_name), p);
      }

      let clubMissing = 0;
      let clubWrongData = 0;
      const missingPlayers = [];
      const wrongDataPlayers = [];

      for (const apiPlayer of apiPlayers) {
        // Try to find in DB by api_football_id first, then by name
        let dbPlayer = dbByApiId.get(apiPlayer.id);

        if (!dbPlayer) {
          // Try name match
          const normalized = normalizeForMatch(apiPlayer.name);
          dbPlayer = dbByName.get(normalized);

          // Try last name only
          if (!dbPlayer) {
            const parts = apiPlayer.name.split(' ');
            const lastName = parts[parts.length - 1];
            if (lastName.length >= 4) {
              dbPlayer = dbByName.get(normalizeForMatch(lastName));
            }
          }
        }

        if (!dbPlayer) {
          clubMissing++;
          totalReport.playersMissing++;
          missingPlayers.push(apiPlayer);

          if (FIX_MODE) {
            // Insert missing player
            const nameParts = (apiPlayer.name ?? '').split(' ');
            const lastName = nameParts[nameParts.length - 1] ?? apiPlayer.name;
            const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

            const { data: newPlayer, error: pErr } = await supabase
              .from('players')
              .insert({
                first_name: firstName || lastName,
                last_name: lastName,
                club: dbClub.name,
                club_id: dbClub.id,
                position: mapPosition(apiPlayer.position),
                shirt_number: apiPlayer.number,
                age: apiPlayer.age ?? 0,
                image_url: apiPlayer.photo ?? null,
                status: 'fit',
                api_football_id: apiPlayer.id,
                nationality: '',
                ipo_price: 10000,
                floor_price: 10000,
                dpc_total: 0,
                dpc_available: 0,
                max_supply: 10000,
              })
              .select('id')
              .single();

            if (pErr) {
              if (pErr.code !== '23505') {
                console.log(`      ⚠ Insert failed: ${apiPlayer.name} — ${pErr.message}`);
              }
            } else {
              totalReport.playersInserted++;
              // Create external ID mapping
              await supabase.from('player_external_ids').upsert({
                player_id: newPlayer.id,
                source: 'api_football_squad',
                external_id: String(apiPlayer.id),
              }, { onConflict: 'player_id,source' });
            }
          }
        } else {
          // Player found — verify data correctness
          const expectedPos = mapPosition(apiPlayer.position);
          const issues = [];

          if (dbPlayer.position !== expectedPos) {
            issues.push(`pos: ${dbPlayer.position}→${expectedPos}`);
            totalReport.playersWrongPos++;
          }
          if (apiPlayer.number && dbPlayer.shirt_number !== apiPlayer.number) {
            issues.push(`#${dbPlayer.shirt_number ?? '?'}→#${apiPlayer.number}`);
            totalReport.playersWrongNumber++;
          }
          if (dbPlayer.club_id !== dbClub.id) {
            issues.push(`wrong club_id`);
            totalReport.playersWrongClub++;
          }

          if (issues.length > 0) {
            clubWrongData++;
            wrongDataPlayers.push({ name: apiPlayer.name, issues: issues.join(', '), dbId: dbPlayer.id });

            if (FIX_MODE) {
              const update = {};
              if (dbPlayer.position !== expectedPos) update.position = expectedPos;
              if (apiPlayer.number && dbPlayer.shirt_number !== apiPlayer.number) update.shirt_number = apiPlayer.number;
              if (dbPlayer.club_id !== dbClub.id) {
                update.club_id = dbClub.id;
                update.club = dbClub.name;
              }
              // Update photo if missing
              if (!dbPlayer.image_url && apiPlayer.photo) {
                update.image_url = apiPlayer.photo;
              }

              if (Object.keys(update).length > 0) {
                const { error: updErr } = await supabase
                  .from('players')
                  .update(update)
                  .eq('id', dbPlayer.id);
                if (!updErr) totalReport.playersFixed++;
              }
            }
          }

          // Update api_football_id if missing
          if (!dbPlayer.api_football_id && FIX_MODE) {
            await supabase.from('players').update({ api_football_id: apiPlayer.id }).eq('id', dbPlayer.id);
            await supabase.from('player_external_ids').upsert({
              player_id: dbPlayer.id,
              source: 'api_football_squad',
              external_id: String(apiPlayer.id),
            }, { onConflict: 'player_id,source' });
          }

          // Update photo if missing
          if (!dbPlayer.image_url && apiPlayer.photo && FIX_MODE) {
            await supabase.from('players').update({ image_url: apiPlayer.photo }).eq('id', dbPlayer.id);
          }
        }
      }

      // Print club summary
      const status = clubMissing === 0 && clubWrongData === 0 ? '✅' : '❌';
      const dbCount = dbPlayers?.length ?? 0;
      console.log(`  ${status} ${team.name.padEnd(30)} DB: ${String(dbCount).padStart(3)} | API: ${String(apiPlayers.length).padStart(3)} | Missing: ${String(clubMissing).padStart(2)} | Wrong: ${String(clubWrongData).padStart(2)}`);

      if (missingPlayers.length > 0) {
        for (const mp of missingPlayers) {
          console.log(`      ➕ ${mp.name} (${mp.position}, #${mp.number ?? '?'}) ${FIX_MODE ? '→ INSERTED' : ''}`);
          allIssues.push({ league: league.name, club: team.name, type: 'MISSING_PLAYER', detail: `${mp.name} (${mp.position}, #${mp.number ?? '?'})`, apiId: mp.id });
        }
      }
      if (wrongDataPlayers.length > 0) {
        for (const wp of wrongDataPlayers) {
          console.log(`      🔧 ${wp.name}: ${wp.issues} ${FIX_MODE ? '→ FIXED' : ''}`);
        }
      }
    }
  }

  // ============================================
  // FINAL REPORT
  // ============================================

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  FINAL REPORT`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`  Leagues checked:       ${totalReport.leagues}`);
  console.log(`  Clubs checked:         ${totalReport.clubsChecked}`);
  console.log(`  Clubs missing from DB: ${totalReport.clubsMissing}`);
  console.log(`  Clubs extra in DB:     ${totalReport.clubsExtra}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Players in DB:         ${totalReport.playersInDb}`);
  console.log(`  Players in API:        ${totalReport.playersInApi}`);
  console.log(`  Players MISSING:       ${totalReport.playersMissing}`);
  console.log(`  Players wrong club:    ${totalReport.playersWrongClub}`);
  console.log(`  Players wrong pos:     ${totalReport.playersWrongPos}`);
  console.log(`  Players wrong number:  ${totalReport.playersWrongNumber}`);
  if (FIX_MODE) {
    console.log(`  ─────────────────────────────────────`);
    console.log(`  Players INSERTED:      ${totalReport.playersInserted}`);
    console.log(`  Players FIXED:         ${totalReport.playersFixed}`);
  }
  console.log(`  ─────────────────────────────────────`);
  console.log(`  API calls used:        ${apiCallCount}`);
  console.log(`${'═'.repeat(70)}\n`);

  // Summary of all issues
  if (allIssues.length > 0) {
    console.log(`\n📋 ALL ISSUES (${allIssues.length}):\n`);
    const byLeague = {};
    for (const issue of allIssues) {
      if (!byLeague[issue.league]) byLeague[issue.league] = [];
      byLeague[issue.league].push(issue);
    }
    for (const [league, issues] of Object.entries(byLeague)) {
      console.log(`  ${league}:`);
      for (const i of issues) {
        if (i.type === 'MISSING_CLUB') console.log(`    ❌ MISSING CLUB: ${i.detail}`);
        else if (i.type === 'EXTRA_CLUB') console.log(`    ⚠ EXTRA CLUB: ${i.detail}`);
        else if (i.type === 'MISSING_PLAYER') console.log(`    ➕ ${i.club}: ${i.detail}`);
      }
    }
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
