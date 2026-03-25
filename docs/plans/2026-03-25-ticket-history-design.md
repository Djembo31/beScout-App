# Ticket-Transaktionshistorie — Design

## Datum: 2026-03-25
## Ziel: User sieht Credits UND Ticket-Transaktionen in der Timeline

---

## Ansatz

Erweitere die bestehende Timeline im Profil um Ticket-Transaktionen.
Kein neuer Tab, kein neuer Component — nur Filter + Datenquelle erweitern.

## Filterleiste (neu)

```
Alle | Credits | Tickets | Trades | Fantasy | Rewards
```

- **Alle** — beide Quellen (transactions + ticket_transactions) gemischt, chronologisch
- **Credits** — nur $SCOUT Transaktionen (bisherige Timeline)
- **Tickets** — nur Ticket-Transaktionen (ticket_transactions Tabelle)
- **Trades/Fantasy/Rewards** — Sub-Filter fuer Credits (wie bisher)

## Datenfluss

- `Alle` + `Credits` + Sub-Filter → `getTransactions()` (bestehend)
- `Tickets` → `getTicketTransactions()` (bestehend)
- `Alle` → beide mergen, nach created_at DESC sortieren

## UI pro Ticket-Row

- **Icon:** Source-basiert
  - daily_login → Flame
  - mission / daily_challenge → Target
  - achievement → Award
  - mystery_box → Gift (oder Zap)
  - event_entry / event_entry_refund → Calendar
  - chip_use / chip_refund → Zap
  - admin_grant → CircleDollarSign
  - post_create / research_publish / research_rating → FileText
- **Label:** `t('ticketSource_' + source)` mit i18n Keys
- **Amount:** `+10` gruen (credit) oder `-15` rot (debit), mit "Tickets" Suffix
- **Balance:** balance_after als kleine Zahl rechts

## Aenderungen

1. **TimelineTab.tsx** — Filter-Array erweitern, Ticket-Daten rendern, Merge-Logik fuer "Alle"
2. **ProfileView.tsx** — `useTicketTransactions()` Hook aufrufen, an TimelineTab uebergeben
3. **messages/de.json + tr.json** — Neue i18n Keys:
   - Filter: credits, tickets
   - Sources: ticketSource_daily_login, ticketSource_mission, ticketSource_mystery_box,
     ticketSource_event_entry, ticketSource_achievement, ticketSource_daily_challenge,
     ticketSource_admin_grant

## Kein neuer Component

Alles in bestehende TimelineTab integriert. Bestehende Logik (Gruppierung nach Tag,
LoadMore, Icon-Map) wird wiederverwendet.
