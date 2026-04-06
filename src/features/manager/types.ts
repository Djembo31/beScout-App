import type { Pos } from '@/types';

// ── Squad Size & Formations ──

export type SquadSize = '11' | '7';

export type FormationId =
  | '4-3-3' | '4-4-2' | '3-5-2' | '5-3-2'
  | '2-2-2' | '3-2-1' | '2-3-1' | '3-1-2' | '1-3-2';

export type SquadSlot = {
  pos: Pos;
  row: number;
  col: number;
};

export type SquadFormation = {
  id: FormationId;
  name: string;
  slots: SquadSlot[];
};

// ── Manager Store Types ──

export type StripSort = 'l5' | 'value' | 'fitness' | 'alpha';

export type IntelTab = 'stats' | 'form' | 'markt';

export type ManagerPreset = {
  name: string;
  squadSize: SquadSize;
  formationId: FormationId;
  assignments: Record<number, string>;
  equipmentPlan: Record<number, string>;
};
