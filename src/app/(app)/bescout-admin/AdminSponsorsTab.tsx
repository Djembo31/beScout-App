'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Loader2, ImageIcon, ToggleLeft, ToggleRight, Eye, MousePointerClick, TrendingUp, DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button, Chip, Modal, StatCard } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { getAllSponsors, createSponsor, updateSponsor, deleteSponsor } from '@/lib/services/sponsors';
import { useSponsorStats } from '@/lib/queries';
import { cn, fmtScout } from '@/lib/utils';
import type { DbSponsor, SponsorPlacement, SponsorStatsSummary } from '@/types';

const PLACEMENT_COLORS: Record<string, string> = {
  home_hero: 'bg-blue-500/15 text-blue-300 border-blue-400/25',
  home_mid: 'bg-blue-500/10 text-blue-200 border-blue-400/20',
  market_top: 'bg-purple-500/15 text-purple-300 border-purple-400/25',
  club_hero: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
  player_mid: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
  player_footer: 'bg-sky-500/10 text-sky-200 border-sky-400/20',
  event: 'bg-gold/15 text-gold border-gold/25',
  market_transferlist: 'bg-purple-500/10 text-purple-200 border-purple-400/20',
  market_ipo: 'bg-purple-500/12 text-purple-300 border-purple-400/22',
  market_portfolio: 'bg-purple-500/8 text-purple-200 border-purple-400/18',
  market_offers: 'bg-purple-500/10 text-purple-200 border-purple-400/20',
  club_community: 'bg-amber-500/10 text-amber-200 border-amber-400/20',
  club_players: 'bg-amber-500/12 text-amber-300 border-amber-400/22',
  fantasy_spieltag: 'bg-gold/10 text-gold/80 border-gold/20',
  fantasy_pitch: 'bg-gold/12 text-gold/85 border-gold/22',
  fantasy_leaderboard: 'bg-gold/8 text-gold/75 border-gold/18',
  fantasy_history: 'bg-gold/10 text-gold/80 border-gold/20',
  profile_hero: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
  profile_footer: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/20',
  community_feed: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
  community_research: 'bg-rose-500/10 text-rose-200 border-rose-400/20',
};

type FormState = {
  name: string;
  logo_url: string;
  link_url: string;
  placement: SponsorPlacement;
  priority: string;
  starts_at: string;
  ends_at: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  logo_url: '',
  link_url: '',
  placement: 'home_hero',
  priority: '0',
  starts_at: '',
  ends_at: '',
};

