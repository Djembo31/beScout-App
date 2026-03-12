import { supabase } from '@/lib/supabaseClient';
import type { Profile, ClubAdminRole } from '@/types';
import type { PlatformAdminRole } from '@/lib/services/platformAdmin';

export type AuthState = {
  profile: Profile | null;
  platformRole: PlatformAdminRole | null;
  clubAdmin: { clubId: string; slug: string; role: ClubAdminRole } | null;
};

/** Single RPC call to fetch profile + platform admin role + club admin info */
export async function getAuthState(userId: string): Promise<AuthState> {
  const { data, error } = await supabase.rpc('get_auth_state', {
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error('get_auth_state returned null');

  const result = data as {
    profile: Record<string, unknown> | null;
    platformRole: string | null;
    clubAdmin: { clubId: string; slug: string; role: string } | null;
  };

  return {
    profile: result.profile ? (result.profile as unknown as Profile) : null,
    platformRole: result.platformRole as PlatformAdminRole | null,
    clubAdmin: result.clubAdmin
      ? {
          clubId: result.clubAdmin.clubId,
          slug: result.clubAdmin.slug,
          role: result.clubAdmin.role as ClubAdminRole,
        }
      : null,
  };
}
