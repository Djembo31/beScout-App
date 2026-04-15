#!/usr/bin/env node
/**
 * Fix broken TFF 1. Lig club logos.
 *
 * 9 TFF clubs have broken `/clubs/*.png` relative logo URLs (inkl. 2 Typos).
 * Migration auf api-sports.io CDN via API-Football /teams?id={X} (authoritative Logo-URL).
 *
 * Usage:
 *   node scripts/fix-tff-logos.mjs --dry-run    # Snapshot + Plan, kein UPDATE
 *   node scripts/fix-tff-logos.mjs              # Live-Run: Snapshot + UPDATE
 *
 * Reads .env.local from worktree OR parent main repo (C:/bescout-app/.env.local) for
 * API_FOOTBALL_KEY + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Rollback: memory/rollback_tff_logos_20260415.json wird vor UPDATE geschrieben.
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
const ROLLBACK_PATH = 'memory/rollback_tff_logos_20260415.json';

// ============================================
// TARGET LIST (9 TFF Clubs)
// ============================================

/** @type {Array<{id: string, name: string, api_football_id: number}>} */
const TARGETS = [
  { id: 'd28884c9-d7d8-454b-ae8d-29f511424e52', name: 'Bandırmaspor',   api_football_id: 3584 },
  { id: 'ca7f19f5-c6df-4e23-bfe0-cfa7722cff2d', name: 'Boluspor',       api_football_id: 3569 },
  { id: '9bb44e57-454b-47f0-b4be-a2d6142874fe', name: 'Erzurumspor FK', api_football_id: 1009 },
  { id: '84c09600-7844-4be9-85a2-dc8097ceab22', name: 'İstanbulspor',   api_football_id: 3578 },
  { id: '40ccd992-345a-4be9-98b1-680a96dcd6d8', name: 'Keçiörengücü',   api_football_id: 3595 },
  { id: 'e49dd994-fb00-476b-ba8b-55c799d76053', name: 'Manisa FK',      api_football_id: 3597 },
  { id: '8c8216db-3250-49d2-8b13-682aefe12be8', name: 'Pendikspor',     api_football_id: 3601 },
  { id: '2bf30014-db88-4567-9885-9da215e3a0d4', name: 'Sakaryaspor',    api_football_id: 3602 },
  { id: '6792271f-7be4-42ee-a762-43cf06dede8a', name: 'Ümraniyespor',   api_football_id: 3577 },
];

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
  return await res.json();
}

async function httpHead(url) {
  // Note: media.api-sports.io returns 403 on HEAD but 200 on GET (CDN quirk).
  // We use GET with Range to fetch minimal bytes instead of a full HEAD.
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
    });
    // Accept 200 (full) or 206 (partial) as success.
    return res.status;
  } catch (err) {
    return 0;
  }
}

