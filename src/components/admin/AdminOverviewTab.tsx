'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Users2, TrendingUp, Trophy, Flame, Crown, Share2, Copy, Check, Megaphone, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, Skeleton, Button, Modal } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { getClubDashboardStats, getClubFollowerCount } from '@/lib/services/club';
import { getClubSubscribers } from '@/lib/services/clubSubscriptions';
import { getClubReferralCount } from '@/lib/services/referral';
import { createClubNews } from '@/lib/services/posts';
import { getPlayersByClubId, centsToBsd } from '@/lib/services/players';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { fmtScout, cn } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import type { ClubWithAdmin, ClubDashboardStats, DbPlayer, Pos } from '@/types';

export default function AdminOverviewTab({ club }: { club: ClubWithAdmin }) {
  const { user } = useUser();
  const { addToast } = useToast();
  const [stats, setStats] = useState<ClubDashboardStats | null>(null);
  const [players, setPlayers] = useState<DbPlayer[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [subData, setSubData] = useState<{ total: number; revenueCents: number } | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // News modal state
  const [newsOpen, setNewsOpen] = useState(false);
  const [newsContent, setNewsContent] = useState('');
  const [newsPublishing, setNewsPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [s, p, f, subs, refCount] = await Promise.all([
          getClubDashboardStats(club.id),
          getPlayersByClubId(club.id),
          getClubFollowerCount(club.id),
          getClubSubscribers(club.id),
          getClubReferralCount(club.id),
        ]);
        if (!cancelled) {
          setStats(s);
          setPlayers(p);
          setFollowerCount(f);
          setSubData(subs);
          setReferralCount(refCount);
        }
      } catch (err) { console.error('[AdminOverview] loadData:', err); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [club.id]);

  const topTraded = [...players].sort((a, b) => b.volume_24h - a.volume_24h).slice(0, 5);
  const totalVolume = centsToBsd(players.reduce((s, p) => s + p.volume_24h, 0));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-[#FFD700]/10 to-[#FFD700]/[0.02] border-[#FFD700]/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-[#FFD700]" />
            <span className="text-xs text-white/50">IPO Umsatz</span>
          </div>
          {loading ? <Skeleton className="h-7 w-24" /> : (
            <div className="text-xl font-mono font-black text-[#FFD700]">
              {formatScout(stats?.ipo_revenue_cents ?? 0)} <span className="text-sm text-white/50">$SCOUT</span>
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users2 className="w-5 h-5 text-sky-400" />
            <span className="text-xs text-white/50">Fans</span>
          </div>
          {loading ? <Skeleton className="h-7 w-16" /> : (
            <div className="text-xl font-mono font-black text-sky-400">{stats?.total_fans ?? 0}</div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-white/50" />
            <span className="text-xs text-white/50">Trading Vol. 24h</span>
          </div>
          <div className="text-xl font-mono font-black text-white">
            {fmtScout(totalVolume)} <span className="text-sm text-white/50">$SCOUT</span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users2 className="w-5 h-5 text-white/50" />
            <span className="text-xs text-white/50">Follower</span>
          </div>
          <div className="text-xl font-mono font-black text-white">{followerCount}</div>
        </Card>
      </div>

      {/* Subscriber Stats */}
      {subData && subData.total > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 border-[#FFD700]/20">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-[#FFD700]" />
              <span className="text-xs text-white/50">Aktive Abonnenten</span>
            </div>
            <div className="text-xl font-mono font-black text-[#FFD700]">{subData.total}</div>
          </Card>
          <Card className="p-4 border-[#FFD700]/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-[#FFD700]" />
              <span className="text-xs text-white/50">Abo-Einnahmen</span>
            </div>
            <div className="text-xl font-mono font-black text-[#FFD700]">{formatScout(subData.revenueCents)} $SCOUT</div>
          </Card>
        </div>
      )}

      {/* Referral Link Card */}
      <Card className="p-4 border-[#22C55E]/20 bg-gradient-to-r from-[#22C55E]/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-[#22C55E]" />
            </div>
            <div>
              <div className="text-sm font-bold">Club-Referral-Link</div>
              <div className="text-[10px] text-white/40">
                {referralCount > 0
                  ? `${referralCount} Fan${referralCount !== 1 ? 's' : ''} über diesen Link`
                  : 'Teile diesen Link um Fans zu gewinnen'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded hidden md:block">
              {typeof window !== 'undefined' ? `${window.location.origin}/club/${club.slug}` : `/club/${club.slug}`}
            </code>
            <button
              onClick={() => {
                const url = `${window.location.origin}/club/${club.slug}`;
                navigator.clipboard.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }).catch(err => console.error('[Admin] Copy failed:', err));
              }}
              className="p-2 rounded-lg bg-[#22C55E]/10 hover:bg-[#22C55E]/20 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4 text-[#22C55E]" />}
            </button>
          </div>
        </div>
      </Card>

      {/* Publish Club News */}
      <Card className="p-4 border-[#FFD700]/20 bg-gradient-to-r from-[#FFD700]/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <div className="text-sm font-bold">Club-News veröffentlichen</div>
              <div className="text-[10px] text-white/40">Neuigkeiten für Fans sichtbar im Feed + Club-Seite</div>
            </div>
          </div>
          <Button variant="gold" size="sm" onClick={() => setNewsOpen(true)}>
            <Send className="w-3.5 h-3.5" />
            News schreiben
          </Button>
        </div>
      </Card>

      {/* News Modal */}
      <Modal open={newsOpen} onClose={() => setNewsOpen(false)} title="Club-News veröffentlichen">
        <div className="space-y-4">
          <textarea
            value={newsContent}
            onChange={e => setNewsContent(e.target.value)}
            placeholder="Was gibt es Neues? (z.B. Neuzugang, Event, Trainingscamp...)"
            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#FFD700]/40"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/30">{newsContent.length}/1000</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setNewsOpen(false)}>Abbrechen</Button>
              <Button
                variant="gold"
                size="sm"
                disabled={newsContent.trim().length < 5 || newsPublishing}
                onClick={async () => {
                  if (!user) return;
                  setNewsPublishing(true);
                  try {
                    await createClubNews(user.id, club.id, club.name, newsContent.trim());
                    addToast('News veröffentlicht!', 'success');
                    setNewsContent('');
                    setNewsOpen(false);
                  } catch (err) {
                    console.error('[Admin] News publish:', err);
                    addToast('Fehler beim Veröffentlichen', 'error');
                  } finally {
                    setNewsPublishing(false);
                  }
                }}
              >
                {newsPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Veröffentlichen
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Fans */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-[#FFD700]" />
            <span className="font-black text-lg">Top Fans</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (stats?.top_fans ?? []).length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">Noch keine Fans</div>
          ) : (
            <div className="space-y-2">
              {(stats?.top_fans ?? []).map((fan, i) => (
                <div key={fan.user_id} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  i === 0 ? 'bg-[#FFD700]/[0.06] border-[#FFD700]/20' : 'bg-white/[0.02] border-white/10'
                )}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                    i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/5 text-white/40'
                  }`}>{i + 1}</div>
                  {fan.avatar_url ? (
                    <Image src={fan.avatar_url} alt={fan.handle} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">
                      {fan.handle.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{fan.handle}</div>
                    <div className="text-[10px] text-white/40">{fan.holdings_count} DPC</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Traded */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="font-black text-lg">Meistgehandelt</span>
          </div>
          {topTraded.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">Keine Spieler</div>
          ) : (
            <div className="space-y-2">
              {topTraded.map((p, i) => (
                <Link key={p.id} href={`/player/${p.id}`}>
                  <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10 hover:border-[#FFD700]/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-white/5 text-white/40'
                      }`}>{i + 1}</div>
                      <PositionBadge pos={p.position as Pos} size="sm" />
                      <div className="font-bold text-sm">{p.first_name} {p.last_name}</div>
                    </div>
                    <div className="font-mono text-sm text-[#FFD700]">{fmtScout(centsToBsd(p.volume_24h))} $SCOUT</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
