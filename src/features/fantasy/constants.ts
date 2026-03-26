export type FormationDef = {
  id: string;
  name: string;
  slots: { pos: string; count: number }[];
};

export const FORMATIONS_11ER: FormationDef[] = [
  {
    id: '1-4-3-3', name: '4-3-3', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 4 },
      { pos: 'MID', count: 3 },
      { pos: 'ATT', count: 3 },
    ]
  },
  {
    id: '1-4-4-2', name: '4-4-2', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 4 },
      { pos: 'MID', count: 4 },
      { pos: 'ATT', count: 2 },
    ]
  },
  {
    id: '1-3-4-3', name: '3-4-3', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 3 },
      { pos: 'MID', count: 4 },
      { pos: 'ATT', count: 3 },
    ]
  },
];

export const FORMATIONS_7ER: FormationDef[] = [
  {
    id: '1-2-2-2', name: 'Balanced (2-2-2)', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 2 },
      { pos: 'MID', count: 2 },
      { pos: 'ATT', count: 2 },
    ]
  },
  {
    id: '1-3-2-1', name: 'Defensiv (3-2-1)', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 3 },
      { pos: 'MID', count: 2 },
      { pos: 'ATT', count: 1 },
    ]
  },
  {
    id: '1-2-3-1', name: 'Kreativ (2-3-1)', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 2 },
      { pos: 'MID', count: 3 },
      { pos: 'ATT', count: 1 },
    ]
  },
  {
    id: '1-3-1-2', name: 'Counter (3-1-2)', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 3 },
      { pos: 'MID', count: 1 },
      { pos: 'ATT', count: 2 },
    ]
  },
  {
    id: '1-1-3-2', name: 'Offensiv (1-3-2)', slots: [
      { pos: 'GK', count: 1 },
      { pos: 'DEF', count: 1 },
      { pos: 'MID', count: 3 },
      { pos: 'ATT', count: 2 },
    ]
  },
];

/** Get formations array for an event format or lineup size */
export function getFormationsForFormat(format: string, lineupSize?: 7 | 11): FormationDef[] {
  if (lineupSize === 7) return FORMATIONS_7ER;
  if (lineupSize === 11) return FORMATIONS_11ER;
  return format === '11er' ? FORMATIONS_11ER : FORMATIONS_7ER;
}

/** Get default formation ID for a format or lineup size */
export function getDefaultFormation(format: string, lineupSize?: 7 | 11): string {
  if (lineupSize === 7) return '1-2-2-2';
  if (lineupSize === 11) return '1-4-3-3';
  return format === '11er' ? '1-4-3-3' : '1-2-2-2';
}

/**
 * Build slot-to-DB-column mapping for a formation.
 * Slot index → DB column key (e.g., 0 → 'slotGk', 3 → 'slotDef3')
 */
export function buildSlotDbKeys(formation: FormationDef): string[] {
  const keys: string[] = [];
  const posCounters: Record<string, number> = {};

  for (const s of formation.slots) {
    for (let i = 0; i < s.count; i++) {
      const posLower = s.pos.toLowerCase();
      const count = (posCounters[posLower] ?? 0) + 1;
      posCounters[posLower] = count;

      // Match existing DB naming: gk (no number), def1/def2/..., mid1/mid2/..., att (no number for first), att2/att3
      if (posLower === 'gk') {
        keys.push('gk');
      } else if (posLower === 'att') {
        keys.push(count === 1 ? 'att' : `att${count}`);
      } else {
        keys.push(`${posLower}${count}`);
      }
    }
  }
  return keys;
}

export const PRESET_KEY = 'bescout-lineup-presets';
