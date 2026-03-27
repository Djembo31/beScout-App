'use client';

import { Chip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { STATUS_STYLES } from './hooks/types';

interface EventStatusBadgeProps {
  status: string;
  label: string;
  className?: string;
}

export function EventStatusBadge({ status, label, className }: EventStatusBadgeProps) {
  const sc = STATUS_STYLES[status] ?? STATUS_STYLES.ended;
  return (
    <Chip className={cn(sc.bg, sc.text, sc.border, 'border flex-shrink-0', className)}>
      {label}
    </Chip>
  );
}
