/**
 * Slice 223 — Audit-Stale-Catcher (D48-Pattern automatisiert).
 *
 * Liest `worklog/punch-list-2026-04-25.md`, identifiziert alle Items mit
 * `status: open` oder `in-progress` in den 4 Domain-Detail-Tabellen
 * (Brand-Coherence, UX-States, FM-Mechanics, Fantasy-Scoring) und greppt
 * `worklog/log.md` nach Erwähnungen — wenn Item in einem Slice-Log auftaucht
 * obwohl es noch als `open` markiert ist, ist es ein STALE-CANDIDATE.
 *
 * D48-Pattern (memory/decisions.md): empirisch ~22% Audit-Stale-Drift in
 * 5 aufeinanderfolgenden Polish-Sweeps (Slice 200a, 200b, 203, 206, 209).
 * Slice 209 hat 12 Marker manuell korrigiert. Dieses Script automatisiert
 * den Catcher für Future-Sweeps.
 *
 * Usage:
 *   npx tsx scripts/audit-stale-check.ts
 *   pnpm run audit:stale
 *
 * Exit-Codes:
 *   0 — keine stale-candidates gefunden (clean)
 *   1 — mindestens 1 stale-candidate (Mensch reviewt + entscheidet)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const PROJECT_ROOT = resolve(__dirname, '..');
const PUNCH_LIST = resolve(PROJECT_ROOT, 'worklog/punch-list-2026-04-25.md');
const LOG_FILE = resolve(PROJECT_ROOT, 'worklog/log.md');

const ACTIVE_STATUSES = new Set(['open', 'in-progress']);

/**
 * Close-signal regex: indicates a slice actually closed/fixed an item.
 * Tight pattern to avoid aggregate-count false-positives like
 * "UX 20 done / 7 open" (= 20 UX items done) which would match a generic
 * "\bdone\b". Allowed signals (markdown-styled or arrow-styled):
 *   - **Closed** / **Closed (N Findings):**  (list-header style in log.md)
 *   - Slice NNN ✓                             (slice-checkmark)
 *   - → done                                  (arrow-done)
 *   - ✓ alone                                 (legit close-marker)
 *   - LIVE                                    (deploy-marker)
 */
const CLOSE_SIGNAL = /(?:\*\*Closed\b|Slice\s+\d+\s*✓|→\s*done\b|\bLIVE\b|✓)/;

type Domain = {
  /** Section-header label (e.g. "Brand-Coherence") */
  label: string;
  /** Prefix-variants for grep (e.g. ["Brand ", "brand ", "Brand-", "brand-"]) */
  prefixes: string[];
  /**
   * If true, ID column already includes domain marker (e.g. "F-09", "K-02").
   * Then prefixes are not prepended; raw ID is used directly.
   */
  idIsAbsolute: boolean;
};

const DOMAINS: Record<string, Domain> = {
  'Brand-Coherence': {
    label: 'Brand-Coherence',
    prefixes: ['Brand ', 'brand ', 'Brand-', 'brand-', 'BRAND '],
    idIsAbsolute: false,
  },
  'UX-States': {
    label: 'UX-States',
    prefixes: ['UX ', 'ux ', 'UX-', 'ux-'],
    idIsAbsolute: false,
  },
  'FM-Mechanics': {
    label: 'FM-Mechanics',
    prefixes: ['FM ', 'fm ', 'FM-', 'fm-'],
    idIsAbsolute: false,
  },
  'Fantasy-Scoring': {
    label: 'Fantasy-Scoring',
    prefixes: [], // F-09, K-02 etc. are absolute identifiers
    idIsAbsolute: true,
  },
};

type StaleCandidate = {
  domain: string;
  rawId: string;
  matchedVariant: string;
  status: string;
  punchListLine: number;
  logMatches: { line: number; snippet: string }[];
};

type Stats = {
  itemsScanned: number;
  activeItems: number;
  staleFound: number;
  domainsFound: string[];
};

/** Strip `**bold**` / `*italic*` / leading-trailing whitespace from cell. */
function cleanCell(cell: string): string {
  return cell.replace(/\*+/g, '').trim();
}

/** Detect H2 section headers; null if not a section change. */
function detectDomainHeader(line: string): Domain | null {
  // Match "## Brand-Coherence" exactly; allow trailing " - 18 Findings" etc.
  const match = /^##\s+(Brand-Coherence|UX-States|FM-Mechanics|Fantasy-Scoring)\b/.exec(line);
  if (!match) return null;
  return DOMAINS[match[1]] ?? null;
}

