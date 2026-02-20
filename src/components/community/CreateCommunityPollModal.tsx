'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (params: {
    question: string;
    description: string | null;
    options: string[];
    priceBsd: number;
    durationDays: number;
  }) => void;
  loading: boolean;
};

const DURATIONS: { label: string; days: number }[] = [
  { label: '1 Tag', days: 1 },
  { label: '3 Tage', days: 3 },
  { label: '7 Tage', days: 7 },
];

export default function CreateCommunityPollModal({ open, onClose, onSubmit, loading }: Props) {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [priceBsd, setPriceBsd] = useState(5);
  const [durationDays, setDurationDays] = useState(3);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setQuestion('');
      setDescription('');
      setOptions(['', '']);
      setPriceBsd(5);
      setDurationDays(3);
    }
  }, [open]);

  const addOption = () => {
    if (options.length < 4) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, value: string) => {
    setOptions(options.map((o, i) => i === idx ? value.slice(0, 100) : o));
  };

  const validOptions = options.filter(o => o.trim().length > 0);
  const canSubmit = question.length >= 5 && question.length <= 200 && validOptions.length >= 2 && priceBsd >= 1 && priceBsd <= 10000;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      question: question.trim(),
      description: description.trim() || null,
      options: validOptions.map(o => o.trim()),
      priceBsd,
      durationDays,
    });
  };

  return (
    <Modal open={open} title="Neue Umfrage" onClose={onClose}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Question */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
            <span>Frage</span>
            <span className={cn('font-mono', question.length > 180 ? 'text-amber-400' : 'text-white/30')}>{question.length}/200</span>
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
            placeholder="z.B. Wer sollte Kapitän werden?"
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 flex justify-between">
            <span>Beschreibung (optional)</span>
            <span className={cn('font-mono', description.length > 450 ? 'text-amber-400' : 'text-white/30')}>{description.length}/500</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="Mehr Kontext zur Umfrage..."
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40 resize-none"
          />
        </div>

        {/* Options */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Optionen (2-4)</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(idx)}
                    className="p-2 rounded-lg text-white/30 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 4 && (
            <button
              onClick={addOption}
              className="mt-2 flex items-center gap-1.5 text-xs text-[#FFD700] hover:text-[#FFD700]/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Option hinzufügen
            </button>
          )}
        </div>

        {/* Price */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Preis (BSD)</label>
          <input
            type="number" inputMode="numeric"
            value={priceBsd}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') { setPriceBsd(0); return; }
              const v = parseInt(raw);
              if (!isNaN(v)) setPriceBsd(Math.min(10000, Math.max(1, v)));
            }}
            min={1}
            max={10000}
            className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-[#FFD700]/40"
          />
          <div className="text-[10px] text-white/30 mt-1">70% gehen an dich, 30% Plattform</div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs text-white/50 font-semibold mb-1.5 block">Laufzeit</label>
          <div className="flex gap-1.5">
            {DURATIONS.map(d => (
              <button
                key={d.days}
                onClick={() => setDurationDays(d.days)}
                className={cn(
                  'flex-1 px-2 py-2 rounded-xl text-xs font-bold border transition-all',
                  durationDays === d.days
                    ? 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/25'
                    : 'bg-white/5 text-white/50 border-white/10'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Validation hints */}
        {!canSubmit && (question.length > 0 || validOptions.length > 0) && (
          <div className="text-xs text-red-400/80 space-y-0.5">
            {question.length < 5 && <div>Frage: mind. 5 Zeichen ({question.length}/5)</div>}
            {validOptions.length < 2 && <div>Mind. 2 Optionen erforderlich</div>}
            {(priceBsd < 1 || priceBsd > 10000) && <div>Preis: 1-10.000 BSD</div>}
          </div>
        )}

        <Button variant="gold" fullWidth loading={loading} disabled={!canSubmit} onClick={handleSubmit}>
          Umfrage erstellen
        </Button>
      </div>
    </Modal>
  );
}
