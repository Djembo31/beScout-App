import fs from 'fs/promises';
import path from 'path';
import type { Finding, Severity } from './checks/index';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TriageAction = 'IMMEDIATE' | 'THIS_SPRINT' | 'BACKLOG' | 'MONITOR';

export type TriagedFinding = Finding & {
  action: TriageAction;
  actionLabel: string;
};

export type TriageReport = {
  runDate: string;
  targetUrl: string;
  totalFindings: number;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  exitCode: number;
  byPage: Record<string, TriagedFinding[]>;
  actionPlan: string[];
};

// ── Severity → Action Mapping ─────────────────────────────────────────────────

const SEVERITY_ACTION: Record<Severity, TriageAction> = {
  P0: 'IMMEDIATE',
  P1: 'THIS_SPRINT',
  P2: 'BACKLOG',
  P3: 'MONITOR',
};

const ACTION_LABELS: Record<TriageAction, string> = {
  IMMEDIATE: '🚨 IMMEDIATE — fix before next deploy',
  THIS_SPRINT: '⚠️  THIS SPRINT — fix within current sprint',
  BACKLOG: '💛 BACKLOG — add to next sprint planning',
  MONITOR: '📝 MONITOR — track trend, no immediate action',
};

// ── Triage Engine ─────────────────────────────────────────────────────────────

export function triageFindings(findings: Finding[]): TriagedFinding[] {
  return findings.map((f) => ({
    ...f,
    action: SEVERITY_ACTION[f.severity],
    actionLabel: ACTION_LABELS[SEVERITY_ACTION[f.severity]],
  }));
}

export function groupByPage(findings: TriagedFinding[]): Record<string, TriagedFinding[]> {
  return findings.reduce<Record<string, TriagedFinding[]>>((acc, f) => {
    (acc[f.page] ??= []).push(f);
    return acc;
  }, {});
}

export function buildActionPlan(findings: TriagedFinding[]): string[] {
  const lines: string[] = [];

  const p0 = findings.filter((f) => f.severity === 'P0');
  const p1 = findings.filter((f) => f.severity === 'P1');
  const p2 = findings.filter((f) => f.severity === 'P2');
  const p3 = findings.filter((f) => f.severity === 'P3');

  if (p0.length === 0 && p1.length === 0 && p2.length === 0 && p3.length === 0) {
    lines.push('✅ Zero findings. All Phase 1 checks passed clean.');
    return lines;
  }

  if (p0.length > 0) {
    lines.push(`🚨 P0 FINDINGS (${p0.length}) — IMMEDIATE ACTION REQUIRED`);
    lines.push('─'.repeat(60));
    p0.forEach((f, i) => {
      lines.push(`  ${i + 1}. [${f.check}] on ${f.page}`);
      lines.push(`     Evidence: ${f.evidence}`);
      lines.push(`     Repro: ${f.reproSteps[0] ?? 'See finding.reproSteps'}`);
    });
    lines.push('');
  }

  if (p1.length > 0) {
    lines.push(`⚠️  P1 FINDINGS (${p1.length}) — FIX THIS SPRINT`);
    lines.push('─'.repeat(60));
    p1.forEach((f, i) => {
      lines.push(`  ${i + 1}. [${f.check}] on ${f.page}`);
      lines.push(`     Evidence: ${f.evidence}`);
    });
    lines.push('');
  }

  if (p2.length > 0) {
    lines.push(`💛 P2 FINDINGS (${p2.length}) — BACKLOG`);
    lines.push('─'.repeat(60));
    p2.forEach((f, i) => {
      lines.push(`  ${i + 1}. [${f.check}] on ${f.page}: ${f.evidence.slice(0, 80)}`);
    });
    lines.push('');
  }

  if (p3.length > 0) {
    lines.push(`📝 P3 FINDINGS (${p3.length}) — MONITOR`);
    p3.forEach((f, i) => {
      lines.push(`  ${i + 1}. [${f.check}] on ${f.page}: ${f.evidence.slice(0, 60)}`);
    });
    lines.push('');
  }

  return lines;
}

