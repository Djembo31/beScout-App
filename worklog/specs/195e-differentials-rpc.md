# Slice 195e — Differentials-RPC + Player-Card-Badge

**Datum:** 2026-04-25 (Spec)
**Groesse:** S (4 Std)
**CEO-Approval:** Anil 2026-04-25 (Master-Spec 195) — F-06 Differentials ist explizit als P0 gelistet
**Trigger:** Phase-A Audit Fantasy P0 #6 (F-06) + FM-Audit 2.1+2.2 (Captain-Pick-Rate + Differential-%)

## Ziel

Top-Manager-Decision-Helper: "Wie viele Manager picken Salah als Captain? Welcher Spieler ist Differential (<10% Ownership)?". Dual-Use:
- **Captain-Pick-Rate** auf Captain-Slot-Picker
- **Differential-%** auf Player-Picker pro Position

## Betroffene Files

### Backend (RPC)

- `supabase/migrations/20260425_slice_195e_differentials_rpc.sql`:
  1. NEU SECURITY DEFINER RPC `get_event_captain_distribution(p_event_id UUID)` → JSONB array `[{player_id, count, pct}]` aggregated von `lineups` WHERE captain_slot points to player.
  2. NEU SECURITY DEFINER RPC `get_event_player_pick_rates(p_event_id UUID)` → JSONB array `[{player_id, pick_count, pct}]` aggregated from all `slot_*` columns in lineups.
  3. AR-44 REVOKE/GRANT-Block.
  4. Anonymized Output (kein user_id, kein handle — nur counts + pct).

### Service-Layer

- `src/features/fantasy/services/scoring.queries.ts` — `getEventCaptainDistribution(eventId)` + `getEventPickRates(eventId)` Service-Functions.
- `src/lib/queries/fantasyPicker.ts` — React-Query-Hook `useEventCaptainDistribution(eventId)` + `useEventPickRates(eventId)`. StaleTime 60s (refresh schnell vor Deadline).

### Frontend

- `src/features/fantasy/components/lineup/PitchView.tsx` — Captain-Pick-Rate-Badge im Captain-Crown-Slot zeigen wenn `pct > 0` (z.B. "C: 32%").
- `src/features/fantasy/components/lineup/PlayerPicker.tsx` — Pick-Rate-Badge pro Spieler-Card oben-rechts (z.B. "12%" small text-white/50).
- `src/features/fantasy/components/lineup/LineupBuilder.tsx` — Hooks-Mount + Distribution-Map an PitchView/PlayerPicker durchreichen.

### Optional (Nice-to-have)

- `src/features/fantasy/components/lineup/FantasyPlayerRow.tsx` — Differential-Glow ⚡ wenn `pct < 10` (Differential-Indicator)

## Acceptance Criteria

1. **RPC `get_event_captain_distribution`**: liefert JSONB array sortiert by pct DESC. Alle Captain-Slots der `lineups`-Tabelle aggregiert nach player_id.
2. **RPC `get_event_player_pick_rates`**: liefert JSONB array aggregiert ueber alle 12 starting-slot_*-columns. Bench-Spieler NICHT mitzählen (nur Starter).
3. **Anonymisierung**: Beide RPCs returnen keine user_id / handle / display_name.
4. **Empty-Event-Edge**: Wenn 0 Lineups submitted, beide RPCs returnen `[]`.
5. **Caching**: React-Query staleTime 60s, refetch on window focus.
6. **UI Captain-Badge**: PitchView Captain-Slot zeigt Pick-Rate wenn vorhanden.
7. **UI Picker-Badge**: PlayerPicker zeigt Pick-Rate auf jeder Spieler-Card.
8. **Edge-Case Pre-Deadline mit 0 Lineups**: UI zeigt nichts (kein 0%-Badge — verwirrend) ODER "—" Placeholder.
9. **i18n**: kein neuer DE/TR-String benötigt (Prozent ist locale-neutral); falls Tooltip-Text dann beide.

## Edge Cases

1. Event `status='upcoming'` und 0 Lineups → `[]` zurück, UI zeigt keine Badges.
2. Event `status='running'` (Live, Deadline passed) → Badges bleiben sichtbar (statisch nach Lock).
3. Event `status='ended'` → Badges optional; Score-Display dominiert.
4. Player nicht in irgendeinem Lineup → fehlt im RPC-Result (UI zeigt nichts statt 0%).
5. Captain-Slot ist NULL in einigen Lineups → werden nicht in `get_event_captain_distribution` gezählt.
6. Race: User submitted Lineup während RPC läuft → eventual consistency akzeptabel (60s staleTime).
7. Fantasy-League-spezifischer Event vs Public-Event → beide RPCs respektieren `p_event_id` strict, kein Cross-Event-Leak.

## Proof Plan

| AC | Proof-Type |
|---|---|
| 1, 2, 3 | DB Query: `SELECT get_event_captain_distribution('test-event-id')` returnt JSON sortiert, ohne user_id |
| 4 | DB Query mit Empty-Event |
| 5 | React-Query DevTools Inspection oder direkter test |
| 6, 7, 8 | Playwright-Screenshot `/fantasy/spieltag/[id]` mit Lineup-Builder + Picker offen — Pick-Rate-Badge sichtbar |
| 9 | i18n-Coverage-Audit clean |

## Scope Out (NICHT in 195e)

- Differential-Glow ⚡ Effect (UI-Polish, kann in Slice 198)
- Auto-Sub Audit Trail UI (Slice 195f, siehe 195d-Review M2)
- BPS-Bonus-System (Slice 198)
- Trending vs Pick-Rate Cross-Reference (Post-Beta)

## Stage-Chain

```
SPEC (this file) → IMPACT inline (2 RPCs + Service + 3 Components) →
BUILD (parallel: backend + frontend) → REVIEW (reviewer) → PROVE → LOG
```

## CTO-Notes

- **Performance:** `get_event_captain_distribution` ist O(N) ueber lineups-table, mit Index auf event_id schnell. `get_event_player_pick_rates` ist O(N*12) — ebenfalls schnell bei <1000 Lineups pro Event. Cache-Pflicht clientseitig 60s.
- **Anonymisierung:** RPC SECURITY DEFINER + projizierter Output (nur counts/pct) — kein RLS-Konflikt. Pattern wie `rpc_get_club_recent_trades` (Slice 095).
- **Diff zu FPL:** FPL aggregiert global ueber alle Manager weltweit. BeScout aggregiert per-Event (kleinere Sample-Size). Bei <10 Lineups → Pick-Rate wenig aussagekräftig. Heuristik: nur anzeigen wenn `total_lineups >= 5` (Edge-Case-Default).
- **AC-Heuristik bei <5 Lineups** kann post-Build refined werden.
