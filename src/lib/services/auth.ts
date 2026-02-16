import { supabase } from '@/lib/supabaseClient';

// ============================================
// Auth Service — Centralized Supabase Auth Wrapper
// ============================================

export async function signUp(email: string, password: string, redirectUrl: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectUrl },
  });
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithOtp(email: string, redirectUrl: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl },
  });
}

export async function signInWithOAuth(provider: 'google' | 'apple', redirectUrl: string) {
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectUrl },
  });
}

export async function updateUserPassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function onAuthStateChange(callback: (event: string) => void) {
  return supabase.auth.onAuthStateChange((event) => {
    callback(event);
  });
}
