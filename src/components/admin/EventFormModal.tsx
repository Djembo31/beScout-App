'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Dialog, Button } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { bsdToCents } from '@/lib/services/players';
import { PAID_FANTASY_ENABLED } from '@/lib/featureFlags';
import {
  getActiveLeagues,
  subscribeLeagueCache,
  getLeagueCacheVersion,
  initLeagueCache,
} from '@/lib/leagues';
import RewardStructureEditor from './RewardStructureEditor';
import { INPUT_CLS, SELECT_CLS } from './hooks/types';
import type { EventFormState } from './hooks/types';
import type { DbClub, EventCurrency } from '@/types';

/** Labels for all visible strings — passed by consumer for i18n support */
export interface EventFormLabels {
  name: string;
  namePlaceholder: string;
  club?: string;
  clubGlobal?: string;
  league?: string;           // Slice 380 (E-1): Fußball-Liga-Bindung (nur wenn gesetzt = Picker sichtbar)
  leagueOpen?: string;       // Slice 380 (E-1): "Offen / alle Ligen"-Option
  type: string;
  format: string;
  format7: string;
  format11: string;
  eventTier: string;
  tierArena: string;
  tierClub: string;
  tierUser?: string;         // Platform-only (Club admin has no User tier)
  minSub: string;
  minSubNone: string;
  minSubBronze: string;
  minSubSilber: string;
  minSubGold: string;
  salaryCap: string;
  salaryCapPlaceholder: string;
  salaryCapHint?: string;
  maxPerClub: string;          // Slice 195c: FPL-Style Max-Spieler-pro-Verein
  maxPerClubPlaceholder: string;
  maxPerClubHint?: string;
  minPerOwnClub?: string;      // Slice 385 (E-3a): min. Spieler aus dem Event-Verein
  minPerOwnClubPlaceholder?: string;
  minPerOwnClubHint?: string;
  ageMin?: string;             // Slice 386 (E-3): min. Alter jedes aufgestellten Spielers
  ageMinPlaceholder?: string;
  ageMinHint?: string;
  ageMax?: string;             // Slice 386 (E-3): max. Alter jedes aufgestellten Spielers
  ageMaxPlaceholder?: string;
  ageMaxHint?: string;
  // Slice 384 (E-3 Türsteher) — nur bei Vereins-Events wirksam
  requiresFollow?: string;     // Follower-Pflicht-Toggle
  minFanRank?: string;         // Mindest-Fan-Rang-Select
  minFanRankNone?: string;
  minFanRankStammgast?: string;
  minFanRankUltra?: string;
  minFanRankLegende?: string;
  minFanRankEhrenmitglied?: string;
  minFanRankVereinsikone?: string;
  gateHint?: string;           // "Nur bei Vereins-Events wirksam"
  minScPerSlot?: string;     // Platform-only
  wildcardsAllowed?: string; // Platform-only
  maxWildcards?: string;     // Platform-only
  isLigaEvent?: string;      // Platform-only
  gameweek: string;
  gameweekPlaceholder: string;
  maxEntries: string;
  entryFee: string;
  prizePool: string;
  currency: string;
  currencyTickets: string;
  startTime: string;
  lockTime: string;
  endTime: string;
  sponsorSection: string;
  sponsorName: string;
  sponsorNamePlaceholder: string;
  sponsorLogo: string;
  feePreview: string;
  prizePreview: string;
  free: string;
}

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  form: EventFormState;
  setField: <K extends keyof EventFormState>(field: K, value: EventFormState[K]) => void;
  onSubmit: () => void;
  saving: boolean;
  isFieldDisabled: (field: string) => boolean;
  isRewardEditorDisabled: boolean;
  title: string;
  submitLabel: string;
  labels: EventFormLabels;
  size?: 'default' | 'lg';
  /** Platform-only: show club selector when provided */
  clubs?: DbClub[];
  /** Feature flag for $SCOUT currency option */
  scoutEventsEnabled: boolean;
}

