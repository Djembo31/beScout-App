export type TourStepPosition = 'top' | 'bottom' | 'left' | 'right';

export type TourStep = {
  targetSelector: string;
  title: string;
  description: string;
  position: TourStepPosition;
  /** Only show on screens < 1024px */
  mobileOnly?: boolean;
  /** Only show on screens >= 1024px */
  desktopOnly?: boolean;
};

export const TOUR_STEPS: TourStep[] = [
  // 1. $SCOUT Balance — different target per device
  {
    targetSelector: '[data-tour-id="sidebar-wallet"]',
    title: 'Dein Guthaben',
    description: 'Hier siehst du dein $SCOUT-Guthaben. Verdiene $SCOUT durch Trading, Fantasy-Turniere und Analysen.',
    position: 'right',
    desktopOnly: true,
  },
  {
    targetSelector: '[data-tour-id="topbar-balance"]',
    title: 'Dein Guthaben',
    description: 'Hier siehst du dein $SCOUT-Guthaben. Verdiene $SCOUT durch Trading, Fantasy und Analysen.',
    position: 'bottom',
    mobileOnly: true,
  },

  // 2. Global Search — desktop only
  {
    targetSelector: '[data-tour-id="topbar-search"]',
    title: 'Globale Suche',
    description: 'Finde Spieler, Research und andere Nutzer mit der Suche.',
    position: 'bottom',
    desktopOnly: true,
  },

  // 3. Notifications
  {
    targetSelector: '[data-tour-id="topbar-notifications"]',
    title: 'Benachrichtigungen',
    description: 'Trades, Fantasy-Ergebnisse und Community-Updates — alles auf einen Blick.',
    position: 'bottom',
  },

  // 4. Dashboard Stats
  {
    targetSelector: '[data-tour-id="home-stats"]',
    title: 'Dein Dashboard',
    description: 'Kader-Wert, P&L, Guthaben und Scout Score — deine wichtigsten Kennzahlen.',
    position: 'bottom',
  },

  // 5. Three Perspectives
  {
    targetSelector: '[data-tour-id="home-tabs"]',
    title: 'Drei Perspektiven',
    description: '"Mein Stand" zeigt dein Portfolio, "Aktuell" den Markt und "Entdecken" neue Chancen.',
    position: 'bottom',
  },

  // 6. Manager Office / Market — different target per device
  {
    targetSelector: '[data-tour-id="nav-market"]',
    title: 'Manager Office',
    description: 'Kaufe und verkaufe Digital Player Cards, verwalte dein Portfolio und finde IPOs.',
    position: 'right',
    desktopOnly: true,
  },
  {
    targetSelector: '[data-tour-id="bottomnav-market"]',
    title: 'Manager Office',
    description: 'Kaufe und verkaufe Digital Player Cards und verwalte dein Portfolio.',
    position: 'top',
    mobileOnly: true,
  },

  // 7. Fantasy — different target per device
  {
    targetSelector: '[data-tour-id="nav-fantasy"]',
    title: 'Fantasy Events',
    description: 'Stelle dein Lineup auf, tritt gegen andere an und gewinne $SCOUT-Preisgelder!',
    position: 'right',
    desktopOnly: true,
  },
  {
    targetSelector: '[data-tour-id="bottomnav-fantasy"]',
    title: 'Fantasy Events',
    description: 'Stelle dein Lineup auf, tritt gegen andere an und gewinne $SCOUT-Preisgelder!',
    position: 'top',
    mobileOnly: true,
  },
];