async function fetchAuthoritativeLogo(apiFootballId) {
  const res = await apiFetch(`/teams?id=${apiFootballId}`);
  const team = res.response?.[0]?.team;
  if (!team) throw new Error(`API-Football returned no team for id=${apiFootballId}`);
  return { logo: team.logo, name: team.name };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('');
  console.log('='.repeat(70));
  console.log(`TFF Logo Migration — ${DRY_RUN ? 'DRY RUN' : 'LIVE RUN'}`);
  console.log('='.repeat(70));
  console.log('');

  // Step 1: Pre-Flight Snapshot (aktuelle DB-Werte der 9 Rows holen)
  console.log('[1/5] Pre-Flight Snapshot');
  const ids = TARGETS.map((t) => t.id);
  const { data: beforeRows, error: beforeErr } = await supabase
    .from('clubs')
    .select('id, name, slug, short, api_football_id, logo_url, league_id')
    .in('id', ids)
    .order('name');

  if (beforeErr) { console.error('Snapshot failed:', beforeErr.message); process.exit(1); }
  if (!beforeRows || beforeRows.length !== 9) {
    console.error(`Expected 9 rows, got ${beforeRows?.length ?? 0}. Abort.`);
    process.exit(1);
  }

  const snapshot = {
    generated_at: new Date().toISOString(),
    purpose: 'Rollback snapshot for TFF club logo migration',
    row_count: beforeRows.length,
    rollback_sql_template:
      "UPDATE clubs SET logo_url = $1 WHERE id = $2; -- apply per row from 'rows' array",
    rows: beforeRows,
  };

  writeFileSync(ROLLBACK_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`  Snapshot written: ${ROLLBACK_PATH} (${beforeRows.length} rows)`);
  beforeRows.forEach((r) => {
    console.log(`    - ${r.name.padEnd(18)} -> ${r.logo_url}`);
  });
  console.log('');

  // Step 2: Fetch authoritative logo URLs from API-Football
  console.log('[2/5] Fetch authoritative logo URLs from API-Football');
  /** @type {Array<{id: string, name: string, old: string, new: string, apiName: string, headStatus: number}>} */
  const plan = [];

  for (const target of TARGETS) {
    const beforeRow = beforeRows.find((r) => r.id === target.id);
    if (!beforeRow) continue;

    try {
      const { logo, name: apiName } = await fetchAuthoritativeLogo(target.api_football_id);
      if (!logo) throw new Error('API response had no logo URL');

      const headStatus = await httpHead(logo);
      if (headStatus !== 200 && headStatus !== 206) {
        console.error(`  FAIL: ${target.name} — reachability check ${headStatus} on ${logo}. Abort.`);
        console.error('  Rollback file preserved. No UPDATE executed.');
        process.exit(1);
      }

      plan.push({
        id: target.id,
        name: target.name,
        old: beforeRow.logo_url,
        new: logo,
        apiName,
        headStatus,
      });

      console.log(`  OK   ${target.name.padEnd(18)} (api:${target.api_football_id}) -> reachable [${headStatus}]`);
      console.log(`       old: ${beforeRow.logo_url}`);
      console.log(`       new: ${logo}`);

      await sleep(200); // Rate-Limit courtesy
    } catch (err) {
      console.error(`  FAIL: ${target.name} (api:${target.api_football_id}) — ${err.message}. Abort.`);
      process.exit(1);
    }
  }

  console.log('');
  console.log(`  API calls used: ${apiCallCount}`);
  console.log('');

  // Step 3: Show plan
  console.log('[3/5] Planned UPDATEs:');
  plan.forEach((p, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${p.name.padEnd(18)} -> ${p.new}`);
  });
  console.log('');

  if (DRY_RUN) {
    console.log('[4/5] DRY RUN — no UPDATE executed.');
    console.log('[5/5] Done (dry).');
    console.log('');
    console.log('To apply: node scripts/fix-tff-logos.mjs');
    return;
  }

  // Step 4: Apply UPDATEs
  console.log('[4/5] Applying UPDATEs...');
  let updated = 0;
  for (const p of plan) {
    const { error } = await supabase
      .from('clubs')
      .update({ logo_url: p.new })
      .eq('id', p.id);

    if (error) {
      console.error(`  FAIL: ${p.name} — ${error.message}`);
      continue;
    }
    updated++;
    console.log(`  OK   ${p.name.padEnd(18)} updated`);
  }
  console.log(`  Updated: ${updated}/${plan.length}`);
  console.log('');

  // Step 5: Post-Verify
  console.log('[5/5] Post-Verify');
  const { data: afterRows, error: afterErr } = await supabase
    .from('clubs')
    .select('id, name, logo_url')
    .in('id', ids)
    .order('name');

  if (afterErr) { console.error('Post-verify failed:', afterErr.message); process.exit(1); }

  const stillBroken = (afterRows ?? []).filter(
    (r) => !r.logo_url || !r.logo_url.startsWith('https://'),
  );
  if (stillBroken.length > 0) {
    console.error(`  FAIL: ${stillBroken.length} clubs still have non-https logo:`);
    stillBroken.forEach((r) => console.error(`    - ${r.name}: ${r.logo_url}`));
    process.exit(1);
  }

  console.log(`  PASS: all ${afterRows.length} target clubs now on https:// logo URLs`);
  (afterRows ?? []).forEach((r) => {
    console.log(`    - ${r.name.padEnd(18)} -> ${r.logo_url}`);
  });
  console.log('');
  console.log('='.repeat(70));
  console.log(`DONE — ${updated}/${plan.length} logos migrated. Rollback at ${ROLLBACK_PATH}`);
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
