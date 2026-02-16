'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, BarChart3, Users, Percent, Zap, Calendar, Bug, Rocket,
  DollarSign, ExternalLink, Loader2,
} from 'lucide-react';
import { Card, StatCard } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { fmtBSD } from '@/types';
import { centsToBsd } from '@/lib/services/players';
import {
  getPlatformAdminRole, getSystemStats, getAllIposAcrossClubs,
  type PlatformAdminRole, type SystemStats,
} from '@/lib/services/platformAdmin';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminFeesTab } from './AdminFeesTab';
import { AdminGameweeksTab } from './AdminGameweeksTab';
import { AdminAirdropTab } from './AdminAirdropTab';

// ============================================
// Tab Config
// ============================================

type AdminTab = 'overview' | 'users' | 'fees' | 'ipos' | 'gameweeks' | 'airdrop' | 'debug';

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Übersicht', icon: BarChart3 },
  { id: 'users', label: 'Benutzer', icon: Users },
  { id: 'fees', label: 'Gebühren', icon: Percent },
  { id: 'ipos', label: 'IPOs', icon: Zap },
  { id: 'gameweeks', label: 'Spieltage', icon: Calendar },
  { id: 'airdrop', label: 'Airdrop', icon: Rocket },
  { id: 'debug', label: 'Debug', icon: Bug },
];

// ============================================
// Overview Tab (inline — 12 lines)
// ============================================

function OverviewTab({ stats }: { stats: SystemStats | null }) {
  if (!stats) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <StatCard label="Benutzer" value={stats.totalUsers.toString()} icon={<Users className="w-4 h-4 text-white/40" />} />
      <StatCard label="BSD Gesamt" value={`${fmtBSD(centsToBsd(stats.totalBsdCirculation))}`} icon={<DollarSign className="w-4 h-4 text-[#FFD700]" />} />
      <StatCard label="24h Volumen" value={`${fmtBSD(centsToBsd(stats.volume24h))}`} icon={<BarChart3 className="w-4 h-4 text-white/40" />} />
      <StatCard label="Aktive Events" value={stats.activeEvents.toString()} icon={<Calendar className="w-4 h-4 text-white/40" />} />
      <StatCard label="Offene Angebote" value={stats.pendingOffers.toString()} icon={<Zap className="w-4 h-4 text-white/40" />} />
    </div>
  );
}

// ============================================
// IPOs Tab (inline — 42 lines)
// ============================================

function IposTab() {
  const [ipos, setIpos] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllIposAcrossClubs().then(data => { setIpos(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-3">
      {ipos.length === 0 && (
        <Card className="p-8 text-center text-white/30">Keine IPOs gefunden.</Card>
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
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  ipo.status === 'open' ? 'bg-green-500/20 text-green-400' :
                  ipo.status === 'announced' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-white/10 text-white/40'
                }`}>
                  {ipo.status as string}
                </span>
                <span className="font-mono text-[#FFD700]">{fmtBSD(centsToBsd(ipo.price as number))} BSD</span>
                <span className="text-white/40">{ipo.sold as number}/{ipo.total_offered as number}</span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================
// Debug Tab (inline — 57 lines)
// ============================================

function DebugTab() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('@/lib/services/platformAdmin').then(({ getRecentActivityLogs }) => {
      getRecentActivityLogs(50).then(data => { setLogs(data); setLoading(false); });
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">Letzte Aktivitäten</span>
        <a
          href="https://supabase.com/dashboard/project/skzjfhvgccaeplydsunz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#FFD700] hover:underline flex items-center gap-1"
        >
          Supabase Dashboard <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-white/10">
                <th className="text-left py-2 px-2">Zeit</th>
                <th className="text-left py-2 px-2">Aktion</th>
                <th className="text-left py-2 px-2">Kategorie</th>
                <th className="text-left py-2 px-2">Details</th>
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
  const [tab, setTab] = useState<AdminTab>('overview');
  const [adminRole, setAdminRole] = useState<PlatformAdminRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    if (!user) return;
    getPlatformAdminRole(user.id).then(role => {
      setAdminRole(role);
      setLoading(false);
      if (role) {
        getSystemStats().then(setStats).catch(err => console.error('[BescoutAdmin] System stats load failed:', err));
      } else {
        // Not an admin — redirect (middleware should catch this, but fallback)
        router.replace('/');
      }
    }).catch(() => setLoading(false));
  }, [user, router]);

  if (loading || !adminRole) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FFD700]/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#FFD700]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">BeScout Admin</h1>
          <div className="text-xs text-white/40">Rolle: {adminRole}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/[0.06] overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && <OverviewTab stats={stats} />}
      {tab === 'users' && user && <AdminUsersTab adminId={user.id} role={adminRole} />}
      {tab === 'fees' && user && <AdminFeesTab adminId={user.id} />}
      {tab === 'ipos' && <IposTab />}
      {tab === 'gameweeks' && <AdminGameweeksTab />}
      {tab === 'airdrop' && <AdminAirdropTab />}
      {tab === 'debug' && <DebugTab />}
    </div>
  );
}
