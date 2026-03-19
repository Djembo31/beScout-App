export type ArchetypeId = 'trader_aggressive' | 'trader_conservative' | 'manager' | 'analyst' | 'collector' | 'sniper' | 'fan' | 'lurker';

export interface Archetype {
  id: ArchetypeId;
  label: string;
  count: number;
  strategy: string;
  budgetRange: [number, number];
  maxTradeSize: [number, number];
  targetCount: [number, number];
  sellProbability: [number, number];
  sellMarkup: [number, number];
  postProbability: number;
  voteProbability: number;
  preferredPositions?: ('GK' | 'DEF' | 'MID' | 'ATT')[];
  buyLogic: 'cheapest' | 'best_l5' | 'undervalued' | 'random' | 'club_fan' | 'balanced';
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'trader_aggressive',
    label: 'Aggressiver Trader',
    count: 6,
    strategy: 'Kauft guenstig, verkauft schnell mit kleinem Aufschlag',
    budgetRange: [5_000_00, 15_000_00],
    maxTradeSize: [500_00, 3_000_00],
    targetCount: [3, 6],
    sellProbability: [0.7, 0.95],
    sellMarkup: [1.05, 1.15],
    postProbability: 0.1,
    voteProbability: 0.3,
    buyLogic: 'cheapest',
  },
  {
    id: 'trader_conservative',
    label: 'Konservativer Trader',
    count: 6,
    strategy: 'Kauft selektiv, haelt laenger, verkauft mit grossem Aufschlag',
    budgetRange: [8_000_00, 20_000_00],
    maxTradeSize: [1_000_00, 5_000_00],
    targetCount: [1, 3],
    sellProbability: [0.2, 0.5],
    sellMarkup: [1.20, 1.50],
    postProbability: 0.05,
    voteProbability: 0.2,
    buyLogic: 'best_l5',
  },
  {
    id: 'manager',
    label: 'Fantasy Manager',
    count: 8,
    strategy: 'Baut ausgewogenes Team, achtet auf Positionen und L5',
    budgetRange: [5_000_00, 12_000_00],
    maxTradeSize: [500_00, 3_000_00],
    targetCount: [3, 5],
    sellProbability: [0.1, 0.3],
    sellMarkup: [1.15, 1.40],
    postProbability: 0.15,
    voteProbability: 0.4,
    buyLogic: 'balanced',
  },
  {
    id: 'analyst',
    label: 'Daten-Analyst',
    count: 6,
    strategy: 'Analysiert Stats, schreibt Community-Posts, kauft datenbasiert',
    budgetRange: [4_000_00, 10_000_00],
    maxTradeSize: [500_00, 2_000_00],
    targetCount: [1, 3],
    sellProbability: [0.2, 0.4],
    sellMarkup: [1.10, 1.25],
    postProbability: 0.8,
    voteProbability: 0.7,
    buyLogic: 'best_l5',
  },
  {
    id: 'collector',
    label: 'Sammler',
    count: 6,
    strategy: 'Kauft 1 SC pro Spieler, moeglichst viele verschiedene',
    budgetRange: [3_000_00, 8_000_00],
    maxTradeSize: [500_00, 1_500_00],
    targetCount: [5, 10],
    sellProbability: [0.0, 0.1],
    sellMarkup: [1.30, 1.80],
    postProbability: 0.1,
    voteProbability: 0.5,
    buyLogic: 'random',
  },
  {
    id: 'sniper',
    label: 'Schnaeppchjaeger',
    count: 6,
    strategy: 'Kauft nur unter Referenzwert, verkauft sofort mit kleinem Aufschlag',
    budgetRange: [6_000_00, 15_000_00],
    maxTradeSize: [1_000_00, 5_000_00],
    targetCount: [1, 3],
    sellProbability: [0.8, 1.0],
    sellMarkup: [1.05, 1.12],
    postProbability: 0.05,
    voteProbability: 0.15,
    buyLogic: 'undervalued',
  },
  {
    id: 'fan',
    label: 'Club-Fan',
    count: 6,
    strategy: 'Kauft Spieler des Lieblingsclubs, emotional gebunden',
    budgetRange: [3_000_00, 8_000_00],
    maxTradeSize: [500_00, 2_000_00],
    targetCount: [2, 5],
    sellProbability: [0.05, 0.15],
    sellMarkup: [1.30, 2.00],
    postProbability: 0.3,
    voteProbability: 0.6,
    buyLogic: 'club_fan',
  },
  {
    id: 'lurker',
    label: 'Beobachter',
    count: 6,
    strategy: 'Schaut viel, handelt selten, kommentiert ab und zu',
    budgetRange: [2_000_00, 5_000_00],
    maxTradeSize: [500_00, 1_000_00],
    targetCount: [0, 2],
    sellProbability: [0.0, 0.1],
    sellMarkup: [1.20, 1.50],
    postProbability: 0.2,
    voteProbability: 0.8,
    buyLogic: 'random',
  },
];

export const TURKISH_FIRST_NAMES = [
  'Ahmet', 'Mehmet', 'Mustafa', 'Ali', 'Hasan', 'Hueseyin', 'Ibrahim', 'Oemer', 'Yusuf', 'Murat',
  'Emre', 'Burak', 'Serkan', 'Oguz', 'Cem', 'Kerem', 'Baris', 'Umut', 'Kaan', 'Tolga',
  'Ayse', 'Fatma', 'Elif', 'Zeynep', 'Merve', 'Buesra', 'Esra', 'Derya', 'Selin', 'Ceren',
  'Nur', 'Guel', 'Sibel', 'Pinar', 'Deniz', 'Ecem', 'Basak', 'Yaren', 'Defne', 'Irem',
  'Eren', 'Berk', 'Arda', 'Mert', 'Can', 'Onur', 'Tuna', 'Alp', 'Doruk', 'Efe',
];

// Club names as they appear in the DB (players.club column)
export const CLUBS = [
  'Sakaryaspor', 'Bodrum FK', 'Bandırmaspor', 'Keçiörengücü',
  'İstanbulspor', 'Ümraniyespor', 'Pendikspor', 'Boluspor',
  'Sivasspor', 'Erzurumspor FK', 'Manisa FK', 'Çorum FK',
  'Esenler Erokspor', 'Amedspor', 'Hatayspor', 'Adana Demirspor',
  'Sarıyer', 'Van Spor FK', 'Iğdır FK', 'Serik Belediyespor',
];
