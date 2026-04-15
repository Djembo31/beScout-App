#!/usr/bin/env node
/**
 * Seed 3 Fantasy Events per 6 Major Leagues (BL1, BL2, LL, PL, SA, SL).
 * Total: 18 new events in `events` table.
 *
 * Per league:
 *   1. "{Liga-Name} Meisterschaft"   type=club event_tier=club format=11er lineup_size=11 max_entries=100
 *   2. "{Liga-Name} Arena Cup"       type=club event_tier=arena format=11er lineup_size=11 max_entries=150
 *   3. "Rising Stars {Liga-Short}"   type=club event_tier=club format=7er  lineup_size=7  max_entries=50
 *
 * Usage:
 *   node scripts/seed-multi-league-events.mjs --dry-run
 *   node scripts/seed-multi-league-events.mjs
 *
 * Reads .env.local from main repo (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 *
 * Target schema (verified 2026-04-15 via live DB preflights):
 *   events.type TEXT (allowed: club, sponsor, special, bescout) — we use 'club'
 *   events.status TEXT (allowed: registering, upcoming, running, ended)
 *   events.event_tier TEXT (allowed: arena, club, user) — use 'club' and 'arena'
 *   events.format TEXT (only 7er, 11er live — 6er blocked by events_lineup_size_check)
 *   events.scope TEXT default 'global'
 *   events.currency TEXT default 'tickets'
 *   events.lineup_size CHECK: IN (7, 11)
 *
 * Rollback:
 *   Script writes memory/rollback_fantasy_events_multi_league_20260415.json
 *   with all inserted event UUIDs + DELETE query.
 *
 * Idempotency:
 *   Pre-flight: SELECT events WHERE club_id IN (6 pilots) AND gameweek=target_gw
 *   If >0 → abort (no duplicates allowed).
 */

import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// ============================================
// ENV
// ============================================
// Run from C:/bescout-app so .env.local resolves.
const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const clean = line.replace(/\r$/, '');
  const eqIdx = clean.indexOf('=');
  if (eqIdx < 1 || clean.startsWith('#')) continue;
  env[clean.slice(0, eqIdx).trim()] = clean.slice(eqIdx + 1).trim();
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');

// ============================================
// CONFIG
// ============================================
const TARGET_LEAGUES = [
  { short: 'BL1', displayName: 'Bundesliga', rising: 'Rising Stars BL1' },
  { short: 'BL2', displayName: '2. Bundesliga', rising: 'Rising Stars BL2' },
  { short: 'LL', displayName: 'La Liga', rising: 'Rising Stars La Liga' },
  { short: 'PL', displayName: 'Premier League', rising: 'Rising Stars PL' },
  { short: 'SA', displayName: 'Serie A', rising: 'Rising Stars Serie A' },
  { short: 'SL', displayName: 'Süper Lig', rising: 'Rising Stars SL' }
];

// Pilot-Club whitelist (deterministic). Primary → Secondary → Tertiary → first with api_football_id.
const PILOT_WHITELIST = {
  BL1: ['Bayern München', 'Borussia Dortmund', 'Bayer Leverkusen'],
  BL2: ['FC Schalke 04', 'Hamburger SV', 'SC Paderborn 07'],
  LL: ['Real Madrid', 'Barcelona', 'Atletico Madrid'],
  PL: ['Manchester City', 'Liverpool', 'Arsenal'],
  SA: ['Inter', 'AC Milan', 'Juventus'],
  SL: ['Galatasaray', 'Fenerbahçe', 'Beşiktaş']
};

// Event-Templates (3 pro Liga)
const TEMPLATES = [
  {
    key: 'meisterschaft',
    nameFn: (l) => `${l.displayName} Meisterschaft`,
    type: 'club',
    event_tier: 'club',
    format: '11er',
    lineup_size: 11,
    max_entries: 100
  },
  {
    key: 'arena_cup',
    nameFn: (l) => `${l.displayName} Arena Cup`,
    type: 'club',
    event_tier: 'arena',
    format: '11er',
    lineup_size: 11,
    max_entries: 150
  },
  {
    key: 'rising_stars',
    nameFn: (l) => l.rising,
    type: 'club',
    event_tier: 'club',
    format: '7er', // lineup_size=6 is CHECK-blocked. TFF uses 7er.
    lineup_size: 7,
    max_entries: 50
  }
];

