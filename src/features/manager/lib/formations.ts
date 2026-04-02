import type { Pos } from '@/types';

export interface SlotDef {
  /** Unique key, e.g. 'gk', 'def1', 'mid2', 'att3' */
  key: string;
  /** Position group */
  pos: Pos;
  /** Row index: 0 = GK (bottom), higher = closer to ATT (top) */
  row: number;
  /** Column index within the row (0-based, left to right) */
  col: number;
}

export interface Formation {
  label: string;
  slots: SlotDef[];
}

/**
 * All supported formations.
 * Row 0 = GK (bottom of pitch), Row 3/4 = ATT (top of pitch).
 * Col indices are 0-based within each row.
 */
export const FORMATIONS: Record<string, Formation> = {
  '4-3-3': {
    label: '4-3-3',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 0 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0 },
      { key: 'def2', pos: 'DEF', row: 1, col: 1 },
      { key: 'def3', pos: 'DEF', row: 1, col: 2 },
      { key: 'def4', pos: 'DEF', row: 1, col: 3 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0 },
      { key: 'mid2', pos: 'MID', row: 2, col: 1 },
      { key: 'mid3', pos: 'MID', row: 2, col: 2 },
      { key: 'att1', pos: 'ATT', row: 3, col: 0 },
      { key: 'att2', pos: 'ATT', row: 3, col: 1 },
      { key: 'att3', pos: 'ATT', row: 3, col: 2 },
    ],
  },
  '4-4-2': {
    label: '4-4-2',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 0 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0 },
      { key: 'def2', pos: 'DEF', row: 1, col: 1 },
      { key: 'def3', pos: 'DEF', row: 1, col: 2 },
      { key: 'def4', pos: 'DEF', row: 1, col: 3 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0 },
      { key: 'mid2', pos: 'MID', row: 2, col: 1 },
      { key: 'mid3', pos: 'MID', row: 2, col: 2 },
      { key: 'mid4', pos: 'MID', row: 2, col: 3 },
      { key: 'att1', pos: 'ATT', row: 3, col: 0 },
      { key: 'att2', pos: 'ATT', row: 3, col: 1 },
    ],
  },
  '3-5-2': {
    label: '3-5-2',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 0 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0 },
      { key: 'def2', pos: 'DEF', row: 1, col: 1 },
      { key: 'def3', pos: 'DEF', row: 1, col: 2 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0 },
      { key: 'mid2', pos: 'MID', row: 2, col: 1 },
      { key: 'mid3', pos: 'MID', row: 2, col: 2 },
      { key: 'mid4', pos: 'MID', row: 2, col: 3 },
      { key: 'mid5', pos: 'MID', row: 2, col: 4 },
      { key: 'att1', pos: 'ATT', row: 3, col: 0 },
      { key: 'att2', pos: 'ATT', row: 3, col: 1 },
    ],
  },
  '4-2-3-1': {
    label: '4-2-3-1',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 0 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0 },
      { key: 'def2', pos: 'DEF', row: 1, col: 1 },
      { key: 'def3', pos: 'DEF', row: 1, col: 2 },
      { key: 'def4', pos: 'DEF', row: 1, col: 3 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0 },
      { key: 'mid2', pos: 'MID', row: 2, col: 1 },
      { key: 'mid3', pos: 'MID', row: 3, col: 0 },
      { key: 'mid4', pos: 'MID', row: 3, col: 1 },
      { key: 'mid5', pos: 'MID', row: 3, col: 2 },
      { key: 'att1', pos: 'ATT', row: 4, col: 0 },
    ],
  },
  '3-4-3': {
    label: '3-4-3',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 0 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0 },
      { key: 'def2', pos: 'DEF', row: 1, col: 1 },
      { key: 'def3', pos: 'DEF', row: 1, col: 2 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0 },
      { key: 'mid2', pos: 'MID', row: 2, col: 1 },
      { key: 'mid3', pos: 'MID', row: 2, col: 2 },
      { key: 'mid4', pos: 'MID', row: 2, col: 3 },
      { key: 'att1', pos: 'ATT', row: 3, col: 0 },
      { key: 'att2', pos: 'ATT', row: 3, col: 1 },
      { key: 'att3', pos: 'ATT', row: 3, col: 2 },
    ],
  },
  '5-3-2': {
    label: '5-3-2',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 0 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0 },
      { key: 'def2', pos: 'DEF', row: 1, col: 1 },
      { key: 'def3', pos: 'DEF', row: 1, col: 2 },
      { key: 'def4', pos: 'DEF', row: 1, col: 3 },
      { key: 'def5', pos: 'DEF', row: 1, col: 4 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0 },
      { key: 'mid2', pos: 'MID', row: 2, col: 1 },
      { key: 'mid3', pos: 'MID', row: 2, col: 2 },
      { key: 'att1', pos: 'ATT', row: 3, col: 0 },
      { key: 'att2', pos: 'ATT', row: 3, col: 1 },
    ],
  },
};

/** All formation keys */
export const FORMATION_KEYS = Object.keys(FORMATIONS);

/** Default formation */
export const DEFAULT_FORMATION = '4-3-3';
