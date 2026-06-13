/**
 * Slice 234 — Wiring-Check (D54 Drift-Detection für Hooks/Scripts/NPM-Scripts).
 *
 * Findet alle Tools/Hooks/Scripts die existieren aber NIRGENDS aufgerufen werden
 * (Build-without-Wire-Pattern). Schließt die D46-Pattern-Familie:
 *   - D46 (Slice 228): orphan-component-detector.ts — Components
 *   - D54 (Slice 234): wiring-check.ts — Hooks + Scripts + NPM-Scripts
 *
 * Detection-Achsen:
 *   A. Hook-Drift:    .claude/hooks/*.sh ↔ .claude/settings.json registration
 *   B. Script-Drift:  scripts/*.ts|*.sh  ↔ package.json + GHA + Vercel + Hooks
 *   C. NPM-Drift:     package.json audit:*|test:* ↔ CI/Cron/Hook calls
 *
 * Usage:
 *   npx tsx scripts/wiring-check.ts          # full report
 *   npx tsx scripts/wiring-check.ts --check  # CI-mode (exit 1 bei orphans)
 *   pnpm run audit:wiring
 *
 * Exit-Codes:
 *   0 — keine orphans (clean)
 *   1 — mindestens 1 orphan (Mensch reviewt + heilt analog D46)
 *   2 — Skript-Fehler
 *
 * Allowlist: KNOWN_ORPHANS (Once-Off-Tools die NICHT in CI gehören).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, basename, relative } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const HOOKS_DIR = resolve(PROJECT_ROOT, '.claude/hooks');
const HOOKS_ARCHIVED = resolve(HOOKS_DIR, 'archived');
const SCRIPTS_DIR = resolve(PROJECT_ROOT, 'scripts');
const SETTINGS_JSON = resolve(PROJECT_ROOT, '.claude/settings.json');
const PACKAGE_JSON = resolve(PROJECT_ROOT, 'package.json');
const VERCEL_JSON = resolve(PROJECT_ROOT, 'vercel.json');
const GHA_DIR = resolve(PROJECT_ROOT, '.github/workflows');
const REPORT_DIR = resolve(PROJECT_ROOT, 'worklog/audits');

const args = process.argv.slice(2);
const CHECK_MODE = args.includes('--check');

/**
 * KNOWN_ORPHANS — Allowlist von Tools die intentionally NICHT in CI gehören.
 * Diese sind Once-Off-Maintenance-Tools, manueller Trigger gewollt.
 *
 * Format: relative path from PROJECT_ROOT.
 */
const KNOWN_ORPHANS: Record<string, string> = {
  // Sourced-Library, kein standalone Hook — via `source lib/effort-guard.sh` in 10
  // SHIP-Hooks gewired (Effort-Gate-Tooling-Upgrade, committed Slice 282a Track D).
  '.claude/hooks/lib/effort-guard.sh': 'Shared sourced lib (Effort-Gate), kein settings.json-Entry nötig',
  // TM-Operational manual-tools (Slice 240 Triage — kept) — Cloudflare-Workaround,
  // recurring on demand, nicht CI-gated.
  'scripts/tm-rescrape-stale.ts': 'Stale-TM-Data-Maintenance, recurring on demand',
  'scripts/tm-parser-sanity.ts': 'TM-Parser-Regression-Test, manuell on parser-edits',
  'scripts/tm-parser-verify.ts': 'TM-Parser-Verification (offline pair zu sanity), manuell',
  'scripts/tm-profile-local.ts': 'TM-Profile-Scraper (Cloudflare-Workaround), recurring',
  'scripts/tm-search-local.ts': 'TM-Search (Cloudflare-Workaround), recurring',
  'scripts/tm-search-scrape-unknown.ts': 'Unknown-Player-Recovery, recurring',
  'scripts/enrich-nationality-tm.ts': 'Nationality-Backfill, manuell on Multi-League-Import',
  'scripts/verify-nationality-coverage.ts': 'Nationality-Audit, manuell on demand',
  // (Slice 240 archived: tm-club-id-discovery, tm-squad-scrape-local, tm-html-inspect,
  //  fix-bug-004, fix-migration-history → scripts/archived/2026-04-28-once-off/)
  // (Slice 234 Reviewer-F-03 Heal: findings-to-slices.ts entfernt aus Allowlist —
  //  ist via nightly-audit.yml `npx tsx scripts/findings-to-slices.ts` gewired,
  //  Detection findet das via ghaContent.includes('findings-to-slices.ts'))
  // NPM-Scripts die LEGITIM nicht in CI sind
  'npm:dev': 'Local-only dev-server',
  'npm:build': 'Used in build-job, not audit-job',
  'npm:lint': 'Used in lint-job',
  'npm:type-check': 'Used in lint-job',
  'npm:cron:audit': 'Used in lint-job',
  'npm:test:e2e': 'Manual e2e-Run, not nightly (post-deploy-smoke covers smoke-only)',
  'npm:test:watch': 'Local-only watch-mode for vitest',
  'npm:test:smoke': 'Called via "pnpm exec playwright test --project=smoke" in nightly-audit.yml + post-deploy-smoke.yml (not via pnpm run)',
  'npm:test:synthetic': 'Manual synthetic-user-run, generates qa-screenshots/synthetic dump for tr-strings audit',
  'npm:test:fantasy-lifecycle': 'Called via "pnpm exec playwright test --project=fantasy-lifecycle" in nightly-audit.yml (non-blocking trigger, Slice 293; not via pnpm run)',
  'npm:test:club-lifecycle': 'Called via "pnpm exec playwright test --project=club-lifecycle" in nightly-audit.yml (non-blocking trigger, Slice 298; not via pnpm run)',
  'npm:audit:wiring:check': 'Called by ship-tool-wiring-gate.sh hook (Slice 234 Pre-Commit gate)',
  'npm:audit:cron-health:check': 'Slice 255 strict-mode variant; nightly nutzt audit:cron-health (WARN-only). :check für künftige CI-blocking-Erweiterung wenn cron-stale = beta-blocker.',
  'npm:rotate-secret': 'Slice 255 manual-tool für Secret-Rotation, manueller Trigger gewollt (3-Location-Sync).',
  'npm:audit': 'Aggregated audit-runner, not nightly',
};

