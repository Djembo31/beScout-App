import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { sendPushForNotification } from '@/lib/services/pushSender';
import { withLogger } from '@/lib/observability/apiLogger';

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
  // Slice 488: no inner try/catch — unexpected errors propagate to withLogger, whose
  // catch captures the original error (+stack) to Sentry and re-throws → 500. The old
  // inner catch RETURNED 500 (S369) which bypassed that capture; withLogger now also
  // captures returned 5xx, so the explicit catch is redundant (Schnitt-Regel: removed).
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
});
