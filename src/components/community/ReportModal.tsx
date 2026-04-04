'use client';

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Modal, Button } from '@/components/ui';
import { reportContent } from '@/lib/services/contentReports';
import { useToast } from '@/components/providers/ToastProvider';
import type { ReportTargetType } from '@/types';

const REPORT_REASONS = [
  { key: 'spam_content', labelKey: 'reportReasonSpam' },
  { key: 'harassment_bullying', labelKey: 'reportReasonHarassment' },
  { key: 'misinformation', labelKey: 'reportReasonMisinfo' },
  { key: 'inappropriate_content', labelKey: 'reportReasonInappropriate' },
  { key: 'other', labelKey: 'reportReasonOther' },
] as const;

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}

export default function ReportModal({ open, onClose, targetType, targetId }: ReportModalProps) {
  const t = useTranslations('community');
  const { addToast } = useToast();
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reason = selectedReason === 'other' ? customReason : selectedReason;
  const canSubmit = reason.length >= 5 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await reportContent(targetType, targetId, reason);
      if (result.success) {
        addToast(t('reportSubmitted'), 'success');
        onClose();
        setSelectedReason('');
        setCustomReason('');
      } else {
        addToast(result.error ?? t('reportError'), 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('reportError'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={t('reportTitle')}
      onClose={onClose}
      size="sm"
      footer={
        <Button
          variant="gold"
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
          {t('reportSubmitBtn')}
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-white/50">{t('reportDescription')}</p>
        <div className="space-y-2">
          {REPORT_REASONS.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setSelectedReason(key)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors min-h-[44px] ${
                selectedReason === key
                  ? 'bg-gold/10 border border-gold/20 text-white'
                  : 'bg-surface-minimal border border-divider text-white/60 hover:bg-surface-subtle'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        {selectedReason === 'other' && (
          <textarea
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value.slice(0, 500))}
            placeholder={t('reportCustomPlaceholder')}
            className="w-full h-20 p-3 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 resize-none"
          />
        )}
      </div>
    </Modal>
  );
}
