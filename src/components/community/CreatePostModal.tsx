'use client';

import React, { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { POST_CATEGORIES } from '@/components/community/PostCard';
import type { Pos } from '@/types';

// ============================================
// TYPES
// ============================================

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  players: { id: string; name: string; pos: Pos }[];
  onSubmit: (playerId: string | null, content: string, tags: string[], category: string) => void;
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

  const handleSubmit = () => {
    if (!content.trim()) return;
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    onSubmit(playerId || null, content.trim(), tags, category);
    setContent('');
    setPlayerId('');
    setTagInput('');
    setCategory('Meinung');
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

        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Spieler (optional)</label>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white appearance-none focus:outline-none focus:border-[#FFD700]/40"
          >
            <option value="">Kein Spieler</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.pos})</option>
            ))}
          </select>
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

        <Button variant="gold" fullWidth loading={loading} onClick={handleSubmit}>
          Posten
        </Button>
      </div>
    </Modal>
  );
}
