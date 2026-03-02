import type { ClubAdminRole } from '@/types';

export type AdminTab = 'overview' | 'players' | 'events' | 'votes' | 'bounties' | 'scouting' | 'moderation' | 'analytics' | 'fans' | 'revenue' | 'withdrawal' | 'settings';

const TAB_ACCESS: Record<AdminTab, ClubAdminRole[]> = {
  overview:   ['owner', 'admin', 'editor'],
  players:    ['owner', 'admin'],
  events:     ['owner', 'admin'],
  votes:      ['owner', 'admin'],
  bounties:   ['owner', 'admin'],
  scouting:   ['owner', 'admin', 'editor'],
  moderation: ['owner', 'admin', 'editor'],
  analytics:  ['owner', 'admin', 'editor'],
  fans:       ['owner', 'admin'],
  revenue:    ['owner', 'admin'],
  withdrawal: ['owner'],
  settings:   ['owner', 'admin'],
};

export function canAccessTab(tab: AdminTab, role: ClubAdminRole): boolean {
  return TAB_ACCESS[tab]?.includes(role) ?? false;
}

export function canPerformAction(action: string, role: ClubAdminRole): boolean {
  const ownerOnly = ['liquidate', 'set_success_fee', 'create_ipo', 'request_withdrawal', 'set_gameweek', 'set_jurisdiction', 'manage_admins'];
  const adminPlus = ['create_player', 'create_event', 'create_vote', 'create_bounty', 'approve_bounty', 'pin_post', 'delete_post', 'update_guidelines', 'sync_api', 'publish_news'];
  if (ownerOnly.includes(action)) return role === 'owner';
  if (adminPlus.includes(action)) return role === 'owner' || role === 'admin';
  return true;
}

export function getRoleBadge(role: ClubAdminRole): { labelKey: string; color: string; bg: string; border: string } {
  switch (role) {
    case 'owner':
      return { labelKey: 'owner', color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/20' };
    case 'admin':
      return { labelKey: 'admin', color: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/20' };
    case 'editor':
      return { labelKey: 'editor', color: 'text-white/60', bg: 'bg-white/5', border: 'border-white/10' };
  }
}
