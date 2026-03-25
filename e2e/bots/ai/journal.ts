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

export type RatingCategory = 'onboarding' | 'trading' | 'fantasy' | 'community' | 'design' | 'performance' | 'overall';

export interface SurveyRating {
  category: RatingCategory;
  score: number; // 1-5
  comment: string;
}

export interface BotSurvey {
  ratings: SurveyRating[];
  topStrengths: string[];    // max 3
  topWeaknesses: string[];   // max 3
  ideas: string[];           // improvement suggestions
  wouldRecommend: boolean;
  oneLineSummary: string;    // "Als [archetype] finde ich die App..."
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
  survey?: BotSurvey;
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

  /** Generate post-session survey based on what the bot experienced */
  generateSurvey(): BotSurvey {
    const bugs = this.entries.filter(e => e.type === 'bug');
    const friction = this.entries.filter(e => e.type === 'ux_friction');
    const errors = this.entries.filter(e => e.type === 'error');
    const trades = this.entries.filter(e => e.type === 'trade');
    const successes = this.entries.filter(e => e.type === 'success');
    const wishes = this.entries.filter(e => e.type === 'feature_wish');

    const problemCount = bugs.length + friction.length + errors.length;
    const successCount = trades.length + successes.length;

    // Rate each category based on what the bot encountered
    const rate = (category: RatingCategory, areaKeys: string[]): SurveyRating => {
      const relevant = this.entries.filter(e => areaKeys.some(k => e.area.includes(k)));
      const problems = relevant.filter(e => ['bug', 'ux_friction', 'error'].includes(e.type));
      const wins = relevant.filter(e => ['success', 'trade', 'post'].includes(e.type));

      let score: number;
      if (relevant.length === 0) score = 3; // no data = neutral
      else if (problems.length === 0 && wins.length > 0) score = 5;
      else if (problems.length === 0) score = 4;
      else if (problems.length <= 1) score = 3;
      else if (problems.length <= 3) score = 2;
      else score = 1;

      const comment = problems.length > 0
        ? problems.map(p => p.message).join('; ')
        : wins.length > 0
          ? `${wins.length} erfolgreiche Aktionen, keine Probleme.`
          : 'Nicht getestet.';

      return { category, score, comment };
    };

    const ratings: SurveyRating[] = [
      rate('onboarding', ['start', 'wallet', 'balance']),
      rate('trading', ['buy', 'sell', 'order', 'market', 'ipo']),
      rate('fantasy', ['fantasy', 'lineup', 'event']),
      rate('community', ['post', 'vote', 'community', 'research']),
      rate('design', ['ui', 'layout', 'scroll', 'overflow']),
      rate('performance', ['load', 'timeout', 'slow', 'error']),
    ];

    const avgScore = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
    ratings.push({
      category: 'overall',
      score: Math.round(avgScore),
      comment: `Durchschnitt aus ${ratings.length - 1} Kategorien.`,
    });

    // Top strengths: areas with score 4-5
    const topStrengths = ratings
      .filter(r => r.score >= 4 && r.category !== 'overall')
      .map(r => `${r.category}: ${r.comment}`)
      .slice(0, 3);

    // Top weaknesses: areas with score 1-2, or bugs/friction
    const topWeaknesses: string[] = [];
    for (const r of ratings.filter(r => r.score <= 2 && r.category !== 'overall')) {
      topWeaknesses.push(`${r.category}: ${r.comment}`);
    }
    for (const b of bugs.filter(b => b.severity === 'critical' || b.severity === 'high')) {
      topWeaknesses.push(`Bug: ${b.message}`);
    }

    // Ideas from feature wishes + archetype-specific suggestions
    const ideas = wishes.map(w => w.message);
    if (friction.length > 0 && ideas.length === 0) {
      ideas.push(`UX verbessern: ${friction[0].message}`);
    }

    const wouldRecommend = avgScore >= 3.5 && bugs.filter(b => b.severity === 'critical').length === 0;

    const sentiment = avgScore >= 4 ? 'sehr gut' : avgScore >= 3 ? 'okay' : 'verbesserungswuerdig';
    const oneLineSummary = `Als ${this.bot.archetype} finde ich die App ${sentiment}. ${successCount} Aktionen, ${problemCount} Probleme.`;

    return { ratings, topStrengths, topWeaknesses: topWeaknesses.slice(0, 3), ideas, wouldRecommend, oneLineSummary };
  }

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
      survey: this.generateSurvey(),
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

    // Survey section
    if (r.survey) {
      const s = r.survey;
      lines.push('## Umfrage');
      lines.push('');
      lines.push(`> ${s.oneLineSummary}`);
      lines.push('');
      lines.push(`**Weiterempfehlung:** ${s.wouldRecommend ? 'Ja' : 'Nein'}`);
      lines.push('');
      lines.push('### Bewertungen');
      lines.push('| Bereich | Score | Kommentar |');
      lines.push('|---------|-------|-----------|');
      for (const r of s.ratings) {
        const stars = '★'.repeat(r.score) + '☆'.repeat(5 - r.score);
        lines.push(`| ${r.category} | ${stars} | ${r.comment.slice(0, 80)} |`);
      }
      lines.push('');

      if (s.topStrengths.length > 0) {
        lines.push('### Staerken');
        for (const str of s.topStrengths) lines.push(`- ${str}`);
        lines.push('');
      }

      if (s.topWeaknesses.length > 0) {
        lines.push('### Schwaechen');
        for (const w of s.topWeaknesses) lines.push(`- ${w}`);
        lines.push('');
      }

      if (s.ideas.length > 0) {
        lines.push('### Ideen & Verbesserungen');
        for (const idea of s.ideas) lines.push(`- ${idea}`);
        lines.push('');
      }
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
