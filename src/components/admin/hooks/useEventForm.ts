import { useReducer, useCallback } from 'react';
import { centsToBsd, bsdToCents } from '@/lib/services/players';
import { EDITABLE_FIELDS } from '@/lib/services/events';
import type { DbEvent } from '@/types';
import type { EventFormState, EventFormAction, AdminEvent } from './types';
import { INITIAL_FORM_STATE } from './types';

// =============================================================================
// Helpers (internal)
// =============================================================================

/** Convert ISO date string to datetime-local input value */
function toDatetimeLocal(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

/** Populate form state from a DbEvent (edit mode) */
function populateFromEvent(event: DbEvent): EventFormState {
  return {
    name: event.name,
    clubId: event.club_id ?? '',
    type: event.type,
    format: event.format,
    eventTier: event.event_tier ?? 'club',
    minSubTier: event.min_subscription_tier ?? '',
    salaryCap: event.salary_cap != null ? String(centsToBsd(event.salary_cap)) : '',
    minScPerSlot: String(event.min_sc_per_slot ?? 1),
    wildcardsAllowed: event.wildcards_allowed ?? false,
    maxWildcards: String(event.max_wildcards_per_lineup ?? 0),
    gameweek: event.gameweek != null ? String(event.gameweek) : '',
    maxEntries: event.max_entries != null ? String(event.max_entries) : '0',
    entryFee: String(centsToBsd(event.entry_fee)),
    prizePool: String(centsToBsd(event.prize_pool)),
    rewardStructure: event.reward_structure ?? null,
    startsAt: event.starts_at ? toDatetimeLocal(event.starts_at) : '',
    locksAt: event.locks_at ? toDatetimeLocal(event.locks_at) : '',
    endsAt: event.ends_at ? toDatetimeLocal(event.ends_at) : '',
    sponsorName: event.sponsor_name ?? '',
    sponsorLogo: event.sponsor_logo ?? '',
    currency: event.currency ?? 'tickets',
    isLigaEvent: event.is_liga_event ?? false,
  };
}

/** Clone form state from a DbEvent (clear dates + sponsor, append suffix to name) */
function cloneFromEvent(event: DbEvent, suffix: string): EventFormState {
  const populated = populateFromEvent(event);
  return {
    ...populated,
    name: `${event.name} (${suffix})`,
    startsAt: '',
    locksAt: '',
    endsAt: '',
    sponsorName: '',
    sponsorLogo: '',
  };
}

// =============================================================================
// Reducer
// =============================================================================

function formReducer(state: EventFormState, action: EventFormAction): EventFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return { ...INITIAL_FORM_STATE };
    case 'RESET_WITH_DEFAULTS':
      return { ...INITIAL_FORM_STATE, ...action.defaults };
    case 'POPULATE':
      return populateFromEvent(action.event);
    case 'CLONE':
      return cloneFromEvent(action.event, action.suffix);
    default:
      return state;
  }
}

// =============================================================================
// Hook
// =============================================================================

