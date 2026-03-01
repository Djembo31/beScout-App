'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <Card className={cn('p-12 text-center', className)}>
      <div className="flex justify-center mb-4 text-white/40 [&>svg]:size-12">
        {icon}
      </div>
      <div className="text-white/30 text-balance mb-2">{title}</div>
      {description && <div className="text-sm text-white/50 text-pretty mb-4">{description}</div>}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-gold/15 border border-gold/30 text-gold rounded-xl hover:bg-gold/25 transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-gold/15 border border-gold/30 text-gold rounded-xl hover:bg-gold/25 transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </Card>
  );
}
