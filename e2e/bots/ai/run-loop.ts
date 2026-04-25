// Slice 195 — Bot-Loop-Wrapper: triggert --smart N alle X min fuer max Y h.
//
// Anil triggert manuell wenn er schlafen geht (oder fuer mehrstuendige Test-Sessions).
// CTRL+C stoppt sofort. Auto-Stop nach maxHours.
//
// Usage:
//   npx tsx e2e/bots/ai/run-loop.ts                           # default: 15 bots, 30 min, 8h
//   npx tsx e2e/bots/ai/run-loop.ts 25 20 12                  # 25 bots, alle 20 min, 12h
//   npx tsx e2e/bots/ai/run-loop.ts 10 60 4                   # 10 bots, hourly, 4h
//
// Stoppen:
//   - CTRL+C
//   - Auto nach maxHours
//   - kill -9 vom PID

import { spawnSync } from 'child_process';

const COUNT = parseInt(process.argv[2] ?? '15', 10);
const INTERVAL_MIN = parseInt(process.argv[3] ?? '30', 10);
const MAX_HOURS = parseFloat(process.argv[4] ?? '8');

const startedAt = Date.now();
const maxMs = MAX_HOURS * 60 * 60 * 1000;
const intervalMs = INTERVAL_MIN * 60 * 1000;

let runs = 0;
let totalTrades = 0;

console.log('═'.repeat(70));
console.log(`[bot-loop] STARTED at ${new Date().toISOString()}`);
console.log(`           Count:    ${COUNT} Bots per Run`);
console.log(`           Interval: ${INTERVAL_MIN} min`);
console.log(`           Max:      ${MAX_HOURS}h (auto-stop)`);
console.log(`           Stop:     CTRL+C anytime`);
console.log('═'.repeat(70));

process.on('SIGINT', () => {
  const elapsedH = (Date.now() - startedAt) / 1000 / 60 / 60;
  console.log(`\n[bot-loop] STOPPED via SIGINT after ${elapsedH.toFixed(2)}h, ${runs} runs, ~${totalTrades} trades`);
  process.exit(0);
});

function tick() {
  const elapsedMs = Date.now() - startedAt;
  const elapsedH = elapsedMs / 1000 / 60 / 60;

  if (elapsedMs >= maxMs) {
    console.log(`\n[bot-loop] MAX-HOURS reached (${elapsedH.toFixed(2)}h), exiting cleanly`);
    console.log(`           Total runs: ${runs}, total trades: ~${totalTrades}`);
    process.exit(0);
  }

  runs++;
  console.log(`\n[bot-loop] run #${runs} at ${new Date().toISOString()} (elapsed ${elapsedH.toFixed(2)}h)`);

  const result = spawnSync('npx', ['tsx', 'e2e/bots/ai/run.ts', '--smart', String(COUNT)], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    encoding: 'utf-8',
  });

  const stdout = result.stdout?.toString() ?? '';
  const stderr = result.stderr?.toString() ?? '';

  // Extract trade count from "TOTAL: X bots, Y trades"
  const tradeMatch = stdout.match(/TOTAL: \d+ bots, (\d+) trades/);
  const trades = tradeMatch ? parseInt(tradeMatch[1], 10) : 0;
  totalTrades += trades;

  console.log(`[bot-loop] run #${runs} done: ${trades} trades (total ~${totalTrades})`);

  if (result.status !== 0) {
    console.error(`[bot-loop] run #${runs} exit ${result.status} — continuing`);
    if (stderr) console.error(stderr.slice(0, 500));
  }
}

// First tick immediately, then on interval
tick();
setInterval(tick, intervalMs);

// Keep process alive
setInterval(() => {}, 1 << 30);
