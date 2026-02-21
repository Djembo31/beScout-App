'use client';

import React, { useState, useEffect } from 'react';
import { Telescope, Users, FileText, Star, ArrowUpDown } from 'lucide-react';
import { Card, Chip } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { usePlayerScoutingSummaries, useTopScouts } from '@/lib/queries';
import type { ClubWithAdmin, PlayerScoutingSummary } from '@/types';
import Link from 'next/link';

type SortKey = 'reportCount' | 'avgOverall' | 'avgTechnik' | 'avgTaktik' | 'avgAthletik' | 'avgMentalitaet' | 'avgPotenzial';

function DimBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = value >= 8 ? 'bg-[#FFD700]' : value >= 6 ? 'bg-[#22C55E]' : value >= 4 ? 'bg-sky-400' : 'bg-white/30';
  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-white/60 w-6 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export default function AdminScoutingTab({ club }: { club: ClubWithAdmin }) {
  const { data: summaries, isLoading: loadingSummaries } = usePlayerScoutingSummaries(club.id);
  const { data: topScouts, isLoading: loadingScouts } = useTopScouts(club.id);
  const [sortKey, setSortKey] = useState<SortKey>('reportCount');
  const [sortAsc, setSortAsc] = useState(false);

  // Recent reports from summaries (last scouted)
  const recentReports = [...(summaries ?? [])].sort((a, b) => new Date(b.lastScoutedAt).getTime() - new Date(a.lastScoutedAt).getTime()).slice(0, 10);

  const sortedSummaries = [...(summaries ?? [])].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider ${
        sortKey === field ? 'text-[#FFD700]' : 'text-white/40 hover:text-white/60'
      }`}
    >
      {label}
      {sortKey === field && <ArrowUpDown className="w-2.5 h-2.5" />}
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Section 1: Player Radar */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Telescope className="w-5 h-5 text-rose-400" />
          <h2 className="text-lg font-black">Spieler-Radar</h2>
          <span className="text-xs text-white/40">{summaries?.length ?? 0} Spieler gescoutet</span>
        </div>

        {loadingSummaries ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Card key={i} className="h-12 animate-pulse" />)}</div>
        ) : sortedSummaries.length === 0 ? (
          <Card className="p-8 text-center">
            <Telescope className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <div className="text-white/30 font-bold">Noch keine Scouting-Daten</div>
            <div className="text-xs text-white/20 mt-1">Fans können über Community Scouting-Reports einreichen</div>
          </Card>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/40">Spieler</th>
                  <th className="px-2 py-2"><SortHeader label="Berichte" field="reportCount" /></th>
                  <th className="px-2 py-2"><SortHeader label="Technik" field="avgTechnik" /></th>
                  <th className="px-2 py-2"><SortHeader label="Taktik" field="avgTaktik" /></th>
                  <th className="px-2 py-2"><SortHeader label="Athletik" field="avgAthletik" /></th>
                  <th className="px-2 py-2"><SortHeader label="Mentalit." field="avgMentalitaet" /></th>
                  <th className="px-2 py-2"><SortHeader label="Potenzial" field="avgPotenzial" /></th>
                  <th className="px-2 py-2"><SortHeader label="Gesamt" field="avgOverall" /></th>
                </tr>
              </thead>
              <tbody>
                {sortedSummaries.map(s => (
                  <tr key={s.playerId} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-3 py-2">
                      <Link href={`/player/${s.playerId}`} className="flex items-center gap-2 hover:text-[#FFD700] transition-colors">
                        <span className="font-bold text-sm">{s.firstName} {s.lastName}</span>
                        <PositionBadge pos={s.position} size="sm" />
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="font-mono text-xs font-bold">{s.reportCount}</span>
                    </td>
                    <td className="px-2 py-2"><DimBar value={s.avgTechnik} /></td>
                    <td className="px-2 py-2"><DimBar value={s.avgTaktik} /></td>
                    <td className="px-2 py-2"><DimBar value={s.avgAthletik} /></td>
                    <td className="px-2 py-2"><DimBar value={s.avgMentalitaet} /></td>
                    <td className="px-2 py-2"><DimBar value={s.avgPotenzial} /></td>
                    <td className="px-2 py-2">
                      <span className={`font-mono font-bold text-sm ${
                        s.avgOverall >= 8 ? 'text-[#FFD700]' : s.avgOverall >= 6 ? 'text-[#22C55E]' : 'text-white/60'
                      }`}>{s.avgOverall.toFixed(1)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Section 2: Top Scouts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-black">Top Scouts</h2>
        </div>

        {loadingScouts ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Card key={i} className="h-12 animate-pulse" />)}</div>
        ) : !topScouts || topScouts.length === 0 ? (
          <Card className="p-6 text-center text-sm text-white/30">Noch keine Scout-Aktivität</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topScouts.map((scout, idx) => (
              <Card key={scout.userId} className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                  idx === 1 ? 'bg-white/10 text-white/60' :
                  idx === 2 ? 'bg-orange-500/15 text-orange-300' :
                  'bg-white/5 text-white/30'
                }`}>
                  {idx + 1}
                </div>
                {scout.avatarUrl ? (
                  <img src={scout.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/40">
                    {(scout.handle ?? '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${scout.handle}`} className="font-bold text-sm hover:text-[#FFD700] transition-colors truncate block">
                    {scout.displayName || `@${scout.handle}`}
                  </Link>
                  <div className="flex items-center gap-2 text-[10px] text-white/40">
                    <span><FileText className="w-2.5 h-2.5 inline mr-0.5" />{scout.reportCount} Reports</span>
                    {scout.approvedBounties > 0 && (
                      <span className="text-[#22C55E]">{scout.approvedBounties} genehmigt</span>
                    )}
                    {scout.avgRating > 0 && (
                      <span><Star className="w-2.5 h-2.5 inline mr-0.5 text-[#FFD700]" />{scout.avgRating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-white/40">Score</div>
                  <div className="font-bold text-sm">{scout.analystScore}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Recent Reports */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-black">Letzte Berichte</h2>
        </div>

        {recentReports.length === 0 ? (
          <Card className="p-6 text-center text-sm text-white/30">Noch keine Scouting-Reports</Card>
        ) : (
          <div className="space-y-2">
            {recentReports.map(r => (
              <Card key={r.playerId} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href={`/player/${r.playerId}`} className="font-bold text-sm hover:text-[#FFD700] transition-colors">
                    {r.firstName} {r.lastName}
                  </Link>
                  <PositionBadge pos={r.position} size="sm" />
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 font-mono text-white/40">
                    <span className="text-[10px]">T</span>{r.avgTechnik.toFixed(0)}
                    <span className="text-[10px] ml-1">Tk</span>{r.avgTaktik.toFixed(0)}
                    <span className="text-[10px] ml-1">A</span>{r.avgAthletik.toFixed(0)}
                    <span className="text-[10px] ml-1">M</span>{r.avgMentalitaet.toFixed(0)}
                    <span className="text-[10px] ml-1">P</span>{r.avgPotenzial.toFixed(0)}
                  </div>
                  <span className={`font-bold ${r.avgOverall >= 8 ? 'text-[#FFD700]' : r.avgOverall >= 6 ? 'text-[#22C55E]' : 'text-white/60'}`}>
                    {r.avgOverall.toFixed(1)}
                  </span>
                  <span className="text-white/30">{new Date(r.lastScoutedAt).toLocaleDateString('de-DE')}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
