import {
  Home,
  Briefcase,
  Trophy,
  FileText,
  User,
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
  { label: 'manager', href: '/market', icon: Briefcase },
  { label: 'fantasy', href: '/fantasy', icon: Trophy },
  { label: 'report', href: '/community', icon: FileText },
  { label: 'profile', href: '/profile', icon: User },
];

export const NAV_MORE: NavItem[] = [
  { label: 'club', href: '/club', icon: Building2 },
  { label: 'airdrop', href: '/airdrop', icon: Rocket },
];

export const NAV_ADMIN: NavItem = {
  label: 'admin',
  href: '/bescout-admin',
  icon: Shield,
  badge: 'admin',
};
