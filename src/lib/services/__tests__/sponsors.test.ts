import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockTable, resetMocks } from '@/test/mocks/supabase';

import {
  getSponsorForPlacement, getAllSponsors, getClubSponsors,
  createSponsor, updateSponsor, deleteSponsor,
} from '../sponsors';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('getSponsorForPlacement', () => {
  it('returns active sponsor for placement', async () => {
    const sponsor = { id: 's1', name: 'Nike', placement: 'home_hero', is_active: true, ends_at: null };
    mockTable('sponsors', [sponsor]);
    const result = await getSponsorForPlacement('home_hero');
    expect(result).toEqual(sponsor);
  });

  it('filters out expired sponsors', async () => {
    mockTable('sponsors', [{ id: 's1', name: 'Expired', ends_at: '2020-01-01T00:00:00Z' }]);
    const result = await getSponsorForPlacement('home_hero');
    expect(result).toBeNull();
  });

  it('returns null on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('sponsors', null, { message: 'err' });
    expect(await getSponsorForPlacement('home_hero')).toBeNull();
    consoleSpy.mockRestore();
  });

  it('returns null when no sponsors', async () => {
    mockTable('sponsors', []);
    expect(await getSponsorForPlacement('home_hero')).toBeNull();
  });

  it('returns null when data is null', async () => {
    mockTable('sponsors', null);
    expect(await getSponsorForPlacement('home_hero')).toBeNull();
  });

  it('queries with clubId when provided', async () => {
    mockTable('sponsors', [{ id: 's1', name: 'Club Sponsor', ends_at: null }]);
    const result = await getSponsorForPlacement('club_hero', 'club-1');
    expect(result).toBeTruthy();
  });
});

describe('getAllSponsors', () => {
  it('returns all sponsors', async () => {
    const sponsors = [{ id: 's1' }, { id: 's2' }];
    mockTable('sponsors', sponsors);
    expect(await getAllSponsors()).toEqual(sponsors);
  });
  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('sponsors', null, { message: 'err' });
    expect(await getAllSponsors()).toEqual([]);
    consoleSpy.mockRestore();
  });
  it('returns [] when null', async () => {
    mockTable('sponsors', null);
    expect(await getAllSponsors()).toEqual([]);
  });
});

describe('getClubSponsors', () => {
  it('returns sponsors for a club', async () => {
    mockTable('sponsors', [{ id: 's1', club_id: 'c1' }]);
    expect(await getClubSponsors('c1')).toHaveLength(1);
  });
  it('returns [] on error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTable('sponsors', null, { message: 'err' });
    expect(await getClubSponsors('c1')).toEqual([]);
    consoleSpy.mockRestore();
  });
});

describe('createSponsor', () => {
  it('creates sponsor and returns id', async () => {
    mockTable('sponsors', { id: 's-new' });
    const result = await createSponsor({
      name: 'Nike', logo_url: '/nike.png', placement: 'home_hero', created_by: 'admin-1',
    });
    expect(result).toEqual({ success: true, id: 's-new' });
  });

  it('returns error on insert failure', async () => {
    mockTable('sponsors', null, { message: 'Insert failed' });
    const result = await createSponsor({
      name: 'Nike', logo_url: '/nike.png', placement: 'home_hero', created_by: 'admin-1',
    });
    expect(result).toEqual({ success: false, error: 'Insert failed' });
  });

  it('handles optional params', async () => {
    mockTable('sponsors', { id: 's-2' });
    const result = await createSponsor({
      name: 'Adidas', logo_url: '/adidas.png', link_url: 'https://adidas.com',
      placement: 'market_top', club_id: 'c1', priority: 10,
      starts_at: '2025-01-01', ends_at: '2025-12-31', created_by: 'admin-1',
    });
    expect(result.success).toBe(true);
  });
});

describe('updateSponsor', () => {
  it('updates sponsor fields', async () => {
    mockTable('sponsors', null);
    const result = await updateSponsor('s1', { name: 'Updated', is_active: false });
    expect(result).toEqual({ success: true });
  });

  it('returns error on failure', async () => {
    mockTable('sponsors', null, { message: 'Update failed' });
    expect(await updateSponsor('s1', { name: 'X' })).toEqual({ success: false, error: 'Update failed' });
  });
});

describe('deleteSponsor', () => {
  it('deletes sponsor', async () => {
    mockTable('sponsors', null);
    expect(await deleteSponsor('s1')).toEqual({ success: true });
  });

  it('returns error on failure', async () => {
    mockTable('sponsors', null, { message: 'Delete failed' });
    expect(await deleteSponsor('s1')).toEqual({ success: false, error: 'Delete failed' });
  });
});
