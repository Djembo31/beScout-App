'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { createClub } from '@/lib/services/platformAdmin';
import { useToast } from '@/components/providers/ToastProvider';

interface CreateClubModalProps {
  open: boolean;
  onClose: () => void;
  adminId: string;
  onCreated: () => void;
}

const PLANS = [
  { value: 'baslangic', label: 'Başlangıç (30 Spieler, 2 Ads)' },
  { value: 'profesyonel', label: 'Profesyonel (50 Spieler, 5 Ads)' },
  { value: 'sampiyon', label: 'Şampiyon (∞ Spieler, 10+ Ads)' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[şŞ]/g, 's')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/[äÄ]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CreateClubModal({ open, onClose, adminId, onCreated }: CreateClubModalProps) {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [short, setShort] = useState('');
  const [league, setLeague] = useState('TFF 1. Lig');
  const [country, setCountry] = useState('Türkei');
  const [city, setCity] = useState('');
  const [plan, setPlan] = useState('baslangic');
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(slugify(val));
    if (!short && val.length >= 3) {
      setShort(val.slice(0, 3).toUpperCase());
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim() || !short.trim() || !league.trim() || !country.trim()) {
      addToast('Bitte fülle alle Pflichtfelder aus.', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await createClub(adminId, {
        name: name.trim(),
        slug: slug.trim(),
        short: short.trim(),
        league: league.trim(),
        country: country.trim(),
        city: city.trim() || undefined,
        plan,
      });
      if (result.success) {
        addToast(`Club "${name}" erstellt!`, 'success');
        onCreated();
        onClose();
        // Reset form
        setName(''); setSlug(''); setShort(''); setCity('');
      } else {
        addToast(result.error ?? 'Club konnte nicht erstellt werden.', 'error');
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Fehler beim Erstellen.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Club erstellen"
      subtitle="Neuen Club auf der Plattform anlegen"
      onClose={onClose}
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Abbrechen</Button>
          <Button variant="gold" onClick={handleSubmit} disabled={loading || !name.trim() || !slug.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : 'Erstellen'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="club-name" className="block text-xs text-white/60 mb-1">Name *</label>
          <input
            id="club-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="z.B. Sakaryaspor"
            className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-gold/50"
          />
        </div>

        {/* Slug + Short */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="club-slug" className="block text-xs text-white/60 mb-1">Slug *</label>
            <input
              id="club-slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="sakaryaspor"
              className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-gold/50 font-mono"
            />
          </div>
          <div>
            <label htmlFor="club-short" className="block text-xs text-white/60 mb-1">Kürzel *</label>
            <input
              id="club-short"
              type="text"
              value={short}
              onChange={(e) => setShort(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="SAK"
              className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-gold/50 font-mono uppercase"
            />
          </div>
        </div>

        {/* League + Country */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="club-league" className="block text-xs text-white/60 mb-1">Liga *</label>
            <input
              id="club-league"
              type="text"
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              placeholder="TFF 1. Lig"
              className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-gold/50"
            />
          </div>
          <div>
            <label htmlFor="club-country" className="block text-xs text-white/60 mb-1">Land *</label>
            <input
              id="club-country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Türkei"
              className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-gold/50"
            />
          </div>
        </div>

        {/* City */}
        <div>
          <label htmlFor="club-city" className="block text-xs text-white/60 mb-1">Stadt</label>
          <input
            id="club-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="z.B. Sakarya"
            className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-gold/50"
          />
        </div>

        {/* Plan */}
        <div>
          <label htmlFor="club-plan" className="block text-xs text-white/60 mb-1">Paket</label>
          <select
            id="club-plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-gold/50"
          >
            {PLANS.map(p => (
              <option key={p.value} value={p.value} className="bg-[#1a1a2e]">{p.label}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
