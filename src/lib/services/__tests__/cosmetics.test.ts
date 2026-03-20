import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';

import {
  getUserCosmetics, getEquippedCosmetics, getBatchEquippedCosmetics,
  equipCosmetic, getAllCosmetics,
} from '../cosmetics';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('getUserCosmetics', () => {
  it('returns cosmetics with mapped definitions', async () => {
    mockTable('user_cosmetics', [{
      id: 'uc1', user_id: 'u1', cosmetic_id: 'cd1', source: 'mystery_box',
      equipped: true, acquired_at: '2025-01-01',
      cosmetic_definitions: { id: 'cd1', key: 'gold_frame', type: 'frame', name: 'Gold Frame', rarity: 'rare', css_class: 'ring-gold' },
    }]);
    const result = await getUserCosmetics('u1');
    expect(result).toHaveLength(1);
    expect(result[0].cosmetic_id).toBe('cd1');
    expect(result[0].cosmetic.name).toBe('Gold Frame');
  });

  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('user_cosmetics', null, { message: 'err' });
    expect(await getUserCosmetics('u1')).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('returns [] when null data', async () => {
    mockTable('user_cosmetics', null);
    expect(await getUserCosmetics('u1')).toEqual([]);
  });
});

describe('getEquippedCosmetics', () => {
  it('returns only equipped cosmetics', async () => {
    mockTable('user_cosmetics', [{
      id: 'uc1', user_id: 'u1', cosmetic_id: 'cd1', source: 'achievement',
      equipped: true, acquired_at: '2025-01-01',
      cosmetic_definitions: { id: 'cd1', key: 'pro_title', type: 'title', name: 'Pro', rarity: 'epic', css_class: null },
    }]);
    const result = await getEquippedCosmetics('u1');
    expect(result).toHaveLength(1);
    expect(result[0].equipped).toBe(true);
  });

  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('user_cosmetics', null, { message: 'err' });
    expect(await getEquippedCosmetics('u1')).toEqual([]);
    consoleSpy.mockRestore();
  });
});

describe('getBatchEquippedCosmetics', () => {
  it('returns empty Map for empty userIds', async () => {
    const result = await getBatchEquippedCosmetics([]);
    expect(result.size).toBe(0);
  });

  it('maps frame and title cosmetics per user', async () => {
    mockTable('user_cosmetics', [
      { user_id: 'u1', cosmetic_definitions: { type: 'frame', name: 'Gold', rarity: 'rare', css_class: 'ring-gold' } },
      { user_id: 'u1', cosmetic_definitions: { type: 'title', name: 'Pro', rarity: 'epic', css_class: null } },
      { user_id: 'u2', cosmetic_definitions: { type: 'frame', name: 'Silver', rarity: 'common', css_class: 'ring-silver' } },
    ]);
    const result = await getBatchEquippedCosmetics(['u1', 'u2']);
    expect(result.get('u1')?.frameCssClass).toBe('ring-gold');
    expect(result.get('u1')?.titleName).toBe('Pro');
    expect(result.get('u1')?.titleRarity).toBe('epic');
    expect(result.get('u2')?.frameCssClass).toBe('ring-silver');
    expect(result.get('u2')?.titleName).toBeNull();
  });

  it('deduplicates userIds', async () => {
    mockTable('user_cosmetics', []);
    await getBatchEquippedCosmetics(['u1', 'u1', 'u1']);
    // Should work without issues
  });

  it('returns empty Map on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('user_cosmetics', null, { message: 'err' });
    const result = await getBatchEquippedCosmetics(['u1']);
    expect(result.size).toBe(0);
    consoleSpy.mockRestore();
  });

  it('initializes missing users with null values', async () => {
    mockTable('user_cosmetics', [
      { user_id: 'u1', cosmetic_definitions: { type: 'frame', name: 'X', rarity: 'common', css_class: 'x' } },
    ]);
    const result = await getBatchEquippedCosmetics(['u1']);
    const entry = result.get('u1')!;
    expect(entry.frameCssClass).toBe('x');
    expect(entry.titleName).toBeNull();
    expect(entry.titleRarity).toBeUndefined();
  });
});

describe('equipCosmetic', () => {
  it('equips via RPC', async () => {
    mockRpc('equip_cosmetic', { ok: true });
    const result = await equipCosmetic('cd1');
    expect(result).toEqual({ ok: true });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('equip_cosmetic', { p_cosmetic_id: 'cd1' });
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('equip_cosmetic', null, { message: 'Not owned' });
    expect(await equipCosmetic('cd1')).toEqual({ ok: false, error: 'Not owned' });
    consoleSpy.mockRestore();
  });

  it('returns error when RPC returns ok=false', async () => {
    mockRpc('equip_cosmetic', { ok: false, error: 'Max equipped' });
    expect(await equipCosmetic('cd1')).toEqual({ ok: false, error: 'Max equipped' });
  });

  it('handles null error in failure', async () => {
    mockRpc('equip_cosmetic', { ok: false });
    expect(await equipCosmetic('cd1')).toEqual({ ok: false, error: 'Unknown error' });
  });
});

describe('getAllCosmetics', () => {
  it('returns active cosmetic definitions', async () => {
    const defs = [{ id: 'cd1', key: 'gold_frame', type: 'frame', name: 'Gold Frame', rarity: 'rare' }];
    mockTable('cosmetic_definitions', defs);
    expect(await getAllCosmetics()).toEqual(defs);
  });

  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('cosmetic_definitions', null, { message: 'err' });
    expect(await getAllCosmetics()).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('returns [] when null data', async () => {
    mockTable('cosmetic_definitions', null);
    expect(await getAllCosmetics()).toEqual([]);
  });
});
