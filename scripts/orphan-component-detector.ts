/**
 * Slice 228 — Orphan-Component-Detector (D46-Component-Achse automatisiert).
 *
 * Findet alle Components in src/components/ und src/features/ die als
 * Default-Export definiert sind, aber NIRGENDS via JSX `<ComponentName>`
 * verwendet werden.
 *
 * Slice 227 Discovery: `CommunityValuation` ist orphan production-code.
 * Slice 216 K-RR-1 + Slice 225 InfoTooltip-Migration wurden auf totes
 * Component appliziert ohne User-Wirkung. Tool verhindert das in Future-
 * Slices.
 *
 * Pattern: D46 (memory/decisions.md "Erweiterung Slice 227").
 *
 * Usage:
 *   npx tsx scripts/orphan-component-detector.ts
 *   pnpm run audit:orphan
 *
 * Exit-Codes:
 *   0 — keine orphans (clean)
 *   1 — mindestens 1 orphan (Mensch reviewt + entscheidet via D46-Heal-Optionen)
 *   2 — Skript-Fehler
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, basename } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const SRC_ROOT = resolve(PROJECT_ROOT, 'src');
const SCAN_DIRS = [
  resolve(SRC_ROOT, 'components'),
  resolve(SRC_ROOT, 'features'),
];

/**
 * Next.js-Routing-Components werden by-Routing rendered, nicht via JSX-Import.
 * Diese sind by-Convention "used" durch die Datei-Position.
 */
const ROUTING_FILE_BASENAMES = new Set([
  'page',
  'layout',
  'error',
  'loading',
  'default',
  'template',
  'not-found',
  'route',
  'head',
  'global-error',
]);

/**
 * Test-Files werden aktuell ausgeschlossen aus Source-Scope (sie definieren
 * keine Production-Components), aber INCLUDED beim Verwendungs-Grep —
 * wenn ein Test eine Component nutzt, lebt sie zumindest in Tests.
 */
const TEST_FILE_PATTERN = /\.test\.tsx?$|__tests__\//;

/**
 * KNOWN_ORPHANS — Allowlist von Components die intentionally NICHT in
 * Production-JSX sind. Slice 242 D52 Refinement #3 (analog wiring-check.ts).
 *
 * Test-only Components: Used by Tests, kein Production-JSX (test-fixtures).
 * Deferred Components: @experimental JSDoc oder Slice-Spec defer-Decision.
 *
 * Format: relative path from PROJECT_ROOT (forward-slashes).
 */
const KNOWN_ORPHANS: Record<string, string> = {
  // Test-only fixtures (intentionally not used in production-JSX)
  'src/components/community/FollowBtn.tsx': 'Test-only fixture (used by community-feed tests)',
  'src/components/home/HomeSkeleton.tsx': 'Test-only fixture (loading-state test scaffold)',
  'src/features/market/components/portfolio/OffersTab.tsx': 'Test-only fixture (manager-offers test scaffold)',
  // Slice 305: CommunityValuation (Slice-227-@experimental-Orphan) wurde gelöscht — Allowlist-Eintrag entfernt.
};

type ComponentDef = {
  /** Component-Name aus `export default function ComponentName` */
  name: string;
  /** Absoluter File-Pfad */
  filePath: string;
  /** Pfad relativ zu PROJECT_ROOT (für Report) */
  relPath: string;
};

type OrphanFinding = {
  component: ComponentDef;
  /** JSX usage-grep hits (excluding definition file itself) */
  jsxHits: number;
  /** Lazy-import hits (`dynamic(() => import('...X'))`) */
  lazyHits: number;
  /** Test-only usage flag */
  onlyInTests: boolean;
};

type Stats = {
  componentsScanned: number;
  orphansFound: number;
  testOnlyComponents: number;
  knownAllowlisted: number;
  realDrift: number;
};

