import type { EventStatus, EventType } from './types';
import {
  Sparkles, Building2, Gift, UserPlus, Star, Trophy, Swords,
} from 'lucide-react';

export const getStatusStyle = (status: EventStatus) => {
  switch (status) {
    case 'running': return { bg: 'bg-[#22C55E]', text: 'text-white', label: 'LIVE', pulse: true };
    case 'late-reg': return { bg: 'bg-orange-500', text: 'text-white', label: 'Late Reg', pulse: true };
    case 'registering': return { bg: 'bg-sky-500', text: 'text-white', label: 'Anmelden', pulse: false };
    case 'upcoming': return { bg: 'bg-purple-500/50', text: 'text-purple-200', label: 'Bald', pulse: false };
    case 'ended': return { bg: 'bg-white/20', text: 'text-white/60', label: 'Beendet', pulse: false };
    default: return { bg: 'bg-white/10', text: 'text-white/50', label: status, pulse: false };
  }
};

export const getTypeStyle = (type: EventType) => {
  switch (type) {
    case 'bescout': return { color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/15', icon: Sparkles };
    case 'club': return { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15', icon: Building2 };
    case 'sponsor': return { color: 'text-sky-400', bg: 'bg-sky-500/15', icon: Gift };
    case 'creator': return { color: 'text-orange-400', bg: 'bg-orange-500/15', icon: UserPlus };
    case 'special': return { color: 'text-purple-400', bg: 'bg-purple-500/15', icon: Star };
    default: return { color: 'text-white/70', bg: 'bg-white/10', icon: Trophy };
  }
};

export const getTierStyle = (tier: 'arena' | 'club' | 'user') => {
  switch (tier) {
    case 'arena': return { color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: Swords, label: 'Arena', pointsLabel: '+50 / −15' };
    case 'club': return { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/20', icon: Building2, label: 'Club', pointsLabel: '+1 bis +15' };
    case 'user': return { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: UserPlus, label: 'User', pointsLabel: '' };
    default: return { color: 'text-white/50', bg: 'bg-white/5', border: 'border-white/10', icon: Trophy, label: '', pointsLabel: '' };
  }
};

export const getPosBorderColor = (pos: string): string => {
  const p = pos.toUpperCase();
  if (p === 'GK') return 'border-emerald-400/40';
  if (['DEF', 'CB', 'LB', 'RB'].includes(p)) return 'border-amber-400/40';
  if (['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'].includes(p)) return 'border-sky-400/40';
  if (['ATT', 'FW', 'ST', 'CF', 'LW', 'RW'].includes(p)) return 'border-rose-400/40';
  return 'border-white/10';
};

// Slot index (0-5) → JSONB key in slot_scores
export const SLOT_SCORE_KEYS = ['gk', 'def1', 'def2', 'mid1', 'mid2', 'att'];

export const getScoreColor = (score: number): string => {
  if (score >= 100) return '#FFD700';
  if (score >= 70) return '#ffffff';
  return '#ff6b6b';
};

export const getPosAccentColor = (pos: string): string => {
  const p = pos.toUpperCase();
  if (p === 'GK') return '#34d399';
  if (['DEF', 'CB', 'LB', 'RB'].includes(p)) return '#fbbf24';
  if (['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'].includes(p)) return '#38bdf8';
  if (['ATT', 'FW', 'ST', 'CF', 'LW', 'RW'].includes(p)) return '#fb7185';
  return '#ffffff20';
};

export const formatCountdown = (timestamp: number) => {
  const diff = timestamp - Date.now();
  if (diff <= 0) return 'Gestartet';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

export const getFormResult = (rank: number, total: number): { color: string; label: string } => {
  const percentile = (rank / total) * 100;
  if (percentile <= 1) return { color: 'bg-[#FFD700]', label: '\u{1F3C6}' };
  if (percentile <= 5) return { color: 'bg-[#22C55E]', label: '' };
  if (percentile <= 20) return { color: 'bg-sky-500', label: '' };
  if (percentile <= 50) return { color: 'bg-yellow-500', label: '' };
  return { color: 'bg-red-500', label: '' };
};