export function useEventForm(initialDefaults?: Partial<EventFormState>) {
  const initialState = initialDefaults
    ? { ...INITIAL_FORM_STATE, ...initialDefaults }
    : INITIAL_FORM_STATE;

  const [form, dispatch] = useReducer(formReducer, initialState);

  // -- Typed field setter -----------------------------------------------------
  const setField = useCallback(
    <K extends keyof EventFormState>(field: K, value: EventFormState[K]) => {
      dispatch({ type: 'SET_FIELD', field, value: value as EventFormState[keyof EventFormState] });
    },
    [],
  );

  // -- Reset (optionally with partial defaults) -------------------------------
  const reset = useCallback(
    (defaults?: Partial<EventFormState>) => {
      if (defaults) {
        dispatch({ type: 'RESET_WITH_DEFAULTS', defaults });
      } else {
        dispatch({ type: 'RESET' });
      }
    },
    [],
  );

  // -- Populate from DbEvent (edit mode) --------------------------------------
  const populate = useCallback((event: DbEvent) => {
    dispatch({ type: 'POPULATE', event });
  }, []);

  // -- Clone from DbEvent ----------------------------------------------------
  const clone = useCallback((event: DbEvent, suffix: string) => {
    dispatch({ type: 'CLONE', event, suffix });
  }, []);

  // -- Field editability (based on event status + EDITABLE_FIELDS) ------------
  const isFieldDisabled = useCallback(
    (field: string, editingEvent: AdminEvent | null): boolean => {
      if (!editingEvent) return false;
      const allowed = EDITABLE_FIELDS[editingEvent.status] ?? [];
      return !allowed.includes(field);
    },
    [],
  );

  // -- Reward editor disabled (only editable in upcoming/registering) ---------
  const isRewardEditorDisabled = useCallback(
    (editingEvent: AdminEvent | null): boolean => {
      if (!editingEvent) return false;
      return !['upcoming', 'registering'].includes(editingEvent.status);
    },
    [],
  );

  // -- Build create payload (form -> API params, BSD -> cents) -----------------
  const buildCreatePayload = useCallback(
    (overrides?: {
      clubId?: string;
      createdBy?: string;
    }) => {
      return {
        name: form.name,
        type: form.type,
        format: form.format,
        gameweek: parseInt(form.gameweek) || 1,
        entryFeeCents: bsdToCents(parseFloat(form.entryFee) || 0),
        prizePoolCents: bsdToCents(parseFloat(form.prizePool) || 0),
        maxEntries: parseInt(form.maxEntries) || 0,
        startsAt: new Date(form.startsAt).toISOString(),
        locksAt: new Date(form.locksAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        clubId: overrides?.clubId ?? form.clubId,
        createdBy: overrides?.createdBy ?? '',
        sponsorName: form.type === 'sponsor' ? form.sponsorName : undefined,
        sponsorLogo: form.type === 'sponsor' ? form.sponsorLogo : undefined,
        eventTier: form.eventTier,
        minSubscriptionTier: form.minSubTier || null,
        salaryCap: form.salaryCap ? bsdToCents(parseFloat(form.salaryCap) || 0) : null,
        minScPerSlot: parseInt(form.minScPerSlot) || 1,
        wildcardsAllowed: form.wildcardsAllowed,
        maxWildcardsPerLineup: form.wildcardsAllowed
          ? (parseInt(form.maxWildcards) || 0)
          : 0,
        rewardStructure: form.rewardStructure,
        currency: form.currency,
        isLigaEvent: form.isLigaEvent,
      };
    },
    [form],
  );

  // -- Build update payload (only editable fields, BSD -> cents) ---------------
  const buildUpdatePayload = useCallback(
    (editingEvent: AdminEvent): Record<string, unknown> => {
      const payload: Record<string, unknown> = {};
      const maybePut = (key: string, value: unknown) => {
        if (!isFieldDisabled(key, editingEvent)) {
          payload[key] = value;
        }
      };

      maybePut('name', form.name);
      maybePut('type', form.type);
      maybePut('format', form.format);
      maybePut('gameweek', parseInt(form.gameweek) || 1);
      maybePut('entry_fee', bsdToCents(parseFloat(form.entryFee) || 0));
      maybePut('prize_pool', bsdToCents(parseFloat(form.prizePool) || 0));
      maybePut('max_entries', parseInt(form.maxEntries) || null);
      maybePut('starts_at', new Date(form.startsAt).toISOString());
      maybePut('locks_at', new Date(form.locksAt).toISOString());
      maybePut('ends_at', new Date(form.endsAt).toISOString());
      maybePut('sponsor_name', form.type === 'sponsor' ? form.sponsorName : null);
      maybePut('sponsor_logo', form.type === 'sponsor' ? form.sponsorLogo : null);
      maybePut('event_tier', form.eventTier);
      maybePut('min_subscription_tier', form.minSubTier || null);
      maybePut('salary_cap', form.salaryCap
        ? bsdToCents(parseFloat(form.salaryCap) || 0)
        : null);
      maybePut('min_sc_per_slot', parseInt(form.minScPerSlot) || 1);
      maybePut('wildcards_allowed', form.wildcardsAllowed);
      maybePut('max_wildcards_per_lineup', form.wildcardsAllowed
        ? (parseInt(form.maxWildcards) || 0)
        : 0);
      maybePut('reward_structure', form.rewardStructure);
      maybePut('currency', form.currency);
      maybePut('is_liga_event', form.isLigaEvent);

      return payload;
    },
    [form, isFieldDisabled],
  );

  return {
    form,
    dispatch,
    setField,
    reset,
    populate,
    clone,
    isFieldDisabled,
    isRewardEditorDisabled,
    buildCreatePayload,
    buildUpdatePayload,
  };
}