/** Recursively walk dir and collect *.tsx files. */
function walkTsxFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = resolve(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkTsxFiles(full, out);
    } else if (full.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/** Extract Component-Name from `export default function ComponentName(...)`. */
function extractDefaultExportName(content: string): string | null {
  // Match `export default function Name(...)` or `export default function Name<T>(...)` or `export default function Name <`
  const fnMatch = /export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/.exec(content);
  if (fnMatch) return fnMatch[1];

  // `const X = (...) => ...` followed by `export default X`
  const constExportMatch = /export\s+default\s+([A-Z][A-Za-z0-9_]*)\s*[;\n]/.exec(content);
  if (constExportMatch) return constExportMatch[1];

  return null;
}

/** Should we skip this file? (Routing-files are not orphans by definition.) */
function isRoutingFile(filePath: string): boolean {
  const base = basename(filePath, '.tsx');
  return ROUTING_FILE_BASENAMES.has(base);
}

/**
 * Find all component definitions worth checking — Default-exports in
 * src/components/ and src/features/, excluding routing files and test files.
 */
function collectComponents(): ComponentDef[] {
  const components: ComponentDef[] = [];

  for (const dir of SCAN_DIRS) {
    const files = walkTsxFiles(dir);
    for (const filePath of files) {
      // Skip routing files (page.tsx, layout.tsx, etc.) — they're rendered by Next.js routing
      if (isRoutingFile(filePath)) continue;
      // Skip test files
      if (TEST_FILE_PATTERN.test(filePath)) continue;

      try {
        const content = readFileSync(filePath, 'utf8');
        const name = extractDefaultExportName(content);
        if (!name) continue;

        components.push({
          name,
          filePath,
          relPath: relative(PROJECT_ROOT, filePath).replace(/\\/g, '/'),
        });
      } catch {
        // ignore read errors
      }
    }
  }

  return components;
}

/**
 * Search for JSX usages of a component-name in src/, excluding the
 * definition file itself. Returns separate counts for JSX-tag-uses,
 * lazy-imports, and test-only usages.
 */
function findUsages(component: ComponentDef): { jsxHits: number; lazyHits: number; onlyInTests: boolean } {
  const allTsxFiles = walkTsxFiles(SRC_ROOT);
  const allTsFiles = walkTsxFiles(SRC_ROOT).concat(
    // Also scan .ts files for lazy imports
    walkTsxFiles(SRC_ROOT).filter(() => false), // placeholder, we'll do .ts via separate walk
  );
  // Walk src for .ts files separately
  function walkAllTs(dir: string, out: string[] = []): string[] {
    if (!existsSync(dir)) return out;
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const full = resolve(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walkAllTs(full, out);
      } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
        out.push(full);
      }
    }
    return out;
  }
  const allFiles = walkAllTs(SRC_ROOT);

  // Word-boundary regex to prevent substring-matches (e.g. `Card` matching `CardFrame`).
  // Match `<ComponentName ` or `<ComponentName/` or `<ComponentName>` or `<ComponentName\n`.
  const jsxRegex = new RegExp(`<${component.name}[\\s/>]`, 'g');
  // Lazy-import: `dynamic(() => import('@/components/.../ComponentName'))` or relative
  const lazyRegex = new RegExp(`import\\(['"][^'"]*\\b${component.name}\\b['"]`, 'g');

  let jsxHits = 0;
  let lazyHits = 0;
  let nonTestJsxHits = 0;

  for (const file of allFiles) {
    if (file === component.filePath) continue; // skip self

    let content: string;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const isTest = TEST_FILE_PATTERN.test(file);

    const jsxMatches = (content.match(jsxRegex) || []).length;
    const lazyMatches = (content.match(lazyRegex) || []).length;

    jsxHits += jsxMatches;
    lazyHits += lazyMatches;

    if (!isTest) nonTestJsxHits += jsxMatches;
  }

  const onlyInTests = jsxHits > 0 && nonTestJsxHits === 0 && lazyHits === 0;

  return { jsxHits, lazyHits, onlyInTests };
}

