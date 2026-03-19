/**
 * Bot Journal — Erlebnisse, Bugs, Wuensche
 *
 * Jeder Bot fuehrt ein Journal waehrend seiner Session.
 * Am Ende wird alles in eine Markdown-Datei geschrieben
 * und als JSON fuer automatische Auswertung gespeichert.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { BotConfig } from './bot-config';

export type EntryType = 'action' | 'observation' | 'bug' | 'wish' | 'ux_issue' | 'success' | 'error' | 'timing';

export interface JournalEntry {
  timestamp: string;
  type: EntryType;
  page: string;
  message: string;
  /** Screenshot path if captured */
  screenshot?: string;
  /** Duration in ms for timing entries */
  durationMs?: number;
  /** Severity for bugs (low/medium/high/critical) */
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface BotReport {
  bot: {
    name: string;
    email: string;
    personality: string;
    strategy: string;
  };
  sessionStart: string;
  sessionEnd?: string;
  durationMs?: number;
  balanceBefore?: string;
  balanceAfter?: string;
  summary: {
    actions: number;
    observations: number;
    bugs: number;
    wishes: number;
    uxIssues: number;
    successes: number;
    errors: number;
    playersBought: number;
    sellOrdersPlaced: number;
    pagesVisited: string[];
  };
  entries: JournalEntry[];
}

export class BotJournal {
  private entries: JournalEntry[] = [];
  private bot: BotConfig;
  private startTime: number;
  private pagesVisited = new Set<string>();
  private playersBought = 0;
  private sellOrdersPlaced = 0;
  public balanceBefore?: string;
  public balanceAfter?: string;

  constructor(bot: BotConfig) {
    this.bot = bot;
    this.startTime = Date.now();
  }

  private add(type: EntryType, page: string, message: string, extra?: Partial<JournalEntry>) {
    this.pagesVisited.add(page);
    this.entries.push({
      timestamp: new Date().toISOString(),
      type,
      page,
      message,
      ...extra,
    });
  }

  // ── Logging Methods ──

  action(page: string, message: string) {
    this.add('action', page, message);
  }

  observe(page: string, message: string) {
    this.add('observation', page, message);
  }

  bug(page: string, message: string, severity: JournalEntry['severity'] = 'medium', screenshot?: string) {
    this.add('bug', page, message, { severity, screenshot });
  }

  wish(page: string, message: string) {
    this.add('wish', page, message);
  }

  uxIssue(page: string, message: string, severity: JournalEntry['severity'] = 'low') {
    this.add('ux_issue', page, message, { severity });
  }

  success(page: string, message: string) {
    this.add('success', page, message);
    if (message.toLowerCase().includes('bought') || message.toLowerCase().includes('gekauft')) {
      this.playersBought++;
    }
    if (message.toLowerCase().includes('sell') || message.toLowerCase().includes('gelistet')) {
      this.sellOrdersPlaced++;
    }
  }

  error(page: string, message: string) {
    this.add('error', page, message);
  }

  timing(page: string, label: string, durationMs: number) {
    this.add('timing', page, `${label}: ${durationMs}ms`, { durationMs });
    if (durationMs > 10000) {
      this.uxIssue(page, `Seite braucht zu lange: ${label} (${(durationMs / 1000).toFixed(1)}s)`, 'medium');
    }
  }

  // ── Report Generation ──

  getReport(): BotReport {
    const byType = (t: EntryType) => this.entries.filter(e => e.type === t).length;
    return {
      bot: {
        name: this.bot.name,
        email: this.bot.email,
        personality: this.bot.personality,
        strategy: this.bot.strategy,
      },
      sessionStart: new Date(this.startTime).toISOString(),
      sessionEnd: new Date().toISOString(),
      durationMs: Date.now() - this.startTime,
      balanceBefore: this.balanceBefore,
      balanceAfter: this.balanceAfter,
      summary: {
        actions: byType('action'),
        observations: byType('observation'),
        bugs: byType('bug'),
        wishes: byType('wish'),
        uxIssues: byType('ux_issue'),
        successes: byType('success'),
        errors: byType('error'),
        playersBought: this.playersBought,
        sellOrdersPlaced: this.sellOrdersPlaced,
        pagesVisited: Array.from(this.pagesVisited),
      },
      entries: this.entries,
    };
  }

  // ── Personality-based Wishes ──

  private wishesGenerated = false;
  generateWishes() {
    if (this.wishesGenerated) return;
    this.wishesGenerated = true;
    switch (this.bot.personality) {
      case 'trader':
        this.wish('market', 'Als Trader waere ein Preis-Alert hilfreich wenn ein Spieler unter meinen Wunschpreis faellt');
        this.wish('market', 'Ich wuensche mir eine Sortierung nach 24h-Preisaenderung um schnell Deals zu finden');
        if (this.playersBought === 0) {
          this.wish('market', 'Es gibt zu wenig Angebote auf dem Marktplatz. Mehr IPOs oder Sell Orders waeren gut');
        }
        break;
      case 'manager':
        this.wish('fantasy', 'Ein Auto-Fill fuer die Fantasy-Aufstellung basierend auf L5 Score waere praktisch');
        this.wish('market', 'Ich moechte Spieler nach Position filtern koennen um mein Team gezielt aufzubauen');
        break;
      case 'analyst':
        this.wish('community', 'Ein Research-Template fuer Spieler-Analysen wuerde die Qualitaet der Posts verbessern');
        this.wish('player-detail', 'Detailliertere Statistiken (Passquote, Zweikampfquote) waeren fuer Analysen wichtig');
        break;
      case 'collector':
        this.wish('market', 'Eine Album-Ansicht aller gesammelten Spieler waere motivierend');
        this.wish('profile', 'Achievements fuer Sammel-Meilensteine (10 Spieler, alle Positionen, etc.) waeren toll');
        break;
      case 'sniper':
        this.wish('market', 'Echtzeit-Benachrichtigungen bei neuen Sell Orders unter Referenzwert');
        this.wish('market', 'Ein Filter fuer Spieler die unter ihrem Referenzwert gelistet sind');
        break;
    }
  }
}

