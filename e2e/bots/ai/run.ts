import { generateBots, type AiBotConfig } from './bot-generator';
import { createBotClient } from './supabase';
import { runBotSession } from './agent';
import { analyzeMarket, selectBots, aggregateInsights } from './director';
import type { SessionReport } from './journal';
import * as fs from 'fs';
import * as path from 'path';

const BOT_PASSWORD = 'BeScout2026!';
const BATCH_SIZE = 5;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const allBots = generateBots(BOT_PASSWORD);

  if (command === '--setup') {
    const { setupAccounts } = await import('./setup-accounts');
    await setupAccounts();
    return;
  }

  if (command === '--bot') {
    const id = parseInt(args[1]);
    const bot = allBots.find(b => b.id === id);
    if (!bot) { console.error(`Bot ${id} not found (1-${allBots.length})`); process.exit(1); }
    await runSingle(bot);
    return;
  }

  if (command === '--batch') {
    const [start, end] = (args[1] ?? '1-5').split('-').map(Number);
    const batch = allBots.filter(b => b.id >= start && b.id <= end);
    console.log(`Running batch: ${batch.length} bots (${start}-${end})\n`);
    await runBatch(batch);
    return;
  }

  if (command === '--smart') {
    const count = parseInt(args[1] ?? '10');
    console.log('Analyzing market...');
    const analysis = await analyzeMarket();
    console.log(`Market needs: ${analysis.needs.join(', ') || 'balanced'}`);
    console.log(`Open sells: ${analysis.openSellOrders}, Open buys: ${analysis.openBuyOrders}`);
    console.log(`Active players: ${analysis.activePlayers}, Recent posts: ${analysis.recentPosts}\n`);

    const selected = selectBots(allBots, analysis, count);
    console.log(`Selected ${selected.length} bots:`);
    for (const b of selected) console.log(`  #${b.id} ${b.name} (${b.archetype})`);
    console.log('');

    await runBatch(selected);
    return;
  }

  if (command === '--all') {
    console.log(`Running ALL ${allBots.length} bots in batches of ${BATCH_SIZE}\n`);
    await runBatch(allBots);
    return;
  }

  // Usage
  console.log(`
BeScout AI Bot Runner

Usage:
  npx tsx e2e/bots/ai/run.ts --setup           Create 50 bot accounts in Supabase
  npx tsx e2e/bots/ai/run.ts --bot 5            Run single bot by ID
  npx tsx e2e/bots/ai/run.ts --batch 1-10       Run bots 1-10
  npx tsx e2e/bots/ai/run.ts --smart 15         Director picks 15 best bots for current market
  npx tsx e2e/bots/ai/run.ts --all              Run all ${allBots.length} bots

Bot Archetypes (${allBots.length} total):
${Array.from(new Set(allBots.map(b => b.archetype))).map(a => {
    const count = allBots.filter(b => b.archetype === a).length;
    return `  ${a}: ${count} bots`;
  }).join('\n')}
  `);
}

async function runSingle(bot: AiBotConfig) {
  console.log(`Running bot #${bot.id}: ${bot.name} (${bot.archetype})\n`);
  try {
    const { client, userId } = await createBotClient(bot.email, bot.password);
    const report = await runBotSession(bot, client, userId);
    printReport(report);
  } catch (err) {
    console.error(`Bot #${bot.id} failed:`, err instanceof Error ? err.message : err);
  }
}

async function runBatch(bots: AiBotConfig[]) {
  const allReports: SessionReport[] = [];

  for (let i = 0; i < bots.length; i += BATCH_SIZE) {
    const batch = bots.slice(i, i + BATCH_SIZE);
    console.log(`── Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.map(b => `#${b.id}`).join(', ')} ──`);

    const results = await Promise.allSettled(
      batch.map(async bot => {
        try {
          const { client, userId } = await createBotClient(bot.email, bot.password);
          return await runBotSession(bot, client, userId);
        } catch (err) {
          console.error(`  Bot #${bot.id} (${bot.name}) failed: ${err instanceof Error ? err.message : err}`);
          return null;
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        allReports.push(result.value);
        const r = result.value;
        console.log(`  ${r.bot.name} (${r.bot.archetype}): ${r.summary.trades} trades, ${r.summary.posts} posts, ${r.summary.bugs} bugs — ${(r.durationMs / 1000).toFixed(1)}s`);
      }
    }

    if (i + BATCH_SIZE < bots.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Save aggregated insights
  if (allReports.length > 0) {
    const insightsDir = path.join(process.cwd(), 'e2e', 'bots', 'insights');
    if (!fs.existsSync(insightsDir)) fs.mkdirSync(insightsDir, { recursive: true });

    const date = new Date().toISOString().slice(0, 10);
    const insightsMd = aggregateInsights(allReports);
    fs.writeFileSync(path.join(insightsDir, `${date}-insights.md`), insightsMd);
    fs.writeFileSync(path.join(insightsDir, `${date}-insights.json`), JSON.stringify(allReports, null, 2));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`TOTAL: ${allReports.length} bots, ${allReports.reduce((s, r) => s + r.summary.trades, 0)} trades`);
    console.log(`Bugs: ${allReports.reduce((s, r) => s + r.summary.bugs, 0)} | Errors: ${allReports.reduce((s, r) => s + r.summary.errors, 0)}`);
    console.log(`Reports: e2e/bots/insights/${date}-insights.md`);
  }
}

function printReport(r: SessionReport) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`${r.bot.name} (${r.bot.archetype})`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Duration: ${(r.durationMs / 1000).toFixed(1)}s`);
  console.log(`Balance: ${(r.balanceBefore / 100).toLocaleString('de')} -> ${(r.balanceAfter / 100).toLocaleString('de')} CR`);
  console.log(`Trades: ${r.summary.trades} | Posts: ${r.summary.posts}`);
  console.log(`Bugs: ${r.summary.bugs} | UX: ${r.summary.uxFriction} | Wishes: ${r.summary.featureWishes}`);
}

main().catch(console.error);
