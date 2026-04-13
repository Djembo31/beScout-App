import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockSupabaseResponse, mockSupabaseRpc } from '@/test/mocks/supabase';

import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getWatcherCount,
  getMostWatchedPlayers,
} from '../watchlist';

// ============================================
// getWatchlist
// ============================================

describe('getWatchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return watchlist entries for a user', async () => {
    const mockEntries = [
      {
        id: 'wl-1',
        player_id: 'player-1',
        alert_threshold_pct: 10,
        alert_direction: 'up',
        last_alert_price: 50000,
        created_at: '2025-06-01T00:00:00Z',
      },
      {
        id: 'wl-2',
        player_id: 'player-2',
        alert_threshold_pct: 5,
        alert_direction: 'both',
        last_alert_price: 100000,
        created_at: '2025-06-02T00:00:00Z',
      },
    ];
    mockSupabaseResponse(mockEntries);
    const result = await getWatchlist('user-1');
    expect(result).toHaveLength(2);
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlist');
  });

  it('should return empty array when user has no watchlist entries', async () => {
    mockSupabaseResponse([]);
    const result = await getWatchlist('user-no-watchlist');
    expect(result).toEqual([]);
  });

  it('should return empty array when data is null', async () => {
    mockSupabaseResponse(null);
    const result = await getWatchlist('user-1');
    expect(result).toEqual([]);
  });

  it('should throw on DB error', async () => {
    mockSupabaseResponse(null, { message: 'RLS policy violation' });
    await expect(getWatchlist('user-1')).rejects.toThrow('RLS policy violation');
  });
});

// ============================================
// addToWatchlist
// ============================================

describe('addToWatchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add player to watchlist successfully', async () => {
    mockSupabaseResponse({ id: 'wl-new' });
    await expect(addToWatchlist('user-1', 'player-1')).resolves.toBeUndefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlist');
  });

  it('should silently ignore duplicate entry (23505 unique violation)', async () => {
    // Postgres unique_violation code 23505 should be swallowed
    mockSupabaseResponse(null, { message: 'duplicate key value', code: '23505' });
    await expect(addToWatchlist('user-1', 'player-1')).resolves.toBeUndefined();
  });

  it('should throw on other DB errors', async () => {
    mockSupabaseResponse(null, { message: 'connection lost' });
    await expect(addToWatchlist('user-1', 'player-1')).rejects.toThrow('connection lost');
  });
});

// ============================================
// removeFromWatchlist
// ============================================

describe('removeFromWatchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should remove player from watchlist successfully', async () => {
    mockSupabaseResponse(null);
    await expect(removeFromWatchlist('user-1', 'player-1')).resolves.toBeUndefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlist');
  });

  it('should throw on DB error', async () => {
    mockSupabaseResponse(null, { message: 'permission denied' });
    await expect(removeFromWatchlist('user-1', 'player-1')).rejects.toThrow('permission denied');
  });
});

// ============================================
// getWatcherCount
// ============================================

describe('getWatcherCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return watcher count for a player', async () => {
    mockSupabaseResponse(null, null);
    // The count comes from the { count: 'exact', head: true } option
    // With fallback mock, count is undefined — service should handle gracefully
    const result = await getWatcherCount('player-1');
    expect(typeof result).toBe('number');
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlist');
  });

  it('should throw on DB error', async () => {
    mockSupabaseResponse(null, { message: 'connection refused' });
    await expect(getWatcherCount('player-1')).rejects.toThrow('connection refused');
  });
});

// ============================================
// getMostWatchedPlayers
// ============================================

describe('getMostWatchedPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return most watched players with data', async () => {
    const mockPlayers = [
      {
        player_id: 'player-1',
        watcher_count: 42,
        first_name: 'Ersin',
        last_name: 'Destanoglu',
        position: 'GK',
        club_name: 'Sakaryaspor',
        image_url: 'https://example.com/img.jpg',
        floor_price: 150000,
      },
      {
        player_id: 'player-2',
        watcher_count: 35,
        first_name: 'Kerem',
        last_name: 'Akturkoglu',
        position: 'ATT',
        club_name: 'Sakaryaspor',
        image_url: null,
        floor_price: 200000,
      },
    ];
    // getMostWatchedPlayers uses supabase.rpc(), not .from()
    mockSupabaseRpc(mockPlayers);
    const result = await getMostWatchedPlayers(5);
    // Service transforms snake_case to camelCase
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_most_watched_players', { p_limit: 5 });
  });

  it('should return empty array when no watched players exist', async () => {
    mockSupabaseRpc([]);
    const result = await getMostWatchedPlayers();
    expect(result).toEqual([]);
  });

  it('should return empty array when data is null', async () => {
    mockSupabaseRpc(null);
    const result = await getMostWatchedPlayers(10);
    expect(result).toEqual([]);
  });

  it('should throw on DB error', async () => {
    mockSupabaseRpc(null, { message: 'query execution failed' });
    await expect(getMostWatchedPlayers()).rejects.toThrow('query execution failed');
  });
});
