'use client';

import React from 'react';
import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { Card } from '@/components/ui';
import { formatTimeAgo } from '@/components/community/PostCard';
import { useTranslations } from 'next-intl';
import type { PostWithAuthor } from '@/types';

interface ClubNewsSectionProps {
  posts: PostWithAuthor[];
  onShowAll: () => void;
}

export default function ClubNewsSection({ posts, onShowAll }: ClubNewsSectionProps) {
  const t = useTranslations('community');
  if (posts.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#FFD700]" />
          <span className="font-bold text-sm">{t('clubNews.title')}</span>
          <span className="text-[10px] bg-[#FFD700]/15 text-[#FFD700] px-1.5 py-0.5 rounded-full border border-[#FFD700]/20 font-semibold">
            {t('clubNews.official')}
          </span>
        </div>
      </div>

      {/* Horizontal scroll on mobile, 2-col grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-2 lg:overflow-visible scrollbar-hide">
        {posts.map(post => (
          <div key={post.id} className="min-w-[280px] lg:min-w-0 flex-shrink-0 lg:flex-shrink">
            <Card className="p-3 border-[#FFD700]/20 bg-gradient-to-br from-[#FFD700]/[0.04] to-transparent hover:border-[#FFD700]/30 transition-all h-full">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <Link
                  href={`/profile/${post.author_handle}`}
                  className="text-xs font-bold text-white/60 hover:text-[#FFD700] transition-colors"
                >
                  {post.author_display_name || post.author_handle}
                </Link>
                <span className="text-[10px] text-white/30 whitespace-nowrap">{formatTimeAgo(post.created_at)}</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed line-clamp-3">{post.content}</p>
              {post.tags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-[#FFD700]/10 text-[#FFD700]/60">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
