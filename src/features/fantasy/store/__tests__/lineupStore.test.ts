import { describe, it, expect, beforeEach } from 'vitest';
import { useLineupStore } from '../lineupStore';

/**
 * Slice 272 — Duplicate-Defense-in-Depth Tests.
 * Verifiziert dass selectPlayer + setBenchSlot keine Duplicate-States erzeugen können.
 *
 * DB-Server-Guard rpc_save_lineup blockt duplicate_player beim Save (Money-Path safe),
 * aber UI sollte gar keinen Duplicate-State darstellen.
 */
describe('lineupStore — Slice 272 Duplicate-Defense', () => {
  beforeEach(() => {
    // Reset store between tests
    useLineupStore.getState().resetLineup('1-2-2-2');
  });

  describe('selectPlayer — Move-Semantik (kein Duplicate auf 2 Slots)', () => {
    it('moves player from old slot when re-selected on new slot', () => {
      const { selectPlayer } = useLineupStore.getState();
      selectPlayer('p-1', 'MID', 0);
      selectPlayer('p-1', 'MID', 1); // same player, different slot
      const players = useLineupStore.getState().selectedPlayers;
      expect(players).toHaveLength(1);
      expect(players[0]).toMatchObject({ playerId: 'p-1', slot: 1 });
    });

    it('replaces existing slot occupant when other player chosen', () => {
      const { selectPlayer } = useLineupStore.getState();
      selectPlayer('p-1', 'MID', 0);
      selectPlayer('p-2', 'MID', 0); // same slot, different player
      const players = useLineupStore.getState().selectedPlayers;
      expect(players).toHaveLength(1);
      expect(players[0]).toMatchObject({ playerId: 'p-2', slot: 0 });
    });

    it('removes player from bench when promoted to starter', () => {
      const { selectPlayer, setBenchSlot } = useLineupStore.getState();
      setBenchSlot('bench_o1', 'p-1');
      selectPlayer('p-1', 'MID', 0); // promote to starter
      const state = useLineupStore.getState();
      expect(state.selectedPlayers).toHaveLength(1);
      expect(state.selectedPlayers[0]).toMatchObject({ playerId: 'p-1', slot: 0 });
      expect(state.benchO1).toBeNull(); // removed from bench
    });

    it('removes player from bench-gk when promoted to starter', () => {
      const { selectPlayer, setBenchSlot } = useLineupStore.getState();
      setBenchSlot('bench_gk', 'gk-1');
      selectPlayer('gk-1', 'GK', 0);
      const state = useLineupStore.getState();
      expect(state.benchGk).toBeNull();
      expect(state.selectedPlayers).toHaveLength(1);
    });
  });

  describe('setBenchSlot — Asymmetrie behoben', () => {
    it('removes player from starter when assigned to bench', () => {
      const { selectPlayer, setBenchSlot } = useLineupStore.getState();
      selectPlayer('p-1', 'MID', 0);
      setBenchSlot('bench_o1', 'p-1'); // demote to bench
      const state = useLineupStore.getState();
      expect(state.benchO1).toBe('p-1');
      expect(state.selectedPlayers).toHaveLength(0); // removed from starter
    });

    it('keeps existing bench-deduplication (move within bench)', () => {
      const { setBenchSlot } = useLineupStore.getState();
      setBenchSlot('bench_o1', 'p-1');
      setBenchSlot('bench_o2', 'p-1'); // move within bench
      const state = useLineupStore.getState();
      expect(state.benchO1).toBeNull();
      expect(state.benchO2).toBe('p-1');
    });

    it('clears slot when playerId is null', () => {
      const { setBenchSlot } = useLineupStore.getState();
      setBenchSlot('bench_o1', 'p-1');
      setBenchSlot('bench_o1', null);
      expect(useLineupStore.getState().benchO1).toBeNull();
    });

    it('does NOT touch starter when clearing bench-slot (null)', () => {
      const { selectPlayer, setBenchSlot } = useLineupStore.getState();
      selectPlayer('p-1', 'MID', 0);
      setBenchSlot('bench_o1', null); // null-clear should not affect starter
      expect(useLineupStore.getState().selectedPlayers).toHaveLength(1);
    });
  });

  describe('Cross-validation — kein Duplicate-State erreichbar', () => {
    it('player on starter slot 0 + same player on bench-o1 → bench setzt nimmt Vorrang', () => {
      const { selectPlayer, setBenchSlot } = useLineupStore.getState();
      selectPlayer('p-1', 'MID', 0);
      setBenchSlot('bench_o1', 'p-1');
      const state = useLineupStore.getState();
      // Starter geleert, Bench-O1 belegt — kein Duplicate
      expect(state.selectedPlayers.find(p => p.playerId === 'p-1')).toBeUndefined();
      expect(state.benchO1).toBe('p-1');
    });

    it('player on bench-o1 + same player on starter slot 0 → starter nimmt Vorrang', () => {
      const { selectPlayer, setBenchSlot } = useLineupStore.getState();
      setBenchSlot('bench_o1', 'p-1');
      selectPlayer('p-1', 'MID', 0);
      const state = useLineupStore.getState();
      expect(state.benchO1).toBeNull();
      expect(state.selectedPlayers.find(p => p.playerId === 'p-1')).toBeDefined();
    });
  });
});
