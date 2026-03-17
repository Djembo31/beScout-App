import webpush from 'web-push';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized to avoid build-time crashes when env vars aren't available
let _supabaseAdmin: SupabaseClient | null = null;
let _vapidInitialized = false;

function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabaseAdmin;
}

function ensureVapid() {
  if (_vapidInitialized) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const priv = process.env.VAPID_PRIVATE_KEY || '';
  if (!pub || !priv) return false;
  webpush.setVapidDetails('mailto:info@bescout.com', pub, priv);
  _vapidInitialized = true;
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

/**
 * Send push notification to all active subscriptions for a user.
 * Fire-and-forget — errors are logged, never thrown.
 * Stale subscriptions (410 Gone) are auto-deleted.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureVapid()) {
    console.warn('[Push] VAPID keys not configured, skipping push');
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) {
    console.error('[Push] Failed to fetch subscriptions:', error.message);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) return;

  const jsonPayload = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          jsonPayload,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired or invalid — mark for cleanup
          staleIds.push(sub.id);
        } else {
          console.error(`[Push] Failed to send to ${sub.endpoint.slice(0, 50)}...:`, err);
        }
      }
    }),
  );

  // Clean up stale subscriptions
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .in('id', staleIds);

    if (deleteError) {
      console.error('[Push] Failed to clean stale subscriptions:', deleteError.message);
    }
  }
}
