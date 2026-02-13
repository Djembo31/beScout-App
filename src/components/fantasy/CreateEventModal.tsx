'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { FantasyEvent, EventMode, LineupFormat } from './types';

export const CreateEventModal = ({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (event: Partial<FantasyEvent>) => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<EventMode>('tournament');
  const [format, setFormat] = useState<LineupFormat>('6er');
  const [buyIn, setBuyIn] = useState(5);
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) {
      alert('Bitte gib einen Event-Namen ein');
      return;
    }
    onCreate({
      name,
      description,
      mode,
      format,
      buyIn,
      maxParticipants,
      type: 'creator',
      status: 'registering',
      creatorName: 'Du',
      creatorId: 'user1',
    });
    onClose();
    setName('');
    setDescription('');
  };

  const creatorFee = Math.round(buyIn * maxParticipants * 0.05);
  const prizePool = buyIn * maxParticipants - creatorFee;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Community Event erstellen</h2>
            <p className="text-sm text-white/50">Erstelle dein eigenes Fantasy-Event</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-2">Event-Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Meine Private Liga"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FFD700]/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibe dein Event..."
              rows={3}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FFD700]/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Modus</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as EventMode)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FFD700]/40"
              >
                <option value="tournament">Turnier</option>
                <option value="league">Liga</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as LineupFormat)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FFD700]/40"
              >
                <option value="6er">6er Lineup</option>
                <option value="11er">11er Lineup</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Buy-in (BSD)</label>
              <input
                type="number"
                value={buyIn}
                onChange={(e) => setBuyIn(Number(e.target.value))}
                min={0}
                max={100}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max. Teilnehmer</label>
              <input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                min={2}
                max={500}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg">
            <div>
              <div className="font-medium">Privates Event</div>
              <div className="text-xs text-white/50">Nur mit Einladungslink beitreten</div>
            </div>
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-12 h-6 rounded-full transition-all ${isPrivate ? 'bg-[#FFD700]' : 'bg-white/20'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all ${isPrivate ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="p-4 bg-[#22C55E]/10 rounded-lg border border-[#22C55E]/20">
            <div className="text-sm text-white/60 mb-2">Vorschau</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-mono font-bold text-lg text-[#FFD700]">{buyIn} BSD</div>
                <div className="text-[10px] text-white/40">Buy-in</div>
              </div>
              <div>
                <div className="font-mono font-bold text-lg text-purple-400">{prizePool} BSD</div>
                <div className="text-[10px] text-white/40">Preisgeld</div>
              </div>
              <div>
                <div className="font-mono font-bold text-lg text-white/60">{creatorFee} BSD</div>
                <div className="text-[10px] text-white/40">Deine Fee (5%)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex items-center gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Abbrechen
          </Button>
          <Button variant="gold" onClick={handleCreate} className="flex-1">
            <Plus className="w-4 h-4" />
            Event erstellen
          </Button>
        </div>
      </div>
    </>
  );
};
