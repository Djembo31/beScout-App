#!/usr/bin/env tsx
/**
 * Slice 214 (D50 Wave 2): Findings-to-Slices Pipeline.
 *
 * Parsed `worklog/audits/<date>/aggregate.md` (oder einzelne *.md Files)
 * und generiert Slice-Stubs in `worklog/specs/214-derived-*.md` basierend auf
 * `worklog/specs/_TEMPLATE.md`.
 *
 * Usage:
 *   npx tsx scripts/findings-to-slices.ts --audit-dir=worklog/audits/2026-04-26 --dry-run
 *   npx tsx scripts/findings-to-slices.ts --audit-dir=worklog/audits/2026-04-26 --apply
 *
 * Pattern-Match: Findings-Tabelle mit Spalten ID|Page|Severity|Issue|Reproducer|Source.
 *
 * Slice-Generation-Strategie:
 *   - 1 P0-Finding → 1 eigener Slice (kritisch, fokussiert)
 *   - 1 P1-Finding → 1 eigener Slice (kann gebündelt werden falls Domain-overlap)
 *   - P2/P3-Findings → Bündel-Slice nach Domain
 *   - audit-stale Findings → SKIP
 */

import * as fs from 'fs';
import * as path from 'path';

interface Finding {
  id: string;
  page: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3' | '?';
  issue: string;
  reproducer: string;
  source: string;
  domain: string; // extracted from id prefix (FM-NEU, UX-NEU, TR-NEU, BRAND-NEU, FANTASY-NEU, CASUAL-NEU)
}

interface CliArgs {
  auditDir: string;
  apply: boolean;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let auditDir = 'worklog/audits/2026-04-26';
  let apply = false;
  let dryRun = false;
  for (const a of args) {
    if (a.startsWith('--audit-dir=')) auditDir = a.slice('--audit-dir='.length);
    if (a === '--apply') apply = true;
    if (a === '--dry-run') dryRun = true;
  }
  if (!apply && !dryRun) {
    console.error('Specify --apply OR --dry-run');
    process.exit(1);
  }
  return { auditDir, apply, dryRun };
}

function extractDomain(id: string): string {
  const match = id.match(/^([A-Z]+(?:-NEU)?)/);
  return match ? match[1].replace(/-NEU$/, '').toLowerCase() : 'unknown';
}

function parseFindingsTable(markdown: string): Finding[] {
  const findings: Finding[] = [];
  const lines = markdown.split('\n');
  let inTable = false;
  let headers: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect findings-table header (must contain at least: ID, Severity, Issue)
    if (trimmed.startsWith('|') && /\b(ID|Severity|Issue)\b/i.test(trimmed)) {
      const candidates = trimmed
        .split('|')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);
      if (candidates.includes('id') && candidates.includes('severity') && candidates.includes('issue')) {
        inTable = true;
        headers = candidates;
        continue;
      }
    }
    if (!inTable) continue;
    // Skip separator row (---|---|---)
    if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue;
    // Empty line ends table
    if (!trimmed.startsWith('|')) {
      inTable = false;
      continue;
    }

    const cells = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1); // strip leading/trailing empties

    if (cells.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').replace(/^\*+|\*+$/g, '').trim();
    });

    const id = row['id'] ?? '';
    if (!id || id.length < 2) continue;
    // Slice 214 Reviewer-Heal MED-4: stale-Detection auf alle Felder, nicht nur id
    const allFields = [id, row['issue'] ?? '', row['source'] ?? '', row['reproducer'] ?? ''].join(' ').toLowerCase();
    if (/audit.?stale|already.?fixed|pre-existing.*drift/.test(allFields)) {
      continue; // skip stale findings
    }

    const severityRaw = (row['severity'] ?? '?').toUpperCase();
    const severityMatch = severityRaw.match(/P[0123]/);
    const severity = (severityMatch?.[0] ?? '?') as Finding['severity'];

    findings.push({
      id,
      page: row['page'] ?? '',
      severity,
      issue: row['issue'] ?? '',
      reproducer: row['reproducer'] ?? '',
      source: row['source'] ?? '',
      domain: extractDomain(id),
    });
  }
  return findings;
}

