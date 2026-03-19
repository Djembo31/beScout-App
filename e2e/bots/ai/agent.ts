import type { SupabaseClient } from '@supabase/supabase-js';
import type { AiBotConfig } from './bot-generator';
import { BotSessionJournal } from './journal';
import * as actions from './actions';
import type { MarketPlayer, Holding, ActiveIpo } from './actions';

const MAX_ACTIONS = 15;

export async function runBotSession(bot: AiBotConfig, client: SupabaseClient, userId: string) {
  const journal = new BotSessionJournal(bot);

  // 1. Check balance
  const wallet = await actions.getBalance(client, userId);
  journal.balanceBefore = wallet.balance;
  journal.action('start', `Session gestartet — Balance: ${(wallet.balance / 100).toLocaleString('de')} CR`);

  if (wallet.balance < 100_00) {
    journal.observe('start', 'Balance unter 100 CR — kann kaum handeln');
    journal.uxFriction('wallet', 'Zu wenig Guthaben fuer sinnvolles Trading. Woher bekomme ich mehr Credits?', 'medium');
  }

  // 2. Get market data
  const allPlayers = await actions.getMarketPlayers(client, 100);
  journal.observe('market', `${allPlayers.length} Spieler auf dem Markt`);

  if (allPlayers.length === 0) {
    journal.bug('market', 'Keine Spieler auf dem Markt verfuegbar', 'critical');
    journal.balanceAfter = wallet.balance;
    return journal.save();
  }

  // 3. Get holdings
  const holdings = await actions.getHoldings(client, userId);
  journal.observe('portfolio', `${holdings.length} Spieler im Portfolio`);

  // 4. Get active IPOs (pick cheapest per player)
  const activeIpos = await actions.getActiveIpos(client);
  const ipoByPlayer = new Map<string, actions.ActiveIpo>();
  for (const ipo of activeIpos) {
    const existing = ipoByPlayer.get(ipo.player_id);
    if (!existing || ipo.price < existing.price) {
      ipoByPlayer.set(ipo.player_id, ipo);
    }
  }
  journal.observe('market', `${activeIpos.length} aktive IPOs (${ipoByPlayer.size} Spieler)`);

  // 5. Get community posts
  const posts = await actions.getRecentPosts(client, 10);
  journal.observe('community', `${posts.length} aktuelle Posts`);

  // 6. Execute actions based on archetype
  let actionCount = 0;

  // ── BUY PHASE ──
  const targets = selectTargets(bot, allPlayers, holdings, ipoByPlayer);
  journal.action('strategy', `${targets.length} Spieler als Kauf-Ziele identifiziert (${bot.buyLogic})`);

  for (const player of targets) {
    if (actionCount >= MAX_ACTIONS) break;
    if (wallet.balance < (player.floor_price ?? player.ipo_price ?? 100_00)) {
      journal.observe('buy', `Nicht genug Balance fuer ${player.first_name} ${player.last_name}`);
      continue;
    }

    // Check sell orders for this player
    const sellOrders = await actions.getOpenSellOrders(client, player.id);
    actionCount++;

    if (sellOrders.length > 0 && bot.buyLogic !== 'club_fan') {
      // Buy from cheapest sell order
      const cheapest = sellOrders[0];
      if (cheapest.price <= bot.maxTradeSize) {
        const result = await actions.buyFromOrder(client, userId, cheapest.id, 1);
        actionCount++;
        if (result.success) {
          wallet.balance -= cheapest.price;
          journal.trade('buy', `${player.first_name} ${player.last_name} x1 @ ${(cheapest.price / 100).toFixed(0)} CR (Orderbook)`, {
            playerId: player.id, price: cheapest.price, source: 'orderbook',
          });
        } else {
          journal.error('buy', `Kauf fehlgeschlagen: ${result.error}`);
          if (result.error?.includes('liquidat')) {
            journal.bug('buy', `Liquidierter Spieler ${player.first_name} ${player.last_name} hat noch offene Sell Orders`, 'high');
          }
        }
      } else {
        journal.observe('buy', `${player.first_name} ${player.last_name} zu teuer (${(cheapest.price / 100).toFixed(0)} CR > max ${(bot.maxTradeSize / 100).toFixed(0)} CR)`);
      }
    } else if (ipoByPlayer.has(player.id)) {
      // Buy from active IPO
      const ipo = ipoByPlayer.get(player.id)!;
      const remaining = ipo.total_offered - ipo.sold;
      if (remaining > 0 && ipo.price <= bot.maxTradeSize) {
        const result = await actions.buyFromIpo(client, userId, ipo.id, 1);
        actionCount++;
        if (result.success) {
          wallet.balance -= ipo.price;
          journal.trade('buy', `${player.first_name} ${player.last_name} x1 @ ${(ipo.price / 100).toFixed(0)} CR (IPO)`, {
            playerId: player.id, price: ipo.price, source: 'ipo', ipoId: ipo.id,
          });
        } else {
          journal.error('buy', `IPO-Kauf fehlgeschlagen: ${result.error}`);
        }
      } else {
        journal.observe('buy', `IPO fuer ${player.first_name} ${player.last_name} ausverkauft oder zu teuer`);
      }
    } else if (player.dpc_available > 0) {
      // Try market buy (matches existing sell orders)
      const result = await actions.buyFromMarket(client, userId, player.id, 1);
      actionCount++;
      if (result.success) {
        const cost = (result as Record<string, unknown>).total_cost as number ?? player.ipo_price ?? 0;
        wallet.balance -= cost;
        journal.trade('buy', `${player.first_name} ${player.last_name} x1 @ ${(cost / 100).toFixed(0)} CR (Market)`, {
          playerId: player.id, price: cost, source: 'market',
        });
      } else {
        // Expected: no sell orders available
        journal.observe('buy', `${player.first_name} ${player.last_name} — kein aktives Angebot (${result.error})`);
      }
    } else {
      journal.observe('buy', `${player.first_name} ${player.last_name} — keine Angebote und kein Club Sale`);
      journal.uxFriction('market', `Spieler ${player.first_name} ${player.last_name} ist nicht kaufbar (keine Sell Orders, kein IPO Stock)`, 'low');
    }
  }

  // ── SELL PHASE ──
  const updatedHoldings = await actions.getHoldings(client, userId);
  for (const h of updatedHoldings) {
    if (actionCount >= MAX_ACTIONS) break;
    if (Math.random() > bot.sellProbability) continue;

    const basePrice = h.player.floor_price ?? h.avg_buy_price;
    const sellPrice = Math.min(
      Math.round(basePrice * bot.sellMarkup),
      Math.round(h.avg_buy_price * 2) // Cap: max 2x Kaufpreis (keine absurden Listings)
    );
    if (sellPrice < h.avg_buy_price) continue;

    const result = await actions.placeSellOrder(client, userId, h.player_id, 1, sellPrice);
    actionCount++;
    if (result.success) {
      journal.trade('sell', `${h.player.first_name} ${h.player.last_name} x1 listed @ ${(sellPrice / 100).toFixed(0)} CR (+${((bot.sellMarkup - 1) * 100).toFixed(0)}%)`, {
        playerId: h.player_id, price: sellPrice,
      });
    } else {
      journal.error('sell', `Sell Order fehlgeschlagen: ${result.error}`);
    }
  }

  // ── COMMUNITY PHASE ──
  if (Math.random() < bot.postProbability && actionCount < MAX_ACTIONS) {
    const content = generatePostContent(bot, updatedHoldings, allPlayers);
    if (content) {
      const topHolding = updatedHoldings[0];
      const result = await actions.createPost(
        client, userId, content.text,
        topHolding?.player_id ?? null,
        topHolding?.player.club ?? null,
        content.tags, content.category
      );
      actionCount++;
      if (result.success) {
        journal.post('community', `Post erstellt: "${content.text.slice(0, 60)}..."`);
      } else {
        journal.error('community', `Post fehlgeschlagen: ${result.error}`);
      }
    }
  }

  // Vote on posts
  if (Math.random() < bot.voteProbability && posts.length > 0 && actionCount < MAX_ACTIONS) {
    const randomPost = posts[Math.floor(Math.random() * posts.length)];
    if (randomPost.user_id !== userId) {
      const vote = Math.random() > 0.2 ? 1 : -1;
      await actions.votePost(client, userId, randomPost.id, vote as 1 | -1);
      actionCount++;
      journal.action('community', `Post ${vote === 1 ? 'upvoted' : 'downvoted'}`);
    }
  }

  // ── FINAL ──
  const finalWallet = await actions.getBalance(client, userId);
  journal.balanceAfter = finalWallet.balance;
  journal.action('end', `Session beendet — ${actionCount} Aktionen, Balance: ${(finalWallet.balance / 100).toLocaleString('de')} CR`);

  generateObservations(bot, journal, allPlayers, updatedHoldings, posts);

  return journal.save();
}

