'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, FileText, Users, Loader2, Search, MessageSquare, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { globalSearch, type SearchResult } from '@/lib/services/search';

function getResultIcon(type: SearchResult['type']) {
  switch (type) {
    case 'player': return <Users className="w-4 h-4" />;
    case 'research': return <FileText className="w-4 h-4" />;
    case 'profile': return <User className="w-4 h-4" />;
    case 'post': return <MessageSquare className="w-4 h-4" />;
    case 'bounty': return <Target className="w-4 h-4" />;
  }
}

function getResultColor(type: SearchResult['type']): string {
  switch (type) {
    case 'player': return 'text-[#FFD700] bg-[#FFD700]/10';
    case 'research': return 'text-purple-400 bg-purple-400/10';
    case 'profile': return 'text-[#22C55E] bg-[#22C55E]/10';
    case 'post': return 'text-sky-400 bg-sky-400/10';
    case 'bounty': return 'text-amber-400 bg-amber-400/10';
  }
}

function getCategoryLabel(type: SearchResult['type']): string {
  switch (type) {
    case 'player': return 'Spieler';
    case 'research': return 'Research';
    case 'profile': return 'Nutzer';
    case 'post': return 'Beiträge';
    case 'bounty': return 'Aufträge';
  }
}

interface SearchDropdownProps {
  query: string;
  open: boolean;
  onClose: () => void;
}

export default function SearchDropdown({ query, open, onClose }: SearchDropdownProps) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search with stale-request guard
  const searchIdRef = useRef(0);
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++searchIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const data = await globalSearch(query);
        if (id === searchIdRef.current) setResults(data);
      } catch {
        if (id === searchIdRef.current) setResults([]);
      } finally {
        if (id === searchIdRef.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleClick = useCallback((result: SearchResult) => {
    router.push(result.href);
    onClose();
  }, [router, onClose]);

  if (!open || query.length < 2) return null;

  // Group results by type
  const groups = new Map<string, SearchResult[]>();
  for (const r of results) {
    const existing = groups.get(r.type) ?? [];
    existing.push(r);
    groups.set(r.type, existing);
  }

  return (
    <div ref={ref} className="absolute left-0 right-0 top-full mt-1 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden anim-dropdown">
      {loading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-white/30">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Suche...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="py-6 text-center text-sm text-white/30">
          <Search className="w-5 h-5 mx-auto mb-2 text-white/20" />
          Keine Ergebnisse
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto py-1">
          {Array.from(groups.entries()).map(([type, items]) => (
            <div key={type}>
              <div className="px-3 py-1.5 text-[10px] text-white/30 uppercase tracking-wider font-bold">
                {getCategoryLabel(type as SearchResult['type'])}
              </div>
              {items.map(result => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleClick(result)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                >
                  <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', getResultColor(result.type))}>
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{result.title}</div>
                    <div className="text-[10px] text-white/40 truncate">{result.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