export function EventFormModal({
  open,
  onClose,
  form,
  setField,
  onSubmit,
  saving,
  isFieldDisabled,
  isRewardEditorDisabled,
  title,
  submitLabel,
  labels,
  size = 'lg',
  clubs,
  scoutEventsEnabled,
}: EventFormModalProps) {
  const L = labels;
  const prizePoolCents = bsdToCents(parseFloat(form.prizePool) || 0);
  const disabledCls = 'disabled:opacity-40 disabled:cursor-not-allowed';

  // Slice 380 (E-1): Liga-Liste reaktiv aus dem Cache (S286-Pattern, cold-load-safe).
  useEffect(() => { void initLeagueCache(); }, []);
  useSyncExternalStore(subscribeLeagueCache, getLeagueCacheVersion, getLeagueCacheVersion);
  const activeLeagues = getActiveLeagues();

  return (
    <Dialog open={open} title={title} onClose={onClose} size={size === 'default' ? 'md' : 'lg'}>
      <div className="space-y-4 p-4 md:p-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">{L.name}</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField('name', e.target.value.slice(0, 60))}
            placeholder={L.namePlaceholder}
            disabled={isFieldDisabled('name')}
            aria-label={L.namePlaceholder}
            className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
          />
        </div>

        {/* Club (Platform-only) */}
        {clubs && L.club && (
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.club}</label>
            <select
              value={form.clubId}
              onChange={(e) => setField('clubId', e.target.value)}
              disabled={isFieldDisabled('club_id')}
              aria-label={L.club}
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="">{L.clubGlobal ?? 'Global'}</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Liga-Bindung (Slice 380 / E-1) — nur wenn Label gesetzt (Platform-Admin) */}
        {L.league && (
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.league}</label>
            <select
              value={form.leagueId}
              onChange={(e) => setField('leagueId', e.target.value)}
              disabled={isFieldDisabled('league_id')}
              aria-label={L.league}
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="">{L.leagueOpen ?? 'Offen / alle Ligen'}</option>
              {activeLeagues.map(lg => (
                <option key={lg.id} value={lg.id}>{lg.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Type + Format */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.type}</label>
            <select
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
              disabled={isFieldDisabled('type')}
              aria-label={L.type}
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="bescout">BeScout</option>
              <option value="club">Club</option>
              <option value="sponsor">Sponsor</option>
              <option value="special">Special</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.format}</label>
            <select
              value={form.format}
              onChange={(e) => setField('format', e.target.value)}
              disabled={isFieldDisabled('format')}
              aria-label={L.format}
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="7er">{L.format7}</option>
              <option value="11er">{L.format11}</option>
            </select>
          </div>
        </div>

        {/* Event Tier + Min Sub */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.eventTier}</label>
            <select
              value={form.eventTier}
              onChange={(e) => setField('eventTier', e.target.value as 'arena' | 'club' | 'user')}
              disabled={isFieldDisabled('event_tier')}
              aria-label={L.eventTier}
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="arena">{L.tierArena}</option>
              <option value="club">{L.tierClub}</option>
              {L.tierUser && <option value="user">{L.tierUser}</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.minSub}</label>
            <select
              value={form.minSubTier}
              onChange={(e) => setField('minSubTier', e.target.value)}
              disabled={isFieldDisabled('min_subscription_tier')}
              aria-label={L.minSub}
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="">{L.minSubNone}</option>
              <option value="bronze">{L.minSubBronze}</option>
              <option value="silber">{L.minSubSilber}</option>
              <option value="gold">{L.minSubGold}</option>
            </select>
          </div>
        </div>

        {/* Türsteher: Follower-Pflicht + Fan-Rang (Slice 384 / E-3) — nur bei Vereins-Events wirksam */}
        {(L.requiresFollow || L.minFanRank) && (
          <div className="space-y-3 p-3 bg-white/[0.02] border border-white/10 rounded-xl">
            {L.requiresFollow && (
              <div className="flex items-center gap-2 min-h-[44px]">
                <input
                  type="checkbox"
                  id="formRequiresFollow"
                  checked={form.requiresFollow}
                  onChange={(e) => setField('requiresFollow', e.target.checked)}
                  disabled={isFieldDisabled('requires_follow')}
                  className="w-4 h-4 accent-gold rounded"
                />
                <label htmlFor="formRequiresFollow" className="text-sm font-bold text-white/70">
                  {L.requiresFollow}
                </label>
              </div>
            )}
            {L.minFanRank && (
              <div>
                <label htmlFor="formMinFanRank" className="block text-sm font-bold text-white/70 mb-1">
                  {L.minFanRank}
                </label>
                <select
                  id="formMinFanRank"
                  value={form.minFanRankTier}
                  onChange={(e) => setField('minFanRankTier', e.target.value)}
                  disabled={isFieldDisabled('min_fan_rank_tier')}
                  aria-label={L.minFanRank}
                  className={cn(SELECT_CLS, disabledCls)}
                >
                  <option value="">{L.minFanRankNone}</option>
                  <option value="stammgast">{L.minFanRankStammgast}</option>
                  <option value="ultra">{L.minFanRankUltra}</option>
                  <option value="legende">{L.minFanRankLegende}</option>
                  <option value="ehrenmitglied">{L.minFanRankEhrenmitglied}</option>
                  <option value="vereinsikone">{L.minFanRankVereinsikone}</option>
                </select>
              </div>
            )}
            {L.gateHint && <p className="text-[10px] text-white/40">{L.gateHint}</p>}
          </div>
        )}

        {/* Salary Cap */}
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">{L.salaryCap}</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={form.salaryCap}
            onChange={(e) => setField('salaryCap', e.target.value)}
            placeholder={L.salaryCapPlaceholder}
            disabled={isFieldDisabled('salary_cap')}
            aria-label={L.salaryCap}
            className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
          />
          {L.salaryCapHint && form.salaryCap && (
            <p className="mt-1 text-[10px] text-white/40">{L.salaryCapHint}</p>
          )}
        </div>

        {/* Max Spieler pro Verein (Slice 195c — FPL-Style) */}
        <div>
          <label htmlFor="formMaxPerClub" className="block text-sm font-bold text-white/70 mb-1">
            {L.maxPerClub}
          </label>
          <input
            id="formMaxPerClub"
            type="number"
            inputMode="numeric"
            min="1"
            max="11"
            value={form.maxPerClub}
            onChange={(e) => setField('maxPerClub', e.target.value)}
            placeholder={L.maxPerClubPlaceholder}
            disabled={isFieldDisabled('max_per_club')}
            aria-label={L.maxPerClub}
            className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
          />
          {L.maxPerClubHint && (
            <p className="mt-1 text-[10px] text-white/40">{L.maxPerClubHint}</p>
          )}
        </div>

        {/* Min Spieler vom eigenen Verein (Slice 385 — E-3a, Aufstellungs-Regel) */}
        {L.minPerOwnClub && (
          <div>
            <label htmlFor="formMinPerOwnClub" className="block text-sm font-bold text-white/70 mb-1">
              {L.minPerOwnClub}
            </label>
            <input
              id="formMinPerOwnClub"
              type="number"
              inputMode="numeric"
              min="1"
              max="11"
              value={form.minPerOwnClub}
              onChange={(e) => setField('minPerOwnClub', e.target.value)}
              placeholder={L.minPerOwnClubPlaceholder}
              disabled={isFieldDisabled('lineup_rules')}
              aria-label={L.minPerOwnClub}
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
            {L.minPerOwnClubHint && (
              <p className="mt-1 text-[10px] text-white/40">{L.minPerOwnClubHint}</p>
            )}
          </div>
        )}

        {/* Alters-Fenster (Slice 386 — E-3 Aufstellungs-Regel, Starter + Bank) */}
        {L.ageMax && (
          <div>
            <label htmlFor="formAgeMax" className="block text-sm font-bold text-white/70 mb-1">
              {L.ageMax}
            </label>
            <input
              id="formAgeMax"
              type="number"
              inputMode="numeric"
              min="14"
              max="50"
              value={form.ageMax}
              onChange={(e) => setField('ageMax', e.target.value)}
              placeholder={L.ageMaxPlaceholder}
              disabled={isFieldDisabled('lineup_rules')}
              aria-label={L.ageMax}
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
            {L.ageMaxHint && (
              <p className="mt-1 text-[10px] text-white/40">{L.ageMaxHint}</p>
            )}
          </div>
        )}

        {L.ageMin && (
          <div>
            <label htmlFor="formAgeMin" className="block text-sm font-bold text-white/70 mb-1">
              {L.ageMin}
            </label>
            <input
              id="formAgeMin"
              type="number"
              inputMode="numeric"
              min="14"
              max="50"
              value={form.ageMin}
              onChange={(e) => setField('ageMin', e.target.value)}
              placeholder={L.ageMinPlaceholder}
              disabled={isFieldDisabled('lineup_rules')}
              aria-label={L.ageMin}
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
            {L.ageMinHint && (
              <p className="mt-1 text-[10px] text-white/40">{L.ageMinHint}</p>
            )}
          </div>
        )}

        {/* Min SC per Slot (Platform-only) */}
        {L.minScPerSlot && (
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.minScPerSlot}</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="10"
              value={form.minScPerSlot}
              onChange={(e) => setField('minScPerSlot', e.target.value)}
              placeholder="1"
              disabled={isFieldDisabled('min_sc_per_slot')}
              aria-label={L.minScPerSlot}
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
          </div>
        )}

        {/* Wild Cards (Platform-only) */}
        {L.wildcardsAllowed && (
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex items-center gap-2 min-h-[44px]">
              <input
                type="checkbox"
                id="formWildcardsAllowed"
                checked={form.wildcardsAllowed}
                onChange={(e) => setField('wildcardsAllowed', e.target.checked)}
                disabled={isFieldDisabled('wildcards_allowed')}
                className="w-4 h-4 accent-gold rounded"
              />
              <label htmlFor="formWildcardsAllowed" className="text-sm font-bold text-white/70">
                {L.wildcardsAllowed}
              </label>
            </div>
            {form.wildcardsAllowed && L.maxWildcards && (
              <div>
                <label className="block text-sm font-bold text-white/70 mb-1">{L.maxWildcards}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="11"
                  value={form.maxWildcards}
                  onChange={(e) => setField('maxWildcards', e.target.value)}
                  placeholder="3"
                  disabled={isFieldDisabled('max_wildcards_per_lineup')}
                  aria-label={L.maxWildcards}
                  className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
                />
              </div>
            )}
          </div>
        )}

        {/* BeScout Liga Event (Platform-only) */}
        {L.isLigaEvent && (
          <div className="flex items-center gap-2 min-h-[44px]">
            <input
              type="checkbox"
              id="formIsLigaEvent"
              checked={form.isLigaEvent}
              onChange={(e) => setField('isLigaEvent', e.target.checked)}
              disabled={isFieldDisabled('is_liga_event')}
              className="w-4 h-4 accent-gold rounded"
            />
            <label htmlFor="formIsLigaEvent" className="text-sm font-bold text-gold">
              {L.isLigaEvent}
            </label>
          </div>
        )}

        {/* Gameweek + Max Entries */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.gameweek}</label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="38"
              value={form.gameweek}
              onChange={(e) => setField('gameweek', e.target.value)}
              placeholder={L.gameweekPlaceholder}
              disabled={isFieldDisabled('gameweek')}
              aria-label={L.gameweek}
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.maxEntries}</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={form.maxEntries}
              onChange={(e) => setField('maxEntries', e.target.value)}
              disabled={isFieldDisabled('max_entries')}
              aria-label={L.maxEntries}
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
          </div>
        </div>

        {/* Entry Fee + Prize Pool */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.entryFee}</label>
            <input
              type="number"
              inputMode="numeric"
              step="0.01"
              min="0"
              value={form.entryFee}
              onChange={(e) => setField('entryFee', e.target.value)}
              disabled={isFieldDisabled('entry_fee')}
              aria-label={L.entryFee}
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">{L.prizePool}</label>
            <input
              type="number"
              inputMode="numeric"
              step="0.01"
              min="0"
              value={form.prizePool}
              onChange={(e) => setField('prizePool', e.target.value)}
              disabled={isFieldDisabled('prize_pool')}
              aria-label={L.prizePool}
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
          </div>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">{L.currency}</label>
          <select
            value={form.currency}
            onChange={(e) => setField('currency', e.target.value as EventCurrency)}
            disabled={isFieldDisabled('currency')}
            aria-label={L.currency}
            className={cn(SELECT_CLS, disabledCls)}
          >
            <option value="tickets">{L.currencyTickets}</option>
            {/* AR-31 (J4): $SCOUT-currency nur in Phase 4 (PAID_FANTASY_ENABLED=true).
                Admin-Toggle `scoutEventsEnabled` bleibt als DB-Flag, aber die Option
                wird erst mit PAID_FANTASY_ENABLED live. */}
            {scoutEventsEnabled && PAID_FANTASY_ENABLED && <option value="scout">$SCOUT</option>}
          </select>
        </div>

        {/* Reward Structure */}
        <RewardStructureEditor
          value={form.rewardStructure}
          onChange={(tiers) => setField('rewardStructure', tiers)}
          prizePool={prizePoolCents}
          disabled={isRewardEditorDisabled}
        />

        {/* Start / Lock / End times */}
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">{L.startTime}</label>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setField('startsAt', e.target.value)}
            disabled={isFieldDisabled('starts_at')}
            aria-label={L.startTime}
            className={cn(INPUT_CLS, 'min-h-[44px] text-white [color-scheme:dark]', disabledCls)}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">{L.lockTime}</label>
          <input
            type="datetime-local"
            value={form.locksAt}
            onChange={(e) => setField('locksAt', e.target.value)}
            disabled={isFieldDisabled('locks_at')}
            aria-label={L.lockTime}
            className={cn(INPUT_CLS, 'min-h-[44px] text-white [color-scheme:dark]', disabledCls)}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">{L.endTime}</label>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setField('endsAt', e.target.value)}
            disabled={isFieldDisabled('ends_at')}
            aria-label={L.endTime}
            className={cn(INPUT_CLS, 'min-h-[44px] text-white [color-scheme:dark]', disabledCls)}
          />
        </div>

        {/* Sponsor fields (conditional) */}
        {form.type === 'sponsor' && (
          <div className="space-y-3 p-3 bg-gold/5 border border-gold/15 rounded-xl">
            <div className="text-xs font-bold text-gold/70 uppercase">{L.sponsorSection}</div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{L.sponsorName}</label>
              <input
                type="text"
                value={form.sponsorName}
                onChange={(e) => setField('sponsorName', e.target.value.slice(0, 40))}
                placeholder={L.sponsorNamePlaceholder}
                disabled={isFieldDisabled('sponsor_name')}
                aria-label={L.sponsorName}
                className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">{L.sponsorLogo}</label>
              <input
                type="url"
                value={form.sponsorLogo}
                onChange={(e) => setField('sponsorLogo', e.target.value)}
                placeholder="https://..."
                disabled={isFieldDisabled('sponsor_logo')}
                aria-label={L.sponsorLogo}
                className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {form.name && form.startsAt && (
          <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/50">{L.feePreview}</span>
              <span className="font-mono font-bold tabular-nums">
                {parseFloat(form.entryFee) > 0 ? `${fmtScout(parseFloat(form.entryFee))} CR` : L.free}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">{L.prizePreview}</span>
              <span className="font-mono font-bold text-gold tabular-nums">
                {fmtScout(parseFloat(form.prizePool) || 0)} CR
              </span>
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          variant="gold"
          fullWidth
          onClick={onSubmit}
          disabled={saving || !form.name || !form.startsAt || !form.locksAt || !form.endsAt}
          loading={saving}
          aria-label={submitLabel}
        >
          {submitLabel}
        </Button>
      </div>
    </Dialog>
  );
}
