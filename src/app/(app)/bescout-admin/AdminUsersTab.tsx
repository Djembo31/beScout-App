'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { RegionBadge } from '@/components/ui/RegionBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { updateProfile } from '@/lib/services/profiles';
import { GEOFENCING_ENABLED, GEO_REGIONS } from '@/lib/geofencing';
import {
  getAllUsers, adjustWallet,
  type PlatformAdminRole, type AdminUser,
} from '@/lib/services/platformAdmin';

export function AdminUsersTab({ adminId, role }: { adminId: string; role: PlatformAdminRole }) {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adjustModal, setAdjustModal] = useState<AdminUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const data = await getAllUsers(50, 0, search || undefined);
    setUsers(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handleAdjust = async () => {
    if (!adjustModal || !adjustAmount || !adjustReason) return;
    const cents = Math.round(parseFloat(adjustAmount) * 100);
    if (cents === 0) return;
    setAdjusting(true);
    try {
      const result = await adjustWallet(adminId, adjustModal.id, cents, adjustReason);
      if (result.success) {
        addToast(t('walletAdjusted', { amount: fmtScout(centsToBsd(result.new_balance ?? 0)) }), 'success');
        setAdjustModal(null);
        setAdjustAmount('');
        setAdjustReason('');
        loadUsers();
      } else {
        addToast(result.error ?? t('error'), 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('error'), 'error');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t('searchUsersPlaceholder')} aria-label={t('searchUsersLabel')}
          className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/30"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none text-white/30" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left py-2 px-3">{t('thHandle')}</th>
                <th className="text-right py-2 px-3">{t('thBalance')}</th>
                <th className="text-right py-2 px-3">{t('thHoldings')}</th>
                <th className="text-right py-2 px-3">{t('thTrades')}</th>
                {GEOFENCING_ENABLED && <th className="text-center py-2 px-3">{t('thRegion')}</th>}
                <th className="text-right py-2 px-3">{t('thAction')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-surface-minimal">
                  <td className="py-2.5 px-3">
                    <Link href={`/profile/${u.handle}`} className="text-white hover:text-gold font-medium">
                      @{u.handle}
                    </Link>
                    {u.displayName && <span className="text-white/40 ml-1 text-xs">{u.displayName}</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-gold">
                    {fmtScout(centsToBsd(u.balance))}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{u.holdingsCount}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{u.tradesCount}</td>
                  {GEOFENCING_ENABLED && (
                    <td className="py-2.5 px-3 text-center">
                      <RegionBadge region={u.region} />
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right">
                    {role !== 'viewer' && (
                      <button
                        onClick={() => setAdjustModal(u)}
                        className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                      >
                        {t('correction')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustModal && (
        <Modal open={true} onClose={() => setAdjustModal(null)} title={t('walletCorrection', { handle: adjustModal.handle })}>
          <div className="space-y-4">
            <div className="text-sm text-white/60">
              {t('currentBalance')} <span className="font-mono tabular-nums text-gold">{fmtScout(centsToBsd(adjustModal.balance))} bCredits</span>
            </div>
            <div>
              <label htmlFor="adjust-amount" className="text-xs text-white/60 mb-1 block">{t('amountLabel')}</label>
              <input
                id="adjust-amount"
                type="number" inputMode="numeric" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                placeholder={t('amountPlaceholder')}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-gold/30"
              />
            </div>
            <div>
              <label htmlFor="adjust-reason" className="text-xs text-white/60 mb-1 block">{t('reasonLabel')}</label>
              <input
                id="adjust-reason"
                type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/30"
              />
            </div>
            {GEOFENCING_ENABLED && (
              <div>
                <label htmlFor="adjust-region" className="text-xs text-white/60 mb-1 block">{t('regionLabel')}</label>
                <select
                  id="adjust-region"
                  value={adjustModal.region ?? ''}
                  onChange={async (e) => {
                    const val = e.target.value || null;
                    try {
                      await updateProfile(adjustModal.id, { region: val });
                      setAdjustModal({ ...adjustModal, region: val });
                      addToast(t('regionUpdated'), 'success');
                      loadUsers();
                    } catch (err) {
                      addToast(err instanceof Error ? err.message : t('error'), 'error');
                    }
                  }}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/30"
                >
                  <option value="">{t('regionNotSet')}</option>
                  {GEO_REGIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.value}</option>
                  ))}
                </select>
              </div>
            )}
            <Button onClick={handleAdjust} disabled={!adjustAmount || !adjustReason || adjusting} className="w-full">
              {adjusting ? t('adjusting') : t('adjustWallet')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
