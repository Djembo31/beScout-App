import { supabase } from '@/lib/supabaseClient';

// ============================================
// Types
// ============================================

export type MilestonePhase = 'trading' | 'fantasy' | 'research';

export type Milestone = {
  id: string;
  phase: MilestonePhase;
  title: string;
  description: string;
  rewardMentorCents: number;
  rewardMenteeCents: number;
  sortOrder: number;
};

export type MentorshipStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export type Mentorship = {
  id: string;
  mentorId: string;
  menteeId: string;
  status: MentorshipStatus;
  startedAt: string;
  completedAt: string | null;
};

export type MilestoneProgress = {
  id: string;
  milestoneId: string;
  completed: boolean;
  claimedMentor: boolean;
  claimedMentee: boolean;
  completedAt: string | null;
};

export const PHASE_STYLES: Record<MilestonePhase, { label: string; color: string; bg: string; icon: string }> = {
  trading:  { label: 'Trading', color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/20', icon: '📊' },
  fantasy:  { label: 'Fantasy', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: '🏆' },
  research: { label: 'Research', color: 'text-sky-400', bg: 'bg-sky-500/20', icon: '🔬' },
};

// ============================================
// Queries
// ============================================

/** Get all milestones */
export async function getMilestones(): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('mentorship_milestones')
    .select('*')
    .order('sort_order');

  if (error) throw new Error(error.message);
  return (data ?? []).map(m => ({
    id: m.id,
    phase: m.phase as MilestonePhase,
    title: m.title,
    description: m.description,
    rewardMentorCents: m.reward_mentor_cents,
    rewardMenteeCents: m.reward_mentee_cents,
    sortOrder: m.sort_order,
  }));
}

/** Get user's active mentorship (as mentee or mentor) */
export async function getActiveMentorship(userId: string): Promise<Mentorship | null> {
  const { data, error } = await supabase
    .from('mentorships')
    .select('*')
    .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
    .in('status', ['pending', 'active'])
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    mentorId: data.mentor_id,
    menteeId: data.mentee_id,
    status: data.status as MentorshipStatus,
    startedAt: data.started_at,
    completedAt: data.completed_at,
  };
}

/** Get milestone progress for a mentorship */
export async function getMilestoneProgress(mentorshipId: string): Promise<MilestoneProgress[]> {
  const { data, error } = await supabase
    .from('user_mentorship_progress')
    .select('*')
    .eq('mentorship_id', mentorshipId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(p => ({
    id: p.id,
    milestoneId: p.milestone_id,
    completed: p.completed,
    claimedMentor: p.claimed_mentor,
    claimedMentee: p.claimed_mentee,
    completedAt: p.completed_at,
  }));
}

// ============================================
// Mutations
// ============================================

/** Request a mentor */
export async function requestMentor(
  menteeId: string,
  mentorId: string
): Promise<{ success: boolean; error?: string; mentorshipId?: string }> {
  const { data, error } = await supabase.rpc('request_mentor', {
    p_mentee_id: menteeId,
    p_mentor_id: mentorId,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string; mentorship_id?: string };
  return {
    success: result.success,
    error: result.error,
    mentorshipId: result.mentorship_id,
  };
}

/** Accept a mentee (mentor action) */
export async function acceptMentee(
  mentorId: string,
  mentorshipId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('accept_mentee', {
    p_mentor_id: mentorId,
    p_mentorship_id: mentorshipId,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string };
  return result;
}

/** Claim milestone reward */
export async function claimMilestoneReward(
  userId: string,
  mentorshipId: string,
  milestoneId: string,
  role: 'mentor' | 'mentee'
): Promise<{ success: boolean; error?: string; rewardCents?: number }> {
  const { data, error } = await supabase.rpc('claim_milestone_reward', {
    p_user_id: userId,
    p_mentorship_id: mentorshipId,
    p_milestone_id: milestoneId,
    p_role: role,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string; reward_cents?: number };
  return {
    success: result.success,
    error: result.error,
    rewardCents: result.reward_cents,
  };
}
