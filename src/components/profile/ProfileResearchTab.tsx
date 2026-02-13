'use client';

import React, { useMemo } from 'react';
import { BarChart3, Shield, FileText, CheckCircle, XCircle, Clock, Target, CircleDollarSign, Users, Star } from 'lucide-react';
import { Card } from '@/components/ui';
import { PositionBadge } from '@/components/player';
import { fmtBSD, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { ResearchPostWithAuthor, AuthorTrackRecord } from '@/types';

// ============================================
// TYPES
// ============================================

interface ProfileResearchTabProps {
  myResearch: ResearchPostWithAuthor[];
  trackRecord: AuthorTrackRecord | null;
}

// ============================================
// COMPONENT
// ============================================

export default function ProfileResearchTab({ myResearch, trackRecord }: ProfileResearchTabProps) {
  return (
    <div className="space-y-6">
      {/* Track Record Summary */}
      {trackRecord && trackRecord.totalCalls > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#FFD700]" />
            <h3 className="font-black">Dein Track Record</h3>
            <div className="flex-1" />
            {trackRecord.totalCalls >= 5 && trackRecord.hitRate >= 60 ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/25">
                <Shield className="w-3 h-3" />
                Verifizierter Scout
              </span>
            ) : trackRecord.totalCalls < 5 ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-white/40 border border-white/10">
                <Shield className="w-3 h-3" />
                {trackRecord.totalCalls}/5 Calls
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-white/40 border border-white/10">
                <Shield className="w-3 h-3" />
                {trackRecord.hitRate}%/60% Hit-Rate
              </span>
            )}
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className={cn(
                'text-3xl font-mono font-black',
                trackRecord.hitRate >= 60 ? 'text-[#FFD700]' : trackRecord.hitRate >= 40 ? 'text-white' : 'text-red-400'
              )}>
                {trackRecord.hitRate}%
              </div>
              <div className="text-xs text-white/40 mt-0.5">Hit-Rate</div>
            </div>
            <div>
              <div className="text-sm text-white/60 mb-1">
                {trackRecord.correctCalls} / {trackRecord.totalCalls} Calls
              </div>
              <div className="w-40 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FFD700] to-[#22C55E] rounded-full transition-all"
                  style={{ width: `${trackRecord.hitRate}%` }}
                />
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-[#22C55E]" />
                  {trackRecord.correctCalls}
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-400" />
                  {trackRecord.incorrectCalls}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-white/30" />
                  {trackRecord.pendingCalls}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Earnings Dashboard */}
      {myResearch.length > 0 && (() => {
        const totalEarned = myResearch.reduce((s, p) => s + p.total_earned, 0);
        const totalUnlocks = myResearch.reduce((s, p) => s + p.unlock_count, 0);
        const rated = myResearch.filter(p => p.avg_rating > 0);
        const avgRating = rated.length > 0 ? rated.reduce((s, p) => s + p.avg_rating, 0) / rated.length : 0;
        const topPost = myResearch.reduce((best, p) => p.total_earned > best.total_earned ? p : best, myResearch[0]);
        return (
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <CircleDollarSign className="w-5 h-5 text-[#22C55E]" />
              <h3 className="font-black">Einnahmen-Übersicht</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-[#22C55E]/5 border border-[#22C55E]/10 rounded-xl">
                <div className="text-2xl font-mono font-black text-[#22C55E]">{fmtBSD(centsToBsd(totalEarned))}</div>
                <div className="text-[10px] text-white/40 mt-1">BSD verdient</div>
              </div>
              <div className="text-center p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <div className="text-2xl font-mono font-black">{totalUnlocks}</div>
                <div className="text-[10px] text-white/40 mt-1">Verkäufe</div>
              </div>
              <div className="text-center p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <div className="text-2xl font-mono font-black text-[#FFD700]">{avgRating > 0 ? avgRating.toFixed(1) : '-'}</div>
                <div className="text-[10px] text-white/40 mt-1 flex items-center justify-center gap-0.5">
                  <Star className="w-3 h-3" /> Ø Bewertung
                </div>
              </div>
              <div className="text-center p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <div className="text-2xl font-mono font-black">{myResearch.length}</div>
                <div className="text-[10px] text-white/40 mt-1">Berichte</div>
              </div>
            </div>
            {topPost.total_earned > 0 && (
              <div className="mt-3 p-3 bg-[#FFD700]/[0.03] border border-[#FFD700]/10 rounded-xl">
                <div className="text-[10px] text-[#FFD700]/60 mb-1">Top-Bericht</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold truncate flex-1">{topPost.title}</div>
                  <div className="text-xs font-mono font-bold text-[#22C55E] shrink-0">{fmtBSD(centsToBsd(topPost.total_earned))} BSD</div>
                  <div className="text-[10px] text-white/30 shrink-0">{topPost.unlock_count}x</div>
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Own Research Posts */}
      {myResearch.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">Noch keine Research-Berichte</div>
          <div className="text-xs text-white/20">Schreibe Berichte in der Community und baue deinen Track Record auf.</div>
        </Card>
      ) : (
        <Card className="p-4 md:p-6">
          <h3 className="font-black mb-4">Deine Berichte ({myResearch.length})</h3>
          <div className="space-y-2">
            {myResearch.map((post) => {
              const callColor = post.call === 'Bullish' ? 'bg-[#22C55E]/20 text-[#22C55E]' : post.call === 'Bearish' ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white/60';
              return (
                <div key={post.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{post.title}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {post.player_name && post.player_position && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-white/50">
                          <Target className="w-3 h-3" />
                          {post.player_name}
                          <PositionBadge pos={post.player_position} size="sm" />
                        </span>
                      )}
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', callColor)}>
                        {post.call}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/5 text-white/40 border border-white/10">
                        {post.horizon}
                      </span>
                      {post.outcome === 'correct' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#22C55E]">
                          <CheckCircle className="w-3 h-3" />
                          {post.price_change_pct !== null && `${post.price_change_pct > 0 ? '+' : ''}${post.price_change_pct}%`}
                        </span>
                      )}
                      {post.outcome === 'incorrect' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300">
                          <XCircle className="w-3 h-3" />
                          {post.price_change_pct !== null && `${post.price_change_pct > 0 ? '+' : ''}${post.price_change_pct}%`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-mono text-[#FFD700] font-bold">{fmtBSD(centsToBsd(post.price))} BSD</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{new Date(post.created_at).toLocaleDateString('de-DE')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
