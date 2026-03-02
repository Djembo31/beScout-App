'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface LoadMoreButtonProps {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function LoadMoreButton({ loading, hasMore, onLoadMore }: LoadMoreButtonProps) {
  const t = useTranslations('common');

  if (!hasMore) {
    return (
      <div className="text-center py-4">
        <span className="text-xs text-white/30">{t('allLoaded')}</span>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <button
        onClick={onLoadMore}
        disabled={loading}
        aria-busy={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {t('loadingEllipsis')}
          </>
        ) : (
          t('loadMore')
        )}
      </button>
    </div>
  );
}
