export type TourStepPosition = 'top' | 'bottom' | 'left' | 'right';

export type TourStep = {
  targetSelector: string;
  titleKey: string;
  descKey: string;
  position: TourStepPosition;
  /** Only show on screens < 1024px */
  mobileOnly?: boolean;
  /** Only show on screens >= 1024px */
  desktopOnly?: boolean;
};

export const TOUR_STEPS: TourStep[] = [
  // 1. bCredits Balance — different target per device
  {
    targetSelector: '[data-tour-id="sidebar-wallet"]',
    titleKey: 'balanceTitle',
    descKey: 'balanceDescDesktop',
    position: 'right',
    desktopOnly: true,
  },
  {
    targetSelector: '[data-tour-id="topbar-balance"]',
    titleKey: 'balanceTitle',
    descKey: 'balanceDescMobile',
    position: 'bottom',
    mobileOnly: true,
  },

  // 2. Global Search — desktop only
  {
    targetSelector: '[data-tour-id="topbar-search"]',
    titleKey: 'searchTitle',
    descKey: 'searchDesc',
    position: 'bottom',
    desktopOnly: true,
  },

  // 3. Notifications
  {
    targetSelector: '[data-tour-id="topbar-notifications"]',
    titleKey: 'notificationsTitle',
    descKey: 'notificationsDesc',
    position: 'bottom',
  },

  // 4. Dashboard Stats
  {
    targetSelector: '[data-tour-id="home-stats"]',
    titleKey: 'dashboardTitle',
    descKey: 'dashboardDesc',
    position: 'bottom',
  },

  // 5. Manager Office / Market — different target per device
  {
    targetSelector: '[data-tour-id="nav-market"]',
    titleKey: 'managerTitle',
    descKey: 'managerDescDesktop',
    position: 'right',
    desktopOnly: true,
  },
  {
    targetSelector: '[data-tour-id="bottomnav-market"]',
    titleKey: 'managerTitle',
    descKey: 'managerDescMobile',
    position: 'top',
    mobileOnly: true,
  },

  // 7. Fantasy — different target per device
  {
    targetSelector: '[data-tour-id="nav-fantasy"]',
    titleKey: 'fantasyTitle',
    descKey: 'fantasyDesc',
    position: 'right',
    desktopOnly: true,
  },
  {
    targetSelector: '[data-tour-id="bottomnav-fantasy"]',
    titleKey: 'fantasyTitle',
    descKey: 'fantasyDesc',
    position: 'top',
    mobileOnly: true,
  },
];
