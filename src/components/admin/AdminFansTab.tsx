'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Users, User, Shield, Crown, TrendingUp, Search, Loader2, Activity, Download, SlidersHorizontal, Check } from 'lucide-react';
import { Card, SearchInput, Button } from '@/components/ui';
import { cn, downloadCsv } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/providers/ToastProvider';
import {
  getClubFanSegments, getClubFanList, getClubRetentionMetrics,
  type FanSegment, type ClubFanProfile, type RetentionMetrics,
} from '@/lib/services/clubCrm';
import { getClubFanRankThresholds, setClubFanRankThresholds, DEFAULT_FAN_RANK_THRESHOLDS } from '@/lib/services/fanRanking';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import type { ClubWithAdmin, ClubFanRankThresholds } from '@/types';

// ============================================
// FAN-RANG SCHWELLEN — Slice 347 (FRE-5)
// Club-Admin konfiguriert die Score-Schwellen (Stammgast→Vereinsikone).
// Monoton steigend, 1..100. Save → SECURITY-DEFINER-RPC (Recalc-on-Save).
// ============================================

const THRESHOLD_FIELDS: { key: keyof ClubFanRankThresholds; labelKey: string }[] = [
  { key: 'stammgast', labelKey: 'fanRankStammgast' },
  { key: 'ultra', labelKey: 'fanRankUltra' },
  { key: 'legende', labelKey: 'fanRankLegende' },
  { key: 'ehrenmitglied', labelKey: 'fanRankEhrenmitglied' },
  { key: 'vereinsikone', labelKey: 'fanRankVereinsikone' },
];

/** Strictly increasing + every value within 1..100 (mirrors the RPC + CHECK constraint). */
function thresholdsValid(t: ClubFanRankThresholds): boolean {
  const vals = [t.stammgast, t.ultra, t.legende, t.ehrenmitglied, t.vereinsikone];
  if (vals.some(v => !Number.isInteger(v) || v < 1 || v > 100)) return false;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] <= vals[i - 1]) return false;
  }
  return true;
}

