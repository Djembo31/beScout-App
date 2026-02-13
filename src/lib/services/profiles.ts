import { supabase } from '@/lib/supabaseClient';
import { cached, invalidate } from '@/lib/cache';
import type { Profile } from '@/types';

const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

export function isValidHandle(handle: string): boolean {
  return HANDLE_REGEX.test(handle);
}

export async function getProfile(userId: string): Promise<Profile | null> {
  return cached(`profile:${userId}`, async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return data as Profile;
  }, 2 * 60 * 1000); // 2 min TTL
}

export async function createProfile(
  userId: string,
  data: {
    handle: string;
    display_name?: string | null;
    favorite_club?: string | null;
    favorite_club_id?: string | null;
    language?: 'de' | 'tr' | 'en';
  }
): Promise<Profile> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      handle: data.handle.toLowerCase(),
      display_name: data.display_name ?? null,
      favorite_club: data.favorite_club ?? null,
      favorite_club_id: data.favorite_club_id ?? null,
      language: data.language ?? 'de',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  invalidate(`profile:${userId}`);
  return profile as Profile;
}

export async function updateProfile(
  userId: string,
  data: Partial<Pick<Profile, 'handle' | 'display_name' | 'bio' | 'favorite_club' | 'favorite_club_id' | 'language' | 'avatar_url'>>
): Promise<Profile> {
  const update: Record<string, unknown> = {};
  if (data.handle !== undefined) update.handle = data.handle.toLowerCase();
  if (data.display_name !== undefined) update.display_name = data.display_name;
  if (data.bio !== undefined) update.bio = data.bio;
  if (data.favorite_club !== undefined) update.favorite_club = data.favorite_club;
  if (data.favorite_club_id !== undefined) update.favorite_club_id = data.favorite_club_id;
  if (data.language !== undefined) update.language = data.language;
  if (data.avatar_url !== undefined) update.avatar_url = data.avatar_url;

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  invalidate(`profile:${userId}`);
  return profile as Profile;
}

/** Mehrere Profile auf einmal laden (fuer Trade-Historie) */
export async function getProfilesByIds(
  userIds: string[]
): Promise<Record<string, { handle: string; display_name: string | null }>> {
  if (userIds.length === 0) return {};
  const uniqueIds = Array.from(new Set(userIds));
  const { data, error } = await supabase
    .from('profiles')
    .select('id, handle, display_name')
    .in('id', uniqueIds);

  if (error) return {};
  const map: Record<string, { handle: string; display_name: string | null }> = {};
  for (const p of data ?? []) {
    map[p.id] = { handle: p.handle, display_name: p.display_name };
  }
  return map;
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', handle.toLowerCase())
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function checkHandleAvailable(handle: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('handle', handle.toLowerCase());

  if (error) return false;
  return count === 0;
}
