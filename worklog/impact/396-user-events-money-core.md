# Impact — Slice 396 User-Events Geld-Kern (E-4a)

**Quelle:** impact-analyst (2026-06-26), grep-verifiziert. Risk: MEDIUM-HIGH (Money/CEO + latenter 23514-CHECK-Crash + 5-File-Sync-Klasse S330/S359).

## Kern-Erkenntnis: Scope-Schnitt E-4a vs E-4b
Der Backend-Geld-Kern ist sauber additiv. Aber das Hinzufügen von `'user'` zur **DbEvent.type-Union** kaskadiert über `eventMapper.ts:27` zwingend in `EventType` + 2 exhaustive Records (Badge, CategoryCards) = tsc-Zwang. **Das ist UI → E-4b.** Da E-4a keinen Erstell-Button baut (CreateEventModal bleibt Mock, kein DB-Write), existieren **0 User-Events in Prod** → kein kaputtes Badge. Daher:
- **E-4a (jetzt):** DB-Schema/RPCs + nur die **money-relevanten** TS-Syncs (tx-Typen, Topf-Source-Labels, fee_config-Union) — diese MÜSSEN mit, sonst Invariant-Bruch (INV-18/22) bzw. rohe Strings im Topf-Kontoauszug.
- **E-4b (später):** DbEvent.type/EventType-Union + Badge/CategoryCards/Filter/getTypeStyle, CreateEventModal-Verdrahtung, JoinConfirmDialog-Money-Branch, min_entries in Select-Listen, Cache-Invalidierung in Hooks, `creator`-fee_config-Cleanup.

## A) score_event-Consumer — alle unkritisch (additiv safe)
Alle lesen nur `success`/`error`: `scoreEvent()` (`scoring.admin.ts:34-54`), Cron `gameweek-sync/route.ts:1562`, `finalizeGameweek` (`scoring.admin.ts:245`), INV-18-Snapshot (`db-invariants.test.ts:1036`). → additiver user-Zweig bricht keinen Consumer.
- **MUSS-Note (E-4b):** Client-Post-Score-Task `batchRecalculateFanRanks(eventId)` (`scoring.admin.ts:84-124`) ist club-scoped → bei `club_id=NULL` no-oppen. Läuft nur im **client** `scoreEvent()`-Pfad, NICHT im Cron/RPC. Für E-4a (RPC-Settle) irrelevant; bei E-4b-Settle-UI prüfen.

## B) Event-Type-Union → E-4b (siehe oben)
- `DbEvent.type` `src/types/index.ts:756` (heute kein 'user') · `EventType` `src/features/fantasy/types.ts:7` (heute `'creator'`, kein 'user') · Mapper `eventMapper.ts:27` · Records `EventScopeBadge.tsx:26-38`, `EventCategoryCards.tsx:93-99` · `helpers.ts:18` getTypeStyle (hat default) · `EventBrowser.tsx:74`/Filter:24.
- **E-4a berührt davon NUR:** `DbEventFeeConfig.event_type` (`src/types/index.ts:1065`) += `'user'` (kein Kaskaden-Zwang, nur ehrlicher Cast für getEventFeeConfigs).

## C) transactions-type 5-File-Sync (MUSS, E-4a) — S330/S359-Klasse
Neue Typen `event_entry_lock`(B2-Fix!)/`event_entry_charge`/`event_create_fee`:
1. DB `transactions_type_check` (Migration)
2. `ALL_CREDIT_TX_TYPES` `src/lib/transactionTypes.ts:21-55` (heute nur `event_entry_unlock`)
3. `getActivityIcon/Color/LabelKey` `src/lib/activityHelpers.ts:22,61,101` (3 if-Ketten)
4. `de.json`+`tr.json` `activity.*` (3 Keys × 2 Sprachen)
5. INV-18 expected-Snapshot `src/lib/__tests__/db-invariants.test.ts:645-660` (Diff gegen `pg_get_constraintdef`, CI-excluded → latent, bewusst nachziehen)
- `event_create_fee`/`event_entry_charge` = Spend → NICHT in `PUBLIC_TX_TYPES` (Z.76).