function readAllAuditFiles(auditDir: string): { file: string; findings: Finding[] }[] {
  if (!fs.existsSync(auditDir)) {
    console.error(`Audit-Dir ${auditDir} fehlt`);
    process.exit(1);
  }
  const files = fs.readdirSync(auditDir).filter((f) => f.endsWith('.md'));
  const result: { file: string; findings: Finding[] }[] = [];
  for (const f of files) {
    try {
      const md = fs.readFileSync(path.join(auditDir, f), 'utf-8');
      const findings = parseFindingsTable(md);
      result.push({ file: f, findings });
    } catch (err) {
      console.warn(`SKIP ${f}: ${(err as Error).message}`);
    }
  }
  return result;
}

interface PlannedSlice {
  filename: string;
  size: 'XS' | 'S' | 'M';
  domain: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  findings: Finding[];
}

function planSlices(allFindings: Finding[]): PlannedSlice[] {
  const planned: PlannedSlice[] = [];
  const skipped = allFindings.filter((f) => f.severity === '?');
  if (skipped.length > 0) {
    console.warn(`Skipping ${skipped.length} findings with unknown severity`);
  }

  // P0 → 1 slice each
  allFindings
    .filter((f) => f.severity === 'P0')
    .forEach((f, i) => {
      const filename = `214-derived-p0-${f.domain}-${String(i + 1).padStart(3, '0')}.md`;
      planned.push({ filename, size: 'M', domain: f.domain, severity: 'P0', findings: [f] });
    });

  // P1 → group by domain
  const p1ByDomain = new Map<string, Finding[]>();
  for (const f of allFindings.filter((f) => f.severity === 'P1')) {
    const arr = p1ByDomain.get(f.domain) ?? [];
    arr.push(f);
    p1ByDomain.set(f.domain, arr);
  }
  let p1idx = 1;
  for (const [domain, fs] of p1ByDomain) {
    const size = fs.length === 1 ? 'S' : 'M';
    const filename = `214-derived-p1-${domain}-${String(p1idx++).padStart(3, '0')}.md`;
    planned.push({ filename, size, domain, severity: 'P1', findings: fs });
  }

  // P2/P3 → single bundle
  const lowSev = allFindings.filter((f) => f.severity === 'P2' || f.severity === 'P3');
  if (lowSev.length > 0) {
    planned.push({
      filename: `214-derived-p2p3-bundle.md`,
      size: 'S',
      domain: 'multi',
      severity: 'P2',
      findings: lowSev,
    });
  }

  return planned;
}

