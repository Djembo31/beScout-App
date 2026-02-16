import { supabase } from '@/lib/supabaseClient';

// ============================================
// Avatar Service — Centralized Storage Operations
// ============================================

/** Upload avatar and return public URL */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);

  return urlData.publicUrl;
}
