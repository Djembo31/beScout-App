import { describe, it, expect } from 'vitest';
import { excludeOwnBids, bestForeignBidCents } from '@/lib/orderbook';

// Slice 416: SSOT der Eigene-Gebot-Exclusion (Welle 1.6). Eigenes Kaufgebot
// darf nicht als höchste Markt-Nachfrage erscheinen (accept_offer-Guard).

const bid = (sender_id: string, price: number) => ({ id: `${sender_id}-${price}`, sender_id, price });

describe('excludeOwnBids', () => {
  it('removes bids from the given user', () => {
    const bids = [bid('u1', 200), bid('u2', 300), bid('u1', 150)];
    expect(excludeOwnBids(bids, 'u1')).toEqual([bid('u2', 300)]);
  });

  it('returns all bids when userId is undefined (logged-out)', () => {
    const bids = [bid('u1', 200), bid('u2', 300)];
    expect(excludeOwnBids(bids, undefined)).toEqual(bids);
  });

  it('returns empty array unchanged', () => {
    expect(excludeOwnBids([], 'u1')).toEqual([]);
  });

  it('returns all bids when none match the user', () => {
    const bids = [bid('u2', 300), bid('u3', 100)];
    expect(excludeOwnBids(bids, 'u1')).toEqual(bids);
  });
});

describe('bestForeignBidCents', () => {
  it('returns the highest foreign bid in cents, ignoring own', () => {
    // own 300 is higher but must be ignored
    const bids = [bid('u1', 300), bid('u2', 200), bid('u3', 250)];
    expect(bestForeignBidCents(bids, 'u1')).toBe(250);
  });

  it('returns null when only own bids exist', () => {
    expect(bestForeignBidCents([bid('u1', 300)], 'u1')).toBeNull();
  });

  it('returns null on empty input', () => {
    expect(bestForeignBidCents([], undefined)).toBeNull();
  });

  it('includes all bids when logged-out (userId undefined)', () => {
    const bids = [bid('u1', 300), bid('u2', 200)];
    expect(bestForeignBidCents(bids, undefined)).toBe(300);
  });
});
