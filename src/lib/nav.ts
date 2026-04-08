import {
  Home,
  ClipboardList,
  TrendingUp,
  Trophy,
  Compass,
  Building2,
  Shield,
  Rocket,
  Target,
  Crown,
  Package,
  Receipt,
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
  { label: 'manager', href: '/manager', icon: ClipboardList },
  { label: 'market', href: '/market', icon: TrendingUp },
  { label: 'fantasy', href: '/fantasy', icon: Trophy },
  { label: 'missions', href: '/missions', icon: Target },
  { label: 'inventory', href: '/inventory', icon: Package },
  { label: 'club', href: '/club', icon: Building2 },
  { label: 'scouting', href: '/community', icon: Compass },
];

export const NAV_MORE: NavItem[] = [
  { label: 'transactions', href: '/transactions', icon: Receipt },
  { label: 'founding', href: '/founding', icon: Crown },
  { label: 'airdrop', href: '/airdrop', icon: Rocket },
];

export const NAV_ADMIN: NavItem = {
  label: 'admin',
  href: '/bescout-admin',
  icon: Shield,
  badge: 'admin',
};
