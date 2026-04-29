#!/usr/bin/env tsx
/**
 * Cron Health Check (Slice 255 — D52 Wave-3-Tooling Pattern)
 *
 * Detects Vercel-Cron-Pipeline-Drift via two complementary signals:
 *
 * 1. **cron_sync_log freshness** — Last write < 25h ago for gameweek-sync.
 *    If 0 entries in 25h, gameweek-sync is dead (Slice 187-D36-Pattern).
 *
 * 2. **DB-state-drift** — leagues.active_gameweek lags reality.
 *    For each active league, compare DB.active_gameweek to the highest
 *    fully-finished GW. Drift > 0 = pipeline-not-advancing (Slice 254-Layer-1
 *    pattern: TFF1 had drift -10 = 7+ days stale before this tool existed).
 *
 * Output:
 *   - Markdown report to `worklog/audits/cron-health-<DATE>.md`
 *   - Exit 0 if all healthy, exit 1 if any drift/stale
 *   - CI-Integration: nightly-audit.yml step blocks workflow on stale Pipeline
 *
 * Run:
 *   npx tsx scripts/cron-health-check.ts          → Live-check
 *   npx tsx scripts/cron-health-check.ts --check  → Strict-mode (exit 1 on drift)
 *
 * Why DB-state-drift instead of Vercel-API direct?
 *   - DB-state is user-impact-relevant (what user sees on /fantasy)
 *   - No Vercel-token needed in CI
 *   - Catches BOTH cron-not-running AND cron-running-but-failing-late-steps
 *
 * Slice 255 — Anil-Direktive 2026-04-29 nach Slice 254 Deep-Dive (Vercel-Cron
 * tot 7+ Tage ohne Detection). D52-Pattern: locker starten, iterativ tightenen.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync } from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load .env.local for local runs (CI uses GHA secrets)
const envPath = path.resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  config({ path: envPath });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️  cron-health-check: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required');
  console.warn('   Skipping audit (not a blocking failure — CI should have env).');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const STRICT = process.argv.includes('--check');
const today = new Date().toISOString().slice(0, 10);
const reportPath = path.resolve(process.cwd(), `worklog/audits/cron-health-${today}.md`);

interface Finding {
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  category: 'cron-stale' | 'db-drift';
  message: string;
}

const findings: Finding[] = [];

async function checkCronSyncLogFreshness(): Promise<void> {
  const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('cron_sync_log')
    .select('created_at, step, status')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    findings.push({
      severity: 'MEDIUM',
      category: 'cron-stale',
      message: `cron_sync_log query failed: ${error.message}`,
    });
    return;
  }

  if (!data || data.length === 0) {
    findings.push({
      severity: 'HIGH',
      category: 'cron-stale',
      message: `cron_sync_log: 0 entries in last 25h. gameweek-sync (vercel.json schedule "0 6 * * *") has not logged any step. Cron likely dead.`,
    });
    return;
  }

  const lastEntry = data[0];
  const ageHours = (Date.now() - new Date(lastEntry.created_at).getTime()) / (60 * 60 * 1000);
  if (ageHours > 25) {
    findings.push({
      severity: 'HIGH',
      category: 'cron-stale',
      message: `cron_sync_log: last entry ${ageHours.toFixed(1)}h ago (step "${lastEntry.step}", status "${lastEntry.status}"). Expected ≤25h.`,
    });
  }
}

async function checkLeagueActiveGwDrift(): Promise<void> {
  const { data: leagues, error: leagueErr } = await supabase
    .from('leagues')
    .select('id, name, country, active_gameweek, max_gameweeks')
    .eq('is_active', true);

  if (leagueErr) {
    findings.push({
      severity: 'MEDIUM',
      category: 'db-drift',
      message: `leagues query failed: ${leagueErr.message}`,
    });
    return;
  }

  if (!leagues || leagues.length === 0) {
    findings.push({
      severity: 'INFO',
      category: 'db-drift',
      message: 'No active leagues found.',
    });
    return;
  }

  for (const league of leagues) {
    // Get clubs of this league for fixture-scoping
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id')
      .eq('league_id', league.id);
    const clubIds = (clubs ?? []).map((c) => c.id as string);
    if (clubIds.length === 0) continue;

    const dbActiveGw = league.active_gameweek as number;
    const maxGw = league.max_gameweeks as number;

    // Slice 255 Heal (Reviewer F-2, P2) — echte Cron-Drift-Detection:
    // Drift = ALLE Fixtures der dbActiveGw sind finished UND active_gw nicht advanced.
    // Pre-Heal: maxFinishedGw >= dbActiveGw triggert auch bei Mid-Gameweek-State
    // (early-kickoff Sa 13:30 fertig, Rest noch geplant) → False-Positive Wochenend-Noise
    // ueber alle 7 Ligen.
    const { data: activeGwFixtures } = await supabase
      .from('fixtures')
      .select('status')
      .in('home_club_id', clubIds)
      .eq('gameweek', dbActiveGw);

    if (!activeGwFixtures || activeGwFixtures.length === 0) {
      // Keine Fixtures der active_gw — Pre-Season oder Liga ohne Fixtures
      continue;
    }

    const allFinished = activeGwFixtures.every((f) => f.status === 'finished');
    if (allFinished && dbActiveGw < maxGw) {
      // ALLE Fixtures finished + nicht Saison-End → Cron sollte advanced haben
      // Severity: Anzahl der nachfolgenden GWs mit finished-Fixtures = wie viele
      // GWs hat der Cron nicht mit-bekommen.
      const { data: laterFinished } = await supabase
        .from('fixtures')
        .select('gameweek')
        .in('home_club_id', clubIds)
        .eq('status', 'finished')
        .gt('gameweek', dbActiveGw)
        .order('gameweek', { ascending: false })
        .limit(1);
      const maxLaterFinished = laterFinished && laterFinished.length > 0 ? (laterFinished[0].gameweek as number) : dbActiveGw;
      const drift = maxLaterFinished - dbActiveGw + 1;
      const severity: Finding['severity'] = drift >= 3 ? 'HIGH' : drift >= 2 ? 'HIGH' : 'MEDIUM';
      findings.push({
        severity,
        category: 'db-drift',
        message: `${league.name} (${league.country}): db.active_gameweek=${dbActiveGw} fully-finished, but not advanced. Cron stale by ${drift} GW.`,
      });
    }
  }
}

function writeReport(): boolean {
  const high = findings.filter((f) => f.severity === 'HIGH');
  const medium = findings.filter((f) => f.severity === 'MEDIUM');
  const info = findings.filter((f) => f.severity === 'INFO');

  const lines: string[] = [];
  lines.push(`# Cron Health Check Report — ${today}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Slice:** 255 (Wave-3-Tooling D52 — Cron-Pipeline-Reliability)`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- HIGH: ${high.length}`);
  lines.push(`- MEDIUM: ${medium.length}`);
  lines.push(`- INFO: ${info.length}`);
  lines.push('');

  if (findings.length === 0) {
    lines.push('✅ **All checks passed.** Cron pipeline running, DB-state in sync.');
  } else {
    lines.push('## Findings');
    lines.push('');
    for (const sev of ['HIGH', 'MEDIUM', 'INFO'] as const) {
      const subset = findings.filter((f) => f.severity === sev);
      if (subset.length === 0) continue;
      lines.push(`### ${sev}`);
      lines.push('');
      for (const f of subset) {
        lines.push(`- **[${f.category}]** ${f.message}`);
      }
      lines.push('');
    }
  }

  writeFileSync(reportPath, lines.join('\n'));
  return high.length > 0 || (STRICT && medium.length > 0);
}

(async () => {
  console.log('═══ Cron Health Check ═══');
  await checkCronSyncLogFreshness();
  await checkLeagueActiveGwDrift();

  const isFailure = writeReport();
  const high = findings.filter((f) => f.severity === 'HIGH').length;
  const medium = findings.filter((f) => f.severity === 'MEDIUM').length;

  console.log(`Findings: ${high} HIGH, ${medium} MEDIUM, ${findings.filter(f => f.severity === 'INFO').length} INFO`);
  console.log(`Report: ${reportPath}`);

  if (isFailure) {
    console.log('❌ Cron pipeline drift detected (HIGH or strict-MEDIUM). Investigate Vercel Crons + Supabase keys.');
    process.exit(1);
  } else if (findings.length === 0) {
    console.log('✅ Cron pipeline healthy.');
  } else {
    console.log('⚠️  Minor findings present (MEDIUM/INFO), not blocking.');
  }
})();
