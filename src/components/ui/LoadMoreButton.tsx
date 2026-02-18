'use client';

import { Loader2 } from 'lucide-react';

interface LoadMoreButtonProps {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function LoadMoreButton({ loading, hasMore, onLoadMore }: LoadMoreButtonProps) {
  if (!hasMore) {
    return (
      <div className="text-center py-4">
        <span className="text-xs text-white/30">Alle geladen</span>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <button
        onClick={onLoadMore}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Laden...
          </>
        ) : (
          'Mehr laden'
        )}
      </button>
    </div>
  );
}
