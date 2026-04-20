/**
 * Silent-Fail-Audit — scans codebase for known bug-class patterns
 *
 * Usage: npx tsx scripts/silent-fail-audit.ts [--fix-hints]
 *
 * Output: worklog/audits/silent-fail-YYYY-MM-DD.md
 *
 * Patterns scanned:
 * 1. .in() without chunking (PostgREST URL-limit, ~400 UUIDs)
 * 2. .select() without .range()/.limit() on large tables
 * 3. Silent catch (empty catch block)
 * 4. Error-swallow (if(error) without throw)
 * 5. Destructuring data without error
 * 6. Hard-coded state-checks in scripts/
 * 7. Promise.allSettled without logSilentRejects observability (Slice 088+089)
 * 8. .catch(() => null|[]|new Set|new Map) without logSilentCatch (Slice 092)
 */

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'worklog', 'audits');

type Finding = {
  file: string;
  line: number;
  match: string;
  pattern: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
};

const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '_archive', 'tmp', 'backup']);

function* walk(dir: string, maxDepth = 10, depth = 0): Generator<string> {
  if (depth > maxDepth) return;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch { return; }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry) || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      yield* walk(full, maxDepth, depth + 1);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) {
      yield full;
    }
  }
}

function scan(file: string, content: string): Finding[] {
  const lines = content.split('\n');
  const findings: Finding[] = [];
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  // Skip the audit script itself (its regex literals would match as false-positives).
  if (rel === 'scripts/silent-fail-audit.ts') return findings;

  lines.forEach((line, idx) => {
    const n = idx + 1;

    // Pattern 1: .in() without chunking hint — skip short inline literal arrays (not UUID-list risk)
    if (/\.in\s*\(/.test(line) && !/CHUNK|batch|\.slice|chunk/i.test(line) && !rel.endsWith('.test.ts') && !rel.endsWith('.spec.ts')) {
      // Slice 090: context includes `.range(` / `.limit(` on adjacent lines (multi-line paging pattern).
      const ctx = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 3)).join(' ');
      const hasChunk = /CHUNK|chunk|batch|\.range\(|\.limit\(/i.test(ctx);
      // Short inline literal array: .in('col', ['a', 'b', 'c']) — value count ≤ 20 literals, closes on same line
      const shortLiteralArray = /\.in\s*\(\s*['"][^'"]+['"]\s*,\s*\[[^\]]{0,200}\]/.test(line);
      if (!hasChunk && !shortLiteralArray) {
        // Money-Critical path → HIGH severity (user-facing API + service layer)
        const isMoneyPath = rel.startsWith('src/app/api/') || rel.startsWith('src/lib/services/') || rel.startsWith('src/lib/queries/');
        findings.push({ file: rel, line: n, match: line.trim().slice(0, 120), pattern: 'in-without-chunking', severity: isMoneyPath ? 'HIGH' : 'MEDIUM' });
      }
    }

    // Pattern 2: .select( without .range/.limit — only on API-routes + lib-services
    if ((rel.startsWith('src/app/api/') || rel.startsWith('src/lib/')) && /\.from\s*\(\s*['"][^'"]+['"]\s*\)\s*\.\s*select/.test(line)) {
      const ctx = lines.slice(idx, Math.min(lines.length, idx + 10)).join(' ');
      if (!/\.range\(|\.limit\(|\.eq\(|\.single\(|\.maybeSingle\(|\.insert\(|\.update\(/.test(ctx)) {
        findings.push({ file: rel, line: n, match: line.trim().slice(0, 120), pattern: 'select-without-range-or-limit', severity: 'HIGH' });
      }
    }

    // Pattern 3: Silent catch (empty or log-only)
    if (/catch\s*\([^)]*\)\s*\{\s*$/.test(line)) {
      const next1 = lines[idx + 1] || '';
      const next2 = lines[idx + 2] || '';
      if (/^\s*\}\s*$/.test(next1)) {
        findings.push({ file: rel, line: n, match: line.trim() + ' (empty catch)', pattern: 'silent-catch-empty', severity: 'HIGH' });
      } else if (/^\s*\/\//.test(next1) && /^\s*\}\s*$/.test(next2)) {
        findings.push({ file: rel, line: n, match: line.trim() + ' (only-comment catch)', pattern: 'silent-catch-comment', severity: 'HIGH' });
      }
    }

    // Pattern 4: Error-swallow in services (if(error) without throw)
    if (rel.includes('src/lib/services/') && /if\s*\(\s*error\s*\)/.test(line)) {
      const block = lines.slice(idx, Math.min(lines.length, idx + 8)).join(' ');
      if (!/throw\s/.test(block) && !/return\s+(null|false|\[\]|\{\})/.test(block)) {
        findings.push({ file: rel, line: n, match: line.trim().slice(0, 120), pattern: 'error-check-without-throw-or-return', severity: 'MEDIUM' });
      }
    }

    // Pattern 5: Destructuring data without error
    if (/const\s*\{\s*data\s*\}\s*=\s*await\s*supabase/.test(line)) {
      findings.push({ file: rel, line: n, match: line.trim().slice(0, 120), pattern: 'destructure-data-without-error', severity: 'HIGH' });
    }

    // Pattern 6: Hard-coded state-checks in scripts
    if (rel.startsWith('scripts/') && /'transfermarkt_stale'|'transfermarkt_verified'|'transfermarkt_unknown'|'unknown'/.test(line)) {
      if (!/const\s+|default|mvSource|= '/.test(line) && /if\s*\(|===|!==/.test(line)) {
        findings.push({ file: rel, line: n, match: line.trim().slice(0, 120), pattern: 'script-hardcoded-state-check', severity: 'MEDIUM' });
      }
    }

    // Pattern 8 (Slice 092): .catch(() => fallback) ohne logSilentCatch
    // Fängt arrow-catch mit silent-fallback. Skip req.json-body-parses `({})`.
    if (
      /\.catch\s*\(\s*\(\s*\)\s*=>\s*(null|\[\s*\]|new Set|new Map|\{\s*\})/.test(line) &&
      !/\.json\(\)\s*\.catch/.test(line) &&
      !rel.endsWith('.test.ts') &&
      !rel.endsWith('.test.tsx') &&
      !rel.endsWith('.spec.ts') &&
      !rel.startsWith('e2e/') &&
      !rel.includes('silentRejects')
    ) {
      const isMoneyPath = rel.startsWith('src/app/api/') || rel.startsWith('src/lib/services/') || rel.startsWith('src/lib/queries/');
      findings.push({ file: rel, line: n, match: line.trim().slice(0, 120), pattern: 'silent-catch-arrow-fallback', severity: isMoneyPath ? 'HIGH' : 'MEDIUM' });
    }

    // Pattern 7 (Slice 090): Promise.allSettled ohne logSilentRejects im 25-Zeilen-Block
    // Skip: Tests/Specs + e2e-bots + Utility-File selbst (silentRejects.ts hat den pattern in JSDoc)
    // Window = 25 lines: covers multi-line mappers (pushSender: 21 lines via inline-async-map) + 11-query allSettled.
    if (
      /Promise\.allSettled/.test(line) &&
      !rel.endsWith('.test.ts') &&
      !rel.endsWith('.test.tsx') &&
      !rel.endsWith('.spec.ts') &&
      !rel.startsWith('e2e/') &&
      !rel.includes('silentRejects')
    ) {
      const block = lines.slice(idx, Math.min(lines.length, idx + 25)).join(' ');
      if (!/logSilentRejects/.test(block)) {
        const isMoneyPath = rel.startsWith('src/app/api/') || rel.startsWith('src/lib/services/') || rel.startsWith('src/lib/queries/');
        findings.push({ file: rel, line: n, match: line.trim().slice(0, 120), pattern: 'allsettled-without-observability', severity: isMoneyPath ? 'HIGH' : 'MEDIUM' });
      }
    }
  });

  return findings;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function main() {
  console.log('silent-fail-audit: scanning...');
  const all: Finding[] = [];
  let filesScanned = 0;

  for (const file of walk(ROOT)) {
    try {
      const content = readFileSync(file, 'utf-8');
      const findings = scan(file, content);
      all.push(...findings);
      filesScanned++;
    } catch {
      /* skip unreadable */
    }
  }

  console.log(`scanned ${filesScanned} files, found ${all.length} candidates`);

  // Group by pattern
  const byPattern = all.reduce((acc, f) => {
    (acc[f.pattern] ||= []).push(f);
    return acc;
  }, {} as Record<string, Finding[]>);

  // Write report
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const reportPath = join(OUT_DIR, `silent-fail-${today()}.md`);
  const totalHigh = all.filter(f => f.severity === 'HIGH').length;
  const totalMed = all.filter(f => f.severity === 'MEDIUM').length;

  let md = `# Silent-Fail-Audit ${today()}\n\n`;
  md += `- Files scanned: ${filesScanned}\n`;
  md += `- Total findings: ${all.length}\n`;
  md += `- High severity: ${totalHigh}\n`;
  md += `- Medium severity: ${totalMed}\n`;
  md += `- Total risk: ${totalHigh > 5 ? '**HIGH**' : totalHigh > 0 || totalMed > 10 ? '**MEDIUM**' : '**LOW**'}\n\n`;
  md += `---\n\n`;

  for (const [pattern, findings] of Object.entries(byPattern).sort((a, b) => b[1].length - a[1].length)) {
    md += `## Pattern: ${pattern} (${findings.length} findings)\n\n`;
    findings.slice(0, 50).forEach(f => {
      md += `- \`${f.file}:${f.line}\` [${f.severity}] — ${f.match}\n`;
    });
    if (findings.length > 50) md += `- ... +${findings.length - 50} more\n`;
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## Next Actions (priority order)\n\n`;
  md += `1. HIGH-severity findings in \`src/app/api/\` or \`src/lib/services/\` (Money-critical path)\n`;
  md += `2. HIGH-severity findings in scripts/ that run in Production (Cron)\n`;
  md += `3. MEDIUM-severity as weekly cleanup\n\n`;
  md += `## False-Positive-Patterns\n\n`;
  md += `- \`.in()\` in .test.ts files → filter later\n`;
  md += `- Error-check followed by \`logSupabaseError()\` + throw → false positive\n`;
  md += `- \`.select()\` in .eq() context → false positive\n`;

  writeFileSync(reportPath, md, 'utf-8');
  console.log(`report written: ${reportPath}`);
  console.log(`total risk: ${totalHigh > 5 ? 'HIGH' : totalHigh > 0 || totalMed > 10 ? 'MEDIUM' : 'LOW'}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
