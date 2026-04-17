// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { computePlayerFloor, computeHoldingPnL } from '@/lib/playerMath';
import type { Player } from '@/types';

// Cast-Helper: Test-Inputs auf das Subset das computePlayerFloor braucht.
// Unterfelder wie isOwn/sellerHandle sind fuer die reine Math-Logic irrelevant.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asPlayer = (p: any): Pick<Player, 'listings' | 'prices'> => p;

describe('computePlayerFloor', () => {
  it('returns Math.min of listings when listings exist', () => {
    const p = asPlayer({
      listings: [{ price: 300 }, { price: 150 }, { price: 200 }],
      prices: { floor: 500, referencePrice: 600, lastTrade: 0, change24h: 0 },
    });
    expect(computePlayerFloor(p)).toBe(150);
  });

  it('falls back to prices.floor when listings empty', () => {
    const p = asPlayer({ listings: [], prices: { floor: 250, referencePrice: 400, lastTrade: 0, change24h: 0 } });
    expect(computePlayerFloor(p)).toBe(250);
  });

  it('falls back to prices.referencePrice when floor is null', () => {
    const p = asPlayer({ listings: [], prices: { floor: null, referencePrice: 400, lastTrade: 0, change24h: 0 } });
    expect(computePlayerFloor(p)).toBe(400);
  });

  it('falls back to 0 when both floor and referencePrice are null', () => {
    const p = asPlayer({ listings: [], prices: { floor: null, referencePrice: null, lastTrade: 0, change24h: 0 } });
    expect(computePlayerFloor(p)).toBe(0);
  });

  it('returns 0 for empty listings and minimal prices', () => {
    const p = asPlayer({ listings: [], prices: { lastTrade: 0, change24h: 0 } });
    expect(computePlayerFloor(p)).toBe(0);
  });
});

describe('computeHoldingPnL', () => {
  it('computes positive PnL when floor > avgBuyPrice', () => {
    const result = computeHoldingPnL(500, { avgBuyPriceBsd: 400, quantity: 10 });
    expect(result.pnl).toBe(1000); // (500-400)*10
    expect(result.pnlPct).toBe(25); // ((500-400)/400)*100
    expect(result.up).toBe(true);
  });

  it('computes negative PnL when floor < avgBuyPrice', () => {
    const result = computeHoldingPnL(300, { avgBuyPriceBsd: 400, quantity: 5 });
    expect(result.pnl).toBe(-500); // (300-400)*5
    expect(result.pnlPct).toBe(-25);
    expect(result.up).toBe(false);
  });

  it('returns zero PnL when floor equals avgBuyPrice', () => {
    const result = computeHoldingPnL(400, { avgBuyPriceBsd: 400, quantity: 1 });
    expect(result.pnl).toBe(0);
    expect(result.pnlPct).toBe(0);
    expect(result.up).toBe(true); // pnl >= 0
  });

  it('returns pnlPct=0 when avgBuyPrice is 0 (division guard)', () => {
    const result = computeHoldingPnL(500, { avgBuyPriceBsd: 0, quantity: 5 });
    expect(result.pnl).toBe(2500); // (500-0)*5
    expect(result.pnlPct).toBe(0); // guard: avgBuyPriceBsd=0
    expect(result.up).toBe(true);
  });
});
