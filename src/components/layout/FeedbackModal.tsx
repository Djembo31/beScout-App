'use client';

import React, { useState } from 'react';
import { Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Modal, Button } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { submitFeedback } from '@/lib/services/feedback';
import type { FeedbackType } from '@/types';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  pageUrl: string;
}

const TYPE_OPTIONS: { value: FeedbackType; labelKey: string; icon: React.ReactNode }[] = [
  { value: 'bug', labelKey: 'typeBug', icon: <Bug className="size-4" /> },
  { value: 'feature', labelKey: 'typeFeature', icon: <Lightbulb className="size-4" /> },
  { value: 'sonstiges', labelKey: 'typeOther', icon: <HelpCircle className="size-4" /> },
];

const PLACEHOLDER_KEYS: Record<FeedbackType, string> = {
  bug: 'placeholderBug',
  feature: 'placeholderFeature',
  sonstiges: 'placeholderOther',
};

export function FeedbackModal({ open, onClose, pageUrl }: FeedbackModalProps) {
  const tf = useTranslations('feedback');
  const { user } = useUser();
  const { addToast } = useToast();
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const charCount = message.length;
  const isValid = charCount >= 10 && charCount <= 2000;

  async function handleSubmit() {
    if (!user || !isValid) return;
    setLoading(true);
    try {
      await submitFeedback(user.id, type, message, pageUrl);
      addToast(tf('successToast'), 'success');
      setMessage('');
      setType('bug');
      onClose();
    } catch {
      addToast(tf('errorToast'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={tf('title')}
      onClose={onClose}
      footer={
        <Button
          variant="gold"
          fullWidth
          loading={loading}
          disabled={!isValid}
          onClick={handleSubmit}
        >
          {tf('submitBtn')}
        </Button>
      }
    >
      {/* Type pills */}
      <div className="flex gap-2 mb-4">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setType(opt.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors border',
              type === opt.value
                ? 'bg-gold/15 border-gold/40 text-gold'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            )}
          >
            {opt.icon}
            <span className="hidden sm:inline">{tf(opt.labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={tf(PLACEHOLDER_KEYS[type])}
        aria-label={tf('messageLabel')}
        maxLength={2000}
        rows={5}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 resize-none"
      />

      {/* Char count + page info */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <span className="text-[11px] text-white/40 truncate max-w-[60%]">
          {pageUrl}
        </span>
        <span className={cn('text-xs font-mono tabular-nums', charCount > 0 && charCount < 10 ? 'text-red-400' : 'text-white/40')}>
          {charCount}/2.000
        </span>
      </div>

    </Modal>
  );
}
