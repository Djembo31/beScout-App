'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Play, XCircle, Package, Loader2, Shield, Flame, AlertTriangle, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, Button, Chip, Modal } from '@/components/ui';
import { PlayerIdentity } from '@/components/player';
import { centsToBsd } from '@/lib/services/players';
import { fmtScout } from '@/lib/utils';
import { getSuccessFeeTier } from '@/components/player/PlayerRow';
import { useAdminPlayersState } from './useAdminPlayersState';
import type { ClubWithAdmin } from '@/types';

export default function AdminPlayersTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const s = useAdminPlayersState(club, t, te);

  const statusConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
    announced: { bg: 'bg-blue-500/15', border: 'border-blue-400/25', text: 'text-blue-300', label: t('ipoStatusAnnounced') },
    early_access: { bg: 'bg-purple-500/15', border: 'border-purple-400/25', text: 'text-purple-300', label: t('ipoStatusEarlyAccess') },
    open: { bg: 'bg-green-500/15', border: 'border-green-500/25', text: 'text-green-500', label: t('ipoStatusLive') },
    ended: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', label: t('ipoStatusEnded') },
    cancelled: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: t('ipoStatusCancelled') },
  };

  if (s.loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-20 animate-pulse" />)}</div>;

  return (
    <div className="space-y-6">
      {s.ipoSuccess && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-500 px-4 py-3 rounded-xl font-bold text-sm">{s.ipoSuccess}</div>
      )}
      {s.ipoError && (
        <div role="alert" className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer" onClick={() => s.setIpoError(null)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.setIpoError(null); } }} tabIndex={0}>{s.ipoError}</div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-balance">{t('ipoManagement')}</h2>
          <p className="text-xs text-white/50">{t('playerAndIpoCount', { players: s.players.length, ipos: s.activeIpos.length })}</p>
        </div>
        {s.canCreateIpo && (
          <Button variant="gold" onClick={() => s.setIpoModalOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('newIpo')}
          </Button>
        )}
      </div>

      {s.activeIpos.length === 0 && s.pastIpos.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <div className="text-white/30 mb-2">{t('noIpos')}</div>
          <div className="text-sm text-white/50">{t('noIposDesc')}</div>
        </Card>
      ) : (
        <div className="space-y-6">
          {s.activeIpos.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/50">{t('activeIposCount', { count: s.activeIpos.length })}</div>
              {s.activeIpos.map(ipo => {
                const player = s.players.find(p => p.id === ipo.player_id);
                if (!player) return null;
                const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;
                const priceBsd = centsToBsd(ipo.price);
                const msLeft = Math.max(0, new Date(ipo.ends_at).getTime() - Date.now());
                const daysLeft = Math.floor(msLeft / 86400000);
                const hoursLeft = Math.floor((msLeft % 86400000) / 3600000);
                const sc = statusConfig[ipo.status] || statusConfig.ended;

                return (
                  <Card key={ipo.id} className="p-3 md:p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerIdentity player={player} size="sm" showStatus={false} className="min-w-0 flex-1" />
                        <span className="text-xs text-white/40 shrink-0">{fmtScout(priceBsd)} CR</span>
                        <Chip className={cn(sc.bg, sc.text, sc.border, 'border flex-shrink-0')}>{sc.label}</Chip>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-white/50">{t('soldProgress', { sold: ipo.sold, total: ipo.total_offered })}</span>
                            <span className="font-mono font-bold text-gold">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gold rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        <div className="text-xs text-white/40 whitespace-nowrap flex-shrink-0">
                          {ipo.status === 'open' || ipo.status === 'announced' ? `${daysLeft}d ${hoursLeft}h` : '-'}
                        </div>
                      </div>
                      {s.canCreateIpo && (
                        <div className="flex items-center gap-2">
                          {ipo.status === 'announced' && (
                            <>
                              <Button variant="gold" size="sm" onClick={() => s.handleIpoStatusChange(ipo.id, 'open')} disabled={s.ipoLoading}>
                                <Play className="w-3 h-3" />{t('start')}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => s.handleIpoStatusChange(ipo.id, 'cancelled')} disabled={s.ipoLoading}>
                                <XCircle className="w-3 h-3" />{t('cancel')}
                              </Button>
                            </>
                          )}
                          {ipo.status === 'open' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => s.handleIpoStatusChange(ipo.id, 'ended')} disabled={s.ipoLoading}>{t('end')}</Button>
                              <Button variant="outline" size="sm" onClick={() => s.handleIpoStatusChange(ipo.id, 'cancelled')} disabled={s.ipoLoading}>
                                <XCircle className="w-3 h-3" />{t('cancel')}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {s.pastIpos.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-white/30">{t('pastIposCount', { count: s.pastIpos.length })}</div>
              {s.pastIpos.map(ipo => {
                const player = s.players.find(p => p.id === ipo.player_id);
                if (!player) return null;
                const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;
                const sc = ipo.status === 'cancelled'
                  ? { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', label: t('ipoStatusCancelled') }
                  : { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/50', label: t('ipoStatusEnded') };
                return (
                  <Card key={ipo.id} className="p-3 md:p-4 opacity-60">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerIdentity player={player} size="sm" showStatus={false} className="min-w-0 flex-1" />
                      <span className="text-xs text-white/40 shrink-0">{fmtScout(centsToBsd(ipo.price))} CR · {progress.toFixed(0)}%</span>
                      <Chip className={cn(sc.bg, sc.text, sc.border, 'border flex-shrink-0')}>{sc.label}</Chip>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Spieler-Verwaltung: Cap + Liquidierung */}
      <div className="border-t border-white/10 pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-xl font-black text-balance">{t('playerManagement')}</h2>
          {s.canCreatePlayerAction && (
            <Button variant="gold" onClick={() => s.setCreateModalOpen(true)}>
              <UserPlus className="w-4 h-4" />
              {t('createPlayer')}
            </Button>
          )}
        </div>

        {s.activePlayers.length > 0 && (
          <div className="space-y-2">
            {s.activePlayers.map(p => (
              <Card key={p.id} className="p-3 md:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerIdentity player={p} size="sm" showStatus={false} className="min-w-0 flex-1" />
                  {p.successFeeCap != null && (
                    <Chip className="bg-gold/10 text-gold border border-gold/20 text-[10px] px-1.5 py-0 shrink-0">
                      Cap: {fmtScout(p.successFeeCap)} CR
                    </Chip>
                  )}
                  {(s.canSetFee || s.canLiquidate) && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {s.canSetFee && (
                        <button
                          onClick={() => s.openCapModal(p)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-gold/10 text-white/50 hover:text-gold transition-colors"
                          aria-label={t('setCapLabel')}
                        >
                          <Shield className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      {s.canLiquidate && (
                        <button
                          onClick={() => s.openLiquidationModal(p)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors"
                          aria-label={t('liquidateLabel')}
                        >
                          <Flame className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {s.liquidatedPlayers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-bold text-white/30">{t('liquidatedPlayersCount', { count: s.liquidatedPlayers.length })}</div>
            {s.liquidatedPlayers.map(p => (
              <Card key={p.id} className="p-3 md:p-4 opacity-50">
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerIdentity player={p} size="sm" showStatus={false} className="min-w-0 flex-1" />
                  <Chip className="bg-white/5 text-white/40 border border-white/10">{t('liquidated')}</Chip>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Success Fee Cap Modal */}
      <Modal open={!!s.capModalPlayer} title={t('successFeeCap')} onClose={() => s.setCapModalPlayer(null)}>
        {s.capModalPlayer && (
          <div className="space-y-4 p-4 md:p-6">
            <div className="text-sm text-white/60">
              {t('capDesc', { player: `${s.capModalPlayer.first} ${s.capModalPlayer.last}` })}
            </div>
            <div>
              <label htmlFor="cap-amount" className="block text-sm font-bold text-white/70 mb-1">{t('capAmount')}</label>
              <input
                id="cap-amount"
                type="number"
                inputMode="numeric"
                step="0.01"
                min="0"
                value={s.capValue}
                onChange={(e) => s.setCapValue(e.target.value)}
                placeholder={t('examplePrice', { example: '500.00' })}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
              />
            </div>
            {s.capModalPlayer.successFeeCap != null && (
              <div className="text-xs text-white/40">
                {t('currentCap')} <span className="text-gold font-mono font-bold">{fmtScout(s.capModalPlayer.successFeeCap)} CR</span>
              </div>
            )}
            <Button variant="gold" fullWidth onClick={s.handleSetCap} disabled={s.capLoading || !s.capValue}>
              {s.capLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Shield className="w-4 h-4" aria-hidden="true" />}
              {s.capLoading ? t('saving') : t('setCap')}
            </Button>
          </div>
        )}
      </Modal>

      {/* Liquidation Confirmation Modal */}
      <Modal open={!!s.liqModalPlayer} title={t('liquidatePlayerTitle')} onClose={s.closeLiquidationModal}>
        {s.liqModalPlayer && !s.liqResult && (() => {
          const tvEur = parseInt(s.liqTransferValue) || 0;
          const tier = getSuccessFeeTier(tvEur);
          const feeCents = tier.fee;
          const capCents = s.liqModalPlayer.successFeeCap != null ? Math.round(s.liqModalPlayer.successFeeCap * 100) : null;
          const effectiveFee = capCents != null && capCents > 0 ? Math.min(feeCents, capCents) : feeCents;
          const effectiveFeeBsd = effectiveFee / 100;
          const totalDpcs = s.liqModalPlayer.dpc.circulation;
          const totalSfBsd = effectiveFeeBsd * totalDpcs;
          return (
            <div className="space-y-4 p-4 md:p-6">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-300">
                  {t('liquidateWarning', { player: `${s.liqModalPlayer.first} ${s.liqModalPlayer.last}` })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">{t('transferValueEur')}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={s.liqTransferValue}
                  onChange={(e) => s.setLiqTransferValue(e.target.value)}
                  placeholder={t('examplePrice', { example: '1000000' })}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25"
                />
                <div className="text-xs text-white/40 mt-1">{t('transferValueHint')}</div>
              </div>
              <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 space-y-2 text-sm">
                <div className="text-xs font-bold text-gold/70 mb-1">{t('livePreview')}</div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('tierLabel')}</span>
                  <span className="font-mono font-bold text-gold">{tier.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('feePerDpc')}</span>
                  <span className="font-mono font-bold text-gold">
                    {fmtScout(effectiveFeeBsd)} CR
                    {capCents != null && capCents > 0 && capCents < feeCents && <span className="text-white/40 text-xs ml-1">{t('capTag')}</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('dpcsCirculation')}</span>
                  <span className="font-mono font-bold">{totalDpcs}</span>
                </div>
                <div className="border-t border-white/10 pt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">{t('pbtDistribution')}</span>
                    <span className="font-mono font-bold text-green-500">{fmtScout(s.liqPbtBalance)} CR</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">{t('communityBonus')}</span>
                    <span className="font-mono font-bold text-gold">{fmtScout(totalSfBsd)} CR</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-1">
                    <span className="text-white font-bold">{t('total')}</span>
                    <span className="font-mono font-bold text-green-500">{fmtScout(s.liqPbtBalance + totalSfBsd)} CR</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" fullWidth onClick={() => s.closeLiquidationModal()}>
                  {t('cancel')}
                </Button>
                <Button
                  fullWidth
                  onClick={s.handleLiquidate}
                  disabled={s.liqLoading}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                >
                  {s.liqLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                  {s.liqLoading ? t('liquidating') : t('liquidateAction')}
                </Button>
              </div>
            </div>
          );
        })()}
        {s.liqModalPlayer && s.liqResult && (
          <div className="space-y-4 p-4 md:p-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
              <div className="text-green-500 font-black text-lg mb-1">{t('liquidationComplete')}</div>
              <div className="text-sm text-white/60">{t('liquidationSuccess', { player: `${s.liqModalPlayer.first} ${s.liqModalPlayer.last}` })}</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/50">{t('dpcHolder')}</span>
                <span className="font-mono font-bold">{s.liqResult.holder_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">{t('transferValueResult')}</span>
                <span className="font-mono font-bold">{s.liqResult.transfer_value_eur > 0 ? `${(s.liqResult.transfer_value_eur / 1000000).toFixed(1)}M EUR` : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">{t('feePerDpc')}</span>
                <span className="font-mono font-bold text-gold">{fmtScout(centsToBsd(s.liqResult.fee_per_dpc_cents))} CR</span>
              </div>
              <div className="border-t border-white/10 pt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('pbtDistribution')}</span>
                  <span className="font-mono font-bold text-green-500">{fmtScout(centsToBsd(s.liqResult.pbt_distributed_cents))} CR</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">{t('communityBonus')}</span>
                  <span className="font-mono font-bold text-gold">{fmtScout(centsToBsd(s.liqResult.success_fee_cents))} CR</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-1">
                  <span className="text-white font-bold">{t('total')}</span>
                  <span className="font-mono font-bold text-green-500">{fmtScout(centsToBsd(s.liqResult.distributed_cents))} CR</span>
                </div>
              </div>
            </div>
            <Button variant="outline" fullWidth onClick={s.closeLiquidationModal}>
              {t('close')}
            </Button>
          </div>
        )}
      </Modal>

      {/* Create IPO Modal */}
      <Modal open={s.ipoModalOpen} title={t('newIpo')} onClose={() => s.setIpoModalOpen(false)}>
        <div className="space-y-4 p-4 md:p-6">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('playerLabel')}</label>
            <select
              value={s.ipoPlayerId}
              onChange={(e) => s.setIpoPlayerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40"
            >
              <option value="" className="bg-[#1a1a2e] text-white/50">{t('selectPlayer')}</option>
              {s.eligiblePlayers.map(p => (
                <option key={p.id} value={p.id} className="bg-[#1a1a2e] text-white">{p.first} {p.last} ({p.pos})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('pricePerDpc')}</label>
            <input type="number" inputMode="numeric" step="0.01" min="0.01" value={s.ipoPrice} onChange={(e) => s.setIpoPrice(e.target.value)} placeholder={t('examplePrice', { example: '5.00' })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('dpcCount')}</label>
            <input type="number" inputMode="numeric" min="1" max={(() => { const sp = s.players.find(p => p.id === s.ipoPlayerId); return sp ? sp.dpc.supply - sp.dpc.circulation : 500; })()} value={s.ipoQty} onChange={(e) => s.setIpoQty(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40" />
            {s.ipoPlayerId && (() => {
              const sp = s.players.find(p => p.id === s.ipoPlayerId);
              if (!sp) return null;
              const available = sp.dpc.supply - sp.dpc.circulation;
              return (
                <div className="mt-1 text-xs text-white/40">
                  {t('availableOf', { available, total: sp.dpc.supply, circulation: sp.dpc.circulation })}
                </div>
              );
            })()}
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('maxPerUser')}</label>
            <input type="number" inputMode="numeric" min="1" value={s.ipoMaxPerUser} onChange={(e) => s.setIpoMaxPerUser(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40" />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('durationLabel')}</label>
            <select value={s.ipoDuration} onChange={(e) => s.setIpoDuration(e.target.value)} className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40">
              <option value="7">{t('daysOption7')}</option>
              <option value="14">{t('daysOption14')}</option>
              <option value="21">{t('daysOption21')}</option>
              <option value="28">{t('daysOption28')}</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-minimal rounded-xl border border-white/10">
            <div>
              <div className="text-sm font-bold">{t('startNow')}</div>
              <div className="text-xs text-white/40">{t('startNowDesc')}</div>
            </div>
            <button
              onClick={() => s.setIpoStartNow(!s.ipoStartNow)}
              className={cn('w-12 h-6 rounded-full transition-colors relative', s.ipoStartNow ? 'bg-green-500' : 'bg-white/10')}
            >
              <div className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', s.ipoStartNow ? 'left-6' : 'left-0.5')} />
            </button>
          </div>
          {s.ipoPlayerId && s.ipoPrice && (
            <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/50">{t('totalVolumeIpo')}</span>
                <span className="font-mono font-bold text-gold">{fmtScout(parseFloat(s.ipoPrice) * parseInt(s.ipoQty || '0'))} CR</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">{t('statusAfterCreation')}</span>
                <span className={s.ipoStartNow ? 'text-green-500 font-bold' : 'text-blue-300 font-bold'}>{s.ipoStartNow ? t('ipoStatusLive') : t('ipoStatusAnnounced')}</span>
              </div>
            </div>
          )}
          <Button variant="gold" fullWidth onClick={s.handleCreateIpo} disabled={s.ipoLoading || !s.ipoPlayerId || !s.ipoPrice}>
            {s.ipoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {s.ipoLoading ? t('creating') : t('newIpo')}
          </Button>
        </div>
      </Modal>

      {/* Create Player Modal */}
      <Modal open={s.createModalOpen} title={t('createPlayer')} onClose={() => s.setCreateModalOpen(false)}>
        <div className="space-y-4 p-4 md:p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('firstName')}</label>
              <input type="text" value={s.cpFirstName} onChange={(e) => s.setCpFirstName(e.target.value.slice(0, 30))} placeholder={t('firstName')} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('lastName')}</label>
              <input type="text" value={s.cpLastName} onChange={(e) => s.setCpLastName(e.target.value.slice(0, 30))} placeholder={t('lastName')} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('positionLabel')}</label>
              <select value={s.cpPosition} onChange={(e) => s.setCpPosition(e.target.value)} className="w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40">
                <option value="GK">GK</option>
                <option value="DEF">DEF</option>
                <option value="MID">MID</option>
                <option value="ATT">ATT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('shirtNumber')}</label>
              <input type="number" inputMode="numeric" min="1" max="99" value={s.cpShirtNumber} onChange={(e) => s.setCpShirtNumber(e.target.value)} placeholder={t('examplePrice', { example: '10' })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('ageLabel')}</label>
              <input type="number" inputMode="numeric" min="15" max="45" value={s.cpAge} onChange={(e) => s.setCpAge(e.target.value)} placeholder={t('examplePrice', { example: '24' })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{t('nationalityLabel')}</label>
              <input type="text" value={s.cpNationality} onChange={(e) => s.setCpNationality(e.target.value.slice(0, 3).toUpperCase())} placeholder="TR" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{t('ipoPriceLabel')}</label>
            <input type="number" inputMode="numeric" step="0.01" min="0.01" value={s.cpIpoPrice} onChange={(e) => s.setCpIpoPrice(e.target.value)} placeholder={t('examplePrice', { example: '5.00' })} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25" />
          </div>
          <div className="bg-surface-minimal rounded-xl p-3 text-xs text-white/40">
            Club: <span className="text-white/70 font-bold">{club.name}</span>
          </div>
          <Button
            variant="gold"
            fullWidth
            onClick={s.handleCreatePlayer}
            disabled={s.createLoading || !s.cpFirstName || !s.cpLastName || !s.cpShirtNumber || !s.cpAge}
          >
            {s.createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {s.createLoading ? t('creating') : t('createPlayer')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