/** Build regex pattern with word-boundary so `K-02` doesn't match `K-021`. */
function buildIdRegex(rawId: string, prefixes: string[]): { pattern: RegExp; variants: string[] } {
  const variants: string[] = [];

  if (prefixes.length === 0) {
    // Absolute ID like "F-09", "K-02" — use as-is, lowercase variant too.
    variants.push(rawId, rawId.toLowerCase(), rawId.toUpperCase());
  } else {
    for (const prefix of prefixes) {
      variants.push(`${prefix}${rawId}`);
    }
  }

  // Dedupe.
  const unique = Array.from(new Set(variants));

  // Build alternation regex with character-class boundaries.
  // We avoid \b because IDs like "1.1" or "F-09" contain non-word chars.
  // Boundary: not preceded/followed by alphanumeric or dot (so "1.1" doesn't match "1.10").
  const escaped = unique.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const alt = escaped.join('|');
  const pattern = new RegExp(`(?<![\\w.])(${alt})(?![\\w.])`, 'g');

  return { pattern, variants: unique };
}

/** Parse punch-list, return active items (open / in-progress) per domain. */
function parsePunchList(content: string) {
  const lines = content.split('\n');
  let currentDomain: Domain | null = null;
  const activeItems: Array<{
    domain: Domain;
    rawId: string;
    status: string;
    line: number;
  }> = [];

  let itemsScanned = 0;
  const domainsFound = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track section.
    const newDomain = detectDomainHeader(line);
    if (newDomain) {
      currentDomain = newDomain;
      domainsFound.add(newDomain.label);
      continue;
    }

    // Only parse rows when inside a domain section.
    if (!currentDomain) continue;

    // Table row: starts with `|`.
    if (!line.startsWith('|')) continue;

    // Skip separator rows like `|---|---|`.
    if (/^\|\s*[-:]+\s*\|/.test(line)) continue;

    // Split, strip leading/trailing empty (because `| a | b |` splits to ['', ' a ', ' b ', ''])
    const cells = line.split('|').slice(1, -1).map(cleanCell);

    // Need at least: ID, Status, Source/Issue, ... (4+ cells).
    if (cells.length < 3) continue;

    const rawId = cells[0];
    const status = cells[1];

    // Skip header rows (Status cell literally "Status").
    if (status.toLowerCase() === 'status') continue;

    // Only process whitelisted statuses.
    if (!ACTIVE_STATUSES.has(status)) {
      itemsScanned++;
      continue;
    }
    itemsScanned++;

    // Handle comma-separated IDs (rare but seen e.g. "F-07, F-11").
    const ids = rawId.split(',').map((s) => s.trim()).filter(Boolean);
    for (const id of ids) {
      activeItems.push({ domain: currentDomain, rawId: id, status, line: i + 1 });
    }
  }

  return { activeItems, itemsScanned, domainsFound: Array.from(domainsFound) };
}

/**
 * Split a log-line into sub-clauses by structural punctuation so that
 * "Brand 1 → done. ... F-09 CEO-pending" is split — close-signal "done"
 * stays with Brand 1, not bleeding to F-09.
 */
function splitClauses(line: string): string[] {
  // Split on: . — – ; or `, **` (markdown-bold-list-item-separator).
  // Keep splitter-dropping simple — the chunk-context is what matters.
  return line.split(/[.;—–]|, \*\*/g).map((c) => c.trim()).filter(Boolean);
}

/**
 * Grep log content for ID variants. Returns match lines with snippet.
 * STALE-CANDIDATE rule: ID must appear in a sub-clause that ALSO contains
 * a close-signal (closed/done/fixed/LIVE/✓). Mentions in
 * skipped/deferred/planned/CEO-pending sub-clauses are NOT flagged.
 */
function searchLog(
  logContent: string,
  pattern: RegExp,
): { line: number; snippet: string }[] {
  const lines = logContent.split('\n');
  const matches: { line: number; snippet: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    pattern.lastIndex = 0;
    if (!pattern.test(line)) continue;

    // Per-clause check: ID + close-signal must co-occur in same chunk.
    const clauses = splitClauses(line);
    const closingClause = clauses.find((clause) => {
      pattern.lastIndex = 0;
      return pattern.test(clause) && CLOSE_SIGNAL.test(clause);
    });

    if (!closingClause) continue;

    const snippet = line.length > 200 ? `${line.slice(0, 197)}...` : line;
    matches.push({ line: i + 1, snippet });
  }

  return matches;
}

