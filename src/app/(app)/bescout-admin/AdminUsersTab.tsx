'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import {
  getAllUsers, adjustWallet,
  type PlatformAdminRole, type AdminUser,
} from '@/lib/services/platformAdmin';

export function AdminUsersTab({ adminId, role }: { adminId: string; role: PlatformAdminRole }) {
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
        addToast(`Wallet angepasst: ${fmtScout(centsToBsd(result.new_balance ?? 0))} $SCOUT`, 'success');
        setAdjustModal(null);
        setAdjustAmount('');
        setAdjustReason('');
        loadUsers();
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Benutzer suchen..."
          className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/30"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left py-2 px-3">Handle</th>
                <th className="text-right py-2 px-3">Balance</th>
                <th className="text-right py-2 px-3">Holdings</th>
                <th className="text-right py-2 px-3">Trades</th>
                <th className="text-right py-2 px-3">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3">
                    <Link href={`/profile/${u.handle}`} className="text-white hover:text-[#FFD700] font-medium">
                      @{u.handle}
                    </Link>
                    {u.displayName && <span className="text-white/40 ml-1 text-xs">{u.displayName}</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[#FFD700]">
                    {fmtScout(centsToBsd(u.balance))}
                  </td>
                  <td className="py-2.5 px-3 text-right text-white/60">{u.holdingsCount}</td>
                  <td className="py-2.5 px-3 text-right text-white/60">{u.tradesCount}</td>
                  <td className="py-2.5 px-3 text-right">
                    {role !== 'viewer' && (
                      <button
                        onClick={() => setAdjustModal(u)}
                        className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                      >
                        Korrektur
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
        <Modal open={true} onClose={() => setAdjustModal(null)} title={`Wallet-Korrektur: @${adjustModal.handle}`}>
          <div className="space-y-4">
            <div className="text-sm text-white/60">
              Aktuelles Guthaben: <span className="font-mono text-[#FFD700]">{fmtScout(centsToBsd(adjustModal.balance))} $SCOUT</span>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Betrag ($SCOUT, negativ = abziehen)</label>
              <input
                type="number" inputMode="numeric" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                placeholder="z.B. 1000 oder -500"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-[#FFD700]/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Grund</label>
              <input
                type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                placeholder="z.B. Beta-Bonus, Bug-Fix..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/30"
              />
            </div>
            <Button onClick={handleAdjust} disabled={!adjustAmount || !adjustReason || adjusting} className="w-full">
              {adjusting ? 'Wird angepasst...' : 'Wallet anpassen'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
