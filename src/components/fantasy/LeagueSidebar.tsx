'use client';

import type { LeagueCategory } from './types';

export const LeagueSidebar = ({
  categories,
  selected,
  onSelect,
}: {
  categories: LeagueCategory[];
  selected: string;
  onSelect: (id: string) => void;
}) => {
  const userCats = categories.filter(c => c.group === 'user');
  const typeCats = categories.filter(c => c.group !== 'user');

  const renderButton = (cat: LeagueCategory) => (
    <button
      key={cat.id}
      onClick={() => onSelect(cat.id)}
      className={`flex items-center justify-between px-3 py-2 rounded-full lg:rounded-lg whitespace-nowrap lg:whitespace-normal text-left transition-all ${selected === cat.id
        ? 'bg-[#FFD700]/15 text-[#FFD700]'
        : 'hover:bg-white/5 text-white/70'
        }`}
    >
      <span className="flex items-center gap-2">
        <span>{cat.icon}</span>
        <span className="text-sm">{cat.name}</span>
      </span>
      <span className="text-xs text-white/40 hidden lg:inline">{cat.count}</span>
    </button>
  );

  return (
    <div className="w-full lg:w-48 lg:flex-shrink-0 lg:border-r border-white/10 lg:pr-4">
      <div className="text-xs text-white/40 uppercase tracking-wider mb-3 hidden lg:block">Meine Filter</div>
      <div className="flex lg:flex-col gap-1.5 lg:gap-1 overflow-x-auto lg:overflow-visible">
        {userCats.map(renderButton)}
      </div>
      <div className="border-b border-white/10 my-3 hidden lg:block" />
      <div className="text-xs text-white/40 uppercase tracking-wider mb-3 hidden lg:block">Kategorien</div>
      <div className="flex lg:flex-col gap-1.5 lg:gap-1 overflow-x-auto lg:overflow-visible">
        {typeCats.map(renderButton)}
      </div>
    </div>
  );
};
