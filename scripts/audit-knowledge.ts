/**
 * E0-W2gov — Knowledge-Base Integrity Detector.
 *
 * Hält das `docs/knowledge/`-Wissens-System ehrlich. Antwort auf Anils
 * Aktualitäts-/Korrektheits-Fragen (memory/decisions.md D88) — verhindert
 * die Drift, die `memory/semantisch` getötet hat (Files behaupteten "truth",
 * drifteten unbemerkt).
 *
 * Checks (mit Verstand — HARD = jetzt eingeführter Bug, SOFT = Drift sichtbar):
 *   HARD  INDEX-Link → nicht-existente Datei         (Routing-Bug)
 *   HARD  Content-File ohne INDEX-Eintrag (Orphan)   (unauffindbar)
 *   HARD  Content-File ohne Pflicht-Front-matter     (Konvention-Verstoß)
 *   HARD  INDEX Decisions-Log-Range != max D-Nr      (Slice 351: D93/D94-Drift)
 *   HARD  Knowledge-Content staged geändert ohne `updated:`=heute (Slice 351: Kopplung)
 *   SOFT  INDEX-Entry-Zeile ohne consult_when        (Routing schwach)
 *   SOFT  verified-against-Ziel seit Verify in git geändert (Code driftete)
 *   SOFT  updated älter als STALE_MONTHS             (Veraltungs-Verdacht)
 *
 * Usage:
 *   npx tsx scripts/audit-knowledge.ts          # voller Report, exit 1 bei jedem Finding
 *   npx tsx scripts/audit-knowledge.ts --check  # pre-commit: exit 1 NUR bei HARD
 *   pnpm run audit:knowledge[:check]
 *
 * Exit-Codes: 0 clean (bzw. nur SOFT im --check) · 1 Finding · 2 Setup-Fehler.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = resolve(__dirname, '..');
const KNOWLEDGE_DIR = resolve(PROJECT_ROOT, 'docs/knowledge');
const INDEX_FILE = resolve(KNOWLEDGE_DIR, 'INDEX.md');
const DECISIONS_FILE = resolve(PROJECT_ROOT, 'memory/decisions.md');
const BUCKETS = ['domain', 'decisions', 'lessons', 'research'];
const STALE_MONTHS = 6;
const REQUIRED_FRONTMATTER = ['title', 'created', 'updated', 'status', 'tags', 'consult_when'];

const CHECK_MODE = process.argv.includes('--check');

type Severity = 'HARD' | 'SOFT';
type Finding = { severity: Severity; kind: string; location: string; message: string };

const findings: Finding[] = [];
function add(severity: Severity, kind: string, location: string, message: string): void {
  findings.push({ severity, kind, location, message });
}

/** Inline-Code-Spans (`...`) aus einer Zeile entfernen — Format-Beispiele sind keine echten Links. */
function stripInlineCode(line: string): string {
  return line.replace(/`[^`]*`/g, '');
}

/**
 * Markdown-Link-Ziele aus INDEX (resolved auf absolute Pfade, relativ zu KNOWLEDGE_DIR).
 * Markdown-bewusst: ignoriert Links in Inline-Code (`[x](y)`) und in ```-Fenced-Blocks
 * (das sind Format-Beispiele/Doku, keine echten Routing-Links).
 */
function parseIndexLinks(content: string): { abs: string; raw: string; line: number }[] {
  const out: { abs: string; raw: string; line: number }[] = [];
  const lines = content.split('\n');
  const linkRe = /\]\(([^)]+)\)/g;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { inFence = !inFence; continue; }
    if (inFence) continue;
    const line = stripInlineCode(lines[i]);
    let m: RegExpExecArray | null;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(line)) !== null) {
      const raw = m[1].trim();
      if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('#')) continue;
      const cleaned = raw.split('#')[0]; // Anker abschneiden
      if (!cleaned) continue;
      out.push({ abs: resolve(KNOWLEDGE_DIR, cleaned), raw, line: i + 1 });
    }
  }
  return out;
}