type Orphan = {
  kind: 'hook' | 'script' | 'npm-script';
  path: string;
  reason: string;
  knownOrphan?: string;
};

function listFiles(dir: string, ext?: string[]): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip archived/ subdirectory
      if (entry === 'archived') continue;
      files.push(...listFiles(full, ext));
    } else if (st.isFile()) {
      if (!ext || ext.some((e) => full.endsWith(e))) files.push(full);
    }
  }
  return files;
}

function readFileSafe(p: string): string {
  try {
    return readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function fileContains(content: string, needle: string): boolean {
  return content.includes(needle);
}

function detectHookOrphans(): Orphan[] {
  const settings = readFileSafe(SETTINGS_JSON);
  if (!settings) return [];

  const hooks = listFiles(HOOKS_DIR, ['.sh']);
  const orphans: Orphan[] = [];

  for (const hook of hooks) {
    const name = basename(hook);
    // Hook is registered if its filename appears in settings.json
    if (!fileContains(settings, name)) {
      const rel = relative(PROJECT_ROOT, hook).replace(/\\/g, '/');
      const known = KNOWN_ORPHANS[rel];
      orphans.push({
        kind: 'hook',
        path: rel,
        reason: 'Not registered in .claude/settings.json',
        knownOrphan: known,
      });
    }
  }

  return orphans;
}

function detectScriptOrphans(): Orphan[] {
  const scripts = listFiles(SCRIPTS_DIR, ['.ts', '.sh']);
  // Aggregate all callers
  const pkg = readFileSafe(PACKAGE_JSON);
  const vercel = readFileSafe(VERCEL_JSON);
  const settings = readFileSafe(SETTINGS_JSON);
  const ghaFiles = listFiles(GHA_DIR, ['.yml', '.yaml']);
  const ghaContent = ghaFiles.map(readFileSafe).join('\n');
  const hookContent = listFiles(HOOKS_DIR, ['.sh']).map(readFileSafe).join('\n');
  const allCallers = pkg + '\n' + vercel + '\n' + settings + '\n' + ghaContent + '\n' + hookContent;

  const orphans: Orphan[] = [];
  for (const script of scripts) {
    const name = basename(script);
    if (!fileContains(allCallers, name)) {
      const rel = relative(PROJECT_ROOT, script).replace(/\\/g, '/');
      const known = KNOWN_ORPHANS[rel];
      orphans.push({
        kind: 'script',
        path: rel,
        reason: 'Not called from package.json | GHA | Vercel-Cron | .claude/hooks/',
        knownOrphan: known,
      });
    }
  }

  return orphans;
}

function detectNpmScriptOrphans(): Orphan[] {
  const pkg = readFileSafe(PACKAGE_JSON);
  if (!pkg) return [];
  const ghaFiles = listFiles(GHA_DIR, ['.yml', '.yaml']);
  const ghaContent = ghaFiles.map(readFileSafe).join('\n');
  const hookContent = listFiles(HOOKS_DIR, ['.sh']).map(readFileSafe).join('\n');
  const callers = ghaContent + '\n' + hookContent;

  // Extract pnpm-Script-Names from package.json
  // Matches "  \"audit:foo\":" / "  \"test:bar\":"
  const scriptRegex = /"(audit:[a-z][a-z:-]*|test:[a-z][a-z:-]*|cron:[a-z][a-z:-]*)"\s*:/g;
  const orphans: Orphan[] = [];
  let m: RegExpExecArray | null;
  while ((m = scriptRegex.exec(pkg)) !== null) {
    const scriptName = m[1];
    // Skip script-references that are themselves callers (e.g. "audit:silent-fail:check" calls "audit:silent-fail" via npx tsx)
    // Detection: search for `pnpm run <scriptName>` or `pnpm exec <scriptName>` or `npm run <scriptName>` in callers
    const callPattern1 = `pnpm run ${scriptName}`;
    const callPattern2 = `pnpm exec ${scriptName}`;
    const callPattern3 = `npm run ${scriptName}`;
    if (
      !callers.includes(callPattern1) &&
      !callers.includes(callPattern2) &&
      !callers.includes(callPattern3)
    ) {
      const allowKey = `npm:${scriptName}`;
      orphans.push({
        kind: 'npm-script',
        path: allowKey,
        reason: `pnpm run ${scriptName} not called in any GHA/Hook`,
        knownOrphan: KNOWN_ORPHANS[allowKey],
      });
    }
  }

  return orphans;
}

function formatReport(orphans: Orphan[]): string {
  const today = new Date().toISOString().split('T')[0];
  const lines: string[] = [];
  lines.push(`# Wiring-Check Report — ${today}`);
  lines.push('');
  lines.push(`Slice 234 D54 — Build-without-Wire Detection.`);
  lines.push('');

  const groups: Record<string, Orphan[]> = {
    hook: [],
    script: [],
    'npm-script': [],
  };
  for (const o of orphans) groups[o.kind].push(o);

  const totalReal = orphans.filter((o) => !o.knownOrphan).length;
  const totalKnown = orphans.filter((o) => o.knownOrphan).length;

  lines.push(`## Summary`);
  lines.push('');
  lines.push(`- Total orphans found:        ${orphans.length}`);
  lines.push(`- Real orphans (drift):       ${totalReal}`);
  lines.push(`- Known orphans (allowlist):  ${totalKnown}`);
  lines.push('');

  for (const kind of ['hook', 'script', 'npm-script'] as const) {
    const list = groups[kind];
    if (list.length === 0) continue;
    lines.push(`## ${kind} (${list.length})`);
    lines.push('');
    lines.push('| Path | Status | Reason |');
    lines.push('|------|--------|--------|');
    for (const o of list) {
      const status = o.knownOrphan ? `KNOWN: ${o.knownOrphan}` : '🔴 DRIFT';
      lines.push(`| \`${o.path}\` | ${status} | ${o.reason} |`);
    }
    lines.push('');
  }

  if (totalReal > 0) {
    lines.push('## Heal-Optionen (D54 Pattern-Familie analog D46)');
    lines.push('');
    lines.push('1. **WIRE**: Tool in passenden Trigger eintragen (settings.json / package.json / GHA / Cron)');
    lines.push('2. **ARCHIVE**: Move zu `archived/`-Subfolder + KNOWN_ORPHANS-Entry');
    lines.push('3. **DELETE**: Tool obsolet, weg damit');
    lines.push('4. **ALLOWLIST**: Tool ist intentional manuell — KNOWN_ORPHANS-Entry mit Begründung');
    lines.push('');
  }

  return lines.join('\n');
}

function main(): number {
  console.log('═══ Wiring-Check (Slice 234, D54) ═══');

  const hookOrphans = detectHookOrphans();
  const scriptOrphans = detectScriptOrphans();
  const npmOrphans = detectNpmScriptOrphans();
  const all = [...hookOrphans, ...scriptOrphans, ...npmOrphans];
  const realOrphans = all.filter((o) => !o.knownOrphan);

  console.log(`Hooks scanned:        ${listFiles(HOOKS_DIR, ['.sh']).length}`);
  console.log(`Scripts scanned:      ${listFiles(SCRIPTS_DIR, ['.ts', '.sh']).length}`);
  console.log(`Total orphans:        ${all.length}`);
  console.log(`Real drift:           ${realOrphans.length}`);
  console.log(`Known (allowlisted):  ${all.length - realOrphans.length}`);

  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  const today = new Date().toISOString().split('T')[0];
  const reportPath = resolve(REPORT_DIR, `wiring-${today}.md`);
  writeFileSync(reportPath, formatReport(all));
  console.log(`Report:               ${relative(PROJECT_ROOT, reportPath).replace(/\\/g, '/')}`);

  if (realOrphans.length > 0) {
    console.log('');
    console.log(`⚠️  ${realOrphans.length} real-drift orphan(s):`);
    for (const o of realOrphans) {
      console.log(`  • [${o.kind}] ${o.path}`);
    }
    console.log('');
    console.log('D54 Heal-Options apply (wire / archive / delete / allowlist). See report for details.');
    return 1;
  }

  console.log('');
  console.log('✅ No drift orphans found. All tools wired.');
  return 0;
}

const code = main();
if (CHECK_MODE && code !== 0) process.exit(code);
process.exit(code);
