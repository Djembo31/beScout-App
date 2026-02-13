'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        subscription.unsubscribe();
        router.replace('/');
      }
    });

    // Fallback: if no SIGNED_IN event fires within 10s, something went wrong
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      setError(true);
    }, 10000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 font-bold mb-2">Anmeldung fehlgeschlagen</p>
          <p className="text-white/50 text-sm mb-4">Der Link ist ungültig oder abgelaufen.</p>
          <a
            href="/login"
            className="inline-block px-6 py-2.5 bg-[#FFD700] text-black font-bold rounded-xl text-sm hover:bg-[#FFD700]/90 transition-colors"
          >
            Zurück zum Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Anmeldung wird verarbeitet...</p>
      </div>
    </div>
  );
}
