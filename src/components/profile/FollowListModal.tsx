'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { getFollowerList, getFollowingList, isFollowing, followUser, unfollowUser, type ProfileSummary } from '@/lib/services/social';
import { getLevelTier } from '@/types';

interface FollowListModalProps {
  userId: string;
  mode: 'followers' | 'following';
  onClose: () => void;
}

export default function FollowListModal({ userId, mode, onClose }: FollowListModalProps) {
  const { user } = useUser();
  const [list, setList] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Map<string, boolean>>(new Map());
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = mode === 'followers'
        ? await getFollowerList(userId)
        : await getFollowingList(userId);
      setList(data);

      // Check which users the current user follows
      if (user) {
        const checks = await Promise.allSettled(
          data.map(p => isFollowing(user.id, p.userId))
        );
        const map = new Map<string, boolean>();
        data.forEach((p, i) => {
          map.set(p.userId, checks[i].status === 'fulfilled' ? checks[i].value : false);
        });
        setFollowingMap(map);
      }
      setLoading(false);
    };
    load();
  }, [userId, mode, user]);

  const handleToggleFollow = async (targetId: string) => {
    if (!user || toggling) return;
    setToggling(targetId);
    try {
      const isCurrentlyFollowing = followingMap.get(targetId) ?? false;
      if (isCurrentlyFollowing) {
        await unfollowUser(user.id, targetId);
      } else {
        await followUser(user.id, targetId);
      }
      setFollowingMap(prev => new Map(prev).set(targetId, !isCurrentlyFollowing));
    } catch { /* silent */ }
    setToggling(null);
  };

  return (
    <Modal open={true} onClose={onClose} title={mode === 'followers' ? 'Follower' : 'Folgt'}>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </div>
      ) : list.length === 0 ? (
        <div className="py-8 text-center text-sm text-white/30">
          {mode === 'followers' ? 'Noch keine Follower.' : 'Folgt niemandem.'}
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {list.map(p => {
            const tier = getLevelTier(p.level);
            const isMe = user?.id === p.userId;
            const isFollowingThem = followingMap.get(p.userId) ?? false;
            return (
              <div key={p.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/60 overflow-hidden flex-shrink-0">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    p.handle[0]?.toUpperCase() ?? '?'
                  )}
                </div>

                {/* Info */}
                <Link href={`/profile/${p.handle}`} onClick={onClose} className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {p.displayName ?? p.handle}
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-white/40">@{p.handle}</span>
                    <span className={`${tier.color} font-medium`}>Lv. {p.level}</span>
                  </div>
                </Link>

                {/* Follow/Unfollow Button */}
                {!isMe && user && (
                  <button
                    onClick={() => handleToggleFollow(p.userId)}
                    disabled={toggling === p.userId}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                      isFollowingThem
                        ? 'bg-white/10 text-white/40 hover:bg-red-500/10 hover:text-red-400'
                        : 'bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700]/20'
                    }`}
                  >
                    {toggling === p.userId ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isFollowingThem ? (
                      <UserMinus className="w-3.5 h-3.5" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
