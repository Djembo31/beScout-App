'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { SELECT_CLS, INTERACTIVE } from './hooks/types';
import type { DbClub } from '@/types';

interface EventFilterBarProps {
  filters: {
    status: string[];
    type: string[];
    clubId: string;
    gameweek: number | null;
    search: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    status: string[];
    type: string[];
    clubId: string;
    gameweek: number | null;
    search: string;
  }>>;
  clubs: DbClub[];
  statusOptions: string[];
  statusLabels: Record<string, string>;
  typeOptions: readonly string[];
}

export function EventFilterBar({
  filters,
  setFilters,
  clubs,
  statusOptions,
  statusLabels,
  typeOptions,
}: EventFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* Status */}
      <select
        aria-label="Status filtern"
        value={filters.status.length === 1 ? filters.status[0] : ''}
        onChange={(e) => setFilters(f => ({ ...f, status: e.target.value ? [e.target.value] : [] }))}
        className={cn(SELECT_CLS, INTERACTIVE, 'w-auto')}
      >
        <option value="">Alle Status</option>
        {statusOptions.map(s => (
          <option key={s} value={s}>{statusLabels[s] ?? s}</option>
        ))}
      </select>

      {/* Type */}
      <select
        aria-label="Typ filtern"
        value={filters.type.length === 1 ? filters.type[0] : ''}
        onChange={(e) => setFilters(f => ({ ...f, type: e.target.value ? [e.target.value] : [] }))}
        className={cn(SELECT_CLS, INTERACTIVE, 'w-auto')}
      >
        <option value="">Alle Typen</option>
        {typeOptions.map(t => (
          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
        ))}
      </select>

      {/* Club */}
      <select
        aria-label="Club filtern"
        value={filters.clubId}
        onChange={(e) => setFilters(f => ({ ...f, clubId: e.target.value }))}
        className={cn(SELECT_CLS, INTERACTIVE, 'w-auto')}
      >
        <option value="">Alle Clubs</option>
        {clubs.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Gameweek */}
      <select
        aria-label="Spieltag filtern"
        value={filters.gameweek ?? ''}
        onChange={(e) => setFilters(f => ({ ...f, gameweek: e.target.value ? parseInt(e.target.value) : null }))}
        className={cn(SELECT_CLS, INTERACTIVE, 'w-auto')}
      >
        <option value="">Alle Spieltage</option>
        {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
          <option key={gw} value={gw}>Spieltag {gw}</option>
        ))}
      </select>
    </div>
  );
}