export function computeExitCode(findings: TriagedFinding[]): number {
  // Phase 1: observe-only (always exit 0).
  // Phase 2: P0-count > 0 → exit 1 (CI blocks).
  // Uncomment for Phase 2:
  // const p0 = findings.filter(f => f.severity === 'P0').length;
  // const p1 = findings.filter(f => f.severity === 'P1').length;
  // if (p0 > 0 || p1 > 3) return 1;
  return 0;
}

// ── Report Builder ────────────────────────────────────────────────────────────

export function buildReport(
  findings: Finding[],
  targetUrl: string,
): TriageReport {
  const triaged = triageFindings(findings);

  return {
    runDate: new Date().toISOString(),
    targetUrl,
    totalFindings: triaged.length,
    p0Count: triaged.filter((f) => f.severity === 'P0').length,
    p1Count: triaged.filter((f) => f.severity === 'P1').length,
    p2Count: triaged.filter((f) => f.severity === 'P2').length,
    p3Count: triaged.filter((f) => f.severity === 'P3').length,
    exitCode: computeExitCode(triaged),
    byPage: groupByPage(triaged),
    actionPlan: buildActionPlan(triaged),
  };
}

// ── File I/O ──────────────────────────────────────────────────────────────────

export async function writeFindings(
  outDir: string,
  findings: Finding[],
  targetUrl: string,
): Promise<TriageReport> {
  await fs.mkdir(outDir, { recursive: true });

  const report = buildReport(findings, targetUrl);

  // findings.json — full structured data for downstream tooling (Phase 2: GitHub Issues)
  await fs.writeFile(
    path.join(outDir, 'findings.json'),
    JSON.stringify(report, null, 2),
    'utf-8',
  );

  // findings-triage.md — human-readable action plan
  const mdLines = [
    `# Walkthrough Crawler — Triage Report`,
    ``,
    `**Run:** ${report.runDate}`,
    `**Target:** ${report.targetUrl}`,
    `**Total Findings:** ${report.totalFindings} (P0:${report.p0Count} P1:${report.p1Count} P2:${report.p2Count} P3:${report.p3Count})`,
    ``,
    `## Action Plan`,
    ``,
    ...report.actionPlan,
    ``,
    `## Findings by Page`,
    ``,
  ];

  for (const [page, pagefindings] of Object.entries(report.byPage)) {
    mdLines.push(`### ${page} (${pagefindings.length})`);
    pagefindings.forEach((f) => {
      mdLines.push(`- **[${f.severity}] ${f.check}:** ${f.evidence}`);
      if (f.selector) mdLines.push(`  - Selector: \`${f.selector}\``);
    });
    mdLines.push('');
  }

  await fs.writeFile(
    path.join(outDir, 'findings-triage.md'),
    mdLines.join('\n'),
    'utf-8',
  );

  return report;
}

// ── Console Reporter ──────────────────────────────────────────────────────────

export function printReport(report: TriageReport): void {
  console.log('\n' + '═'.repeat(60));
  console.log('WALKTHROUGH CRAWLER — TRIAGE REPORT');
  console.log('═'.repeat(60));
  console.log(`Run:     ${report.runDate}`);
  console.log(`Target:  ${report.targetUrl}`);
  console.log(`Total:   ${report.totalFindings} findings`);
  console.log(`         P0:${report.p0Count}  P1:${report.p1Count}  P2:${report.p2Count}  P3:${report.p3Count}`);
  console.log('─'.repeat(60));
  report.actionPlan.forEach((line) => console.log(line));
  console.log('─'.repeat(60));
  console.log(`Exit Code: ${report.exitCode} (${report.exitCode === 0 ? 'PASS — observe-only Phase 1' : 'FAIL'})`);
  console.log('═'.repeat(60) + '\n');
}
