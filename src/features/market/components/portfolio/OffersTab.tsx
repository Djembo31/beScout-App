'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Inbox, Send, Globe, Clock,
  Check, X, RotateCcw, MessageSquare,
  Search, Plus, Loader2,
} from 'lucide-react';
import { Card, Button, Modal } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { PlayerIdentity } from '@/components/player';
import { useToast } from '@/components/providers/ToastProvider';
import { centsToBsd } from '@/lib/services/players';
import { createOffer } from '@/lib/services/offers';
import { useOffersState, type SubTab } from './useOffersState';
import type { OfferWithDetails, Player } from '@/types';
import dynamic from 'next/dynamic';
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), { ssr: false });

// ============================================
// Status Badge
// ============================================

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('offers');

  const styles: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    accepted: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    countered: 'bg-blue-500/20 text-blue-400',
    expired: 'bg-white/10 text-white/40',
    cancelled: 'bg-white/10 text-white/40',
  };

  const labels: Record<string, string> = {
    pending: t('statusPending'),
    accepted: t('statusAccepted'),
    rejected: t('statusRejected'),
    countered: t('statusCountered'),
    expired: t('statusExpired'),
    cancelled: t('statusCancelled'),
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
  offer, userId, onAccept, onReject, onCounter, onCancel, actionId,
}: {
  offer: OfferWithDetails;
  userId: string;
  onAccept?: () => void;
  onReject?: () => void;
  onCounter?: () => void;
  onCancel?: () => void;
  actionId?: string | null;
}) {
  const t = useTranslations('offers');
  const isIncoming = offer.receiver_id === userId || (offer.receiver_id === null && offer.sender_id !== userId);
  const isSender = offer.sender_id === userId;
  const expiresAt = new Date(offer.expires_at);
  const isExpired = expiresAt < new Date();
  const timeLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <PlayerIdentity
              player={{ first: offer.player_first_name, last: offer.player_last_name, pos: offer.player_position, status: 'fit', club: offer.player_club, ticket: 0, age: 0 }}
              size="sm"
              showMeta={false}
              showStatus={false}
            />
          </div>

          <div className="flex items-center gap-3 text-sm mb-2">
            <span className={offer.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
              {offer.side === 'buy' ? t('buyOffer') : t('sellOffer')}
            </span>
            <span className="text-white/30">&bull;</span>
            <span className="font-mono font-bold tabular-nums text-gold">
              {fmtScout(centsToBsd(offer.price))} CR
            </span>
            <span className="text-white/30">&bull;</span>
            <span className="text-white/60 tabular-nums">{offer.quantity}x</span>
          </div>

          {isIncoming && offer.status === 'pending' && !isExpired && (() => {
            const total = offer.price * offer.quantity;
            const fee = Math.floor(total * 300 / 10000);
            const proceeds = total - fee;
            return (
              <div className="flex items-center gap-2 text-[11px] text-white/35 mb-1">
                <span>3% Gebuehr: <span className="font-mono tabular-nums text-red-400/70">{fmtScout(centsToBsd(fee))}</span></span>
                <span>&bull;</span>
                <span>{offer.side === 'buy' ? 'Erloes' : 'Verkaeufer erhaelt'}: <span className="font-mono tabular-nums text-green-400/70">{fmtScout(centsToBsd(proceeds))}</span></span>
              </div>
            );
          })()}

          <div className="flex items-center gap-2 text-xs text-white/40">
            {isSender ? (
              <span>{t('offerTo', { receiver: offer.receiver_handle ?? t('openAllOwners') })}</span>
            ) : (
              <span>{t('offerFrom', { sender: offer.sender_handle })}</span>
            )}
            {!isExpired && offer.status === 'pending' && (
              <>
                <span>&bull;</span>
                <span>{t('timeRemaining', { hours: timeLeft })}</span>
              </>
            )}
          </div>

          {offer.message && (
            <div className="mt-2 text-xs text-white/50 italic bg-white/5 rounded-lg p-2">
              &ldquo;{offer.message}&rdquo;
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={isExpired && offer.status === 'pending' ? 'expired' : offer.status} />

          {offer.status === 'pending' && !isExpired && (
            <div className="flex gap-1.5">
              {isIncoming && onAccept && (
                <button
                  onClick={onAccept}
                  disabled={actionId === offer.id}
                  className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  aria-label={t('statusAccepted')}
                >
                  {actionId === offer.id ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                </button>
              )}
              {isIncoming && onCounter && (
                <button
                  onClick={onCounter}
                  disabled={actionId === offer.id}
                  className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                  aria-label={t('counterOffer')}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                </button>
              )}
              {(isIncoming && onReject) && (
                <button
                  onClick={onReject}
                  disabled={actionId === offer.id}
                  className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  aria-label={t('statusRejected')}
                >
                  {actionId === offer.id ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                </button>
              )}
              {isSender && onCancel && (
                <button
                  onClick={onCancel}
                  disabled={actionId === offer.id}
                  className="p-1.5 rounded-lg bg-white/10 text-white/40 hover:bg-white/20 transition-colors disabled:opacity-50"
                  aria-label={t('statusCancelled')}
                >
                  {actionId === offer.id ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
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
  const t = useTranslations('offers');
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
    if (priceCents <= 0) { addToast(t('invalidPrice'), 'error'); return; }

    setLoading(true);
    try {
      let receiverId: string | undefined;
      if (receiverHandle.trim()) {
        const { getProfileByHandle } = await import('@/lib/services/profiles');
        const profile = await getProfileByHandle(receiverHandle.trim().replace('@', ''));
        if (!profile) { addToast(t('userNotFound'), 'error'); setLoading(false); return; }
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
        addToast(t('offerCreated'), 'success');
        onClose();
        setSelectedPlayer(null);
        setPrice('');
        setReceiverHandle('');
        setMessage('');
      } else {
        addToast(result.error ?? t('error'), 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('newOffer')}>
      <div className="space-y-4">
        {!selectedPlayer ? (
          <div>
            <label htmlFor="offer-player-search" className="text-sm text-white/60 mb-1 block">{t('searchPlayer')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" aria-hidden="true" />
              <input
                id="offer-player-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('searchPlayerPlaceholder')}
                className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/30"
              />
            </div>
            {filteredPlayers.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {filteredPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPlayer(p); setSearch(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-colors"
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
            <button onClick={() => setSelectedPlayer(null)} aria-label={t('statusCancelled')} className="ml-auto text-white/40 hover:text-white transition-colors">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div>
          <label className="text-sm text-white/60 mb-1 block">{t('offerType')}</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSide('buy')}
              className={cn(
                'flex-1 py-2 rounded-xl text-sm font-medium transition-colors border',
                side === 'buy' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-white/5 text-white/40 border-white/10'
              )}
            >
              {t('buy')}
            </button>
            <button
              onClick={() => setSide('sell')}
              className={cn(
                'flex-1 py-2 rounded-xl text-sm font-medium transition-colors border',
                side === 'sell' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-white/40 border-white/10'
              )}
            >
              {t('sell')}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="offer-price" className="text-sm text-white/60 mb-1 block">{t('priceLabel')}</label>
          <input
            id="offer-price"
            type="number" inputMode="numeric"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder={t('pricePlaceholder')}
            min="1"
            step="1"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-base text-white placeholder:text-white/30 focus:outline-none focus:border-gold/30 font-mono tabular-nums"
          />
        </div>

        <div>
          <label htmlFor="offer-receiver" className="text-sm text-white/60 mb-1 block">{t('receiverLabel')}</label>
          <input
            id="offer-receiver"
            type="text"
            value={receiverHandle}
            onChange={e => setReceiverHandle(e.target.value)}
            placeholder="@username"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/30"
          />
        </div>

        <div>
          <label htmlFor="offer-message" className="text-sm text-white/60 mb-1 block">{t('messageLabel')}</label>
          <input
            id="offer-message"
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t('messagePlaceholder')}
            maxLength={200}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/30"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedPlayer || !price || loading}
          className="w-full"
        >
          {loading ? t('creating') : t('createOffer')}
        </Button>
      </div>
    </Modal>
  );
}

// ============================================
// Main Component
// ============================================

export default function ManagerOffersTab({ players }: { players: Player[] }) {
  const t = useTranslations('offers');
  const state = useOffersState();

  const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: 'incoming', label: t('tabIncoming'), icon: Inbox },
    { id: 'outgoing', label: t('tabOutgoing'), icon: Send },
    { id: 'open', label: t('tabOpenBids'), icon: Globe },
    { id: 'history', label: t('tabHistory'), icon: Clock },
  ];

  const EMPTY_STATES: Record<SubTab, { title: string; desc: string }> = {
    incoming: { title: t('noIncoming'), desc: t('noIncomingDesc') },
    outgoing: { title: t('noOutgoing'), desc: t('noOutgoingDesc') },
    open: { title: t('noOpenBids'), desc: t('noOpenBidsDesc') },
    history: { title: t('noHistory'), desc: t('noHistoryDesc') },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-balance text-white">{t('offersTitle')}</h2>
        <Button onClick={() => state.setShowCreate(true)} className="gap-2">
          <Plus aria-hidden="true" className="size-4" /> {t('newOffer')}
        </Button>
      </div>

      <div className="flex gap-1 bg-surface-minimal rounded-xl p-1 border border-white/[0.06]">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => state.setSubTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                state.subTab === tab.id
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              <Icon aria-hidden="true" className="size-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <SponsorBanner placement="market_offers" className="mb-3" />

      {state.loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-white/[0.02] animate-pulse motion-reduce:animate-none border border-white/[0.06]" />
          ))}
        </div>
      ) : state.offers.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare aria-hidden="true" className="size-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 text-pretty mb-2">
            {EMPTY_STATES[state.subTab].title}
          </div>
          <div className="text-sm text-pretty text-white/50">
            {EMPTY_STATES[state.subTab].desc}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {state.offers.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              userId={state.uid!}
              actionId={state.actionId}
              onAccept={state.subTab === 'incoming' || state.subTab === 'open' ? () => state.handleAccept(offer.id) : undefined}
              onReject={state.subTab === 'incoming' ? () => state.handleReject(offer.id) : undefined}
              onCounter={state.subTab === 'incoming' ? () => state.openCounterModal(offer) : undefined}
              onCancel={state.subTab === 'outgoing' ? () => state.handleCancel(offer.id) : undefined}
            />
          ))}
        </div>
      )}

      {state.uid && (
        <CreateOfferModal
          open={state.showCreate}
          onClose={() => state.setShowCreate(false)}
          players={players}
          userId={state.uid}
        />
      )}

      {state.counterModal && (
        <Modal open={true} onClose={state.closeCounterModal} title={t('counterOffer')}>
          <div className="space-y-4">
            <div className="text-sm text-white/60">
              {t('originalPrice')} <span className="font-mono tabular-nums text-gold">{fmtScout(centsToBsd(state.counterModal.price))} CR</span> — {state.counterModal.player_first_name} {state.counterModal.player_last_name}
            </div>
            <div>
              <label htmlFor="counter-price" className="text-sm text-white/60 mb-1 block">{t('yourPrice')}</label>
              <input
                id="counter-price"
                type="number" inputMode="numeric"
                value={state.counterPrice}
                onChange={e => state.setCounterPrice(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-base text-white font-mono tabular-nums focus:outline-none focus:border-gold/30"
              />
            </div>
            <Button onClick={state.handleCounter} disabled={state.countering} className="w-full">
              {state.countering ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> {t('sending')}</> : t('sendCounter')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