// ============================================
// MAIN
// ============================================
async function main() {
  console.log(`=== Multi-League Fantasy Events Seed ${DRY_RUN ? '(DRY-RUN)' : '(LIVE)'} ===\n`);

  // 1. Resolve leagues
  const { data: leagues, error: eL } = await supabase
    .from('leagues')
    .select('id, short, name, active_gameweek')
    .in('short', TARGET_LEAGUES.map(l => l.short));
  if (eL) { console.error('Leagues error:', eL.message); process.exit(1); }
  if (!leagues || leagues.length !== 6) {
    console.error(`Expected 6 leagues, got ${leagues?.length ?? 0}`);
    process.exit(1);
  }

  const leagueMap = Object.fromEntries(leagues.map(l => [l.short, l]));

  // 2. Pick pilot club per league
  console.log('--- 1. Pilot-Club resolution ---');
  const pilotClubs = {};
  for (const meta of TARGET_LEAGUES) {
    const league = leagueMap[meta.short];
    const { data: clubs, error } = await supabase
      .from('clubs')
      .select('id, name, api_football_id')
      .eq('league_id', league.id);
    if (error) { console.error(`${meta.short} clubs:`, error.message); process.exit(1); }

    let pilot = null;
    const whitelist = PILOT_WHITELIST[meta.short] || [];
    for (const prefName of whitelist) {
      pilot = clubs.find(c =>
        c.name.toLowerCase() === prefName.toLowerCase() ||
        c.name.toLowerCase().includes(prefName.toLowerCase())
      );
      if (pilot && pilot.api_football_id != null) break;
      pilot = null;
    }
    if (!pilot) {
      pilot = clubs.find(c => c.api_football_id != null) ?? clubs[0];
    }
    if (!pilot) {
      console.error(`${meta.short}: no pilot club found`);
      process.exit(1);
    }
    pilotClubs[meta.short] = pilot;
    console.log(`  ${meta.short}: ${pilot.name} (id=${pilot.id})`);
  }
  console.log('');

  // 3. Resolve target gameweek + kickoffs per league
  console.log('--- 2. Target gameweek + kickoffs ---');
  const nowIso = new Date().toISOString();
  const targetSpec = {}; // short -> { gameweek, firstKickoff, lastKickoff }
  for (const meta of TARGET_LEAGUES) {
    const league = leagueMap[meta.short];
    const { data: fx, error } = await supabase
      .from('fixtures')
      .select('gameweek, played_at')
      .eq('league_id', league.id)
      .eq('status', 'scheduled')
      .gte('played_at', nowIso)
      .order('played_at', { ascending: true })
      .limit(20);
    if (error) { console.error(`${meta.short} fixtures:`, error.message); process.exit(1); }

    if (!fx || fx.length === 0) {
      console.error(`${meta.short}: no future scheduled fixtures. Cannot pick target_gw.`);
      process.exit(1);
    }
    const firstGw = fx[0].gameweek;
    const gwFx = fx.filter(f => f.gameweek === firstGw);
    const kickoffs = gwFx.map(f => f.played_at).sort();
    const firstKickoff = kickoffs[0];
    const lastKickoff = kickoffs[kickoffs.length - 1];

    // locks_at = 30min before firstKickoff
    const locksAt = new Date(new Date(firstKickoff).getTime() - 30 * 60 * 1000).toISOString();
    // ends_at = lastKickoff + 3h
    const endsAt = new Date(new Date(lastKickoff).getTime() + 3 * 60 * 60 * 1000).toISOString();

    targetSpec[meta.short] = {
      gameweek: firstGw,
      starts_at: firstKickoff,
      locks_at: locksAt,
      ends_at: endsAt,
      lastKickoff
    };
    console.log(`  ${meta.short}: gw=${firstGw} starts=${firstKickoff} locks=${locksAt} ends=${endsAt}`);
  }
  console.log('');

  // 4. Idempotency: existing events for any pilot with target gw
  console.log('--- 3. Idempotency check ---');
  const pilotIds = Object.values(pilotClubs).map(c => c.id);
  const gws = Array.from(new Set(Object.values(targetSpec).map(s => s.gameweek)));
  const { data: existing, error: eE } = await supabase
    .from('events')
    .select('id, name, club_id, gameweek')
    .in('club_id', pilotIds)
    .in('gameweek', gws);
  if (eE) { console.error('Existing events check:', eE.message); process.exit(1); }
  if (existing && existing.length > 0) {
    console.log('ABORT: existing events for pilot clubs at target gameweek:');
    for (const e of existing) console.log(`  - ${e.name} (club=${e.club_id} gw=${e.gameweek})`);
    console.log('\nTo re-run, delete these events first or change target gameweek.');
    process.exit(1);
  }
  console.log('  OK: no conflicting events — safe to seed.');
  console.log('');

  // 5. Build all 18 event payloads
  console.log('--- 4. Building 18 event payloads ---');
  const payloads = [];
  for (const meta of TARGET_LEAGUES) {
    const pilot = pilotClubs[meta.short];
    const spec = targetSpec[meta.short];
    for (const tpl of TEMPLATES) {
      const payload = {
        name: tpl.nameFn(meta),
        type: tpl.type,
        status: 'registering',
        format: tpl.format,
        gameweek: spec.gameweek,
        entry_fee: 0,
        prize_pool: 0,
        max_entries: tpl.max_entries,
        current_entries: 0,
        starts_at: spec.starts_at,
        locks_at: spec.locks_at,
        ends_at: spec.ends_at,
        club_id: pilot.id,
        tier_bonuses: { good: 100, strong: 300, decisive: 500 },
        event_tier: tpl.event_tier,
        scope: 'global',
        lineup_size: tpl.lineup_size,
        ticket_cost: 0,
        currency: 'tickets',
        wildcards_allowed: false,
        max_wildcards_per_lineup: 0,
        is_liga_event: false
      };
      payloads.push({ meta: { league: meta.short, template: tpl.key }, payload });
    }
  }
  for (const p of payloads) {
    console.log(`  [${p.meta.league.padEnd(3)} | ${p.meta.template.padEnd(14)}] ${p.payload.name} (fmt=${p.payload.format} size=${p.payload.lineup_size} tier=${p.payload.event_tier} max=${p.payload.max_entries})`);
  }
  console.log(`  TOTAL: ${payloads.length} events`);
  console.log('');

  if (DRY_RUN) {
    console.log('=== DRY-RUN COMPLETE — no rows inserted ===');
    return;
  }

  // 6. LIVE-RUN: insert all 18 and collect IDs
  console.log('--- 5. Live INSERT ---');
  const { data: inserted, error: eI } = await supabase
    .from('events')
    .insert(payloads.map(p => p.payload))
    .select('id, name, club_id, gameweek, event_tier, format, lineup_size');
  if (eI) {
    console.error('INSERT error:', eI.message);
    console.error('details:', eI);
    process.exit(1);
  }
  console.log(`  ${inserted?.length ?? 0} rows inserted.`);
  console.log('');

  // 7. Write rollback file
  const rollback = {
    seededAt: new Date().toISOString(),
    totalEvents: inserted?.length ?? 0,
    eventIds: (inserted ?? []).map(e => e.id),
    byLeague: {},
    deleteQuery: `DELETE FROM events WHERE id IN (${(inserted ?? []).map(e => `'${e.id}'`).join(',')});`,
    notes: 'Multi-League Fantasy Events Seed — 18 events across 6 Major Leagues (BL1, BL2, LL, PL, SA, SL)'
  };
  for (const p of payloads) {
    const match = inserted?.find(r => r.name === p.payload.name);
    if (!rollback.byLeague[p.meta.league]) rollback.byLeague[p.meta.league] = [];
    if (match) rollback.byLeague[p.meta.league].push({ id: match.id, name: match.name });
  }
  writeFileSync('memory/rollback_fantasy_events_multi_league_20260415.json', JSON.stringify(rollback, null, 2));
  console.log(`  Rollback file: memory/rollback_fantasy_events_multi_league_20260415.json`);
  console.log('');

  // 8. Post-Verify
  console.log('--- 6. Post-Verify ---');
  const { data: verify } = await supabase
    .from('events')
    .select('id, name, club_id, gameweek, status')
    .in('id', (inserted ?? []).map(e => e.id));
  console.log(`  ${verify?.length ?? 0} events verified in DB.`);
  for (const ev of verify ?? []) {
    console.log(`    ${ev.id.slice(0, 8)} | gw=${ev.gameweek} | ${ev.status} | ${ev.name}`);
  }
  console.log('');

  console.log('=== SEED COMPLETE ===');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
