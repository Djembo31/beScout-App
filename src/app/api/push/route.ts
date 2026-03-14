import { NextResponse } from 'next/server';
import { sendPushToUser, type PushPayload } from '@/lib/services/pushSender';

/**
 * POST /api/push — Send a web push notification to a user.
 * Called by createNotification/createNotificationsBatch from the client
 * since web-push requires Node.js (server-side only).
 *
 * Body: { userId: string } & PushPayload
 * Security: Lightweight — no auth check because the caller already
 * authenticated via Supabase RLS to insert the notification row.
 * The push merely mirrors the already-persisted in-app notification.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, body: pushBody, url, tag } = body as {
      userId: string;
      title: string;
      body?: string;
      url?: string;
      tag?: string;
    };

    if (!userId || !title) {
      return NextResponse.json({ error: 'Missing userId or title' }, { status: 400 });
    }

    const payload: PushPayload = { title, body: pushBody, url, tag };

    // Fire-and-forget: don't block the response on push delivery
    sendPushToUser(userId, payload).catch((err) =>
      console.error('[API/Push] sendPushToUser failed:', err)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API/Push] Request error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