// ── File Output ──

export function saveReports(reports: BotReport[]) {
  const dir = path.join(process.cwd(), 'e2e', 'bots', 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Overwrite latest report (single file, not per-run)
  const jsonPath = path.join(dir, 'latest-bot-reports.json');
  fs.writeFileSync(jsonPath, JSON.stringify(reports, null, 2));

  const mdPath = path.join(dir, 'latest-bot-reports.md');
  const md = generateMarkdown(reports);
  fs.writeFileSync(mdPath, md);

  console.log(`\nReports saved:`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  MD:   ${mdPath}`);
}

function generateMarkdown(reports: BotReport[]): string {
  const lines: string[] = [];
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  lines.push(`# BeScout Bot Simulation Report`);
  lines.push(`**Datum:** ${now}`);
  lines.push(`**Bots:** ${reports.length}`);
  lines.push('');

  // Executive Summary
  const totalBugs = reports.reduce((s, r) => s + r.summary.bugs, 0);
  const totalUx = reports.reduce((s, r) => s + r.summary.uxIssues, 0);
  const totalWishes = reports.reduce((s, r) => s + r.summary.wishes, 0);
  const totalBought = reports.reduce((s, r) => s + r.summary.playersBought, 0);
  const totalSold = reports.reduce((s, r) => s + r.summary.sellOrdersPlaced, 0);

  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`| Metrik | Wert |`);
  lines.push(`|--------|------|`);
  lines.push(`| Bugs gefunden | ${totalBugs} |`);
  lines.push(`| UX Issues | ${totalUx} |`);
  lines.push(`| Feature Wishes | ${totalWishes} |`);
  lines.push(`| Spieler gekauft | ${totalBought} |`);
  lines.push(`| Sell Orders | ${totalSold} |`);
  lines.push('');

  // Bugs (aggregated, all bots)
  const allBugs = reports.flatMap(r => r.entries.filter(e => e.type === 'bug').map(e => ({ bot: r.bot.name, ...e })));
  if (allBugs.length > 0) {
    lines.push('## Bugs');
    lines.push('');
    lines.push('| Severity | Page | Bot | Bug |');
    lines.push('|----------|------|-----|-----|');
    for (const b of allBugs.sort((a, c) => {
      const sev = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity ?? 'low'] ?? 3) - (sev[c.severity ?? 'low'] ?? 3);
    })) {
      lines.push(`| ${b.severity ?? 'medium'} | ${b.page} | ${b.bot} | ${b.message} |`);
    }
    lines.push('');
  }

  // UX Issues
  const allUx = reports.flatMap(r => r.entries.filter(e => e.type === 'ux_issue').map(e => ({ bot: r.bot.name, ...e })));
  if (allUx.length > 0) {
    lines.push('## UX Issues');
    lines.push('');
    for (const u of allUx) {
      lines.push(`- **[${u.page}]** ${u.message} *(${u.bot})*`);
    }
    lines.push('');
  }

  // Wishes
  const allWishes = reports.flatMap(r => r.entries.filter(e => e.type === 'wish').map(e => ({ bot: r.bot.name, personality: r.bot.personality, ...e })));
  if (allWishes.length > 0) {
    lines.push('## Feature Wishes');
    lines.push('');
    for (const w of allWishes) {
      lines.push(`- **[${w.personality}]** ${w.message}`);
    }
    lines.push('');
  }

  // Per-Bot Details
  for (const r of reports) {
    lines.push(`---`);
    lines.push(`## ${r.bot.name} (${r.bot.personality})`);
    lines.push(`**Strategie:** ${r.bot.strategy}`);
    lines.push(`**Dauer:** ${r.durationMs ? (r.durationMs / 1000).toFixed(0) + 's' : '?'}`);
    lines.push(`**Balance:** ${r.balanceBefore ?? '?'} → ${r.balanceAfter ?? '?'}`);
    lines.push(`**Gekauft:** ${r.summary.playersBought} | **Gelistet:** ${r.summary.sellOrdersPlaced}`);
    lines.push(`**Seiten:** ${r.summary.pagesVisited.join(', ')}`);
    lines.push('');

    // Timeline
    lines.push('### Timeline');
    lines.push('');
    for (const e of r.entries) {
      const icon = {
        action: '-',
        observation: '👀',
        bug: '🐛',
        wish: '💡',
        ux_issue: '⚠️',
        success: '✅',
        error: '❌',
        timing: '⏱️',
      }[e.type];
      const time = e.timestamp.slice(11, 19);
      lines.push(`${icon} \`${time}\` **[${e.page}]** ${e.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
