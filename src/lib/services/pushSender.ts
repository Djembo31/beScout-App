import webpush from 'web-push';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logSilentRejects } from '@/lib/observability/silentRejects';
import { resolveDeepLink } from '@/lib/notificationDeepLink';
import { sanitizeVapidKey } from '@/lib/vapidKey';
import { captureError } from '@/lib/observability/captureError';

// Lazy-initialized to avoid build-time crashes when env vars aren't available
let _supabaseAdmin: SupabaseClient | null = null;
let _vapidInitialized = false;
// Slice 369: once setVapidDetails has thrown on a malformed/mismatched key we stop
// retrying (and stop re-capturing) — a bad secret won't change within a runtime.
let _vapidFailed = false;

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
  if (_vapidFailed) return false;
  const pub = sanitizeVapidKey(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const priv = sanitizeVapidKey(process.env.VAPID_PRIVATE_KEY);
  if (!pub || !priv) return false;
  // Slice 369: setVapidDetails VALIDATES the keys and THROWS on a malformed key
  // (wrong length / non-URL-safe-base64 / padding). A fire-and-forget push must
  // NEVER let that throw bubble to /api/push and surface as a 500 on a money path.
  // Degrade to "push skipped" (same as keys-not-configured) + capture once.
  try {
    webpush.setVapidDetails('mailto:info@bescout.com', pub, priv);
  } catch (err) {
    _vapidFailed = true;
    console.error('[Push] Invalid VAPID keys — push disabled this runtime:', err);
    captureError(err, { feature: 'push', route: 'pushSender.ensureVapid', slice: '369' });
    return false;
  }
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

  const sendResults = await Promise.allSettled(
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
  logSilentRejects('pushSender.sendToUser', sendResults);

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

/**
 * Slice 318: Send a push for an EXISTING notification row — all content is derived
 * server-side from the DB row (never client free-text). The client (firePush) only
 * passes the notificationId; this prevents the /api/push phishing/spam vector where a
 * caller could push arbitrary userId + title/body + external URL.
 *
 * Uses the service-role admin client to read the row (the row may belong to another user
 * for legitimate cross-user notifications, which the caller cannot SELECT under RLS).
 * Returns false if the notification does not exist.
 */
export async function sendPushForNotification(notificationId: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: notif, error } = await supabaseAdmin
    .from('notifications')
    .select('user_id, type, title, body, reference_id, reference_type')
    .eq('id', notificationId)
    .maybeSingle();

  if (error) {
    console.error('[Push] sendPushForNotification: row lookup failed:', error.message);
    return false;
  }
  if (!notif) return false;

  // URL is ALWAYS a server-resolved internal deep-link — never a client-supplied URL.
  const url = resolveDeepLink(notif.reference_type, notif.reference_id);
  await sendPushToUser(notif.user_id, {
    title: notif.title,
    body: notif.body ?? undefined,
    url,
    tag: notif.type,
  });
  return true;
}
