import type { Pos } from '@/types';

export type ManagerTab = 'portfolio' | 'kaufen' | 'angebote' | 'spieler' | 'kader' | 'bestand' | 'compare' | 'transferlist' | 'scouting' | 'offers';

export type SquadSize = '11' | '6';

export type FormationId =
  | '4-3-3' | '4-4-2' | '3-5-2' | '5-3-2'
  | '2-2-1' | '3-1-1' | '1-3-1' | '2-1-2' | '1-2-2';

export type SquadSlot = {
  pos: Pos;
  row: number; // 0=GK (bottom), 1=DEF, 2=MID, 3=ATT (top)
  col: number; // position within the row (0-indexed, left to right)
  playerId?: string;
};

export type SquadFormation = {
  id: FormationId;
  name: string;
  slots: SquadSlot[];
};

export type SquadPreset = {
  name: string;
  formationId: FormationId;
  assignments: Record<number, string>; // slotIndex → playerId
};

export type CompareSlot = {
  playerId: string | null;
};
