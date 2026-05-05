#!/usr/bin/env node
/**
 * Slice 273 Track A2 — Backfill Fixture-Stats für lagged Ligen+GWs.
 *
 * Trigger: Live-DB-Audit 2026-05-05 fand `fixture_player_stats` LEER für 6/7
 * Ligen trotz `fixtures.status='finished'`. Cron-Logic hat keinen retroaktiven
 * Pfad — wenn alles finished, skippt sie via `already_complete`. Ohne diesen
 * Backfill bleiben Bewertungen für die letzten gespielten GWs der Nicht-TFF1-Ligen
 * dauerhaft leer. Slice 274 Cron-Code-Fix ist der saubere Weg, dieses Script ist
 * der einmalige Recovery-Backfill.
 *
 * Wrapper über scripts/backfill-complete-stats.mjs welches die volle Pipeline
 * (API-Football fetch + cron_process_gameweek RPC) pro Liga+GW-Range ausführt.
 *
 * Usage: node scripts/slice-273-backfill-fixture-stats.mjs
 *
 * Targets (lagged Liga+GW-Kombos pro Live-DB-Audit 2026-05-05):
 * - Bundesliga GW32        (latest finished, 0 stats)
 * - 2. Bundesliga GW32     (latest finished, 0 stats)
 * - La Liga GW32-34        (3 lagged GWs, 0 stats jede)
 * - Premier League GW32-35 (4 lagged GWs, 0 stats jede)
 * - Serie A GW35           (latest finished, 0 stats)
 * - Süper Lig GW32         (latest finished, 0 stats)
 *
 * TFF 1. Lig ausgeschlossen — GW37 hat 264 stats (✓), GW38 ist Saisonende-Edge-Case
 * mit import_data-Errors (Slice 274 separat).
 *
 * Rate-Limit: ~20 API-Calls pro GW (10 fixtures × 2 endpoints), Plus-Plan 100/min.
 * Total ~13 GWs × 20 = 260 API-Calls → ~4 min.
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(__dirname, 'backfill-complete-stats.mjs');

const TARGETS = [
  { leagueId: 78, name: 'Bundesliga',     fromGw: 32, toGw: 32 },
  { leagueId: 79, name: '2. Bundesliga',  fromGw: 32, toGw: 32 },
  { leagueId: 140, name: 'La Liga',       fromGw: 32, toGw: 34 },
  { leagueId: 39, name: 'Premier League', fromGw: 32, toGw: 35 },
  { leagueId: 135, name: 'Serie A',       fromGw: 35, toGw: 35 },
  { leagueId: 203, name: 'Süper Lig',     fromGw: 32, toGw: 32 },
];

const startTime = Date.now();
let totalSuccess = 0;
let totalFailed = 0;
const failures = [];

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║  Slice 273 Track A2 — Multi-Liga Fixture-Stats Backfill ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

for (const target of TARGETS) {
  const gwCount = target.toGw - target.fromGw + 1;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`▶ ${target.name} (api_football_id=${target.leagueId}) GW ${target.fromGw}-${target.toGw} (${gwCount} GW)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const result = spawnSync(
    'node',
    [RUNNER, String(target.fromGw), String(target.toGw), String(target.leagueId)],
    { stdio: 'inherit', cwd: join(__dirname, '..') },
  );

  if (result.status === 0) {
    totalSuccess += gwCount;
    console.log(`\n✓ ${target.name} backfill complete`);
  } else {
    totalFailed += gwCount;
    failures.push({ name: target.name, leagueId: target.leagueId, fromGw: target.fromGw, toGw: target.toGw, exitCode: result.status });
    console.log(`\n✗ ${target.name} backfill failed (exit ${result.status})`);
  }
}

const durationS = Math.round((Date.now() - startTime) / 1000);

console.log('\n\n╔══════════════════════════════════════════════════════════╗');
console.log('║  Backfill-Summary                                       ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`Total: ${TARGETS.length} Ligen, ${totalSuccess + totalFailed} GWs verarbeitet`);
console.log(`Erfolg: ${totalSuccess} GWs`);
console.log(`Fehler: ${totalFailed} GWs`);
console.log(`Dauer: ${durationS}s`);

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.name} (id=${f.leagueId}) GW ${f.fromGw}-${f.toGw}: exit ${f.exitCode}`);
  }
}

console.log('\nNächster Schritt: DB-Smoke verifizieren');
console.log("  SELECT l.name, COUNT(DISTINCT fps.id) AS stats_rows");
console.log("  FROM fixture_player_stats fps");
console.log("  JOIN fixtures f ON f.id = fps.fixture_id");
console.log("  JOIN clubs c ON c.id = f.home_club_id");
console.log("  JOIN leagues l ON l.id = c.league_id");
console.log("  WHERE f.gameweek IN (32, 33, 34, 35) GROUP BY l.name;");

process.exit(totalFailed > 0 ? 1 : 0);
