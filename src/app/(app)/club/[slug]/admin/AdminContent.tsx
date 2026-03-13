'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, Users, Trophy, Vote, DollarSign, Settings, Loader2, Target, Shield, Activity, Wallet, Telescope, Heart, Sparkles, Megaphone,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/AuthProvider';
import { getClubBySlug } from '@/lib/services/club';
import { ErrorState, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import AdminOverviewTab from '@/components/admin/AdminOverviewTab';
import AdminPlayersTab from '@/components/admin/AdminPlayersTab';
import AdminEventsTab from '@/components/admin/AdminEventsTab';
import AdminVotesTab from '@/components/admin/AdminVotesTab';
import AdminRevenueTab from '@/components/admin/AdminRevenueTab';
import AdminSettingsTab from '@/components/admin/AdminSettingsTab';
import AdminBountiesTab from '@/components/admin/AdminBountiesTab';
import AdminModerationTab from '@/components/admin/AdminModerationTab';
import AdminAnalyticsTab from '@/components/admin/AdminAnalyticsTab';
import AdminWithdrawalTab from '@/components/admin/AdminWithdrawalTab';
import AdminScoutingTab from '@/components/admin/AdminScoutingTab';
import AdminFansTab from '@/components/admin/AdminFansTab';
import FanChallengesTab from '@/components/admin/FanChallengesTab';
import AdminSponsorTab from '@/components/admin/AdminSponsorTab';
import { canAccessTab, getRoleBadge, type AdminTab } from '@/lib/adminRoles';
import type { ClubWithAdmin } from '@/types';

const ADMIN_TAB_ICONS: { id: AdminTab; icon: React.ElementType }[] = [
  { id: 'overview', icon: BarChart3 },
  { id: 'players', icon: Users },
  { id: 'events', icon: Trophy },
  { id: 'votes', icon: Vote },
  { id: 'bounties', icon: Target },
  { id: 'scouting', icon: Telescope },
  { id: 'moderation', icon: Shield },
  { id: 'analytics', icon: Activity },
  { id: 'fans', icon: Heart },
  { id: 'challenges', icon: Sparkles },
  { id: 'revenue', icon: DollarSign },
  { id: 'withdrawal', icon: Wallet },
  { id: 'sponsors', icon: Megaphone },
  { id: 'settings', icon: Settings },
];

export default function AdminContent({ slug }: { slug: string }) {
  const t = useTranslations('admin');
  const tr = useTranslations('roles');
  const { user, platformRole } = useUser();
  const router = useRouter();
  const [club, setClub] = useState<ClubWithAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');
  const role = club?.admin_role ?? 'editor';
  const tabLabel = (id: AdminTab): string => id === 'fans' ? t('fansCrm') : t(id);
  const visibleTabs = ADMIN_TAB_ICONS.filter(tab => canAccessTab(tab.id, role));

  // Reset tab if current tab not accessible for this role
  useEffect(() => {
    if (club && !canAccessTab(tab, role)) {
      setTab(visibleTabs[0]?.id ?? 'overview');
    }
  }, [club, role, tab, visibleTabs]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const data = await getClubBySlug(slug, user?.id);
        if (cancelled) return;
        if (!data) {
          router.replace(`/club/${slug}`);
          return;
        }
        // Platform admin override: synthetic owner access
        if (platformRole && !data.is_admin) {
          data.is_admin = true;
          data.admin_role = 'owner';
        }
        if (!data.is_admin) {
          router.replace(`/club/${slug}`);
          return;
        }
        setClub(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug, user, router]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <ErrorState onRetry={() => setError(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-balance">{club.name} Admin</h1>
            <p className="text-sm text-white/50 text-pretty">{t('clubAdmin')}</p>
          </div>
          {(() => {
            const badge = getRoleBadge(role);
            return (
              <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border', badge.color, badge.bg, badge.border)}>
                {tr(badge.labelKey)}
              </span>
            );
          })()}
        </div>
        <button
          onClick={() => router.push(`/club/${slug}`)}
          className="text-sm text-gold hover:underline"
        >
          {t('backToClub')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-white/10 overflow-x-auto mb-6 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {visibleTabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn('flex-shrink-0 px-2.5 md:px-4 py-2.5 text-xs md:text-sm font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1 md:gap-1.5 min-h-[44px]',
              tab === item.id ? 'text-gold' : 'text-white/60 hover:text-white'
            )}
          >
            <item.icon className="size-4" aria-hidden="true" />
            {tabLabel(item.id)}
            {tab === item.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && <AdminOverviewTab club={club} />}
      {tab === 'players' && <AdminPlayersTab club={club} />}
      {tab === 'events' && <AdminEventsTab club={club} />}
      {tab === 'votes' && <AdminVotesTab club={club} />}
      {tab === 'bounties' && <AdminBountiesTab club={club} />}
      {tab === 'scouting' && <AdminScoutingTab club={club} />}
      {tab === 'moderation' && <AdminModerationTab club={club} />}
      {tab === 'analytics' && <AdminAnalyticsTab club={club} />}
      {tab === 'fans' && <AdminFansTab club={club} />}
      {tab === 'challenges' && <FanChallengesTab club={club} />}
      {tab === 'revenue' && <AdminRevenueTab club={club} />}
      {tab === 'withdrawal' && <AdminWithdrawalTab club={club} />}
      {tab === 'sponsors' && <AdminSponsorTab club={club} />}
      {tab === 'settings' && <AdminSettingsTab club={club} />}
    </div>
  );
}
