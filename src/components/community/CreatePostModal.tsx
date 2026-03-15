'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, X as XIcon, Loader2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useDraft } from '@/lib/hooks/useDraft';
import { POST_CATEGORIES } from '@/components/community/PostCard';
import type { Pos, PostType } from '@/types';

const MAX_IMAGE_KB = 1024; // 1MB

// ============================================
// TYPES
// ============================================

const POST_TYPE_IDS: PostType[] = ['general', 'player_take', 'transfer_rumor'];

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  players: { id: string; name: string; pos: Pos }[];
  onSubmit: (playerId: string | null, content: string, tags: string[], category: string, postType: PostType, imageFile: File | null) => void;
  loading: boolean;
  defaultPostType?: PostType;
}

// ============================================
// CREATE POST MODAL
// ============================================

export default function CreatePostModal({
  open, onClose, players, onSubmit, loading, defaultPostType,
}: CreatePostModalProps) {
  const t = useTranslations('community');
  const [content, setContent] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState('Meinung');
  const [postType, setPostType] = useState<PostType>('general');
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  // Draft system
  type PostDraft = { content: string; tagInput: string; category: string; postType: PostType };
  const getDraftData = useCallback((): PostDraft => ({ content, tagInput, category, postType }), [content, tagInput, category, postType]);
  const setDraftData = useCallback((d: PostDraft) => {
    setContent(d.content ?? '');
    setTagInput(d.tagInput ?? '');
    setCategory(d.category ?? 'Meinung');
    setPostType(d.postType ?? 'general');
  }, []);
  const isDraftEmpty = useCallback((d: PostDraft) => !d.content || d.content.trim().length < 5, []);
  const { hasDraft, restoreDraft, dismissDraft, clearDraft } = useDraft(
    'bescout-draft-post', open, getDraftData, setDraftData, isDraftEmpty
  );

  // Set postType when modal opens with a defaultPostType
  useEffect(() => {
    if (open && defaultPostType) {
      setPostType(defaultPostType);
    }
  }, [open, defaultPostType]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (playerRef.current && !playerRef.current.contains(e.target as Node)) {
        setPlayerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    if (file.size > MAX_IMAGE_KB * 1024) {
      setImageError(t('imageTooLarge'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImageLoading(true);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => { setImagePreview(ev.target?.result as string); setImageLoading(false); };
    reader.onerror = () => { setImageError(t('imageError')); setImageLoading(false); };
    reader.readAsDataURL(file);
  }, [t]);

  const removeImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const canSubmit = content.trim().length >= 10;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    onSubmit(playerId || null, content.trim(), tags, category, postType, imageFile);
    clearDraft();
    setContent('');
    setPlayerId('');
    setTagInput('');
    setCategory('Meinung');
    setPostType('general');
    setPlayerSearch('');
    removeImage();
  };

  return (
    <Modal
      open={open}
      title={t('newPost')}
      onClose={onClose}
      footer={
        <div className="space-y-2">
          {!canSubmit && content.length > 0 && (
            <div className="text-xs text-red-400/80">
              {t('minCharsPost', { count: content.trim().length })}
            </div>
          )}
          <Button variant="gold" fullWidth loading={loading} disabled={!canSubmit} onClick={handleSubmit}>
            {t('postBtn')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {hasDraft && (
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-gold/10 border border-gold/20">
            <span className="text-xs text-gold font-bold">{t('draftFound')}</span>
            <div className="flex gap-2">
              <button onClick={restoreDraft} aria-label={t('draftRestore')} className="text-xs font-bold text-gold hover:text-gold/80 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none rounded transition-colors">{t('draftRestore')}</button>
              <button onClick={dismissDraft} aria-label={t('draftDiscard')} className="text-xs text-white/40 hover:text-white/60 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none rounded transition-colors">{t('draftDiscard')}</button>
            </div>
          </div>
        )}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('categoryLabel')}</label>
          <div className="flex gap-1.5 flex-wrap">
            {POST_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
                  category === cat.id
                    ? cat.color
                    : 'text-white/50 bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Post Type */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('typeLabel')}</label>
          <div className="flex gap-1.5">
            {POST_TYPE_IDS.map(ptId => (
              <button
                key={ptId}
                type="button"
                onClick={() => setPostType(ptId)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors border text-center',
                  postType === ptId
                    ? ptId === 'transfer_rumor' ? 'bg-red-500/15 text-red-300 border-red-500/20' : 'bg-gold/15 text-gold border-gold/25'
                    : 'text-white/50 bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                {ptId === 'general' ? t('typeGeneral') : ptId === 'player_take' ? t('typePlayerTake') : t('typeRumor')}
              </button>
            ))}
          </div>
        </div>

        <div className="relative" ref={playerRef}>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('playerOptional')}</label>
          <input
            type="text"
            value={playerSearch}
            onChange={(e) => { setPlayerSearch(e.target.value); setPlayerDropdownOpen(true); }}
            onFocus={() => setPlayerDropdownOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') setPlayerDropdownOpen(false); }}
            placeholder={playerId ? players.find(p => p.id === playerId)?.name ?? t('searchPlayer') : t('searchPlayer')}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40',
              playerId && !playerSearch && 'text-white/70'
            )}
          />
          {playerId && (
            <button
              type="button"
              onClick={() => { setPlayerId(''); setPlayerSearch(''); }}
              aria-label={t('removePlayer')}
              className="absolute right-3 top-[34px] text-white/30 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
          {playerDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-surface-popover/90 backdrop-blur-sm border border-white/[0.12] shadow-card-md">
              <button
                type="button"
                onClick={() => { setPlayerId(''); setPlayerSearch(''); setPlayerDropdownOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-white/50 hover:bg-white/5"
              >
                {t('noPlayer')}
              </button>
              {players
                .filter(p => !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase()))
                .slice(0, 20)
                .map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPlayerId(p.id); setPlayerSearch(p.name); setPlayerDropdownOpen(false); }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center justify-between',
                      playerId === p.id ? 'text-gold' : 'text-white/80'
                    )}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-white/30">{p.pos}</span>
                  </button>
                ))}
              {players.filter(p => !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase())).length === 0 && (
                <div className="px-4 py-2 text-sm text-white/30">{t('noPlayerFound')}</div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
            <span>{t('messageLabel')}</span>
            <span className={cn('font-mono', content.length > 400 ? 'text-amber-400' : 'text-white/30')}>{content.length}/500</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            rows={4}
            placeholder={t('messagePlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 resize-none"
          />
        </div>

        {/* Image Upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          {imageLoading ? (
            <div className="flex items-center gap-2 px-3 py-4 rounded-xl bg-white/5 border border-white/10">
              <Loader2 className="size-4 animate-spin text-white/40" />
              <span className="text-xs text-white/40">{t('imageLoading')}</span>
            </div>
          ) : imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10">
              <img src={imagePreview} alt="" className="w-full max-h-48 object-cover" />
              <button
                type="button"
                onClick={removeImage}
                aria-label={t('removeImage')}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white/70 hover:text-white transition-colors"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={t('addImage')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none transition-colors"
            >
              <Camera className="size-4" aria-hidden="true" />
              {t('addImage')}
            </button>
          )}
          {imageError && <div className="text-xs text-red-400/80 mt-1">{imageError}</div>}
          <div className="text-[10px] text-white/30 mt-1">{t('imageHint')}</div>
        </div>

        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">{t('tagsLabel')}</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder={t('tagsPlaceholder')}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40"
          />
        </div>

      </div>
    </Modal>
  );
}
