'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Rocket, CheckCircle2, Circle, ChevronRight, X, Zap, Trophy, UserPlus, MessageCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/ui/Confetti';
import { useHoldings, useJoinedEventIds, useFollowingCount, usePosts, useHasAnyPrediction } from '@/lib/queries';
import { useTranslations } from 'next-intl';

// ── Storage Keys ──
const DISMISSED_KEY = 'bescout-onboarding-dismissed';
const CELEBRATED_KEY = 'bescout-onboarding-celebrated';

type TaskDef = {
  key: string;
  icon: React.ReactNode;
  href: string;
  completed: boolean;
};

export default function OnboardingChecklist({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations('onboarding');
  const tc = useTranslations('common');

  // ── Dismiss state (localStorage) ──
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(DISMISSED_KEY);
  });

  // ── Confetti ──
  const [showConfetti, setShowConfetti] = useState(false);

  // ── Data queries (deduplicated via React Query) ──
  const { data: holdings = [] } = useHoldings(userId);
  const { data: joinedEventIds = [] } = useJoinedEventIds(userId);
  const { data: followingCount = 0 } = useFollowingCount(userId);
  const { data: userPosts = [] } = usePosts({ userId, limit: 1 });
  const { data: hasPrediction = false } = useHasAnyPrediction(userId);

  // ── Task definitions ──
  const tasks: TaskDef[] = useMemo(() => [
    {
      key: 'buyDpc',
      icon: <Zap className="w-4 h-4 text-[#FFD700]" />,
      href: '/market?tab=kaufen',
      completed: holdings.length > 0,
    },
    {
      key: 'joinFantasy',
      icon: <Trophy className="w-4 h-4 text-purple-400" />,
      href: '/fantasy',
      completed: joinedEventIds.length > 0,
    },
    {
      key: 'followScout',
      icon: <UserPlus className="w-4 h-4 text-sky-400" />,
      href: '/community',
      completed: followingCount > 0,
    },
    {
      key: 'createPost',
      icon: <MessageCircle className="w-4 h-4 text-emerald-400" />,
      href: '/community',
      completed: userPosts.length > 0,
    },
    {
      key: 'makePrediction',
      icon: <Target className="w-4 h-4 text-amber-400" />,
      href: '/fantasy',
      completed: hasPrediction,
    },
  ], [holdings.length, joinedEventIds.length, followingCount, userPosts.length, hasPrediction]);

  const completedCount = tasks.filter(t => t.completed).length;
  const allDone = completedCount === tasks.length;

  // ── Celebrate once when all done ──
  React.useEffect(() => {
    if (!allDone) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(CELEBRATED_KEY)) return;
    localStorage.setItem(CELEBRATED_KEY, '1');
    setShowConfetti(true);
  }, [allDone]);

  // ── Auto-hide when all done or dismissed ──
  if (allDone || dismissed) return <Confetti active={showConfetti} />;

  return (
    <>
      <Confetti active={showConfetti} />
      <div className="relative overflow-hidden rounded-2xl border border-[#FFD700]/20 bg-gradient-to-r from-[#FFD700]/[0.06] via-purple-500/[0.03] to-[#22C55E]/[0.03]">
        {/* Dismiss button */}
        <button
          onClick={() => { localStorage.setItem(DISMISSED_KEY, '1'); setDismissed(true); }}
          className="absolute top-2 right-2 p-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 active:scale-90 transition-all z-10"
          aria-label={tc('close')}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="w-5 h-5 text-[#FFD700]" />
            <span className="text-sm font-black text-[#FFD700] uppercase tracking-wide">{t('title')}</span>
          </div>
          <p className="text-xs text-white/50 mb-3">
            {t('subtitle', { completed: completedCount, total: tasks.length })}
          </p>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-white/[0.06] mb-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#22C55E] transition-all duration-500"
              style={{ width: `${(completedCount / tasks.length) * 100}%` }}
            />
          </div>

          {/* Task list */}
          <div className="space-y-1">
            {tasks.map((task) => {
              if (task.completed) {
                return (
                  <div key={task.key} className="flex items-center gap-3 px-2 py-2 rounded-xl opacity-50">
                    <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
                    <span className="flex items-center gap-2 text-sm">
                      {task.icon}
                      <span className="line-through">{t(task.key)}</span>
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={task.key}
                  href={task.href}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors group"
                >
                  <Circle className="w-5 h-5 text-white/20 shrink-0" />
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    {task.icon}
                    <span className="text-sm font-medium">{t(task.key)}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