function FanRankThresholdsSection({ clubId }: { clubId: string }) {
  const t = useTranslations('adminFans');
  const tg = useTranslations('gamification');
  const te = useTranslations('errors');
  const { addToast } = useToast();

  const [values, setValues] = useState<ClubFanRankThresholds>(DEFAULT_FAN_RANK_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const th = await getClubFanRankThresholds(clubId);
        if (!cancelled) setValues(th);
      } catch (err) {
        if (!cancelled) addToast(te(mapErrorToKey(normalizeError(err))), 'error');
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [clubId, te, addToast]);

  const handleChange = (key: keyof ClubFanRankThresholds, raw: string) => {
    const n = parseInt(raw, 10);
    setValues(prev => ({ ...prev, [key]: Number.isNaN(n) ? 0 : n }));
  };

  const valid = thresholdsValid(values);

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await setClubFanRankThresholds(clubId, values);
      addToast(t('fanRankThresholdsSaved'), 'success');
    } catch (err) {
      addToast(te(mapErrorToKey(normalizeError(err))), 'error');
    }
    setSaving(false);
  };

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="size-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
          <SlidersHorizontal className="size-4 text-gold" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="font-black text-sm">{t('fanRankThresholdsTitle')}</div>
          <div className="text-xs text-white/50 text-pretty">{t('fanRankThresholdsDesc')}</div>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="size-6 animate-spin text-white/30" aria-hidden="true" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {THRESHOLD_FIELDS.map(({ key, labelKey }) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/10 px-3 py-2">
                <label htmlFor={`fanrank-th-${key}`} className="text-xs font-bold text-white/70 truncate">
                  {tg(labelKey)}
                </label>
                <input
                  id={`fanrank-th-${key}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={values[key]}
                  onChange={e => handleChange(key, e.target.value)}
                  aria-label={tg(labelKey)}
                  className="w-20 min-h-[44px] text-base text-center font-mono tabular-nums rounded-lg bg-black/40 border border-white/15 text-white focus:border-gold/50 focus:outline-none transition-colors"
                />
              </div>
            ))}
          </div>

          {!valid && (
            <p role="alert" className="mt-3 text-[11px] text-rose-400 text-pretty">
              {t('fanRankThresholdsInvalid')}
            </p>
          )}

          <Button
            variant="gold"
            size="sm"
            onClick={handleSave}
            disabled={!valid || saving}
            loading={saving}
            aria-busy={saving}
            className="mt-4 w-full sm:w-auto"
          >
            {!saving && <Check className="size-4" aria-hidden="true" />}
            {t('fanRankThresholdsSave')}
          </Button>
        </>
      )}
    </Card>
  );
}

const SEGMENT_ICONS: Record<string, React.ReactNode> = {
  users: <Users className="w-5 h-5" />,
  user: <User className="w-5 h-5" />,
  shield: <Shield className="w-5 h-5" />,
  crown: <Crown className="w-5 h-5" />,
  'trending-up': <TrendingUp className="w-5 h-5" />,
};

const SEGMENT_COLORS: Record<string, string> = {
  all: 'text-white/60 bg-surface-base border-white/10',
  free: 'text-white/60 bg-surface-base border-white/10',
  bronze: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  silber: 'text-slate-300 bg-slate-400/10 border-slate-400/20',
  gold: 'text-gold bg-gold/10 border-gold/20',
  trader: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export default function AdminFansTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('adminFans');
  const [segments, setSegments] = useState<FanSegment[]>([]);
  const [fans, setFans] = useState<ClubFanProfile[]>([]);
  const [metrics, setMetrics] = useState<RetentionMetrics | null>(null);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fansLoading, setFansLoading] = useState(false);

  // Load segments + metrics on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [segs, ret, fanList] = await Promise.all([
        getClubFanSegments(club.id),
        getClubRetentionMetrics(club.id),
        getClubFanList(club.id, 'all', 50),
      ]);
      if (cancelled) return;
      setSegments(segs);
      setMetrics(ret);
      setFans(fanList);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [club.id]);

  // Reload fans on segment change
  const loadFans = useCallback(async (seg: string) => {
    setFansLoading(true);
    const fanList = await getClubFanList(club.id, seg, 50);
    setFans(fanList);
    setFansLoading(false);
  }, [club.id]);

  const handleSegmentClick = (segId: string) => {
    setSelectedSegment(segId);
    loadFans(segId);
  };

  const filteredFans = search
    ? fans.filter(f =>
        f.handle.toLowerCase().includes(search.toLowerCase()) ||
        (f.displayName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : fans;

  const handleExport = useCallback(() => {
    if (filteredFans.length === 0) return;
    downloadCsv(
      filteredFans.map(f => ({
        Handle: f.handle,
        Name: f.displayName ?? '',
        Tier: f.tier ?? 'free',
        Holdings: f.holdingsCount,
        'Last Active': f.lastActivity ?? '',
      })),
      `fans-${selectedSegment}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }, [filteredFans, selectedSegment]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-surface-minimal animate-pulse motion-reduce:animate-none border border-divider" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-surface-minimal animate-pulse motion-reduce:animate-none border border-divider" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Retention KPIs */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: t('totalFollowers'), value: metrics.totalFollowers },
            { label: t('subscribers'), value: metrics.totalSubscribers },
            { label: 'DAU', value: metrics.dau },
            { label: 'WAU', value: metrics.wau },
            { label: 'MAU', value: metrics.mau },
          ].map(kpi => (
            <Card key={kpi.label} className="p-4 text-center">
              <div className="text-2xl font-black font-mono tabular-nums">{kpi.value}</div>
              <div className="text-[10px] text-white/40 font-semibold uppercase mt-1">{kpi.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Fan-Rang-Schwellen — Slice 347 (FRE-5) */}
      <FanRankThresholdsSection clubId={club.id} />

      {/* Segment Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {segments.map(seg => {
          const colors = SEGMENT_COLORS[seg.id] ?? SEGMENT_COLORS.all;
          const isActive = selectedSegment === seg.id;
          return (
            <button
              key={seg.id}
              onClick={() => handleSegmentClick(seg.id)}
              aria-label={`${seg.label} (${seg.count})`}
              aria-pressed={isActive}
              className={cn('p-4 rounded-2xl border text-left transition-colors', isActive ? 'border-gold/30 bg-gold/5 ring-1 ring-gold/20' : 'border-divider bg-surface-minimal hover:bg-surface-elevated')}
            >
              <div className={cn('size-10 rounded-xl flex items-center justify-center mb-2 border', colors)}>
                {SEGMENT_ICONS[seg.icon] ?? <Users className="w-5 h-5" />}
              </div>
              <div className="text-xl font-black font-mono tabular-nums">{seg.count}</div>
              <div className="text-[10px] text-white/40 font-semibold">{seg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Fan List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-divider flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('searchFans')}
            className="flex-1"
          />
          <div className="text-xs text-white/40 whitespace-nowrap">
            {filteredFans.length} {t('fans')}
          </div>
          <Button variant="ghost" size="sm" onClick={handleExport} disabled={filteredFans.length === 0} aria-label={t('exportCsv')}>
            <Download className="size-3.5 mr-1" aria-hidden="true" />
            CSV
          </Button>
        </div>

        {fansLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : filteredFans.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/30">{t('noFans')}</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredFans.map(fan => (
              <div key={fan.userId} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-minimal transition-colors">
                {/* Avatar */}
                <div className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50 shrink-0 overflow-hidden">
                  {fan.avatarUrl ? (
                    <Image src={fan.avatarUrl} alt="" fill className="object-cover" />
                  ) : (
                    fan.handle.substring(0, 2).toUpperCase()
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {fan.displayName ?? fan.handle}
                  </div>
                  <div className="text-[10px] text-white/40">@{fan.handle}</div>
                </div>

                {/* Tier Badge */}
                {fan.tier && (
                  <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold border', SEGMENT_COLORS[fan.tier])}>
                    {fan.tier.charAt(0).toUpperCase() + fan.tier.slice(1)}
                  </span>
                )}

                {/* Holdings */}
                {fan.holdingsCount > 0 && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {fan.holdingsCount} SC
                  </span>
                )}

                {/* Last Activity */}
                <div className="flex items-center gap-1 text-[10px] text-white/30 shrink-0">
                  <Activity className="w-3 h-3" />
                  {formatRelativeTime(fan.lastActivity)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
