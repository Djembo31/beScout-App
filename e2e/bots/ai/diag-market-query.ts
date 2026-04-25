// Slice 195 Bot-Pilot-Diagnose: Warum sieht Bot "Keine Spieler im Markt"?
// Reproduce mit anon-key + Bot-Auth, mit Service-Role daneben.
// Run: npx tsx e2e/bots/ai/diag-market-query.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function diag() {
  console.log('=== DIAGNOSE: getMarketPlayers ===\n');

  // Test 1: Service-Role (no RLS)
  console.log('Test 1: Service-Role Query');
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: adminData, error: adminErr } = await admin.from('players')
    .select('id, first_name, last_name, dpc_total, is_liquidated, volume_24h')
    .eq('is_liquidated', false)
    .gt('dpc_total', 0)
    .order('volume_24h', { ascending: false, nullsFirst: false })
    .limit(5);
  console.log('  data.length:', adminData?.length, '| error:', adminErr?.message ?? 'none');

  // Test 2: Anon (no auth)
  console.log('\nTest 2: Anon (unauth) Query');
  const anonClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: anonData, error: anonErr } = await anonClient.from('players')
    .select('id, first_name, last_name, dpc_total, is_liquidated, volume_24h')
    .eq('is_liquidated', false)
    .gt('dpc_total', 0)
    .order('volume_24h', { ascending: false, nullsFirst: false })
    .limit(5);
  console.log('  data.length:', anonData?.length, '| error:', anonErr?.message ?? 'none');

  // Test 3: Bot-Login (authenticated)
  console.log('\nTest 3: Bot-Login (authenticated) Query');
  const botClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: loginErr } = await botClient.auth.signInWithPassword({
    email: 'bot-001@bescout.app',
    password: 'BeScout2026!',
  });
  if (loginErr) {
    console.log('  LOGIN FAILED:', loginErr.message);
    return;
  }
  console.log('  Login OK as bot-001');

  const { data: botData, error: botErr } = await botClient.from('players')
    .select(`id, first_name, last_name, position, club, club_id,
      floor_price, last_price, reference_price, ipo_price,
      perf_l5, perf_l15, dpc_available, dpc_total, is_liquidated,
      volume_24h, price_change_24h`)
    .eq('is_liquidated', false)
    .gt('dpc_total', 0)
    .order('volume_24h', { ascending: false, nullsFirst: false })
    .limit(50);
  console.log('  data.length:', botData?.length, '| error:', botErr?.message ?? 'none');

  if (botData && botData.length > 0) {
    console.log('  First 3 players:', botData.slice(0, 3).map((p: { first_name: string; last_name: string; club: string }) => `${p.first_name} ${p.last_name} (${p.club})`).join(', '));
  }

  // Test 4: Bot ohne is_liquidated/dpc_total filter
  console.log('\nTest 4: Bot ohne Filter (raw count)');
  const { count, error: countErr } = await botClient.from('players')
    .select('id', { count: 'exact', head: true });
  console.log('  count:', count, '| error:', countErr?.message ?? 'none');
}

diag().catch((e) => console.error('FATAL:', e));