// ── Target Selection ──

function selectTargets(bot: AiBotConfig, players: MarketPlayer[], holdings: Holding[], ipoByPlayer: Map<string, actions.ActiveIpo>): MarketPlayer[] {
  const heldIds = new Set(holdings.map(h => h.player_id));
  // Only target players that are guaranteed buyable: active IPO or verified sell orders
  // (floor_price alone is unreliable — often stale without actual sell orders)
  let candidates = players.filter(p => !p.is_liquidated && ipoByPlayer.has(p.id));

  // Helper: effective buy price (floor price or IPO price)
  const getPrice = (p: MarketPlayer) => {
    if (p.floor_price != null && p.floor_price > 0) return p.floor_price;
    const ipo = ipoByPlayer.get(p.id);
    if (ipo) return ipo.price;
    return p.ipo_price ?? Infinity;
  };

  switch (bot.buyLogic) {
    case 'cheapest':
      candidates = candidates
        .filter(p => getPrice(p) <= bot.maxTradeSize)
        .sort((a, b) => getPrice(a) - getPrice(b));
      break;

    case 'best_l5':
      candidates = candidates
        .filter(p => p.perf_l5 != null && p.perf_l5 > 0)
        .sort((a, b) => (b.perf_l5 ?? 0) - (a.perf_l5 ?? 0));
      break;

    case 'undervalued':
      candidates = candidates
        .filter(p => {
          const price = p.floor_price ?? p.ipo_price ?? 0;
          const ref = p.reference_price ?? 0;
          return ref > 0 && price > 0 && price < ref * 0.95;
        })
        .sort((a, b) => {
          const ratioA = (a.floor_price ?? a.ipo_price ?? 0) / (a.reference_price ?? 1);
          const ratioB = (b.floor_price ?? b.ipo_price ?? 0) / (b.reference_price ?? 1);
          return ratioA - ratioB;
        });
      break;

    case 'club_fan':
      candidates = candidates.filter(p =>
        bot.favoriteClub && p.club === bot.favoriteClub
      );
      break;

    case 'balanced': {
      const posCounts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
      for (const h of holdings) posCounts[h.player.position] = (posCounts[h.player.position] ?? 0) + 1;
      const weakest = Object.entries(posCounts).sort((a, b) => a[1] - b[1])[0][0];
      candidates = candidates
        .filter(p => p.position === weakest)
        .sort((a, b) => (b.perf_l5 ?? 0) - (a.perf_l5 ?? 0));
      break;
    }

    case 'random':
    default:
      candidates = candidates.sort(() => Math.random() - 0.5);
      break;
  }

  if (bot.archetype === 'collector') {
    candidates = candidates.filter(p => !heldIds.has(p.id));
  }

  return candidates.slice(0, bot.targetCount);
}

