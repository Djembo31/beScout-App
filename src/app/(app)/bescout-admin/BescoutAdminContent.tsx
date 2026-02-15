'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, BarChart3, Users, Percent, Zap, Calendar, Bug,
  Search, DollarSign, ChevronRight, ExternalLink, Loader2,
  Plus, Minus, Check, Play, RefreshCw,
} from 'lucide-react';
import { Card, Button, Modal, StatCard } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { fmtBSD } from '@/types';
import { centsToBsd } from '@/lib/services/players';
import {
  getPlatformAdminRole, getSystemStats, getAllUsers,
  adjustWallet, getAllFeeConfigs, updateFeeConfig, getAllIposAcrossClubs,
  type PlatformAdminRole, type SystemStats, type AdminUser,
} from '@/lib/services/platformAdmin';
import { getFullGameweekStatus, simulateGameweekFlow, type FullGameweekStatus } from '@/lib/services/scoring';
import type { DbFeeConfig } from '@/types';

// ============================================
// Tab Config
// ============================================

type AdminTab = 'overview' | 'users' | 'fees' | 'ipos' | 'gameweeks' | 'debug';

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Übersicht', icon: BarChart3 },
  { id: 'users', label: 'Benutzer', icon: Users },
  { id: 'fees', label: 'Gebühren', icon: Percent },
  { id: 'ipos', label: 'IPOs', icon: Zap },
  { id: 'gameweeks', label: 'Spieltage', icon: Calendar },
  { id: 'debug', label: 'Debug', icon: Bug },
];

// ============================================
// Overview Tab
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
// Users Tab
// ============================================

