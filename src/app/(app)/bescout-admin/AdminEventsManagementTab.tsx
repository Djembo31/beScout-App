'use client';

import { Plus, Search, Calendar, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { useScoutEventsEnabled } from '@/lib/queries/events';
import { AdminEventFeesSection } from './AdminEventFeesSection';

import { useAdminEventsData } from '@/components/admin/hooks/useAdminEventsData';
import { useEventForm } from '@/components/admin/hooks/useEventForm';
import { useAdminEventsActions } from '@/components/admin/hooks/useAdminEventsActions';
import { STATUS_STYLES, INPUT_CLS } from '@/components/admin/hooks/types';

import { EventFilterBar } from '@/components/admin/EventFilterBar';
import { EventSortBar } from '@/components/admin/EventSortBar';
import { EventBulkBar } from '@/components/admin/EventBulkBar';
import { EventRow } from '@/components/admin/EventRow';
import { EventFormModal } from '@/components/admin/EventFormModal';
import type { EventFormLabels } from '@/components/admin/EventFormModal';

// -- Form labels (Platform admin: hardcoded German, matching original) ---------
const FORM_LABELS: EventFormLabels = {
  name: 'Name', namePlaceholder: 'Event-Name',
  club: 'Club', clubGlobal: 'Global (kein Club)',
  type: 'Typ', format: 'Format', format7: '7er', format11: '11er',
  eventTier: 'Event-Tier', tierArena: 'Arena', tierClub: 'Club', tierUser: 'User',
  minSub: 'Min. Abo-Stufe', minSubNone: 'Keine (alle)', minSubBronze: 'Bronze+', minSubSilber: 'Silber+', minSubGold: 'Nur Gold',
  salaryCap: 'Salary Cap', salaryCapPlaceholder: 'Optional',
  minScPerSlot: 'Min SC pro Slot',
  wildcardsAllowed: 'Wild Cards erlaubt', maxWildcards: 'Max Wild Cards',
  gameweek: 'Spieltag', gameweekPlaceholder: '1-38', maxEntries: 'Max. Teilnehmer',
  entryFee: 'Startgebuehr (Credits)', prizePool: 'Preisgeld (Credits)',
  currency: 'Waehrung', currencyTickets: 'Tickets',
  startTime: 'Startzeit', lockTime: 'Lock-Zeit', endTime: 'Endzeit',
  sponsorSection: 'Sponsor-Daten', sponsorName: 'Sponsor-Name', sponsorNamePlaceholder: 'Sponsor-Name', sponsorLogo: 'Sponsor-Logo URL',
  feePreview: 'Startgebuehr', prizePreview: 'Preisgeld', free: 'Kostenlos',
};

// -- Status labels (Platform admin uses HARDCODED German strings, NOT i18n) ----
const ALL_STATUSES = Object.keys(STATUS_STYLES);
const EVENT_TYPES = ['bescout', 'club', 'sponsor', 'special'] as const;

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Geplant',
  registering: 'Registrierung',
  'late-reg': 'Nachmeldung',
  running: 'Live',
  scoring: 'Auswertung',
  ended: 'Beendet',
  cancelled: 'Abgebrochen',
};

// ==============================================================================
// Component
// ==============================================================================

