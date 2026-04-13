// @vitest-environment node

/**
 * Supply Invariant Test — catches phantom holdings
 *
 * For every player: sum(holdings.quantity) MUST equal sum(ipo_purchases.quantity)
 * Any drift means SCs exist without backing IPO purchases (supply leak).
 *
 * Known drift: Seed fan accounts hold 11 phantom SCs (9 + 2) from direct
 * DB inserts during Feb 2026 seeding. These are excluded until pilot cleanup.
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

function findEnvLocal(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, '.env.local');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), '.env.local');
}

dotenv.config({ path: findEnvLocal() });

// Known seed fan accounts — will be deleted at pilot start
// See: memory/pre-launch-checklist.md
const SEED_FAN_IDS = new Set([
  '671269ed-199a-5e73-9959-e30e54f05f03', // Fan 01
  '91b6bc18-c20d-599f-9424-50944d4be6d6', // Fan 02
  '8eeb6119-c0bd-5358-b7bb-fdb0fe73489c', // Fan 03
  'a85617b2-1681-5040-a346-b4085c32e175', // Fan 04
  'bad3f94b-ec26-56ac-a976-f92d0481b78e', // Fan 05
  '92f2893b-c57b-5f59-92d9-4ce482c2e5bb', // Fan 06
  'da13204e-b332-57c7-9384-8c27fa739ccf', // Fan 07
  'b989efa4-e604-58eb-afa3-bd8e3bcd00ca', // Fan 08
  '589fb318-40ef-5455-a2bc-790afcf8e3b9', // Fan 09
  '3f3b6221-089c-57c3-b9a8-5308c455778f', // Fan 10
]);

let sb: SupabaseClient;

beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
});

describe('Supply Invariant', () => {
  it('holdings per player match ipo_purchases (excluding seed accounts)', async () => {
    // Get all holdings excluding seed fan accounts
    const { data: holdings, error: hErr } = await sb
      .from('holdings')
      .select('player_id, quantity, user_id');
    expect(hErr).toBeNull();

    // Get all ipo_purchases with player_id via ipos join
    const { data: purchases, error: pErr } = await sb
      .from('ipo_purchases')
      .select('quantity, user_id, ipos!inner(player_id)');
    expect(pErr).toBeNull();

    // Sum holdings per player (excluding seed accounts)
    const holdingsMap = new Map<string, number>();
    for (const h of holdings ?? []) {
      if (SEED_FAN_IDS.has(h.user_id)) continue;
      holdingsMap.set(h.player_id, (holdingsMap.get(h.player_id) ?? 0) + h.quantity);
    }

    // Sum purchases per player (excluding seed accounts)
    const purchasesMap = new Map<string, number>();
    for (const p of purchases ?? []) {
      if (SEED_FAN_IDS.has(p.user_id)) continue;
      const playerId = (p as any).ipos?.player_id;
      if (!playerId) continue;
      purchasesMap.set(playerId, (purchasesMap.get(playerId) ?? 0) + p.quantity);
    }

    // Check every player
    const drifts: Array<{ playerId: string; held: number; purchased: number; drift: number }> = [];

    const allPlayerIds = new Set(Array.from(holdingsMap.keys()).concat(Array.from(purchasesMap.keys())));
    for (const pid of Array.from(allPlayerIds)) {
      const held = holdingsMap.get(pid) ?? 0;
      const purchased = purchasesMap.get(pid) ?? 0;
      if (held !== purchased) {
        drifts.push({ playerId: pid, held, purchased, drift: held - purchased });
      }
    }

    if (drifts.length > 0) {
      console.error('Supply drift detected:', JSON.stringify(drifts, null, 2));
    }

    expect(drifts).toEqual([]);
  });

  it('no user holds negative quantity', async () => {
    const { data, error } = await sb
      .from('holdings')
      .select('user_id, player_id, quantity')
      .lt('quantity', 0);
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });
});