function formatReport(orphans: OrphanFinding[], stats: Stats): string {
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push(`# Orphan-Components Report — ${date}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Slice:** 228 (D46-Component-Achse automatisiert) · 242 (Allowlist D52 #3)`);
  lines.push(`**Pattern-Source:** \`memory/decisions.md\` D46 "Erweiterung Slice 227"`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Components scanned:** ${stats.componentsScanned}`);
  lines.push(`- **Orphans found (real drift):** ${stats.realDrift}`);
  lines.push(`- **Known (allowlisted):** ${stats.knownAllowlisted}`);
  lines.push(`- **Test-only used:** ${stats.testOnlyComponents}`);
  lines.push('');

  if (orphans.length === 0) {
    lines.push('## Result: ✅ Clean');
    lines.push('');
    lines.push('No orphan components. All scanned components have at least 1 JSX or lazy-import usage in non-test code.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('## Orphan Components');
  lines.push('');
  lines.push('Each component below is **defined + exported** but **not imported anywhere as a JSX-tag** in non-test code. D46 Heal-Options apply: (A) delete · (B) wire · (C) defer with `@experimental` JSDoc.');
  lines.push('');

  for (const o of orphans) {
    lines.push(`### \`${o.component.name}\``);
    lines.push('');
    lines.push(`- **File:** \`${o.component.relPath}\``);
    lines.push(`- **JSX usages (excl. self):** ${o.jsxHits}`);
    lines.push(`- **Lazy-import usages:** ${o.lazyHits}`);
    if (o.onlyInTests) {
      lines.push(`- **Note:** Used in TESTS only — Component lebt in test-suite aber nicht in production-render-tree.`);
    }
    lines.push('');
    lines.push(`**Heal-Options (D46):**`);
    lines.push(`- (A) **Delete** — wenn keine Wire-Plan existiert. Entferne File + Barrel-Export.`);
    lines.push(`- (B) **Wire** — wenn klar ist auf welcher Page/Component es eingebaut werden soll.`);
    lines.push(`- (C) **Defer** — JSDoc \`@experimental\` Tag + Backlog-Eintrag in \`worklog/beta-phase.md\`.`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('**Audit-Methodik-Pflicht:** Audit-Agents müssen vor P1-Klassifikation eines Component-Findings import-trace prüfen (D46-Sub-Section "Pflicht-Regel"). Tool ist Reminder + CI-Gate.');
  lines.push('');

  return lines.join('\n');
}

function main(): void {
  const components = collectComponents();
  const allOrphans: OrphanFinding[] = [];
  let testOnlyCount = 0;

  for (const component of components) {
    const usage = findUsages(component);
    if (usage.jsxHits === 0 && usage.lazyHits === 0) {
      allOrphans.push({
        component,
        jsxHits: 0,
        lazyHits: 0,
        onlyInTests: false,
      });
    } else if (usage.onlyInTests) {
      testOnlyCount++;
      allOrphans.push({
        component,
        jsxHits: usage.jsxHits,
        lazyHits: usage.lazyHits,
        onlyInTests: true,
      });
    }
  }

  // Slice 242: split allowlisted (known) vs. real-drift orphans
  const knownAllowlisted: OrphanFinding[] = [];
  const orphans: OrphanFinding[] = [];
  for (const o of allOrphans) {
    if (KNOWN_ORPHANS[o.component.relPath]) {
      knownAllowlisted.push(o);
    } else {
      orphans.push(o);
    }
  }

  const stats: Stats = {
    componentsScanned: components.length,
    orphansFound: orphans.length,
    testOnlyComponents: testOnlyCount,
    knownAllowlisted: knownAllowlisted.length,
    realDrift: orphans.length,
  };

  // Write report
  const reportPath = resolve(
    PROJECT_ROOT,
    `worklog/audits/orphan-components-${new Date().toISOString().slice(0, 10)}.md`,
  );
  const reportDir = dirname(reportPath);
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, formatReport(orphans, stats), 'utf8');

  // Stdout summary
  console.log('═══ Orphan-Component-Detector ═══');
  console.log(`Components scanned: ${stats.componentsScanned}`);
  console.log(`Orphans found:         ${allOrphans.length}`);
  console.log(`Real drift:            ${stats.realDrift}`);
  console.log(`Known (allowlisted):   ${stats.knownAllowlisted}`);
  console.log(`Test-only used:        ${stats.testOnlyComponents}`);
  console.log(`Report: ${reportPath}`);
  console.log('');

  if (orphans.length === 0) {
    console.log('✅ No orphan components.');
    process.exit(0);
  }

  console.log(`⚠️  ${orphans.length} orphan-component(s):`);
  for (const o of orphans) {
    const flag = o.onlyInTests ? '(test-only)' : '(unused)';
    console.log(`  • ${o.component.name} ${flag} — ${o.component.relPath}`);
  }
  console.log('');
  console.log('D46 Heal-Options apply (delete / wire / defer). See report for details.');
  process.exit(1);
}

main();