function UsersTab({ adminId, role }: { adminId: string; role: PlatformAdminRole }) {
  const { addToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adjustModal, setAdjustModal] = useState<AdminUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const data = await getAllUsers(50, 0, search || undefined);
    setUsers(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handleAdjust = async () => {
    if (!adjustModal || !adjustAmount || !adjustReason) return;
    const cents = Math.round(parseFloat(adjustAmount) * 100);
    if (cents === 0) return;
    setAdjusting(true);
    try {
      const result = await adjustWallet(adminId, adjustModal.id, cents, adjustReason);
      if (result.success) {
        addToast(`Wallet angepasst: ${fmtBSD(centsToBsd(result.new_balance ?? 0))} BSD`, 'success');
        setAdjustModal(null);
        setAdjustAmount('');
        setAdjustReason('');
        loadUsers();
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Benutzer suchen..."
          className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/30"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left py-2 px-3">Handle</th>
                <th className="text-right py-2 px-3">Balance</th>
                <th className="text-right py-2 px-3">Holdings</th>
                <th className="text-right py-2 px-3">Trades</th>
                <th className="text-right py-2 px-3">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3">
                    <Link href={`/profile/${u.handle}`} className="text-white hover:text-[#FFD700] font-medium">
                      @{u.handle}
                    </Link>
                    {u.displayName && <span className="text-white/40 ml-1 text-xs">{u.displayName}</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#FFD700]">
                    {fmtBSD(centsToBsd(u.balance))}
                  </td>
                  <td className="py-2.5 px-3 text-right text-white/60">{u.holdingsCount}</td>
                  <td className="py-2.5 px-3 text-right text-white/60">{u.tradesCount}</td>
                  <td className="py-2.5 px-3 text-right">
                    {role !== 'viewer' && (
                      <button
                        onClick={() => setAdjustModal(u)}
                        className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                      >
                        Korrektur
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustModal && (
        <Modal open={true} onClose={() => setAdjustModal(null)} title={`Wallet-Korrektur: @${adjustModal.handle}`}>
          <div className="space-y-4">
            <div className="text-sm text-white/60">
              Aktuelles Guthaben: <span className="font-mono text-[#FFD700]">{fmtBSD(centsToBsd(adjustModal.balance))} BSD</span>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Betrag (BSD, negativ = abziehen)</label>
              <input
                type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                placeholder="z.B. 1000 oder -500"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-[#FFD700]/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Grund</label>
              <input
                type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                placeholder="z.B. Beta-Bonus, Bug-Fix..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/30"
              />
            </div>
            <Button onClick={handleAdjust} disabled={!adjustAmount || !adjustReason || adjusting} className="w-full">
              {adjusting ? 'Wird angepasst...' : 'Wallet anpassen'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================
// Fees Tab
// ============================================

function FeesTab({ adminId }: { adminId: string }) {
  const { addToast } = useToast();
  const [configs, setConfigs] = useState<DbFeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<DbFeeConfig>>({});

  useEffect(() => {
    getAllFeeConfigs().then(data => { setConfigs(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (configId: string) => {
    try {
      const result = await updateFeeConfig(adminId, configId, {
        trade_fee_bps: editValues.trade_fee_bps,
        trade_platform_bps: editValues.trade_platform_bps,
        trade_pbt_bps: editValues.trade_pbt_bps,
        trade_club_bps: editValues.trade_club_bps,
        ipo_club_bps: editValues.ipo_club_bps,
        ipo_platform_bps: editValues.ipo_platform_bps,
        ipo_pbt_bps: editValues.ipo_pbt_bps,
      });
      if (result.success) {
        addToast('Gebühren aktualisiert', 'success');
        setEditId(null);
        const data = await getAllFeeConfigs();
        setConfigs(data);
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-4">
      {configs.map(config => {
        const isEditing = editId === config.id;
        const vals = isEditing ? editValues : config;
        return (
          <Card key={config.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white">{config.club_name ?? 'Standard (alle Clubs)'}</span>
              {!isEditing ? (
                <button onClick={() => { setEditId(config.id); setEditValues(config); }}
                  className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20">
                  Bearbeiten
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditId(null)} className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/40">Abbrechen</button>
                  <button onClick={() => handleSave(config.id)} className="text-xs px-3 py-1 rounded-lg bg-[#FFD700]/20 text-[#FFD700]">Speichern</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { key: 'trade_fee_bps' as const, label: 'Trade Fee' },
                { key: 'trade_platform_bps' as const, label: 'Platform' },
                { key: 'trade_pbt_bps' as const, label: 'PBT' },
                { key: 'trade_club_bps' as const, label: 'Club' },
                { key: 'ipo_platform_bps' as const, label: 'IPO Platform' },
                { key: 'ipo_pbt_bps' as const, label: 'IPO PBT' },
                { key: 'ipo_club_bps' as const, label: 'IPO Club' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <div className="text-white/40 mb-1">{label}</div>
                  {isEditing ? (
                    <input
                      type="number"
                      value={(vals as Record<string, number>)[key] ?? 0}
                      onChange={e => setEditValues(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white font-mono text-xs"
                    />
                  ) : (
                    <div className="font-mono text-white">{(config as unknown as Record<string, number>)[key]} bps</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================
// IPOs Tab
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
// Gameweeks Tab (Phase 5)
// ============================================

function GameweeksTab() {
  const { addToast } = useToast();
  const [gwStatus, setGwStatus] = useState<FullGameweekStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<number | null>(null);
  const [activeGw, setActiveGw] = useState<number>(11);

  useEffect(() => {
    Promise.allSettled([
      getFullGameweekStatus(),
      import('@/lib/supabaseClient').then(({ supabase }) =>
        supabase.from('clubs').select('active_gameweek').eq('id', '2bf30014-db88-4567-9885-9da215e3a0d4').single()
      ),
    ]).then(([gwRes, clubRes]) => {
      if (gwRes.status === 'fulfilled') setGwStatus(gwRes.value);
      if (clubRes.status === 'fulfilled' && clubRes.value.data) {
        setActiveGw(clubRes.value.data.active_gameweek ?? 11);
      }
      setLoading(false);
    });
  }, []);

  const handleSimAndScore = async (gw: number) => {
    setSimulating(gw);
    try {
      const result = await simulateGameweekFlow('2bf30014-db88-4567-9885-9da215e3a0d4', gw);
      if (result.success) {
        addToast(`GW ${gw}: ${result.fixturesSimulated} Fixtures, ${result.eventsScored} Events gescort`, 'success');
        setActiveGw(result.nextGameweek);
      } else {
        addToast(`Fehler: ${result.errors.join(', ')}`, 'error');
      }
      // Reload status
      const updated = await getFullGameweekStatus();
      setGwStatus(updated);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    } finally {
      setSimulating(null);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/60">Aktiver Spieltag:</span>
        <span className="font-bold text-[#FFD700] text-lg">GW {activeGw}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {gwStatus.map(gw => {
          const isCurrent = gw.gameweek === activeGw;
          const isPast = gw.gameweek < activeGw;
          return (
            <Card
              key={gw.gameweek}
              className={`p-3 text-center ${
                isCurrent ? 'border-[#FFD700]/30 bg-[#FFD700]/5' :
                isPast && gw.isFullyScored ? 'border-green-500/20' :
                ''
              }`}
            >
              <div className={`text-xs font-bold mb-1 ${isCurrent ? 'text-[#FFD700]' : 'text-white/60'}`}>
                GW {gw.gameweek}
              </div>
              <div className="space-y-0.5 text-[10px] text-white/40">
                <div>{gw.simulatedFixtures}/{gw.totalFixtures} Fixtures</div>
                <div>{gw.scoredEvents}/{gw.eventCount} Events</div>
              </div>
              <div className="mt-1.5 flex justify-center gap-1">
                {gw.isSimulated && <span className="w-2 h-2 rounded-full bg-green-500" title="Simuliert" />}
                {gw.isFullyScored && <span className="w-2 h-2 rounded-full bg-[#FFD700]" title="Gescort" />}
              </div>
              {isCurrent && (
                <button
                  onClick={() => handleSimAndScore(gw.gameweek)}
                  disabled={simulating !== null}
                  className="mt-2 w-full text-[10px] px-2 py-1 rounded bg-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/30 disabled:opacity-50"
                >
                  {simulating === gw.gameweek ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Sim & Score'}
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Debug Tab
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
        getSystemStats().then(setStats).catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (!adminRole) {
    return (
      <Card className="max-w-md mx-auto mt-20 p-8 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-red-400/50" />
        <h2 className="text-lg font-bold text-white mb-2">Zugriff verweigert</h2>
        <p className="text-sm text-white/40">Du bist kein Plattform-Administrator.</p>
      </Card>
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
      {tab === 'users' && user && <UsersTab adminId={user.id} role={adminRole} />}
      {tab === 'fees' && user && <FeesTab adminId={user.id} />}
      {tab === 'ipos' && <IposTab />}
      {tab === 'gameweeks' && <GameweeksTab />}
      {tab === 'debug' && <DebugTab />}
    </div>
  );
}
