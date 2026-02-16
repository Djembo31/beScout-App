'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { POST_CATEGORIES } from '@/components/community/PostCard';
import type { Pos, PostType } from '@/types';

// ============================================
// TYPES
// ============================================

const POST_TYPES: { id: PostType; label: string; desc: string }[] = [
  { id: 'general', label: 'Allgemein', desc: 'Meinung, Analyse, News' },
  { id: 'player_take', label: 'Spieler-Take', desc: 'Dein Take zu einem Spieler' },
  { id: 'transfer_rumor', label: 'Gerücht', desc: 'Transfergerücht oder Insider-Info' },
];

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  players: { id: string; name: string; pos: Pos }[];
  onSubmit: (playerId: string | null, content: string, tags: string[], category: string, postType: PostType) => void;
  loading: boolean;
}

// ============================================
// CREATE POST MODAL
// ============================================

export default function CreatePostModal({
  open, onClose, players, onSubmit, loading,
}: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState('Meinung');
  const [postType, setPostType] = useState<PostType>('general');
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerDropdownOpen, setPlayerDropdownOpen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (playerRef.current && !playerRef.current.contains(e.target as Node)) {
        setPlayerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canSubmit = content.trim().length >= 10;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    onSubmit(playerId || null, content.trim(), tags, category, postType);
    setContent('');
    setPlayerId('');
    setTagInput('');
    setCategory('Meinung');
    setPostType('general');
    setPlayerSearch('');
  };

  return (
    <Modal open={open} title="Neuer Post" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Kategorie</label>
          <div className="flex gap-1.5 flex-wrap">
            {POST_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                  category === cat.id
                    ? cat.color
                    : 'text-white/50 bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Post Type */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Art</label>
          <div className="flex gap-1.5">
            {POST_TYPES.map(pt => (
              <button
                key={pt.id}
                type="button"
                onClick={() => setPostType(pt.id)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border text-center',
                  postType === pt.id
                    ? pt.id === 'transfer_rumor' ? 'bg-red-500/15 text-red-300 border-red-500/20' : 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/25'
                    : 'text-white/50 bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative" ref={playerRef}>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Spieler (optional)</label>
          <input
            type="text"
            value={playerSearch}
            onChange={(e) => { setPlayerSearch(e.target.value); setPlayerDropdownOpen(true); }}
            onFocus={() => setPlayerDropdownOpen(true)}
            placeholder={playerId ? players.find(p => p.id === playerId)?.name ?? 'Spieler suchen...' : 'Spieler suchen...'}
            className={cn(
              'w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40',
              playerId && !playerSearch && 'text-white/70'
            )}
          />
          {playerId && (
            <button
              type="button"
              onClick={() => { setPlayerId(''); setPlayerSearch(''); }}
              className="absolute right-3 top-[34px] text-white/30 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
          {playerDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-[#1a1a1a] border border-white/10 shadow-xl">
              <button
                type="button"
                onClick={() => { setPlayerId(''); setPlayerSearch(''); setPlayerDropdownOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-white/50 hover:bg-white/5"
              >
                Kein Spieler
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
                      playerId === p.id ? 'text-[#FFD700]' : 'text-white/80'
                    )}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-white/30">{p.pos}</span>
                  </button>
                ))}
              {players.filter(p => !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase())).length === 0 && (
                <div className="px-4 py-2 text-sm text-white/30">Kein Spieler gefunden</div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
            <span>Nachricht</span>
            <span className={cn('font-mono', content.length > 400 ? 'text-amber-400' : 'text-white/30')}>{content.length}/500</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            rows={4}
            placeholder="Was denkst du?"
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Tags (kommagetrennt)</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="z.B. Form, Value, Tactics"
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
          />
        </div>

        {!canSubmit && content.length > 0 && (
          <div className="text-xs text-red-400/80">
            Mindestens 10 Zeichen ({content.trim().length}/10)
          </div>
        )}
        <Button variant="gold" fullWidth loading={loading} disabled={!canSubmit} onClick={handleSubmit}>
          Posten
        </Button>
      </div>
    </Modal>
  );
}
