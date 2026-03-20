// @vitest-environment node

/**
 * API Contract Tests — Schema Drift Detection
 *
 * These tests query 1 row per critical table from live Supabase and validate
 * that the returned column names match our TypeScript types. This catches
 * schema drift (e.g. wrong column names like `first_name` vs `name`).
 *
 * All tests are READ-ONLY — they only SELECT, never mutate.
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local — try cwd first, then walk up to find main repo root
// (worktrees don't have their own .env.local)
function findEnvLocal(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, '.env.local');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), '.env.local'); // fallback
}

dotenv.config({ path: findEnvLocal() });

let sb: SupabaseClient;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

/**
 * Helper: fetch 1 row from a table and return its column names.
 * Returns null if the table is empty (test should skip gracefully).
 */
async function getColumnNames(table: string): Promise<string[] | null> {
  const { data, error } = await sb.from(table).select('*').limit(1);
  if (error) throw new Error(`Query ${table} failed: ${error.message}`);
  if (!data || data.length === 0) return null;
  return Object.keys(data[0]);
}

/**
 * Assert that all expected columns exist in the actual column list.
 * Provides clear error messages showing which columns are missing.
 */
function expectColumns(actual: string[], expected: string[], table: string) {
  const missing = expected.filter((col) => !actual.includes(col));
  expect(
    missing,
    `Table "${table}" is missing columns: [${missing.join(', ')}]. ` +
      `Actual columns: [${actual.join(', ')}]`,
  ).toHaveLength(0);
}

