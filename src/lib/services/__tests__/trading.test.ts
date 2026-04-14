import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockTable, mockRpc, resetMocks, mockSupabase } from '@/test/mocks/supabase';

// Mock dynamic imports used by trading.ts (fire-and-forget side effects)
vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/services/social', () => ({ checkAndUnlockAchievements: vi.fn() }));
vi.mock('@/lib/services/referral', () => ({ triggerReferralReward: vi.fn() }));
vi.mock('@/lib/services/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/services/missions', () => ({ triggerMissionProgress: vi.fn() }));
vi.mock('@/lib/notifText', () => ({ notifText: vi.fn((key: string) => key) }));

import {
  mapRpcError,
  isRestrictedFromTrading,
  buyFromMarket,
  placeSellOrder,
  buyFromOrder,
  cancelOrder,
  placeBuyOrder,
  cancelBuyOrder,
} from '../trading';

// ============================================
// mapRpcError (pure function, 9 branches)
// ============================================

describe('mapRpcError', () => {
  it('maps "insufficient balance" to insufficientBalance', () => {
    expect(mapRpcError('insufficient balance')).toBe('insufficientBalance');
  });

  it('maps "not enough" to insufficientBalance', () => {
    expect(mapRpcError('not enough funds')).toBe('insufficientBalance');
  });

  it('maps "not found" to orderNotFound', () => {
    expect(mapRpcError('Order not found')).toBe('orderNotFound');
  });

  it('maps "does not exist" to orderNotFound', () => {
    expect(mapRpcError('record does not exist')).toBe('orderNotFound');
  });

  it('maps "already liquidated" to playerLiquidated', () => {
    expect(mapRpcError('Player already liquidated')).toBe('playerLiquidated');
  });

  it('maps "liquidat" substring to playerLiquidated', () => {
    expect(mapRpcError('liquidated player error')).toBe('playerLiquidated');
  });

  it('maps "exceeds" to maxQuantityExceeded', () => {
    expect(mapRpcError('quantity exceeds limit')).toBe('maxQuantityExceeded');
  });

  it('maps "limit" to maxQuantityExceeded', () => {
    expect(mapRpcError('order limit reached')).toBe('maxQuantityExceeded');
  });

  it('maps "no open orders" to noMatchingOrders', () => {
    expect(mapRpcError('no open orders available')).toBe('noMatchingOrders');
  });

  it('maps "no matching" to noMatchingOrders', () => {
    expect(mapRpcError('no matching orders')).toBe('noMatchingOrders');
  });

  it('maps "own order" to cannotBuyOwn', () => {
    expect(mapRpcError('Cannot buy own order')).toBe('cannotBuyOwn');
  });

  it('maps "club-admin" to clubAdminRestricted', () => {
    expect(mapRpcError('club-admin restriction')).toBe('clubAdminRestricted');
  });

  it('maps "club admin" to clubAdminRestricted', () => {
    expect(mapRpcError('club admin cannot trade')).toBe('clubAdminRestricted');
  });

  it('maps "permission" to permissionDenied', () => {
    expect(mapRpcError('permission error')).toBe('permissionDenied');
  });

  it('maps "denied" to permissionDenied', () => {
    expect(mapRpcError('access denied')).toBe('permissionDenied');
  });

  it('maps "unauthorized" to permissionDenied', () => {
    expect(mapRpcError('unauthorized access')).toBe('permissionDenied');
  });

  it('maps unknown message to generic', () => {
    expect(mapRpcError('something random')).toBe('generic');
  });

  it('maps empty string to generic', () => {
    expect(mapRpcError('')).toBe('generic');
  });

  it('is case insensitive', () => {
    expect(mapRpcError('INSUFFICIENT BALANCE')).toBe('insufficientBalance');
  });
});

// ============================================
// isRestrictedFromTrading
// ============================================

describe('isRestrictedFromTrading', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns false when player not found (no club_id)', async () => {
    mockTable('players', null);
    const result = await isRestrictedFromTrading('user-1', 'player-1');
    expect(result).toBe(false);
  });

  it('returns false when player found but user is NOT club admin', async () => {
    mockTable('players', { club_id: 'club-1' });
    mockTable('club_admins', null);
    const result = await isRestrictedFromTrading('user-1', 'player-1');
    expect(result).toBe(false);
  });

  it('returns true when player found and user IS club admin', async () => {
    mockTable('players', { club_id: 'club-1' });
    mockTable('club_admins', { id: 'admin-record-1' });
    const result = await isRestrictedFromTrading('user-1', 'player-1');
    expect(result).toBe(true);
  });
});

// ============================================
// buyFromMarket
// ============================================

