import type { SquadFormation, FormationId, SquadSize } from './types';

export const SQUAD_PRESET_KEY = 'bescout-squad-presets';
export const SQUAD_SIZE_KEY = 'bescout-squad-size';

// Build formation with GK + DEF/MID/ATT counts
function makeFormation(id: FormationId, name: string, def: number, mid: number, att: number): SquadFormation {
  const slots: SquadFormation['slots'] = [];

  // GK — always 1
  slots.push({ pos: 'GK', row: 0, col: 0 });

  // DEF
  for (let i = 0; i < def; i++) slots.push({ pos: 'DEF', row: 1, col: i });
  // MID
  for (let i = 0; i < mid; i++) slots.push({ pos: 'MID', row: 2, col: i });
  // ATT
  for (let i = 0; i < att; i++) slots.push({ pos: 'ATT', row: 3, col: i });

  return { id, name, slots };
}

// 11er formations
export const FORMATIONS_11: SquadFormation[] = [
  makeFormation('4-3-3', '4-3-3', 4, 3, 3),
  makeFormation('4-4-2', '4-4-2', 4, 4, 2),
  makeFormation('3-5-2', '3-5-2', 3, 5, 2),
  makeFormation('5-3-2', '5-3-2', 5, 3, 2),
];

// 6er formations (1 GK + 5 outfield)
export const FORMATIONS_6: SquadFormation[] = [
  makeFormation('2-2-1', '2-2-1', 2, 2, 1),
  makeFormation('3-1-1', '3-1-1', 3, 1, 1),
  makeFormation('1-3-1', '1-3-1', 1, 3, 1),
  makeFormation('2-1-2', '2-1-2', 2, 1, 2),
  makeFormation('1-2-2', '1-2-2', 1, 2, 2),
];

export const FORMATIONS: Record<SquadSize, SquadFormation[]> = {
  '11': FORMATIONS_11,
  '6': FORMATIONS_6,
};

export const DEFAULT_FORMATIONS: Record<SquadSize, FormationId> = {
  '11': '4-3-3',
  '6': '2-2-1',
};

export const DEFAULT_SQUAD_SIZE: SquadSize = '11';