describe('Schema Contract Tests', () => {
  // ─────────────────────────────────────────────────────
  // CONTRACT-01: players
  // ─────────────────────────────────────────────────────
  it('CONTRACT-01: players table has expected columns', async () => {
    const cols = await getColumnNames('players');
    if (!cols) return; // empty table — skip gracefully
    expectColumns(cols, [
      'id', 'first_name', 'last_name', 'position', 'club', 'age',
      'shirt_number', 'nationality', 'image_url', 'matches', 'goals',
      'assists', 'floor_price', 'ipo_price', 'club_id', 'is_liquidated',
      'perf_l5', 'perf_l15', 'status', 'max_supply',
    ], 'players');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-02: wallets
  // ─────────────────────────────────────────────────────
  it('CONTRACT-02: wallets table has expected columns', async () => {
    const cols = await getColumnNames('wallets');
    if (!cols) return;
    expectColumns(cols, [
      'user_id', 'balance', 'locked_balance', 'created_at', 'updated_at',
    ], 'wallets');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-03: orders
  // ─────────────────────────────────────────────────────
  it('CONTRACT-03: orders table has expected columns', async () => {
    const cols = await getColumnNames('orders');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'user_id', 'player_id', 'side', 'price', 'quantity',
      'filled_qty', 'status', 'created_at', 'expires_at',
    ], 'orders');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-04: trades
  // ─────────────────────────────────────────────────────
  it('CONTRACT-04: trades table has expected columns', async () => {
    const cols = await getColumnNames('trades');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'player_id', 'buyer_id', 'seller_id', 'price', 'quantity',
      'platform_fee', 'pbt_fee', 'club_fee', 'executed_at', 'ipo_id',
    ], 'trades');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-05: events
  // ─────────────────────────────────────────────────────
  it('CONTRACT-05: events table has expected columns', async () => {
    const cols = await getColumnNames('events');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'name', 'type', 'status', 'format', 'gameweek', 'entry_fee',
      'prize_pool', 'max_entries', 'current_entries', 'starts_at', 'locks_at',
      'ends_at', 'scored_at', 'club_id', 'lineup_size', 'scope',
    ], 'events');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-06: lineups
  // ─────────────────────────────────────────────────────
  it('CONTRACT-06: lineups table has expected columns', async () => {
    const cols = await getColumnNames('lineups');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'event_id', 'user_id', 'slot_gk', 'slot_def1', 'slot_def2',
      'slot_def3', 'slot_def4', 'slot_mid1', 'slot_mid2', 'slot_mid3',
      'slot_mid4', 'slot_att', 'slot_att2', 'slot_att3', 'total_score',
      'rank', 'formation', 'captain_slot',
    ], 'lineups');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-07: ipos
  // ─────────────────────────────────────────────────────
  it('CONTRACT-07: ipos table has expected columns', async () => {
    const cols = await getColumnNames('ipos');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'player_id', 'status', 'price', 'total_offered', 'sold',
      'max_per_user', 'starts_at', 'ends_at', 'early_access_ends_at',
    ], 'ipos');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-08: ipo_purchases
  // ─────────────────────────────────────────────────────
  it('CONTRACT-08: ipo_purchases table has expected columns', async () => {
    const cols = await getColumnNames('ipo_purchases');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'ipo_id', 'user_id', 'quantity', 'price', 'platform_fee',
      'pbt_fee', 'club_fee',
    ], 'ipo_purchases');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-09: holdings
  // ─────────────────────────────────────────────────────
  it('CONTRACT-09: holdings table has expected columns', async () => {
    const cols = await getColumnNames('holdings');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'user_id', 'player_id', 'quantity', 'avg_buy_price',
    ], 'holdings');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-10: offers
  // ─────────────────────────────────────────────────────
  it('CONTRACT-10: offers table has expected columns', async () => {
    const cols = await getColumnNames('offers');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'player_id', 'sender_id', 'receiver_id', 'side', 'price',
      'quantity', 'status', 'expires_at',
    ], 'offers');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-11: profiles
  // ─────────────────────────────────────────────────────
  it('CONTRACT-11: profiles table has expected columns', async () => {
    const cols = await getColumnNames('profiles');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'handle', 'display_name', 'avatar_url', 'bio', 'top_role',
      'referral_code', 'region',
    ], 'profiles');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-12: post_votes
  // ─────────────────────────────────────────────────────
  it('CONTRACT-12: post_votes table has expected columns', async () => {
    const cols = await getColumnNames('post_votes');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'post_id', 'user_id', 'vote_type',
    ], 'post_votes');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-13: notifications
  // ─────────────────────────────────────────────────────
  it('CONTRACT-13: notifications table has expected columns', async () => {
    const cols = await getColumnNames('notifications');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'user_id', 'type', 'title', 'body', 'reference_id',
      'reference_type', 'read',
    ], 'notifications');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-14: activity_log
  // ─────────────────────────────────────────────────────
  it('CONTRACT-14: activity_log table has expected columns', async () => {
    const cols = await getColumnNames('activity_log');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'user_id', 'action', 'category', 'metadata',
    ], 'activity_log');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-15: fixtures
  // ─────────────────────────────────────────────────────
  it('CONTRACT-15: fixtures table has expected columns', async () => {
    const cols = await getColumnNames('fixtures');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'gameweek', 'home_club_id', 'away_club_id', 'home_score',
      'away_score', 'status', 'played_at',
    ], 'fixtures');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-16: clubs
  // ─────────────────────────────────────────────────────
  it('CONTRACT-16: clubs table has expected columns', async () => {
    const cols = await getColumnNames('clubs');
    if (!cols) return;
    expectColumns(cols, [
      'id', 'slug', 'name', 'logo_url', 'league_id', 'active_gameweek',
      'treasury_balance_cents',
    ], 'clubs');
  });

  // ─────────────────────────────────────────────────────
  // TRAP ASSERTIONS (from common-errors.md)
  // These verify that WRONG column names do NOT exist.
  // ─────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────
  // CONTRACT-17: players has first_name/last_name NOT name
  // ─────────────────────────────────────────────────────
  it('CONTRACT-17: players uses first_name/last_name, NOT name', async () => {
    const cols = await getColumnNames('players');
    if (!cols) return;
    expect(cols, 'players must have first_name').toContain('first_name');
    expect(cols, 'players must have last_name').toContain('last_name');
    expect(cols, 'players must NOT have a bare "name" column').not.toContain('name');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-18: orders has side NOT type
  // ─────────────────────────────────────────────────────
  it('CONTRACT-18: orders uses side, NOT type', async () => {
    const cols = await getColumnNames('orders');
    if (!cols) return;
    expect(cols, 'orders must have side').toContain('side');
    expect(cols, 'orders must NOT have "type" column').not.toContain('type');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-19: wallets PK is user_id NOT id (no currency)
  // ─────────────────────────────────────────────────────
  it('CONTRACT-19: wallets PK is user_id, no id or currency column', async () => {
    const cols = await getColumnNames('wallets');
    if (!cols) return;
    expect(cols, 'wallets must have user_id').toContain('user_id');
    expect(cols, 'wallets must NOT have "id" column').not.toContain('id');
    expect(cols, 'wallets must NOT have "currency" column').not.toContain('currency');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-20: profiles has top_role NOT role
  // ─────────────────────────────────────────────────────
  it('CONTRACT-20: profiles uses top_role, NOT role', async () => {
    const cols = await getColumnNames('profiles');
    if (!cols) return;
    expect(cols, 'profiles must have top_role').toContain('top_role');
    expect(cols, 'profiles must NOT have bare "role" column').not.toContain('role');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-21: notifications has read NOT is_read
  // ─────────────────────────────────────────────────────
  it('CONTRACT-21: notifications uses read, NOT is_read', async () => {
    const cols = await getColumnNames('notifications');
    if (!cols) return;
    expect(cols, 'notifications must have "read"').toContain('read');
    expect(cols, 'notifications must NOT have "is_read"').not.toContain('is_read');
  });

  // ─────────────────────────────────────────────────────
  // CONTRACT-22: trades has executed_at NOT created_at
  // ─────────────────────────────────────────────────────
  it('CONTRACT-22: trades uses executed_at, NOT created_at', async () => {
    const cols = await getColumnNames('trades');
    if (!cols) return;
    expect(cols, 'trades must have executed_at').toContain('executed_at');
    expect(cols, 'trades must NOT have "created_at"').not.toContain('created_at');
  });
});
