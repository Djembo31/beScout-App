'use client';

import { useState, useEffect } from 'react';
import { Loader2, Globe, Building2, Gift, Star, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui';
import { useToast } from '@/components/providers/ToastProvider';
import { getEventFeeConfigs, updateEventFeeConfig } from '@/lib/services/platformAdmin';
import type { DbEventFeeConfig } from '@/types';

type FeeKey = 'platform_pct' | 'beneficiary_pct';

const TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string; beneficiaryLabel: string }> = {
  bescout:  { icon: Globe,    color: 'text-gold',        label: 'BeScout',   beneficiaryLabel: '\u2014' },
  club:     { icon: Building2, color: 'text-emerald-400', label: 'Club',      beneficiaryLabel: 'Club' },
  sponsor:  { icon: Gift,     color: 'text-sky-400',     label: 'Sponsor',   beneficiaryLabel: 'Club (Host)' },
  special:  { icon: Star,     color: 'text-purple-400',  label: 'Special',   beneficiaryLabel: '\u2014' },
  creator:  { icon: UserPlus, color: 'text-orange-400',  label: 'Community', beneficiaryLabel: 'Creator' },
};

export function AdminEventFeesSection({ adminId }: { adminId: string }) {
  const { addToast } = useToast();
  const [configs, setConfigs] = useState<DbEventFeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editType, setEditType] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ platform_pct: number; beneficiary_pct: number }>({ platform_pct: 0, beneficiary_pct: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEventFeeConfigs()
      .then(data => { setConfigs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (eventType: string) => {
    setSaving(true);
    try {
      await updateEventFeeConfig(adminId, eventType, {
        platform_pct: editValues.platform_pct,
        beneficiary_pct: editValues.beneficiary_pct,
      });
      addToast('Event-Gebuehren aktualisiert', 'success');
      setEditType(null);
      const data = await getEventFeeConfigs();
      setConfigs(data);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Fehler', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-black text-sm text-white/80 mb-3">Event Fee Config</h3>

      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 text-[11px] text-white/30 font-bold uppercase tracking-wider mb-2 px-1">
        <div>Type</div>
        <div className="text-right">Platform</div>
        <div className="text-right">Beneficiary</div>
        <div className="text-right">Prize Pool</div>
        <div />
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {configs.map(config => {
          const meta = TYPE_META[config.event_type] ?? TYPE_META.bescout;
          const Icon = meta.icon;
          const isEditing = editType === config.event_type;
          const pPct = isEditing ? editValues.platform_pct : config.platform_pct;
          const bPct = isEditing ? editValues.beneficiary_pct : config.beneficiary_pct;
          const prizePct = 10000 - pPct - bPct;

          return (
            <div
              key={config.event_type}
              className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-2 items-center py-2 px-1 rounded-lg hover:bg-white/[0.02] transition-colors"
            >
              {/* Type */}
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${meta.color}`} aria-hidden="true" />
                <span className="font-bold text-sm text-white">{meta.label}</span>
                {meta.beneficiaryLabel !== '\u2014' && (
                  <span className="text-[10px] text-white/30">\u2192 {meta.beneficiaryLabel}</span>
                )}
              </div>

              {/* Platform % */}
              <div className="text-right">
                {isEditing ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={5000}
                    value={editValues.platform_pct}
                    onChange={e => setEditValues(prev => ({
                      ...prev,
                      platform_pct: Math.min(5000, Math.max(0, parseInt(e.target.value) || 0)),
                    }))}
                    className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white font-mono text-xs tabular-nums text-right"
                  />
                ) : (
                  <span className="font-mono tabular-nums text-xs text-white">{(pPct / 100).toFixed(1)}%</span>
                )}
              </div>

              {/* Beneficiary % */}
              <div className="text-right">
                {isEditing ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={5000}
                    value={editValues.beneficiary_pct}
                    onChange={e => setEditValues(prev => ({
                      ...prev,
                      beneficiary_pct: Math.min(5000, Math.max(0, parseInt(e.target.value) || 0)),
                    }))}
                    className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-white font-mono text-xs tabular-nums text-right"
                  />
                ) : (
                  <span className="font-mono tabular-nums text-xs text-white/50">
                    {bPct > 0 ? `${(bPct / 100).toFixed(1)}%` : '\u2014'}
                  </span>
                )}
              </div>

              {/* Prize Pool % */}
              <div className="text-right">
                <span className={`font-mono tabular-nums text-xs ${prizePct >= 9000 ? 'text-emerald-400' : 'text-gold'}`}>
                  {(prizePct / 100).toFixed(1)}%
                </span>
              </div>

              {/* Actions */}
              <div className="text-right">
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setEditType(config.event_type);
                      setEditValues({ platform_pct: config.platform_pct, beneficiary_pct: config.beneficiary_pct });
                    }}
                    className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-white/50 hover:bg-white/20 transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => setEditType(null)}
                      className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-white/40 hover:bg-white/20 transition-colors"
                    >
                      \u2715
                    </button>
                    <button
                      onClick={() => handleSave(config.event_type)}
                      disabled={saving}
                      className="text-[11px] px-2 py-0.5 rounded bg-gold/20 text-gold hover:bg-gold/30 transition-colors disabled:opacity-40"
                    >
                      {saving ? '\u2026' : '\u2713'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="mt-3 text-[10px] text-white/20 px-1">
        Werte in Basispunkten (bps). 500 bps = 5%. Platform + Beneficiary duerfen zusammen max 100% sein.
      </div>
    </Card>
  );
}
