'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TabDef {
  id: string;
  label: string;
  /** Short label shown on mobile (e.g. "GW" instead of "Gameweeks") */
  shortLabel?: string;
  icon?: React.ReactNode;
}

interface TabBarProps {
  tabs: TabDef[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  /** Custom accent color for active tab (hex, e.g. '#006633') */
  accentColor?: string;
}

export function TabBar({ tabs, activeTab, onChange, className, accentColor }: TabBarProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 p-1 bg-white/[0.02] border border-white/10 rounded-2xl',
        'overflow-x-auto scrollbar-hide',
        className
      )}
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1 md:gap-1.5 px-2.5 py-2 md:px-3 md:py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap active:scale-[0.97] flex-shrink-0 min-h-[44px]',
              isActive && !accentColor && 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30',
              !isActive && 'text-white/40 hover:text-white/60 border border-transparent'
            )}
            style={isActive && accentColor ? {
              backgroundColor: `${accentColor}18`,
              color: accentColor,
              border: `1px solid ${accentColor}50`,
            } : undefined}
          >
            {tab.icon}
            <span className={tab.shortLabel ? 'hidden md:inline' : undefined}>{tab.label}</span>
            {tab.shortLabel && <span className="md:hidden">{tab.shortLabel}</span>}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: React.ReactNode;
}

export function TabPanel({ id, activeTab, children }: TabPanelProps) {
  if (activeTab !== id) return null;
  return (
    <div role="tabpanel" id={`tabpanel-${id}`} aria-labelledby={id}>
      {children}
    </div>
  );
}
