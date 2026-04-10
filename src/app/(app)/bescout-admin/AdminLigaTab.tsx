'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { useCurrentLigaSeason, useMonthlyLigaWinners } from '@/lib/queries/gamification';
import { supabase } from '@/lib/supabaseClient';
import { fmtScout } from '@/lib/utils';
import { Loader2, Trophy, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminLigaTab() {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();
  const { data: season, isLoading: seasonLoading } = useCurrentLigaSeason();
  const { data: winners = [] } = useMonthlyLigaWinners();

  const [closing, setClosing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Current month (first day)
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const previousMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  })();

  // Check if previous month is already closed
  const prevMonthClosed = winners.some(w => w.month === previousMonth);

  const handleCloseMonth = useCallback(async (month: string) => {
    setClosing(true);
    try {
      const { data, error } = await supabase.rpc('close_monthly_liga', { p_month: month });
      if (error) {
        addToast(`Fehler: ${error.message}`, 'error');
        console.error('[AdminLiga] close_monthly_liga error:', error);
        return;
      }
      const result = data as { ok?: boolean; error?: string; winners_inserted?: number };
      if (result?.error) {
        addToast(`Fehler: ${result.error}`, 'error');
        return;
      }
      addToast(`Monat ${month} abgeschlossen — ${result?.winners_inserted ?? 0} Sieger`, 'success');
    } catch (err) {
      console.error('[AdminLiga] close error:', err);
      addToast('Unerwarteter Fehler', 'error');
    } finally {
      setClosing(false);
    }
  }, [addToast]);

  const handleSeasonReset = useCallback(async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setResetting(true);
    try {
      // Next season: calculate from current end
      const nextStart = season?.end_date
        ? new Date(new Date(season.end_date).getFullYear(), 7, 1).toISOString().split('T')[0]
        : `${now.getFullYear()}-08-01`;
      const nextEnd = season?.end_date
        ? new Date(new Date(season.end_date).getFullYear() + 1, 4, 31).toISOString().split('T')[0]
        : `${now.getFullYear() + 1}-05-31`;
      const nextName = season?.end_date
        ? `${new Date(season.end_date).getFullYear()}/${String(new Date(season.end_date).getFullYear() + 1).slice(-2)}`
        : `${now.getFullYear()}/${String(now.getFullYear() + 1).slice(-2)}`;

      const { data, error } = await supabase.rpc('soft_reset_season', {
        p_new_season_name: nextName,
        p_start: nextStart,
        p_end: nextEnd,
      });
      if (error) {
        addToast(`Fehler: ${error.message}`, 'error');
        console.error('[AdminLiga] soft_reset_season error:', error);
        return;
      }
      const result = data as { ok?: boolean; users_reset?: number };
      addToast(`Saison-Reset: ${result?.users_reset ?? 0} User auf 80% zurückgesetzt`, 'success');
    } catch (err) {
      console.error('[AdminLiga] reset error:', err);
      addToast('Unerwarteter Fehler', 'error');
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  }, [addToast, confirmReset, season, now]);

  if (seasonLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-5 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Season Info */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="size-4 text-gold" />
          <h3 className="text-sm font-black text-white">Aktive Saison</h3>
        </div>
        {season ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <InfoCell label="Name" value={season.name} />
            <InfoCell label="Start" value={season.start_date} />
            <InfoCell label="Ende" value={season.end_date} />
            <InfoCell label="Status" value={season.is_active ? 'Aktiv' : 'Inaktiv'} highlight={season.is_active} />
          </div>
        ) : (
          <p className="text-white/40 text-sm">Keine aktive Saison gefunden.</p>
        )}
      </Card>

      {/* Close Month */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="size-4 text-white/40" />
          <h3 className="text-sm font-black text-white">Monat abschließen</h3>
        </div>
        <p className="text-[13px] text-white/50 mb-4">
          Snapshots alle User-Scores, berechnet Rankings pro Dimension, und vergibt Rewards an Top 3.
          Rewards: #1 = 5.000 CR, #2 = 2.500 CR, #3 = 1.000 CR.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-white/40">Vormonat: {previousMonth}</span>
              {prevMonthClosed && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="size-3" /> Abgeschlossen
                </span>
              )}
            </div>
            <Button
              onClick={() => handleCloseMonth(previousMonth)}
              disabled={closing || prevMonthClosed}
              className="w-full"
            >
              {closing ? <Loader2 className="size-4 animate-spin" /> : prevMonthClosed ? 'Bereits abgeschlossen' : `${previousMonth} abschließen`}
            </Button>
          </div>
        </div>
      </Card>

      {/* Season Reset */}
      <Card className="p-5 border-rose-500/20">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="size-4 text-rose-400" />
          <h3 className="text-sm font-black text-white">Saison-Reset (80%)</h3>
        </div>
        <p className="text-[13px] text-white/50 mb-4">
          Setzt ALLE User-Scores auf 80% des aktuellen Werts zurück, erstellt eine neue Saison,
          und deaktiviert die aktuelle. Nur am Saison-Ende nutzen.
        </p>
        <Button
          onClick={handleSeasonReset}
          disabled={resetting}
          className={cn(
            'w-full sm:w-auto',
            confirmReset
              ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500'
              : ''
          )}
        >
          {resetting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : confirmReset ? (
            'Wirklich zurücksetzen?'
          ) : (
            'Saison-Reset durchführen'
          )}
        </Button>
        {confirmReset && !resetting && (
          <button
            onClick={() => setConfirmReset(false)}
            className="ml-3 text-[11px] text-white/40 hover:text-white/60 transition-colors"
          >
            Abbrechen
          </button>
        )}
      </Card>

      {/* Recent Winners */}
      {winners.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-black text-white mb-4">Letzte Monats-Sieger</h3>
          <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
            {winners.map((w, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02]">
                <span className="text-[10px] text-white/30 w-20">{w.month}</span>
                <span className={cn(
                  'text-[10px] font-bold w-14',
                  w.dimension === 'overall' ? 'text-gold' :
                  w.dimension === 'trader' ? 'text-sky-400' :
                  w.dimension === 'manager' ? 'text-purple-400' :
                  'text-emerald-400'
                )}>
                  {w.dimension}
                </span>
                <span className="text-[11px] font-mono text-gold w-4">#{w.rank}</span>
                <span className="text-[12px] font-bold text-white flex-1 truncate">
                  {w.display_name || w.handle}
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  +{fmtScout(w.reward_cents)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <span className="text-[10px] text-white/30 block">{label}</span>
      <span className={cn('text-[13px] font-bold', highlight ? 'text-emerald-400' : 'text-white')}>
        {value}
      </span>
    </div>
  );
}
