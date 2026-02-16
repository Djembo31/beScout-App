'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui';
import PostCard from '@/components/community/PostCard';
import { useUser } from '@/components/providers/AuthProvider';
import { getPosts, votePost, deletePost } from '@/lib/services/posts';
import type { PostWithAuthor } from '@/types';

interface ProfilePostsTabProps {
  userId: string;
}

export default function ProfilePostsTab({ userId }: ProfilePostsTabProps) {
  const { user } = useUser();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    getPosts({ userId, limit: 30 })
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleVote = async (postId: string, voteType: number) => {
    if (!user) return;
    try {
      await votePost(user.id, postId, voteType);
      setVotes(prev => new Map(prev).set(postId, voteType));
    } catch (err) { console.error('[ProfilePosts] votePost:', err); }
  };

  const handleDelete = async (postId: string) => {
    if (!user) return;
    try {
      await deletePost(user.id, postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) { console.error('[ProfilePosts] deletePost:', err); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-white/30" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="w-10 h-10 mx-auto mb-3 text-white/20" />
        <div className="text-white/30 text-sm">Noch keine Beiträge.</div>
      </Card>
    );
  }

  const currentUserId = user?.id ?? '';

  return (
    <div className="space-y-3">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          myVote={votes.get(post.id)}
          ownedPlayerIds={new Set()}
          onVote={handleVote}
          onDelete={handleDelete}
          isOwn={post.user_id === currentUserId}
          userId={currentUserId}
        />
      ))}
    </div>
  );
}
