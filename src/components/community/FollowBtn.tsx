'use client';

import React from 'react';
import { UserCheck, X, UserPlus } from 'lucide-react';

interface FollowBtnProps {
  isFollowed: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export default function FollowBtn({ isFollowed, onToggle, size = 'sm' }: FollowBtnProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  if (isFollowed) {
    return (
      <button
        onClick={onToggle}
        className={`${sizeClasses} rounded-lg font-medium transition-all flex items-center gap-1 bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/25 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/25 group`}
      >
        <UserCheck className="w-3 h-3 group-hover:hidden" />
        <X className="w-3 h-3 hidden group-hover:block" />
        <span className="group-hover:hidden">Folgst du</span>
        <span className="hidden group-hover:block">Entfolgen</span>
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`${sizeClasses} rounded-lg font-medium transition-all flex items-center gap-1 bg-white/5 border border-white/10 hover:bg-[#22C55E]/15 hover:text-[#22C55E] hover:border-[#22C55E]/25`}
    >
      <UserPlus className="w-3 h-3" />
      <span>Folgen</span>
    </button>
  );
}