// ── Content Generation ──
// DB CHECK: category IN ('Analyse', 'Prediction', 'Meinung', 'News')

const ANALYST_TEMPLATES = [
  (top: MarketPlayer[]) => {
    const lines = top.map(p => `${p.first_name} ${p.last_name} (${p.position}) — L5: ${p.perf_l5}, Floor: ${((p.floor_price ?? 0) / 100).toFixed(0)} CR`);
    return `Top 3 Spieler nach L5 Score diese Woche:\n${lines.join('\n')}\nDatenbasierte Analyse — wer performt konstant?`;
  },
  (top: MarketPlayer[]) => {
    const p = top[0];
    return `Spieler-Spotlight: ${p.first_name} ${p.last_name} (${p.position}, ${p.club})\nL5: ${p.perf_l5} | L15: ${p.perf_l15 ?? '?'}\nFloor: ${((p.floor_price ?? 0) / 100).toFixed(0)} CR\nKonstant stark — einer der besten in der Liga auf seiner Position.`;
  },
  (top: MarketPlayer[]) => {
    const byPos: Record<string, MarketPlayer> = {};
    for (const p of top) { if (!byPos[p.position]) byPos[p.position] = p; }
    const lines = Object.values(byPos).map(p => `${p.position}: ${p.first_name} ${p.last_name} (L5: ${p.perf_l5})`);
    return `Beste Spieler pro Position:\n${lines.join('\n')}\nWer baut das staerkste Team?`;
  },
  (top: MarketPlayer[]) => {
    const cheap = top.filter(p => (p.floor_price ?? 0) < 50000).slice(0, 3);
    if (cheap.length === 0) return null;
    const lines = cheap.map(p => `${p.first_name} ${p.last_name} — L5: ${p.perf_l5}, nur ${((p.floor_price ?? 0) / 100).toFixed(0)} CR`);
    return `Unterschaetzte Spieler mit starkem L5:\n${lines.join('\n')}\nGute Performance, niedriger Preis — lohnt sich ein Blick?`;
  },
  (top: MarketPlayer[]) => {
    const p = top[Math.floor(Math.random() * Math.min(3, top.length))];
    const trend = (p.price_change_24h ?? 0) > 0 ? 'steigend' : (p.price_change_24h ?? 0) < 0 ? 'fallend' : 'stabil';
    return `${p.first_name} ${p.last_name} Analyse:\nPosition: ${p.position} | Club: ${p.club}\nL5 Score: ${p.perf_l5} | Trend: ${trend}\n${(p.perf_l5 ?? 0) > 70 ? 'Starker Performer, Preis gerechtfertigt.' : 'Durchschnittlich — Preis koennte fallen.'}`;
  },
];

