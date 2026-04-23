'use client';

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Modal, Button } from '@/components/ui';
import { reportContent } from '@/lib/services/contentReports';
import { useToast } from '@/components/providers/ToastProvider';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
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
  const tErrors = useTranslations('errors');
  const { addToast } = useToast();
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const reason = selectedReason === 'other' ? customReason : selectedReason;

  // Slice 159 Ferrari: useSafeMutation mit synchronem isPending-Guard + errorTag.
  const reportMut = useSafeMutation<
    { success: boolean; error?: string },
    Error,
    { targetType: ReportTargetType; targetId: string; reason: string }
  >({
    mutationFn: async (vars) => {
      const result = await reportContent(vars.targetType, vars.targetId, vars.reason);
      if (!result.success) throw new Error(result.error || 'reportError');
      return result;
    },
    onSuccess: () => {
      addToast(t('reportSubmitted'), 'success');
      onClose();
      setSelectedReason('');
      setCustomReason('');
    },
    onError: (err) => {
      // i18n-Key-Leak-Schutz (Slice 051): err.message ist ggf. Raw-Key
      addToast(tErrors(mapErrorToKey(normalizeError(err))), 'error');
    },
    errorTag: 'community.report',
  });

  const canSubmit = reason.length >= 5 && !reportMut.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    // Ferrari-Blueprint-Konsistenz (156/157/158): safeTrigger statt raw mutate —
    // synchroner isPending-Check im Primitive, keine doppelte Guard-Logik noetig.
    reportMut.safeTrigger({ targetType, targetId, reason });
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
          {reportMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
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
            className="w-full h-20 p-3 rounded-xl text-sm bg-surface-base border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 resize-none"
          />
        )}
      </div>
    </Modal>
  );
}
