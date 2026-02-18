import {
  Home,
  Briefcase,
  Trophy,
  FileText,
  User,
  Building2,
  Shield,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export const NAV_MAIN: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Manager', href: '/market', icon: Briefcase, badge: 'Office' },
  { label: 'Spieltag', href: '/fantasy', icon: Trophy },
  { label: 'Report', href: '/community', icon: FileText },
  { label: 'Profil', href: '/profile', icon: User },
];

export const NAV_MORE: NavItem[] = [
  { label: 'Club', href: '/club', icon: Building2 },
];

export const NAV_ADMIN: NavItem = {
  label: 'Admin',
  href: '/bescout-admin',
  icon: Shield,
  badge: 'Admin',
};
