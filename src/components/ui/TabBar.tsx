'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TabDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabBarProps {
  tabs: TabDef[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeTab, onChange, className }: TabBarProps) {
  return (
    <div role="tablist" className={cn('flex gap-1 p-1 bg-white/[0.02] border border-white/10 rounded-2xl', className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
            activeTab === tab.id
              ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20'
              : 'text-white/40 hover:text-white/60 border border-transparent'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
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
