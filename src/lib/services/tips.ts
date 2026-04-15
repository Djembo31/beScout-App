import { supabase } from '@/lib/supabaseClient';
import { notifText, getRecipientLocale } from '@/lib/notifText';
import type { DbTip, TipResult } from '@/types';

// ============================================
// Tip Queries
// ============================================

/** Get tips for a specific content item (post or research) */
export async function getTipsForContent(
  contentType: 'post' | 'research',
  contentId: string,
): Promise<{ tips: DbTip[]; totalCents: number; count: number }> {
  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const tips = (data ?? []) as DbTip[];
  const totalCents = tips.reduce((sum, t) => sum + t.amount_cents, 0);
  return { tips, totalCents, count: tips.length };
}

/** Get total tips received by a user */
export async function getTipsReceived(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('tips')
    .select('receiver_earned_cents')
    .eq('receiver_id', userId);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, t) => sum + (t.receiver_earned_cents ?? 0), 0);
}

/** Get total tips sent by a user */
export async function getTipsSent(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('tips')
    .select('amount_cents')
    .eq('sender_id', userId);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, t) => sum + (t.amount_cents ?? 0), 0);
}

// ============================================
// Tip Mutations
// ============================================

/** Send a tip to content author */
export async function sendTip(
  senderId: string,
  receiverId: string,
  contentType: 'post' | 'research',
  contentId: string,
  amountCents: number,
  message?: string,
): Promise<TipResult> {
  const { data, error } = await supabase.rpc('send_tip', {
    p_sender_id: senderId,
    p_receiver_id: receiverId,
    p_content_type: contentType,
    p_content_id: contentId,
    p_amount_cents: amountCents,
    p_message: message ?? null,
  });

  if (error) {
    console.error('[Tips] sendTip RPC error:', error);
    return { success: false, error: error.message };
  }

  const result = data as TipResult;

  // Notify receiver about the tip (await inside to swallow throws — J10 FIX-03)
  if (result.success) {
    const bsd = (amountCents / 100).toFixed(0);
    (async () => {
      try {
        const loc = await getRecipientLocale(receiverId);
        const { createNotification } = await import('@/lib/services/notifications');
        await createNotification(
          receiverId,
          'tip_received',
          notifText('tipReceivedTitle', undefined, loc),
          notifText('tipReceivedBody', { amount: bsd }, loc),
          contentId,
          contentType === 'research' ? 'research' : 'post',
        );
      } catch (err) {
        console.error('[Tips] Notification failed:', err);
      }
    })();
  }

  return result;
}
