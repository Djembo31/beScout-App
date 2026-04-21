#!/usr/bin/env node
// Beta-Metrics Dashboard
// Rechnet die KPIs aus memory/beta-exit-criteria.md direkt aus Supabase.
// Usage:
//   node scripts/beta-metrics.mjs             → stdout Markdown report
//   node scripts/beta-metrics.mjs --save      → saves to worklog/beta-metrics/YYYY-MM-DD.md
//   node scripts/beta-metrics.mjs --json      → machine-readable JSON
//   node scripts/beta-metrics.mjs --since 7d  → override lookback window (default 7d)

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY needed in .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const SAVE = args.includes('--save');
const JSON_MODE = args.includes('--json');
const sinceArg = args.find(a => a.startsWith('--since='))?.split('=')[1] ?? '7d';
const sinceMs = sinceArg.endsWith('d') ? parseInt(sinceArg) * 86400000 : 7 * 86400000;
const sinceIso = new Date(Date.now() - sinceMs).toISOString();

const db = createClient(URL, KEY, { auth: { persistSession: false } });

// ── KPIs ──────────────────────────────────────────────────────────────

async function kpi(label, fn) {
  try {
    const value = await fn();
    return { label, value, ok: true };
  } catch (err) {
    return { label, value: `ERROR: ${err.message}`, ok: false };
  }
}

