'use client';

import { Trophy, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FantasyHeaderProps {
  activeCount: number;
  // Slice 397 (E-4b): Create-Button öffnet den User-Event-Builder → für JEDEN
  // eingeloggten Nutzer sichtbar (Page ist auth-guarded). Kein isAdmin-Gate mehr.
  onCreateClick: () => void;
}

export function FantasyHeader({ activeCount, onCreateClick }: FantasyHeaderProps) {
  const tc = useTranslations('common');

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl md:text-2xl font-black flex items-center gap-2 text-balance">
        <Trophy className="size-6 text-gold" />
        Fantasy
      </h1>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-3 mr-2">
          <div className="flex items-center gap-1.5 text-sm">
            <div className="size-2 rounded-full bg-green-500" />
            <span className="font-mono font-bold tabular-nums text-green-500">{activeCount}</span>
            <span className="text-white/40 text-xs">{tc('active')}</span>
          </div>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1.5 px-3 py-2 bg-gold/10 border border-gold/20 rounded-xl text-sm font-semibold text-gold hover:bg-gold/20 transition-colors"
          aria-label={tc('create')}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">{tc('create')}</span>
        </button>
      </div>
    </div>
  );
}
