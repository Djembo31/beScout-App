/**
 * Slice 185b — Bundle-Budget-Gate.
 *
 * Liest `next build`-Output und vergleicht "First Load JS" pro Route sowie
 * "First Load JS shared by all" gegen `bundle-budget.json`. Exit 1 bei
 * ueberzogenen Routes — CI-ready.
 *
 * Usage:
 *   pnpm run build | tsx scripts/check-bundle-size.ts
 *   # oder
 *   pnpm run size  (via package.json script — startet build intern)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type BudgetConfig = {
  shared_kb: number;
  routes: Record<string, number>;
};

type RouteMeasurement = {
  path: string;
  size: string;
  firstLoad: string;
  firstLoadKb: number;
};

const PROJECT_ROOT = resolve(__dirname, '..');
const BUDGET_FILE = resolve(PROJECT_ROOT, 'bundle-budget.json');

function readBudget(): BudgetConfig {
  const raw = readFileSync(BUDGET_FILE, 'utf8');
  const parsed = JSON.parse(raw) as BudgetConfig & { _comment?: string; baseline_date?: string };
  return { shared_kb: parsed.shared_kb, routes: parsed.routes };
}

function parseKb(value: string): number {
  // "358 kB" → 358, "1.2 MB" → 1200, "400 B" → 0.4
  const trimmed = value.trim();
  const match = /^([\d.]+)\s*(B|kB|MB)$/.exec(trimmed);
  if (!match) return NaN;
  const num = Number(match[1]);
  const unit = match[2];
  if (unit === 'B') return num / 1024;
  if (unit === 'MB') return num * 1024;
  return num;
}

/**
 * Parse the route-table from `next build` output.
 * Format:
 *   ┌ ƒ /path                          19.9 kB         358 kB
 *   ├ ƒ /other                          2.1 kB         180 kB
 *   └ ƒ /last                           5.4 kB         210 kB
 *   + First Load JS shared by all             162 kB
 */
function parseBuildOutput(output: string): {
  routes: RouteMeasurement[];
  sharedKb: number;
} {
  const lines = output.split('\n');
  const routes: RouteMeasurement[] = [];
  let sharedKb = NaN;

  for (const line of lines) {
    const stripped = line.replace(/^[┌├└│\s]+/, '').trim();

    // Route lines: "ƒ /path  size  firstLoad" or "○ /path ..."
    const routeMatch = /^[ƒ○●]\s+(\S+)\s+(\d+[\d.]*\s*(?:B|kB|MB))\s+(\d+[\d.]*\s*(?:B|kB|MB))\s*$/.exec(stripped);
    if (routeMatch) {
      const firstLoadKb = parseKb(routeMatch[3]);
      if (!Number.isNaN(firstLoadKb)) {
        routes.push({
          path: routeMatch[1],
          size: routeMatch[2],
          firstLoad: routeMatch[3],
          firstLoadKb,
        });
      }
      continue;
    }

    // Shared-bundle line: "+ First Load JS shared by all             162 kB"
    const sharedMatch = /First Load JS shared by all\s+(\d+[\d.]*\s*(?:B|kB|MB))/.exec(line);
    if (sharedMatch) {
      sharedKb = parseKb(sharedMatch[1]);
    }
  }

  return { routes, sharedKb };
}

function matchBudget(path: string, budget: BudgetConfig['routes']): number {
  if (path in budget) return budget[path];
  return budget._default ?? Infinity;
}

function main() {
  const budget = readBudget();

  // Read build output from stdin (piped) or run build ourselves
  const stdin = process.stdin.isTTY ? null : readStdin();
  const buildOutput = stdin || runBuild();

  const { routes, sharedKb } = parseBuildOutput(buildOutput);

  if (!routes.length) {
    console.error('[bundle-size] No route lines parsed. Check build output format.');
    process.exit(2);
  }

  console.log(`\nBundle-Budget check (${routes.length} routes, shared ${sharedKb.toFixed(1)} kB)\n`);
  console.log('Route                                     First Load  Budget  Delta');
  console.log('─'.repeat(74));

  const failures: string[] = [];

  // Check shared bundle
  if (sharedKb > budget.shared_kb) {
    const delta = sharedKb - budget.shared_kb;
    failures.push(`shared=${sharedKb.toFixed(1)}kB > ${budget.shared_kb}kB (+${delta.toFixed(1)}kB)`);
    console.log(`${'(shared First Load JS)'.padEnd(42)} ${sharedKb.toFixed(1).padStart(6)}kB  ${String(budget.shared_kb).padStart(4)}kB  +${delta.toFixed(1).padStart(5)}kB ❌`);
  } else {
    console.log(`${'(shared First Load JS)'.padEnd(42)} ${sharedKb.toFixed(1).padStart(6)}kB  ${String(budget.shared_kb).padStart(4)}kB  ${(budget.shared_kb - sharedKb).toFixed(1).padStart(5)}kB ✓`);
  }

  // Check routes
  for (const r of routes) {
    const limit = matchBudget(r.path, budget.routes);
    if (limit === Infinity) continue; // skipped
    const delta = r.firstLoadKb - limit;
    const ok = delta <= 0;
    const indicator = ok ? '✓' : '❌';
    const deltaStr = (ok ? '' : '+') + delta.toFixed(1).padStart(5) + 'kB';
    console.log(`${r.path.padEnd(42)} ${r.firstLoadKb.toFixed(1).padStart(6)}kB  ${String(limit).padStart(4)}kB  ${deltaStr} ${indicator}`);
    if (!ok) failures.push(`${r.path}=${r.firstLoadKb.toFixed(1)}kB > ${limit}kB (+${delta.toFixed(1)}kB)`);
  }

  if (failures.length) {
    console.error(`\n❌ ${failures.length} bundle-budget violations:`);
    for (const f of failures) console.error(`   ${f}`);
    console.error('\nFix: reduce bundle size (code-split, tree-shake, lazy-import) OR update bundle-budget.json with justification.');
    process.exit(1);
  }

  console.log(`\n✓ All routes within budget.`);
}

function readStdin(): string {
  const chunks: Buffer[] = [];
  const fd = 0;
  const fs = require('node:fs') as typeof import('node:fs');
  try {
    // Synchronous stdin read — simple for CLI.
    let buf = Buffer.alloc(1024);
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n === 0) break;
      chunks.push(Buffer.from(buf.subarray(0, n)));
    }
  } catch {
    // No stdin — fall through.
  }
  return Buffer.concat(chunks).toString('utf8');
}

function runBuild(): string {
  console.log('[bundle-size] Running next build...');
  try {
    return execSync('pnpm run build', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    const e = err as { stdout?: string };
    if (e.stdout) return e.stdout;
    throw err;
  }
}

main();
