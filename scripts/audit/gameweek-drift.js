#!/usr/bin/env node
/**
 * Gameweek-Drift Audit — Slice 310 (Fantasy-#1) Drift-Guard.
 *
 * `active_gameweek` lebt in 2 Spalten (clubs.active_gameweek per-Club +
 * leagues.active_gameweek per-Liga). leagues ist die Lese-Wahrheit (Fantasy
 * liest via useLeagueActiveGameweek). Diese Spalten MÜSSEN synchron bleiben:
 *   pro Liga:  MIN(clubs.active_gameweek) === MAX(clubs.active_gameweek) === leagues.active_gameweek
 *
 * Drift entsteht wenn ein Write-Pfad nur EINE Spalte schreibt (das war der Bug,
 * den set_active_gameweek liga-weit gefixt hat). Dieses Skript ist das D75-Ratchet-
 * Sicherheitsnetz: alarmiert wenn je wieder ein Pfad nur clubs ODER nur leagues setzt.
 *
 * Exit 1 = Drift gefunden. Exit 0 = clean (oder Creds fehlen → skip, nicht-blockierend).
 * Wired: .github/workflows/nightly-audit.yml. Lokal: pnpm run audit:gameweek-drift.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Creds: process.env (CI) zuerst, dann .env.local (lokal).
function loadCreds() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url, key };
  const envPath = path.join(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) {
    // split on /\r?\n/ — plain '\n' leaves a trailing \r on CRLF files (Windows),
    // which breaks the `.*$` value capture (classic cross-platform .env parsing bug).
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (!m) continue;
      const v = m[2].replace(/^"|"$/g, '');
      if (m[1] === 'NEXT_PUBLIC_SUPABASE_URL' && !url) url = v;
      if (m[1] === 'SUPABASE_SERVICE_ROLE_KEY' && !key) key = v;
    }
  }
  return { url, key };
}

async function main() {
  const { url, key } = loadCreds();
  if (!url || !key) {
    console.warn(`${YELLOW}⚠️  gameweek-drift: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required (env or .env.local). Skipping (non-blocking).${RESET}`);
    process.exit(0);
  }

  const sb = createClient(url, key);

  const [{ data: leagues, error: lErr }, { data: clubs, error: cErr }] = await Promise.all([
    sb.from('leagues').select('id, name, active_gameweek'),
    sb.from('clubs').select('league_id, active_gameweek'),
  ]);
  if (lErr) { console.error(`${RED}leagues query failed: ${lErr.message}${RESET}`); process.exit(1); }
  if (cErr) { console.error(`${RED}clubs query failed: ${cErr.message}${RESET}`); process.exit(1); }

  // Aggregate clubs MIN/MAX per league in JS (clubs ~140 rows, safe).
  const agg = new Map(); // league_id -> { min, max, count }
  for (const c of clubs ?? []) {
    if (!c.league_id || c.active_gameweek == null) continue;
    const a = agg.get(c.league_id) ?? { min: Infinity, max: -Infinity, count: 0 };
    a.min = Math.min(a.min, c.active_gameweek);
    a.max = Math.max(a.max, c.active_gameweek);
    a.count += 1;
    agg.set(c.league_id, a);
  }

  const drifts = [];
  console.log('Liga                  league_gw  clubs_min  clubs_max  status');
  console.log('────────────────────  ─────────  ─────────  ─────────  ──────');
  for (const lg of (leagues ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
    const a = agg.get(lg.id);
    if (!a || a.count === 0) {
      console.log(`${lg.name.padEnd(20)}  ${String(lg.active_gameweek).padStart(9)}  ${'—'.padStart(9)}  ${'—'.padStart(9)}  (no clubs)`);
      continue;
    }
    const ok = a.min === a.max && a.max === lg.active_gameweek;
    const status = ok ? `${GREEN}OK${RESET}` : `${RED}DRIFT${RESET}`;
    console.log(`${lg.name.padEnd(20)}  ${String(lg.active_gameweek).padStart(9)}  ${String(a.min).padStart(9)}  ${String(a.max).padStart(9)}  ${status}`);
    if (!ok) drifts.push({ name: lg.name, league_gw: lg.active_gameweek, clubs_min: a.min, clubs_max: a.max });
  }

  if (drifts.length > 0) {
    console.error(`\n${RED}✖ active_gameweek-Drift in ${drifts.length} Liga(en): clubs ≠ leagues.${RESET}`);
    console.error(`  Ursache: ein Write-Pfad schreibt nur EINE Spalte. set_active_gameweek + Cron MÜSSEN liga-weit beide setzen (Slice 310).`);
    process.exit(1);
  }
  console.log(`\n${GREEN}✓ active_gameweek synchron in allen Ligen (clubs-MIN === clubs-MAX === leagues).${RESET}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`${RED}gameweek-drift crashed: ${err.message}${RESET}`);
  process.exit(1);
});