describe('buyFromMarket', () => {
  const userId = 'user-123';
  const playerId = 'player-456';

  beforeEach(() => {
    resetMocks();
  });

  it('throws invalidQuantity when quantity=0', async () => {
    await expect(buyFromMarket(userId, playerId, 0)).rejects.toThrow('invalidQuantity');
  });

  it('throws invalidQuantity when quantity=-1', async () => {
    await expect(buyFromMarket(userId, playerId, -1)).rejects.toThrow('invalidQuantity');
  });

  it('throws invalidQuantity when quantity is not integer (1.5)', async () => {
    await expect(buyFromMarket(userId, playerId, 1.5)).rejects.toThrow('invalidQuantity');
  });

  it('throws maxQuantityExceeded when quantity=301', async () => {
    await expect(buyFromMarket(userId, playerId, 301)).rejects.toThrow('maxQuantityExceeded');
  });

  it('throws playerNotFound when player not in DB', async () => {
    // players.select('is_liquidated') returns null
    mockTable('players', null);
    await expect(buyFromMarket(userId, playerId, 1)).rejects.toThrow('playerNotFound');
  });

  it('throws playerLiquidated when player is liquidated', async () => {
    mockTable('players', { is_liquidated: true });
    await expect(buyFromMarket(userId, playerId, 1)).rejects.toThrow('playerLiquidated');
  });

  it('throws clubAdminRestricted when user is club admin for player', async () => {
    // First call: players.is_liquidated check
    mockTable('players', { is_liquidated: false });
    // isRestrictedFromTrading calls: players.club_id, then club_admins
    mockTable('players', { club_id: 'club-1' });
    mockTable('club_admins', { id: 'admin-1' });

    await expect(buyFromMarket(userId, playerId, 1)).rejects.toThrow('clubAdminRestricted');
  });

  it('throws mapped error when RPC returns error', async () => {
    // Player exists and not liquidated
    mockTable('players', { is_liquidated: false });
    // Not restricted (no club_id)
    mockTable('players', null);
    // RPC returns error
    mockRpc('buy_player_sc', null, { message: 'insufficient balance' });

    await expect(buyFromMarket(userId, playerId, 1)).rejects.toThrow('insufficientBalance');
  });

  it('throws when RPC returns null', async () => {
    mockTable('players', { is_liquidated: false });
    mockTable('players', null); // not restricted
    mockRpc('buy_player_sc', null);

    await expect(buyFromMarket(userId, playerId, 1)).rejects.toThrow('buy_player_sc returned null');
  });

  it('returns result when RPC returns {success: true}', async () => {
    const rpcResult = { success: true, trade_id: 'trade-1', total_cost: 5000, source: 'order' };
    mockTable('players', { is_liquidated: false });
    mockTable('players', null); // not restricted
    mockRpc('buy_player_sc', rpcResult);

    const result = await buyFromMarket(userId, playerId, 1);
    expect(result.success).toBe(true);
    expect(result.trade_id).toBe('trade-1');
    expect(result.total_cost).toBe(5000);
  });

  it('returns result when RPC returns {success: false}', async () => {
    const rpcResult = { success: false, error: 'some error' };
    mockTable('players', { is_liquidated: false });
    mockTable('players', null); // not restricted
    mockRpc('buy_player_sc', rpcResult);

    const result = await buyFromMarket(userId, playerId, 1);
    expect(result.success).toBe(false);
    expect(result.error).toBe('some error');
  });
});

// ============================================
// placeSellOrder
// ============================================

