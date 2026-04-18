'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import {
  Shield, BarChart3, Users, Percent, Zap, Calendar, Bug, Rocket, Gift,
  DollarSign, ExternalLink, Loader2, Megaphone, Sparkles, Building2, Trophy, Banknote, Coins, Heart, Database,
} from 'lucide-react';
import { Card, StatCard } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { supabase } from '@/lib/supabaseClient';
import { qk } from '@/lib/queries/keys';
import { useScoutEventsEnabled } from '@/lib/queries/events';
import {
  getPlatformAdminRole, getSystemStats, getAllIposAcrossClubs,
  type PlatformAdminRole, type SystemStats,
} from '@/lib/services/platformAdmin';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminFeesTab } from './AdminFeesTab';
import { AdminGameweeksTab } from './AdminGameweeksTab';
import { AdminAirdropTab } from './AdminAirdropTab';
import { AdminSponsorsTab } from './AdminSponsorsTab';
import { AdminCreatorFundTab } from './AdminCreatorFundTab';
import { AdminClubsTab } from './AdminClubsTab';
import { AdminEventsManagementTab } from './AdminEventsManagementTab';
import { AdminFoundingPassesTab } from './AdminFoundingPassesTab';
import { AdminTreasuryTab } from './AdminTreasuryTab';
import { AdminEconomyTab } from './AdminEconomyTab';
import { AdminFanWishesTab } from './AdminFanWishesTab';
import { AdminLigaTab } from './AdminLigaTab';
import { AdminDataSyncTab } from './AdminDataSyncTab';

// ============================================
// Tab Config
// ============================================

type AdminTab = 'overview' | 'users' | 'clubs' | 'founding_passes' | 'treasury' | 'fees' | 'economy' | 'liga' | 'ipos' | 'gameweeks' | 'events' | 'airdrop' | 'sponsors' | 'creator_fund' | 'wishes' | 'data_sync' | 'debug';

const TAB_ICONS: Record<AdminTab, React.ElementType> = {
  overview: BarChart3, users: Users, clubs: Building2, founding_passes: Gift, treasury: Banknote, fees: Percent,
  economy: Coins, liga: Trophy, ipos: Zap, gameweeks: Calendar, events: Trophy, airdrop: Rocket, sponsors: Megaphone,
  creator_fund: Sparkles, wishes: Heart, data_sync: Database, debug: Bug,
};
const TAB_ORDER: AdminTab[] = ['overview', 'users', 'clubs', 'founding_passes', 'treasury', 'fees', 'economy', 'liga', 'ipos', 'gameweeks', 'events', 'airdrop', 'sponsors', 'creator_fund', 'wishes', 'data_sync', 'debug'];

// ============================================
// Overview Tab (inline â€” 12 lines)
// ============================================

function OverviewTab({ stats, error }: { stats: SystemStats | null; error?: boolean }) {
  const t = useTranslations('bescoutAdmin');
  if (error) return <Card className="p-6 text-center text-white/40"><BarChart3 className="size-8 mx-auto mb-2 text-white/15" aria-hidden="true" /><div className="text-sm">{t('statsLoadError')}</div></Card>;
  if (!stats) return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" /></div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <StatCard label={t('labelUsers')} value={stats.totalUsers.toString()} icon={<Users className="size-4 text-white/40" aria-hidden="true" />} />
      <StatCard label={t('labelScoutTotal')} value={`${fmtScout(centsToBsd(stats.totalBsdCirculation))}`} icon={<DollarSign className="size-4 text-gold" aria-hidden="true" />} />
      <StatCard label={t('labelVolume24h')} value={`${fmtScout(centsToBsd(stats.volume24h))}`} icon={<BarChart3 className="size-4 text-white/40" aria-hidden="true" />} />
      <StatCard label={t('labelActiveEvents')} value={stats.activeEvents.toString()} icon={<Calendar className="size-4 text-white/40" aria-hidden="true" />} />
      <StatCard label={t('labelPendingOffers')} value={stats.pendingOffers.toString()} icon={<Zap className="size-4 text-white/40" aria-hidden="true" />} />
    </div>
  );
}

// ============================================
// Scout Events Feature Toggle
// ============================================

