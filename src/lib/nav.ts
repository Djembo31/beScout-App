import {
  Home,
  Briefcase,
  Trophy,
  Compass,
  Building2,
  Shield,
  Rocket,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export const NAV_MAIN: NavItem[] = [
  { label: 'home', href: '/', icon: Home },
  { label: 'market', href: '/market', icon: Briefcase },
  { label: 'fantasy', href: '/fantasy', icon: Trophy },
  { label: 'club', href: '/club', icon: Building2 },
  { label: 'scouting', href: '/community', icon: Compass },
];

export const NAV_MORE: NavItem[] = [
  { label: 'airdrop', href: '/airdrop', icon: Rocket },
];

export const NAV_ADMIN: NavItem = {
  label: 'admin',
  href: '/bescout-admin',
  icon: Shield,
  badge: 'admin',
};
