'use client';

import { memo } from 'react';
import { MessageSquare, Radio, FileText, Lock, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface CommunityHeroProps {
  onCreatePost: () => void;
  onCreateRumor: () => void;
  onCreateResearch: () => void;
  researchLocked?: boolean;
  onCreateBounty?: () => void;
}

type HeroAction = {
  key: string;
  icon: typeof MessageSquare;
  color: string;
  iconColor: string;
};

const BASE_ACTIONS: HeroAction[] = [
  { key: 'post', icon: MessageSquare, color: 'bg-sky-500/[0.08] border-sky-500/20 hover:border-sky-500/40', iconColor: 'text-sky-400' },
  { key: 'rumor', icon: Radio, color: 'bg-red-500/[0.08] border-red-500/20 hover:border-red-500/40', iconColor: 'text-red-400' },
  { key: 'research', icon: FileText, color: 'bg-purple-500/[0.08] border-purple-500/20 hover:border-purple-500/40', iconColor: 'text-purple-400' },
];

const BOUNTY_ACTION: HeroAction = {
  key: 'bounty', icon: Target, color: 'bg-amber-500/[0.08] border-amber-500/20 hover:border-amber-500/40', iconColor: 'text-amber-400',
};

function CommunityHeroInner({
  onCreatePost,
  onCreateRumor,
  onCreateResearch,
  researchLocked,
  onCreateBounty,
}: CommunityHeroProps) {
  const t = useTranslations('community');

  // Build action list dynamically
  const actions: HeroAction[] = [...BASE_ACTIONS];
  if (onCreateBounty) actions.push(BOUNTY_ACTION);

  const handlerMap: Record<string, () => void> = {
    post: onCreatePost,
    rumor: onCreateRumor,
    research: onCreateResearch,
    bounty: onCreateBounty ?? (() => {}),
  };

  const colsClass = actions.length <= 3
    ? 'grid-cols-3'
    : actions.length === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';

  return (
    <div className={cn('grid gap-3', colsClass)}>
      {actions.map((a) => {
        const Icon = a.icon;
        const isLocked = a.key === 'research' && researchLocked;
        return (
          <button
            key={a.key}
            onClick={handlerMap[a.key]}
            className={cn('group relative p-4 rounded-2xl border transition-colors active:scale-[0.97] min-h-[44px] text-left', a.color, isLocked && 'opacity-60')}
          >
            <div className="flex items-center gap-1.5">
              <Icon className={cn('size-6 mb-2', a.iconColor)} />
              {isLocked && <Lock className="w-3.5 h-3.5 text-white/40 mb-2" />}
            </div>
            <div className="font-bold text-sm">{t(`hero.${a.key}Label`)}</div>
            <div className="text-[11px] text-white/40 mt-0.5 line-clamp-2">
              {isLocked ? t('hero.researchLocked') : t(`hero.${a.key}Desc`)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default memo(CommunityHeroInner);
