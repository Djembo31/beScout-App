'use client';

import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
}

interface MobileTableCardProps<T> {
  columns: Column<T>[];
  data: T[];
  keyFn: (item: T) => string;
  /** Optional custom card renderer. Falls back to key-value pairs. */
  renderCard?: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

export function MobileTableCard<T>({
  columns,
  data,
  keyFn,
  renderCard,
  emptyMessage = 'Keine Daten',
}: MobileTableCardProps<T>) {
  if (data.length === 0) {
    return <div className="py-8 text-center text-sm text-white/30">{emptyMessage}</div>;
  }

  return (
    <>
      {/* Desktop: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map(col => (
                <th key={col.key} className="text-left px-3 py-2 text-xs text-white/50 font-bold uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={keyFn(item)} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2.5">
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card View */}
      <div className="md:hidden space-y-2">
        {data.map(item => (
          <div key={keyFn(item)} className="bg-white/[0.02] rounded-xl p-3 border border-white/10">
            {renderCard ? renderCard(item) : (
              <div className="space-y-1.5">
                {columns.map(col => (
                  <div key={col.key} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-white/40 shrink-0">{col.header}</span>
                    <span className="text-sm text-right min-w-0 truncate">{col.render(item)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
