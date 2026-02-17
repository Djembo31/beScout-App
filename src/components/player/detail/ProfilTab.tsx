'use client';

import React from 'react';
import {
  Info, Calendar, AlertTriangle, Flame, CheckCircle2,
  PiggyBank, BarChart3, Briefcase, Users, Unlock,
  Activity, TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { PositionBadge, ScoreCircle, MiniSparkline } from '@/components/player';
import { getContractInfo, getSuccessFeeTier } from '@/components/player/PlayerRow';
import { fmtBSD } from '@/lib/utils';
import type { Player } from '@/types';
import type { PlayerGameweekScore } from '@/lib/services/scoring';
import DPCSupplyRing from './DPCSupplyRing';
import SponsorBanner from './SponsorBanner';
import CommunityValuation from './CommunityValuation';
import { RadarChart, buildPlayerRadarAxes } from '@/components/player/RadarChart';

interface ProfilTabProps {
  player: Player;
  dpcAvailable: number;
  holdingQty: number;
  holderCount: number;
  gwScores: PlayerGameweekScore[];
  userId?: string | null;
  currentGameweek?: number;
}

const formatMarketValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M\u20AC`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K\u20AC`;
  return `${value}\u20AC`;
};

export default function ProfilTab({ player, dpcAvailable, holdingQty, holderCount, gwScores, userId, currentGameweek = 0 }: ProfilTabProps) {
  const contract = getContractInfo(player.contractMonthsLeft);
  const successFeeTier = getSuccessFeeTier(player.marketValue || 500000);
  const progressPercent = Math.max(0, Math.min(100, ((36 - player.contractMonthsLeft) / 36) * 100));
  const pbt = player.pbt || { balance: 0, sources: { trading: 0, votes: 0, content: 0, ipo: 0 } };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Quick Stats (moved from Hero) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Card className="p-3 text-center">
          <div className="text-[10px] text-white/40 mb-1 flex items-center justify-center gap-1">
            <Activity className="w-3 h-3" /> Performance
          </div>
          <ScoreCircle label="L5" value={player.perf.l5} size={36} />
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[10px] text-white/40 mb-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" /> Sparkline
          </div>
          {player.prices.history7d ? (
            <MiniSparkline values={player.prices.history7d} width={80} height={28} />
          ) : (
            <span className="text-white/20 text-xs">-</span>
          )}
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[10px] text-white/40 mb-1 flex items-center justify-center gap-1">
            <BarChart3 className="w-3 h-3" /> DPC Supply
          </div>
          <div className="font-mono font-bold text-sm">{fmtBSD(player.dpc.supply)}</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[10px] text-white/40 mb-1 flex items-center justify-center gap-1">
            <Users className="w-3 h-3" /> Du besitzt
          </div>
          <div className={`font-mono font-bold text-sm ${holdingQty > 0 ? 'text-sky-300' : 'text-white/30'}`}>
            {holdingQty} DPC
          </div>
        </Card>
      </div>

      {/* Attribute Radar */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-400" />
          Attribut-Radar
        </h3>
        <div className="flex justify-center">
          <RadarChart
            datasets={[{
              axes: buildPlayerRadarAxes({
                goals: player.stats.goals,
                assists: player.stats.assists,
                cleanSheets: 0,
                matches: player.stats.matches,
                perfL5: player.perf.l5,
                perfL15: player.perf.l15,
                bonus: 0,
                minutes: player.stats.matches * 90,
              }),
              color: player.pos === 'GK' ? '#34d399' : player.pos === 'DEF' ? '#fbbf24' : player.pos === 'MID' ? '#38bdf8' : '#fb7185',
            }]}
            size={260}
          />
        </div>
      </Card>

      {/* Spieler-Info */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-white/50" />
          Spieler-Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div>
            <div className="text-xs text-white/50">Marktwert</div>
            <div className="font-bold">{formatMarketValue(player.marketValue || 500000)}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">Position</div>
            <div className="font-bold flex items-center gap-2">
              <PositionBadge pos={player.pos} size="sm" />
              {player.pos}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/50">Nationalität</div>
            <div className="font-bold">{player.country}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">Success Fee Tier</div>
            <div className="font-bold text-purple-300">{successFeeTier.label}</div>
          </div>
        </div>
      </Card>

      {/* DPC Supply Ring */}
      <Card className="p-4 md:p-6">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#FFD700]" />
          DPC Verteilung
        </h3>
        <DPCSupplyRing
          supply={player.dpc.supply}
          circulation={player.dpc.circulation}
          owned={player.dpc.owned}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <BarChart3 className="w-3 h-3" />Supply
            </div>
            <div className="font-mono font-bold">{fmtBSD(player.dpc.supply)}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Briefcase className="w-3 h-3" />Float
            </div>
            <div className="font-mono font-bold">{fmtBSD(player.dpc.float)}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Users className="w-3 h-3" />Im Umlauf
            </div>
            <div className="font-mono font-bold">{fmtBSD(player.dpc.circulation)}</div>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Unlock className="w-3 h-3" />Verfügbar
            </div>
            <div className="font-mono font-bold text-[#FFD700]">{fmtBSD(dpcAvailable)}</div>
          </div>
        </div>
      </Card>

      {/* Contract Status */}
      <Card className="overflow-hidden">
        <div className={`p-4 ${contract.urgent ? 'bg-red-500/10' : player.contractMonthsLeft <= 12 ? 'bg-orange-500/10' : 'bg-white/[0.02]'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-white/50" />
              <span className="font-bold">Vertragsstatus</span>
            </div>
            {contract.urgent && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-300">
                <AlertTriangle className="w-3 h-3" />
                Bald auslaufend!
              </div>
            )}
            {!contract.urgent && player.contractMonthsLeft <= 12 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300">
                <AlertTriangle className="w-3 h-3" />
                Läuft aus
              </div>
            )}
          </div>
          <div className="flex items-end justify-between mb-2">
            <div>
              <div className="text-xs text-white/40">Vertragsende</div>
              <div className={`font-mono font-bold text-lg ${contract.color}`}>{contract.dateStr}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/40">Restlaufzeit</div>
              <div className={`font-mono font-bold text-lg ${contract.color}`}>{contract.monthsLeft} Monate</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 bg-black/30 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${contract.urgent ? 'bg-red-400' : player.contractMonthsLeft <= 12 ? 'bg-orange-400' : 'bg-[#22C55E]'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
        {/* DPC Burn Info */}
        {(contract.urgent || player.contractMonthsLeft <= 12) && (
          <div className={`p-4 border-t ${contract.urgent ? 'border-red-500/20 bg-red-500/5' : 'border-orange-500/20 bg-orange-500/5'}`}>
            <div className="flex items-start gap-3">
              <Flame className={`w-5 h-5 mt-0.5 ${contract.urgent ? 'text-red-400' : 'text-orange-400'}`} />
              <div>
                <div className={`font-bold text-sm ${contract.urgent ? 'text-red-300' : 'text-orange-300'}`}>
                  DPC Burn in {contract.monthsLeft} Monaten
                </div>
                <div className="text-xs text-white/50 mt-1">
                  Bei Vertragsende werden alle DPCs liquidiert. Der PBT wird anteilig an alle Holder ausgezahlt.
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                  <span className="text-white/60">PBT Reward wird automatisch verteilt</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* PBT Widget */}
      <Card className="overflow-hidden">
        <div className={`${player.isLiquidated ? 'bg-gradient-to-r from-white/5 to-white/[0.02]' : 'bg-gradient-to-r from-[#FFD700]/20 to-orange-500/10'} border-b border-[#FFD700]/20 p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank className={`w-5 h-5 ${player.isLiquidated ? 'text-white/30' : 'text-[#FFD700]'}`} />
              <span className="font-black">Player Bound Treasury</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-white/50">
              <Info className="w-3 h-3" />
              <span>{player.isLiquidated ? 'PBT wurde an Holder verteilt' : 'Wird bei Liquidierung an DPC-Holder ausgeschüttet'}</span>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-black/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">{player.isLiquidated ? 'Reserviert (Success Fee)' : 'Treasury Guthaben'}</span>
              <span className={`font-mono font-black text-2xl ${player.isLiquidated ? 'text-white/30' : 'text-[#FFD700]'}`}>{fmtBSD(pbt.balance)} BSD</span>
            </div>
          </div>
          {pbt.sources && (
            <div>
              <div className="text-xs text-white/40 mb-2">Zuflüsse nach Quelle</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.02] rounded-lg p-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">Trading Fees</span>
                  <span className="font-mono text-sm">{fmtBSD(pbt.sources.trading)}</span>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">Votes</span>
                  <span className="font-mono text-sm">{fmtBSD(pbt.sources.votes)}</span>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">Content</span>
                  <span className="font-mono text-sm">{fmtBSD(pbt.sources.content)}</span>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-2 flex items-center justify-between">
                  <span className="text-xs text-white/50">IPO Seed</span>
                  <span className="font-mono text-sm">{fmtBSD(pbt.sources.ipo)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Community Valuation */}
      <CommunityValuation
        playerId={player.id}
        userId={userId ?? null}
        floorPriceCents={Math.round((player.prices.floor ?? 0) * 100)}
        ipoPriceCents={Math.round((player.prices.ipoPrice ?? 0) * 100)}
        currentGameweek={currentGameweek}
      />

      {/* Sponsor banner mid-page */}
      <SponsorBanner placement="player_mid" />
    </div>
  );
}
