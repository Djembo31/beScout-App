'use client';

import React, { useState } from 'react';
import { Bug, Lightbulb, HelpCircle } from 'lucide-react';
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

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: React.ReactNode }[] = [
  { value: 'bug', label: 'Bug melden', icon: <Bug className="w-4 h-4" /> },
  { value: 'feature', label: 'Feature-Wunsch', icon: <Lightbulb className="w-4 h-4" /> },
  { value: 'sonstiges', label: 'Sonstiges', icon: <HelpCircle className="w-4 h-4" /> },
];

const PLACEHOLDERS: Record<FeedbackType, string> = {
  bug: 'Beschreibe den Bug — was hast du erwartet, was ist passiert?',
  feature: 'Welches Feature wünschst du dir und warum?',
  sonstiges: 'Was möchtest du uns mitteilen?',
};

export function FeedbackModal({ open, onClose, pageUrl }: FeedbackModalProps) {
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
      addToast('Danke für dein Feedback!', 'success');
      setMessage('');
      setType('bug');
      onClose();
    } catch {
      addToast('Feedback konnte nicht gesendet werden.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Feedback senden"
      onClose={onClose}
      footer={
        <Button
          variant="gold"
          fullWidth
          loading={loading}
          disabled={!isValid}
          onClick={handleSubmit}
        >
          Feedback senden
        </Button>
      }
    >
      {/* Type pills */}
      <div className="flex gap-2 mb-4">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setType(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all border ${
              type === opt.value
                ? 'bg-[#FFD700]/15 border-[#FFD700]/40 text-[#FFD700]'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={PLACEHOLDERS[type]}
        maxLength={2000}
        rows={5}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
      />

      {/* Char count + page info */}
      <div className="flex items-center justify-between mt-2 mb-4">
        <span className="text-[11px] text-white/40 truncate max-w-[60%]">
          Seite: {pageUrl}
        </span>
        <span className={`text-xs font-mono ${charCount > 0 && charCount < 10 ? 'text-red-400' : 'text-white/40'}`}>
          {charCount}/2.000
        </span>
      </div>

    </Modal>
  );
}