const TRADER_TEMPLATES = [
  (p: MarketPlayer) => `Gerade ${p.first_name} ${p.last_name} ins Portfolio geholt. ${p.position}, L5: ${p.perf_l5 ?? '?'}. Mal sehen wie sich der Kurs entwickelt.`,
  (p: MarketPlayer) => `Neuer Pick: ${p.first_name} ${p.last_name} (${p.club}). ${p.position} mit L5 ${p.perf_l5 ?? '?'} — gutes Preis-Leistungs-Verhaeltnis.`,
  (p: MarketPlayer) => `${p.first_name} ${p.last_name} gekauft. Bei dem L5 Score von ${p.perf_l5 ?? '?'} sehe ich Potenzial.`,
];

const LURKER_TEMPLATES = [
  'Der Markt ist heute ruhig. Warte auf bessere Gelegenheiten.',
  'Interessante Bewegungen auf dem Markt. Beobachte erstmal weiter.',
  'Schaue mir die Spieler-Statistiken an. Vielleicht kaufe ich bald meinen ersten SC.',
  'Hat jemand Tipps fuer Einsteiger? Bin noch neu hier.',
  'Die Community waechst. Bin gespannt wie sich die Preise entwickeln.',
];

function generatePostContent(
  bot: AiBotConfig,
  holdings: Holding[],
  market: MarketPlayer[]
): { text: string; tags: string[]; category: string } | null {
  if (holdings.length === 0 && bot.archetype !== 'lurker') return null;

  switch (bot.archetype) {
    case 'analyst': {
      const top = market.filter(p => p.perf_l5 != null).sort((a, b) => (b.perf_l5 ?? 0) - (a.perf_l5 ?? 0)).slice(0, 10);
      if (top.length === 0) return null;
      const template = ANALYST_TEMPLATES[Math.floor(Math.random() * ANALYST_TEMPLATES.length)];
      const text = template(top);
      if (!text) return null;
      return { text, tags: ['analyse', 'stats'], category: 'Analyse' };
    }

    case 'fan': {
      const clubPlayers = holdings.filter(h => h.player.club === bot.favoriteClub);
      if (clubPlayers.length === 0) return null;
      const p = clubPlayers[Math.floor(Math.random() * clubPlayers.length)].player;
      return {
        text: `${p.first_name} ${p.last_name} ist einer der besten Spieler bei ${p.club}! L5 Score: ${p.perf_l5 ?? '?'}. Unterschaetzt vom Markt.`,
        tags: [p.club.toLowerCase(), p.last_name.toLowerCase()],
        category: 'Meinung',
      };
    }

    case 'trader_aggressive':
    case 'trader_conservative':
    case 'sniper': {
      if (holdings.length === 0) return null;
      const recent = holdings[Math.floor(Math.random() * holdings.length)];
      const template = TRADER_TEMPLATES[Math.floor(Math.random() * TRADER_TEMPLATES.length)];
      return {
        text: template(recent.player),
        tags: ['trading', recent.player.last_name.toLowerCase()],
        category: 'Meinung', // 'Trading' is NOT in DB CHECK constraint
      };
    }

    case 'lurker': {
      if (market.length === 0) return null;
      return {
        text: LURKER_TEMPLATES[Math.floor(Math.random() * LURKER_TEMPLATES.length)],
        tags: ['markt'],
        category: 'Meinung',
      };
    }

    default:
      return null;
  }
}

