'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PickerSortKey = 'l5' | 'form' | 'price' | 'az';

interface PickerSortFilterProps {
  sort: PickerSortKey;
  onSortChange: (key: PickerSortKey) => void;
  clubFilter: string[];
  onClubFilterChange: (clubs: string[]) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (v: boolean) => void;
  synergyOnly: boolean;
  onSynergyOnlyChange: (v: boolean) => void;
  // Slice 423: id = clubId (UUID, Fallback Freitext wenn clubId null) als stabiler
  // Toggle-Key; label = aufgelöster Club-Name. Vorher war `short` Key UND Label aus
  // dem stale players.club-String (S368b, inkonsistent zur Row seit Slice 422).
  availableClubs: { id: string; label: string; logo: string | null }[];
  synergyClubs: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SORT_OPTIONS: { key: PickerSortKey; labelKey: string }[] = [
  { key: 'l5', labelKey: 'sortL5' },
  { key: 'form', labelKey: 'sortForm' },
  { key: 'price', labelKey: 'sortPrice' },
  { key: 'az', labelKey: 'sortAZ' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PickerSortFilter({
  sort,
  onSortChange,
  clubFilter,
  onClubFilterChange,
  onlyAvailable,
  onOnlyAvailableChange,
  synergyOnly,
  onSynergyOnlyChange,
  availableClubs,
  synergyClubs,
}: PickerSortFilterProps) {
  const t = useTranslations('fantasy');

  const toggleClub = (id: string) => {
    if (clubFilter.includes(id)) {
      onClubFilterChange(clubFilter.filter((c) => c !== id));
    } else {
      onClubFilterChange([...clubFilter, id]);
    }
  };

  const showSynergy = synergyClubs.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Sort pills */}
      <div
        className="flex gap-1.5 overflow-x-auto scrollbar-hide px-1"
        role="group"
        aria-label="Sort options"
      >
        {SORT_OPTIONS.map((opt) => {
          const isActive = sort === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSortChange(opt.key)}
              className={cn(
                'shrink-0 min-h-[36px] rounded-full px-3.5 py-1.5 text-xs transition-colors',
                isActive
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Filter chips */}
      <div
        className="flex gap-1.5 overflow-x-auto scrollbar-hide px-1"
        role="group"
        aria-label="Filter options"
      >
        {/* Available toggle */}
        <button
          type="button"
          onClick={() => onOnlyAvailableChange(!onlyAvailable)}
          className={cn(
            'shrink-0 min-h-[36px] rounded-full border px-3 py-1.5 text-xs transition-colors',
            onlyAvailable
              ? 'bg-gold/10 border-gold/20 text-gold'
              : 'border-white/10 text-white/40 hover:text-white/60'
          )}
        >
          {t('filterAvailable')}
        </button>

        {/* Synergy toggle — only shown when synergyClubs has entries */}
        {showSynergy && (
          <button
            type="button"
            onClick={() => onSynergyOnlyChange(!synergyOnly)}
            className={cn(
              'shrink-0 min-h-[36px] rounded-full border px-3 py-1.5 text-xs transition-colors',
              synergyOnly
                ? 'bg-gold/10 border-gold/20 text-gold'
                : 'border-white/10 text-white/40 hover:text-white/60'
            )}
          >
            {t('filterSynergy')}
          </button>
        )}

        {/* Club chips — multi-select */}
        {availableClubs.map((club) => {
          const isActive = clubFilter.includes(club.id);
          return (
            <button
              key={club.id}
              type="button"
              onClick={() => toggleClub(club.id)}
              className={cn(
                'shrink-0 min-h-[36px] flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
                isActive
                  ? 'bg-gold/10 border-gold/20 text-gold'
                  : 'border-white/10 text-white/40 hover:text-white/60'
              )}
            >
              {club.logo && (
                <Image
                  src={club.logo}
                  alt={club.label}
                  width={14}
                  height={14}
                  className="shrink-0 rounded-full"
                  unoptimized
                />
              )}
              <span>{club.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
