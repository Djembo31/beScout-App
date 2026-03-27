import type { DbEvent, EventCurrency, RewardTier } from '@/types';

// =============================================================================
// EventFormState — union of all form fields from Platform (21) + Club (17)
// String-typed number fields stay as strings (form input values, converted on submit)
// =============================================================================

export type EventFormState = {
  name: string;
  clubId: string;                          // Platform only
  type: string;
  format: string;
  eventTier: 'arena' | 'club' | 'user';
  minSubTier: string;
  salaryCap: string;
  minScPerSlot: string;                    // Platform only
  wildcardsAllowed: boolean;               // Platform only
  maxWildcards: string;                    // Platform only
  gameweek: string;
  maxEntries: string;
  entryFee: string;
  prizePool: string;
  rewardStructure: RewardTier[] | null;
  startsAt: string;
  locksAt: string;
  endsAt: string;
  sponsorName: string;
  sponsorLogo: string;
  currency: EventCurrency;
};

// =============================================================================
// EventFormAction — discriminated union for useReducer
// =============================================================================

export type EventFormAction =
  | { type: 'SET_FIELD'; field: keyof EventFormState; value: EventFormState[keyof EventFormState] }
  | { type: 'RESET' }
  | { type: 'RESET_WITH_DEFAULTS'; defaults: Partial<EventFormState> }
  | { type: 'POPULATE'; event: DbEvent }
  | { type: 'CLONE'; event: DbEvent; suffix: string };

// =============================================================================
// INITIAL_FORM_STATE — Platform defaults
// =============================================================================

export const INITIAL_FORM_STATE: EventFormState = {
  name: '',
  clubId: '',
  type: 'bescout',
  format: '7er',
  eventTier: 'arena',
  minSubTier: '',
  salaryCap: '',
  minScPerSlot: '1',
  wildcardsAllowed: false,
  maxWildcards: '0',
  gameweek: '',
  maxEntries: '20',
  entryFee: '0',
  prizePool: '0',
  rewardStructure: null,
  startsAt: '',
  locksAt: '',
  endsAt: '',
  sponsorName: '',
  sponsorLogo: '',
  currency: 'tickets',
};

// =============================================================================
// AdminEvent — DbEvent with optional club join (Platform admin view)
// =============================================================================

export type AdminEvent = DbEvent & {
  clubs?: { name: string; slug: string } | null;
};

// =============================================================================
// STATUS_STYLES — bg/border/text per status (labels via i18n, NOT here)
// =============================================================================

export const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  upcoming:    { bg: 'bg-white/5',       border: 'border-white/10',      text: 'text-white/50'   },
  registering: { bg: 'bg-blue-500/15',   border: 'border-blue-400/25',   text: 'text-blue-300'   },
  'late-reg':  { bg: 'bg-purple-500/15', border: 'border-purple-400/25', text: 'text-purple-300' },
  running:     { bg: 'bg-green-500/15',  border: 'border-green-500/25',  text: 'text-green-500'  },
  scoring:     { bg: 'bg-gold/15',       border: 'border-gold/25',       text: 'text-gold'       },
  ended:       { bg: 'bg-white/5',       border: 'border-white/10',      text: 'text-white/40'   },
  cancelled:   { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400'    },
};

// =============================================================================
// SortField + SORT_LABELS — from Platform component
// =============================================================================

export type SortField = 'created_at' | 'current_entries' | 'prize_pool';

export const SORT_LABELS: Record<SortField, string> = {
  created_at: 'Datum',
  current_entries: 'Teilnehmer',
  prize_pool: 'Preisgeld',
};

// =============================================================================
// CSS constants — shared input/select/interactive classes
// =============================================================================

export const INPUT_CLS =
  'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25';

export const SELECT_CLS =
  'w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40 min-h-[44px]';

export const INTERACTIVE =
  'hover:bg-white/[0.05] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50 disabled:opacity-40 disabled:cursor-not-allowed';
