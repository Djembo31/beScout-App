# Tickets x Events — Unified Payment Gateway

**Datum:** 2026-03-21
**Status:** Approved
**Entscheidung:** Ansatz 1 — Unified Payment Gateway (eine RPC, ein Codepfad)

## Zusammenfassung

Events bekommen ein `currency` Feld (`'tickets' | 'scout'`). In der Pilot-Phase laufen alle Events mit Tickets. Nach CASP-Lizenz und BeScout-Admin-Freigabe koennen Events auch mit $SCOUT-Eintritt erstellt werden. Eine einzige RPC (`rpc_lock_event_entry`) handelt beide Waehrungen atomar mit Escrow-Pattern.

## Anforderungen (Anils Worte)

- Pilot = Tickets (Free-to-Play), post-CASP = auch $SCOUT Events
- Pro Event ein `currency` Feld, Admin waehlt bei Erstellung
- `scout` erst nach BeScout-Admin-Freigabe (Feature-Flag)
- Escrow-Pattern: Erst Payment locken, dann Lineup submitten, Rollback bei Fehler
- Prize-Pool immer in $SCOUT, Admin setzt manuell (unabhaengig von Entry-Waehrung)
- Refund: Jederzeit vor `locks_at`, danach kein Refund
- Payout: Immer in $SCOUT auf Gewinner-Wallet (auch bei Ticket-Events)
- Fee-Split bei $SCOUT-Events: Trading-Split (Platform 3.5% + PBT 1.5% + Club 1%)

## Datenmodell

### `events` Tabelle — Aenderungen

| Spalte | Aenderung | Detail |
|--------|-----------|--------|
| `currency` | NEU | `TEXT CHECK ('tickets', 'scout')`, Default `'tickets'` |
| `ticket_cost` | BLEIBT | Einziges Preis-Feld (in Cents der jeweiligen Waehrung) |
| `entry_fee` | DEPRECATED | Wird nicht mehr gelesen, Daten nach `ticket_cost` migriert |
| `prize_pool` | UNVERAENDERT | Immer in $SCOUT Cents |

### Neue Tabelle `event_entries`

| Spalte | Typ | Zweck |
|--------|-----|-------|
| `event_id` | UUID FK → events | Event |
| `user_id` | UUID FK → profiles | Teilnehmer |
| `currency` | TEXT CHECK ('tickets', 'scout') | Zahlungswaehrung |
| `amount_locked` | BIGINT | Betrag der gelockt wurde |
| `fee_split` | JSONB | `{platform, pbt, club}` — nur bei scout |
| `locked_at` | TIMESTAMPTZ | Wann gelockt |
| PK | `(event_id, user_id)` | Unique |

### Neue Tabelle `platform_settings`

| Spalte | Typ | Zweck |
|--------|-----|-------|
| `key` | TEXT PK | Setting-Name |
| `value` | JSONB | Setting-Wert |
| `updated_at` | TIMESTAMPTZ | Letzte Aenderung |

Initialer Eintrag: `scout_events_enabled = false`

## RPC Design

### `rpc_lock_event_entry(p_event_id, p_user_id)`

1. Event existiert, Status IN ('registering', 'late-reg')
2. Capacity Guard: `current_entries < max_entries`
3. Duplikat-Guard: Kein bestehender `event_entries` Eintrag
4. `pg_advisory_xact_lock(user_id, event_id)`
5. **Currency Branch:**
   - `tickets`: Debit `user_tickets.balance`, Insert `ticket_transactions` (source: 'event_entry')
   - `scout`: Feature-Flag pruefen, Lock `wallets.locked_balance`, Insert `transactions` (type: 'event_entry_lock'), Fee-Split berechnen
6. Insert `event_entries`
7. Increment `events.current_entries`
8. Return `{ ok, balance_after, currency }`

### `rpc_unlock_event_entry(p_event_id, p_user_id)`

1. Guard: `locks_at > NOW()` (Refund nur vor Lock)
2. `pg_advisory_xact_lock`
3. **Currency Branch:**
   - `tickets`: Credit `user_tickets.balance`, Insert `ticket_transactions` (source: 'event_entry_refund')
   - `scout`: Unlock `wallets.locked_balance`, Insert `transactions` (type: 'event_entry_unlock')
