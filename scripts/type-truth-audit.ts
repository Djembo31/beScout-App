/**
 * Slice 229 — Type-Truth-Audit (D43/D49 Pattern-Detection).
 *
 * Static-Analysis für 3 bekannte Bug-Patterns in Service-Layer:
 *
 *   PATTERN-A (Silent-Cast-After-RPC):
 *     `await supabase.rpc(...)` gefolgt von `as XYZ` Cast ohne
 *     discriminator-Check (`if (!data.success || ...)`).
 *     Source: Slice 165 — Vote-Toggle-Bug (errors-db.md "Silent-Cast").
 *
 *   PATTERN-B (Missing Error-Destructure):
 *     `const { data } = await supabase.from(...)` ohne `error` co-destructured.
 *     Source: 117 Hardening-Fixes 2026-04-13 (errors-db.md
 *     "Service Error-Swallowing").
 *
 *   PATTERN-C (PostgREST Nested-Select with Implicit-Cast):
 *     `.select('parent.*, child:other_table(...)')` gefolgt von `as Type[]`
 *     ohne null-handling für nested rows.
 *     Source: Slice 192 — Manager-Aufstellen Auth-Race
 *     (errors-db.md "PostgREST nested-select Auth-Race").
 *
 * Pragmatic-Pick: Static Pattern-Detection statt Live-DB-pg_get_functiondef-
 * Lookup (D43 nennt das als M-Slice-Backlog). Coverage: ~80% der bekannten
 * Bug-Klassen ohne Setup-Cost.
 *
 * Usage:
 *   npx tsx scripts/type-truth-audit.ts
 *   pnpm run audit:type-truth
 *
 * Exit-Codes:
 *   0 — keine risk-patterns
 *   1 — mindestens 1 hit (Mensch reviewt + entscheidet)
 *   2 — Skript-Fehler
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const SCAN_DIRS = [
  resolve(PROJECT_ROOT, 'src/lib/services'),
  resolve(PROJECT_ROOT, 'src/lib/queries'),
  resolve(PROJECT_ROOT, 'src/features'),
];

const TEST_FILE_PATTERN = /\.test\.(ts|tsx|mjs)$|__tests__\//;

type PatternHit = {
  file: string;
  relPath: string;
  line: number;
  pattern: 'A-silent-cast' | 'B-missing-error' | 'C-nested-select';
  snippet: string;
  healHint: string;
};

type Stats = {
  filesScanned: number;
  hitsA: number;
  hitsB: number;
  hitsC: number;
};

function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkTsFiles(full, out);
    } else if ((full.endsWith('.ts') || full.endsWith('.tsx')) && !TEST_FILE_PATTERN.test(full)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Pattern A: `await supabase.rpc(...)` + nearby `as XYZ` cast without
 * a preceding discriminator-check (`if (!data.success || ...) throw`).
 *
 * Heuristic: scan for `\.rpc\(` lines, then look ±15 lines for `as ` cast.
 * If found, look ±15 lines for `success` / `!data.` / `throw new Error` —
 * if absent, flag.
 */
