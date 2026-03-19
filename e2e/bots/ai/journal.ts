import * as fs from 'fs';
import * as path from 'path';
import type { AiBotConfig } from './bot-generator';

export type LogType = 'action' | 'observation' | 'bug' | 'feature_wish' | 'ux_friction' | 'success' | 'error' | 'trade' | 'post';

export interface JournalEntry {
  timestamp: string;
  type: LogType;
  area: string;
  message: string;
  data?: Record<string, unknown>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SessionReport {
  bot: { id: number; name: string; email: string; archetype: string; strategy: string };
  sessionStart: string;
  sessionEnd: string;
  durationMs: number;
  balanceBefore: number;
  balanceAfter: number;
  summary: {
    actions: number;
    trades: number;
    posts: number;
    bugs: number;
    featureWishes: number;
    uxFriction: number;
    errors: number;
  };
  entries: JournalEntry[];
}

export class BotSessionJournal {
  private entries: JournalEntry[] = [];
  private startTime = Date.now();
  public balanceBefore = 0;
  public balanceAfter = 0;

  constructor(private bot: AiBotConfig) {}

  private add(type: LogType, area: string, message: string, extra?: Partial<JournalEntry>) {
    this.entries.push({ timestamp: new Date().toISOString(), type, area, message, ...extra });
  }

  action(area: string, msg: string) { this.add('action', area, msg); }
  observe(area: string, msg: string) { this.add('observation', area, msg); }
  trade(area: string, msg: string, data?: Record<string, unknown>) { this.add('trade', area, msg, { data }); }
  post(area: string, msg: string) { this.add('post', area, msg); }
  success(area: string, msg: string) { this.add('success', area, msg); }
  error(area: string, msg: string) { this.add('error', area, msg); }
  bug(area: string, msg: string, severity: JournalEntry['severity'] = 'medium') { this.add('bug', area, msg, { severity }); }
  featureWish(area: string, msg: string) { this.add('feature_wish', area, msg); }
  uxFriction(area: string, msg: string, severity: JournalEntry['severity'] = 'low') { this.add('ux_friction', area, msg, { severity }); }

  getReport(): SessionReport {
    const count = (t: LogType) => this.entries.filter(e => e.type === t).length;
    return {
      bot: { id: this.bot.id, name: this.bot.name, email: this.bot.email, archetype: this.bot.archetype, strategy: this.bot.strategy },
      sessionStart: new Date(this.startTime).toISOString(),
      sessionEnd: new Date().toISOString(),
      durationMs: Date.now() - this.startTime,
      balanceBefore: this.balanceBefore,
      balanceAfter: this.balanceAfter,
      summary: {
        actions: count('action'),
        trades: count('trade'),
        posts: count('post'),
        bugs: count('bug'),
        featureWishes: count('feature_wish'),
        uxFriction: count('ux_friction'),
        errors: count('error'),
      },
      entries: this.entries,
    };
  }

  save() {
    const dir = path.join(process.cwd(), 'e2e', 'bots', 'journals');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const date = new Date().toISOString().slice(0, 10);
    const slug = this.bot.email.replace('@bescout.app', '');
    const report = this.getReport();

    fs.writeFileSync(path.join(dir, `${date}-${slug}.json`), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(dir, `${date}-${slug}.md`), this.toMarkdown(report));

    return report;
  }

  private toMarkdown(r: SessionReport): string {
    const lines: string[] = [];
    lines.push(`# Bot Session: ${r.bot.name} (${r.bot.archetype})`);
    lines.push(`**Datum:** ${r.sessionStart.slice(0, 16).replace('T', ' ')}`);
    lines.push(`**Dauer:** ${(r.durationMs / 1000).toFixed(0)}s`);
    lines.push(`**Balance:** ${(r.balanceBefore / 100).toLocaleString('de')} -> ${(r.balanceAfter / 100).toLocaleString('de')} CR`);
    lines.push(`**Strategie:** ${r.bot.strategy}`);
    lines.push('');
    lines.push('## Summary');
    lines.push('| Metrik | Wert |');
    lines.push('|--------|------|');
    lines.push(`| Trades | ${r.summary.trades} |`);
    lines.push(`| Posts | ${r.summary.posts} |`);
    lines.push(`| Bugs | ${r.summary.bugs} |`);
    lines.push(`| Feature Wishes | ${r.summary.featureWishes} |`);
    lines.push(`| UX Friction | ${r.summary.uxFriction} |`);
    lines.push(`| Errors | ${r.summary.errors} |`);
    lines.push('');

    const bugs = r.entries.filter(e => e.type === 'bug');
    if (bugs.length > 0) {
      lines.push('## Bugs');
      for (const b of bugs) lines.push(`- **[${b.severity}]** [${b.area}] ${b.message}`);
      lines.push('');
    }

    const wishes = r.entries.filter(e => e.type === 'feature_wish');
    if (wishes.length > 0) {
      lines.push('## Feature Wishes');
      for (const w of wishes) lines.push(`- [${w.area}] ${w.message}`);
      lines.push('');
    }

    const ux = r.entries.filter(e => e.type === 'ux_friction');
    if (ux.length > 0) {
      lines.push('## UX Friction');
      for (const u of ux) lines.push(`- [${u.area}] ${u.message}`);
      lines.push('');
    }

    lines.push('## Timeline');
    for (const e of r.entries) {
      const icon: Record<string, string> = {
        action: '-', observation: '?', trade: '$', post: 'P',
        success: '+', error: 'X', bug: 'BUG', feature_wish: 'WISH', ux_friction: 'UX',
      };
      const time = e.timestamp.slice(11, 19);
      lines.push(`${icon[e.type] ?? '-'} \`${time}\` **[${e.area}]** ${e.message}`);
    }
    return lines.join('\n');
  }
}