/** Format Markdown report. */
function formatReport(candidates: StaleCandidate[], stats: Stats): string {
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push(`# Audit-Stale Report — ${date}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Punch-List:** \`worklog/punch-list-2026-04-25.md\``);
  lines.push(`**Slice:** 223 (D48-Catcher automatisiert)`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Items scanned:** ${stats.itemsScanned}`);
  lines.push(`- **Active (open / in-progress):** ${stats.activeItems}`);
  lines.push(`- **Stale-candidates:** ${stats.staleFound}`);
  lines.push(`- **Domains processed:** ${stats.domainsFound.join(', ')}`);
  lines.push('');

  if (candidates.length === 0) {
    lines.push('## Result: ✅ Clean');
    lines.push('');
    lines.push('No active items are mentioned in `worklog/log.md`. Punch-list is in sync with slice history.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('## Stale-Candidates');
  lines.push('');
  lines.push('Each item below is **status: open / in-progress** in punch-list, BUT also referenced in `worklog/log.md`. Manual review needed: was it actually fixed in a slice but never status-updated? (D48 pattern.)');
  lines.push('');

  for (const c of candidates) {
    lines.push(`### ${c.domain} \`${c.rawId}\` (status: ${c.status})`);
    lines.push('');
    lines.push(`- Punch-list line: ${c.punchListLine}`);
    lines.push(`- Matched-variant: \`${c.matchedVariant}\``);
    lines.push(`- log.md hits (${c.logMatches.length}):`);
    lines.push('');
    for (const m of c.logMatches.slice(0, 10)) {
      lines.push(`  - L${m.line}: \`${m.snippet.replace(/`/g, '\\`')}\``);
    }
    if (c.logMatches.length > 10) {
      lines.push(`  - ... +${c.logMatches.length - 10} more`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('**Next Steps:** For each candidate, manually verify in the cited Slice-Log entries:');
  lines.push('1. Was it fixed → update punch-list status to `done` + reference Slice.');
  lines.push('2. Was it skipped/deferred → update status to `deferred` or `wont-fix`.');
  lines.push('3. False-positive (same ID-substring in unrelated context) → no action.');
  lines.push('');

  return lines.join('\n');
}

function main(): void {
  if (!existsSync(PUNCH_LIST)) {
    console.error(`ERROR: Punch-list not found at ${PUNCH_LIST}`);
    process.exit(2);
  }
  if (!existsSync(LOG_FILE)) {
    console.error(`ERROR: log.md not found at ${LOG_FILE}`);
    process.exit(2);
  }

  const punchListContent = readFileSync(PUNCH_LIST, 'utf8');
  const logContent = readFileSync(LOG_FILE, 'utf8');

  const { activeItems, itemsScanned, domainsFound } = parsePunchList(punchListContent);

  const candidates: StaleCandidate[] = [];

  for (const item of activeItems) {
    const { pattern, variants } = buildIdRegex(item.rawId, item.domain.prefixes);
    const matches = searchLog(logContent, pattern);

    if (matches.length > 0) {
      // Determine which variant actually matched (use first hit).
      const hit = matches[0];
      const matchedVariant = variants.find((v) => hit.snippet.toLowerCase().includes(v.toLowerCase())) ?? variants[0];

      candidates.push({
        domain: item.domain.label,
        rawId: item.rawId,
        matchedVariant,
        status: item.status,
        punchListLine: item.line,
        logMatches: matches,
      });
    }
  }

  const stats: Stats = {
    itemsScanned,
    activeItems: activeItems.length,
    staleFound: candidates.length,
    domainsFound,
  };

  // Write report.
  const reportPath = resolve(
    PROJECT_ROOT,
    `worklog/audits/audit-stale-${new Date().toISOString().slice(0, 10)}.md`,
  );
  const reportDir = dirname(reportPath);
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }
  const report = formatReport(candidates, stats);
  writeFileSync(reportPath, report, 'utf8');

  // Stdout summary.
  console.log('═══ Audit-Stale-Check ═══');
  console.log(`Items scanned: ${stats.itemsScanned}`);
  console.log(`Active (open / in-progress): ${stats.activeItems}`);
  console.log(`Stale-candidates: ${stats.staleFound}`);
  console.log(`Domains processed: ${stats.domainsFound.join(', ')}`);
  console.log(`Report: ${reportPath}`);
  console.log('');

  if (candidates.length === 0) {
    console.log('✅ No stale markers found. Punch-list is in sync.');
    process.exit(0);
  }

  console.log(`⚠️  ${candidates.length} stale-candidate(s) detected:`);
  for (const c of candidates) {
    console.log(`  • ${c.domain} ${c.rawId} (line ${c.punchListLine}) → ${c.logMatches.length} log.md hit(s)`);
  }
  console.log('');
  console.log('Manual review needed — see report file above.');
  process.exit(1);
}

main();
