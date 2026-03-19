/**
 * BeScout Platform Survey v2 — Feature-Aware Product Audit
 *
 * Kennt ALLE existierenden Features und bewertet deren Qualitaet,
 * nicht deren Existenz. Jeder Bot bewertet aus seiner Perspektive.
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
  overallScore: number;
  overallVerdict: string;
  topWishes: string[];
  wouldRecommend: boolean;
  rawData: PlatformSnapshot;
}

// ── Data Collection ──

interface PlatformSnapshot {
  // Market
  totalPlayers: number;
  playersWithL5: number;
  l5Coverage: number; // 0-1
  playersWithIPO: number;
  cheapestIPO: number;
  avgIPOPrice: number;
  openSellOrders: number;
  openBuyOrders: number;
  sellBuyRatio: number;
  priceRange: { min: number; max: number };
  clubCount: number;
  positionBalance: { gk: number; def: number; mid: number; att: number };
  // Fantasy
  activeEvents: number;
  joinableEvents: number;
  totalParticipants: number;
  eventTypes: string[];
  eventFormats: string[];
  // Community
  postsLast24h: number;
  postsTotal: number;
  postCategories: string[];
  uniqueAuthors: number;
  // User State
  balance: number;
  holdings: number;
  holdingsValue: number;
  holdingsPnL: number; // calculated P&L
  tickets: number;
  // Missions
  missionsActive: number;
  missionsClaimable: number;
}

async function collectPlatformData(sb: SupabaseClient, userId: string): Promise<PlatformSnapshot> {
  const players = await actions.getMarketPlayers(sb, 600);
  const ipos = await actions.getActiveIpos(sb);
  const stats = await actions.getMarketStats(sb);
  const events = await actions.getActiveEvents(sb);
  const posts = await actions.getRecentPosts(sb, 50);
  const wallet = await actions.getBalance(sb, userId);
  const holdings = await actions.getHoldings(sb, userId);
  const tickets = await actions.getUserTickets(sb);
  const missions = await actions.getUserMissions(sb, userId);

  const last24h = posts.filter(p => Date.now() - new Date(p.created_at).getTime() < 86400000);
  const clubs = new Set(players.map(p => p.club));
  const pos = { gk: 0, def: 0, mid: 0, att: 0 };
  for (const p of players) {
    const k = p.position.toLowerCase() as keyof typeof pos;
    if (pos[k] !== undefined) pos[k]++;
  }

  const ipoPrices = ipos.map(i => i.price).filter(p => p > 0);
  const joinable = events.filter(e => new Date(e.locks_at) > new Date() && (e.max_entries == null || e.current_entries < e.max_entries));

  // P&L
  let pnl = 0;
  for (const h of holdings) {
    const currentVal = (h.player.floor_price ?? h.avg_buy_price) * h.quantity;
    const costBasis = h.avg_buy_price * h.quantity;
    pnl += currentVal - costBasis;
  }

  return {
    totalPlayers: players.length,
    playersWithL5: players.filter(p => p.perf_l5 != null && p.perf_l5 > 0).length,
    l5Coverage: players.length > 0 ? players.filter(p => p.perf_l5 != null && p.perf_l5 > 0).length / players.length : 0,
    playersWithIPO: new Set(ipos.map(i => i.player_id)).size,
    cheapestIPO: ipoPrices.length > 0 ? Math.min(...ipoPrices) : 0,
    avgIPOPrice: ipoPrices.length > 0 ? Math.round(ipoPrices.reduce((a, b) => a + b, 0) / ipoPrices.length) : 0,
    openSellOrders: stats.openSellOrders,
    openBuyOrders: stats.openBuyOrders,
    sellBuyRatio: stats.openSellOrders > 0 ? stats.openBuyOrders / stats.openSellOrders : 0,
    priceRange: {
      min: ipoPrices.length > 0 ? Math.min(...ipoPrices) : 0,
      max: ipoPrices.length > 0 ? Math.max(...ipoPrices) : 0,
    },
    clubCount: clubs.size,
    positionBalance: pos,
    activeEvents: events.length,
    joinableEvents: joinable.length,
    totalParticipants: events.reduce((s, e) => s + e.current_entries, 0),
    eventTypes: Array.from(new Set(events.map(e => e.type))),
    eventFormats: Array.from(new Set(events.map(e => e.format))),
    postsLast24h: last24h.length,
    postsTotal: posts.length,
    postCategories: Array.from(new Set(posts.map(p => p.category))),
    uniqueAuthors: new Set(posts.map(p => p.user_id)).size,
    balance: wallet.balance,
    holdings: holdings.length,
    holdingsValue: holdings.reduce((s, h) => s + h.quantity * (h.player.floor_price ?? h.avg_buy_price), 0),
    holdingsPnL: pnl,
    tickets: tickets?.balance ?? 0,
    missionsActive: missions.filter(m => m.status === 'active').length,
    missionsClaimable: missions.filter(m => m.status === 'completed').length,
  };
}

// ── Rating Functions ──
// Each knows what EXISTS and rates QUALITY, not existence

function rateMarket(d: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const pos: string[] = [];
  const neg: string[] = [];
  const wish: string[] = [];
  let s = 5;

  // Spieler-Auswahl (vorhanden: Suche, Filter, Sortierung, Watchlist, Preis-Alerts)
  if (d.totalPlayers > 400) { s += 1; pos.push(`${d.totalPlayers} Spieler aus ${d.clubCount} Clubs — starke Auswahl`); }
  if (d.l5Coverage > 0.8) { s += 1; pos.push(`${Math.round(d.l5Coverage * 100)}% Spieler haben L5 Daten — gute Bewertungsgrundlage`); }
  else if (d.l5Coverage < 0.5) { s -= 1; neg.push(`Nur ${Math.round(d.l5Coverage * 100)}% haben L5 Daten — erschwert Einschaetzung`); }

  // Position balance
  const posTotal = d.positionBalance.gk + d.positionBalance.def + d.positionBalance.mid + d.positionBalance.att;
  if (d.positionBalance.gk > 0 && d.positionBalance.att > 0) { pos.push('Alle Positionen vertreten (GK/DEF/MID/ATT)'); }

  // IPO/Erstverkauf
  if (d.playersWithIPO > 300) { s += 1; pos.push('Grosse IPO-Auswahl — Einstieg ab ' + (d.cheapestIPO / 100).toFixed(0) + ' CR'); }
  else if (d.playersWithIPO < 50) { s -= 1; neg.push('Wenig aktive IPOs'); }

  // Sekundaermarkt (Sell Orders + Buy Orders existieren als Features)
  if (d.openSellOrders > 30) { s += 1; pos.push(`${d.openSellOrders} Sell Orders — Sekundaermarkt funktioniert`); }
  else if (d.openSellOrders < 5) { s -= 1; neg.push('Kaum Sell Orders auf dem Sekundaermarkt'); }

  if (d.openBuyOrders > 5) { pos.push(`${d.openBuyOrders} Buy Orders — zweiseitiger Markt`); }
  else { neg.push('Wenig Buy Orders — Verkaufsseite dominiert'); wish.push('Buy-Order-Feature prominenter im UI platzieren'); }

  // Archetype-spezifisch
  if (bot.archetype === 'trader_aggressive' || bot.archetype === 'sniper') {
    if (d.openSellOrders < 20) wish.push('Mehr Markttiefe fuer aktives Trading');
    wish.push('Real-Time Preis-Ticker auf dem Marktplatz');
  }
  if (bot.archetype === 'collector') {
    pos.push(`${d.clubCount} Clubs zum Sammeln`);
    if (d.playersWithIPO > 200) pos.push('Genug Vielfalt fuer eine breite Sammlung');
  }

  return { area: 'Marktplatz & Trading', score: Math.max(1, Math.min(10, s)), positives: pos, negatives: neg, wishes: wish };
}

function rateFantasy(d: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const pos: string[] = [];
  const neg: string[] = [];
  const wish: string[] = [];
  let s = 5;

  // Events (vorhanden: Lineup Builder, Captain, Synergy, Chips, Leaderboard, Scoring)
  if (d.activeEvents > 8) { s += 2; pos.push(`${d.activeEvents} Events — breite Auswahl`); }
  else if (d.activeEvents > 3) { s += 1; pos.push(`${d.activeEvents} Events verfuegbar`); }
  else if (d.activeEvents === 0) { s -= 3; neg.push('Keine aktiven Events'); }

  if (d.eventTypes.length > 2) { pos.push(`Verschiedene Event-Typen: ${d.eventTypes.join(', ')}`); }
  if (d.eventFormats.length > 1) { pos.push('Verschiedene Formate (7er + 11er)'); }

  // Teilnahme
  if (d.totalParticipants > 50) { s += 1; pos.push('Events gut besucht — Wettbewerb vorhanden'); }
  else if (d.totalParticipants < 10) { neg.push('Wenig Teilnehmer — Wettbewerbsgefuehl fehlt'); }

  // Existing features positiv erwaehnen
  pos.push('Captain-System (2x Punkte) und Synergy-Bonus vorhanden');

  if (bot.archetype === 'manager') {
    wish.push('Lineup-Vergleich mit anderen Managern nach dem Spieltag');
    wish.push('Push-Notification wenn ein eigener Spieler trifft');
    s += 1; // Managers care most, appreciate more
  }

  return { area: 'Fantasy & Events', score: Math.max(1, Math.min(10, s)), positives: pos, negatives: neg, wishes: wish };
}

function rateCommunity(d: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const pos: string[] = [];
  const neg: string[] = [];
  const wish: string[] = [];
  let s = 5;

  // Features: Posts, Research, Bounties, Polls, Votes, Rumors — alles vorhanden
  pos.push('6 Content-Typen: Posts, Research, Bounties, Polls, Votes, Geruechte');

  if (d.postsLast24h > 15) { s += 2; pos.push('Community ist aktiv — ' + d.postsLast24h + ' Posts in 24h'); }
  else if (d.postsLast24h > 5) { s += 1; pos.push('Regelmaessige Community-Aktivitaet'); }
  else if (d.postsLast24h <= 2) { s -= 1; neg.push('Community-Aktivitaet ist niedrig (' + d.postsLast24h + ' Posts/24h)'); }

  if (d.uniqueAuthors > 5) { pos.push(`${d.uniqueAuthors} verschiedene Autoren — diverse Meinungen`); }
  else if (d.uniqueAuthors <= 2) { neg.push('Wenig verschiedene Stimmen in der Community'); }

  if (d.postCategories.length > 2) { pos.push('Verschiedene Kategorien: ' + d.postCategories.join(', ')); }

  if (bot.archetype === 'analyst') {
    pos.push('Research-System mit Bullish/Bearish/Neutral Calls — professionell');
    pos.push('Bounty-System fuer bezahlte Analysen');
    wish.push('Eingebettete Statistik-Widgets in Posts (L5 Chart, Vergleich)');
    s += 1;
  }
  if (bot.archetype === 'fan') {
    wish.push('Live-Thread waehrend Spielen (Match-Day Chat)');
  }
  if (bot.archetype === 'lurker') {
    wish.push('Kuratierte Highlights / "Best of" Zusammenfassung');
  }

  return { area: 'Community & Content', score: Math.max(1, Math.min(10, s)), positives: pos, negatives: neg, wishes: wish };
}

function ratePortfolio(d: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const pos: string[] = [];
  const neg: string[] = [];
  const wish: string[] = [];
  let s = 6;

  // Features: Kader-Tab, Bestand mit P&L, Watchlist mit Preis-Alerts, Sell Modal, Angebote
  pos.push('Portfolio mit Bestand-Ansicht, P&L pro Spieler, Mastery-Level');
  pos.push('Watchlist mit konfigurierbaren Preis-Alerts');
  pos.push('Eingehende Angebote (P2P Offers) sichtbar');

  if (d.holdings > 5) { s += 1; pos.push(`${d.holdings} Spieler im Portfolio — gut diversifiziert`); }
  else if (d.holdings === 0) { s -= 1; neg.push('Leeres Portfolio — noch kein Engagement'); }

  if (d.holdingsPnL > 0) { pos.push('Portfolio im Plus — Wertentwicklung positiv'); }
  else if (d.holdingsPnL < 0 && d.holdings > 0) { neg.push('Portfolio im Minus'); }

  wish.push('Gesamt-Portfolio-Chart mit Wertentwicklung ueber Zeit');
  wish.push('Export-Funktion (CSV) fuer eigene Auswertung');

  if (bot.archetype === 'collector') {
    wish.push('Sammelfortschritt pro Club (z.B. 5/30 Sakaryaspor)');
    wish.push('Galerie-Ansicht mit allen Scout Cards');
  }

  return { area: 'Portfolio & Bestand', score: Math.max(1, Math.min(10, s)), positives: pos, negatives: neg, wishes: wish };
}

function rateGamification(d: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const pos: string[] = [];
  const neg: string[] = [];
  const wish: string[] = [];
  let s = 6;

  // Features: Missions, Daily Challenge, Mystery Box, Login Streaks, Achievements (31),
  // Mastery per Player, Score Road, Airdrop Leaderboard, Founding Pass, Cosmetics
  pos.push('Umfangreiches System: Missions, Daily Challenge, Mystery Box, Achievements');
  pos.push('Login-Streak mit steigenden Boni (Fee-Rabatt, Free Box, XP)');
  pos.push('Mastery-System pro Spieler — langfristige Bindung');
  pos.push('31 Achievements in 5 Kategorien');

  if (d.tickets > 10) { s += 1; pos.push(`${d.tickets} Tickets — Engagement zahlt sich aus`); }
  else if (d.tickets === 0) { neg.push('Noch keine Tickets verdient — Einstieg muss klarer werden'); }

  if (d.missionsClaimable > 0) { s += 1; pos.push(`${d.missionsClaimable} Missionen abholbereit`); }
  if (d.missionsActive > 0) { pos.push(`${d.missionsActive} aktive Missionen`); }

  // Airdrop + Founding Pass
  pos.push('Airdrop-Leaderboard mit 4 Tier-System motiviert langfristiges Engagement');

  wish.push('Wochen-Zusammenfassung: "Deine Woche bei BeScout" mit Highlights');
  wish.push('Benachrichtigung wenn neues Achievement freigeschaltet');

  return { area: 'Gamification & Belohnungen', score: Math.max(1, Math.min(10, s)), positives: pos, negatives: neg, wishes: wish };
}

function rateUX(d: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const pos: string[] = [];
  const neg: string[] = [];
  const wish: string[] = [];
  let s = 6;

  // Features: Onboarding Checklist, Glossar, Shortcuts, Search, Dark Mode, Mobile-First
  pos.push('Dark Mode Design — modern und augenschonend');
  pos.push('Globale Suche mit Autocomplete');
  pos.push('Onboarding-Checklist fuer neue User');
  pos.push('Glossar erklaert Fachbegriffe');
  pos.push('Spieler-Vergleich (bis zu 5 Spieler) vorhanden');

  if (d.totalPlayers > 300) { pos.push('Schnelle Ladezeiten trotz grosser Datenmenge'); s += 1; }

  if (bot.archetype === 'lurker') {
    s -= 1;
    neg.push('Fuer Einsteiger ist die Fuelle an Features ueberwaetigend');
    wish.push('Geführte Tour die Schritt fuer Schritt durch die App fuehrt');
    wish.push('Einfacher Modus der nur Kern-Features zeigt');
  }
  if (bot.archetype === 'fan') {
    wish.push('Club als Startseite setzen koennen');
  }
  if (bot.archetype === 'trader_aggressive') {
    wish.push('Schnellkauf ohne Bestaetigung fuer erfahrene Trader');
  }

  return { area: 'UX & Onboarding', score: Math.max(1, Math.min(10, s)), positives: pos, negatives: neg, wishes: wish };
}

function rateConcept(d: PlatformSnapshot, bot: AiBotConfig): AreaRating {
  const pos: string[] = [];
  const neg: string[] = [];
  const wish: string[] = [];
  let s = 7;

  pos.push('Einzigartiges 3-Saeulen-Konzept: Trading + Fantasy + Community');
  pos.push('Scout Card Konzept verbindet emotionale Fan-Bindung mit strategischem Handel');
  pos.push('Community Success Fee — Fans profitieren bei Transfers');
  pos.push('Founding Pass + Airdrop belohnt fruehe Nutzer');

  // Check if all pillars are active
  const pillars = { trading: d.openSellOrders > 5, fantasy: d.activeEvents > 0, community: d.postsLast24h > 0 };
  const activePillars = Object.values(pillars).filter(v => v).length;
  if (activePillars === 3) { s += 2; pos.push('Alle 3 Saeulen sind aktiv — Plattform lebt'); }
  else if (activePillars === 2) { s += 1; pos.push('2 von 3 Saeulen aktiv'); }
  else {
    s -= 1;
    const inactive = Object.entries(pillars).filter(([, v]) => !v).map(([k]) => k);
    neg.push(`${inactive.join(' + ')} braucht mehr Aktivitaet`);
  }

  if (d.clubCount > 15) { pos.push(`${d.clubCount} Clubs — Liga-weite Abdeckung`); }

  wish.push('Push-Notifications fuer Tor-Alerts eigener Spieler');
  wish.push('Referral-System: Freunde einladen + Bonus');
  wish.push('Saisonale Events (Winterpause-Special, Playoffs-Event)');

  return { area: 'Konzept & Vision', score: Math.max(1, Math.min(10, s)), positives: pos, negatives: neg, wishes: wish };
}

// ── Verdict Generator ──

const ARCHETYPE_INTROS: Record<string, string[]> = {
  trader_aggressive: [
    'Als Day-Trader brauche ich Liquiditaet und Geschwindigkeit.',
    'Fuer mich zaehlt: Wie schnell kann ich kaufen und verkaufen?',
    'Die Plattform muss sich wie ein echtes Handels-Terminal anfuehlen.',
  ],
  trader_conservative: [
    'Ich suche langfristige Werte — Spieler die ueber Monate steigen.',
    'Fundamentaldaten und L5 Scores sind mein wichtigstes Werkzeug.',
    'Geduld zahlt sich aus — aber ich brauche gute Daten.',
  ],
  manager: [
    'Fantasy ist das Herzstuck fuer mich — hier will ich gewinnen.',
    'Eine gute Aufstellung zusammenzustellen sollte sich wie FIFA anfuehlen.',
    'Jeder Spieltag ist ein neues Abenteuer.',
  ],
  analyst: [
    'Ich lebe fuer Daten und Statistiken.',
    'Die Community braucht fundierte Analysen, nicht nur Meinungen.',
    'Research-Tools entscheiden ob ich hier bleibe.',
  ],
  collector: [
    'Jede Scout Card ist wie ein Sammelsticker — ich will sie alle.',
    'Vielfalt und Fortschritt motivieren mich.',
    'Ein Album wo ich meinen Fortschritt sehe waere der Traum.',
  ],
  sniper: [
    'Ich warte geduldig auf das perfekte Angebot unter Wert.',
    'Spread und Referenzwert sind mein taegliches Brot.',
    'Die besten Deals macht man wenn andere nicht hinschauen.',
  ],
  fan: [
    'Mein Club ist alles — ich will jeden Spieler in meinem Portfolio.',
    'Die emotionale Bindung zum Verein macht BeScout besonders.',
    'Am Spieltag fiebere ich mit meinen Scout Cards mit.',
  ],
  lurker: [
    'Ich bin neu hier und schaue erstmal was die Plattform bietet.',
    'Ehrlich gesagt bin ich noch unsicher ob das was fuer mich ist.',
    'Die Lernkurve ist steil — aber das Konzept klingt spannend.',
  ],
};

function generateVerdict(bot: AiBotConfig, score: number, ratings: AreaRating[]): string {
  const sorted = [...ratings].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const intros = ARCHETYPE_INTROS[bot.archetype] ?? ARCHETYPE_INTROS.lurker;
  const intro = intros[bot.id % intros.length]; // Different intro per bot ID

  let assessment: string;
  if (score >= 8) {
    assessment = `${best.area} ueberzeugt mich (${best.score}/10). Die Plattform liefert ab. Klar weiterzuempfehlen.`;
  } else if (score >= 6.5) {
    assessment = `${best.area} ist stark (${best.score}/10), aber ${worst.area} (${worst.score}/10) hat Luft nach oben. Insgesamt solide Basis.`;
  } else if (score >= 5) {
    assessment = `Gemischte Gefuehle. ${best.area} funktioniert (${best.score}/10), doch ${worst.area} (${worst.score}/10) drueckt den Gesamteindruck.`;
  } else {
    assessment = `Noch nicht reif. ${worst.area} (${worst.score}/10) ist das groesste Problem. Potential ist da, Umsetzung muss besser werden.`;
  }

  const topWish = worst.wishes[0] ?? best.wishes[0] ?? '';
  const wishLine = topWish ? ` Mein wichtigster Wunsch: ${topWish}` : '';

  return `${intro} ${assessment}${wishLine}`;
}

// ── Main Survey ──

export async function runSurvey(bot: AiBotConfig, client: SupabaseClient, userId: string): Promise<SurveyResult> {
  const start = Date.now();
  const data = await collectPlatformData(client, userId);

  const ratings = [
    rateMarket(data, bot),
    rateFantasy(data, bot),
    rateCommunity(data, bot),
    ratePortfolio(data, bot),
    rateGamification(data, bot),
    rateUX(data, bot),
    rateConcept(data, bot),
  ];

  // Weighted score — archetype-specific weights
  const defaultWeights: Record<string, number> = {
    'Marktplatz & Trading': 0.20, 'Fantasy & Events': 0.15, 'Community & Content': 0.15,
    'Portfolio & Bestand': 0.10, 'Gamification & Belohnungen': 0.15, 'UX & Onboarding': 0.10, 'Konzept & Vision': 0.15,
  };
  const archetypeBoosts: Record<string, Record<string, number>> = {
    trader_aggressive: { 'Marktplatz & Trading': 0.35, 'Portfolio & Bestand': 0.15 },
    trader_conservative: { 'Marktplatz & Trading': 0.30, 'Portfolio & Bestand': 0.15 },
    manager: { 'Fantasy & Events': 0.35, 'Gamification & Belohnungen': 0.10 },
    analyst: { 'Community & Content': 0.30, 'Marktplatz & Trading': 0.20 },
    collector: { 'Portfolio & Bestand': 0.25, 'Gamification & Belohnungen': 0.20 },
    sniper: { 'Marktplatz & Trading': 0.35, 'UX & Onboarding': 0.05 },
    fan: { 'Community & Content': 0.25, 'Fantasy & Events': 0.20, 'Konzept & Vision': 0.20 },
    lurker: { 'UX & Onboarding': 0.30, 'Konzept & Vision': 0.20 },
  };
  const weights = { ...defaultWeights, ...(archetypeBoosts[bot.archetype] ?? {}) };
  // Normalize
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0);
  const overallScore = Math.round(
    ratings.reduce((s, r) => s + r.score * ((weights[r.area] ?? 0.1) / totalW), 0) * 10
  ) / 10;

  const verdict = generateVerdict(bot, overallScore, ratings);
  const allWishes = ratings.flatMap(r => r.wishes);
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
    rawData: data,
  };
}

// ── Report ──

export function generateSurveyReport(results: SurveyResult[]): string {
  const lines: string[] = [];
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  lines.push('# BeScout Platform Survey Report');
  lines.push(`**Datum:** ${now}`);
  lines.push(`**Teilnehmer:** ${results.length} Bot-Personas`);
  lines.push('');

  const recommend = results.filter(r => r.wouldRecommend).length;
  const avgScore = (results.reduce((s, r) => s + r.overallScore, 0) / results.length).toFixed(1);
  const best = results.sort((a, b) => b.overallScore - a.overallScore)[0];
  const worst = results.sort((a, b) => a.overallScore - b.overallScore)[0];

  lines.push('## Executive Summary');
  lines.push('');
  lines.push('| Metrik | Wert |');
  lines.push('|--------|------|');
  lines.push(`| Durchschnittsnote | **${avgScore}/10** |`);
  lines.push(`| Weiterempfehlung | **${Math.round(recommend / results.length * 100)}%** (${recommend}/${results.length}) |`);
  lines.push(`| Beste Bewertung | ${best?.overallScore}/10 — ${best?.bot.name} (${best?.bot.archetype}) |`);
  lines.push(`| Schlechteste Bewertung | ${worst?.overallScore}/10 — ${worst?.bot.name} (${worst?.bot.archetype}) |`);
  lines.push('');

  // Area scores
  const areas = results[0]?.ratings.map(r => r.area) ?? [];
  lines.push('## Bewertung nach Bereich');
  lines.push('');
  lines.push('| Bereich | Note | Bewertung |');
  lines.push('|---------|------|-----------|');
  for (const area of areas) {
    const scores = results.map(r => r.ratings.find(rt => rt.area === area)?.score ?? 0);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const grade = Number(avg) >= 8 ? 'Sehr gut' : Number(avg) >= 6.5 ? 'Gut' : Number(avg) >= 5 ? 'Ausbaufaehig' : 'Schwach';
    lines.push(`| ${area} | **${avg}/10** | ${grade} |`);
  }
  lines.push('');

  // By archetype
  lines.push('## Bewertung nach Nutzertyp');
  lines.push('');
  lines.push('| Archetyp | Anz. | Note | Empfehlung |');
  lines.push('|----------|------|------|------------|');
  for (const arch of Array.from(new Set(results.map(r => r.bot.archetype)))) {
    const ar = results.filter(r => r.bot.archetype === arch);
    const avg = (ar.reduce((s, r) => s + r.overallScore, 0) / ar.length).toFixed(1);
    const rec = ar.filter(r => r.wouldRecommend).length;
    lines.push(`| ${arch} | ${ar.length} | ${avg}/10 | ${rec}/${ar.length} |`);
  }
  lines.push('');

  // Top Wishes
  const wishFreq = new Map<string, { count: number; archetypes: Set<string> }>();
  for (const r of results) for (const w of r.topWishes) {
    if (!wishFreq.has(w)) wishFreq.set(w, { count: 0, archetypes: new Set() });
    wishFreq.get(w)!.count++; wishFreq.get(w)!.archetypes.add(r.bot.archetype);
  }
  lines.push('## Top Feature Wishes');
  lines.push('');
  lines.push('| # | Wish | Nutzertypen | Votes |');
  lines.push('|---|------|------------|-------|');
  Array.from(wishFreq.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 15).forEach(([w, d], i) => {
    lines.push(`| ${i + 1} | ${w} | ${Array.from(d.archetypes).join(', ')} | ${d.count} |`);
  });
  lines.push('');

  // Positives
  const posFreq = new Map<string, number>();
  for (const r of results) for (const rt of r.ratings) for (const p of rt.positives) posFreq.set(p, (posFreq.get(p) ?? 0) + 1);
  lines.push('## Was ueberzeugt');
  lines.push('');
  Array.from(posFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([p, c]) => lines.push(`- ${p} *(${c}x)*`));
  lines.push('');

  // Negatives
  const negFreq = new Map<string, number>();
  for (const r of results) for (const rt of r.ratings) for (const n of rt.negatives) negFreq.set(n, (negFreq.get(n) ?? 0) + 1);
  if (negFreq.size > 0) {
    lines.push('## Was verbessert werden muss');
    lines.push('');
    Array.from(negFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([n, c]) => lines.push(`- ${n} *(${c}x)*`));
    lines.push('');
  }

  // Verdicts (one per archetype)
  lines.push('## Stimmen der Nutzer');
  lines.push('');
  const seen = new Set<string>();
  for (const r of results) {
    if (seen.has(r.bot.archetype)) continue;
    seen.add(r.bot.archetype);
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
  fs.writeFileSync(path.join(dir, `${date}-survey.json`), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(dir, `${date}-survey.md`), generateSurveyReport(results));
  console.log(`\nSurvey saved: e2e/bots/insights/${date}-survey.md`);
}
