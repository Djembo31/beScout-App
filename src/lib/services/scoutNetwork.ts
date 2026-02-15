import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';

const FIVE_MIN = 5 * 60 * 1000;

// ============================================
// Types
// ============================================

export type BadgeLevel = 'bronze' | 'silver' | 'gold';

export type VerifiedScout = {
  userId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  badgeLevel: BadgeLevel;
  specialty: string | null;
  totalScore: number;
};

export type ScoutAssignment = {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'cancelled';
  rewardCents: number;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export const BADGE_STYLES: Record<BadgeLevel, { label: string; color: string; bg: string; border: string; icon: string }> = {
  bronze: { label: 'Bronze Scout', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', icon: '🥉' },
  silver: { label: 'Silver Scout', color: 'text-zinc-300', bg: 'bg-zinc-400/20', border: 'border-zinc-400/30', icon: '🥈' },
  gold:   { label: 'Gold Scout', color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/20', border: 'border-[#FFD700]/30', icon: '🥇' },
};

// ============================================
// Queries
// ============================================

/** Get top scouts for a club */
export async function getClubTopScouts(clubId: string, limit = 10): Promise<VerifiedScout[]> {
  return cached(`scouts:club:${clubId}`, async () => {
    const { data, error } = await supabase.rpc('get_club_top_scouts', {
      p_club_id: clubId,
      p_limit: limit,
    });

    if (error) throw new Error(error.message);
    return (data ?? []).map((s: Record<string, unknown>) => ({
      userId: s.user_id as string,
      displayName: s.display_name as string,
      handle: s.handle as string,
      avatarUrl: s.avatar_url as string | null,
      badgeLevel: s.badge_level as BadgeLevel,
      specialty: s.specialty as string | null,
      totalScore: s.total_score as number,
    }));
  }, FIVE_MIN);
}

/** Check if a user is a verified scout for any club */
export async function getUserScoutStatus(userId: string): Promise<{ isVerified: boolean; badgeLevel?: BadgeLevel; clubId?: string }> {
  return cached(`scout:user:${userId}`, async () => {
    const { data } = await supabase
      .from('verified_scouts')
      .select('badge_level, club_id')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (!data) return { isVerified: false };
    return {
      isVerified: true,
      badgeLevel: data.badge_level as BadgeLevel,
      clubId: data.club_id,
    };
  }, FIVE_MIN);
}

/** Get scout assignments for a verified scout */
export async function getScoutAssignments(userId: string): Promise<ScoutAssignment[]> {
  return cached(`scout:assignments:${userId}`, async () => {
    const { data, error } = await supabase
      .from('scout_assignments')
      .select('*, verified_scouts!inner(user_id)')
      .eq('verified_scouts.user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      title: a.title as string,
      description: a.description as string | null,
      status: a.status as ScoutAssignment['status'],
      rewardCents: a.reward_cents as number,
      dueAt: a.due_at as string | null,
      completedAt: a.completed_at as string | null,
      createdAt: a.created_at as string,
    }));
  }, FIVE_MIN);
}

// ============================================
// Mutations
// ============================================

/** Verify a scout (admin) */
export async function verifyScout(
  adminId: string,
  userId: string,
  clubId: string,
  badgeLevel: BadgeLevel = 'bronze',
  specialty?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('verify_scout', {
    p_admin_id: adminId,
    p_user_id: userId,
    p_club_id: clubId,
    p_badge_level: badgeLevel,
    p_specialty: specialty ?? null,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string };
  if (result.success) {
    invalidate(`scouts:club:${clubId}`);
    invalidate(`scout:user:${userId}`);
  }
  return result;
}

/** Remove scout verification (admin) */
export async function removeScoutVerification(userId: string, clubId: string): Promise<void> {
  const { error } = await supabase
    .from('verified_scouts')
    .update({ active: false })
    .eq('user_id', userId)
    .eq('club_id', clubId);

  if (error) throw new Error(error.message);
  invalidate(`scouts:club:${clubId}`);
  invalidate(`scout:user:${userId}`);
}
