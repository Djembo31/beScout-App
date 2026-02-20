'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox, Send, Globe, Clock,
  Check, X, RotateCcw, MessageSquare,
  ArrowRight, Search, Plus,
} from 'lucide-react';
import { Card, Button, Modal } from '@/components/ui';
import { PlayerIdentity } from '@/components/player';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import {
  getIncomingOffers, getOutgoingOffers, getOpenBids, getOfferHistory,
  acceptOffer, rejectOffer, counterOffer, cancelOffer, createOffer,
} from '@/lib/services/offers';
import { fmtBSD } from '@/types';
import { centsToBsd } from '@/lib/services/players';
import type { OfferWithDetails, Pos, Player } from '@/types';
import SponsorBanner from '@/components/player/detail/SponsorBanner';

// ============================================
// Sub-Tab Config
// ============================================

type SubTab = 'incoming' | 'outgoing' | 'open' | 'history';

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'incoming', label: 'Eingehend', icon: Inbox },
  { id: 'outgoing', label: 'Ausgehend', icon: Send },
  { id: 'open', label: 'Offene Gebote', icon: Globe },
  { id: 'history', label: 'Verlauf', icon: Clock },
];

// ============================================
// Status Badge
// ============================================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    accepted: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    countered: 'bg-blue-500/20 text-blue-400',
    expired: 'bg-white/10 text-white/40',
    cancelled: 'bg-white/10 text-white/40',
  };
  const labels: Record<string, string> = {
    pending: 'Ausstehend',
    accepted: 'Angenommen',
    rejected: 'Abgelehnt',
    countered: 'Gegenangebot',
    expired: 'Abgelaufen',
    cancelled: 'Zurückgezogen',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[status] ?? 'bg-white/10 text-white/40'}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ============================================
// Offer Card
// ============================================

