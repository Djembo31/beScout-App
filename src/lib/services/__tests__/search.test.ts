import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, resetMocks } from '@/test/mocks/supabase';

vi.mock('@/lib/clubs', () => ({
  getAllClubsCached: () => [
    { id: 'c1', name: 'Sakaryaspor', short: 'SAK', slug: 'sakaryaspor', logo: '/sak.png', league: 'TFF 1. Lig', colors: { primary: '#00AA00' } },
    { id: 'c2', name: 'Bursaspor', short: 'BUR', slug: 'bursaspor', logo: '/bur.png', league: 'TFF 1. Lig', colors: { primary: '#008800' } },
  ],
}));

import { spotlightSearch } from '../search';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('spotlightSearch', () => {
  it('returns [] for empty query', async () => {
    expect(await spotlightSearch('')).toEqual([]);
  });

  it('returns [] for query shorter than 2 chars', async () => {
    expect(await spotlightSearch('a')).toEqual([]);
  });

  it('searches clubs client-side', async () => {
    // Player + profile queries return empty (parallel via Promise.allSettled)
    mockTable('players', []);
    mockTable('profiles', []);
    const result = await spotlightSearch('sakarya');
    const clubs = result.filter(r => r.type === 'club');
    expect(clubs).toHaveLength(1);
    expect(clubs[0].clubName).toBe('Sakaryaspor');
    expect(clubs[0].href).toBe('/club/sakaryaspor');
  });

  it('searches players from DB', async () => {
    mockTable('players', [{
      id: 'p1', first_name: 'John', last_name: 'Doe', position: 'MID',
      club: 'FC Test', club_id: 'c1', floor_price: 5000, ipo_price: 3000,
      perf_l5: 7.2, image_url: '/john.png',
    }]);
    mockTable('profiles', []);
    const result = await spotlightSearch('John', 'player');
    const players = result.filter(r => r.type === 'player');
    expect(players).toHaveLength(1);
    expect(players[0].firstName).toBe('John');
    expect(players[0].href).toBe('/player/p1');
  });

  it('searches profiles with stats enrichment', async () => {
    mockTable('players', []);
    mockTable('profiles', [{ id: 'u1', handle: 'alice', display_name: 'Alice', avatar_url: null, level: 5 }]);
    mockTable('user_stats', [{ user_id: 'u1', total_score: 1500 }]);
    const result = await spotlightSearch('alice', 'profile');
    const profiles = result.filter(r => r.type === 'profile');
    expect(profiles).toHaveLength(1);
    expect(profiles[0].handle).toBe('alice');
    expect(profiles[0].totalScore).toBe(1500);
    expect(profiles[0].href).toBe('/profile/alice');
  });

  it('handles filter=all (default)', async () => {
    mockTable('players', []);
    mockTable('profiles', []);
    const result = await spotlightSearch('bursa');
    // Should include club match
    expect(result.some(r => r.type === 'club' && r.clubName === 'Bursaspor')).toBe(true);
  });

  it('handles DB errors gracefully via Promise.allSettled', async () => {
    mockTable('players', null, { message: 'DB fail' });
    mockTable('profiles', null, { message: 'DB fail' });
    // Should not throw — club results still returned
    const result = await spotlightSearch('sakarya');
    expect(result.some(r => r.type === 'club')).toBe(true);
  });

  it('returns profiles with 0 score when stats missing', async () => {
    mockTable('players', []);
    mockTable('profiles', [{ id: 'u1', handle: 'test', display_name: null, avatar_url: null, level: 1 }]);
    mockTable('user_stats', []); // no stats
    const result = await spotlightSearch('test', 'profile');
    const p = result.find(r => r.type === 'profile');
    expect(p?.totalScore).toBe(0);
  });
});
