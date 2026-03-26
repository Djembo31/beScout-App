import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockRpc, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/chips', () => ({ getCurrentSeason: () => '2024-25' }));

import { activateChip, deactivateChip, getEventChips, getSeasonChipUsage } from '../chips';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('activateChip', () => {
  it('activates chip via RPC', async () => {
    mockRpc('activate_chip', { ok: true, chip_id: 'cu-1', ticket_cost: 15, remaining_season_uses: 0 });
    const result = await activateChip('evt-1', 'triple_captain');
    expect(result).toEqual({ success: true, chip_usage_id: 'cu-1' });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('activate_chip', {
      p_event_id: 'evt-1', p_chip_type: 'triple_captain',
    });
  });

  it('returns error on RPC failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('activate_chip', null, { message: 'Season limit reached' });
    const result = await activateChip('evt-1', 'triple_captain');
    expect(result).toEqual({ success: false, error: 'Season limit reached' });
    consoleSpy.mockRestore();
  });

  it('catches unexpected errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabase.rpc.mockImplementationOnce(() => { throw new Error('Network crash'); });
    const result = await activateChip('evt-1', 'wildcard');
    expect(result).toEqual({ success: false, error: 'Network crash' });
    consoleSpy.mockRestore();
  });
});

describe('deactivateChip', () => {
  it('deactivates chip by usage ID and returns refund', async () => {
    mockRpc('deactivate_chip', { ok: true, tickets_refunded: 15 });
    const result = await deactivateChip('cu-123');
    expect(result).toEqual({ success: true, refunded_tickets: 15 });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('deactivate_chip', {
      p_chip_usage_id: 'cu-123',
    });
  });

  it('returns error on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('deactivate_chip', null, { message: 'Not active' });
    expect(await deactivateChip('cu-bad')).toEqual({ success: false, error: 'Not active' });
    consoleSpy.mockRestore();
  });
});

describe('getEventChips', () => {
  it('returns chips for event', async () => {
    const chips = [{ id: 'cu-1', chip_type: 'triple_captain', is_active: true }];
    mockRpc('get_event_chips', chips);
    expect(await getEventChips('evt-1')).toEqual(chips);
  });

  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('get_event_chips', null, { message: 'err' });
    expect(await getEventChips('evt-1')).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('returns [] when null data', async () => {
    mockRpc('get_event_chips', null);
    expect(await getEventChips('evt-1')).toEqual([]);
  });
});

describe('getSeasonChipUsage', () => {
  it('returns chip usage for current season', async () => {
    const usage = {
      ok: true,
      triple_captain: { used: 1, max: 1 },
      synergy_surge: { used: 0, max: 2 },
      second_chance: { used: 0, max: 2 },
      wildcard: { used: 0, max: 1 },
    };
    mockRpc('get_season_chip_usage', usage);
    const result = await getSeasonChipUsage();
    expect(result).toEqual(usage);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_season_chip_usage');
  });

  it('returns null on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRpc('get_season_chip_usage', null, { message: 'err' });
    expect(await getSeasonChipUsage()).toBeNull();
    consoleSpy.mockRestore();
  });
});
