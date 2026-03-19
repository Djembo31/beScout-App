import { ARCHETYPES, TURKISH_FIRST_NAMES, CLUBS, type Archetype, type ArchetypeId } from './archetypes';

export interface AiBotConfig {
  id: number;
  email: string;
  password: string;
  name: string;
  archetype: ArchetypeId;
  strategy: string;
  budget: number;
  maxTradeSize: number;
  targetCount: number;
  sellProbability: number;
  sellMarkup: number;
  postProbability: number;
  voteProbability: number;
  buyLogic: Archetype['buyLogic'];
  favoriteClub?: string;
  preferredPositions?: string[];
}

function randBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function generateBots(password: string): AiBotConfig[] {
  const bots: AiBotConfig[] = [];
  let id = 1;
  const usedNames = new Set<string>();

  for (const archetype of ARCHETYPES) {
    for (let i = 0; i < archetype.count; i++) {
      let name: string;
      do {
        name = TURKISH_FIRST_NAMES[Math.floor(Math.random() * TURKISH_FIRST_NAMES.length)];
      } while (usedNames.has(name) && usedNames.size < TURKISH_FIRST_NAMES.length);
      usedNames.add(name);

      const padded = String(id).padStart(3, '0');

      bots.push({
        id,
        email: `bot-${padded}@bescout.app`,
        password,
        name,
        archetype: archetype.id,
        strategy: archetype.strategy,
        budget: randBetween(archetype.budgetRange[0], archetype.budgetRange[1]),
        maxTradeSize: randBetween(archetype.maxTradeSize[0], archetype.maxTradeSize[1]),
        targetCount: randBetween(archetype.targetCount[0], archetype.targetCount[1]),
        sellProbability: randFloat(archetype.sellProbability[0], archetype.sellProbability[1]),
        sellMarkup: randFloat(archetype.sellMarkup[0], archetype.sellMarkup[1]),
        postProbability: archetype.postProbability,
        voteProbability: archetype.voteProbability,
        buyLogic: archetype.buyLogic,
        favoriteClub: archetype.buyLogic === 'club_fan'
          ? CLUBS[Math.floor(Math.random() * CLUBS.length)]
          : undefined,
        preferredPositions: archetype.preferredPositions,
      });
      id++;
    }
  }
  return bots;
}