function OfferCard({
  offer, userId, onAccept, onReject, onCounter, onCancel,
}: {
  offer: OfferWithDetails;
  userId: string;
  onAccept?: () => void;
  onReject?: () => void;
  onCounter?: () => void;
  onCancel?: () => void;
}) {
  const isIncoming = offer.receiver_id === userId || (offer.receiver_id === null && offer.sender_id !== userId);
  const isSender = offer.sender_id === userId;
  const expiresAt = new Date(offer.expires_at);
  const isExpired = expiresAt < new Date();
  const timeLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Player */}
          <div className="mb-2">
            <PlayerIdentity
              player={{ first: offer.player_first_name, last: offer.player_last_name, pos: offer.player_position, status: 'fit', club: offer.player_club, ticket: 0, age: 0 }}
              size="sm"
              showMeta={false}
              showStatus={false}
            />
          </div>

          {/* Offer details */}
          <div className="flex items-center gap-3 text-sm mb-2">
            <span className={offer.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
              {offer.side === 'buy' ? 'Kaufangebot' : 'Verkaufsangebot'}
            </span>
            <span className="text-white/30">•</span>
            <span className="font-mono font-bold text-[#FFD700]">
              {fmtBSD(centsToBsd(offer.price))} BSD
            </span>
            <span className="text-white/30">•</span>
            <span className="text-white/60">{offer.quantity}x</span>
          </div>

          {/* Sender/Receiver */}
          <div className="flex items-center gap-2 text-xs text-white/40">
            {isSender ? (
              <span>An: {offer.receiver_handle ?? 'Offen (alle Besitzer)'}</span>
            ) : (
              <span>Von: @{offer.sender_handle}</span>
            )}
            {!isExpired && offer.status === 'pending' && (
              <>
                <span>•</span>
                <span>{timeLeft}h verbleibend</span>
              </>
            )}
          </div>

          {/* Message */}
          {offer.message && (
            <div className="mt-2 text-xs text-white/50 italic bg-white/5 rounded-lg p-2">
              &ldquo;{offer.message}&rdquo;
            </div>
          )}
        </div>

        {/* Status + Actions */}
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={isExpired && offer.status === 'pending' ? 'expired' : offer.status} />

          {offer.status === 'pending' && !isExpired && (
            <div className="flex gap-1.5">
              {isIncoming && onAccept && (
                <button
                  onClick={onAccept}
                  className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                  title="Annehmen"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              {isIncoming && onCounter && (
                <button
                  onClick={onCounter}
                  className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  title="Gegenangebot"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              {(isIncoming && onReject) && (
                <button
                  onClick={onReject}
                  className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  title="Ablehnen"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {isSender && onCancel && (
                <button
                  onClick={onCancel}
                  className="p-1.5 rounded-lg bg-white/10 text-white/40 hover:bg-white/20 transition-colors"
                  title="Zurückziehen"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Create Offer Modal
// ============================================

function CreateOfferModal({
  open, onClose, players, userId,
}: {
  open: boolean;
  onClose: () => void;
  players: Player[];
  userId: string;
}) {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [receiverHandle, setReceiverHandle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredPlayers = search.length >= 2
    ? players.filter(p =>
        `${p.first} ${p.last}`.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSubmit = async () => {
    if (!selectedPlayer || !price) return;
    const priceCents = Math.round(parseFloat(price) * 100);
    if (priceCents <= 0) { addToast('Ungültiger Preis', 'error'); return; }

    setLoading(true);
    try {
      // Resolve receiver handle to user_id
      let receiverId: string | undefined;
      if (receiverHandle.trim()) {
        const { getProfileByHandle } = await import('@/lib/services/profiles');
        const profile = await getProfileByHandle(receiverHandle.trim().replace('@', ''));
        if (!profile) { addToast('Benutzer nicht gefunden', 'error'); setLoading(false); return; }
        receiverId = profile.id;
      }

      const result = await createOffer({
        senderId: userId,
        playerId: selectedPlayer.id,
        receiverId,
        side,
        priceCents,
        quantity: 1,
        message: message.trim() || undefined,
      });

      if (result.success) {
        addToast('Angebot erstellt', 'success');
        onClose();
        setSelectedPlayer(null);
        setPrice('');
        setReceiverHandle('');
        setMessage('');
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Neues Angebot">
      <div className="space-y-4">
        {/* Player Search */}
        {!selectedPlayer ? (
          <div>
            <label className="text-sm text-white/60 mb-1 block">Spieler suchen</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Spieler suchen..."
                className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/30"
              />
            </div>
            {filteredPlayers.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {filteredPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPlayer(p); setSearch(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-left"
                  >
                    <PlayerIdentity
                      player={{ first: p.first, last: p.last, pos: p.pos, status: 'fit', club: p.club, ticket: p.ticket, age: p.age, imageUrl: p.imageUrl }}
                      size="sm" showMeta={false} showStatus={false}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
            <PlayerIdentity
              player={{ first: selectedPlayer.first, last: selectedPlayer.last, pos: selectedPlayer.pos, status: 'fit', club: selectedPlayer.club, ticket: selectedPlayer.ticket, age: selectedPlayer.age, imageUrl: selectedPlayer.imageUrl }}
              size="sm" showMeta={false} showStatus={false}
            />
            <button onClick={() => setSelectedPlayer(null)} className="ml-auto text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Side */}
        <div>
          <label className="text-sm text-white/60 mb-1 block">Art</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSide('buy')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                side === 'buy' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/40 border border-white/10'
              }`}
            >
              Kaufen
            </button>
            <button
              onClick={() => setSide('sell')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                side === 'sell' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-white/40 border border-white/10'
              }`}
            >
              Verkaufen
            </button>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="text-sm text-white/60 mb-1 block">Preis pro DPC (BSD)</label>
          <input
            type="number" inputMode="numeric"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="z.B. 150"
            min="1"
            step="1"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-base text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/30 font-mono"
          />
        </div>

        {/* Receiver (optional) */}
        <div>
          <label className="text-sm text-white/60 mb-1 block">Empfänger (optional, leer = offenes Gebot)</label>
          <input
            type="text"
            value={receiverHandle}
            onChange={e => setReceiverHandle(e.target.value)}
            placeholder="@username"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/30"
          />
        </div>

        {/* Message */}
        <div>
          <label className="text-sm text-white/60 mb-1 block">Nachricht (optional)</label>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="z.B. Interessiert an deinem DPC..."
            maxLength={200}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/30"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedPlayer || !price || loading}
          className="w-full"
        >
          {loading ? 'Wird erstellt...' : 'Angebot erstellen'}
        </Button>
      </div>
    </Modal>
  );
}

// ============================================
// Main Component
// ============================================

export default function ManagerOffersTab({ players }: { players: Player[] }) {
  const { user } = useUser();
  const { addToast } = useToast();
  const [subTab, setSubTab] = useState<SubTab>('incoming');
  const [offers, setOffers] = useState<OfferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [counterModal, setCounterModal] = useState<OfferWithDetails | null>(null);
  const [counterPrice, setCounterPrice] = useState('');

  const uid = user?.id;

  const loadOffers = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      let data: OfferWithDetails[] = [];
      if (subTab === 'incoming') data = await getIncomingOffers(uid);
      else if (subTab === 'outgoing') data = await getOutgoingOffers(uid);
      else if (subTab === 'open') data = await getOpenBids();
      else data = await getOfferHistory(uid);
      setOffers(data);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [uid, subTab]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const handleAccept = async (offerId: string) => {
    if (!uid) return;
    try {
      const result = await acceptOffer(uid, offerId);
      if (result.success) {
        addToast('Angebot angenommen', 'success');
        loadOffers();
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    }
  };

  const handleReject = async (offerId: string) => {
    if (!uid) return;
    try {
      const result = await rejectOffer(uid, offerId);
      if (result.success) {
        addToast('Angebot abgelehnt', 'success');
        loadOffers();
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    }
  };

  const handleCounter = async () => {
    if (!uid || !counterModal || !counterPrice) return;
    const priceCents = Math.round(parseFloat(counterPrice) * 100);
    if (priceCents <= 0) { addToast('Ungültiger Preis', 'error'); return; }
    try {
      const result = await counterOffer(uid, counterModal.id, priceCents);
      if (result.success) {
        addToast('Gegenangebot erstellt', 'success');
        setCounterModal(null);
        setCounterPrice('');
        loadOffers();
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    }
  };

  const handleCancel = async (offerId: string) => {
    if (!uid) return;
    try {
      const result = await cancelOffer(uid, offerId);
      if (result.success) {
        addToast('Angebot zurückgezogen', 'success');
        loadOffers();
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Angebote</h2>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Neues Angebot
        </Button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/[0.06]">
        {SUB_TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                subTab === t.id
                  ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <SponsorBanner placement="market_offers" className="mb-3" />

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-white/[0.02] animate-pulse border border-white/[0.06]" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">
            {subTab === 'incoming' && 'Keine eingehenden Angebote'}
            {subTab === 'outgoing' && 'Keine ausgehenden Angebote'}
            {subTab === 'open' && 'Keine offenen Gebote'}
            {subTab === 'history' && 'Kein Angebotsverlauf'}
          </div>
          <div className="text-sm text-white/50">
            {subTab === 'incoming' && 'Sobald dir jemand ein Angebot macht, siehst du es hier.'}
            {subTab === 'outgoing' && 'Erstelle ein Angebot um zu verhandeln.'}
            {subTab === 'open' && 'Erstelle ein offenes Gebot, das jeder Besitzer annehmen kann.'}
            {subTab === 'history' && 'Abgeschlossene Angebote erscheinen hier.'}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              userId={uid!}
              onAccept={subTab === 'incoming' || subTab === 'open' ? () => handleAccept(offer.id) : undefined}
              onReject={subTab === 'incoming' ? () => handleReject(offer.id) : undefined}
              onCounter={subTab === 'incoming' ? () => { setCounterModal(offer); setCounterPrice(String(centsToBsd(offer.price))); } : undefined}
              onCancel={subTab === 'outgoing' ? () => handleCancel(offer.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {uid && (
        <CreateOfferModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          players={players}
          userId={uid}
        />
      )}

      {/* Counter Modal */}
      {counterModal && (
        <Modal open={true} onClose={() => { setCounterModal(null); setCounterPrice(''); }} title="Gegenangebot">
          <div className="space-y-4">
            <div className="text-sm text-white/60">
              Original: <span className="font-mono text-[#FFD700]">{fmtBSD(centsToBsd(counterModal.price))} BSD</span> für {counterModal.player_first_name} {counterModal.player_last_name}
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1 block">Dein Preis (BSD)</label>
              <input
                type="number" inputMode="numeric"
                value={counterPrice}
                onChange={e => setCounterPrice(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-base text-white font-mono focus:outline-none focus:border-[#FFD700]/30"
              />
            </div>
            <Button onClick={handleCounter} className="w-full">
              Gegenangebot senden
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