## D) treasury-source-Labels (MUSS, E-4a) — Topf-Kontoauszug
Neue Sources `event_create_fee`/`event_entry_fee`:
- DB `platform_treasury_ledger`-source-CHECK (Migration)
- `SOURCE_LABEL_KEY` `AdminTreasuryTab.tsx:64-69` (Fallback `?? source` zeigt sonst rohen String) + i18n `platformPotSrc*` DE/TR. **Vorbild:** `bescout_event:'platformPotSrcBescoutEvent'` (Z.67-68).
- INV-18 prüft platform-source-CHECK NICHT → kein Snapshot-Update nötig.

## E) event_fee_config-Reader
Nur `rpc_lock_event_entry` (DB, money-relevant) + `getEventFeeConfigs` Admin (`platformAdmin.ts:209`, `select('*')` → neue 'user'-Zeile kommt automatisch). `event_fee_config('user')=0/0` korrekt → `fee_split.prize_pool`=voller Eintritt.

## F) scout_events_enabled (B1 global an)
Reader: `events.queries.ts:84` + Admin-Toggle (`BescoutAdminContent.tsx:79`) + `EventFormModal.tsx:742`. **WICHTIG:** Flag-an schaltet nur den **DB-Lock-Pfad** frei. Die Client-UI (`JoinConfirmDialog.tsx:26` Money-Branch, EventFormModal scout-Option) bleibt hinter `PAID_FANTASY_ENABLED=false` versteckt → **E-4b-Frontend-Gap** (Backend kassiert, UI kommuniziert noch nicht). Für E-4a (nur Backend) ok, dokumentiert.

## G) Mock-Pfad — NICHT anfassen (E-4a)
`CreateEventModal.tsx` (Mock-Submit `type:'creator'`, kein DB-Write, hinter `PAID_FANTASY_ENABLED`). **Kein RPC/Service liest `event_fee_config WHERE event_type='creator'`** → orphan-Zeile tot, Cleanup E-4b/E-7.

## H) entry-flow Cache/Realtime (E-4b)
Caller: `lockEventEntry`/`unlockEventEntry`/`cancelEventEntries` (`events.mutations.ts:443/487/511`) via `useEventActions.ts`. **KEINE Realtime-Subscriptions** auf events/event_entries/wallets → manuelle Invalidierung nötig. Nach create/cancel (E-4b-Hooks): `invalidateQueries(['events'])` + `fetch('/api/events?bust=1')` + `invalidateQueries(['wallet'])` (S371).

## I) Backward-Compat
- `events.min_entries` (nullable, additiv): 0 Code-Refs; **3 explizite Select-Listen** (`events.queries.ts:25,38,126`) ohne min_entries → bei UI-Bedarf E-4b (S200-Klasse).
- `prize_pool=0`/`club_id=NULL`/`currency='scout'`: alle Reader null-safe (eventMapper null-guarded, /api/events LEFT-join). **INV-Checks `clubs!inner`** (`db-invariants.test.ts:76,139`) filtern user-Events (club_id NULL) still raus → bewusste Coverage-Lücke (user-Events club-/gameweek-los).

## BUILD-Konsequenz
- **W1** = DB-Schema + tx-5-File-Sync + Topf-Labels + DbEventFeeConfig-Union. Atomar (sonst latente 23514).
- **W2/W3/W4** wie Spec; RPC-Return-Shapes als eigene Typen (NICHT DbEvent → kein EventType-Kaskaden-Zwang).
- Money-Pflicht: PATCH-AUDIT byte-Diff `score_event` nicht-user + 3 Trigger, Live-functiondef vor Edit (D87), force-rollback Zero-Sum.
