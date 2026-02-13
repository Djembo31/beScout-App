import {
  Home,
  Briefcase,
  Trophy,
  Users,
  User,
  Building2,
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
  { label: 'Fantasy', href: '/fantasy', icon: Trophy, badge: 'Fantasy' },
  { label: 'Community', href: '/community', icon: Users, badge: 'Community' },
  { label: 'Profil', href: '/profile', icon: User },
];

export const NAV_MORE: NavItem[] = [
  { label: 'Club', href: '/club', icon: Building2 },
];
