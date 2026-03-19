/**
 * BeScout Bot Configuration
 * 5 Bot-Persönlichkeiten die die Plattform beleben
 */

export const BOT_PASSWORD = 'BeScout2026!';

export type BotPersonality = 'trader' | 'manager' | 'analyst' | 'collector' | 'sniper';

export interface BotConfig {
  email: string;
  name: string;
  personality: BotPersonality;
  /** How the bot decides what to buy */
  strategy: string;
  /** Max $SCOUT per single trade */
  maxTradeSize: number;
  /** How many players to target per session */
  targetCount: number;
  /** Probability of placing a sell order after buying (0-1) */
  sellProbability: number;
  /** Price markup when selling (1.1 = +10%) */
  sellMarkup: number;
}

export const BOTS: BotConfig[] = [
  {
    email: 'bot-trader@bescout.app',
    name: 'Mustafa Trader',
    personality: 'trader',
    strategy: 'Kauft guenstige Spieler und listet sie mit Aufschlag. Klassischer Haendler.',
    maxTradeSize: 5000, // 50 $SCOUT max
    targetCount: 3,
    sellProbability: 0.8,
    sellMarkup: 1.15, // +15%
  },
  {
    email: 'bot-manager@bescout.app',
    name: 'Elif Manager',
    personality: 'manager',
    strategy: 'Baut ein ausgewogenes Team. Kauft verschiedene Positionen fuer Fantasy.',
    maxTradeSize: 3000,
    targetCount: 5,
    sellProbability: 0.2,
    sellMarkup: 1.30,
  },
  {
    email: 'bot-analyst@bescout.app',
    name: 'Kaan Analyst',
    personality: 'analyst',
    strategy: 'Kauft Spieler mit hohem L5 Score. Schreibt Community Posts ueber Picks.',
    maxTradeSize: 4000,
    targetCount: 2,
    sellProbability: 0.3,
    sellMarkup: 1.20,
  },
  {
    email: 'bot-collector@bescout.app',
    name: 'Zeynep Collector',
    personality: 'collector',
    strategy: 'Sammelt viele verschiedene Spieler. Kauft jeweils 1 SC pro Spieler.',
    maxTradeSize: 2000,
    targetCount: 8,
    sellProbability: 0.1,
    sellMarkup: 1.50,
  },
  {
    email: 'bot-sniper@bescout.app',
    name: 'Emre Sniper',
    personality: 'sniper',
    strategy: 'Wartet auf guenstige Angebote unter Referenzwert. Kauft und verkauft schnell.',
    maxTradeSize: 8000,
    targetCount: 2,
    sellProbability: 0.9,
    sellMarkup: 1.10, // +10% thin margin
  },
];
