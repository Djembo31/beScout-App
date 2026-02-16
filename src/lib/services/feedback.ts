import { supabase } from '@/lib/supabaseClient';
import type { FeedbackType } from '@/types';

export async function submitFeedback(
  userId: string,
  type: FeedbackType,
  message: string,
  pageUrl?: string
): Promise<void> {
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    type,
    message: message.trim(),
    page_url: pageUrl ?? null,
  });
  if (error) throw new Error(error.message);
}