4. Delete `event_entries`
5. Decrement `events.current_entries`
6. Return `{ ok, balance_after }`

### `rpc_settle_event(p_event_id)` — Scoring

1. Guard: Event status = 'scoring'
2. Fuer $SCOUT-Entries: Escrow aufloesen, Fee-Split ausfuehren, Net in Prize-Pool
3. Fuer Ticket-Entries: Nichts (Tickets bereits spent)
4. Prize-Pool an Gewinner verteilen (reward_structure → $SCOUT auf Wallet)
5. Event status → 'ended'

### `rpc_cancel_event_entries(p_event_id)` — Event Cancellation

1. Refund an ALLE Teilnehmer (Tickets zurueck oder $SCOUT unlock)
2. Delete alle `event_entries`
3. Reset `current_entries = 0`

## Service Layer

```
lockEventEntry(eventId, userId)     → rpc_lock_event_entry
unlockEventEntry(eventId, userId)   → rpc_unlock_event_entry
settleEvent(eventId)                → rpc_settle_event
cancelEventEntries(eventId)         → rpc_cancel_event_entries
```

Bestehende `submitLineup()` wird NICHT mehr Payment machen — nur Guard dass `event_entries` Eintrag existiert.

Bestehende `spendTickets()`/`creditTickets()` Calls in FantasyContent.tsx werden entfernt.

## Client Flow

```
User klickt "Teilnehmen"
  → lockEventEntry(eventId, userId)
  → Erfolg: UI zeigt Lineup-Builder
  → Fehler: Toast mit Grund

User baut Lineup
  → submitLineup(eventId, userId, slots, captain)
  → Kein Payment, nur Lineup-Daten

User verlässt Event (vor locks_at)
  → unlockEventEntry(eventId, userId)
  → Voller Refund

Admin scored Event
  → settleEvent(eventId)
  → Fee-Split + Prize Distribution
```

## Admin-UI

### Event-Erstellung
- Neues Dropdown: "Waehrung" (Tickets / $SCOUT)
- $SCOUT nur waehlbar wenn Feature-Flag aktiv
- `entry_fee` Feld wird zu "Eintrittskosten" (ein Feld)

### BeScout Admin — Platform Settings
- Toggle: "$SCOUT Events erlauben" (Default: aus)
- Setzt `platform_settings.scout_events_enabled`

### Editierbarkeit
- `currency`: Nur in Status `upcoming`
- `ticket_cost`: In `upcoming` + `registering`

## Error Handling

| Szenario | Verhalten |
|----------|-----------|
| Balance nicht ausreichend | RPC rejected, kein Entry |
| Event voll | RPC rejected |
| Doppelter Entry | Idempotent (PK Guard) |
| Refund nach locks_at | RPC rejected |
| $SCOUT Feature-Flag aus | RPC rejected |
| Event cancelled | Auto-Refund an alle |
| User entered ohne Lineup | Score 0, kein Reward, Entry-Kosten weg |

## Fee-Split ($SCOUT Events only)

| Empfaenger | Anteil | Berechnung |
|------------|--------|------------|
| Platform | 3.5% | entry * 0.035 |
| PBT | 1.5% | entry * 0.015 |
| Club | 1.0% | entry * 0.01 |
| Prize Pool | 94% | entry - fees |

Ticket-Events: Kein Fee-Split, Tickets haben keinen monetaeren Wert.

## Migration

Eine Migration die:
1. `events.currency` Spalte hinzufuegt (Default 'tickets')
2. `ticket_cost` aus `entry_fee` backfillt
3. `entry_fee` als DEPRECATED markiert
4. `event_entries` Tabelle erstellt mit RLS
5. `platform_settings` Tabelle erstellt mit Feature-Flag
6. Bestehende Lineups nach `event_entries` backfillt (amount_locked = 0)
7. RPCs erstellt: lock, unlock, settle, cancel

## Backward Compatibility

- Alle bestehenden Events bekommen `currency = 'tickets'`
- Bestehende Lineups bekommen `event_entries` mit `amount_locked = 0`
- `entry_fee` Spalte bleibt (nicht droppen), wird nur nicht mehr gelesen
- `submitLineup()` bekommt Guard statt Payment
