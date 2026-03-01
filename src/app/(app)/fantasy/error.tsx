'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, Button } from '@/components/ui';

export default function FantasyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fantasy error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="size-12 mx-auto rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center">
          <AlertCircle aria-hidden="true" className="size-6 text-red-400" />
        </div>
        <h2 className="text-xl font-black text-balance">Fantasy-Bereich nicht verfügbar</h2>
        <p className="text-sm text-white/50 text-pretty">
          Im Fantasy-Bereich ist ein Fehler aufgetreten. Deine Lineups und Ergebnisse sind sicher gespeichert.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left text-xs text-red-300/70 bg-red-500/5 border border-red-500/10 rounded-xl p-3 overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <Button variant="gold" onClick={reset}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Erneut versuchen
        </Button>
      </Card>
    </div>
  );
}