export function AdminEventsManagementTab({ adminId }: { adminId: string }) {
  const t = useTranslations('bescoutAdmin');
  const scoutEventsEnabled = useScoutEventsEnabled();

  // -- Hooks (ALL before any early returns) ------------------------------------
  const data = useAdminEventsData();
  const form = useEventForm();
  const actions = useAdminEventsActions({
    adminId,
    form,
    selected: data.selected,
    bulkStatus: data.bulkStatus,
    clearSelection: data.clearSelection,
    refreshAll: data.refreshAll,
  });

  // ==========================================================================
  // Loading state
  // ==========================================================================
  if (data.loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" />
      </div>
    );
  }

  // ==========================================================================
  // Error state
  // ==========================================================================
  if (data.error && data.events.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-white/40 mb-3">{t('eventsError')}</div>
        <Button
          variant="outline"
          onClick={() => data.fetchEvents()}
          aria-label={t('eventsRetry')}
        >
          {t('eventsRetry')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* ===== 0. EVENT FEE CONFIG ===== */}
      <AdminEventFeesSection adminId={adminId} />

      {/* ===== 1. STATS BAR ===== */}
      {data.stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <div className="text-xs text-white/40 mb-1">{t('eventsStatsActive')}</div>
            <div className="text-xl font-black font-mono tabular-nums">{data.stats.activeCount}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xs text-white/40 mb-1">{t('eventsStatsParticipants')}</div>
            <div className="text-xl font-black font-mono tabular-nums">{data.stats.totalParticipants}</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-xs text-white/40 mb-1">{t('eventsStatsPool')}</div>
            <div className="text-xl font-black font-mono tabular-nums text-gold">
              {fmtScout(centsToBsd(data.stats.totalPool))} <span className="text-xs font-normal text-white/30">Credits</span>
            </div>
          </Card>
        </div>
      )}

      {/* ===== 2. TOOLBAR ===== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Button
          variant="gold"
          onClick={actions.openCreateModal}
          aria-label={t('eventsCreate')}
          className="min-h-[44px]"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('eventsCreate')}
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" aria-hidden="true" />
          <input
            type="text"
            value={data.filters.search}
            onChange={(e) => data.setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder={t('eventsSearch')}
            aria-label={t('eventsSearch')}
            className={cn(INPUT_CLS, 'pl-9 min-h-[44px]')}
          />
        </div>
      </div>

      {/* ===== 3. FILTER BAR ===== */}
      <EventFilterBar
        filters={data.filters}
        setFilters={data.setFilters}
        clubs={data.clubs}
        statusOptions={ALL_STATUSES}
        statusLabels={STATUS_LABELS}
        typeOptions={EVENT_TYPES}
      />

      {/* ===== 4. SORT BAR ===== */}
      <EventSortBar
        sortField={data.sortField}
        sortAsc={data.sortAsc}
        onToggle={data.toggleSort}
        eventCount={data.events.length}
      />

      {/* ===== 5. BULK ACTION BAR ===== */}
      <EventBulkBar
        selectedCount={data.selected.size}
        bulkStatus={data.bulkStatus}
        setBulkStatus={data.setBulkStatus}
        availableTransitions={data.availableBulkTransitions}
        statusLabels={STATUS_LABELS}
        onExecute={actions.handleBulk}
        onClear={data.clearSelection}
        loading={actions.bulkLoading}
        executeLabel={t('eventsBulkExecute')}
      />

      {/* ===== 6. EVENT LIST ===== */}
      {data.sortedEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="size-12 mx-auto mb-4 text-white/20" aria-hidden="true" />
          <div className="text-white/30 mb-3">{t('eventsEmpty')}</div>
          <Button
            variant="gold"
            onClick={actions.openCreateModal}
            aria-label={t('eventsEmptyCta')}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('eventsEmptyCta')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.sortedEvents.map(ev => (
            <EventRow
              key={ev.id}
              event={ev}
              isSelected={data.selected.has(ev.id)}
              onToggleSelect={() => data.toggleSelect(ev.id)}
              onEdit={() => actions.openEditModal(ev)}
              statusLabel={STATUS_LABELS[ev.status] ?? ev.status}
              selectEventLabel={t('eventsSelectEvent')}
              editEventLabel={t('eventsEditEvent')}
            />
          ))}
        </div>
      )}

      {/* ===== 7. CREATE / EDIT MODAL ===== */}
      <EventFormModal
        open={actions.modalOpen}
        onClose={actions.closeModal}
        form={form.form}
        setField={form.setField}
        onSubmit={actions.handleSubmit}
        saving={actions.saving}
        isFieldDisabled={(field) => form.isFieldDisabled(field, actions.editingEvent)}
        isRewardEditorDisabled={form.isRewardEditorDisabled(actions.editingEvent)}
        title={actions.editingEvent ? t('eventsEditEvent') : t('eventsCreate')}
        submitLabel={actions.editingEvent ? t('save') : t('eventsCreate')}
        labels={FORM_LABELS}
        clubs={data.clubs}
        scoutEventsEnabled={scoutEventsEnabled}
        size="lg"
      />
    </div>
  );
}