function detectPatternA(content: string, file: string): PatternHit[] {
  const hits: PatternHit[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (!/\.rpc\s*\(/.test(lines[i])) continue;

    // Search next 15 lines for `as ` cast (likely on data variable).
    // Accept `data as Word`, `data as { ... }` (inline object-type),
    // `data as Array<...>`, `data as (...)[]`.
    for (let j = i; j < Math.min(i + 15, lines.length); j++) {
      const castMatch = /\b(?:return\s+)?data\s+as\s+[\w{(]/.exec(lines[j]);
      if (!castMatch) continue;

      // Now check lines i..j for any defensive guard before the cast.
      // Accept multiple guard styles:
      //   - discriminated-union check (`!data.success`, `data.success === false`)
      //   - supabase-error check (`if (error`, `if (!error`, renamed `error: rpcErr`)
      //   - null-data check (`if (!data`, `data ?? []`)
      //   - throw-on-failure (`throw new Error`)
      //   - nullable cast (cast-target ends with `| null` or `| undefined`)
      let hasGuard = false;
      for (let k = i; k <= j; k++) {
        if (/(!data\.success|data\.success\s*===\s*false|if\s*\(\s*!?\s*error\b|if\s*\(\s*!\s*data\b|throw\s+new\s+Error|typeof\s+\w+\s*!==|data\s*\?\?\s*\[|!error\s*&&\s*data|\berror\s*:\s*\w+\s*\}\s*=|\|\s*null\b|\|\s*undefined\b)/.test(lines[k])) {
          hasGuard = true;
          break;
        }
      }
      if (!hasGuard) {
        hits.push({
          file,
          relPath: relative(PROJECT_ROOT, file).replace(/\\/g, '/'),
          line: j + 1,
          pattern: 'A-silent-cast',
          snippet: lines[j].trim().slice(0, 140),
          healHint: 'Pre-Cast-Guard ergänzen: `if (data?.success === false) throw new Error(data.error ?? \'rpc_failed\');` (errors-db.md Slice 165 Pattern).',
        });
      }
      break; // only first cast after rpc
    }
  }

  return hits;
}

/**
 * Pattern B: `const { data } = await supabase.(from|rpc)` ohne `error`
 * co-destructured.
 */
function detectPatternB(content: string, file: string): PatternHit[] {
  const hits: PatternHit[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // Match `const { data } = await supabase.from(` or `.rpc(`
    // (without `error`)
    const m = /const\s*\{\s*data\s*\}\s*=\s*await\s+(?:[\w.]+\.)?supabase\s*\.\s*(?:from|rpc)\s*\(/.exec(lines[i]);
    if (!m) continue;

    hits.push({
      file,
      relPath: relative(PROJECT_ROOT, file).replace(/\\/g, '/'),
      line: i + 1,
      pattern: 'B-missing-error',
      snippet: lines[i].trim().slice(0, 140),
      healHint: '`error` zu Destructuring ergänzen: `const { data, error } = await ...; if (error) throw new Error(error.message);` (errors-db.md Service Error-Swallowing).',
    });
  }

  return hits;
}

/**
 * Pattern C: `.select(` mit nested-relation-shape (e.g. `parent, child:tbl(...)`)
 * + nahegelegener `as Type[]` Cast ohne null-Filter.
 *
 * Heuristic: scan für `.select(` Zeilen mit `:` (relation alias) + `(` (nested),
 * dann 15 Zeilen weiter `as ` Cast suchen, plus check ob `filter`/`null`-handling
 * dazwischen ist.
 */
function detectPatternC(content: string, file: string): PatternHit[] {
  const hits: PatternHit[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // `.select('...:...(' suggests nested-relation
    // Be tolerant: nested-select strings can span multiple lines
    if (!/\.select\s*\(/.test(lines[i])) continue;
    // Look ahead 5 lines to find `:tablename(` or `relation:` pattern
    let hasNested = false;
    for (let k = i; k < Math.min(i + 5, lines.length); k++) {
      if (/\w+\s*:\s*\w+\s*\(/.test(lines[k])) {
        hasNested = true;
        break;
      }
    }
    if (!hasNested) continue;

    // Look forward 20 lines for `as Type[]` cast
    for (let j = i; j < Math.min(i + 20, lines.length); j++) {
      if (!/\bas\s+\w+\[\]/.test(lines[j])) continue;

      // Check intervening lines for null-filter or null-check
      let hasFilter = false;
      for (let k = i; k <= j; k++) {
        if (/\.filter\s*\(|\.player\s*==?\s*null|player\s*\?\.|\?\?\s*\[?\]/.test(lines[k])) {
          hasFilter = true;
          break;
        }
      }
      if (!hasFilter) {
        hits.push({
          file,
          relPath: relative(PROJECT_ROOT, file).replace(/\\/g, '/'),
          line: j + 1,
          pattern: 'C-nested-select',
          snippet: lines[j].trim().slice(0, 140),
          healHint: 'Nested-relation kann silent NULL bei Auth-Race liefern (Slice 192/193). Filter ergänzen: `data.filter(r => r.relation != null)` ODER mapper-throw bei null-relation.',
        });
      }
      break;
    }
  }

  return hits;
}

function formatReport(hits: PatternHit[], stats: Stats): string {
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push(`# Type-Truth Audit Report — ${date}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Slice:** 229 (D43/D49 Pattern-Detection)`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Files scanned:** ${stats.filesScanned}`);
  lines.push(`- **PATTERN-A (Silent-Cast-After-RPC):** ${stats.hitsA} hits`);
  lines.push(`- **PATTERN-B (Missing Error-Destructure):** ${stats.hitsB} hits`);
  lines.push(`- **PATTERN-C (Nested-Select Implicit-Cast):** ${stats.hitsC} hits`);
  lines.push(`- **Total:** ${hits.length} hits`);
  lines.push('');

  if (hits.length === 0) {
    lines.push('## Result: ✅ Clean');
    lines.push('');
    lines.push('No type-truth-drift patterns found in services.');
    lines.push('');
    return lines.join('\n');
  }

  // Group by pattern
  const byPattern = new Map<string, PatternHit[]>();
  for (const hit of hits) {
    if (!byPattern.has(hit.pattern)) byPattern.set(hit.pattern, []);
    byPattern.get(hit.pattern)!.push(hit);
  }

  for (const [pattern, patternHits] of byPattern.entries()) {
    lines.push(`## Pattern \`${pattern}\` (${patternHits.length} hits)`);
    lines.push('');
    if (pattern === 'A-silent-cast') {
      lines.push('**Risk:** RPC return-shape mismatch silent-cast → undefined fields, NaN-render, Toast-Fehler ohne Stack.');
      lines.push('');
    } else if (pattern === 'B-missing-error') {
      lines.push('**Risk:** Supabase-error-Object verloren — React-Query cached null als success, kein Retry, UI stuck.');
      lines.push('');
    } else if (pattern === 'C-nested-select') {
      lines.push('**Risk:** PostgREST nested-relation kann silent NULL liefern bei Auth-Race (Cookie-Resume) → Geister-Rows mit Defaults.');
      lines.push('');
    }
    for (const h of patternHits) {
      lines.push(`### \`${h.relPath}:${h.line}\``);
      lines.push('');
      lines.push('```ts');
      lines.push(h.snippet);
      lines.push('```');
      lines.push('');
      lines.push(`**Heal:** ${h.healHint}`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('**Note:** Static-Analysis. False-Positives möglich — manueller Review pflicht. Bei legitimen Cases: Code-Comment ergänzen warum Pattern OK ist.');
  lines.push('');

  return lines.join('\n');
}

function main(): void {
  const allFiles: string[] = [];
  for (const dir of SCAN_DIRS) walkTsFiles(dir, allFiles);

  const allHits: PatternHit[] = [];
  let hitsA = 0, hitsB = 0, hitsC = 0;

  for (const file of allFiles) {
    let content: string;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const a = detectPatternA(content, file);
    const b = detectPatternB(content, file);
    const c = detectPatternC(content, file);
    hitsA += a.length;
    hitsB += b.length;
    hitsC += c.length;
    allHits.push(...a, ...b, ...c);
  }

  const stats: Stats = {
    filesScanned: allFiles.length,
    hitsA, hitsB, hitsC,
  };

  const reportPath = resolve(
    PROJECT_ROOT,
    `worklog/audits/type-truth-${new Date().toISOString().slice(0, 10)}.md`,
  );
  if (!existsSync(dirname(reportPath))) mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, formatReport(allHits, stats), 'utf8');

  console.log('═══ Type-Truth-Audit ═══');
  console.log(`Files scanned: ${stats.filesScanned}`);
  console.log(`PATTERN-A (silent-cast): ${stats.hitsA}`);
  console.log(`PATTERN-B (missing-error): ${stats.hitsB}`);
  console.log(`PATTERN-C (nested-select): ${stats.hitsC}`);
  console.log(`Total: ${allHits.length}`);
  console.log(`Report: ${reportPath}`);
  console.log('');

  if (allHits.length === 0) {
    console.log('✅ No risk-patterns found.');
    process.exit(0);
  }

  console.log(`⚠️  ${allHits.length} hit(s) — manual review needed.`);
  process.exit(1);
}

main();
