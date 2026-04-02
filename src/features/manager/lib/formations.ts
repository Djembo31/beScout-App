import type { Pos } from '@/types';
import type { Formation } from '../store/managerStore';

export interface SlotDef {
  key: string;
  pos: Pos;
  /** Row from bottom: 0=GK, 1=DEF, 2=MID, 3=ATT */
  row: number;
  /** Column position 0-2 (fractional for centering odd counts) */
  col: number;
}

export const FORMATIONS: Record<Formation, { label: string; slots: SlotDef[] }> = {
  '4-3-3': {
    label: '4-3-3',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 1 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0 },
      { key: 'def2', pos: 'DEF', row: 1, col: 0.66 },
      { key: 'def3', pos: 'DEF', row: 1, col: 1.33 },
      { key: 'def4', pos: 'DEF', row: 1, col: 2 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0.33 },
      { key: 'mid2', pos: 'MID', row: 2, col: 1 },
      { key: 'mid3', pos: 'MID', row: 2, col: 1.66 },
      { key: 'att1', pos: 'ATT', row: 3, col: 0.33 },
      { key: 'att2', pos: 'ATT', row: 3, col: 1 },
      { key: 'att3', pos: 'ATT', row: 3, col: 1.66 },
    ],
  },
  '4-4-2': {
    label: '4-4-2',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 1 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0 },
      { key: 'def2', pos: 'DEF', row: 1, col: 0.66 },
      { key: 'def3', pos: 'DEF', row: 1, col: 1.33 },
      { key: 'def4', pos: 'DEF', row: 1, col: 2 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0 },
      { key: 'mid2', pos: 'MID', row: 2, col: 0.66 },
      { key: 'mid3', pos: 'MID', row: 2, col: 1.33 },
      { key: 'mid4', pos: 'MID', row: 2, col: 2 },
      { key: 'att1', pos: 'ATT', row: 3, col: 0.66 },
      { key: 'att2', pos: 'ATT', row: 3, col: 1.33 },
    ],
  },
  '3-5-2': {
    label: '3-5-2',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 1 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0.33 },
      { key: 'def2', pos: 'DEF', row: 1, col: 1 },
      { key: 'def3', pos: 'DEF', row: 1, col: 1.66 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0 },
      { key: 'mid2', pos: 'MID', row: 2, col: 0.5 },
      { key: 'mid3', pos: 'MID', row: 2, col: 1 },
      { key: 'mid4', pos: 'MID', row: 2, col: 1.5 },
      { key: 'mid5', pos: 'MID', row: 2, col: 2 },
      { key: 'att1', pos: 'ATT', row: 3, col: 0.66 },
      { key: 'att2', pos: 'ATT', row: 3, col: 1.33 },
    ],
  },
  '3-4-3': {
    label: '3-4-3',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 1 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0.33 },
      { key: 'def2', pos: 'DEF', row: 1, col: 1 },
      { key: 'def3', pos: 'DEF', row: 1, col: 1.66 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0 },
      { key: 'mid2', pos: 'MID', row: 2, col: 0.66 },
      { key: 'mid3', pos: 'MID', row: 2, col: 1.33 },
      { key: 'mid4', pos: 'MID', row: 2, col: 2 },
      { key: 'att1', pos: 'ATT', row: 3, col: 0.33 },
      { key: 'att2', pos: 'ATT', row: 3, col: 1 },
      { key: 'att3', pos: 'ATT', row: 3, col: 1.66 },
    ],
  },
  '4-2-3-1': {
    label: '4-2-3-1',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 1 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0 },
      { key: 'def2', pos: 'DEF', row: 1, col: 0.66 },
      { key: 'def3', pos: 'DEF', row: 1, col: 1.33 },
      { key: 'def4', pos: 'DEF', row: 1, col: 2 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0.66 },
      { key: 'mid2', pos: 'MID', row: 2, col: 1.33 },
      { key: 'mid3', pos: 'MID', row: 3, col: 0.33 },
      { key: 'mid4', pos: 'MID', row: 3, col: 1 },
      { key: 'mid5', pos: 'MID', row: 3, col: 1.66 },
      { key: 'att1', pos: 'ATT', row: 4, col: 1 },
    ],
  },
};

/** Get position color for slot badges */
export function getSlotColor(pos: Pos): string {
  switch (pos) {
    case 'GK': return 'emerald';
    case 'DEF': return 'amber';
    case 'MID': return 'sky';
    case 'ATT': return 'rose';
    default: return 'white';
  }
}
