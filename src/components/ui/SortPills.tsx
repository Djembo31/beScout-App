'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SortOption {
  id: string;
  label: string;
  count?: number;
}

export interface SortPillsProps {
  options: SortOption[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SortPills({ options, active, onChange, className = '' }: SortPillsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap',
            active === opt.id
              ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/30'
              : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10'
          )}
        >
          {opt.label}
          {opt.count != null && <span className="ml-1 text-white/30">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}
