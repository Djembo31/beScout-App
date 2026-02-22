'use client';

import { MessageSquare, Radio, FileText, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CommunityHeroProps {
  onCreatePost: () => void;
  onCreateRumor: () => void;
  onCreateResearch: () => void;
  researchLocked?: boolean;
}

const ACTIONS = [
  { key: 'post', icon: MessageSquare, color: 'from-sky-500/20 to-sky-500/5 border-sky-500/20 hover:border-sky-500/40', iconColor: 'text-sky-400' },
  { key: 'rumor', icon: Radio, color: 'from-red-500/20 to-red-500/5 border-red-500/20 hover:border-red-500/40', iconColor: 'text-red-400' },
  { key: 'research', icon: FileText, color: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40', iconColor: 'text-purple-400' },
] as const;

export default function CommunityHero({ onCreatePost, onCreateRumor, onCreateResearch, researchLocked }: CommunityHeroProps) {
  const t = useTranslations('community');
  const handlers = [onCreatePost, onCreateRumor, onCreateResearch];

  return (
    <div className="grid grid-cols-3 gap-3">
      {ACTIONS.map((a, i) => {
        const Icon = a.icon;
        const isLocked = a.key === 'research' && researchLocked;
        return (
          <button
            key={a.key}
            onClick={handlers[i]}
            className={`group relative p-4 rounded-2xl border bg-gradient-to-br ${a.color} transition-all min-h-[44px] text-left ${isLocked ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-1.5">
              <Icon className={`w-6 h-6 ${a.iconColor} mb-2`} />
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
