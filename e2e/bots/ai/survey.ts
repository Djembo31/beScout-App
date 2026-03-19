/**
 * BeScout Platform Survey — Bots erleben die Plattform und bewerten sie
 *
 * Jeder Bot durchlaeuft den kompletten Workflow und bewertet aus seiner Perspektive.
 * Ergebnis: Strukturiertes Feedback + Note pro Bereich + Gesamtnote
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiBotConfig } from './bot-generator';
import * as actions from './actions';
import * as fs from 'fs';
import * as path from 'path';

// ── Types ──

interface AreaRating {
  area: string;
  score: number; // 1-10
  positives: string[];
  negatives: string[];
  wishes: string[];
}

export interface SurveyResult {
  bot: { id: number; name: string; archetype: string; strategy: string };
  timestamp: string;
  durationMs: number;
  ratings: AreaRating[];
  overallScore: number; // 1-10 weighted
  overallVerdict: string;
  topWishes: string[];
  wouldRecommend: boolean;
  freeText: string; // Archetype-specific summary
  rawData: Record<string, unknown>; // All collected metrics
}

// ── Data Collection ──

interface PlatformSnapshot {
  // Market
  totalPlayers: number;
  playersWithL5: number;
  playersWithFloor: number;
  playersWithIPO: number;
  cheapestIPO: number;
  expensiveIPO: number;
  avgIPOPrice: number;
  openSellOrders: number;
  openBuyOrders: number;
  // Fantasy
  activeEvents: number;
  joinableEvents: number;
  avgParticipants: number;
  // Community
  recentPosts: number;
  postCategories: string[];
  // User State
  balance: number;
  holdings: number;
  holdingsValue: number;
  tickets: number;
  // Data Quality
  playersNoImage: number;
  playersNoAge: number;
  positionDistribution: Record<string, number>;
  clubCount: number;
}

async function collectPlatformData(
  sb: SupabaseClient, userId: string
): Promise<PlatformSnapshot> {
  // Market data
  const players = await actions.getMarketPlayers(sb, 500);
  const ipos = await actions.getActiveIpos(sb);
  const stats = await actions.getMarketStats(sb);

  // Fantasy
  const events = await actions.getActiveEvents(sb);
  const joinable = events.filter(e =>
    new Date(e.locks_at) > new Date() &&
    (e.max_entries == null || e.current_entries < e.max_entries)
  );

  // Community
  const posts = await actions.getRecentPosts(sb, 50);
  const last24h = posts.filter(p => Date.now() - new Date(p.created_at).getTime() < 86400000);

  // User
  const wallet = await actions.getBalance(sb, userId);
  const holdings = await actions.getHoldings(sb, userId);
  const tickets = await actions.getUserTickets(sb);

  // Data quality
  const posDistrib: Record<string, number> = {};
  const clubs = new Set<string>();
  for (const p of players) {
    posDistrib[p.position] = (posDistrib[p.position] ?? 0) + 1;
    clubs.add(p.club);
  }

  const ipoPrices = ipos.map(i => i.price).filter(p => p > 0);

  return {
    totalPlayers: players.length,
    playersWithL5: players.filter(p => p.perf_l5 != null && p.perf_l5 > 0).length,
    playersWithFloor: players.filter(p => p.floor_price != null && p.floor_price > 0).length,
    playersWithIPO: ipos.length,
    cheapestIPO: ipoPrices.length > 0 ? Math.min(...ipoPrices) : 0,
    expensiveIPO: ipoPrices.length > 0 ? Math.max(...ipoPrices) : 0,
    avgIPOPrice: ipoPrices.length > 0 ? Math.round(ipoPrices.reduce((a, b) => a + b, 0) / ipoPrices.length) : 0,
    openSellOrders: stats.openSellOrders,
    openBuyOrders: stats.openBuyOrders,
    activeEvents: events.length,
    joinableEvents: joinable.length,
    avgParticipants: events.length > 0 ? Math.round(events.reduce((s, e) => s + e.current_entries, 0) / events.length) : 0,
    recentPosts: last24h.length,
    postCategories: Array.from(new Set(posts.map(p => p.category))),
    balance: wallet.balance,
    holdings: holdings.length,
    holdingsValue: holdings.reduce((s, h) => s + h.quantity * (h.player.floor_price ?? h.avg_buy_price), 0),
    tickets: tickets?.balance ?? 0,
    playersNoImage: 0, // Would need image_url column
    playersNoAge: 0,
    positionDistribution: posDistrib,
    clubCount: clubs.size,
  };
}

// ── Rating Engine ──

function rateMarket(data: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const positives: string[] = [];
  const negatives: string[] = [];
  const wishes: string[] = [];
  let score = 5; // baseline

  // Player variety
  if (data.totalPlayers > 400) { score += 1; positives.push(`Grosse Spieler-Auswahl (${data.totalPlayers})`); }
  else if (data.totalPlayers < 100) { score -= 2; negatives.push('Zu wenig Spieler auf der Plattform'); }

  // IPO availability
  if (data.playersWithIPO > 200) { score += 1; positives.push('Viele IPOs verfuegbar'); }
  else if (data.playersWithIPO < 50) { score -= 1; negatives.push('Zu wenig IPOs — schwer einzusteigen'); wishes.push('Mehr regelmaessige IPOs fuer neue Spieler'); }

  // Liquidity
  if (data.openSellOrders > 30) { score += 1; positives.push(`${data.openSellOrders} Sell Orders — gute Liquiditaet`); }
  else if (data.openSellOrders < 10) { score -= 1; negatives.push('Kaum Sell Orders — Markt ist illiquide'); wishes.push('Market Maker oder Anreize fuer Sell Orders'); }

  if (data.openBuyOrders === 0) { negatives.push('Keine Buy Orders — einseitiger Markt'); wishes.push('Buy-Order-Funktion prominenter machen'); }

  // Price range
  if (data.cheapestIPO > 0 && data.cheapestIPO <= 5000) { positives.push('Einstieg ab ' + (data.cheapestIPO / 100).toFixed(0) + ' CR moeglich'); }
  else if (data.cheapestIPO > 20000) { negatives.push('Guenstigster Spieler kostet ' + (data.cheapestIPO / 100).toFixed(0) + ' CR — hohe Einstiegshuerde'); }

  // L5 Data
  const l5Pct = data.totalPlayers > 0 ? data.playersWithL5 / data.totalPlayers : 0;
  if (l5Pct > 0.7) { positives.push('Gute Datenlage — ' + Math.round(l5Pct * 100) + '% mit L5 Score'); }
  else if (l5Pct < 0.4) { score -= 1; negatives.push('Viele Spieler ohne L5 Score — schwer zu bewerten'); wishes.push('Performance-Daten fuer alle Spieler'); }

  // Archetype-specific
  if (bot.archetype === 'trader_aggressive' || bot.archetype === 'sniper') {
    if (data.openSellOrders < 20) { score -= 1; wishes.push('Preis-Alerts wenn Spieler unter Wunschpreis faellt'); }
    wishes.push('24h-Preisaenderung als Sortierkriterium');
  }
  if (bot.archetype === 'collector') {
    if (data.clubCount > 10) positives.push(`${data.clubCount} verschiedene Clubs — gute Vielfalt`);
    wishes.push('Sammel-Album mit Fortschrittsanzeige');
  }

  return { area: 'Marktplatz', score: Math.max(1, Math.min(10, score)), positives, negatives, wishes };
}

function rateFantasy(data: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const positives: string[] = [];
  const negatives: string[] = [];
  const wishes: string[] = [];
  let score = 5;

  if (data.activeEvents > 5) { score += 2; positives.push(`${data.activeEvents} aktive Events — gute Auswahl`); }
  else if (data.activeEvents === 0) { score -= 3; negatives.push('Keine aktiven Events — Fantasy ist tot'); }
  else { positives.push(`${data.activeEvents} Events verfuegbar`); }

  if (data.avgParticipants > 10) { score += 1; positives.push('Events sind gut besucht'); }
  else if (data.avgParticipants < 3) { negatives.push('Kaum Teilnehmer in Events — fuehlst sich einsam an'); wishes.push('Automatische Events die immer laufen'); }

  if (data.joinableEvents === 0 && data.activeEvents > 0) {
    negatives.push('Events sind voll oder gesperrt');
    wishes.push('Mehr Event-Plaetze oder neue Events');
  }

  // Archetype-specific
  if (bot.archetype === 'manager') {
    wishes.push('Auto-Fill Lineup basierend auf L5 Score');
    wishes.push('Lineup-Vorschlaege fuer verschiedene Formationen');
    if (data.activeEvents > 0) positives.push('Fantasy ist das Herzstuck — macht Spass');
  }

  return { area: 'Fantasy/Spieltag', score: Math.max(1, Math.min(10, score)), positives, negatives, wishes };
}

function rateCommunity(data: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const positives: string[] = [];
  const negatives: string[] = [];
  const wishes: string[] = [];
  let score = 5;

  if (data.recentPosts > 20) { score += 2; positives.push('Aktive Community mit vielen Posts'); }
  else if (data.recentPosts > 5) { score += 1; positives.push('Community ist lebendig'); }
  else if (data.recentPosts === 0) { score -= 2; negatives.push('Community ist komplett still — keine Posts in 24h'); }
  else { negatives.push('Wenig Aktivitaet in der Community'); }

  if (data.postCategories.length > 2) { positives.push('Verschiedene Post-Kategorien vorhanden'); }
  else { wishes.push('Mehr Content-Typen (Videos, Predictions, Polls)'); }

  // Archetype-specific
  if (bot.archetype === 'analyst') {
    wishes.push('Research-Template fuer strukturierte Spieler-Analysen');
    wishes.push('Daten-Widgets einbetten in Posts (Charts, Statistiken)');
  }
  if (bot.archetype === 'fan') {
    wishes.push('Club-spezifischer Feed');
    wishes.push('Match-Day Live-Thread');
  }
  if (bot.archetype === 'lurker') {
    wishes.push('Trending Topics / Highlights auf der Startseite');
    if (data.recentPosts < 5) negatives.push('Als stiller Beobachter gibt es nichts zu lesen');
  }

  return { area: 'Community', score: Math.max(1, Math.min(10, score)), positives, negatives, wishes };
}

function ratePortfolio(data: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const positives: string[] = [];
  const negatives: string[] = [];
  const wishes: string[] = [];
  let score = 6; // decent baseline

  if (data.holdings > 0) {
    positives.push(`${data.holdings} Spieler im Portfolio`);
    positives.push(`Portfolio-Wert: ${(data.holdingsValue / 100).toLocaleString('de')} CR`);
    score += 1;
  } else {
    negatives.push('Portfolio ist leer — kein Engagement-Grund sichtbar');
    score -= 1;
  }

  if (data.balance > 1000_00) { positives.push('Genug Balance zum Handeln'); }
  else { negatives.push('Zu wenig Balance fuer aktives Trading'); wishes.push('Mehr Moeglichkeiten Credits zu verdienen'); }

  wishes.push('P&L Uebersicht mit Gewinn/Verlust pro Spieler');
  wishes.push('Portfolio-Performance Chart ueber Zeit');

  if (bot.archetype === 'collector') {
    wishes.push('Sammel-Fortschritt: X/Y Spieler pro Club');
    wishes.push('Achievements fuer Portfolio-Meilensteine');
  }

  return { area: 'Portfolio/Kader', score: Math.max(1, Math.min(10, score)), positives, negatives, wishes };
}

function rateGamification(data: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const positives: string[] = [];
  const negatives: string[] = [];
  const wishes: string[] = [];
  let score = 5;

  if (data.tickets > 0) { positives.push(`${data.tickets} Tickets vorhanden`); score += 1; }
  else { negatives.push('Keine Tickets — Gamification nicht spuerbar'); score -= 1; }

  positives.push('Mystery Box System vorhanden');
  positives.push('Missions-System vorhanden');

  wishes.push('Taegliche Login-Belohnung sichtbarer machen');
  wishes.push('Streak-Bonus fuer aufeinanderfolgende Tage');
  wishes.push('Rangliste / Leaderboard auf der Startseite');

  if (bot.archetype === 'collector') { wishes.push('Sammel-Achievements mit Cosmetic-Rewards'); }
  if (bot.archetype === 'manager') { wishes.push('Fantasy-Leaderboard mit Saison-Ranking'); }
  if (bot.archetype === 'lurker') { wishes.push('Tutorial-Missionen fuer Einsteiger'); }

  return { area: 'Gamification', score: Math.max(1, Math.min(10, score)), positives, negatives, wishes };
}

function rateOnboarding(data: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const positives: string[] = [];
  const negatives: string[] = [];
  const wishes: string[] = [];
  let score = 5;

  if (data.playersWithIPO > 100) { positives.push('Viele kaufbare Spieler — Einstieg moeglich'); score += 1; }
  else { negatives.push('Wenig kaufbare Spieler — frustrierend fuer Neue'); }

  if (data.activeEvents > 0) { positives.push('Events sofort sichtbar'); }
  else { negatives.push('Keine Events — was soll ich hier tun?'); score -= 1; }

  wishes.push('Interaktives Tutorial: Ersten Spieler kaufen, erste Aufstellung');
  wishes.push('Empfohlene Spieler fuer Einsteiger (guenstig + gut)');
  wishes.push('Glossar direkt beim Onboarding erklaeren');

  if (bot.archetype === 'lurker') {
    score -= 1;
    negatives.push('Als Neuling weiss ich nicht wo ich anfangen soll');
    wishes.push('Schritt-fuer-Schritt Anleitung nach dem Login');
  }

  return { area: 'Onboarding/UX', score: Math.max(1, Math.min(10, score)), positives, negatives, wishes };
}

function rateOverallConcept(data: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const positives: string[] = [];
  const negatives: string[] = [];
  const wishes: string[] = [];
  let score = 6;

  positives.push('Einzigartiges Konzept: Fantasy + Trading + Community');
  positives.push('Scout Cards als digitale Spielerkarten — innovativ');

  if (data.totalPlayers > 300 && data.clubCount > 10) {
    positives.push('Breite Liga-Abdeckung');
    score += 1;
  }

  if (data.openSellOrders > 20 && data.activeEvents > 5 && data.recentPosts > 5) {
    positives.push('Alle drei Saeulen (Trading, Fantasy, Community) sind aktiv');
    score += 2;
  } else {
    const inactive: string[] = [];
    if (data.openSellOrders < 10) inactive.push('Trading');
    if (data.activeEvents < 3) inactive.push('Fantasy');
    if (data.recentPosts < 3) inactive.push('Community');
    if (inactive.length > 0) {
      negatives.push(`${inactive.join(' + ')} braucht mehr Aktivitaet`);
      score -= 1;
    }
  }

  wishes.push('Push-Benachrichtigungen fuer wichtige Events');
  wishes.push('Freunde einladen + Referral-Bonus');

  return { area: 'Gesamtkonzept', score: Math.max(1, Math.min(10, score)), positives, negatives, wishes };
}

// ── Verdict Generator ──

function generateVerdict(bot: AiBotConfig, overallScore: number, ratings: AreaRating[]): string {
  const bestArea = ratings.sort((a, b) => b.score - a.score)[0];
  const worstArea = ratings.sort((a, b) => a.score - b.score)[0];

  const intros: Record<string, string> = {
    trader_aggressive: 'Als aktiver Trader',
    trader_conservative: 'Als langfristiger Investor',
    manager: 'Als Fantasy-Manager',
    analyst: 'Als Daten-Analyst',
    collector: 'Als Sammler',
    sniper: 'Als Schnaeppchjaeger',
    fan: 'Als Fan',
    lurker: 'Als neuer User',
  };
  const intro = intros[bot.archetype] ?? 'Als User';

  if (overallScore >= 8) {
    return `${intro} bin ich beeindruckt. ${bestArea.area} ist besonders stark (${bestArea.score}/10). Die Plattform hat echtes Potenzial als Fan-Engagement-Tool. Ich wuerde sie weiterempfehlen.`;
  } else if (overallScore >= 6) {
    return `${intro} sehe ich viel Potenzial. ${bestArea.area} funktioniert gut (${bestArea.score}/10), aber ${worstArea.area} braucht Arbeit (${worstArea.score}/10). Mit ein paar Verbesserungen koennte das richtig gut werden.`;
  } else if (overallScore >= 4) {
    return `${intro} bin ich noch nicht ueberzeugt. ${worstArea.area} ist schwach (${worstArea.score}/10). Es fehlt an ${worstArea.negatives[0] ?? 'Grundfunktionalitaet'}. Das Konzept ist interessant, aber die Umsetzung muss besser werden.`;
  } else {
    return `${intro} kann ich die Plattform noch nicht empfehlen. ${worstArea.area} (${worstArea.score}/10) und ${ratings.sort((a, b) => a.score - b.score)[1]?.area ?? ''} brauchen dringend Verbesserung. Das Grundkonzept ist gut, aber es fehlt an allem.`;
  }
}

// ── Main Survey ──

export async function runSurvey(bot: AiBotConfig, client: SupabaseClient, userId: string): Promise<SurveyResult> {
  const start = Date.now();

  // Collect all platform data
  const data = await collectPlatformData(client, userId);

  // Rate each area
  const ratings = [
    rateMarket(data, bot),
    rateFantasy(data, bot),
    rateCommunity(data, bot),
    ratePortfolio(data, bot),
    rateGamification(data, bot),
    rateOnboarding(data, bot),
    rateOverallConcept(data, bot),
  ];

  // Weighted overall score
  const weights: Record<string, number> = {
    'Marktplatz': 0.25,
    'Fantasy/Spieltag': 0.20,
    'Community': 0.15,
    'Portfolio/Kader': 0.10,
    'Gamification': 0.10,
    'Onboarding/UX': 0.10,
    'Gesamtkonzept': 0.10,
  };
  const overallScore = Math.round(
    ratings.reduce((s, r) => s + r.score * (weights[r.area] ?? 0.1), 0) * 10
  ) / 10;

  const verdict = generateVerdict(bot, overallScore, [...ratings]);
  const allWishes = ratings.flatMap(r => r.wishes);
  // Deduplicate and take top 5
  const topWishes = Array.from(new Set(allWishes)).slice(0, 5);

  return {
    bot: { id: bot.id, name: bot.name, archetype: bot.archetype, strategy: bot.strategy },
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
    ratings,
    overallScore,
    overallVerdict: verdict,
    topWishes,
    wouldRecommend: overallScore >= 6,
    freeText: verdict,
    rawData: data as unknown as Record<string, unknown>,
  };
}

// ── Report Generation ──

export function generateSurveyReport(results: SurveyResult[]): string {
  const lines: string[] = [];
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  lines.push('# BeScout Platform Survey Report');
  lines.push(`**Datum:** ${now}`);
  lines.push(`**Teilnehmer:** ${results.length} Bot-Personas`);
  lines.push('');

  // NPS-style
  const recommend = results.filter(r => r.wouldRecommend).length;
  const nps = Math.round((recommend / results.length) * 100);
  const avgScore = (results.reduce((s, r) => s + r.overallScore, 0) / results.length).toFixed(1);

  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`| Metrik | Wert |`);
  lines.push(`|--------|------|`);
  lines.push(`| Durchschnittsnote | **${avgScore}/10** |`);
  lines.push(`| Weiterempfehlung | **${nps}%** (${recommend}/${results.length}) |`);
  lines.push(`| Beste Bewertung | ${results.sort((a, b) => b.overallScore - a.overallScore)[0]?.overallScore}/10 (${results.sort((a, b) => b.overallScore - a.overallScore)[0]?.bot.name}, ${results.sort((a, b) => b.overallScore - a.overallScore)[0]?.bot.archetype}) |`);
  lines.push(`| Schlechteste Bewertung | ${results.sort((a, b) => a.overallScore - b.overallScore)[0]?.overallScore}/10 (${results.sort((a, b) => a.overallScore - b.overallScore)[0]?.bot.name}, ${results.sort((a, b) => a.overallScore - b.overallScore)[0]?.bot.archetype}) |`);
  lines.push('');

  // Score by area (averaged across all bots)
  const areas = results[0]?.ratings.map(r => r.area) ?? [];
  lines.push('## Bewertung nach Bereichen');
  lines.push('');
  lines.push('| Bereich | Note | Trend |');
  lines.push('|---------|------|-------|');
  for (const area of areas) {
    const scores = results.map(r => r.ratings.find(rt => rt.area === area)?.score ?? 0);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const emoji = Number(avg) >= 7 ? '++' : Number(avg) >= 5 ? '+' : Number(avg) >= 3 ? '-' : '--';
    lines.push(`| ${area} | **${avg}/10** | ${emoji} |`);
  }
  lines.push('');

  // Score by archetype
  lines.push('## Bewertung nach Nutzertyp');
  lines.push('');
  lines.push('| Archetyp | Anz. | Note | Empfehlung |');
  lines.push('|----------|------|------|------------|');
  const archetypes = Array.from(new Set(results.map(r => r.bot.archetype)));
  for (const arch of archetypes) {
    const archResults = results.filter(r => r.bot.archetype === arch);
    const avg = (archResults.reduce((s, r) => s + r.overallScore, 0) / archResults.length).toFixed(1);
    const rec = archResults.filter(r => r.wouldRecommend).length;
    lines.push(`| ${arch} | ${archResults.length} | ${avg}/10 | ${rec}/${archResults.length} |`);
  }
  lines.push('');

  // Top Wishes (deduplicated, ranked by frequency)
  const wishFreq = new Map<string, { count: number; archetypes: Set<string> }>();
  for (const r of results) {
    for (const w of r.topWishes) {
      if (!wishFreq.has(w)) wishFreq.set(w, { count: 0, archetypes: new Set() });
      const entry = wishFreq.get(w)!;
      entry.count++;
      entry.archetypes.add(r.bot.archetype);
    }
  }
  lines.push('## Top Feature Wishes (nach Haeufigkeit)');
  lines.push('');
  lines.push('| # | Wish | Archetypes | Votes |');
  lines.push('|---|------|-----------|-------|');
  const sortedWishes = Array.from(wishFreq.entries()).sort((a, b) => b[1].count - a[1].count);
  sortedWishes.slice(0, 15).forEach(([wish, data], i) => {
    lines.push(`| ${i + 1} | ${wish} | ${Array.from(data.archetypes).join(', ')} | ${data.count} |`);
  });
  lines.push('');

  // Positives (most mentioned)
  const posFreq = new Map<string, number>();
  for (const r of results) {
    for (const rating of r.ratings) {
      for (const p of rating.positives) {
        posFreq.set(p, (posFreq.get(p) ?? 0) + 1);
      }
    }
  }
  lines.push('## Was gefaellt (Top Positives)');
  lines.push('');
  Array.from(posFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([p, c]) => {
    lines.push(`- ${p} *(${c}x genannt)*`);
  });
  lines.push('');

  // Negatives (most mentioned)
  const negFreq = new Map<string, number>();
  for (const r of results) {
    for (const rating of r.ratings) {
      for (const n of rating.negatives) {
        negFreq.set(n, (negFreq.get(n) ?? 0) + 1);
      }
    }
  }
  lines.push('## Was stoert (Top Negatives)');
  lines.push('');
  Array.from(negFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([n, c]) => {
    lines.push(`- ${n} *(${c}x genannt)*`);
  });
  lines.push('');

  // Individual verdicts (sample)
  lines.push('## Stimmen der Nutzer');
  lines.push('');
  for (const r of results.slice(0, 15)) {
    lines.push(`> **${r.bot.name}** (${r.bot.archetype}, ${r.overallScore}/10): "${r.overallVerdict}"`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Save ──

export function saveSurveyResults(results: SurveyResult[]) {
  const dir = path.join(process.cwd(), 'e2e', 'bots', 'insights');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);

  // JSON (full data)
  fs.writeFileSync(path.join(dir, `${date}-survey.json`), JSON.stringify(results, null, 2));

  // Markdown report
  const md = generateSurveyReport(results);
  fs.writeFileSync(path.join(dir, `${date}-survey.md`), md);

  console.log(`\nSurvey saved:`);
  console.log(`  JSON: e2e/bots/insights/${date}-survey.json`);
  console.log(`  MD:   e2e/bots/insights/${date}-survey.md`);
}
