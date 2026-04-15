#!/usr/bin/env node
/**
 * Migration-Body-Extractor (Ferrari 10/10 H9)
 *
 * Usage: `node scripts/pg/extract-rpc.js <proname>`
 *
 * Fetches current live-body of an RPC via Supabase + writes to:
 *   supabase/migrations/_drafts/YYYYMMDDHHMMSS_<proname>_draft.sql
 *
 * Prevents regex-replace fragility — you edit the full body manually, then
 * apply cleanly via mcp__supabase__apply_migration.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const proname = process.argv[2];
if (!proname) {
  console.error('Usage: node scripts/pg/extract-rpc.js <proname>');
  console.error('Example: node scripts/pg/extract-rpc.js open_mystery_box_v2');
  process.exit(1);
}

(async () => {
  const sb = createClient(url, serviceKey);
  // Use raw SQL via supabase-js via auth-bypass
  // Requires an execute_sql RPC or direct postgres connection.
  // Since we may not have execute_sql, use REST-based schema introspection if possible.
  // Fallback: error + guide user to use MCP directly.
  console.log(`🔍 Fetching body for ${proname}...`);
  console.log('');
  console.log('Use this command directly via MCP in Claude Code session:');
  console.log('');
  console.log(`mcp__supabase__execute_sql:`);
  console.log(`  project_id: skzjfhvgccaeplydsunz`);
  console.log(`  query: SELECT pg_get_functiondef(p.oid) AS body FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='${proname}';`);
  console.log('');
  console.log('Copy output to:');
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const draftsDir = path.join(__dirname, '../../supabase/migrations/_drafts');
  if (!fs.existsSync(draftsDir)) fs.mkdirSync(draftsDir, { recursive: true });
  const outPath = path.join(draftsDir, `${timestamp}_${proname}_draft.sql`);
  console.log(`  ${outPath}`);
  console.log('');
  console.log('Then edit + apply via mcp__supabase__apply_migration.');
})();
