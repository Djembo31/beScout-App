'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Pin, Trash2, FileText, Loader2, Save, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getPosts, adminDeletePost, adminTogglePin } from '@/lib/services/posts';
import { updateCommunityGuidelines } from '@/lib/services/club';
import { canPerformAction } from '@/lib/adminRoles';
import type { ClubWithAdmin, PostWithAuthor } from '@/types';

// ============================================
// ADMIN MODERATION TAB
// ============================================

export default function AdminModerationTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');
  const role = club.admin_role ?? 'editor';
  const canPin = canPerformAction('pin_post', role);
  const canDelete = canPerformAction('delete_post', role);
  const canEditGuidelines = canPerformAction('update_guidelines', role);
  const { user } = useUser();
  const { addToast } = useToast();

  // Guidelines
  const [guidelines, setGuidelines] = useState(club.community_guidelines ?? '');
  const [guidelinesSaving, setGuidelinesSaving] = useState(false);
  const guidelinesChanged = guidelines !== (club.community_guidelines ?? '');

  // Posts
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await getPosts({ limit: 50 });
        // Filter to club posts only
        if (!cancelled) setPosts(result.filter(p => p.club_id === club.id));
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [club.id]);

  const pinnedPosts = posts.filter(p => p.is_pinned);

  const handleSaveGuidelines = useCallback(async () => {
    if (!user) return;
    setGuidelinesSaving(true);
    try {
      const result = await updateCommunityGuidelines(user.id, club.id, guidelines || null);
      if (result.success) {
        addToast(t('guidelinesSaved'), 'success');
      } else {
        addToast(result.error ?? t('unknownError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('unknownError'), 'error');
    } finally {
      setGuidelinesSaving(false);
    }
  }, [user, club.id, guidelines, addToast]);

  const handleTogglePin = useCallback(async (postId: string, pinned: boolean) => {
    if (!user) return;
    try {
      const result = await adminTogglePin(user.id, postId, pinned);
      if (result.success) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, is_pinned: pinned } : p
        ));
        addToast(pinned ? t('postPinned') : t('postUnpinned'), 'success');
      } else {
        addToast(result.error ?? t('unknownError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('unknownError'), 'error');
    }
  }, [user, addToast]);

  const handleAdminDelete = useCallback(async (postId: string) => {
    if (!user) return;
    try {
      const result = await adminDeletePost(user.id, postId);
      if (result.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        addToast(t('postRemoved'), 'success');
      } else {
        addToast(result.error ?? t('unknownError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('unknownError'), 'error');
    }
  }, [user, addToast]);

  return (
    <div className="space-y-6">
      {/* Community-Richtlinien */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gold" />
          <span className="font-black text-lg">{t('communityGuidelines')}</span>
        </div>
        <p className="text-sm text-white/50 mb-3">
          {t('guidelinesDesc')}
        </p>
        <textarea
          value={guidelines}
          onChange={(e) => canEditGuidelines && setGuidelines(e.target.value.slice(0, 1000))}
          readOnly={!canEditGuidelines}
          placeholder={t('guidelinesPlaceholder')}
          className={cn(
            'w-full h-32 p-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 resize-none',
            !canEditGuidelines && 'opacity-60 cursor-not-allowed'
          )}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-white/30">{guidelines.length}/1000</span>
          {canEditGuidelines && (
            <Button
              variant="gold"
              size="sm"
              onClick={handleSaveGuidelines}
              disabled={!guidelinesChanged || guidelinesSaving}
            >
              {guidelinesSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('save')}
            </Button>
          )}
        </div>
      </Card>

      {/* Gepinnte Posts */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Pin className="w-5 h-5 text-gold" />
          <span className="font-black text-lg">{t('pinnedPosts')}</span>
          <span className="text-xs text-white/40">{pinnedPosts.length}/3</span>
        </div>
        {pinnedPosts.length === 0 ? (
          <p className="text-sm text-white/40">{t('noPinnedPosts')}</p>
        ) : (
          <div className="space-y-2">
            {pinnedPosts.map(post => (
              <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl bg-gold/[0.03] border border-gold/10">
                <Pin className="w-4 h-4 text-gold flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{post.content.slice(0, 80)}</p>
                  <span className="text-[10px] text-white/40">{t('by')} {post.author_display_name || post.author_handle}</span>
                </div>
                {canPin && (
                  <button
                    onClick={() => handleTogglePin(post.id, false)}
                    className="text-xs text-white/50 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    {t('unpin')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Alle Posts */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-400" />
          <span className="font-black text-lg">{t('clubPosts')}</span>
          <span className="text-xs text-white/40">{posts.length} Posts</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm text-white/40">{t('noPosts')}</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {posts.map(post => (
              <div key={post.id} className={cn(
                'flex items-start gap-3 p-3 rounded-xl border transition-colors',
                post.is_pinned
                  ? 'bg-gold/[0.03] border-gold/10'
                  : 'bg-surface-minimal border-white/[0.06] hover:border-white/10'
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{post.author_display_name || post.author_handle}</span>
                    {post.is_pinned && <Pin className="w-3 h-3 text-gold" />}
                    <span className="text-[10px] text-white/30">{new Date(post.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                  <p className="text-sm text-white/70 line-clamp-2">{post.content}</p>
                </div>
                {(canPin || canDelete) && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canPin && (
                      <button
                        onClick={() => handleTogglePin(post.id, !post.is_pinned)}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors',
                          post.is_pinned ? 'text-gold hover:bg-gold/10' : 'text-white/30 hover:text-white hover:bg-white/5'
                        )}
                        title={post.is_pinned ? t('unpin') : t('pin')}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleAdminDelete(post.id)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
