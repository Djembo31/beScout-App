'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Loader2, ImageIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { getAllSponsors, createSponsor, updateSponsor, deleteSponsor } from '@/lib/services/sponsors';
import type { DbSponsor, SponsorPlacement } from '@/types';

const PLACEMENT_OPTIONS: { value: SponsorPlacement; label: string }[] = [
  { value: 'home_hero', label: 'Home Hero' },
  { value: 'home_mid', label: 'Home Mitte' },
  { value: 'market_top', label: 'Marktplatz' },
  { value: 'club_hero', label: 'Club-Seite' },
  { value: 'player_mid', label: 'Spieler Mitte' },
  { value: 'player_footer', label: 'Spieler Footer' },
  { value: 'event', label: 'Fantasy Event' },
  { value: 'market_transferlist', label: 'Transferliste' },
  { value: 'market_ipo', label: 'IPO-Bereich' },
  { value: 'market_portfolio', label: 'Portfolio' },
  { value: 'market_offers', label: 'Angebote' },
  { value: 'club_community', label: 'Club Community' },
  { value: 'club_players', label: 'Club Spieler' },
  { value: 'fantasy_spieltag', label: 'Spieltag' },
  { value: 'fantasy_pitch', label: 'Fantasy Pitch' },
  { value: 'fantasy_leaderboard', label: 'Fantasy Rangliste' },
  { value: 'fantasy_history', label: 'Fantasy Verlauf' },
  { value: 'profile_hero', label: 'Profil Hero' },
  { value: 'profile_footer', label: 'Profil Footer' },
  { value: 'community_feed', label: 'Community Feed' },
  { value: 'community_research', label: 'Community Research' },
];

const PLACEMENT_COLORS: Record<string, string> = {
  home_hero: 'bg-blue-500/15 text-blue-300 border-blue-400/25',
  home_mid: 'bg-blue-500/10 text-blue-200 border-blue-400/20',
  market_top: 'bg-purple-500/15 text-purple-300 border-purple-400/25',
  club_hero: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
  player_mid: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
  player_footer: 'bg-sky-500/10 text-sky-200 border-sky-400/20',
  event: 'bg-[#FFD700]/15 text-[#FFD700] border-[#FFD700]/25',
  market_transferlist: 'bg-purple-500/10 text-purple-200 border-purple-400/20',
  market_ipo: 'bg-purple-500/12 text-purple-300 border-purple-400/22',
  market_portfolio: 'bg-purple-500/8 text-purple-200 border-purple-400/18',
  market_offers: 'bg-purple-500/10 text-purple-200 border-purple-400/20',
  club_community: 'bg-amber-500/10 text-amber-200 border-amber-400/20',
  club_players: 'bg-amber-500/12 text-amber-300 border-amber-400/22',
  fantasy_spieltag: 'bg-[#FFD700]/10 text-[#FFD700]/80 border-[#FFD700]/20',
  fantasy_pitch: 'bg-[#FFD700]/12 text-[#FFD700]/85 border-[#FFD700]/22',
  fantasy_leaderboard: 'bg-[#FFD700]/8 text-[#FFD700]/75 border-[#FFD700]/18',
  fantasy_history: 'bg-[#FFD700]/10 text-[#FFD700]/80 border-[#FFD700]/20',
  profile_hero: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
  profile_footer: 'bg-emerald-500/10 text-emerald-200 border-emerald-400/20',
  community_feed: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
  community_research: 'bg-rose-500/10 text-rose-200 border-rose-400/20',
};

type FormState = {
  name: string;
  logo_url: string;
  link_url: string;
  placement: SponsorPlacement;
  priority: string;
  starts_at: string;
  ends_at: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  logo_url: '',
  link_url: '',
  placement: 'home_hero',
  priority: '0',
  starts_at: '',
  ends_at: '',
};

