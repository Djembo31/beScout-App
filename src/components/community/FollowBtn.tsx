'use client';

import React from 'react';
import { UserCheck, X, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface FollowBtnProps {
  isFollowed: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export default function FollowBtn({ isFollowed, onToggle, size = 'sm' }: FollowBtnProps) {
  const t = useTranslations('profile');
  const sizeClasses = size === 'sm' ? 'px-3 py-2 text-xs min-h-[44px]' : 'px-3 py-2 text-sm min-h-[44px]';

  if (isFollowed) {
    return (
      <button
        onClick={onToggle}
        aria-label={t('unfollowAria')}
        className={cn(sizeClasses, 'rounded-lg font-medium transition-colors active:scale-[0.97] flex items-center gap-1 bg-green-500/15 text-green-500 border border-green-500/25 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/25 group')}
      >
        <UserCheck className="w-3 h-3 group-hover:hidden" aria-hidden="true" />
        <X className="w-3 h-3 hidden group-hover:block" aria-hidden="true" />
        <span className="group-hover:hidden">{t('followingState')}</span>
        <span className="hidden group-hover:block">{t('unfollow')}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={cn(sizeClasses, 'rounded-lg font-medium transition-colors active:scale-[0.97] flex items-center gap-1 bg-surface-base border border-white/10 hover:bg-green-500/15 hover:text-green-500 hover:border-green-500/25')}
    >
      <UserPlus className="w-3 h-3" aria-hidden="true" />
      <span>{t('follow')}</span>
    </button>
  );
}
