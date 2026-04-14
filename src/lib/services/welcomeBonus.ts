import { supabase } from '@/lib/supabaseClient';
import { logSupabaseError } from '@/lib/supabaseErrors';

// ============================================
// Welcome Bonus Service
// ============================================

/** Claim the one-time welcome bonus via RPC (uses auth.uid() server-side) */
export async function claimWelcomeBonus(): Promise<{
  ok: boolean;
  alreadyClaimed: boolean;
  amountCents?: number;
  newBalance?: number;
}> {
  const { data, error } = await supabase.rpc('claim_welcome_bonus');

  // Real Supabase/RPC errors must surface so React Query can retry
  // and the UI can show an actionable error. `ok:false` is reserved
  // for the legit "already claimed" RPC-level signal below.
  if (error) {
    logSupabaseError('[WelcomeBonus] claimWelcomeBonus', error);
    throw new Error(error.message);
  }

  const result = data as {
    ok: boolean;
    already_claimed?: boolean;
    amount_cents?: number;
    new_balance?: number;
  };

  return {
    ok: result.ok,
    alreadyClaimed: result.already_claimed ?? false,
    amountCents: result.amount_cents,
    newBalance: result.new_balance,
  };
}
