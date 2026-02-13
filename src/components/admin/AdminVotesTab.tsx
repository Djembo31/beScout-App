'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Clock } from 'lucide-react';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { getAllVotes, createVote } from '@/lib/services/votes';
import { formatBsd } from '@/lib/services/wallet';
import type { ClubWithAdmin, DbClubVote } from '@/types';

export default function AdminVotesTab({ club }: { club: ClubWithAdmin }) {
  const { user } = useUser();
  const [votes, setVotes] = useState<DbClubVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [cost, setCost] = useState('5');
  const [days, setDays] = useState('7');
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllVotes(club.id).then(v => { if (!cancelled) setVotes(v); }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [club.id]);

  const handleCreate = useCallback(async () => {
    if (!user || creating) return;
    const validOpts = options.filter(o => o.trim());
    if (!question.trim() || validOpts.length < 2) return;
    setCreating(true);
    setMsg(null);
    try {
      await createVote({
        userId: user.id,
        clubId: club.id,
        clubName: club.name,
        question: question.trim(),
        options: validOpts.map(o => o.trim()),
        costCents: Math.round(parseFloat(cost || '0') * 100),
        durationDays: parseInt(days || '7'),
      });
      setModalOpen(false);
      setQuestion('');
      setOptions(['', '']);
      const updated = await getAllVotes(club.id);
      setVotes(updated);
      setMsg({ type: 'success', text: 'Abstimmung erstellt!' });
    } catch (err) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Fehler' });
    } finally {
      setCreating(false);
    }
  }, [user, creating, question, options, cost, days, club]);

  const active = votes.filter(v => v.status === 'active');
  const ended = votes.filter(v => v.status !== 'active');

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-bold ${msg.type === 'success' ? 'bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E]' : 'bg-red-500/20 border border-red-500/30 text-red-300'}`}>{msg.text}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Abstimmungen</h2>
          <p className="text-xs text-white/50">{active.length} aktiv • {ended.length} beendet</p>
        </div>
        <Button variant="gold" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Neue Abstimmung
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-24 animate-pulse" />)}</div>
      ) : votes.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-white/30 font-bold">Keine Abstimmungen</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {votes.map(vote => {
            const isActive = vote.status === 'active' && new Date(vote.ends_at) > new Date();
            const diffMs = new Date(vote.ends_at).getTime() - Date.now();
            const d = Math.floor(diffMs / 86400000);
            const h = Math.floor((diffMs % 86400000) / 3600000);
            return (
              <Card key={vote.id} className={`p-4 ${!isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="font-bold line-clamp-2 flex-1">{vote.question}</div>
                  <Chip className={isActive ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/25' : 'bg-white/5 text-white/50 border-white/10'}>{isActive ? 'Aktiv' : 'Beendet'}</Chip>
                </div>
                <div className="space-y-1.5 mb-3">
                  {(vote.options as { label: string; votes: number }[]).map((opt, idx) => {
                    const pct = vote.total_votes > 0 ? Math.round((opt.votes / vote.total_votes) * 100) : 0;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-white/70">{opt.label}</span>
                          <span className="font-mono">{pct}% ({opt.votes})</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500/50 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span><Users className="w-3 h-3 inline mr-1" />{vote.total_votes} Stimmen</span>
                  <span><Clock className="w-3 h-3 inline mr-1" />{diffMs > 0 ? `${d}d ${h}h` : 'Beendet'}</span>
                  {vote.cost_bsd > 0 && <span>{formatBsd(vote.cost_bsd)} BSD/Stimme</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} title="Neue Abstimmung" onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 font-semibold mb-1.5 block">Frage</label>
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 200))} placeholder="z.B. Welches Trikot-Design bevorzugt ihr?" className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40" />
          </div>
          {options.map((opt, idx) => (
            <div key={idx}>
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">Option {idx + 1}</label>
              <input type="text" value={opt} onChange={(e) => { const n = [...options]; n[idx] = e.target.value.slice(0, 100); setOptions(n); }} placeholder={`Option ${idx + 1}`} className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/40" />
            </div>
          ))}
          {options.length < 4 && (
            <Button variant="outline" size="sm" onClick={() => setOptions([...options, ''])}><Plus className="w-3.5 h-3.5" />Option hinzufügen</Button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">Kosten (BSD)</label>
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFD700]/40" />
            </div>
            <div>
              <label className="text-xs text-white/50 font-semibold mb-1.5 block">Laufzeit (Tage)</label>
              <input type="number" value={days} onChange={(e) => setDays(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#FFD700]/40" />
            </div>
          </div>
          <Button variant="gold" fullWidth loading={creating} onClick={handleCreate}>Abstimmung erstellen</Button>
        </div>
      </Modal>
    </div>
  );
}
