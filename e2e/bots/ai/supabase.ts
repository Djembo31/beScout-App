import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) throw new Error('Missing SUPABASE env vars in .env.local');

export function getAdminClient(): SupabaseClient {
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createBotClient(email: string, password: string): Promise<{
  client: SupabaseClient;
  userId: string;
}> {
  const client = createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Bot login failed for ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
}
