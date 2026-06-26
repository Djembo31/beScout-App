import { useReducer, useCallback } from 'react';
import { centsToBsd, bsdToCents } from '@/lib/services/players';
import { EDITABLE_FIELDS } from '@/lib/services/events';
import type { DbEvent, LineupRule, PlayerPositionCode } from '@/types';
import type { EventFormState, EventFormAction, AdminEvent } from './types';
import { INITIAL_FORM_STATE } from './types';

// =============================================================================
// lineup_rules (Slice 385/386, E-3, D107) — flache Form-Felder <-> JSONB-Regel-Liste
// Das Form hält je Regel-Art EIN flaches Feld (minPerOwnClub, ageMin, ageMax);
// `rulesFromForm` serialisiert ALLE gesetzten Felder in die generische Liste
// (kein gegenseitiger Verlust). Multi-Regel-Builder mit Treffer-Anzeige = E-4.
// =============================================================================

/** Liest den Wert einer (positions-losen) Zahl-Regel aus der Liste ('' = keine). */
function ruleValueFromRules(
  rules: LineupRule[] | null | undefined,
  type: 'min_per_own_club' | 'age_min' | 'age_max' | 'max_per_nation',
): string {
  const rule = (rules ?? []).find(r => r.type === type);
  return rule && 'value' in rule ? String(rule.value) : '';
}

/** Liest die nation_in-Whitelist (ISO-Codes) aus der Liste ([] = keine). Slice 392. */
function nationInFromRules(rules: LineupRule[] | null | undefined): string[] {
  const rule = (rules ?? []).find(r => r.type === 'nation_in');
  return rule && 'values' in rule ? rule.values : [];
}

/** Liest den Wert einer positions-geschlüsselten Regel (min/max_per_position) für eine Position ('' = keine). */
function posRuleValueFromRules(
  rules: LineupRule[] | null | undefined,
  type: 'min_per_position' | 'max_per_position',
  position: PlayerPositionCode,
): string {
  const rule = (rules ?? []).find(r => r.type === type && 'position' in r && r.position === position);
  return rule && 'value' in rule ? String(rule.value) : '';
}

/** Liest einen mv-Deckel/Floor (mv_max_eur/mv_min_eur) als Millionen-String ('' = keine). DB-Wert ist EUR (Slice 389/390). */
function mvMillionsFromRules(rules: LineupRule[] | null | undefined, type: 'mv_max_eur' | 'mv_min_eur'): string {
  const rule = (rules ?? []).find(r => r.type === type);
  return rule && 'value' in rule ? String(rule.value / 1_000_000) : '';
}

