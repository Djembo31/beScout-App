'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, Users, Trophy, Vote, DollarSign, Settings, Loader2, Target, Shield, Activity, Wallet,
} from 'lucide-react';
import { useUser } from '@/components/providers/AuthProvider';
import { getClubBySlug } from '@/lib/services/club';
import { ErrorState, Skeleton } from '@/components/ui';
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
import type { ClubWithAdmin } from '@/types';

type AdminTab = 'overview' | 'players' | 'events' | 'votes' | 'bounties' | 'moderation' | 'revenue' | 'analytics' | 'withdrawal' | 'settings';

const ADMIN_TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Übersicht', icon: BarChart3 },
  { id: 'players', label: 'Spieler', icon: Users },
  { id: 'events', label: 'Events', icon: Trophy },
  { id: 'votes', label: 'Abstimmungen', icon: Vote },
  { id: 'bounties', label: 'Aufträge', icon: Target },
  { id: 'moderation', label: 'Moderation', icon: Shield },
  { id: 'analytics', label: 'Fan-Analyse', icon: Activity },
  { id: 'revenue', label: 'Einnahmen', icon: DollarSign },
  { id: 'withdrawal', label: 'Auszahlung', icon: Wallet },
  { id: 'settings', label: 'Einstellungen', icon: Settings },
];

export default function AdminContent({ slug }: { slug: string }) {
  const { user } = useUser();
  const router = useRouter();
  const [club, setClub] = useState<ClubWithAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const data = await getClubBySlug(slug, user?.id);
        if (cancelled) return;
        if (!data || !data.is_admin) {
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
        <div>
          <h1 className="text-2xl md:text-3xl font-black">{club.name} Admin</h1>
          <p className="text-sm text-white/50">Club-Verwaltung • Rolle: {club.admin_role}</p>
        </div>
        <button
          onClick={() => router.push(`/club/${slug}`)}
          className="text-sm text-[#FFD700] hover:underline"
        >
          Zurück zur Club-Seite
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-white/10 overflow-x-auto mb-6 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {ADMIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-2.5 md:px-4 py-2.5 text-xs md:text-sm font-semibold transition-all relative whitespace-nowrap flex items-center gap-1 md:gap-1.5 min-h-[44px] ${
              tab === t.id ? 'text-[#FFD700]' : 'text-white/60 hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFD700]" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && <AdminOverviewTab club={club} />}
      {tab === 'players' && <AdminPlayersTab club={club} />}
      {tab === 'events' && <AdminEventsTab club={club} />}
      {tab === 'votes' && <AdminVotesTab club={club} />}
      {tab === 'bounties' && <AdminBountiesTab club={club} />}
      {tab === 'moderation' && <AdminModerationTab club={club} />}
      {tab === 'analytics' && <AdminAnalyticsTab club={club} />}
      {tab === 'revenue' && <AdminRevenueTab club={club} />}
      {tab === 'withdrawal' && <AdminWithdrawalTab club={club} />}
      {tab === 'settings' && <AdminSettingsTab club={club} />}
    </div>
  );
}
