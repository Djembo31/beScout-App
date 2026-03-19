import type { AiBotConfig } from './bot-generator';
import { getAdminClient } from './supabase';
import * as actions from './actions';
import type { SessionReport } from './journal';

export interface MarketAnalysis {
  openSellOrders: number;
  openBuyOrders: number;
  activePlayers: number;
  recentPosts: number;
  needs: ('liquidity' | 'content' | 'buy_pressure' | 'sell_pressure' | 'diversity')[];
}

export async function analyzeMarket(): Promise<MarketAnalysis> {
  const admin = getAdminClient();

  const stats = await actions.getMarketStats(admin);
  const players = await actions.getMarketPlayers(admin, 200);
  const posts = await actions.getRecentPosts(admin, 50);

  const activePlayers = players.filter(p => p.floor_price != null && p.floor_price > 0).length;
  const recentPosts = posts.filter(p => {
    const age = Date.now() - new Date(p.created_at).getTime();
    return age < 24 * 60 * 60 * 1000;
  }).length;

  const needs: MarketAnalysis['needs'] = [];
  if (stats.openSellOrders < 20) needs.push('liquidity');
  if (stats.openBuyOrders < 5) needs.push('buy_pressure');
  if (stats.openSellOrders > 50 && stats.openBuyOrders < 10) needs.push('buy_pressure');
  if (recentPosts < 5) needs.push('content');
  if (activePlayers < 15) needs.push('diversity');
  if (stats.openSellOrders < stats.openBuyOrders) needs.push('sell_pressure');

  return { ...stats, activePlayers, recentPosts, needs };
}

export function selectBots(
  allBots: AiBotConfig[],
  analysis: MarketAnalysis,
  batchSize: number
): AiBotConfig[] {
  const scored = allBots.map(bot => {
    let score = Math.random() * 2;

    for (const need of analysis.needs) {
      switch (need) {
        case 'liquidity':
          if (['trader_aggressive', 'sniper'].includes(bot.archetype)) score += 5;
          if (bot.archetype === 'trader_conservative') score += 3;
          break;
        case 'buy_pressure':
          if (['collector', 'manager', 'fan'].includes(bot.archetype)) score += 5;
          break;
        case 'sell_pressure':
          if (['trader_aggressive', 'sniper'].includes(bot.archetype)) score += 4;
          break;
        case 'content':
          if (['analyst', 'fan'].includes(bot.archetype)) score += 5;
          if (bot.archetype === 'lurker') score += 2;
          break;
        case 'diversity':
          if (bot.archetype === 'collector') score += 4;
          if (bot.archetype === 'manager') score += 3;
          break;
      }
    }
    return { bot, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, batchSize)
    .map(s => s.bot);
}

export function aggregateInsights(reports: SessionReport[]): string {
  const lines: string[] = [];
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  lines.push('# AI Bot Insights Report');
  lines.push(`**Datum:** ${now}`);
  lines.push(`**Bots gelaufen:** ${reports.length}`);
  lines.push('');

  const totalTrades = reports.reduce((s, r) => s + r.summary.trades, 0);
  const totalPosts = reports.reduce((s, r) => s + r.summary.posts, 0);
  const totalBugs = reports.reduce((s, r) => s + r.summary.bugs, 0);
  const totalWishes = reports.reduce((s, r) => s + r.summary.featureWishes, 0);
  const totalUx = reports.reduce((s, r) => s + r.summary.uxFriction, 0);
  const totalErrors = reports.reduce((s, r) => s + r.summary.errors, 0);

  lines.push('## Summary');
  lines.push('| Metrik | Wert |');
  lines.push('|--------|------|');
  lines.push(`| Trades | ${totalTrades} |`);
  lines.push(`| Posts | ${totalPosts} |`);
  lines.push(`| Bugs | ${totalBugs} |`);
  lines.push(`| Feature Wishes | ${totalWishes} |`);
  lines.push(`| UX Friction | ${totalUx} |`);
  lines.push(`| Errors | ${totalErrors} |`);
  lines.push('');

  // Bugs
  const allBugs = reports.flatMap(r =>
    r.entries.filter(e => e.type === 'bug').map(e => ({ bot: r.bot.name, archetype: r.bot.archetype, ...e }))
  );
  if (allBugs.length > 0) {
    lines.push('## Bugs');
    lines.push('| Severity | Area | Bot | Bug |');
    lines.push('|----------|------|-----|-----|');
    for (const b of allBugs) {
      lines.push(`| ${b.severity ?? 'medium'} | ${b.area} | ${b.bot} (${b.archetype}) | ${b.message} |`);
    }
    lines.push('');
  }

  // Feature Wishes (deduplicated)
  const wishSet = new Map<string, { count: number; archetypes: Set<string> }>();
  for (const r of reports) {
    for (const e of r.entries.filter(e => e.type === 'feature_wish')) {
      const key = e.message;
      if (!wishSet.has(key)) wishSet.set(key, { count: 0, archetypes: new Set() });
      const w = wishSet.get(key)!;
      w.count++;
      w.archetypes.add(r.bot.archetype);
    }
  }
  if (wishSet.size > 0) {
    lines.push('## Feature Wishes (dedupliziert)');
    lines.push('| Wish | Archetypes | Count |');
    lines.push('|------|-----------|-------|');
    for (const [msg, w] of Array.from(wishSet.entries()).sort((a, b) => b[1].count - a[1].count)) {
      lines.push(`| ${msg} | ${Array.from(w.archetypes).join(', ')} | ${w.count} |`);
    }
    lines.push('');
  }

  // UX Friction
  const uxSet = new Map<string, { count: number; archetypes: Set<string> }>();
  for (const r of reports) {
    for (const e of r.entries.filter(e => e.type === 'ux_friction')) {
      const key = e.message;
      if (!uxSet.has(key)) uxSet.set(key, { count: 0, archetypes: new Set() });
      const u = uxSet.get(key)!;
      u.count++;
      u.archetypes.add(r.bot.archetype);
    }
  }
  if (uxSet.size > 0) {
    lines.push('## UX Friction (dedupliziert)');
    lines.push('| Issue | Archetypes | Count |');
    lines.push('|-------|-----------|-------|');
    for (const [msg, u] of Array.from(uxSet.entries()).sort((a, b) => b[1].count - a[1].count)) {
      lines.push(`| ${msg} | ${Array.from(u.archetypes).join(', ')} | ${u.count} |`);
    }
    lines.push('');
  }

  // Errors
  const allErrors = reports.flatMap(r =>
    r.entries.filter(e => e.type === 'error').map(e => ({ bot: r.bot.name, ...e }))
  );
  if (allErrors.length > 0) {
    lines.push('## Errors');
    for (const e of allErrors) {
      lines.push(`- **[${e.area}]** ${e.message} *(${e.bot})*`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
