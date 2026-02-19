'use client';

import React, { useState } from 'react';
import { Target, Clock, Users, Coins, CheckCircle, Loader2, Lock } from 'lucide-react';
import { Card, Chip, Button, Modal } from '@/components/ui';
import { formatBsd } from '@/lib/services/wallet';
import type { BountyWithCreator } from '@/types';

const TIER_ORDER: Record<string, number> = { bronze: 1, silber: 2, gold: 3 };
const TIER_LABELS: Record<string, string> = { bronze: 'Bronze', silber: 'Silber', gold: 'Gold' };
const TIER_COLORS: Record<string, string> = {
  bronze: 'text-orange-300 bg-orange-500/15 border-orange-500/20',
  silber: 'text-gray-300 bg-white/10 border-white/20',
  gold: 'text-[#FFD700] bg-[#FFD700]/15 border-[#FFD700]/20',
};

interface BountyCardProps {
  bounty: BountyWithCreator;
  userId: string;
  onSubmit: (bountyId: string, title: string, content: string) => void;
  submitting: string | null;
  userTier?: string | null;
}

export default function BountyCard({ bounty, userId, onSubmit, submitting, userTier }: BountyCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const isOpen = bounty.status === 'open' && new Date(bounty.deadline_at) > new Date();
  const isFull = bounty.submission_count >= bounty.max_submissions;
  const hasSubmitted = bounty.has_user_submitted === true;
  const isCreator = bounty.created_by === userId;
  const isTierLocked = bounty.min_tier ? (TIER_ORDER[userTier ?? ''] ?? 0) < (TIER_ORDER[bounty.min_tier] ?? 0) : false;
  const canSubmit = isOpen && !isFull && !hasSubmitted && !isCreator && !isTierLocked;

  const diffMs = new Date(bounty.deadline_at).getTime() - Date.now();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const timeLeft = diffMs > 0 ? `${days}d ${hours}h` : 'Abgelaufen';

  const handleSubmit = () => {
    if (!title.trim() || content.length < 100) return;
    onSubmit(bounty.id, title.trim(), content.trim());
    setModalOpen(false);
    setTitle('');
    setContent('');
  };

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-amber-300">Club-Auftrag</span>
            {bounty.min_tier && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${TIER_COLORS[bounty.min_tier] ?? ''}`}>
                <Lock className="w-2.5 h-2.5" />
                {TIER_LABELS[bounty.min_tier] ?? bounty.min_tier}+
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Clock className="w-3 h-3" />
            <span>{timeLeft}</span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-bold text-lg mb-1">{bounty.title}</h3>
          <p className="text-sm text-white/60 line-clamp-3 mb-3">{bounty.description}</p>

          {bounty.player_name && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 mb-3">
              Spieler: {bounty.player_name}
            </div>
          )}

          {/* Info row */}
          <div className="flex items-center justify-between text-sm mb-4">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-[#FFD700]" />
              <span className="text-[#FFD700] font-bold">{formatBsd(bounty.reward_cents)} BSD</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/50">
              <Users className="w-4 h-4" />
              <span>{bounty.submission_count}/{bounty.max_submissions}</span>
            </div>
          </div>

          {/* Action */}
          {hasSubmitted && (
            <Chip className="bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/25">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Eingereicht
            </Chip>
          )}
          {canSubmit && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => setModalOpen(true)}
              loading={submitting === bounty.id}
            >
              Einreichen
            </Button>
          )}
          {isTierLocked && !hasSubmitted && (
            <Chip className={`${TIER_COLORS[bounty.min_tier ?? 'bronze']}`}>
              <Lock className="w-3 h-3 inline mr-1" />
              {TIER_LABELS[bounty.min_tier ?? ''] ?? 'Abo'}+ erforderlich
            </Chip>
          )}
          {isFull && !hasSubmitted && !isTierLocked && (
            <Chip className="bg-white/5 text-white/40 border-white/10">Voll</Chip>
          )}
          {isCreator && (
            <Chip className="bg-amber-500/15 text-amber-300 border-amber-500/25">Dein Auftrag</Chip>
          )}
        </div>
      </Card>

      {/* Submit Modal */}
      <Modal open={modalOpen} title="Lösung einreichen" onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div className="text-sm text-white/50 mb-2">
            <span className="font-bold text-white">{bounty.title}</span>
            <span className="mx-2">&bull;</span>
            <span className="text-[#FFD700] font-bold">{formatBsd(bounty.reward_cents)} BSD</span>
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="Kurze Zusammenfassung deiner Lösung"
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">Inhalt</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 10000))}
              rows={6}
              placeholder="Beschreibe deine Analyse ausführlich (min. 100 Zeichen)..."
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
            />
            <div className="text-[10px] text-white/30 mt-1">{content.length}/10000 (min. 100)</div>
          </div>
          <Button
            variant="gold"
            fullWidth
            onClick={handleSubmit}
            loading={submitting === bounty.id}
            disabled={!title.trim() || content.length < 100}
          >
            Einreichen
          </Button>
        </div>
      </Modal>
    </>
  );
}
