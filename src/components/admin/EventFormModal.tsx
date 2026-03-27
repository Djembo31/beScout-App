'use client';

import { Modal, Button } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { bsdToCents } from '@/lib/services/players';
import RewardStructureEditor from './RewardStructureEditor';
import { INPUT_CLS, SELECT_CLS } from './hooks/types';
import type { EventFormState } from './hooks/types';
import type { DbClub, EventCurrency } from '@/types';

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
  size = 'lg',
  clubs,
  scoutEventsEnabled,
}: EventFormModalProps) {
  const prizePoolCents = bsdToCents(parseFloat(form.prizePool) || 0);
  const disabledCls = 'disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <Modal open={open} title={title} onClose={onClose} size={size === 'default' ? 'md' : 'lg'}>
      <div className="space-y-4 p-4 md:p-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField('name', e.target.value.slice(0, 60))}
            placeholder="Event-Name"
            disabled={isFieldDisabled('name')}
            aria-label="Event-Name"
            className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
          />
        </div>

        {/* Club (Platform-only) */}
        {clubs && (
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Club</label>
            <select
              value={form.clubId}
              onChange={(e) => setField('clubId', e.target.value)}
              disabled={isFieldDisabled('club_id')}
              aria-label="Club auswaehlen"
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="">Global (kein Club)</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Type + Format */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Typ</label>
            <select
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
              disabled={isFieldDisabled('type')}
              aria-label="Event-Typ"
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="bescout">BeScout</option>
              <option value="club">Club</option>
              <option value="sponsor">Sponsor</option>
              <option value="special">Special</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Format</label>
            <select
              value={form.format}
              onChange={(e) => setField('format', e.target.value)}
              disabled={isFieldDisabled('format')}
              aria-label="Event-Format"
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="7er">7er</option>
              <option value="11er">11er</option>
            </select>
          </div>
        </div>

        {/* Event Tier + Min Sub */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Event-Tier</label>
            <select
              value={form.eventTier}
              onChange={(e) => setField('eventTier', e.target.value as 'arena' | 'club' | 'user')}
              disabled={isFieldDisabled('event_tier')}
              aria-label="Event-Tier"
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="arena">Arena</option>
              <option value="club">Club</option>
              <option value="user">User</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Min. Abo-Stufe</label>
            <select
              value={form.minSubTier}
              onChange={(e) => setField('minSubTier', e.target.value)}
              disabled={isFieldDisabled('min_subscription_tier')}
              aria-label="Mindest-Abo-Stufe"
              className={cn(SELECT_CLS, disabledCls)}
            >
              <option value="">Keine (alle)</option>
              <option value="bronze">Bronze+</option>
              <option value="silber">Silber+</option>
              <option value="gold">Nur Gold</option>
            </select>
          </div>
        </div>

        {/* Salary Cap */}
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">Salary Cap</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={form.salaryCap}
            onChange={(e) => setField('salaryCap', e.target.value)}
            placeholder="Optional"
            disabled={isFieldDisabled('salary_cap')}
            aria-label="Salary Cap (Credits)"
            className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
          />
        </div>

        {/* Min SC per Slot */}
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">Min SC pro Slot</label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="10"
            value={form.minScPerSlot}
            onChange={(e) => setField('minScPerSlot', e.target.value)}
            placeholder="1"
            disabled={isFieldDisabled('min_sc_per_slot')}
            aria-label="Minimum Scout Cards pro Slot"
            className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
          />
        </div>

        {/* Wild Cards */}
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
              Wild Cards erlaubt
            </label>
          </div>
          {form.wildcardsAllowed && (
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Max Wild Cards</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="11"
                value={form.maxWildcards}
                onChange={(e) => setField('maxWildcards', e.target.value)}
                placeholder="3"
                disabled={isFieldDisabled('max_wildcards_per_lineup')}
                aria-label="Max Wild Cards pro Lineup"
                className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
              />
            </div>
          )}
        </div>

        {/* Gameweek + Max Entries */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Spieltag</label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="38"
              value={form.gameweek}
              onChange={(e) => setField('gameweek', e.target.value)}
              placeholder="1-38"
              disabled={isFieldDisabled('gameweek')}
              aria-label="Spieltag"
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Max. Teilnehmer</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={form.maxEntries}
              onChange={(e) => setField('maxEntries', e.target.value)}
              disabled={isFieldDisabled('max_entries')}
              aria-label="Maximale Teilnehmer"
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
          </div>
        </div>

        {/* Entry Fee + Prize Pool */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Startgebuehr (Credits)</label>
            <input
              type="number"
              inputMode="numeric"
              step="0.01"
              min="0"
              value={form.entryFee}
              onChange={(e) => setField('entryFee', e.target.value)}
              disabled={isFieldDisabled('entry_fee')}
              aria-label="Startgebuehr"
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Preisgeld (Credits)</label>
            <input
              type="number"
              inputMode="numeric"
              step="0.01"
              min="0"
              value={form.prizePool}
              onChange={(e) => setField('prizePool', e.target.value)}
              disabled={isFieldDisabled('prize_pool')}
              aria-label="Preisgeld"
              className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
            />
          </div>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">Waehrung</label>
          <select
            value={form.currency}
            onChange={(e) => setField('currency', e.target.value as EventCurrency)}
            disabled={isFieldDisabled('currency')}
            aria-label="Event-Waehrung"
            className={cn(SELECT_CLS, disabledCls)}
          >
            <option value="tickets">Tickets</option>
            {scoutEventsEnabled && <option value="scout">$SCOUT</option>}
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
          <label className="block text-sm font-bold text-white/70 mb-1">Startzeit</label>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setField('startsAt', e.target.value)}
            disabled={isFieldDisabled('starts_at')}
            aria-label="Startzeit"
            className={cn(INPUT_CLS, 'min-h-[44px] text-white [color-scheme:dark]', disabledCls)}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">Lock-Zeit</label>
          <input
            type="datetime-local"
            value={form.locksAt}
            onChange={(e) => setField('locksAt', e.target.value)}
            disabled={isFieldDisabled('locks_at')}
            aria-label="Lock-Zeit"
            className={cn(INPUT_CLS, 'min-h-[44px] text-white [color-scheme:dark]', disabledCls)}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-white/70 mb-1">Endzeit</label>
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => setField('endsAt', e.target.value)}
            disabled={isFieldDisabled('ends_at')}
            aria-label="Endzeit"
            className={cn(INPUT_CLS, 'min-h-[44px] text-white [color-scheme:dark]', disabledCls)}
          />
        </div>

        {/* Sponsor fields (conditional) */}
        {form.type === 'sponsor' && (
          <div className="space-y-3 p-3 bg-gold/5 border border-gold/15 rounded-xl">
            <div className="text-xs font-bold text-gold/70 uppercase">Sponsor-Daten</div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Sponsor-Name</label>
              <input
                type="text"
                value={form.sponsorName}
                onChange={(e) => setField('sponsorName', e.target.value.slice(0, 40))}
                placeholder="Sponsor-Name"
                disabled={isFieldDisabled('sponsor_name')}
                aria-label="Sponsor-Name"
                className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Sponsor-Logo URL</label>
              <input
                type="url"
                value={form.sponsorLogo}
                onChange={(e) => setField('sponsorLogo', e.target.value)}
                placeholder="https://..."
                disabled={isFieldDisabled('sponsor_logo')}
                aria-label="Sponsor-Logo URL"
                className={cn(INPUT_CLS, 'min-h-[44px]', disabledCls)}
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {form.name && form.startsAt && (
          <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/50">Startgebuehr</span>
              <span className="font-mono font-bold tabular-nums">
                {parseFloat(form.entryFee) > 0 ? `${fmtScout(parseFloat(form.entryFee))} CR` : 'Kostenlos'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Preisgeld</span>
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
    </Modal>
  );
}