async function countTable(table, filter) {
  let q = db.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function countDistinct(table, column, filter) {
  // Supabase lacks native distinct count — pull ids paginated and dedupe
  const pageSize = 1000;
  const seen = new Set();
  let from = 0;
  while (true) {
    let q = db.from(table).select(column).range(from, from + pageSize - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) if (row[column] != null) seen.add(row[column]);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return seen.size;
}

async function sumColumn(table, column, filter) {
  const pageSize = 1000;
  let from = 0;
  let sum = 0;
  while (true) {
    let q = db.from(table).select(column).range(from, from + pageSize - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) sum += Number(row[column] ?? 0);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return sum;
}

const botIdsPromise = db
  .from('profiles')
  .select('id')
  .like('handle', 'bot%')
  .then(({ data, error }) => {
    if (error) throw error;
    return (data ?? []).map(r => r.id);
  });

async function run() {
  const botIds = await botIdsPromise;

  // --- User Engagement ---
  const totalUsers = await kpi('Total registered users', () =>
    countTable('profiles', q => q.not('handle', 'like', 'bot%')),
  );

  const usersWithTrade = await kpi('Users with ≥1 trade (all-time)', () =>
    countDistinct('transactions', 'user_id', q =>
      q.in('type', ['trade_buy', 'trade_sell']).not('user_id', 'in', `(${botIds.join(',')})`),
    ),
  );

  const usersWithTradeLookback = await kpi(`Users who traded in last ${sinceArg}`, () =>
    countDistinct('transactions', 'user_id', q =>
      q.in('type', ['trade_buy', 'trade_sell']).gte('created_at', sinceIso),
    ),
  );

  const dau = await kpi(`Distinct users with any tx (last ${sinceArg})`, () =>
    countDistinct('transactions', 'user_id', q => q.gte('created_at', sinceIso)),
  );

  // --- Feature Usage ---
  const scoutCardBuyers = await kpi('Unique Scout-Card buyers (all-time)', () =>
    countDistinct('trades', 'buyer_id'),
  );

  const fantasyEntries = await kpi(`Fantasy event entries (last ${sinceArg})`, () =>
    countTable('event_entries', q => q.gte('locked_at', sinceIso)),
  );

  const humanPosts = await kpi(`Community posts (human, last ${sinceArg})`, () =>
    countTable('posts', q =>
      q.gte('created_at', sinceIso).not('user_id', 'in', `(${botIds.join(',')})`),
    ),
  );

  const botPostsLeft = await kpi('Bot-posts still in DB (E7 — should be 0)', () =>
    botIds.length === 0
      ? 0
      : countTable('posts', q => q.in('user_id', botIds)),
  );

  const missionsClaimed = await kpi(`Missions completed (last ${sinceArg})`, () =>
    countTable('user_daily_challenges', q => q.gte('completed_at', sinceIso)),
  );

  const clubFollows = await kpi('Total club follows', () => countTable('user_follows'));

  // --- Money ---
  // Volume = SUM(price × quantity) aus trades (authoritative, non-negative).
  const tradingVolumeCents = await kpi(`Trading volume cents (last ${sinceArg})`, async () => {
    const pageSize = 1000;
    let from = 0;
    let sum = 0;
    while (true) {
      const { data, error } = await db
        .from('trades')
        .select('price, quantity')
        .gte('executed_at', sinceIso)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const t of data) sum += Number(t.price ?? 0) * Number(t.quantity ?? 0);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return sum;
  });

  const zombieHoldings = await kpi('Zombie holdings (qty=0, D3 — should be 0)', () =>
    countTable('holdings', q => q.eq('quantity', 0)),
  );

  const tradesCount = await kpi(`Trades executed (last ${sinceArg})`, () =>
    countTable('trades', q => q.gte('executed_at', sinceIso)),
  );

  // --- Activation Funnel ---
  const usersWithStats = await kpi('Profiles with user_stats row (Activation B1 proxy)', () =>
    countTable('user_stats', q => q.not('user_id', 'in', `(${botIds.join(',')})`)),
  );

  return [
    { section: 'User-Engagement', kpis: [totalUsers, usersWithStats, usersWithTrade, usersWithTradeLookback, dau] },
    { section: 'Feature-Usage', kpis: [scoutCardBuyers, fantasyEntries, humanPosts, botPostsLeft, missionsClaimed, clubFollows] },
    { section: 'Money-Flow', kpis: [tradingVolumeCents, tradesCount, zombieHoldings] },
  ];
}

function fmt(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString('de');
  return String(value);
}

function renderMd(sections) {
  const lines = [];
  lines.push(`# Beta-Metrics Dashboard`);
  lines.push(`Run: ${new Date().toISOString()}  ·  Lookback: ${sinceArg}`);
  lines.push('');
  lines.push(`> Basis: \`memory/beta-exit-criteria.md\`. Nur SQL-messbare KPIs. Sentry-KPIs (A1/A2) + Audit-KPIs (E1/E2/D1) separat via \`pnpm run audit:*\` / Sentry-MCP prüfen.`);
  lines.push('');

  for (const { section, kpis } of sections) {
    lines.push(`## ${section}`);
    lines.push('');
    lines.push('| KPI | Wert |');
    lines.push('|-----|-----:|');
    for (const k of kpis) {
      const marker = k.ok ? '' : '❌ ';
      lines.push(`| ${marker}${k.label} | ${fmt(k.value)} |`);
    }
    lines.push('');
  }

  lines.push(`## Nächste Checks (nicht in diesem Script)`);
  lines.push('- Sentry: `mcp__sentry__search_events("count of errors in last 24 hours")` → A1/A2');
  lines.push('- DB-Invariants: `npx vitest run src/lib/__tests__/db-invariants.test.ts` → D1');
  lines.push('- Silent-Fail-Baseline: `pnpm run audit:silent-fail:check` → A6/D6');
  lines.push('- i18n-Compliance: `pnpm run audit:compliance && pnpm run audit:tr-strings` → E1/E2');
  lines.push('- Post-Deploy-Smoke-Historie: `gh run list --workflow="Post-Deploy Smoke" --limit 10` → A3');

  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────
(async () => {
  const sections = await run();
  if (JSON_MODE) {
    console.log(JSON.stringify(sections, null, 2));
    return;
  }
  const md = renderMd(sections);
  if (SAVE) {
    const dir = path.join(process.cwd(), 'worklog', 'beta-metrics');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}.md`);
    fs.writeFileSync(file, md, 'utf-8');
    console.log(`Saved: ${file}`);
  } else {
    console.log(md);
  }
})().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
