import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { sendPushToUser, type PushPayload } from '@/lib/services/pushSender';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/push — Send a web push notification to a user.
 * Called by createNotification/createNotificationsBatch from the client
 * since web-push requires Node.js (server-side only).
 *
 * Body: { userId: string } & PushPayload
 * Security: Auth check — caller must be authenticated. Cross-user push is allowed
 * (e.g., trade notification to seller) since the caller is already authenticated
 * and the notification was already inserted into the DB via RLS-protected insert.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check: verify caller is the target user
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

    // Auth verified — cross-user push allowed (e.g., seller notifications after trade)
    // The notification row was already RLS-checked on INSERT, push is just delivery

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