/** INDEX-Entry-Zeilen (`- [..](..)`) — für consult_when-Check. */
function indexEntryLines(content: string): { text: string; line: number }[] {
  return content
    .split('\n')
    .map((text, i) => ({ text, line: i + 1 }))
    .filter((l) => /^\s*-\s*\[[^\]]+\]\([^)]+\)/.test(l.text));
}

/** Alle Content-Files in den Buckets (rekursiv), README ausgeschlossen. */
function listContentFiles(): string[] {
  const out: string[] = [];
  for (const bucket of BUCKETS) {
    const dir = join(KNOWLEDGE_DIR, bucket);
    if (!existsSync(dir)) continue;
    walk(dir, out);
  }
  return out;
}
function walk(dir: string, acc: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (entry.endsWith('.md') && entry.toLowerCase() !== 'readme.md') {
      acc.push(full);
    }
  }
}

/** YAML-Front-matter (simpel: top-level key: value zwischen ---). */
function parseFrontmatter(content: string): Record<string, string> | null {
  const m = /^---\s*\n([\s\S]*?)\n---/.exec(content);
  if (!m) return null;
  const fm: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (kv) fm[kv[1].trim()] = kv[2].trim();
  }
  return fm;
}

/** Letztes git-Commit-Datum (YYYY-MM-DD) einer Datei; null wenn untracked/kein git. */
function gitLastModified(absPath: string): string | null {
  try {
    const rel = relative(PROJECT_ROOT, absPath);
    const out = execSync(`git log -1 --format=%cs -- "${rel}"`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function monthsBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO);
  const b = new Date(toISO);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function main(): void {
  if (!existsSync(KNOWLEDGE_DIR)) {
    console.error(`ERROR: ${KNOWLEDGE_DIR} fehlt — wurde E0-W2a nicht gebaut?`);
    process.exit(2);
  }
  if (!existsSync(INDEX_FILE)) {
    console.error(`ERROR: INDEX.md fehlt unter ${INDEX_FILE}`);
    process.exit(2);
  }

  const indexContent = readFileSync(INDEX_FILE, 'utf8');
  const today = new Date().toISOString().slice(0, 10);

  // --- Check 1 (HARD): INDEX-Links zeigen auf existente Datei/Dir ---
  const links = parseIndexLinks(indexContent);
  const linkedAbs = new Set<string>();
  for (const link of links) {
    if (!existsSync(link.abs)) {
      add('HARD', 'broken-link', `INDEX.md:${link.line}`, `Link-Ziel existiert nicht: ${link.raw}`);
    } else {
      linkedAbs.add(link.abs);
    }
  }

  // --- Check 4 (SOFT): INDEX-Entry-Zeilen haben consult_when ---
  for (const entry of indexEntryLines(indexContent)) {
    if (!/consult_when:/.test(entry.text)) {
      add('SOFT', 'missing-consult-when', `INDEX.md:${entry.line}`, `Entry ohne consult_when: ${entry.text.trim().slice(0, 70)}`);
    }
  }

  // --- Check 7 (HARD, Slice 351): INDEX Decisions-Log-Range == max D-Nr in decisions.md ---
  // Fängt die "D1–D93 obwohl D94 existiert"-Drift (diese Session). Deterministisch, 0 FP.
  if (existsSync(DECISIONS_FILE)) {
    const decisionsContent = readFileSync(DECISIONS_FILE, 'utf8');
    const dNums = [...decisionsContent.matchAll(/^#{2,3}\s+D(\d+)\b/gm)].map((m) => parseInt(m[1], 10));
    const maxD = dNums.length ? Math.max(...dNums) : null;
    const rangeMatch = /Decisions-Log\s+D\d+\s*[–—-]\s*D(\d+)/.exec(indexContent);
    if (maxD !== null && rangeMatch) {
      const indexMax = parseInt(rangeMatch[1], 10);
      if (indexMax !== maxD) {
        add('HARD', 'decisions-index-stale', 'INDEX.md', `Decisions-Log-Range endet bei D${indexMax}, aber decisions.md hat max D${maxD}. Range in INDEX.md auf D${maxD} aktualisieren.`);
      }
    } else if (maxD !== null && !rangeMatch) {
      add('HARD', 'decisions-index-missing', 'INDEX.md', `decisions.md hat D-Nummern (max D${maxD}), aber kein "Decisions-Log D1–D<n>"-Range-Eintrag in INDEX.md gefunden.`);
    }
  }

  // --- Content-Files: Orphan + Front-matter + Staleness ---
  const contentFiles = listContentFiles();
  for (const file of contentFiles) {
    const rel = relative(PROJECT_ROOT, file);
    const content = readFileSync(file, 'utf8');

    // Check 2 (HARD): Orphan — Content-File muss aus INDEX verlinkt sein.
    if (!linkedAbs.has(file)) {
      add('HARD', 'orphan', rel, `Content-File ohne INDEX-Eintrag (unauffindbar). consult_when-Zeile in INDEX.md ergänzen.`);
    }

    // Check 3 (HARD): Pflicht-Front-matter.
    const fm = parseFrontmatter(content);
    if (!fm) {
      add('HARD', 'no-frontmatter', rel, `Kein Front-matter-Block (--- ... ---). Pflicht: ${REQUIRED_FRONTMATTER.join(', ')}.`);
    } else {
      const missing = REQUIRED_FRONTMATTER.filter((k) => !fm[k]);
      if (missing.length > 0) {
        add('HARD', 'frontmatter-missing-fields', rel, `Front-matter fehlen: ${missing.join(', ')}.`);
      }

      // Check 6 (SOFT): updated zu alt.
      if (fm.updated && monthsBetween(fm.updated, today) >= STALE_MONTHS) {
        add('SOFT', 'stale-updated', rel, `updated=${fm.updated} ist ≥${STALE_MONTHS} Monate alt — prüfen + verifizieren.`);
      }

      // Check 5 (SOFT): verified-against-Ziel seit Verify-Datum geändert.
      // Format: `verified-against: <pfad> @ <YYYY-MM-DD>`
      if (fm['verified-against']) {
        const va = /^(.*?)\s*@\s*(\d{4}-\d{2}-\d{2})\s*$/.exec(fm['verified-against']);
        if (va) {
          const [, targetPath, verifiedDate] = va;
          const targetAbs = resolve(PROJECT_ROOT, targetPath.trim());
          if (!existsSync(targetAbs)) {
            add('SOFT', 'verify-target-missing', rel, `verified-against zeigt auf nicht-existenten Pfad: ${targetPath.trim()}`);
          } else {
            const lastMod = gitLastModified(targetAbs);
            if (lastMod && lastMod > verifiedDate) {
              add('SOFT', 'verify-drift', rel, `verified-against ${targetPath.trim()} wurde am ${lastMod} geändert (> verify ${verifiedDate}) — Wissen re-verifizieren.`);
            }
          }
        } else {
          add('SOFT', 'verify-format', rel, `verified-against muss Format "<pfad> @ <YYYY-MM-DD>" haben, ist: ${fm['verified-against']}`);
        }
      }
    }
  }

  // --- Check 8 (HARD, pre-commit, Slice 351): staged Knowledge-Content geändert → updated:=heute ---
  // Fängt "Inhalt geändert, aber Front-matter updated: vergessen" (Slice-348-Miss diese Session).
  // Nur im git-staging-Kontext aktiv (pre-commit); in CI/nightly ist nichts staged → No-Op.
  let staged: string[] = [];
  try {
    staged = execSync('git diff --cached --name-only --diff-filter=ACMR', { cwd: PROJECT_ROOT, encoding: 'utf8' })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { /* kein git / nichts staged → skip */ }

  for (const sf of staged) {
    if (!/^docs\/knowledge\/.+\.md$/.test(sf) || sf.endsWith('INDEX.md')) continue;
    let diff = '';
    try {
      diff = execSync(`git diff --cached -- "${sf}"`, { cwd: PROJECT_ROOT, encoding: 'utf8' });
    } catch { continue; }
    if (!diff) continue;
    // Geänderte Zeilen (ohne Datei-Header), die NICHT nur das updated:/verified-against:-Datum sind.
    const changed = diff.split('\n').filter((l) => /^[+-]/.test(l) && !/^[+-]{3}/.test(l));
    const hasContentChange = changed.some((l) => !/^[+-]\s*(updated|verified-against):/.test(l));
    if (!hasContentChange) continue; // reiner Datums-Bump → ok
    const abs = resolve(PROJECT_ROOT, sf);
    const fm = existsSync(abs) ? parseFrontmatter(readFileSync(abs, 'utf8')) : null;
    if (fm?.updated !== today) {
      add('HARD', 'updated-not-today', sf, `Inhalt geändert, aber updated:=${fm?.updated ?? 'fehlt'} (nicht heute ${today}). E0-W2gov Wissens-Kopplung: updated: auf ${today} setzen (+ ggf. INDEX/verified-against).`);
    }
  }

  // --- Report ---
  const hard = findings.filter((f) => f.severity === 'HARD');
  const soft = findings.filter((f) => f.severity === 'SOFT');

  const report: string[] = [];
  report.push(`# Knowledge-Audit Report — ${today}`);
  report.push('');
  report.push(`**Generated:** ${new Date().toISOString()}`);
  report.push(`**Scope:** docs/knowledge/ · Slice E0-W2gov (D88)`);
  report.push('');
  report.push('## Summary');
  report.push(`- Content-Files gescannt: ${contentFiles.length}`);
  report.push(`- INDEX-Links geprüft: ${links.length}`);
  report.push(`- HARD-Findings: ${hard.length}`);
  report.push(`- SOFT-Findings: ${soft.length}`);
  report.push('');
  if (findings.length === 0) {
    report.push('## Result: ✅ Clean — Wissens-System integer.');
  } else {
    for (const sev of ['HARD', 'SOFT'] as Severity[]) {
      const fs = findings.filter((f) => f.severity === sev);
      if (fs.length === 0) continue;
      report.push(`## ${sev}`);
      for (const f of fs) report.push(`- **[${f.kind}]** \`${f.location}\` — ${f.message}`);
      report.push('');
    }
  }
  const reportPath = resolve(PROJECT_ROOT, `worklog/audits/knowledge-${today}.md`);
  if (!existsSync(dirname(reportPath))) mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report.join('\n'), 'utf8');

  // --- Stdout ---
  console.log('═══ Knowledge-Audit ═══');
  console.log(`Content-Files: ${contentFiles.length} · INDEX-Links: ${links.length}`);
  console.log(`HARD: ${hard.length} · SOFT: ${soft.length}`);
  console.log(`Report: ${reportPath}`);
  console.log('');

  for (const f of soft) console.log(`  ⚠️  SOFT [${f.kind}] ${f.location} — ${f.message}`);
  for (const f of hard) console.log(`  ❌ HARD [${f.kind}] ${f.location} — ${f.message}`);

  if (hard.length > 0) {
    console.log(`\n❌ ${hard.length} HARD-Finding(s) — Commit blockiert. Fixen.`);
    process.exit(1);
  }
  if (CHECK_MODE) {
    console.log(soft.length > 0 ? `\n⚠️  ${soft.length} SOFT-Finding(s) (nightly-tracked, blockiert nicht).` : '\n✅ Clean.');
    process.exit(0);
  }
  if (soft.length > 0) {
    console.log(`\n⚠️  ${soft.length} SOFT-Finding(s) — manuell reviewen.`);
    process.exit(1);
  }
  console.log('✅ Wissens-System integer.');
  process.exit(0);
}

main();