export function AdminSponsorsTab({ adminId }: { adminId: string }) {
  const { addToast } = useToast();
  const [sponsors, setSponsors] = useState<DbSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const data = await getAllSponsors();
      setSponsors(data);
    } catch (err) {
      console.error('[AdminSponsors] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (s: DbSponsor) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      logo_url: s.logo_url,
      link_url: s.link_url ?? '',
      placement: s.placement,
      priority: String(s.priority),
      starts_at: s.starts_at ? new Date(s.starts_at).toISOString().slice(0, 16) : '',
      ends_at: s.ends_at ? new Date(s.ends_at).toISOString().slice(0, 16) : '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.logo_url) return;
    setSaving(true);
    try {
      if (editId) {
        const result = await updateSponsor(editId, {
          name: form.name,
          logo_url: form.logo_url,
          link_url: form.link_url || null,
          placement: form.placement,
          priority: parseInt(form.priority) || 0,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        });
        if (!result.success) { addToast(result.error ?? 'Fehler', 'error'); return; }
        addToast('Sponsor aktualisiert', 'success');
      } else {
        const result = await createSponsor({
          name: form.name,
          logo_url: form.logo_url,
          link_url: form.link_url || undefined,
          placement: form.placement,
          priority: parseInt(form.priority) || 0,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          created_by: adminId,
        });
        if (!result.success) { addToast(result.error ?? 'Fehler', 'error'); return; }
        addToast('Sponsor erstellt', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Fehler', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s: DbSponsor) => {
    const result = await updateSponsor(s.id, { is_active: !s.is_active });
    if (result.success) {
      setSponsors(prev => prev.map(sp => sp.id === s.id ? { ...sp, is_active: !sp.is_active } : sp));
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sponsor wirklich löschen?')) return;
    const result = await deleteSponsor(id);
    if (result.success) {
      setSponsors(prev => prev.filter(s => s.id !== id));
      addToast('Sponsor gelöscht', 'success');
    } else {
      addToast(result.error ?? 'Fehler', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black">Sponsoren</h3>
          <p className="text-xs text-white/40">{sponsors.length} Einträge • {sponsors.filter(s => s.is_active).length} aktiv</p>
        </div>
        <Button variant="gold" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Neu
        </Button>
      </div>

      {sponsors.length === 0 ? (
        <Card className="p-8 text-center">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-white/15" />
          <div className="text-sm text-white/30">Keine Sponsoren vorhanden</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {sponsors.map(s => {
            const placementColor = PLACEMENT_COLORS[s.placement] ?? 'bg-white/10 text-white/50';
            const placementLabel = PLACEMENT_OPTIONS.find(p => p.value === s.placement)?.label ?? s.placement;
            return (
              <Card key={s.id} className={`p-3 ${!s.is_active ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-3">
                  <img
                    src={s.logo_url}
                    alt={s.name}
                    className="w-8 h-8 rounded-lg object-contain bg-white/5 p-1 flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{s.name}</div>
                    <div className="text-[10px] text-white/40">
                      Priorität {s.priority} • {s.ends_at ? `bis ${new Date(s.ends_at).toLocaleDateString('de-DE')}` : 'Unbegrenzt'}
                    </div>
                  </div>
                  <Chip className={`${placementColor} border text-[10px] flex-shrink-0`}>{placementLabel}</Chip>
                  <button
                    onClick={() => handleToggle(s)}
                    className="text-white/40 hover:text-white transition-colors"
                    title={s.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {s.is_active ? <ToggleRight className="w-5 h-5 text-[#22C55E]" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => openEdit(s)} className="text-white/40 hover:text-white transition-colors" title="Bearbeiten">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-white/40 hover:text-red-400 transition-colors" title="Löschen">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} title={editId ? 'Sponsor bearbeiten' : 'Neuer Sponsor'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4 p-4 md:p-6">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value.slice(0, 40) }))}
              placeholder="z.B. Nike"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Logo URL</label>
            <input
              type="url"
              value={form.logo_url}
              onChange={(e) => setForm(f => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
            />
            {form.logo_url && (
              <div className="mt-2 flex items-center gap-2">
                <img src={form.logo_url} alt="Preview" className="w-8 h-8 rounded object-contain bg-white/5 p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-xs text-white/30">Vorschau</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Link URL (optional)</label>
            <input
              type="url"
              value={form.link_url}
              onChange={(e) => setForm(f => ({ ...f, link_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 placeholder:text-white/25"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Platzierung</label>
              <select
                value={form.placement}
                onChange={(e) => setForm(f => ({ ...f, placement: e.target.value as SponsorPlacement }))}
                className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/40"
              >
                {PLACEMENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Priorität</label>
              <input
                type="number"
                min="0"
                value={form.priority}
                onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Start</label>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm(f => ({ ...f, starts_at: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 text-white [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Ende (optional)</label>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm(f => ({ ...f, ends_at: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40 text-white [color-scheme:dark]"
              />
            </div>
          </div>
          <Button
            variant="gold"
            fullWidth
            onClick={handleSave}
            disabled={saving || !form.name || !form.logo_url}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Speichere...' : editId ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