// ── Observations ──

function generateObservations(
  bot: AiBotConfig,
  journal: BotSessionJournal,
  players: MarketPlayer[],
  holdings: Holding[],
  posts: actions.CommunityPost[]
) {
  const withSellOrders = players.filter(p => p.floor_price != null && p.floor_price > 0);
  if (withSellOrders.length < 5) {
    journal.uxFriction('market', `Nur ${withSellOrders.length} Spieler haben aktive Sell Orders — zu wenig Liquiditaet fuer aktives Trading`);
  }

  const noL5 = players.filter(p => p.perf_l5 == null || p.perf_l5 === 0);
  if (noL5.length > players.length * 0.3) {
    journal.observe('data', `${noL5.length}/${players.length} Spieler haben keinen L5 Score — erschwert Bewertung`);
  }

  switch (bot.archetype) {
    case 'trader_aggressive':
    case 'trader_conservative':
      if (withSellOrders.length < 10) {
        journal.featureWish('market', 'Preis-Alerts wenn Spieler unter Wunschpreis fallen');
        journal.featureWish('market', 'Sortierung nach 24h-Preisaenderung');
      }
      break;
    case 'manager':
      journal.featureWish('fantasy', 'Auto-Fill Aufstellung basierend auf L5 Score');
      break;
    case 'analyst':
      if (posts.length < 5) {
        journal.uxFriction('community', 'Community ist zu ruhig — kaum Posts zum Interagieren');
      }
      journal.featureWish('community', 'Research-Template fuer strukturierte Spieler-Analysen');
      break;
    case 'collector':
      journal.featureWish('profile', 'Album-Ansicht aller gesammelten Spieler');
      journal.featureWish('gamification', 'Achievements fuer Sammel-Meilensteine (10 Spieler, alle Positionen)');
      break;
    case 'sniper':
      journal.featureWish('market', 'Filter fuer Spieler unter Referenzwert');
      break;
    case 'fan':
      journal.featureWish('club', 'Club-spezifischer Feed mit allen Neuigkeiten');
      break;
    case 'lurker':
      journal.featureWish('onboarding', 'Tutorial fuer neue User — was kann ich hier tun?');
      break;
  }
}
