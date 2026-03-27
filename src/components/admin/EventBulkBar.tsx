'use client';

import { CheckSquare } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { SELECT_CLS, INTERACTIVE } from './hooks/types';

interface EventBulkBarProps {
  selectedCount: number;
  bulkStatus: string;
  setBulkStatus: (value: string) => void;
  availableTransitions: string[];
  statusLabels: Record<string, string>;
  onExecute: () => void;
  onClear: () => void;
  loading: boolean;
  executeLabel: string;
}

export function EventBulkBar({
  selectedCount,
  bulkStatus,
  setBulkStatus,
  availableTransitions,
  statusLabels,
  onExecute,
  onClear,
  loading,
  executeLabel,
}: EventBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-gold/20">
      <div className="flex items-center gap-2">
        <CheckSquare className="size-4 text-gold" aria-hidden="true" />
        <span className="text-sm font-bold text-gold font-mono tabular-nums">
          {selectedCount} ausgewaehlt
        </span>
      </div>
      <select
        aria-label="Bulk-Aktion waehlen"
        value={bulkStatus}
        onChange={(e) => setBulkStatus(e.target.value)}
        className={cn(SELECT_CLS, INTERACTIVE, 'w-auto')}
      >
        <option value="">Status aendern...</option>
        {availableTransitions.map(s => (
          <option key={s} value={s}>{statusLabels[s] ?? s}</option>
        ))}
      </select>
      <Button
        variant="gold"
        size="sm"
        disabled={!bulkStatus || loading}
        loading={loading}
        onClick={onExecute}
        aria-label={executeLabel}
      >
        {executeLabel}
      </Button>
      <button
        onClick={onClear}
        aria-label="Auswahl aufheben"
        className={cn('text-xs text-white/40 underline min-h-[44px] min-w-[44px] px-2', INTERACTIVE)}
      >
        Aufheben
      </button>
    </Card>
  );
}
