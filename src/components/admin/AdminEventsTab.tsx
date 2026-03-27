'use client';

import React from 'react';
import { Plus, Calendar, Play, Square, XCircle, Loader2, Zap, CheckCircle2, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button, Chip } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { centsToBsd } from '@/lib/services/players';
import { useScoutEventsEnabled } from '@/lib/queries/events';
import type { ClubWithAdmin } from '@/types';

import { useClubEventsData } from './hooks/useClubEventsData';
import { useEventForm } from './hooks/useEventForm';
import { useClubEventsActions } from './hooks/useClubEventsActions';
import { STATUS_STYLES } from './hooks/types';
import { EventStatusBadge } from './EventStatusBadge';
import { EventFormModal } from './EventFormModal';

// -- Status labels (Club admin uses i18n via t()) ------------------------------
// Built inside the component since we need t()

export default function AdminEventsTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');
  const { user } = useUser();
  const scoutEventsEnabled = useScoutEventsEnabled();

  // -- Hooks (ALL before any early returns) ------------------------------------
  const data = useClubEventsData(club.id);
  const form = useEventForm({ type: 'club', eventTier: 'club' });
  const actions = useClubEventsActions({
    clubId: club.id,
    userId: user?.id,
    form,
    refreshEvents: data.refreshEvents,
    refreshGwStatuses: data.refreshGwStatuses,
  });

  // -- i18n status labels (need t() so must be inside component) ---------------
  const STATUS_LABELS: Record<string, string> = {
    upcoming: t('evStatusPlanned'),
    registering: t('evStatusRegistering'),
    'late-reg': t('evStatusLateReg'),
    running: t('evStatusLive'),
    scoring: t('evStatusScoring'),
    ended: t('evStatusEnded'),
    cancelled: t('evStatusCancelled'),
  };

  // -- Original EVENT_STATUS_CONFIG (labels + colors, used for inline cards) ---
  const EVENT_STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {};
  for (const [status, styles] of Object.entries(STATUS_STYLES)) {
    EVENT_STATUS_CONFIG[status] = { ...styles, label: STATUS_LABELS[status] ?? status };
  }

  // ==========================================================================
  // Loading state
  // ==========================================================================
  if (data.loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actions.success && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-500 px-4 py-3 rounded-xl font-bold text-sm">{actions.success}</div>
      )}
      {actions.error && (
        <div role="alert" className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer" onClick={() => actions.setError(null)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); actions.setError(null); } }} tabIndex={0}>{actions.error}</div>
      )}

      {/* ===== GAMEWEEK SIMULATION ===== */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-gold" />
          <h3 className="font-black text-sm">{t('simulateGameweek')}</h3>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <select
            value={data.simGw}
            onChange={(e) => data.setSimGw(parseInt(e.target.value))}
            aria-label={t('simulateGameweek')}
            className="px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
          >
            {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => {
              const status = data.gwStatuses.find(s => s.gameweek === gw);
              return (
                <option key={gw} value={gw}>
                  {t('spieltag')} {gw} {status?.is_complete ? '\u2713' : ''}
                </option>
              );
            })}
          </select>
          <Button
            variant="gold"
            size="sm"
            onClick={() => actions.handleSimulate(data.simGw)}
            disabled={actions.simulating || data.gwStatuses.find(s => s.gameweek === data.simGw)?.is_complete === true}
          >
            {actions.simulating ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <Play className="w-4 h-4" />}
            {actions.simulating ? t('simulating') : t('simulate')}
          </Button>
          {data.gwStatuses.find(s => s.gameweek === data.simGw)?.is_complete && (
            <span className="text-green-500 text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {t('alreadySimulated')}
            </span>
          )}
        </div>
        {/* GW status overview */}
        <div className="mt-3 flex gap-1 flex-wrap">
          {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => {
            const status = data.gwStatuses.find(s => s.gameweek === gw);
            return (
              <div
                key={gw}
                className={cn(
                  'size-6 rounded text-[9px] font-bold flex items-center justify-center cursor-pointer transition-colors',
                  status?.is_complete
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                    : gw === data.simGw
                    ? 'bg-gold/15 text-gold border border-gold/30'
                    : 'bg-surface-subtle text-white/30 border border-white/[0.06]'
                )}
                onClick={() => data.setSimGw(gw)}
                title={`${t('spieltag')} ${gw}${status?.is_complete ? ` ${t('simulated')}` : ''}`}
              >
                {gw}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ===== EVENT HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-balance">{t('fantasyEvents')}</h2>
          <p className="text-xs text-white/50">{t('eventsActiveCount', { count: data.events.length, active: data.activeEvents.length })}</p>
        </div>
        <Button variant="gold" onClick={() => actions.setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('newEvent')}
        </Button>
      </div>

      {/* ===== EVENT LIST ===== */}
      {data.events.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-white/20" aria-hidden="true" />
          <div className="text-white/30 mb-2">{t('noEvents')}</div>
          <div className="text-sm text-white/50 text-pretty">{t('noEventsDesc')}</div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active events */}
          {data.activeEvents.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/50">{t('activeEventsCount', { count: data.activeEvents.length })}</div>
              {data.activeEvents.map(ev => {
                const sc = EVENT_STATUS_CONFIG[ev.status] || EVENT_STATUS_CONFIG.ended;
                return (
                  <Card key={ev.id} className="p-3 md:p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Calendar className="w-5 h-5 text-white/30 flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate">{ev.name}</div>
                          <div className="text-xs text-white/40">
                            GW {ev.gameweek} &bull; {ev.format} &bull; {centsToBsd(ev.entry_fee) > 0 ? `${fmtScout(centsToBsd(ev.entry_fee))} CR` : t('free')}
                            {ev.max_entries && ` \u2022 ${ev.current_entries}/${ev.max_entries}`}
                          </div>
                        </div>
                        <EventStatusBadge status={ev.status} label={sc.label} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>{t('startColonLabel')} {new Date(ev.starts_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{t('priceColonLabel')} <span className="tabular-nums">{fmtScout(centsToBsd(ev.prize_pool))}</span> CR</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ev.status === 'registering' && (
                          <>
                            <Button variant="gold" size="sm" onClick={() => actions.handleStatusChange(ev.id, 'running')} disabled={actions.changingId === ev.id}>
                              {actions.changingId === ev.id ? <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> : <Play className="w-3 h-3" />}{t('start')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => actions.handleStatusChange(ev.id, 'cancelled')} disabled={actions.changingId === ev.id}>
                              {actions.changingId === ev.id ? <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> : <XCircle className="w-3 h-3" />}{t('cancel')}
                            </Button>
                          </>
                        )}
                        {ev.status === 'running' && (
                          <Button variant="outline" size="sm" onClick={() => actions.handleStatusChange(ev.id, 'ended')} disabled={actions.changingId === ev.id}>
                            {actions.changingId === ev.id ? <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> : <Square className="w-3 h-3" />}{t('end')}
                          </Button>
                        )}
                        {ev.status === 'scoring' && (
                          <Button variant="outline" size="sm" onClick={() => actions.handleStatusChange(ev.id, 'ended')} disabled={actions.changingId === ev.id}>
                            {actions.changingId === ev.id ? <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> : <Square className="w-3 h-3" />}{t('finalize')}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => actions.handleClone(ev)} aria-label={`${t('cloneEvent')}: ${ev.name}`}>
                          <Copy className="w-3 h-3" aria-hidden="true" />{t('cloneEvent')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Past events */}
          {data.pastEvents.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/30">{t('pastEventsCount', { count: data.pastEvents.length })}</div>
              {data.pastEvents.map(ev => {
                const sc = EVENT_STATUS_CONFIG[ev.status] || EVENT_STATUS_CONFIG.ended;
                return (
                  <Card key={ev.id} className="p-3 md:p-4 opacity-60">
                    <div className="flex items-center gap-3 min-w-0">
                      <Calendar className="w-5 h-5 text-white/20 flex-shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{ev.name}</div>
                        <div className="text-xs text-white/40">
                          GW {ev.gameweek} &bull; <span className="tabular-nums">{ev.current_entries}</span> {t('participantsLabel')} &bull; <span className="tabular-nums">{fmtScout(centsToBsd(ev.prize_pool))}</span> CR
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => actions.handleClone(ev)} className="shrink-0" aria-label={`${t('cloneEvent')}: ${ev.name}`}>
                        <Copy className="w-3 h-3" aria-hidden="true" />{t('cloneEvent')}
                      </Button>
                      <EventStatusBadge status={ev.status} label={sc.label} />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== CREATE EVENT MODAL ===== */}
      <EventFormModal
        open={actions.modalOpen}
        onClose={() => { actions.setModalOpen(false); form.reset({ type: 'club', eventTier: 'club' }); }}
        form={form.form}
        setField={form.setField}
        onSubmit={actions.handleCreate}
        saving={actions.saving}
        isFieldDisabled={() => false}
        isRewardEditorDisabled={false}
        title={t('createEventTitle')}
        submitLabel={t('eventCreate')}
        scoutEventsEnabled={scoutEventsEnabled}
      />
    </div>
  );
}