function renderStub(slice: PlannedSlice): string {
  const { findings, severity, domain, size } = slice;
  const title =
    findings.length === 1
      ? findings[0].issue.slice(0, 80)
      : `${domain} ${severity} batch (${findings.length} Findings)`;
  const today = new Date().toISOString().slice(0, 10);
  const findingsTable = findings
    .map(
      (f) =>
        `| ${f.id} | ${f.page} | ${f.severity} | ${f.issue} | ${f.reproducer} | ${f.source} |`,
    )
    .join('\n');

  // Slice 214 Reviewer-Heal HIGH-3: Auto-AC-Skeleton aus Issue-Text statt leerem Stub.
  const autoACs = findings
    .map((f, i) => {
      const idx = String(i + 1).padStart(2, '0');
      const issueShort = f.issue.length > 70 ? f.issue.slice(0, 70) + '...' : f.issue;
      return `**AC-${idx}:** [REGRESSION] ${issueShort}\n  - VERIFY: ${f.reproducer || 'Reproducer aus Audit-Source ableiten'}\n  - EXPECTED: Issue nicht mehr reproduzierbar\n  - FAIL IF: Original-Issue ${f.id} kommt zurück`;
    })
    .join('\n\n');

  return `# Slice [TBD] — ${title}

**Status:** SPEC · **Größe:** ${size} · **Scope:** CTO · **Datum:** ${today}
**Auto-generated:** Slice 214 findings-to-slices Pipeline aus \`worklog/audits/2026-04-26/aggregate.md\`.
**Severity:** ${severity}

## 1. Problem Statement

${findings.length === 1 ? findings[0].issue : `${findings.length} Findings in Domain "${domain}" gebündelt.`}

**Source:** ${findings[0].source} · **Date:** ${today}

## 2. Lösungs-Design

(Auto-Stub — manuell ausfüllen vor BUILD-Stage)

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| TBD | TBD | aus Reproducer ableiten |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| ${findings[0].reproducer || 'TBD'} | Existing-Stelle des Findings | Wie ist es heute implementiert? |
| \`worklog/audits/2026-04-26/aggregate.md\` | Source-of-Truth Aggregate | Vollständigkeit prüfen |

## 5. Pattern-References

- \`memory/decisions.md\` D48 (Audit-Stale-Catcher) — vor Implementation: Pattern bereits gefixt?
- \`memory/decisions.md\` D50 (Spec-Standard-Pflicht)

## 6. Acceptance Criteria

${autoACs}

**Plus pflicht zusätzliche ACs:** STRUCTURAL (tsc clean), I18N (wenn user-facing), MOBILE (wenn UI), PENDING (wenn async).

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | TBD | TBD | TBD | TBD |

## 8. Self-Verification Commands

\`\`\`bash
npx tsc --noEmit
# Plus Slice-spezifische greps
\`\`\`

## 9. Open-Questions

(Auto-Stub — Pflicht-Klärungen vor Implementation auflisten)

## 10. Proof-Plan

(Auto-Stub — wie wird verifiziert?)

## 11. Scope-Out

- (Auto-Stub)

## 12. Stage-Chain (geplant)

SPEC (manuell ausfüllen) → IMPACT → BUILD → REVIEW → PROVE → LOG.

---

## Findings (raw)

| ID | Page | Severity | Issue | Reproducer | Source |
|----|------|----------|-------|-----------|--------|
${findingsTable}

## Hinweis

Dies ist ein **auto-generated Slice-Stub** (Slice 214 Pipeline). Vor BUILD-Stage:
1. Anil reviewt Stub
2. Sektionen 2, 6, 7, 9, 10, 11 manuell ausfüllen (jetzt nur Stub-Text)
3. Slice-Größe verifizieren (Pipeline default-classified)
4. Slice-Nummer korrigieren (Pipeline nutzt 214-derived-*, manuell zu echter ID-Range renamen)
`;
}

function main() {
  const args = parseArgs();
  console.log(`[findings-to-slices] Audit-Dir: ${args.auditDir}`);
  console.log(`[findings-to-slices] Mode: ${args.dryRun ? 'DRY-RUN' : 'APPLY'}`);

  const audits = readAllAuditFiles(args.auditDir);
  const allFindings = audits.flatMap((a) => a.findings);

  console.log(`\n[findings-to-slices] Gefunden: ${allFindings.length} Findings in ${audits.length} Files.`);
  for (const a of audits) {
    if (a.findings.length > 0) {
      console.log(`  ${a.file}: ${a.findings.length} Findings`);
    }
  }

  if (allFindings.length === 0) {
    console.log('\n[findings-to-slices] Keine Findings — keine Slices generiert.');
    return;
  }

  const planned = planSlices(allFindings);
  console.log(`\n[findings-to-slices] Planned ${planned.length} Slice-Stubs:`);
  for (const p of planned) {
    console.log(`  ${p.filename} (${p.size}, ${p.severity}, domain=${p.domain}, ${p.findings.length} findings)`);
  }

  if (args.dryRun) {
    console.log('\n[findings-to-slices] DRY-RUN — keine Files geschrieben.');
    return;
  }

  // APPLY mode
  const specsDir = 'worklog/specs';
  let writtenCount = 0;
  for (const slice of planned) {
    const target = path.join(specsDir, slice.filename);
    if (fs.existsSync(target)) {
      console.warn(`  SKIP ${target} (existiert bereits)`);
      continue;
    }
    // Slice 214 Reviewer-Heal HIGH-2: Stub-Title nutzt [TBD] statt -1
    const content = renderStub(slice);
    fs.writeFileSync(target, content, 'utf-8');
    writtenCount++;
    console.log(`  WRITE ${target}`);
  }

  console.log(`\n[findings-to-slices] ${writtenCount} Slice-Stubs geschrieben in ${specsDir}/.`);
  console.log('[findings-to-slices] Manuell-Pflicht: Sektionen 2/6/7/9/10/11 ausfüllen vor BUILD.');
}

main();
