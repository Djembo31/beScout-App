// @vitest-environment node

/**
 * Authorization / RLS — Security Tests (Layer 5)
 *
 * Verifies Row Level Security policies:
 *   - Users can only access their own data
 *   - Anon users cannot call privileged RPCs
 *   - Direct table mutations are blocked
 *   - Service role key is not leaked to client
 *
 * Uses bot accounts for authenticated tests, anon client for unauthenticated.
 * All operations are expected to FAIL — no data is modified.
 *
 * Run: npx vitest run src/lib/__tests__/auth/rls-checks.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let anonClient: SupabaseClient;
let botAClient: SupabaseClient;
let botAId: string;
let botBClient: SupabaseClient;
let botBId: string;

beforeAll(async () => {
  if (!url || !anonKey) throw new Error('Missing Supabase env vars');

  // Anon client (unauthenticated)
  anonClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Bot A — authenticated user
  botAClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authA, error: errA } = await botAClient.auth.signInWithPassword({
    email: 'bot-001@bescout.app',
    password: 'BeScout2026!',
  });
  if (errA || !authA.user) throw new Error(`Bot A login failed: ${errA?.message}`);
  botAId = authA.user.id;

  // Bot B — different authenticated user
  botBClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authB, error: errB } = await botBClient.auth.signInWithPassword({
    email: 'bot-002@bescout.app',
    password: 'BeScout2026!',
  });
  if (errB || !authB.user) throw new Error(`Bot B login failed: ${errB?.message}`);
  botBId = authB.user.id;
});

describe('Authorization — RLS Checks', () => {
  // ── 1. User A cannot read User B's wallet ──
  it('AUTH-01: user cannot read another user\'s wallet', async () => {
    const { data } = await botAClient
      .from('wallets')
      .select('*')
      .eq('user_id', botBId);

    expect(data ?? []).toHaveLength(0);
  });

  // ── 2. User A cannot cancel User B's order ──
  it('AUTH-02: user cannot cancel another user\'s order', async () => {
    // Find a Bot B order (if any)
    const { data: orders } = await botBClient
      .from('orders')
      .select('id')
      .eq('user_id', botBId)
      .limit(1);

    if (!orders || orders.length === 0) return; // Bot B has no orders

    const { data: updated } = await botAClient
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orders[0].id)
      .select();

    expect(updated ?? []).toHaveLength(0);
  });

  // ── 3. Anon user cannot call trading RPC ──
  it('AUTH-03: anon user cannot call buy_player_sc RPC', async () => {
    const { error } = await anonClient.rpc('buy_player_sc', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_player_id: '00000000-0000-0000-0000-000000000000',
      p_quantity: 1,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied|not authorized|denied/i);
  });

  // ── 4. Regular user cannot create events ──
  it('AUTH-04: regular user cannot insert events directly', async () => {
    const { error } = await botAClient.from('events').insert({
      name: 'Hack Event',
      status: 'registering',
      type: 'classic',
      format: '11er',
      gameweek: 999,
      lineup_size: 11,
      starts_at: new Date().toISOString(),
      locks_at: new Date().toISOString(),
    });

    expect(error).not.toBeNull();
  });

  // ── 5. User cannot change event status directly ──
  it('AUTH-05: user cannot update event status via direct table update', async () => {
    const { data: events } = await botAClient
      .from('events')
      .select('id')
      .limit(1);

    if (!events || events.length === 0) return;

    const { data: updated } = await botAClient
      .from('events')
      .update({ status: 'cancelled' })
      .eq('id', events[0].id)
      .select();

    // RLS should block: 0 rows affected
    expect(updated ?? []).toHaveLength(0);
  });

  // ── 6. User cannot set own wallet balance ──
  it('AUTH-06: user cannot directly update own wallet balance', async () => {
    const { data: updated, error } = await botAClient
      .from('wallets')
      .update({ balance: 999999999 })
      .eq('user_id', botAId)
      .select();

    // Either blocked by RLS (error) or 0 rows affected
    const blocked = error !== null || (updated ?? []).length === 0;
    expect(blocked, 'User should not be able to set own wallet balance directly').toBe(true);
  });

  // ── 7. User cannot read another user's activity log ──
  it('AUTH-07: user cannot read another user\'s activity log', async () => {
    const { data } = await botAClient
      .from('activity_log')
      .select('*')
      .eq('user_id', botBId)
      .limit(5);

    expect(data ?? []).toHaveLength(0);
  });

  // ── 8. User cannot read another user's holdings ──
  it('AUTH-08: user cannot read another user\'s holdings', async () => {
    const { data } = await botAClient
      .from('holdings')
      .select('*')
      .eq('user_id', botBId)
      .limit(5);

    expect(data ?? []).toHaveLength(0);
  });

  // ── 9. Anon cannot call place_sell_order RPC ──
  it('AUTH-09: anon user cannot call place_sell_order RPC', async () => {
    const { error } = await anonClient.rpc('place_sell_order', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_player_id: '00000000-0000-0000-0000-000000000000',
      p_quantity: 1,
      p_price: 100,
    });

    expect(error).not.toBeNull();
  });

  // ── 10. User cannot directly insert into orders table ──
  it('AUTH-10: user cannot directly INSERT into orders table', async () => {
    const { error } = await botAClient.from('orders').insert({
      user_id: botAId,
      player_id: '00000000-0000-0000-0000-000000000000',
      side: 'buy',
      price: 100,
      quantity: 1,
      filled_qty: 0,
      status: 'open',
    });

    expect(error).not.toBeNull();
  });

  // ── 11. User cannot update another user's profile ──
  it('AUTH-11: user cannot update another user\'s profile', async () => {
    const { data: updated } = await botAClient
      .from('profiles')
      .update({ bio: 'hacked' })
      .eq('id', botBId)
      .select();

    expect(updated ?? []).toHaveLength(0);
  });

  // ── 12. User cannot directly insert into trades ──
  it('AUTH-12: user cannot directly INSERT into trades table', async () => {
    const { error } = await botAClient.from('trades').insert({
      player_id: '00000000-0000-0000-0000-000000000000',
      buyer_id: botAId,
      seller_id: botBId,
      price: 100,
      quantity: 1,
      platform_fee: 0,
      pbt_fee: 0,
      club_fee: 0,
    });

    expect(error).not.toBeNull();
  });

  // ── 13. User cannot update own locked_balance ──
  it('AUTH-13: user cannot directly update own locked_balance', async () => {
    const { data: updated, error } = await botAClient
      .from('wallets')
      .update({ locked_balance: 0 })
      .eq('user_id', botAId)
      .select();

    const blocked = error !== null || (updated ?? []).length === 0;
    expect(blocked, 'User should not be able to set own locked_balance').toBe(true);
  });

  // ── 14. User cannot directly insert holdings ──
  it('AUTH-14: user cannot directly INSERT into holdings table', async () => {
    const { error } = await botAClient.from('holdings').insert({
      user_id: botAId,
      player_id: '00000000-0000-0000-0000-000000000000',
      quantity: 999,
    });

    expect(error).not.toBeNull();
  });

  // ── 16. User cannot read another user's orders ──
  it('AUTH-16: user cannot read another user\'s orders', async () => {
    const { data } = await botAClient
      .from('orders')
      .select('*')
      .eq('user_id', botBId)
      .limit(5);

    expect(data ?? []).toHaveLength(0);
  });

  // ── 15. Service role key not exposed in NEXT_PUBLIC vars ──
  it('AUTH-15: SUPABASE_SERVICE_ROLE_KEY must not be in NEXT_PUBLIC env vars', () => {
    const publicVars = Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_'));
    const leaked = publicVars.filter(k =>
      k.includes('SERVICE') || k.includes('service_role')
    );
    expect(leaked, 'Service role key found in NEXT_PUBLIC vars!').toHaveLength(0);

    // Also verify anon key ≠ service key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(anonKey).not.toBe(serviceKey);
  });
});
