import { supabase } from '@/lib/supabaseClient';
import type { DbSponsor, SponsorPlacement } from '@/types';

// ============================================
// Sponsor Queries
// ============================================

/** Get the highest-priority active sponsor for a placement */
export async function getSponsorForPlacement(
  placement: SponsorPlacement,
  clubId?: string | null
): Promise<DbSponsor | null> {
  const now = new Date().toISOString();
  let query = supabase
    .from('sponsors')
    .select('*')
    .eq('placement', placement)
    .eq('is_active', true)
    .lte('starts_at', now)
    .order('priority', { ascending: false })
    .limit(1);

  // Club-specific sponsors first, then global fallback
  if (clubId) {
    query = query.or(`club_id.eq.${clubId},club_id.is.null`);
  } else {
    query = query.is('club_id', null);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Sponsors] getSponsorForPlacement failed:', error);
    return null;
  }

  // Filter out expired sponsors (ends_at check)
  const valid = (data ?? []).filter(
    s => !s.ends_at || new Date(s.ends_at) > new Date()
  );
  return (valid[0] as DbSponsor) ?? null;
}

/** Get all sponsors (admin overview) */
export async function getAllSponsors(): Promise<DbSponsor[]> {
  const { data, error } = await supabase
    .from('sponsors')
    .select('*')
    .order('placement')
    .order('priority', { ascending: false });

  if (error) {
    console.error('[Sponsors] getAllSponsors failed:', error);
    return [];
  }
  return (data ?? []) as DbSponsor[];
}

// ============================================
// Sponsor Mutations (Admin only)
// ============================================

export async function createSponsor(params: {
  name: string;
  logo_url: string;
  link_url?: string;
  placement: SponsorPlacement;
  club_id?: string | null;
  priority?: number;
  starts_at?: string;
  ends_at?: string | null;
  created_by: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('sponsors')
    .insert({
      name: params.name,
      logo_url: params.logo_url,
      link_url: params.link_url || null,
      placement: params.placement,
      club_id: params.club_id || null,
      priority: params.priority ?? 0,
      starts_at: params.starts_at ?? new Date().toISOString(),
      ends_at: params.ends_at ?? null,
      created_by: params.created_by,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function updateSponsor(
  id: string,
  updates: Partial<Pick<DbSponsor, 'name' | 'logo_url' | 'link_url' | 'placement' | 'club_id' | 'is_active' | 'priority' | 'starts_at' | 'ends_at'>>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('sponsors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteSponsor(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('sponsors')
    .delete()
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
