'use client';

import React, { useState, useMemo } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import ResearchCard from '@/components/community/ResearchCard';
import type { ResearchPostWithAuthor } from '@/types';

// ============================================
// CONSTANTS
// ============================================

type ResearchSort = 'new' | 'top_rated' | 'most_sold';

const RESEARCH_SORTS: { id: ResearchSort; label: string }[] = [
  { id: 'new', label: 'Neueste' },
  { id: 'top_rated', label: 'Top bewertet' },
  { id: 'most_sold', label: 'Meistverkauft' },
];

const RESEARCH_CALLS: { id: string; label: string; color: string }[] = [
  { id: 'Bullish', label: 'Bullish', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' },
  { id: 'Bearish', label: 'Bearish', color: 'bg-red-500/15 text-red-300 border-red-500/20' },
  { id: 'Neutral', label: 'Neutral', color: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/20' },
];

const RESEARCH_CATEGORIES: { id: string; label: string; color: string }[] = [
  { id: 'Spieler-Analyse', label: 'Spieler-Analyse', color: 'bg-sky-500/15 text-sky-300 border-sky-500/20' },
  { id: 'Transfer-Empfehlung', label: 'Transfer-Empfehlung', color: 'bg-purple-500/15 text-purple-300 border-purple-500/20' },
  { id: 'Taktik', label: 'Taktik', color: 'bg-amber-500/15 text-amber-300 border-amber-500/20' },
  { id: 'Saisonvorschau', label: 'Saisonvorschau', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' },
  { id: 'Scouting-Report', label: 'Scouting-Report', color: 'bg-rose-500/15 text-rose-300 border-rose-500/20' },
];

// ============================================
// TYPES
// ============================================

interface CommunityResearchTabProps {
  researchPosts: ResearchPostWithAuthor[];
  onCreateResearch: () => void;
  onUnlock: (researchId: string) => void;
  unlockingId: string | null;
  onRate: (researchId: string, rating: number) => void;
  ratingId: string | null;
}

// ============================================
// COMMUNITY RESEARCH TAB
// ============================================

export default function CommunityResearchTab({
  researchPosts,
  onCreateResearch,
  onUnlock,
  unlockingId,
  onRate,
  ratingId,
}: CommunityResearchTabProps) {
  const [researchSort, setResearchSort] = useState<ResearchSort>('new');
  const [researchCallFilter, setResearchCallFilter] = useState<string | null>(null);
  const [researchCategoryFilter, setResearchCategoryFilter] = useState<string | null>(null);

  // ---- Sorted/Filtered Research Posts ----
  const sortedResearchPosts = useMemo(() => {
    let result = researchPosts;

    // Category Filter
    if (researchCategoryFilter) {
      result = result.filter(p => p.category === researchCategoryFilter);
    }

    // Call-Typ Filter
    if (researchCallFilter) {
      result = result.filter(p => p.call === researchCallFilter);
    }

    // Sortierung
    if (researchSort === 'top_rated') {
      result = [...result].sort((a, b) => {
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.ratings_count - a.ratings_count;
      });
    } else if (researchSort === 'most_sold') {
      result = [...result].sort((a, b) => b.unlock_count - a.unlock_count);
    }
    // 'new' = Default-Reihenfolge aus DB (created_at DESC)

    return result;
  }, [researchPosts, researchSort, researchCallFilter, researchCategoryFilter]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          <span className="font-bold">Research Hub</span>
          <span className="text-xs text-white/40">
            {(researchCallFilter || researchCategoryFilter)
              ? `${sortedResearchPosts.length} von ${researchPosts.length} Berichten`
              : `${sortedResearchPosts.length} Berichte`}
          </span>
        </div>
        <Button variant="gold" size="sm" onClick={onCreateResearch}>
          <Plus className="w-4 h-4" />
          Bericht schreiben
        </Button>
      </div>

      {/* Sort Pills */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {RESEARCH_SORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setResearchSort(s.id)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-semibold transition-all border',
                researchSort === s.id
                  ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/25'
                  : 'text-white/50 hover:text-white bg-white/5 border-white/10'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-white/10" />
        <div className="flex gap-1">
          {RESEARCH_CALLS.map(c => (
            <button
              key={c.id}
              onClick={() => setResearchCallFilter(prev => prev === c.id ? null : c.id)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                researchCallFilter === c.id
                  ? c.color
                  : 'text-white/40 bg-white/[0.02] border-white/[0.06] hover:bg-white/5 hover:text-white/60'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-1 flex-wrap items-center">
        {RESEARCH_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setResearchCategoryFilter(prev => prev === cat.id ? null : cat.id)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border',
              researchCategoryFilter === cat.id
                ? cat.color
                : 'text-white/40 bg-white/[0.02] border-white/[0.06] hover:bg-white/5 hover:text-white/60'
            )}
          >
            {cat.label}
          </button>
        ))}
        {(researchCallFilter || researchCategoryFilter) && (
          <button
            onClick={() => { setResearchCallFilter(null); setResearchCategoryFilter(null); }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white/30 hover:text-white/60 transition-colors"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {sortedResearchPosts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/50 mb-2">
            {(researchCallFilter || researchCategoryFilter) ? 'Keine Berichte mit diesem Filter' : 'Noch keine Research-Berichte'}
          </div>
          <div className="text-xs text-white/30 mb-4">
            {(researchCallFilter || researchCategoryFilter) ? 'Probiere einen anderen Filter.' : 'Schreibe den ersten Bericht und verdiene $SCOUT!'}
          </div>
          {!(researchCallFilter || researchCategoryFilter) && (
            <Button variant="gold" size="sm" onClick={onCreateResearch}>
              Ersten Bericht schreiben
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedResearchPosts.map(post => (
            <ResearchCard
              key={post.id}
              post={post}
              onUnlock={onUnlock}
              unlockingId={unlockingId}
              onRate={onRate}
              ratingId={ratingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
