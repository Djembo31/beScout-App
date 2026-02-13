'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-sm w-full bg-white/[0.02] border border-white/10 rounded-2xl p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-black">Fehler</h2>
        <p className="text-sm text-white/50">
          Ein Fehler ist aufgetreten. Bitte versuche es erneut.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700] text-black text-sm font-bold rounded-xl hover:bg-[#FFD700]/90 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
