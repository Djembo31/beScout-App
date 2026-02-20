'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Coins, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendTip } from '@/lib/services/tips';
import { logActivity } from '@/lib/services/activityLog';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queries/keys';

const PRESET_AMOUNTS = [
  { label: '10', cents: 1000 },
  { label: '50', cents: 5000 },
  { label: '100', cents: 10000 },
  { label: '500', cents: 50000 },
];

interface TipButtonProps {
  contentType: 'post' | 'research';
  contentId: string;
  authorId: string;
  userId: string;
  tipCount: number;
  tipTotalCents: number;
}

export default function TipButton({
  contentType,
  contentId,
  authorId,
  userId,
  tipCount,
  tipTotalCents,
}: TipButtonProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleSend = async (cents: number) => {
    setSending(true);
    setError(null);
    const result = await sendTip(userId, authorId, contentType, contentId, cents);
    setSending(false);

    if (!result.success) {
      setError(result.error ?? 'Fehler beim Senden');
      return;
    }

    setSuccess(true);
    setOpen(false);
    setTimeout(() => setSuccess(false), 3000);

    // Invalidate tips + wallet + transactions
    qc.invalidateQueries({ queryKey: qk.tips.byContent(contentType, contentId) });
    qc.invalidateQueries({ queryKey: ['holdings'] });
    qc.invalidateQueries({ queryKey: ['transactions'] });

    logActivity(userId, 'tip_send', 'community', {
      content_type: contentType,
      content_id: contentId,
      amount_cents: cents,
    });
  };

  // Don't show tip button on own content
  if (authorId === userId) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setError(null); }}
        className={cn(
          'flex items-center gap-1 transition-colors text-xs',
          success ? 'text-pink-400' : 'text-white/40 hover:text-pink-400'
        )}
        aria-label="Tipp senden"
      >
        <Coins className="w-3 h-3" />
        {tipCount > 0 ? (
          <span>{tipCount} · {fmtScout(centsToBsd(tipTotalCents))} $SCOUT</span>
        ) : (
          <span>Tipp</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 bottom-8 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-20 p-3 min-w-[180px]">
          <div className="text-[10px] text-white/40 mb-2 font-semibold">Scout-Tipp senden</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_AMOUNTS.map(p => (
              <button
                key={p.cents}
                disabled={sending}
                onClick={() => handleSend(p.cents)}
                className="px-3 py-2 rounded-lg text-sm font-mono font-bold bg-white/5 hover:bg-pink-500/15 hover:text-pink-300 text-white/70 transition-colors border border-white/[0.06] hover:border-pink-500/20 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : `${p.label} $SCOUT`}
              </button>
            ))}
          </div>
          {error && (
            <div className="mt-2 text-[10px] text-red-400 bg-red-500/10 rounded-lg px-2 py-1">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
