import { describe, it, expect } from 'vitest';
import { resolveBuyPriceCents } from '../marketContent.priceCents';
import type { Listing } from '@/types';

const mkListing = (priceBsd: number, id = 'l'): Listing => ({
  id,
  isOwn: false,
  sellerHandle: 'seller',
  sellerName: 'Seller',
  price: priceBsd, // BSD!
  qty: 1,
  expiresAt: 0,
});

describe('resolveBuyPriceCents (Slice 033 — Money-Display-Drift Lock)', () => {
  it('returns ipo.price unchanged when isIpo=true (DB cents passthrough)', () => {
    expect(
      resolveBuyPriceCents({ isIpo: true, ipoPriceCents: 1234, listings: [], floorBsd: 0 }),
    ).toBe(1234);
  });

  it('falls back to listings when isIpo=true but ipoPriceCents missing', () => {
    expect(
      resolveBuyPriceCents({ isIpo: true, listings: [mkListing(10.6)], floorBsd: 0 }),
    ).toBe(1060);
  });

  it('multiplies min(listings.price) BSD by 100 → cents', () => {
    // Real-world bug: order.price=1060 cents, listing.price=10.6 BSD,
    // pre-fix returned 10 (treated BSD as cents → 100x too low).
    expect(
      resolveBuyPriceCents({
        isIpo: false,
        listings: [mkListing(10.6, 'a'), mkListing(15.2, 'b')],
        floorBsd: 0,
      }),
    ).toBe(1060);
  });

  it('falls back to floorBsd * 100 when no listings', () => {
    expect(
      resolveBuyPriceCents({ isIpo: false, listings: [], floorBsd: 8.0 }),
    ).toBe(800);
  });

  it('returns 0 when no source available', () => {
    expect(
      resolveBuyPriceCents({ isIpo: false, listings: [], floorBsd: 0 }),
    ).toBe(0);
  });

  it('rounds half-cent values to nearest cent', () => {
    // 10.605 BSD * 100 = 1060.5 → rounded to 1061
    expect(
      resolveBuyPriceCents({ isIpo: false, listings: [mkListing(10.605)], floorBsd: 0 }),
    ).toBe(1061);
  });

  it('handles single-listing player', () => {
    expect(
      resolveBuyPriceCents({ isIpo: false, listings: [mkListing(7.5)], floorBsd: 0 }),
    ).toBe(750);
  });

  it('handles undefined floorBsd defensively', () => {
    expect(
      resolveBuyPriceCents({ isIpo: false, listings: [], floorBsd: undefined }),
    ).toBe(0);
  });
});
