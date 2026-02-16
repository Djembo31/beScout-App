'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { getAllFeeConfigs, updateFeeConfig } from '@/lib/services/platformAdmin';
import type { DbFeeConfig } from '@/types';

type FeeKey = 'trade_fee_bps' | 'trade_platform_bps' | 'trade_pbt_bps' | 'trade_club_bps' | 'ipo_club_bps' | 'ipo_platform_bps' | 'ipo_pbt_bps';

export function AdminFeesTab({ adminId }: { adminId: string }) {
  const { addToast } = useToast();
  const [configs, setConfigs] = useState<DbFeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<DbFeeConfig>>({});

  useEffect(() => {
    getAllFeeConfigs().then(data => { setConfigs(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (configId: string) => {
    try {
      const result = await updateFeeConfig(adminId, configId, {
        trade_fee_bps: editValues.trade_fee_bps,
        trade_platform_bps: editValues.trade_platform_bps,
        trade_pbt_bps: editValues.trade_pbt_bps,
        trade_club_bps: editValues.trade_club_bps,
        ipo_club_bps: editValues.ipo_club_bps,
        ipo_platform_bps: editValues.ipo_platform_bps,
        ipo_pbt_bps: editValues.ipo_pbt_bps,
      });
      if (result.success) {
        addToast('Gebühren aktualisiert', 'success');
        setEditId(null);
        const data = await getAllFeeConfigs();
        setConfigs(data);
      } else {
        addToast(result.error ?? 'Fehler', 'error');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>;

  return (
    <div className="space-y-4">
      {configs.map(config => {
        const isEditing = editId === config.id;
        const vals = isEditing ? editValues : config;
        return (
          <Card key={config.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white">{config.club_name ?? 'Standard (alle Clubs)'}</span>
              {!isEditing ? (
                <button onClick={() => { setEditId(config.id); setEditValues(config); }}
                  className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20">
                  Bearbeiten
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditId(null)} className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/40">Abbrechen</button>
                  <button onClick={() => handleSave(config.id)} className="text-xs px-3 py-1 rounded-lg bg-[#FFD700]/20 text-[#FFD700]">Speichern</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {([
                { key: 'trade_fee_bps' as FeeKey, label: 'Trade Fee' },
                { key: 'trade_platform_bps' as FeeKey, label: 'Platform' },
                { key: 'trade_pbt_bps' as FeeKey, label: 'PBT' },
                { key: 'trade_club_bps' as FeeKey, label: 'Club' },
                { key: 'ipo_platform_bps' as FeeKey, label: 'IPO Platform' },
                { key: 'ipo_pbt_bps' as FeeKey, label: 'IPO PBT' },
                { key: 'ipo_club_bps' as FeeKey, label: 'IPO Club' },
              ]).map(({ key, label }) => (
                <div key={key}>
                  <div className="text-white/40 mb-1">{label}</div>
                  {isEditing ? (
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={editValues[key] ?? 0}
                      onChange={e => setEditValues(prev => ({ ...prev, [key]: Math.min(10000, Math.max(0, parseInt(e.target.value) || 0)) }))}
                      className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white font-mono text-xs"
                    />
                  ) : (
                    <div className="font-mono text-white">{config[key]} bps</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
