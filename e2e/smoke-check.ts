/**
 * Smoke Check — prueft alle Routes auf HTTP 200 nach Deploy.
 * Kein Browser noetig, kein Login, keine Dependencies ausser Node.
 *
 * Usage:
 *   npx tsx e2e/smoke-check.ts                          # gegen bescout.net
 *   npx tsx e2e/smoke-check.ts https://staging.bescout.net  # gegen Staging
 */

const BASE = process.argv[2] ?? 'https://bescout.net';

const PUBLIC_ROUTES = [
  '/',
  '/welcome',
  '/login',
  '/pitch',
  '/agb',
  '/datenschutz',
  '/impressum',
  '/blocked',
];

const AUTH_ROUTES = [
  '/market',
  '/fantasy',
  '/missions',
  '/inventory',
  '/compare',
  '/rankings',
  '/clubs',
  '/community',
  '/transactions',
  '/airdrop',
  '/founding',
  '/profile',
  '/manager',
];

type Result = { route: string; status: number; ms: number; ok: boolean };

async function check(route: string): Promise<Result> {
  const url = `${BASE}${route}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'BeScout-SmokeCheck/1.0' },
    });
    const ms = Date.now() - start;
    // Auth routes redirect to /login (302→200) — that's expected, not a failure
    const ok = res.status >= 200 && res.status < 400;
    return { route, status: res.status, ms, ok };
  } catch (err) {
    return { route, status: 0, ms: Date.now() - start, ok: false };
  }
}

async function main() {
  console.log(`\nSmoke Check: ${BASE}\n`);

  const allRoutes = [...PUBLIC_ROUTES, ...AUTH_ROUTES];
  const results: Result[] = [];

  for (const route of allRoutes) {
    const r = await check(route);
    const icon = r.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`  ${icon} ${r.route.padEnd(20)} ${String(r.status).padEnd(5)} ${r.ms}ms`);
    results.push(r);
  }

  const failed = results.filter(r => !r.ok);
  const avgMs = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);

  console.log(`\n${results.length} routes, ${failed.length} failed, avg ${avgMs}ms`);

  if (failed.length > 0) {
    console.log('\nFailed routes:');
    for (const f of failed) {
      console.log(`  ✗ ${f.route} → ${f.status}`);
    }
    process.exit(1);
  }
}

main();