describe('placeSellOrder', () => {
  const userId = 'user-123';
  const playerId = 'player-456';

  beforeEach(() => {
    resetMocks();
  });

  it('throws invalidQuantity when quantity=0', async () => {
    await expect(placeSellOrder(userId, playerId, 0, 1000)).rejects.toThrow('invalidQuantity');
  });

  it('throws maxQuantityExceeded when quantity=301', async () => {
    await expect(placeSellOrder(userId, playerId, 301, 1000)).rejects.toThrow('maxQuantityExceeded');
  });

  it('throws invalidPrice when price=0', async () => {
    await expect(placeSellOrder(userId, playerId, 1, 0)).rejects.toThrow('invalidPrice');
  });

  it('throws invalidPrice when price=-1', async () => {
    await expect(placeSellOrder(userId, playerId, 1, -1)).rejects.toThrow('invalidPrice');
  });

  it('throws maxPriceExceeded when price > 100_000_000', async () => {
    await expect(placeSellOrder(userId, playerId, 1, 100_000_001)).rejects.toThrow('maxPriceExceeded');
  });

  it('throws invalidPrice when price is not integer (1.5)', async () => {
    await expect(placeSellOrder(userId, playerId, 1, 1.5)).rejects.toThrow('invalidPrice');
  });

  it('throws when price exceeds price cap', async () => {
    // getPriceCap calls rpc('get_price_cap')
    mockRpc('get_price_cap', 5000);
    // Price 6000 > cap 5000
    await expect(placeSellOrder(userId, playerId, 1, 6000)).rejects.toThrow('Price exceeds maximum');
  });

  it('throws playerLiquidated when player is liquidated', async () => {
    // getPriceCap returns null (no cap)
    mockRpc('get_price_cap', null);
    // Player is liquidated
    mockTable('players', { is_liquidated: true });

    await expect(placeSellOrder(userId, playerId, 1, 1000)).rejects.toThrow('playerLiquidated');
  });

  it('throws playerNotFound when player not in DB', async () => {
    mockRpc('get_price_cap', null);
    mockTable('players', null);

    await expect(placeSellOrder(userId, playerId, 1, 1000)).rejects.toThrow('playerNotFound');
  });

  it('throws clubAdminRestricted when user is club admin', async () => {
    mockRpc('get_price_cap', null);
    // Player exists, not liquidated
    mockTable('players', { is_liquidated: false });
    // isRestrictedFromTrading: player has club_id, user is admin
    mockTable('players', { club_id: 'club-1' });
    mockTable('club_admins', { id: 'admin-1' });

    await expect(placeSellOrder(userId, playerId, 1, 1000)).rejects.toThrow('clubAdminRestricted');
  });

  it('throws mapped error when RPC returns error', async () => {
    mockRpc('get_price_cap', null);
    mockTable('players', { is_liquidated: false });
    mockTable('players', null); // not restricted
    mockRpc('place_sell_order', null, { message: 'not enough holdings' });

    await expect(placeSellOrder(userId, playerId, 1, 1000)).rejects.toThrow('insufficientBalance');
  });

  it('throws when RPC returns null', async () => {
    mockRpc('get_price_cap', null);
    mockTable('players', { is_liquidated: false });
    mockTable('players', null); // not restricted
    mockRpc('place_sell_order', null);

    await expect(placeSellOrder(userId, playerId, 1, 1000)).rejects.toThrow('place_sell_order returned null');
  });

  it('returns result on happy path', async () => {
    const rpcResult = { success: true, order_id: 'order-1' };
    mockRpc('get_price_cap', null);
    mockTable('players', { is_liquidated: false });
    mockTable('players', null); // not restricted
    mockRpc('place_sell_order', rpcResult);

    const result = await placeSellOrder(userId, playerId, 1, 1000);
    expect(result.success).toBe(true);
    expect(result.order_id).toBe('order-1');
  });
});

// ============================================
// buyFromOrder
// ============================================

describe('buyFromOrder', () => {
  const buyerId = 'buyer-123';
  const orderId = 'order-456';

  beforeEach(() => {
    resetMocks();
  });

  it('throws invalidQuantity when quantity=0', async () => {
    await expect(buyFromOrder(buyerId, orderId, 0)).rejects.toThrow('invalidQuantity');
  });

  it('throws maxQuantityExceeded when quantity=301', async () => {
    await expect(buyFromOrder(buyerId, orderId, 301)).rejects.toThrow('maxQuantityExceeded');
  });

  it('throws clubAdminRestricted when buyer is admin for order player', async () => {
    // Order lookup returns player_id
    mockTable('orders', { player_id: 'player-789' });
    // isRestrictedFromTrading: player has club_id, user is admin
    mockTable('players', { club_id: 'club-1' });
    mockTable('club_admins', { id: 'admin-1' });

    await expect(buyFromOrder(buyerId, orderId, 1)).rejects.toThrow('clubAdminRestricted');
  });

  it('throws mapped error when RPC returns error', async () => {
    // Order lookup returns null (order not found — skip admin check)
    mockTable('orders', null);
    mockRpc('buy_from_order', null, { message: 'not found' });

    await expect(buyFromOrder(buyerId, orderId, 1)).rejects.toThrow('orderNotFound');
  });

  it('throws when RPC returns null', async () => {
    mockTable('orders', null);
    mockRpc('buy_from_order', null);

    await expect(buyFromOrder(buyerId, orderId, 1)).rejects.toThrow('buy_from_order returned null');
  });

  it('returns result on happy path', async () => {
    const rpcResult = { success: true, trade_id: 'trade-1', total_cost: 3000 };
    // Order lookup — no player_id to skip restriction check
    mockTable('orders', null);
    mockRpc('buy_from_order', rpcResult);

    const result = await buyFromOrder(buyerId, orderId, 1);
    expect(result.success).toBe(true);
    expect(result.trade_id).toBe('trade-1');
  });
});