export function AdminSponsorsTab({ adminId }: { adminId: string }) {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();

  const PLACEMENT_OPTIONS: { value: SponsorPlacement; label: string }[] = [
    { value: 'home_hero', label: t('placementHomeHero') },
    { value: 'home_mid', label: t('placementHomeMid') },
    { value: 'market_top', label: t('placementMarketTop') },
    { value: 'club_hero', label: t('placementClubHero') },
    { value: 'player_mid', label: t('placementPlayerMid') },
    { value: 'player_footer', label: t('placementPlayerFooter') },
    { value: 'event', label: t('placementEvent') },
    { value: 'market_transferlist', label: t('placementTransferlist') },
    { value: 'market_ipo', label: t('placementIpo') },
    { value: 'market_portfolio', label: t('placementPortfolio') },
    { value: 'market_offers', label: t('placementOffers') },
    { value: 'club_community', label: t('placementClubCommunity') },
    { value: 'club_players', label: t('placementClubPlayers') },
    { value: 'fantasy_spieltag', label: t('placementSpieltag') },
    { value: 'fantasy_pitch', label: t('placementPitch') },
    { value: 'fantasy_leaderboard', label: t('placementLeaderboard') },
    { value: 'fantasy_history', label: t('placementHistory') },
    { value: 'profile_hero', label: t('placementProfileHero') },
    { value: 'profile_footer', label: t('placementProfileFooter') },
    { value: 'community_feed', label: t('placementCommunityFeed') },
    { value: 'community_research', label: t('placementCommunityResearch') },
  ];

  const [sponsors, setSponsors] = useState<DbSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [statsDays, setStatsDays] = useState(30);
  const { data: stats } = useSponsorStats(statsDays);

  const load = useCallback(async () => {
    try {
      const data = await getAllSponsors();
      setSponsors(data);
    } catch (err) {
      console.error('[AdminSponsors] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (s: DbSponsor) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      logo_url: s.logo_url,
      link_url: s.link_url ?? '',
      placement: s.placement,
      priority: String(s.priority),
      starts_at: s.starts_at ? new Date(s.starts_at).toISOString().slice(0, 16) : '',
      ends_at: s.ends_at ? new Date(s.ends_at).toISOString().slice(0, 16) : '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.logo_url) return;
    setSaving(true);
    try {
      if (editId) {
        const result = await updateSponsor(editId, {
          name: form.name,
          logo_url: form.logo_url,
          link_url: form.link_url || null,
          placement: form.placement,
          priority: parseInt(form.priority) || 0,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        });
        if (!result.success) { addToast(result.error ?? t('error'), 'error'); return; }
        addToast(t('sponsorUpdated'), 'success');
      } else {
        const result = await createSponsor({
          name: form.name,
          logo_url: form.logo_url,
          link_url: form.link_url || undefined,
          placement: form.placement,
          priority: parseInt(form.priority) || 0,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          created_by: adminId,
        });
        if (!result.success) { addToast(result.error ?? t('error'), 'error'); return; }
        addToast(t('sponsorCreated'), 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s: DbSponsor) => {
    const result = await updateSponsor(s.id, { is_active: !s.is_active });
    if (result.success) {
      setSponsors(prev => prev.map(sp => sp.id === s.id ? { ...sp, is_active: !sp.is_active } : sp));
    } else {
      addToast(result.error ?? t('error'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteSponsor'))) return;
    const result = await deleteSponsor(id);
    if (result.success) {
      setSponsors(prev => prev.filter(s => s.id !== id));
      addToast(t('sponsorDeleted'), 'success');
    } else {
      addToast(result.error ?? t('error'), 'error');
    }
  };

  const placementLabel = (key: string) =>
    PLACEMENT_OPTIONS.find(p => p.value === key)?.label ?? key;

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-balance">{t('sponsors')}</h3>
          <p className="text-xs text-white/40">{t('sponsorCount', { count: sponsors.length, active: sponsors.filter(s => s.is_active).length })}</p>
        </div>
        <Button variant="gold" size="sm" onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" /> {t('newSponsor')}
        </Button>
      </div>

      {/* Stats Dashboard */}
      <SponsorStatsSection stats={stats ?? []} days={statsDays} onDaysChange={setStatsDays} sponsors={sponsors} placementLabel={placementLabel} />

      {sponsors.length === 0 ? (
        <Card className="p-8 text-center">
          <ImageIcon className="size-8 mx-auto mb-2 text-white/15" aria-hidden="true" />
          <div className="text-sm text-white/30">{t('noSponsors')}</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {sponsors.map(s => {
            const placementColor = PLACEMENT_COLORS[s.placement] ?? 'bg-white/10 text-white/50';
            const pLabel = placementLabel(s.placement);
            return (
              <Card key={s.id} className={cn('p-3', !s.is_active && 'opacity-40')}>
                <div className="flex items-center gap-3">
                  <img
                    src={s.logo_url}
                    alt={s.name}
                    className="size-8 rounded-lg object-contain bg-white/5 p-1 flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{s.name}</div>
                    <div className="text-[10px] text-white/40">
                      {t('priorityInfo', { priority: s.priority })} • {s.ends_at ? t('untilDate', { date: new Date(s.ends_at).toLocaleDateString('de-DE') }) : t('unlimited')}
                    </div>
                  </div>
                  <Chip className={cn(placementColor, 'border text-[10px] flex-shrink-0')}>{pLabel}</Chip>
                  <button
                    onClick={() => handleToggle(s)}
                    className="text-white/40 hover:text-white transition-colors"
                    title={s.is_active ? t('deactivate') : t('activate')}
                    aria-label={s.is_active ? t('deactivate') : t('activate')}
                  >
                    {s.is_active ? <ToggleRight className="size-5 text-green-500" aria-hidden="true" /> : <ToggleLeft className="size-5" aria-hidden="true" />}
                  </button>
                  <button onClick={() => openEdit(s)} className="text-white/40 hover:text-white transition-colors" title={t('edit')} aria-label={t('edit')}>
                    <Edit2 className="size-4" aria-hidden="true" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-white/40 hover:text-red-400 transition-colors" title={t('delete')} aria-label={t('delete')}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} title={editId ? t('editSponsor') : t('newSponsorTitle')} onClose={() => setModalOpen(false)}>
        <div className="space-y-4 p-4 md:p-6">
          <div>
            <label htmlFor="sponsor-name" className="block text-sm font-bold text-white/70 mb-1">{t('nameLabel')}</label>
            <input
              id="sponsor-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value.slice(0, 40) }))}
              placeholder={t('namePlaceholder')}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
            />
          </div>
          <div>
            <label htmlFor="sponsor-logo-url" className="block text-sm font-bold text-white/70 mb-1">{t('logoUrlLabel')}</label>
            <input
              id="sponsor-logo-url"
              type="url"
              value={form.logo_url}
              onChange={(e) => setForm(f => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
            />
            {form.logo_url && (
              <div className="mt-2 flex items-center gap-2">
                <img src={form.logo_url} alt={t('preview')} className="size-8 rounded object-contain bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-xs text-white/30">{t('preview')}</span>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="sponsor-link-url" className="block text-sm font-bold text-white/70 mb-1">{t('linkUrlLabel')}</label>
            <input
              id="sponsor-link-url"
              type="url"
              value={form.link_url}
              onChange={(e) => setForm(f => ({ ...f, link_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sponsor-placement" className="block text-sm font-bold text-white/70 mb-1">{t('placementLabel')}</label>
              <select
                id="sponsor-placement"
                value={form.placement}
                onChange={(e) => setForm(f => ({ ...f, placement: e.target.value as SponsorPlacement }))}
                className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
              >
                {PLACEMENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sponsor-priority" className="block text-sm font-bold text-white/70 mb-1">{t('priorityLabel')}</label>
              <input
                id="sponsor-priority"
                type="number"
                inputMode="numeric"
                min="0"
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sponsor-starts-at" className="block text-sm font-bold text-white/70 mb-1">{t('startLabel')}</label>
              <input
                id="sponsor-starts-at"
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm(f => ({ ...f, starts_at: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 text-white [color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="sponsor-ends-at" className="block text-sm font-bold text-white/70 mb-1">{t('endLabel')}</label>
              <input
                id="sponsor-ends-at"
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm(f => ({ ...f, ends_at: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 text-white [color-scheme:dark]"
              />
            </div>
          </div>
          <Button
            variant="gold"
            fullWidth
            onClick={handleSave}
            disabled={saving || !form.name || !form.logo_url}
          >
            {saving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
            {saving ? t('saving') : editId ? t('update') : t('create')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ── Stats Dashboard Section ──────────────────────────────

const DAYS_OPTIONS = [7, 30, 90] as const;

function SponsorStatsSection({
  stats,
  days,
  onDaysChange,
  sponsors,
  placementLabel,
}: {
  stats: SponsorStatsSummary[];
  days: number;
  onDaysChange: (d: number) => void;
  sponsors: DbSponsor[];
  placementLabel: (key: string) => string;
}) {
  const t = useTranslations('bescoutAdmin');
  const totalImpressions = stats.reduce((s, r) => s + r.total_impressions, 0);
  const totalClicks = stats.reduce((s, r) => s + r.total_clicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;

  // Estimate revenue: sum each row's impressions * sponsor's revenue_cents_per_impression
  const sponsorMap = new Map(sponsors.map(s => [s.id, s]));
  const estRevenueCents = stats.reduce((sum, r) => {
    const sp = sponsorMap.get(r.sponsor_id);
    const cpi = sp?.revenue_cents_per_impression ?? 0;
    return sum + r.total_impressions * cpi;
  }, 0);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-black text-sm">{t('sponsorKpis')}</h4>
        <div className="flex gap-1">
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors min-h-[44px]',
                days === d ? 'bg-gold/15 text-gold border border-gold/25' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'
              )}
            >
              {d}T
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t('thImpressions')} value={fmtScout(totalImpressions)} icon={<Eye className="size-4" aria-hidden="true" />} />
        <StatCard label={t('thClicks')} value={fmtScout(totalClicks)} icon={<MousePointerClick className="size-4" aria-hidden="true" />} />
        <StatCard label={t('thCtr')} value={`${avgCtr.toFixed(2)}%`} icon={<TrendingUp className="size-4" aria-hidden="true" />} />
        <StatCard label={t('estRevenue')} value={`${fmtScout(Math.round(estRevenueCents / 100))} CR`} icon={<DollarSign className="size-4" aria-hidden="true" />} />
      </div>

      {stats.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 text-left border-b border-white/[0.06]">
                <th className="pb-2 font-bold">{t('thSponsor')}</th>
                <th className="pb-2 font-bold">{t('thPlacement')}</th>
                <th className="pb-2 font-bold text-right">{t('thImpressions')}</th>
                <th className="pb-2 font-bold text-right">{t('thClicks')}</th>
                <th className="pb-2 font-bold text-right">{t('thCtr')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((r, i) => (
                <tr key={`${r.sponsor_id}-${r.placement}-${i}`} className="border-b border-white/[0.04]">
                  <td className="py-2 font-bold text-white/80">{r.sponsor_name}</td>
                  <td className="py-2">
                    <Chip className={cn(PLACEMENT_COLORS[r.placement] ?? 'bg-white/10 text-white/50', 'border text-[9px]')}>
                      {placementLabel(r.placement)}
                    </Chip>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-white/60">{fmtScout(r.total_impressions)}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-white/60">{fmtScout(r.total_clicks)}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-gold">{r.ctr}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats.length === 0 && (
        <div className="text-center text-white/25 text-xs py-4">
          {t('noTrackingData')}
        </div>
      )}
    </Card>
  );
}
