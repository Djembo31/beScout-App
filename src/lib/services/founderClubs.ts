import { supabase } from '@/lib/supabaseClient';
import type { DbFounderClub, FounderClubTier } from '@/types';

// ============================================
// Founder Club Service
// ============================================

const SHARES: Record<FounderClubTier, number> = {
  bronze: 1,
  silber: 3,
  gold: 6,
};

/** Get founder club status for a specific club */
export async function getFounderClub(clubId: string): Promise<DbFounderClub | null> {
  const { data, error } = await supabase
    .from('founder_clubs')
    .select('*')
    .eq('club_id', clubId)
    .maybeSingle();

  if (error) {
    console.error('[FounderClubs] getFounderClub error:', error);
    return null;
  }
  return data as DbFounderClub | null;
}

/** Get all founder clubs */
export async function getAllFounderClubs(): Promise<(DbFounderClub & { club_name?: string; club_logo?: string | null })[]> {
  const { data, error } = await supabase
    .from('founder_clubs')
    .select('*, clubs!inner(name, logo_url)')
    .order('shares', { ascending: false });

  if (error) {
    console.error('[FounderClubs] getAllFounderClubs error:', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const club = row.clubs as unknown as { name: string; logo_url: string | null } | null;
    return {
      ...row,
      club_name: club?.name ?? 'Unknown',
      club_logo: club?.logo_url ?? null,
    } as DbFounderClub & { club_name: string; club_logo: string | null };
  });
}

/** Grant founder club status (platform admin only) */
export async function grantFounderClub(
  clubId: string,
  tier: FounderClubTier,
  priceEurCents: number,
  paymentReference?: string,
): Promise<{ ok: boolean; error?: string }> {
  const shares = SHARES[tier];

  const { error } = await supabase
    .from('founder_clubs')
    .insert({
      club_id: clubId,
      tier,
      shares,
      price_eur_cents: priceEurCents,
      payment_reference: paymentReference ?? null,
    });

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Club ist bereits Founder Club' };
    }
    console.error('[FounderClubs] grantFounderClub error:', error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** Get total shares across all founder clubs */
export async function getTotalShares(): Promise<number> {
  const clubs = await getAllFounderClubs();
  return clubs.reduce((sum, c) => sum + c.shares, 0);
}

/** Check if a club is a founder club */
export async function isFounderClub(clubId: string): Promise<boolean> {
  const fc = await getFounderClub(clubId);
  return fc !== null;
}
