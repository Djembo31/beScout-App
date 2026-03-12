import { supabase } from '@/lib/supabaseClient';

// ============================================
// Club Challenges Service (B10: Fan Rewards)
// ============================================

export interface ClubChallenge {
  id: string;
  clubId: string;
  title: string;
  description: string | null;
  type: 'event_participation' | 'poll_vote' | 'fantasy_top_n' | 'custom';
  referenceId: string | null;
  fanRankPoints: number;
  cosmeticRewardKey: string | null;
  startsAt: string;
  endsAt: string;
  status: 'active' | 'ended';
  createdAt: string;
}

/** Map DB row to ClubChallenge */
function mapRow(row: Record<string, unknown>): ClubChallenge {
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    type: row.type as ClubChallenge['type'],
    referenceId: (row.reference_id as string) ?? null,
    fanRankPoints: row.fan_rank_points as number,
    cosmeticRewardKey: (row.cosmetic_reward_key as string) ?? null,
    startsAt: row.starts_at as string,
    endsAt: row.ends_at as string,
    status: row.status as ClubChallenge['status'],
    createdAt: row.created_at as string,
  };
}

/** Fetch all challenges for a club (active first, then ended) */
export async function getClubChallenges(clubId: string): Promise<ClubChallenge[]> {
  const { data, error } = await supabase
    .from('club_challenges')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ClubChallenges] getClubChallenges error:', error);
    return [];
  }

  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRow);
}

/** Create a new club challenge */
export async function createClubChallenge(
  clubId: string,
  input: {
    title: string;
    description: string | null;
    type: ClubChallenge['type'];
    referenceId: string | null;
    fanRankPoints: number;
    cosmeticRewardKey: string | null;
    startsAt: string;
    endsAt: string;
  },
): Promise<ClubChallenge> {
  const { data, error } = await supabase
    .from('club_challenges')
    .insert({
      club_id: clubId,
      title: input.title,
      description: input.description,
      type: input.type,
      reference_id: input.referenceId,
      fan_rank_points: input.fanRankPoints,
      cosmetic_reward_key: input.cosmeticRewardKey,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      status: 'active',
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[ClubChallenges] createClubChallenge error:', error);
    throw new Error(error?.message ?? 'Failed to create challenge');
  }

  return mapRow(data as unknown as Record<string, unknown>);
}

/** Complete a challenge for a user: check not already claimed, award fan rank points, record claim */
export async function completeChallenge(userId: string, challengeId: string): Promise<void> {
  // 1) Check if already claimed
  const { data: existing } = await supabase
    .from('achievement_perk_claims')
    .select('id')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .maybeSingle();

  if (existing) {
    throw new Error('Challenge already claimed');
  }

  // 2) Get challenge details to know how many points to award
  const { data: challenge, error: chErr } = await supabase
    .from('club_challenges')
    .select('fan_rank_points, club_id, status')
    .eq('id', challengeId)
    .single();

  if (chErr || !challenge) {
    throw new Error('Challenge not found');
  }

  const ch = challenge as unknown as Record<string, unknown>;
  if (ch.status !== 'active') {
    throw new Error('Challenge is not active');
  }

  // 3) Award fan rank points via RPC
  const points = ch.fan_rank_points as number;
  const cid = ch.club_id as string;

  const { error: rankErr } = await supabase.rpc('increment_fan_rank_score', {
    p_user_id: userId,
    p_club_id: cid,
    p_dimension: 'event_score',
    p_points: points,
  });

  if (rankErr) {
    console.error('[ClubChallenges] increment fan rank error:', rankErr);
    throw new Error('Failed to award fan rank points');
  }

  // 4) Record the claim
  const { error: claimErr } = await supabase
    .from('achievement_perk_claims')
    .insert({
      user_id: userId,
      challenge_id: challengeId,
      claimed_at: new Date().toISOString(),
    });

  if (claimErr) {
    console.error('[ClubChallenges] claim insert error:', claimErr);
    throw new Error('Failed to record challenge claim');
  }
}
