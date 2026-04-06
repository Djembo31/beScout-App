import { create } from 'zustand';
import type { Pos } from '@/types';
import type { FormationId, SquadSize, StripSort, IntelTab, ManagerPreset } from '../types';
import { DEFAULT_FORMATIONS, DEFAULT_SQUAD_SIZE, MANAGER_PRESET_KEY, MANAGER_SQUAD_SIZE_KEY } from '../lib/formations';

// ── Helpers: localStorage with safe fallback ──

function loadSquadSize(): SquadSize {
  try {
    const v = localStorage.getItem(MANAGER_SQUAD_SIZE_KEY) as SquadSize | null;
    return v === '7' || v === '11' ? v : DEFAULT_SQUAD_SIZE;
  } catch { return DEFAULT_SQUAD_SIZE; }
}

function loadPresets(): ManagerPreset[] {
  try {
    const raw = localStorage.getItem(MANAGER_PRESET_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePresets(presets: ManagerPreset[]) {
  try { localStorage.setItem(MANAGER_PRESET_KEY, JSON.stringify(presets)); } catch { /* ignore */ }
}

function saveSquadSize(size: SquadSize) {
  try { localStorage.setItem(MANAGER_SQUAD_SIZE_KEY, size); } catch { /* ignore */ }
}

// ── Store ──

interface ManagerState {
  // Formation
  squadSize: SquadSize;
  formationId: FormationId;
  assignments: Map<number, string>;
  equipmentPlan: Map<number, string>;

  // Intel Panel
  selectedPlayerId: string | null;
  intelTab: IntelTab;
  intelOpen: boolean;

  // Squad Strip
  stripSort: StripSort;
  stripFilterPos: Pos | 'all';

  // Presets
  presets: ManagerPreset[];

  // Actions: Formation
  setSquadSize: (size: SquadSize) => void;
  setFormationId: (id: FormationId) => void;
  assignPlayer: (slotIndex: number, playerId: string) => void;
  removePlayer: (slotIndex: number) => void;
  clearAssignments: () => void;

  // Actions: Equipment
  planEquipment: (slotIndex: number, equipmentId: string) => void;
  unplanEquipment: (slotIndex: number) => void;
  clearEquipmentPlan: () => void;
  pruneEquipmentPlan: (validIds: Set<string>) => void;

  // Actions: Intel Panel
  selectPlayer: (id: string | null) => void;
  setIntelTab: (tab: IntelTab) => void;
  setIntelOpen: (open: boolean) => void;

  // Actions: Squad Strip
  setStripSort: (sort: StripSort) => void;
  setStripFilterPos: (pos: Pos | 'all') => void;

  // Actions: Presets
  savePreset: (name: string) => void;
  loadPreset: (preset: ManagerPreset) => void;
  deletePreset: (name: string) => void;
}

export const useManagerStore = create<ManagerState>((set, get) => {
  const initialSize = loadSquadSize();

  return {
    // ── Initial State ──
    squadSize: initialSize,
    formationId: DEFAULT_FORMATIONS[initialSize],
    assignments: new Map(),
    equipmentPlan: new Map(),

    selectedPlayerId: null,
    intelTab: 'stats',
    intelOpen: false,

    stripSort: 'l5',
    stripFilterPos: 'all',

    presets: loadPresets(),

    // ── Formation Actions ──
    setSquadSize: (squadSize) => {
      const formationId = DEFAULT_FORMATIONS[squadSize];
      saveSquadSize(squadSize);
      set({ squadSize, formationId, assignments: new Map(), equipmentPlan: new Map() });
    },

    setFormationId: (formationId) => {
      set({ formationId, assignments: new Map(), equipmentPlan: new Map() });
    },

    assignPlayer: (slotIndex, playerId) => set((s) => {
      const next = new Map(s.assignments);
      // Remove player from any other slot first
      Array.from(next.entries()).forEach(([idx, pid]) => {
        if (pid === playerId) next.delete(idx);
      });
      next.set(slotIndex, playerId);
      return { assignments: next };
    }),

    removePlayer: (slotIndex) => set((s) => {
      const nextAssign = new Map(s.assignments);
      nextAssign.delete(slotIndex);
      const nextEquip = new Map(s.equipmentPlan);
      nextEquip.delete(slotIndex);
      return { assignments: nextAssign, equipmentPlan: nextEquip };
    }),

    clearAssignments: () => set({ assignments: new Map(), equipmentPlan: new Map() }),

    // ── Equipment Actions ──
    planEquipment: (slotIndex, equipmentId) => set((s) => {
      const next = new Map(s.equipmentPlan);
      // Remove same equipment from any other slot
      Array.from(next.entries()).forEach(([idx, eid]) => {
        if (eid === equipmentId) next.delete(idx);
      });
      next.set(slotIndex, equipmentId);
      return { equipmentPlan: next };
    }),

    unplanEquipment: (slotIndex) => set((s) => {
      const next = new Map(s.equipmentPlan);
      next.delete(slotIndex);
      return { equipmentPlan: next };
    }),

    clearEquipmentPlan: () => set({ equipmentPlan: new Map() }),

    pruneEquipmentPlan: (validIds) => set((s) => {
      const next = new Map<number, string>();
      Array.from(s.equipmentPlan.entries()).forEach(([idx, eid]) => {
        if (validIds.has(eid)) next.set(idx, eid);
      });
      return { equipmentPlan: next };
    }),

    // ── Intel Panel Actions ──
    selectPlayer: (selectedPlayerId) => set({ selectedPlayerId, intelOpen: !!selectedPlayerId }),
    setIntelTab: (intelTab) => set({ intelTab }),
    setIntelOpen: (intelOpen) => set(intelOpen ? {} : { intelOpen, selectedPlayerId: null }),

    // ── Squad Strip Actions ──
    setStripSort: (stripSort) => set({ stripSort }),
    setStripFilterPos: (stripFilterPos) => set({ stripFilterPos }),

    // ── Preset Actions ──
    savePreset: (name) => {
      const s = get();
      const preset: ManagerPreset = {
        name,
        squadSize: s.squadSize,
        formationId: s.formationId,
        assignments: Object.fromEntries(s.assignments),
        equipmentPlan: Object.fromEntries(s.equipmentPlan),
      };
      const updated = [...s.presets.filter(p => p.name !== name), preset].slice(-5);
      savePresets(updated);
      set({ presets: updated });
    },

    loadPreset: (preset) => {
      saveSquadSize(preset.squadSize);
      set({
        squadSize: preset.squadSize,
        formationId: preset.formationId,
        assignments: new Map(Object.entries(preset.assignments).map(([k, v]) => [Number(k), v])),
        equipmentPlan: new Map(Object.entries(preset.equipmentPlan).map(([k, v]) => [Number(k), v])),
      });
    },

    deletePreset: (name) => {
      const updated = get().presets.filter(p => p.name !== name);
      savePresets(updated);
      set({ presets: updated });
    },
  };
});
