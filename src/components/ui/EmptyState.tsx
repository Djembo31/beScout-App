'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';

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
    <Card className={`p-12 text-center ${className}`}>
      <div className="flex justify-center mb-4 text-white/20 [&>svg]:w-12 [&>svg]:h-12">
        {icon}
      </div>
      <div className="text-white/30 mb-2">{title}</div>
      {description && <div className="text-sm text-white/50 mb-4">{description}</div>}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-[#FFD700]/15 border border-[#FFD700]/30 text-[#FFD700] rounded-xl hover:bg-[#FFD700]/25 transition-all"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold bg-[#FFD700]/15 border border-[#FFD700]/30 text-[#FFD700] rounded-xl hover:bg-[#FFD700]/25 transition-all"
          >
            {action.label}
          </button>
        )
      )}
    </Card>
  );
}
