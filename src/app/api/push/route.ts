import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { sendPushForNotification } from '@/lib/services/pushSender';
import { withLogger } from '@/lib/observability/apiLogger';
import { captureError } from '@/lib/observability/captureError';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/push — Deliver a web push for an EXISTING notification row.
 * Called by createNotification/createNotificationsBatch from the client (web-push needs Node).
 *
 * Body: { notificationId: string }
 * Security (Slice 318): the caller passes ONLY a notificationId. ALL push content
 * (target user, title, body, url, tag) is derived server-side from the DB row via the
 * service-role admin client — never from client free-text. This closes the previous
 * phishing/spam vector (arbitrary userId + title/body + external URL).
 * Residual: notifications INSERT is still cross-user (notifications_insert_any_authenticated) —
 * tracked as a separate slice (move cross-user notification creation to SECURITY DEFINER RPCs).
 */
export const POST = withLogger('public.push', async (request) => {
  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() { /* read-only */ },
        },
      },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body as { notificationId?: string };

    if (!notificationId) {
      return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 });
    }

    // Content is derived 100% from the notification row (server-side). If the row does not
    // exist, there is nothing legitimate to deliver.
    const found = await sendPushForNotification(notificationId);
    if (!found) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Slice 369: the inner catch RETURNS 500 (does not throw), so withLogger's
    // captureError never fired → push failures were invisible in Sentry despite
    // being live. Capture here explicitly so the next occurrence has a stack trace.
    console.error('[API/Push] Request error:', err);
    captureError(err, { route: 'public.push', feature: 'push' });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});
