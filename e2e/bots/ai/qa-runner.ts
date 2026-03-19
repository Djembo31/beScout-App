/**
 * BeScout QA Runner — Bots haemmern JEDEN Endpoint
 *
 * Kein theoretisches Rating. Echte API-Calls, echte Fehler.
 * Jeder Bot durchlaeuft den kompletten User-Workflow und loggt:
 * - Was funktioniert (PASS)
 * - Was bricht (FAIL + Error Message)
 * - Was fehlt (MISSING — Table/RPC nicht gefunden)
 * - Was langsam ist (SLOW > 3s)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiBotConfig } from './bot-generator';
import * as actions from './actions';
import * as fs from 'fs';
import * as path from 'path';

// ── Types ──

type TestStatus = 'PASS' | 'FAIL' | 'SLOW' | 'SKIP';

interface TestResult {
  area: string;
  test: string;
  status: TestStatus;
  durationMs: number;
  detail?: string;
  error?: string;
}

export interface QAReport {
  bot: { id: number; name: string; archetype: string };
  timestamp: string;
  totalDurationMs: number;
  results: TestResult[];
  summary: { pass: number; fail: number; slow: number; skip: number };
}

// ── Test Helper ──

async function runTest(
  area: string, name: string,
  fn: () => Promise<{ ok: boolean; detail?: string; error?: string }>
): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await fn();
    const dur = Date.now() - start;
    if (!result.ok) {
      return { area, test: name, status: 'FAIL', durationMs: dur, detail: result.detail, error: result.error };
    }
    return { area, test: name, status: dur > 3000 ? 'SLOW' : 'PASS', durationMs: dur, detail: result.detail };
  } catch (err) {
    return { area, test: name, status: 'FAIL', durationMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Main QA ──

export async function runQA(bot: AiBotConfig, client: SupabaseClient, userId: string): Promise<QAReport> {
  const start = Date.now();
  const results: TestResult[] = [];
  const r = (t: TestResult) => { results.push(t); return t; };

  // ══════════════════════════════════════
  // 1. WALLET & BALANCE
  // ══════════════════════════════════════
  let balance = 0;
  r(await runTest('wallet', 'getBalance', async () => {
    const w = await actions.getBalance(client, userId);
    balance = w.balance;
    return { ok: w.balance >= 0, detail: `Balance: ${(w.balance / 100).toFixed(0)} CR, Locked: ${(w.locked / 100).toFixed(0)} CR` };
  }));

  r(await runTest('wallet', 'getTransactions', async () => {
    const t = await actions.getTransactions(client, userId);
    return { ok: t.success, detail: `${t.data.length} Transaktionen`, error: t.error };
  }));

  // ══════════════════════════════════════
  // 2. PROFILE & SOCIAL
  // ══════════════════════════════════════
  r(await runTest('profile', 'getProfile', async () => {
    const p = await actions.getProfile(client, userId);
    return { ok: p.success, detail: p.data ? `${p.data.display_name} (@${p.data.handle})` : 'no data', error: p.error };
  }));

  r(await runTest('profile', 'getUserStats', async () => {
    const s = await actions.getUserStats(client, userId);
    return { ok: s != null, detail: s ? `Score: ${s.total_score}, Tier: ${s.tier}` : 'no stats' };
  }));

  r(await runTest('profile', 'getUserAchievements', async () => {
    const a = await actions.getUserAchievements(client, userId);
    return { ok: a.success, detail: `${a.data.length} Achievements`, error: a.error };
  }));

  // Follow another bot (next ID)
  const followTargetId = bot.id < 50 ? bot.id + 1 : 1;
  const followTargetEmail = `bot-${String(followTargetId).padStart(3, '0')}@bescout.app`;
  r(await runTest('social', 'followUser', async () => {
    // Get target user_id first
    const { data: targetProfile } = await client.from('profiles').select('id').eq('handle', followTargetEmail.replace('@bescout.app', '').replace('bot-', 'bot')).single();
    if (!targetProfile) return { ok: false, error: 'Follow target not found' };
    const res = await actions.followUser(client, userId, targetProfile.id);
    return { ok: res.success, error: res.error };
  }));

  r(await runTest('social', 'getLeaderboard', async () => {
    const lb = await actions.getLeaderboard(client, 10);
    return { ok: lb.success, detail: `${lb.data.length} entries`, error: lb.error };
  }));

  // ══════════════════════════════════════
  // 3. MARKET — READ
  // ══════════════════════════════════════
  let allPlayers: actions.MarketPlayer[] = [];
  r(await runTest('market', 'getMarketPlayers', async () => {
    allPlayers = await actions.getMarketPlayers(client, 100);
    return { ok: allPlayers.length > 0, detail: `${allPlayers.length} Spieler` };
  }));

  r(await runTest('market', 'getActiveIpos', async () => {
    const ipos = await actions.getActiveIpos(client);
    return { ok: true, detail: `${ipos.length} aktive IPOs` };
  }));

  r(await runTest('market', 'getMarketStats', async () => {
    const s = await actions.getMarketStats(client);
    return { ok: true, detail: `Sells: ${s.openSellOrders}, Buys: ${s.openBuyOrders}` };
  }));

  // Player detail + trades
  const testPlayer = allPlayers[Math.floor(Math.random() * Math.min(10, allPlayers.length))];
  if (testPlayer) {
    r(await runTest('market', 'getPlayerDetail', async () => {
      const p = await actions.getPlayerDetail(client, testPlayer.id);
      return { ok: p.success, detail: `${testPlayer.first_name} ${testPlayer.last_name}`, error: p.error };
    }));

    r(await runTest('market', 'getPlayerTrades', async () => {
      const t = await actions.getPlayerTrades(client, testPlayer.id);
      return { ok: t.success, detail: `${t.data.length} trades`, error: t.error };
    }));

    r(await runTest('market', 'getOpenSellOrders', async () => {
      const o = await actions.getOpenSellOrders(client, testPlayer.id);
      return { ok: true, detail: `${o.length} sell orders` };
    }));
  }

  // Club players
  if (testPlayer) {
    r(await runTest('market', 'getClubPlayers', async () => {
      const c = await actions.getClubPlayers(client, testPlayer.club_id);
      return { ok: c.success, detail: `${c.data.length} players in club`, error: c.error };
    }));
  }

  // ══════════════════════════════════════
  // 4. MARKET — WRITE (Buy + Sell + Orders)
  // ══════════════════════════════════════
  const ipos = await actions.getActiveIpos(client);
  const cheapIpo = ipos.filter(i => i.price <= Math.min(balance, 300_00) && i.sold < i.total_offered).sort((a, b) => a.price - b.price)[0];
  let boughtPlayerId: string | null = null;

  if (cheapIpo) {
    r(await runTest('trading', 'buyFromIpo', async () => {
      const res = await actions.buyFromIpo(client, userId, cheapIpo.id, 1);
      if (res.success) boughtPlayerId = cheapIpo.player_id;
      return { ok: res.success, detail: `IPO ${cheapIpo.id.slice(0, 8)} @ ${(cheapIpo.price / 100).toFixed(0)} CR`, error: res.error };
    }));
  } else {
    results.push({ area: 'trading', test: 'buyFromIpo', status: 'SKIP', durationMs: 0, detail: 'No affordable IPO' });
  }

  // Sell order
  if (boughtPlayerId) {
    r(await runTest('trading', 'placeSellOrder', async () => {
      const price = cheapIpo ? Math.round(cheapIpo.price * 1.1) : 10000;
      const res = await actions.placeSellOrder(client, userId, boughtPlayerId!, 1, price);
      return { ok: res.success, detail: `Listed @ ${(price / 100).toFixed(0)} CR`, error: res.error };
    }));

    // Cancel it
    const { data: myOrders } = await client.from('orders').select('id').eq('user_id', userId).eq('side', 'sell').in('status', ['open', 'partial']).limit(1);
    if (myOrders && myOrders.length > 0) {
      r(await runTest('trading', 'cancelOrder', async () => {
        const res = await actions.cancelOrder(client, userId, myOrders[0].id);
        return { ok: res.success, error: res.error };
      }));
    }
  }

  // Buy order (Kaufgebot) — KNOWN BUG: place_buy_order RPC missing from DB
  if (testPlayer) {
    r(await runTest('trading', 'placeBuyOrder [KNOWN BUG: RPC missing]', async () => {
      const res = await actions.placeBuyOrder(client, userId, testPlayer.id, 1, 500);
      return { ok: res.success, detail: `Buy order @ 5 CR for ${testPlayer.last_name}`, error: res.error };
    }));
  }

  // ══════════════════════════════════════
  // 5. PORTFOLIO
  // ══════════════════════════════════════
  r(await runTest('portfolio', 'getHoldings', async () => {
    const h = await actions.getHoldings(client, userId);
    return { ok: true, detail: `${h.length} holdings` };
  }));

  // ══════════════════════════════════════
  // 6. WATCHLIST
  // ══════════════════════════════════════
  if (testPlayer) {
    r(await runTest('watchlist', 'addToWatchlist', async () => {
      const res = await actions.addToWatchlist(client, userId, testPlayer.id);
      return { ok: res.success, detail: `Added ${testPlayer.last_name}`, error: res.error };
    }));

    r(await runTest('watchlist', 'getWatchlist', async () => {
      const res = await actions.getWatchlist(client, userId);
      return { ok: res.success, detail: `${res.data.length} watched`, error: res.error };
    }));

    r(await runTest('watchlist', 'removeFromWatchlist', async () => {
      const res = await actions.removeFromWatchlist(client, userId, testPlayer.id);
      return { ok: res.success, error: res.error };
    }));
  }

  // ══════════════════════════════════════
  // 7. COMMUNITY
  // ══════════════════════════════════════
  r(await runTest('community', 'getRecentPosts', async () => {
    const p = await actions.getRecentPosts(client, 20);
    return { ok: true, detail: `${p.length} posts` };
  }));

  r(await runTest('community', 'createPost', async () => {
    const res = await actions.createPost(client, userId, `QA Test Post von Bot #${bot.id} — ${new Date().toISOString()}`, null, null, ['qa-test'], 'Meinung');
    return { ok: res.success, detail: res.postId, error: res.error };
  }));

  // Vote on a post
  const posts = await actions.getRecentPosts(client, 5);
  const otherPost = posts.find(p => p.user_id !== userId);
  if (otherPost) {
    r(await runTest('community', 'votePost', async () => {
      const res = await actions.votePost(client, userId, otherPost.id, 1);
      return { ok: res.success, error: res.error };
    }));
  }

  // ══════════════════════════════════════
  // 8. FANTASY
  // ══════════════════════════════════════
  r(await runTest('fantasy', 'getActiveEvents', async () => {
    const e = await actions.getActiveEvents(client);
    return { ok: true, detail: `${e.length} events` };
  }));

  const events = await actions.getActiveEvents(client);
  const joinableEvent = events.find(e =>
    new Date(e.locks_at) > new Date() && (e.max_entries == null || e.current_entries < e.max_entries)
  );
  if (joinableEvent) {
    r(await runTest('fantasy', 'submitLineup', async () => {
      // Build minimal lineup from available players
      const byPos: Record<string, actions.MarketPlayer[]> = { GK: [], DEF: [], MID: [], ATT: [] };
      for (const p of allPlayers.filter(p => !p.is_liquidated)) {
        if (byPos[p.position]) byPos[p.position].push(p);
      }
      for (const k of Object.keys(byPos)) byPos[k].sort((a, b) => (b.perf_l5 ?? 0) - (a.perf_l5 ?? 0));

      if (byPos.GK.length < 1 || byPos.DEF.length < 4 || byPos.MID.length < 4 || byPos.ATT.length < 2) {
        return { ok: false, error: 'Not enough players per position' };
      }

      const slots: Record<string, string | null> = {
        slot_gk: byPos.GK[0].id, slot_def1: byPos.DEF[0].id, slot_def2: byPos.DEF[1].id,
        slot_def3: byPos.DEF[2].id, slot_def4: byPos.DEF[3].id,
        slot_mid1: byPos.MID[0].id, slot_mid2: byPos.MID[1].id,
        slot_mid3: byPos.MID[2].id, slot_mid4: byPos.MID[3].id,
        slot_att: byPos.ATT[0].id, slot_att2: byPos.ATT[1].id, slot_att3: null,
      };
      const res = await actions.submitLineup(client, userId, joinableEvent.id, slots, 'att', '4-4-2');
      return { ok: res.success, detail: `Event: ${joinableEvent.name}`, error: res.error };
    }));
  }

  r(await runTest('fantasy', 'getUserLineups', async () => {
    const l = await actions.getUserLineups(client, userId);
    return { ok: true, detail: `${l.length} lineups` };
  }));

  // ══════════════════════════════════════
  // 9. TICKETS & MYSTERY BOX
  // ══════════════════════════════════════
  r(await runTest('tickets', 'getUserTickets', async () => {
    const t = await actions.getUserTickets(client);
    return { ok: t != null, detail: t ? `Balance: ${t.balance}, Earned: ${t.earned_total}` : 'null response' };
  }));

  const tickets = await actions.getUserTickets(client);
  if (tickets && tickets.balance >= 15) {
    r(await runTest('tickets', 'openMysteryBox', async () => {
      const res = await actions.openMysteryBox(client);
      return { ok: res.success, detail: res.rarity ? `${res.rarity}: ${res.rewardType}` : 'no rarity', error: res.error };
    }));
  } else {
    results.push({ area: 'tickets', test: 'openMysteryBox', status: 'SKIP', durationMs: 0, detail: `Not enough tickets (${tickets?.balance ?? 0})` });
  }

  // ══════════════════════════════════════
  // 10. MISSIONS
  // ══════════════════════════════════════
  r(await runTest('missions', 'getUserMissions', async () => {
    const m = await actions.getUserMissions(client, userId);
    return { ok: true, detail: `${m.length} missions` };
  }));

  r(await runTest('missions', 'getDailyChallenge', async () => {
    const c = await actions.getDailyChallenge(client);
    return { ok: true, detail: c ? `"${c.question_de?.slice(0, 40)}..."` : 'Keine Challenge heute' };
  }));

  // ══════════════════════════════════════
  // 11. NOTIFICATIONS
  // ══════════════════════════════════════
  r(await runTest('notifications', 'getNotifications', async () => {
    const n = await actions.getNotifications(client, userId);
    return { ok: n.success, detail: `${n.data.length} notifications`, error: n.error };
  }));

  r(await runTest('notifications', 'markNotificationsRead', async () => {
    const res = await actions.markNotificationsRead(client, userId);
    return { ok: res.success, error: res.error };
  }));

  // ══════════════════════════════════════
  // 12. AIRDROP
  // ══════════════════════════════════════
  r(await runTest('airdrop', 'getAirdropScore', async () => {
    const a = await actions.getAirdropScore(client, userId);
    return { ok: true, detail: a ? `Score: ${a.total_score}, Rank: ${a.rank}, Tier: ${a.tier}` : 'No airdrop score yet' };
  }));

  // ══════════════════════════════════════
  // 13. OFFERS (P2P)
  // ══════════════════════════════════════
  r(await runTest('offers', 'getIncomingOffers', async () => {
    const o = await actions.getIncomingOffers(client, userId);
    return { ok: o.success, detail: `${o.data.length} pending offers`, error: o.error };
  }));

  // ── Summary ──
  const summary = {
    pass: results.filter(r => r.status === 'PASS').length,
    fail: results.filter(r => r.status === 'FAIL').length,
    slow: results.filter(r => r.status === 'SLOW').length,
    skip: results.filter(r => r.status === 'SKIP').length,
  };

  return {
    bot: { id: bot.id, name: bot.name, archetype: bot.archetype },
    timestamp: new Date().toISOString(),
    totalDurationMs: Date.now() - start,
    results,
    summary,
  };
}

// ── Report ──

export function generateQAReport(reports: QAReport[]): string {
  const lines: string[] = [];
  lines.push('# BeScout QA Report');
  lines.push(`**Datum:** ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
  lines.push(`**Bots:** ${reports.length}`);
  lines.push('');

  // Aggregate
  const allResults = reports.flatMap(r => r.results);
  const totalPass = allResults.filter(r => r.status === 'PASS').length;
  const totalFail = allResults.filter(r => r.status === 'FAIL').length;
  const totalSlow = allResults.filter(r => r.status === 'SLOW').length;
  const totalSkip = allResults.filter(r => r.status === 'SKIP').length;
  const total = allResults.length;

  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metrik | Wert |`);
  lines.push(`|--------|------|`);
  lines.push(`| Tests gesamt | ${total} |`);
  lines.push(`| PASS | ${totalPass} (${Math.round(totalPass / total * 100)}%) |`);
  lines.push(`| FAIL | ${totalFail} (${Math.round(totalFail / total * 100)}%) |`);
  lines.push(`| SLOW (>3s) | ${totalSlow} |`);
  lines.push(`| SKIP | ${totalSkip} |`);
  lines.push(`| Pass Rate | **${Math.round(totalPass / (total - totalSkip) * 100)}%** |`);
  lines.push('');

  // Failures grouped by test
  const failures = allResults.filter(r => r.status === 'FAIL');
  if (failures.length > 0) {
    const failByTest = new Map<string, { count: number; errors: Set<string> }>();
    for (const f of failures) {
      const key = `${f.area}/${f.test}`;
      if (!failByTest.has(key)) failByTest.set(key, { count: 0, errors: new Set() });
      failByTest.get(key)!.count++;
      if (f.error) failByTest.get(key)!.errors.add(f.error.slice(0, 100));
    }

    lines.push('## FAILURES');
    lines.push('');
    lines.push('| Area | Test | Fails | Error |');
    lines.push('|------|------|-------|-------|');
    for (const [key, data] of Array.from(failByTest.entries()).sort((a, b) => b[1].count - a[1].count)) {
      const [area, test] = key.split('/');
      const err = Array.from(data.errors).join('; ').slice(0, 80);
      lines.push(`| ${area} | ${test} | ${data.count}/${reports.length} | ${err} |`);
    }
    lines.push('');
  }

  // Slow tests
  const slow = allResults.filter(r => r.status === 'SLOW');
  if (slow.length > 0) {
    lines.push('## SLOW TESTS (>3s)');
    lines.push('');
    for (const s of slow) {
      lines.push(`- **${s.area}/${s.test}**: ${(s.durationMs / 1000).toFixed(1)}s`);
    }
    lines.push('');
  }

  // Pass rate by area
  const areas = Array.from(new Set(allResults.map(r => r.area)));
  lines.push('## Pass Rate by Area');
  lines.push('');
  lines.push('| Area | Pass | Fail | Skip | Rate |');
  lines.push('|------|------|------|------|------|');
  for (const area of areas) {
    const areaResults = allResults.filter(r => r.area === area);
    const pass = areaResults.filter(r => r.status === 'PASS').length;
    const fail = areaResults.filter(r => r.status === 'FAIL').length;
    const skip = areaResults.filter(r => r.status === 'SKIP').length;
    const rate = Math.round(pass / Math.max(1, areaResults.length - skip) * 100);
    lines.push(`| ${area} | ${pass} | ${fail} | ${skip} | ${rate}% |`);
  }
  lines.push('');

  // Per-bot summary (one line each)
  lines.push('## Per-Bot Results');
  lines.push('');
  lines.push('| Bot | Archetype | Pass | Fail | Slow | Duration |');
  lines.push('|-----|-----------|------|------|------|----------|');
  for (const r of reports) {
    lines.push(`| ${r.bot.name} | ${r.bot.archetype} | ${r.summary.pass} | ${r.summary.fail} | ${r.summary.slow} | ${(r.totalDurationMs / 1000).toFixed(1)}s |`);
  }

  return lines.join('\n');
}

export function saveQAResults(reports: QAReport[]) {
  const dir = path.join(process.cwd(), 'e2e', 'bots', 'insights');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(dir, `${date}-qa.json`), JSON.stringify(reports, null, 2));
  fs.writeFileSync(path.join(dir, `${date}-qa.md`), generateQAReport(reports));
  console.log(`\nQA Report: e2e/bots/insights/${date}-qa.md`);
}
