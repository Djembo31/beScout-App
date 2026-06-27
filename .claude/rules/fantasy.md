---
paths:
  - "src/components/fantasy/**"
  - "src/app/**/fantasy/**"
  - "src/lib/services/events*"
  - "src/lib/services/lineups*"
  - "src/lib/services/scoring*"
---

## Events
- `entry_fee`, `prize_pool`, `max_entries`, `event_tier` (arena/club/user)
- `events.type`: bescout/club/sponsor/special/**user** (Slice 396). Legacy `creator` **Slice 400 (E-7) restlos entfernt** — beide Type-Unions, `getTypeStyle`/`TYPE_CONFIG`, i18n + `event_fee_config('creator')`-Zeile weg, `chk_event_type` auf event_fee_config auf dieselbe creator-freie Whitelist wie `events_type_check` verengt. User-Events: `currency='scout'`, `ticket_cost` = money-autoritativ (NICHT `entry_fee`, das ist Display-Spiegel), `club_id=NULL`, `prize_pool=0`/`prize_escrowed=false` (Pot ist virtuell = Σ Eintritte, erst beim Settle real). Erstellt via `create_user_event` (SEC DEFINER, Gebühr→Topf, KEIN Seed); abgesagt via `cancel_user_event` (Auth created_by/platform_admin). Geldfluss-Kanon: `docs/knowledge/domain/treasury.md` (Slice 396) + D108 V3.
- **User-Event-Builder verkabelt (Slice 397, E-4b):** `CreateEventModal` (kein Mock mehr) → `createUserEvent`-Service + `useCreateUserEvent`-Hook (`useSafeMutation`, S371-Wallet-Invalidate; entry_fee als **cents** = Credits×100 an EINER Stelle). Jeder eingeloggte User darf erstellen (kein isAdmin-Gate). Reward = **Presets** (winner/top3/top5, Summe=100). **Format fix `6er`** (RPC nimmt keinen format-Param → DB-Default; 11er = künftiger RPC-Param). **Credit-Eintritt im `JoinConfirmDialog` entkoppelt von `PAID_FANTASY_ENABLED`:** sichtbar bei `event.type === 'user' || PAID_FANTASY_ENABLED` (User-Events = Phase-1-Credits ≠ Phase-3-Paid-Fantasy; D108-Addendum). Reject-Codes von `create_user_event` in `errorMessages.ts` KNOWN_KEYS + DE/TR (S393). **Slice 398:** fehlende `fantasy.bench*`-i18n-Keys (BenchRow, Feat 195d) ergänzt — war globaler Roh-Key-Leak im Lineup-Builder. **Slice 399 (E-4b Teil 2) DONE — User-Events end-to-end nutzbar:** (1) **Discovery** `creator`→`user` in `EventCategoryCards.CATEGORIES` + `EventBrowser.CATEGORIES` (tote deprecated `creator`-Karte ersetzt, 0 Prod-Events, D108); (2) **F2/F3 currency-fix** 🎟-Chip in `EventCardView` + `EventDetailHeader` nur noch bei `currency==='tickets'` (Scout-Eintritt via `formatEventCost`→CR, kein roher-cents-Leak); (3) **Cancel-UI** `cancelUserEvent`-Service + `useCancelUserEvent`-Hook (S371) + Button im `EventDetailModal` nur `type==='user' && createdBy===userId && status∈{registering,late-reg}` (RPC `cancel_user_event` = fail-closed 2. Netz, Refund läuft RPC-seitig); (4) **Admin-Gebühr** `setUserEventCreateFee`/`getUserEventCreateFee` + Number-Input in `AdminEventFeesSection` (platform_event_config Singleton, hardcoded-DE-admin); (5) **min_entries** Mapper+`FantasyEvent.minEntries`+`DbEvent.min_entries` + 3 Select-Listen (S200) + Card-Chip `minEntriesChip`. Reject-Codes (`not_user_event`/`event_not_open`/`invalid_amount`) in errorMessages KNOWN_KEYS + DE/TR (S393). **Money-Logik unverändert** (E-4a/396 eingefroren — nur RPC-Aufrufe). **E-7 creator-Cleanup ✅ DONE (Slice 400):** `event_fee_config('creator')`-Zeile + `getTypeStyle('creator')`-case + alle 11 Drift-Flächen entfernt, `chk_event_type` verengt. **Offen (Folge):** Freiform-Reward-Editor (E-4b-Rest).
- `current_entries` ist Teilnehmer-Count (NICHT `participant_count`)
- Events klonen bei neuem GW (`cron_process_gameweek`)
- Fantasy Events sind GLOBAL — kein Club noetig (ADR-017)
- Nach Status-Aenderung: ALLE Events refetchen (nie einzeln im State updaten)

## Lineups
- 6er (1+2+2+1) oder 11er (1+4+3+3) Format
- Slot Mapping: slots 0-5 → `slot_gk, slot_def1, slot_def2, slot_mid1, slot_mid2, slot_att`
- Deadline: **per-fixture Locking** (`fixture.starts_at`), NICHT GW-level
- DPC Lock: `getPlayerEventUsage()` returns player → event usage map
- `effectiveHoldings` in EventDetailModal: unlocks players from current event being edited
- `captain_slot`: 'gk'/'def1' etc. (KEIN 'slot_' Prefix)

## Scoring
- **`player_gameweek_scores` ist FIXTURE-gebunden (Slice 419, Sorare-Pro):** Schlüssel = `UNIQUE(player_id, fixture_id)` (NICHT mehr `(player_id, gameweek)`), zusätzlich denormalisiert `league_id` + `gameweek`. Ein Score = ein konkretes Spiel. Grund: GW-Nummern sind über alle 7 Ligen geteilt (1..34/1..38) → „GW12" allein war ligaübergreifend mehrdeutig (40 reale Kollisionen, 31 cross-league). **Konsequenz für JEDEN Reader:** ein Spieler kann >1 Zeile pro (player, gameweek) haben → Reads, die nach (player, gameweek) lesen, MÜSSEN liga-filtern + aggregieren (`SUM`), sonst Row-Fanout/Cross-Liga-Summe. `score_event` löst Event-Liga via `COALESCE(events.league_id, clubs.league_id)` auf, liest `SUM(score) … AND league_id=ev_league` (NULL=liga-offen für die 2 club-losen Events). Form-Bar-RPC `rpc_get_recent_player_scores` = Skalar-Subquery-SUM liga-gefiltert (419b, Fanout-frei). Timeline `getPlayerMatchTimeline` mappt Score pro `fixture_id`.
- `score_event` v4: GW Events → `player_gameweek_scores`, Non-GW → `_temp_event_scores`
- **`score_event` `type='user'`-Zweig (Slice 396, additiv geguarded):** Pot = Σ `event_entries.fee_split.prize_pool`; Eintritte abbuchen (`balance/locked −= amount_locked`, tx `event_entry_charge`); `v_prize_pool := v_user_pot` (statt `events.prize_pool`=0); bestehende FLOOR-Distribution mintet an Gewinner (tx `fantasy_reward`); **FLOOR-Rest + 0-Lineups-Pot → Topf** (`event_entry_fee`). Zero-Sum exakt, Idempotenz via `scored_at`. Non-user-Pfade byte-identisch (PATCH-AUDIT). **Reject-Codes** (create/cancel) brauchen `mapErrorToKey`-Mapping bei UI-Verdrahtung = E-4b (errors-frontend S393).
- `sync_fixture_scores` (Slice 419): schreibt **pro (player, fixture)** eine Zeile (`ON CONFLICT (player_id, fixture_id)`), nicht mehr GW-kollabiert. Score = `rating*10` (sonst `fantasy_points*5`), gecappt 0-100. `fps.player_id IS NOT NULL`-Guard.
- `perf_l5`/`perf_l15`/`perf_season` = `LEAST(100, ROUND(AVG(score) über letzte 5/15/alle GW-Rows ORDER BY gameweek DESC))` — Quelle `cron_recalc_perf` (live-verifiziert Slice 309/D77). **KEIN /1.5** (frühere Doc-Behauptung war falsch; GW-Scores 40-150 werden NICHT durch 1.5 geteilt, sondern direkt gemittelt + bei 100 gecappt). Helper: `deriveL5FromRecentScores` (Display aus FormBars).
- Score-Farben: >=100 Gold, 70-99 Weiss, <70 Rot
- `perf_l5`/`perf_l15`: `ORDER BY gameweek DESC` (NICHT `created_at DESC`)
- Prize-Splitting: DENSE_RANK + Position-Counting (ADR-013)
- Kein einzelnes Event-Scoring in Modals — nur ueber Admin SpieltagTab (ADR-012)

## Formation Builder (Best XI/VI)
- IMMER alle Spieler des GW fetchen (limit 300), nicht nur Top 20 (GKs haben niedrige Ratings)
- Positions-Slots zuerst: 1 GK + 4 DEF + 3 MID + 3 ATT, dann Restplaetze aus besten Uebrigen
- `getFormationRows()` gruppiert nach Position, reversed fuer Pitch (ATT oben, GK unten)
- Starter/Bench: Top 11 nach `minutes_played`, Formation aus DEF/MID/ATT Counts

## Spieltag-Lifecycle (atomar, Admin-Tab)
```
close → simulate → score → clone → advance
```
- `simulateGameweekFlow()` verarbeitet ALLE Events eines GW zusammen
- Kein einzelnes Event scoren (ADR-012)

## Cross-Domain (bei Bedarf nachladen)
- **Gamification:** Manager Points nach Scoring (Percentile → Elo), Achievements (event_winner, podium_3x) → `gamification.md`
- **Trading:** DPC Holdings fuer Lineup-Builder, Floor Price fuer Spieler-Anzeige → `trading.md`
- **Profile:** Leaderboard, Scout Scores in Ergebnis-Ansicht → `profile.md`
- **Club-Admin:** Event-Erstellung, Spieltag-Management, Jurisdiction → `club-admin.md`

## API-Football Integration
- TFF 1. Lig, League ID 204 (203 = Süper Lig!)
- `time.elapsed` fuer Substitutions (NICHT `time.minute`!)
- `player`=OUT, `assist`=IN bei Substitutions
- `grid_position` kann kaputt sein: fehlende GK-Row, Duplikate, >11 Starters
- API-Football hat KEINE Market Values → nur Transfermarkt
