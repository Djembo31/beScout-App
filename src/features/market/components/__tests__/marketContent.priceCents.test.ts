import { describe, it, expect } from 'vitest';
import { resolveBuyPriceCents } from '../marketContent.priceCents';

describe('resolveBuyPriceCents (Slice 033 Money-Display-Lock + Slice 303 Floor-Source-of-Truth)', () => {
  it('returns ipo.price unchanged when isIpo=true (DB cents passthrough)', () => {
    expect(
      resolveBuyPriceCents({ isIpo: true, ipoPriceCents: 1234, floorBsd: 0 }),
    ).toBe(1234);
  });

  it('falls back to floorBsd when isIpo=true but ipoPriceCents missing', () => {
    // Slice 303: kein listings-Branch mehr — Fallback ist die einzige Floor-Quelle.
    expect(
      resolveBuyPriceCents({ isIpo: true, floorBsd: 10.6 }),
    ).toBe(1060);
  });

  it('multiplies floorBsd (BSD) by 100 → cents (Slice 033 100x-drift lock)', () => {
    // Real-world bug: floor_price=1060 cents, prices.floor=10.6 BSD,
    // pre-fix returned 10 (treated BSD as cents → 100x too low).
    expect(
      resolveBuyPriceCents({ isIpo: false, floorBsd: 10.6 }),
    ).toBe(1060);
  });

  it('returns 0 when no source available', () => {
    expect(
      resolveBuyPriceCents({ isIpo: false, floorBsd: 0 }),
    ).toBe(0);
  });

  it('rounds half-cent values to nearest cent', () => {
    // 10.605 BSD * 100 = 1060.5 → rounded to 1061
    expect(
      resolveBuyPriceCents({ isIpo: false, floorBsd: 10.605 }),
    ).toBe(1061);
  });

  it('handles a typical floor value', () => {
    expect(
      resolveBuyPriceCents({ isIpo: false, floorBsd: 7.5 }),
    ).toBe(750);
  });

  it('handles undefined floorBsd defensively', () => {
    expect(
      resolveBuyPriceCents({ isIpo: false, floorBsd: undefined }),
    ).toBe(0);
  });

  it('ignores legacy listings arg (no longer drives price)', () => {
    // Slice 303: listings bleibt im Interface für Aufruf-Kompat, beeinflusst Preis NICHT.
    expect(
      resolveBuyPriceCents({
        isIpo: false,
        listings: [{ id: 'l', isOwn: false, sellerHandle: 's', sellerName: 'S', price: 99.9, qty: 1, expiresAt: 0 }],
        floorBsd: 7.5,
      }),
    ).toBe(750);
  });
});
