'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, X, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtScout } from '@/lib/utils';
import { spotlightSearch, type RichSearchResult, type SearchResultType } from '@/lib/services/search';
import { PlayerPhoto, PositionBadge, getL5Color } from '@/components/player/index';
import { RangBadge } from '@/components/ui/RangBadge';
import { getClub } from '@/lib/clubs';
import { centsToBsd } from '@/lib/services/players';
import { useTranslations } from 'next-intl';

const LS_KEY = 'bescout-recent-searches';
const MAX_RECENT = 5;

function getRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  const list = getRecent().filter((s) => s !== q);
  list.unshift(q);
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

function clearRecent() {
  localStorage.removeItem(LS_KEY);
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const FILTERS: { key: SearchResultType | 'all'; labelKey: string }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'player', labelKey: 'players' },
  { key: 'club', labelKey: 'clubs' },
  { key: 'profile', labelKey: 'users' },
];

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const t = useTranslations('search');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchResultType | 'all'>('all');
  const [results, setResults] = useState<RichSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecent());
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
      setFilter('all');
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Debounced search with stale-request guard
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }
    setLoading(true);
    const id = ++searchIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const data = await spotlightSearch(query, filter);
        if (id === searchIdRef.current) {
          setResults(data);
          setSelectedIndex(-1);
        }
      } catch {
        if (id === searchIdRef.current) setResults([]);
      } finally {
        if (id === searchIdRef.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filter]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => {
          const next = Math.min(i + 1, results.length - 1);
          scrollToIndex(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => {
          const next = Math.max(i - 1, -1);
          if (next >= 0) scrollToIndex(next);
          return next;
        });
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && results[selectedIndex]) {
          navigateTo(results[selectedIndex]);
        } else if (query.length >= 2 && results.length > 0) {
          navigateTo(results[0]);
        }
      }
    },
    [results, selectedIndex, query, onClose],
  );

  function scrollToIndex(idx: number) {
    const el = listRef.current?.querySelector(`[data-idx="${idx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  const navigateTo = useCallback(
    (r: RichSearchResult) => {
      if (query.length >= 2) saveRecent(query);
      router.push(r.href);
      onClose();
    },
    [router, query, onClose],
  );

  const handleRecentClick = useCallback(
    (q: string) => {
      setQuery(q);
    },
    [],
  );

  const handleClearRecent = useCallback(() => {
    clearRecent();
    setRecentSearches([]);
  }, []);

  if (!open) return null;

  const showRecent = query.length < 2 && recentSearches.length > 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm anim-fade" onClick={onClose} />

      {/* Container — mobile: bottom sheet, desktop: centered modal */}
      <div
        className={cn(
          'relative z-10 w-full bg-[#111] border border-white/10 shadow-2xl overflow-hidden flex flex-col',
          // Mobile: full-width bottom-sheet
          'fixed inset-x-0 bottom-0 top-auto max-h-[85vh] rounded-t-3xl',
          // Desktop: centered modal
          'lg:static lg:mt-[12vh] lg:max-w-[600px] lg:rounded-3xl lg:max-h-[70vh]',
        )}
      >
        {/* Swipe handle — mobile only */}
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <Search className="w-5 h-5 text-white/30 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t('placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-base text-white placeholder:text-white/40 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          )}
          <button
            onClick={onClose}
            className="hidden lg:block text-xs text-white/30 border border-white/10 rounded-lg px-2 py-1 hover:bg-white/5"
          >
            ESC
          </button>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[32px]',
                filter === f.key
                  ? 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30'
                  : 'bg-white/5 text-white/50 border border-white/[0.06] hover:bg-white/10',
              )}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain" role="listbox">
          {/* Recent searches */}
          {showRecent && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-white/30 uppercase tracking-wider font-bold">
                  {t('recentSearches')}
                </span>
                <button
                  onClick={handleClearRecent}
                  className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/50 min-h-[32px]"
                >
                  <Trash2 className="w-3 h-3" />
                  {t('clearRecent')}
                </button>
              </div>
              {recentSearches.map((q) => (
                <button
                  key={q}
                  onClick={() => handleRecentClick(q)}
                  className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-white/[0.04] rounded-xl transition-colors text-left min-h-[44px]"
                >
                  <Clock className="w-4 h-4 text-white/20 shrink-0" />
                  <span className="text-sm text-white/60">{q}</span>
                </button>
              ))}
            </div>
          )}

          {/* Type to search hint */}
          {query.length < 2 && !showRecent && (
            <div className="flex flex-col items-center justify-center py-12 text-white/20">
              <Search className="w-8 h-8 mb-3" />
              <span className="text-sm">{t('typeToSearch')}</span>
            </div>
          )}

          {/* Loading */}
          {loading && query.length >= 2 && (
            <div className="flex items-center justify-center py-8 gap-2 text-white/30">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t('searching')}</span>
            </div>
          )}

          {/* No results */}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-white/20">
              <Search className="w-8 h-8 mb-3" />
              <span className="text-sm">{t('noResults')}</span>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="py-1">
              {/* Group by type */}
              {(['player', 'club', 'profile'] as SearchResultType[]).map((type) => {
                const items = results.filter((r) => r.type === type);
                if (items.length === 0) return null;
                const labelKey = type === 'player' ? 'players' : type === 'club' ? 'clubs' : 'users';
                return (
                  <div key={type}>
                    <div className="px-4 py-1.5 text-[11px] text-white/30 uppercase tracking-wider font-bold">
                      {t(labelKey)}
                    </div>
                    {items.map((r) => {
                      const globalIdx = results.indexOf(r);
                      return (
                        <button
                          key={`${r.type}-${r.id}`}
                          data-idx={globalIdx}
                          role="option"
                          aria-selected={globalIdx === selectedIndex}
                          onClick={() => navigateTo(r)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left min-h-[56px]',
                            globalIdx === selectedIndex
                              ? 'bg-white/[0.06]'
                              : 'hover:bg-white/[0.04]',
                          )}
                        >
                          {r.type === 'player' && <PlayerResultRow r={r} />}
                          {r.type === 'club' && <ClubResultRow r={r} />}
                          {r.type === 'profile' && <ProfileResultRow r={r} />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ------ Result Row Components ------

function PlayerResultRow({ r }: { r: RichSearchResult }) {
  const t = useTranslations('search');
  const club = r.clubId ? getClub(r.clubId) : null;
  const floor = r.floorPrice ? centsToBsd(r.floorPrice) : r.ipoPrice ? centsToBsd(r.ipoPrice) : null;
  const l5 = r.perfL5 ?? 0;

  return (
    <>
      <PlayerPhoto
        imageUrl={r.imageUrl}
        first={r.firstName ?? ''}
        last={r.lastName ?? ''}
        pos={r.position ?? 'MID'}
        size={36}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate">{r.firstName} {r.lastName}</span>
          {r.position && <PositionBadge pos={r.position} size="sm" />}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          {club && (
            <>
              {club.logo && (
                <img src={club.logo} alt="" className="w-3.5 h-3.5 rounded-sm object-contain" />
              )}
              <span>{club.short}</span>
              <span>·</span>
            </>
          )}
          {l5 > 0 && (
            <span className={getL5Color(l5)}>L5: {Math.round(l5)}</span>
          )}
        </div>
      </div>
      {floor !== null && (
        <div className="text-right shrink-0">
          <div className="text-xs font-mono font-bold text-[#FFD700]">{fmtScout(floor)}</div>
          <div className="text-[10px] text-white/30">{t('floor')}</div>
        </div>
      )}
    </>
  );
}

function ClubResultRow({ r }: { r: RichSearchResult }) {
  const t = useTranslations('search');
  return (
    <>
      <div
        className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center shrink-0 overflow-hidden"
        style={!r.clubLogo && r.clubColors ? { backgroundColor: r.clubColors.primary + '30' } : undefined}
      >
        {r.clubLogo ? (
          <img src={r.clubLogo} alt="" className="w-7 h-7 object-contain" />
        ) : (
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: r.clubColors?.primary ?? '#FFD700' }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{r.clubName}</div>
        <div className="text-xs text-white/40">{r.clubLeague}</div>
      </div>
      {r.followerCount !== undefined && r.followerCount > 0 && (
        <div className="text-xs text-white/40 shrink-0">
          {r.followerCount} {t('followers')}
        </div>
      )}
    </>
  );
}

function ProfileResultRow({ r }: { r: RichSearchResult }) {
  const t = useTranslations('search');
  return (
    <>
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#22C55E]/20 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
        {r.avatarUrl ? (
          <img src={r.avatarUrl} alt="" className="w-9 h-9 object-cover" />
        ) : (
          <span className="font-black text-sm text-white/50">
            {(r.displayName || r.handle || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate">{r.displayName || r.handle}</span>
          {(r.totalScore ?? 0) > 0 && <RangBadge score={r.totalScore} size="sm" />}
        </div>
        <div className="text-xs text-white/40">@{r.handle}</div>
      </div>
      <div className="text-xs text-white/40 shrink-0">
        {t('level')} {r.level ?? 1}
      </div>
    </>
  );
}
