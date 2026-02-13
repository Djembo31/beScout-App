'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, Button } from '@/components/ui';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-xl font-black">Etwas ist schiefgelaufen</h2>
        <p className="text-sm text-white/50">
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left text-xs text-red-300/70 bg-red-500/5 border border-red-500/10 rounded-xl p-3 overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <Button variant="gold" onClick={reset}>
          <RefreshCw className="w-4 h-4" />
          Erneut versuchen
        </Button>
      </Card>
    </div>
  );
}
