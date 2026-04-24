#!/usr/bin/env tsx
/**
 * Slice 190 — Cron-Route-Registry-Audit
 *
 * Verhindert Slice 187b-Typ Silent-Gap:
 *   route.ts existiert in src/app/api/cron/<name>/ aber vercel.json crons[]
 *   hat keinen entsprechenden Entry → Cron wird NIE automatisch getriggert.
 *
 * Usage:
 *   pnpm run cron:audit
 *   exit 0  → alle Routes registriert
 *   exit 1  → Mismatch gefunden
 *
 * CI-Integration: .github/workflows/ci.yml (neuer Step).
 */

import fs from 'node:fs';
import path from 'node:path';

type VercelJson = {
  crons?: Array<{ path: string; schedule: string }>;
};

const REPO_ROOT = path.resolve(__dirname, '..');
const CRON_DIR = path.join(REPO_ROOT, 'src/app/api/cron');
const VERCEL_JSON = path.join(REPO_ROOT, 'vercel.json');

function listCronRoutes(): string[] {
  if (!fs.existsSync(CRON_DIR)) return [];
  const entries = fs.readdirSync(CRON_DIR, { withFileTypes: true });
  const routes: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const routeFile = path.join(CRON_DIR, entry.name, 'route.ts');
    if (fs.existsSync(routeFile)) {
      routes.push(`/api/cron/${entry.name}`);
    }
  }
  return routes.sort();
}

function listVercelCronPaths(): string[] {
  if (!fs.existsSync(VERCEL_JSON)) {
    throw new Error('vercel.json not found');
  }
  const raw = fs.readFileSync(VERCEL_JSON, 'utf8');
  const parsed = JSON.parse(raw) as VercelJson;
  return (parsed.crons ?? []).map((c) => c.path).sort();
}

function main(): void {
  const codeRoutes = listCronRoutes();
  const registeredPaths = listVercelCronPaths();

  const codeSet = new Set(codeRoutes);
  const regSet = new Set(registeredPaths);

  const missingInRegistry = codeRoutes.filter((r) => !regSet.has(r));
  const missingInCode = registeredPaths.filter((p) => !codeSet.has(p));

  const lines: string[] = [];
  lines.push('=== Cron-Route-Registry Audit ===');
  lines.push(`Code routes:       ${codeRoutes.length}`);
  lines.push(`vercel.json paths: ${registeredPaths.length}`);
  lines.push('');

  if (missingInRegistry.length === 0 && missingInCode.length === 0) {
    lines.push('✓ OK — all cron-routes registered in vercel.json');
    console.log(lines.join('\n'));
    process.exit(0);
  }

  if (missingInRegistry.length > 0) {
    lines.push(`✗ Routes in code but MISSING in vercel.json (${missingInRegistry.length}):`);
    for (const r of missingInRegistry) lines.push(`  - ${r}`);
    lines.push('');
    lines.push('  Fix: Add entry to vercel.json "crons" array:');
    lines.push('    { "path": "<path>", "schedule": "<cron-expr>" }');
    lines.push('');
  }

  if (missingInCode.length > 0) {
    lines.push(`✗ Paths in vercel.json but MISSING route.ts (${missingInCode.length}):`);
    for (const p of missingInCode) lines.push(`  - ${p}`);
    lines.push('');
    lines.push('  Fix: Create src/app/api/cron/<name>/route.ts OR remove vercel.json entry.');
    lines.push('');
  }

  console.error(lines.join('\n'));
  process.exit(1);
}

main();