// ============================================
// cancelOrder
// ============================================

describe('cancelOrder', () => {
  const userId = 'user-123';
  const orderId = 'order-456';

  beforeEach(() => {
    resetMocks();
  });

  it('throws mapped error when RPC returns error', async () => {
    mockRpc('cancel_order', null, { message: 'not found' });
    await expect(cancelOrder(userId, orderId)).rejects.toThrow('orderNotFound');
  });

  it('throws when RPC returns null', async () => {
    mockRpc('cancel_order', null);
    await expect(cancelOrder(userId, orderId)).rejects.toThrow('cancel_order returned null');
  });

  it('returns result on happy path', async () => {
    const rpcResult = { success: true, order_id: orderId };
    mockRpc('cancel_order', rpcResult);

    const result = await cancelOrder(userId, orderId);
    expect(result.success).toBe(true);
  });
});

// ============================================
// placeBuyOrder (returns {success:false} instead of throwing)
// ============================================

describe('placeBuyOrder', () => {
  const userId = 'user-123';
  const playerId = 'player-456';

  beforeEach(() => {
    resetMocks();
  });

  it('returns {success: false} when quantity=0', async () => {
    const result = await placeBuyOrder(userId, playerId, 0, 1000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid quantity');
  });

  it('returns {success: false} when quantity=301', async () => {
    const result = await placeBuyOrder(userId, playerId, 301, 1000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid quantity');
  });

  it('returns {success: false} when price=0', async () => {
    const result = await placeBuyOrder(userId, playerId, 1, 0);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid price');
  });

  it('returns {success: false} when player not found', async () => {
    mockTable('players', null);
    const result = await placeBuyOrder(userId, playerId, 1, 1000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('playerNotFound');
  });

  it('returns {success: false} when player is liquidated', async () => {
    mockTable('players', { is_liquidated: true });
    const result = await placeBuyOrder(userId, playerId, 1, 1000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('playerLiquidated');
  });

  it('returns {success: false} when user is club admin', async () => {
    mockTable('players', { is_liquidated: false });
    // isRestrictedFromTrading: player has club, user is admin
    mockTable('players', { club_id: 'club-1' });
    mockTable('club_admins', { id: 'admin-1' });

    const result = await placeBuyOrder(userId, playerId, 1, 1000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('clubAdminRestricted');
  });

  it('returns {success: false} when RPC returns error', async () => {
    mockTable('players', { is_liquidated: false });
    mockTable('players', null); // not restricted
    mockRpc('place_buy_order', null, { message: 'insufficient balance' });

    const result = await placeBuyOrder(userId, playerId, 1, 1000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('insufficientBalance');
  });

  it('returns {success: false} when RPC returns null', async () => {
    mockTable('players', { is_liquidated: false });
    mockTable('players', null); // not restricted
    mockRpc('place_buy_order', null);

    const result = await placeBuyOrder(userId, playerId, 1, 1000);
    expect(result.success).toBe(false);
    expect(result.error).toBe('No response');
  });

  it('returns result on happy path', async () => {
    const rpcResult = { success: true, order_id: 'order-1', total_locked: 5000 };
    mockTable('players', { is_liquidated: false });
    mockTable('players', null); // not restricted
    mockRpc('place_buy_order', rpcResult);

    const result = await placeBuyOrder(userId, playerId, 1, 1000);
    expect(result.success).toBe(true);
    expect(result.order_id).toBe('order-1');
  });
});

// ============================================
// cancelBuyOrder (returns {success:false} instead of throwing)
// ============================================

describe('cancelBuyOrder', () => {
  const userId = 'user-123';
  const orderId = 'order-456';

  beforeEach(() => {
    resetMocks();
  });

  it('returns {success: false} when RPC returns error', async () => {
    mockRpc('cancel_buy_order', null, { message: 'not found' });
    const result = await cancelBuyOrder(userId, orderId);
    expect(result.success).toBe(false);
    expect(result.error).toBe('orderNotFound');
  });

  it('returns {success: false} when RPC returns null', async () => {
    mockRpc('cancel_buy_order', null);
    const result = await cancelBuyOrder(userId, orderId);
    expect(result.success).toBe(false);
    expect(result.error).toBe('No response');
  });

  it('returns result on happy path', async () => {
    const rpcResult = { success: true, unlocked: 5000 };
    mockRpc('cancel_buy_order', rpcResult);

    const result = await cancelBuyOrder(userId, orderId);
    expect(result.success).toBe(true);
    expect(result.unlocked).toBe(5000);
  });
});
