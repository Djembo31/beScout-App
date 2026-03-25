import * as fs from 'fs';
import * as path from 'path';
import type { SessionReport, RatingCategory, BotSurvey } from './journal';

/**
 * Aggregates all bot surveys from a given date into a single report.
 * Run: npx tsx e2e/bots/ai/survey-aggregator.ts [date]
 */

function loadReports(date: string): SessionReport[] {
  const dir = path.join(process.cwd(), 'e2e', 'bots', 'journals');
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith(date) && f.endsWith('.json'));

  return files.map(f => {
    const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
    return JSON.parse(raw) as SessionReport;
  }).filter(r => r.survey);
}

function aggregate(reports: SessionReport[]): string {
  const surveys = reports.map(r => r.survey!);
  const lines: string[] = [];

  lines.push('# BeScout Bot-Tester Umfrage — Zusammenfassung');
  lines.push(`**Datum:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`**Teilnehmer:** ${surveys.length} Bots`);
  lines.push('');

  // Average scores per category
  const categories: RatingCategory[] = ['onboarding', 'trading', 'fantasy', 'community', 'design', 'performance', 'overall'];

  lines.push('## Bewertungen (Durchschnitt)');
  lines.push('| Bereich | Score | Visuell |');
  lines.push('|---------|-------|---------|');

  for (const cat of categories) {
    const scores = surveys
      .map(s => s.ratings.find(r => r.category === cat)?.score)
      .filter((s): s is number => s != null);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const bar = '█'.repeat(Math.round(avg)) + '░'.repeat(5 - Math.round(avg));
    lines.push(`| ${cat} | **${avg.toFixed(1)}**/5 | ${bar} |`);
  }
  lines.push('');

  // Recommendation rate
  const recommenders = surveys.filter(s => s.wouldRecommend).length;
  const pct = Math.round((recommenders / surveys.length) * 100);
  lines.push(`## Weiterempfehlung: ${pct}% (${recommenders}/${surveys.length})`);
  lines.push('');

  // Collect all strengths, weaknesses, ideas
  const allStrengths = surveys.flatMap(s => s.topStrengths);
  const allWeaknesses = surveys.flatMap(s => s.topWeaknesses);
  const allIdeas = surveys.flatMap(s => s.ideas);

  // Frequency count
  const freq = (arr: string[]) => {
    const map = new Map<string, number>();
    for (const item of arr) {
      const key = item.slice(0, 60);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  lines.push('## Top Staerken');
  for (const [s, count] of freq(allStrengths)) {
    lines.push(`- (${count}x) ${s}`);
  }
  lines.push('');

  lines.push('## Top Schwaechen');
  for (const [s, count] of freq(allWeaknesses)) {
    lines.push(`- (${count}x) ${s}`);
  }
  lines.push('');

  lines.push('## Ideen & Verbesserungsvorschlaege');
  for (const [s, count] of freq(allIdeas)) {
    lines.push(`- (${count}x) ${s}`);
  }
  lines.push('');

  // All bugs aggregated
  const allBugs = reports.flatMap(r =>
    r.entries.filter(e => e.type === 'bug').map(e => ({
      area: e.area,
      message: e.message,
      severity: e.severity ?? 'medium',
      bot: r.bot.archetype,
    }))
  );

  if (allBugs.length > 0) {
    lines.push('## Gemeldete Bugs');
    lines.push('| Severity | Bereich | Bug | Archetype |');
    lines.push('|----------|---------|-----|-----------|');
    // Deduplicate by message
    const seen = new Set<string>();
    for (const b of allBugs.sort((a, b) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity as keyof typeof sev] ?? 2) - (sev[b.severity as keyof typeof sev] ?? 2);
    })) {
      if (seen.has(b.message)) continue;
      seen.add(b.message);
      lines.push(`| ${b.severity} | ${b.area} | ${b.message.slice(0, 60)} | ${b.bot} |`);
    }
    lines.push('');
  }

  // One-liners from each archetype
  lines.push('## Stimmen der Tester');
  const archetypeSummaries = new Map<string, string[]>();
  for (const s of surveys) {
    const report = reports.find(r => r.survey === s);
    if (!report) continue;
    const arch = report.bot.archetype;
    if (!archetypeSummaries.has(arch)) archetypeSummaries.set(arch, []);
    archetypeSummaries.get(arch)!.push(s.oneLineSummary);
  }
  for (const [arch, summaries] of archetypeSummaries) {
    lines.push(`### ${arch}`);
    for (const s of summaries.slice(0, 3)) {
      lines.push(`> ${s}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// CLI entry point
const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const reports = loadReports(date);

if (reports.length === 0) {
  console.log(`Keine Bot-Reports fuer ${date} gefunden.`);
  process.exit(0);
}

const result = aggregate(reports);
const outDir = path.join(process.cwd(), 'e2e', 'bots', 'surveys');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${date}-summary.md`);
fs.writeFileSync(outPath, result);
console.log(`Survey-Zusammenfassung: ${outPath}`);
console.log(`${reports.length} Bots ausgewertet.`);