function ScoutEventsToggle() {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const scoutEventsEnabled = useScoutEventsEnabled();
  const [toggling, setToggling] = useState(false);

  const handleToggle = useCallback(async () => {
    const newValue = !scoutEventsEnabled;
    setToggling(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert(
          { key: 'scout_events_enabled', value: newValue, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (error) {
        addToast(t('settingsFailed'), 'error');
        console.error('[ScoutEventsToggle] Failed to update setting:', error);
        return;
      }

      queryClient.invalidateQueries({ queryKey: qk.platformSettings.scoutEvents });
      addToast(newValue ? t('scoutEventsEnabled') : t('scoutEventsDisabled'), 'success');
    } catch (err) {
      console.error('[ScoutEventsToggle] Error:', err);
      addToast(t('settingsFailed'), 'error');
    } finally {
      setToggling(false);
    }
  }, [scoutEventsEnabled, addToast, queryClient, t]);

  return (
    <div className="flex items-center justify-between p-4 bg-surface-minimal border border-white/10 rounded-2xl">
      <div>
        <p className="font-black text-white">{t('scoutEventsTitle')}</p>
        <p className="text-sm text-white/50">{t('scoutEventsDescription')}</p>
      </div>
      <button
        onClick={handleToggle}
        disabled={toggling}
        aria-label={scoutEventsEnabled ? t('scoutEventsDisabled') : t('scoutEventsEnabled')}
        className={cn(
          'relative inline-flex h-7 w-12 items-center rounded-full transition-colors active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed',
          scoutEventsEnabled ? 'bg-green-500' : 'bg-white/20'
        )}
      >
        {toggling ? (
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none mx-auto text-white" aria-hidden="true" />
        ) : (
          <span
            className={cn(
              'inline-block size-5 rounded-full bg-white shadow-sm transition-transform',
              scoutEventsEnabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        )}
      </button>
    </div>
  );
}

// ============================================
// IPOs Tab (inline â€” 42 lines)
// ============================================

function IposTab() {
  const [ipos, setIpos] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllIposAcrossClubs().then(data => { setIpos(data); setLoading(false); }).catch((e) => { console.error('[IposTab] Load failed:', e); setLoading(false); });
  }, []);

  const t = useTranslations('bescoutAdmin');

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" /></div>;

  return (
    <div className="space-y-3">
      {ipos.length === 0 && (
        <Card className="p-8 text-center text-white/30">{t('noIpos')}</Card>
      )}
      {ipos.map((ipo) => {
        const player = ipo.player as { first_name?: string; last_name?: string; club?: string } | null;
        return (
          <Card key={ipo.id as string} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white">{player?.first_name} {player?.last_name}</span>
                <span className="text-white/40 text-xs ml-2">{player?.club}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className={cn('px-2 py-0.5 rounded-full font-medium',
                  ipo.status === 'open' ? 'bg-green-500/20 text-green-400' :
                  ipo.status === 'announced' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-white/10 text-white/40'
                )}>
                  {ipo.status as string}
                </span>
                <span className="font-mono tabular-nums text-gold">{fmtScout(centsToBsd(ipo.price as number))} CR</span>
                <span className="tabular-nums text-white/40">{ipo.sold as number}/{ipo.total_offered as number}</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================
// Debug Tab (inline â€” 57 lines)
// ============================================

function DebugTab() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('@/lib/services/platformAdmin').then(({ getRecentActivityLogs }) => {
      getRecentActivityLogs(50).then(data => { setLogs(data); setLoading(false); });
    });
  }, []);

  const t = useTranslations('bescoutAdmin');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">{t('recentActivity')}</span>
        <a
          href="https://supabase.com/dashboard/project/skzjfhvgccaeplydsunz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gold hover:underline flex items-center gap-1"
        >
          {t('supabaseDashboard')} <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/10">
                <th className="text-left py-2 px-2">{t('thTime')}</th>
                <th className="text-left py-2 px-2">{t('thAction')}</th>
                <th className="text-left py-2 px-2">{t('thCategory')}</th>
                <th className="text-left py-2 px-2">{t('thDetails')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  <td className="py-1.5 px-2 text-white/40 whitespace-nowrap">
                    {new Date(log.created_at as string).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-1.5 px-2 text-white font-medium">{log.action as string}</td>
                  <td className="py-1.5 px-2 text-white/60">{log.category as string}</td>
                  <td className="py-1.5 px-2 text-white/40 max-w-[200px] truncate">
                    {JSON.stringify(log.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Admin Component
// ============================================

export default function BescoutAdminContent() {
  const { user } = useUser();
  const router = useRouter();
  const t = useTranslations('bescoutAdmin');
  const [tab, setTab] = useState<AdminTab>('overview');
  const [adminRole, setAdminRole] = useState<PlatformAdminRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    if (!user) return;
    getPlatformAdminRole(user.id).then(role => {
      setAdminRole(role);
      setLoading(false);
      if (role) {
        getSystemStats().then(setStats).catch(err => {
          console.error('[BescoutAdmin] System stats load failed:', err);
          setStatsError(true);
        });
      } else {
        // Not an admin â€” redirect (middleware should catch this, but fallback)
        router.replace('/');
      }
    }).catch((e) => { console.error('[BescoutAdminContent] Role load failed:', e); setLoading(false); });
  }, [user, router]);

  if (loading || !adminRole) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gold/20 flex items-center justify-center">
          <Shield className="size-5 text-gold" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-black text-balance text-white">BeScout Admin</h1>
          <div className="text-xs text-white/40">{t('rolePrefix')}: {adminRole}</div>
        </div>
      </div>

      {/* Tabs */}
      {(() => {
        const TAB_LABELS: Record<AdminTab, string> = {
          overview: t('tabOverview'), users: t('tabUsers'), clubs: t('tabClubs'), founding_passes: t('tabFoundingPasses'), treasury: t('tabTreasury'), fees: t('tabFees'),
          economy: 'Economy', liga: 'Liga', ipos: t('tabIpos'), gameweeks: t('tabGameweeks'), events: t('tabEvents'), airdrop: t('tabAirdrop'),
          sponsors: t('tabSponsors'), creator_fund: t('tabCreatorFund'), wishes: 'Fan Wishes', data_sync: t('tabDataSync'), debug: t('tabDebug'),
        };
        return (
          <div className="flex gap-1 bg-surface-minimal rounded-xl p-1 border border-divider overflow-x-auto scrollbar-hide">
            {TAB_ORDER.map(tabId => {
              const Icon = TAB_ICONS[tabId];
              const label = TAB_LABELS[tabId];
              return (
                <button
                  key={tabId}
                  onClick={() => setTab(tabId)}
                  className={cn('flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px]',
                    tab === tabId
                      ? 'bg-gold/10 text-gold border border-gold/20'
                      : 'text-white/40 hover:text-white/60'
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  <span className="hidden md:inline">{label}</span>
                  <span className="md:hidden">{label.slice(0, 4)}</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Tab Content */}
      {tab === 'overview' && (
        <>
          <OverviewTab stats={stats} error={statsError} />
          <ScoutEventsToggle />
        </>
      )}
      {tab === 'users' && user && <AdminUsersTab adminId={user.id} role={adminRole} />}
      {tab === 'clubs' && user && <AdminClubsTab adminId={user.id} role={adminRole} />}
      {tab === 'founding_passes' && user && <AdminFoundingPassesTab adminId={user.id} />}
      {tab === 'treasury' && <AdminTreasuryTab />}
      {tab === 'fees' && user && <AdminFeesTab adminId={user.id} />}
      {tab === 'economy' && user && <AdminEconomyTab adminId={user.id} role={adminRole} />}
      {tab === 'liga' && <AdminLigaTab />}
      {tab === 'ipos' && <IposTab />}
      {tab === 'gameweeks' && <AdminGameweeksTab />}
      {tab === 'events' && user && <AdminEventsManagementTab adminId={user.id} />}
      {tab === 'airdrop' && <AdminAirdropTab />}
      {tab === 'sponsors' && user && <AdminSponsorsTab adminId={user.id} />}
      {tab === 'creator_fund' && user && <AdminCreatorFundTab adminId={user.id} />}
      {tab === 'wishes' && <AdminFanWishesTab />}
      {tab === 'data_sync' && <AdminDataSyncTab />}
      {tab === 'debug' && <DebugTab />}
    </div>
  );
}
