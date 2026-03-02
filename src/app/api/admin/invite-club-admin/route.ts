import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  // 1. Verify service role key is configured
  if (!serviceRoleKey) {
    return NextResponse.json(
      { success: false, errorKey: 'serviceKeyMissing' },
      { status: 500 },
    );
  }

  // 2. Verify caller is authenticated platform admin (via session cookie)
  const supabaseAuth = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() { /* read-only */ },
      },
    },
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, errorKey: 'notAuthenticated' }, { status: 401 });
  }

  // Check platform admin role
  const { data: adminRow } = await supabaseAuth
    .from('platform_admins')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!adminRow || !['superadmin', 'admin'].includes(adminRow.role)) {
    return NextResponse.json({ success: false, errorKey: 'noPermission' }, { status: 403 });
  }

  // 3. Parse request body
  let body: { email: string; clubId: string; role: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, errorKey: 'invalidRequest' }, { status: 400 });
  }

  const { email, clubId, role } = body;
  if (!email || !clubId || !role) {
    return NextResponse.json({ success: false, errorKey: 'emailClubRoleRequired' }, { status: 400 });
  }

  const validRoles = ['owner', 'admin', 'editor'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ success: false, errorKey: 'invalidRole', params: { roles: validRoles.join(', ') } }, { status: 400 });
  }

  // 4. Use service role client for admin operations
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 5. Verify club exists
  const { data: club } = await supabaseAdmin
    .from('clubs')
    .select('id, name')
    .eq('id', clubId)
    .maybeSingle();

  if (!club) {
    return NextResponse.json({ success: false, errorKey: 'clubNotFound' }, { status: 404 });
  }

  // 6. Find or create user by email
  let targetUserId: string;

  // Check if user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email.toLowerCase().trim());

  if (existingUser) {
    targetUserId = existingUser.id;
  } else {
    // Create new user with a random password (they'll reset via email)
    const tempPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: tempPassword,
      email_confirm: true,
    });

    if (createError || !newUser?.user) {
      return NextResponse.json(
        { success: false, errorKey: 'userCreateError', params: { error: createError?.message ?? 'Unknown' } },
        { status: 500 },
      );
    }

    targetUserId = newUser.user.id;

    // Create profile
    const handle = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20);
    await supabaseAdmin.from('profiles').insert({
      id: targetUserId,
      handle: `${handle}_${Date.now().toString(36)}`,
      display_name: email.split('@')[0],
      language: 'de',
      plan: 'free',
      level: 1,
      verified: false,
    });

    // Create wallet
    await supabaseAdmin.from('wallets').insert({
      user_id: targetUserId,
      balance: 0,
    });
  }

  // 7. Check if already club admin for this club
  const { data: existingAdmin } = await supabaseAdmin
    .from('club_admins')
    .select('id, role')
    .eq('user_id', targetUserId)
    .eq('club_id', clubId)
    .maybeSingle();

  if (existingAdmin) {
    // Update role if different
    if (existingAdmin.role !== role) {
      await supabaseAdmin
        .from('club_admins')
        .update({ role })
        .eq('id', existingAdmin.id);
      return NextResponse.json({ success: true, messageKey: 'roleUpdated', params: { email, role } });
    }
    return NextResponse.json({ success: true, messageKey: 'alreadyRole', params: { email, role } });
  }

  // 8. Create club_admins entry
  const { error: insertError } = await supabaseAdmin
    .from('club_admins')
    .insert({
      user_id: targetUserId,
      club_id: clubId,
      role,
    });

  if (insertError) {
    return NextResponse.json(
      { success: false, errorKey: 'adminCreateError', params: { error: insertError.message } },
      { status: 500 },
    );
  }

  // 9. Send password reset email (= invitation)
  const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: email.toLowerCase().trim(),
  });

  if (resetError) {
    console.error('[InviteClubAdmin] Password reset email failed:', resetError);
    // Don't fail — admin was created, just email didn't go out
  }

  return NextResponse.json({
    success: true,
    messageKey: 'invited',
    params: { email, role, club: club.name },
  });
}