/** Serialisiert die flachen Form-Felder in die lineup_rules-Liste (null = keine Regel). */
function rulesFromForm(fields: {
  minPerOwnClub: string; ageMin: string; ageMax: string;
  minPosGk: string; minPosDef: string; minPosMid: string; minPosAtt: string;
  maxPosGk: string; maxPosDef: string; maxPosMid: string; maxPosAtt: string;
  mvMaxMillions: string; mvMinMillions: string;
  nationIn: string[]; maxPerNation: string;
}): LineupRule[] | null {
  const rules: LineupRule[] = [];
  const pushVal = (type: 'min_per_own_club' | 'age_min' | 'age_max' | 'max_per_nation', raw: string) => {
    const n = parseInt(raw, 10);
    if (raw && !Number.isNaN(n) && n >= 1) rules.push({ type, value: n });
  };
  const pushPos = (type: 'min_per_position' | 'max_per_position', position: PlayerPositionCode, raw: string) => {
    const n = parseInt(raw, 10);
    if (raw && !Number.isNaN(n) && n >= 1) rules.push({ type, position, value: n });
  };
  // Slice 389/390: Admin gibt Millionen ein, DB speichert EUR-Ganzzahl. parseFloat (0,5 Mio möglich), Math.round gegen Float-Staub.
  const pushMv = (type: 'mv_max_eur' | 'mv_min_eur', raw: string) => {
    const m = parseFloat(raw);
    if (raw && !Number.isNaN(m) && m > 0) rules.push({ type, value: Math.round(m * 1_000_000) });
  };
  pushVal('min_per_own_club', fields.minPerOwnClub);
  pushVal('age_min', fields.ageMin);
  pushVal('age_max', fields.ageMax);
  pushPos('min_per_position', 'GK', fields.minPosGk);
  pushPos('min_per_position', 'DEF', fields.minPosDef);
  pushPos('min_per_position', 'MID', fields.minPosMid);
  pushPos('min_per_position', 'ATT', fields.minPosAtt);
  pushPos('max_per_position', 'GK', fields.maxPosGk);
  pushPos('max_per_position', 'DEF', fields.maxPosDef);
  pushPos('max_per_position', 'MID', fields.maxPosMid);
  pushPos('max_per_position', 'ATT', fields.maxPosAtt);
  pushMv('mv_max_eur', fields.mvMaxMillions);
  pushMv('mv_min_eur', fields.mvMinMillions);
  pushVal('max_per_nation', fields.maxPerNation);
  // nation_in: Array-Wert (Slice 392). Nur serialisieren wenn min. eine Nation gewählt.
  if (fields.nationIn.length > 0) rules.push({ type: 'nation_in', values: fields.nationIn });
  return rules.length > 0 ? rules : null;
}

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
    leagueId: event.league_id ?? '',
    type: event.type,
    format: event.format,
    eventTier: event.event_tier ?? 'club',
    minSubTier: event.min_subscription_tier ?? '',
    salaryCap: event.salary_cap != null ? String(centsToBsd(event.salary_cap)) : '',
    maxPerClub: event.max_per_club != null ? String(event.max_per_club) : '',
    minPerOwnClub: ruleValueFromRules(event.lineup_rules, 'min_per_own_club'),
    ageMin: ruleValueFromRules(event.lineup_rules, 'age_min'),
    ageMax: ruleValueFromRules(event.lineup_rules, 'age_max'),
    minPosGk: posRuleValueFromRules(event.lineup_rules, 'min_per_position', 'GK'),
    minPosDef: posRuleValueFromRules(event.lineup_rules, 'min_per_position', 'DEF'),
    minPosMid: posRuleValueFromRules(event.lineup_rules, 'min_per_position', 'MID'),
    minPosAtt: posRuleValueFromRules(event.lineup_rules, 'min_per_position', 'ATT'),
    maxPosGk: posRuleValueFromRules(event.lineup_rules, 'max_per_position', 'GK'),
    maxPosDef: posRuleValueFromRules(event.lineup_rules, 'max_per_position', 'DEF'),
    maxPosMid: posRuleValueFromRules(event.lineup_rules, 'max_per_position', 'MID'),
    maxPosAtt: posRuleValueFromRules(event.lineup_rules, 'max_per_position', 'ATT'),
    mvMaxMillions: mvMillionsFromRules(event.lineup_rules, 'mv_max_eur'),
    mvMinMillions: mvMillionsFromRules(event.lineup_rules, 'mv_min_eur'),
    nationIn: nationInFromRules(event.lineup_rules),
    maxPerNation: ruleValueFromRules(event.lineup_rules, 'max_per_nation'),
    requiresFollow: event.requires_follow ?? false,
    minFanRankTier: event.min_fan_rank_tier ?? '',
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
        leagueId: form.leagueId || null,
        createdBy: overrides?.createdBy ?? '',
        sponsorName: form.type === 'sponsor' ? form.sponsorName : undefined,
        sponsorLogo: form.type === 'sponsor' ? form.sponsorLogo : undefined,
        eventTier: form.eventTier,
        minSubscriptionTier: form.minSubTier || null,
        salaryCap: form.salaryCap ? bsdToCents(parseFloat(form.salaryCap) || 0) : null,
        maxPerClub: form.maxPerClub ? (parseInt(form.maxPerClub) || null) : null,
        lineupRules: rulesFromForm(form),
        requiresFollow: form.requiresFollow,
        minFanRankTier: form.minFanRankTier || null,
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
      maybePut('league_id', form.leagueId || null);
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
      maybePut('max_per_club', form.maxPerClub
        ? (parseInt(form.maxPerClub) || null)
        : null);
      maybePut('lineup_rules', rulesFromForm(form));
      maybePut('requires_follow', form.requiresFollow);
      maybePut('min_fan_rank_tier', form.minFanRankTier || null);
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
