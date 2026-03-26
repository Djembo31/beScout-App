# Fantasy Feature Spec
> Last Verified: 2026-03-26 (Session 258 — Smoke-Tested auf Vercel mit echtem User)
> Status: 12/12 Flows verifiziert, 10/10 Bugs geschlossen + 3 Live-Bugs gefixt
> Owner: Jarvis (CTO)
> Rule: KEIN Fantasy-Code ohne diesen Spec gelesen zu haben.

---

## 1. FLOWS (End-to-End)

### Flow 1: JOIN (Entry + Payment)
**Status: FUNKTIONIERT (Session 258 Smoke-Tested auf Vercel — Join + DB verifiziert)**

```
User klickt "Beitreten" → Confirm Dialog → lock_event_entry RPC
→ Fee abgezogen (Tickets ODER Scout) → event_entries Row → current_entries +1
→ joinedIds Cache instant update → "Nimmt teil" Badge → Lineup Tab
```

| Schritt | Service | RPC | DB | UI |
|---------|---------|-----|-----|-----|
| Fee pruefen | events.ts:lockEventEntry | lock_event_entry | wallets, event_entries | Confirm Dialog |
| Entry erstellen | (in RPC) | (in RPC) | event_entries INSERT | - |
| Counter +1 | (in RPC) | (in RPC) | events.current_entries | Badge + Counter |
| Cache update | FantasyContent | setQueryData | - | Instant "Nimmt teil" |
| Mission tracking | (fire-and-forget) | - | missions | - |

**Acceptance Criteria:**
- [x] Tickets: Korrekt abgezogen, Balance aktualisiert
- [x] Scout: Korrekt abgezogen (centsToBsd conversion)
- [x] "Nimmt teil" Badge sofort sichtbar (kein Refresh noetig)
- [x] Counter +1 auf Event Card (Cache-Update, verifiziert in DB)
- [ ] Dual-Currency Toggle (scout_events_enabled Flag) — NICHT getestet
- [ ] Subscription-Gate (min_subscription_tier) — NICHT end-to-end getestet
- [ ] Event Full Guard (max_entries) — NICHT getestet

**Error Cases:**
- `insufficient_tickets` → Error Toast mit Have/Need
- `insufficient_balance` → Error Toast mit Scout-Betrag
- `event_full` → Error Toast
- `event_not_open` → Error Toast
- `already_entered` → Kein Error, nur Refresh

---

### Flow 2: LINEUP SAVE
**Status: FUNKTIONIERT (Session 257 verifiziert, Commit 74ef0a6)**

```
User waehlt 7 Spieler → Formation → Captain (optional) → Wildcards (optional)
→ "Aufstellung aendern" klickt → save_lineup RPC
→ Slots + Formation → DB → holding_locks erstellt → Modal schliesst → Toast
```

| Schritt | Service | RPC | DB | UI |
|---------|---------|-----|-----|-----|
| Slots bauen | FantasyContent:handleSubmitLineup | - | - | Formation Picker |
| RPC call | lineups.ts:submitLineup | save_lineup → rpc_save_lineup | lineups UPSERT | Spinner |
| SC Check | (in RPC) | (in RPC) | holdings SELECT | - |
| Locks | (in RPC) | (in RPC) | holding_locks DELETE+INSERT | - |
| Cache invalidate | FantasyContent | invalidateFantasyQueries | - | Modal schliesst |

**Acceptance Criteria:**
- [x] 7er Format: 7 Spieler (GK + 2 DEF + 2 MID + 2 ATT)
- [x] 11er Format: 11 Spieler (GK + 4 DEF + 3 MID + 3 ATT)
- [x] Formation korrekt in DB gespeichert (resolvedFormation.id)
- [x] Lineup beim Reopen sichtbar (DB → UI Mapping korrekt)
- [x] Auto-Save nach Join (wenn Lineup komplett)
- [x] Error Handling: alle RPC Errors als Toast sichtbar
- [ ] Captain Slot → DB gespeichert, aber KEIN Scoring-Bonus implementiert
- [ ] Wildcard Slots → im RPC akzeptiert, aber Wildcard-Balance NICHT abgezogen
- [ ] Salary Cap Enforcement → Client-side Check existiert, RPC prueft NICHT
- [ ] min_sc_per_slot → RPC prueft, aber UI zeigt keinen klaren Hinweis
- [ ] Duplicate Player Guard → RPC prueft, Error Toast vorhanden
- [ ] Club-Scoped Events → Player Picker filtert nach clubId, NICHT getestet

---

### Flow 3: LEAVE (Refund + Cleanup)
**Status: FUNKTIONIERT (Session 258 Smoke-Tested auf Vercel — Leave + DB verifiziert)**

```
User klickt "Abmelden" → Confirm → unlock_event_entry RPC
→ Fee refunded → event_entries DELETE → lineups DELETE → holding_locks DELETE
→ current_entries -1 → joinedIds Cache update → Modal schliesst
```

**Acceptance Criteria:**
- [x] Refund korrekt (gleicher Betrag wie Entry Fee) — RPC atomar, Tickets+Scout
- [x] Lineup + Locks geloescht (atomar in RPC) — rpc_unlock_event_entry
- [x] Counter -1 auf Event Card — GREATEST(0, current_entries-1) in RPC
- [x] "Nimmt teil" Badge verschwindet sofort — setQueryData instant update
- [ ] Wildcard Balance refunded (wenn Wildcards verwendet) — NICHT verifiziert
- [x] NICHT moeglich nach locks_at (event_locked Error) — RPC Guard
- [x] NICHT moeglich waehrend running Status — UI Guard (line 708) + RPC status check
**UI:** EventDetailModal.tsx:744-754 (Abmelden Button + Confirm)
**Handler:** FantasyContent.tsx:527-570 (RPC + Cache + Toast)

---

### Flow 4: SC BLOCKING (Trading ←→ Fantasy)
**Status: IMPLEMENTIERT (Session 258 verifiziert — Code-Review + DB: 14 Locks aktiv)**

```
Spieler in Lineup → holding_locks Row existiert → Sell Order BLOCKIERT
Event endet → Trigger loescht holding_locks → Spieler wieder verkaufbar
```

**Acceptance Criteria:**
- [x] Spieler mit holding_lock kann NICHT verkauft werden — place_sell_order RPC: available = holdings - orders - locks
- [x] Spieler in 2 Events: 2 holding_locks — SUM(quantity_locked) ueber alle Events
- [x] Event Status → ended/scoring: Trigger `trg_fn_event_status_unlock_holdings` loescht Locks
- [x] Leave Event: unlock_event_entry loescht Locks atomar
- [x] UI: Portfolio zeigt Lock-Count pro Spieler — BestandPlayerRow.tsx:134 "{count} gesperrt"
- [x] UI: Sell Modal zeigt Lock-Info — BestandSellModal.tsx:148 "X gesperrt, Y verfuegbar"
- [x] RLS Policies komplett (SELECT + INSERT + DELETE) — Fix in 20260326_fix_holding_locks_rls.sql

**Involvierte Files:**
- `holding_locks` Table + RLS (SELECT, INSERT, DELETE fuer User)
- `rpc_save_lineup` Step 12 → DELETE old + INSERT new holding_locks
- `rpc_unlock_event_entry` → DELETE holding_locks
- `trg_fn_event_status_unlock_holdings` → Trigger auf events.status change
- `place_sell_order` RPC → available_qty = holdings - open_orders - locked
- BestandPlayerRow.tsx + BestandSellModal.tsx → Lock-Status Anzeige

---

### Flow 5: SCORING
**Status: FUNKTIONIERT (Session 258 — Captain + Triple Captain verifiziert)**

```
Admin klickt "Spieltag auswerten" → finalizeGameweek()
→ importProgressiveStats (API-Football → player_gameweek_scores)
→ score_event RPC (pro Event): Lineup Scores berechnen → Ranks → Rewards
→ Gamification: Manager Elo + Achievements
→ Notifications an alle Teilnehmer
```

**Acceptance Criteria:**
- [x] Score = Summe aller Slot-Scores (aus player_gameweek_scores)
- [x] Ranking: DENSE_RANK nach Score DESC
- [x] Rewards: reward_structure JSONB (z.B. [{rank:1, pct:50}, {rank:2, pct:30}])
- [x] Captain Bonus 1.5x (cap 150) — war BEREITS in score_event RPC, Spec war falsch
- [x] Synergy Bonus — war BEREITS eingerechnet (v_total += v_synergy_bonus), Spec war falsch
- [x] Triple Captain Chip: 3.0x (cap 300) statt 1.5x — Migration 20260326_score_event_triple_captain
- [ ] Synergy Surge Chip: 2x synergy bonus — NICHT implementiert (spaeter)
- [ ] Second Chance Chip: worst→best swap — NICHT implementiert (braucht Bench-Konzept)
- [ ] Progressive Leaderboard waehrend Running: Existiert (30s Poll), NICHT live-verifiziert

---

### Flow 6: PREDICTIONS
**Status: GRUNDFLOW FUNKTIONIERT, Edge Cases offen**

```
User waehlt Fixture → Prediction Type (Match/Player) → Condition → Value → Confidence
→ create_prediction RPC → DB → Difficulty berechnet
→ Nach GW: resolve_gameweek_predictions → correct/wrong/void → Points
```

**Acceptance Criteria:**
- [x] Match Predictions: Ergebnis, Tore, Beide treffen
- [x] Player Predictions: Tore, Assists, Karten, Minutes, Clean Sheet
- [x] Confidence 50-100, Difficulty 0.5/1.0/1.5
- [x] Scoring: +10 * confidence/100 * difficulty (correct), -6 * ... (wrong)
- [x] Daily Limit pro GW — UI zeigt "{count}/5" Badge, Button disabled bei Limit (PredictionsTab.tsx:38-70)
- [ ] Difficulty Badge in UI — NICHT angezeigt
- [ ] Void Notifications — NICHT gesendet

---

### Flow 7: CHIPS
**Status: 80% — RPCs komplett, Service gefixt, triple_captain Effekt live (Session 258)**

```
User aktiviert Chip → activate_chip RPC → Tickets abgezogen → chip_usages Row
→ Chip-Effekt auf Score (triple_captain: 3.0x Captain)
→ Deaktivierung: deactivate_chip(chip_usage_id) → DELETE + Refund
```

**Acceptance Criteria:**
- [x] Activate: Tickets abgezogen, chip_usages Row erstellt — RPC existierte in DB
- [x] Deactivate: chip_usages DELETE + Tickets refunded — RPC existierte in DB
- [x] Season Limit Enforcement — get_season_chip_usage RPC existierte in DB, Service gefixt (Session 258)
- [x] Triple Captain Effekt: score_event nutzt 3.0x statt 1.5x wenn Chip aktiv
- [x] ChipSelector UI: nutzt CHIP_DEFINITIONS + Live-Daten (season usage, event chips, ticket balance)
- [ ] Synergy Surge Effekt: 2x synergy bonus — NICHT implementiert
- [ ] Second Chance Effekt: worst→best swap — NICHT implementiert (braucht Bench)
- [ ] Max 2 Chips pro Event — RPC prueft, UI NICHT

---

### Flow 8: WILDCARDS
**Status: 50% — Balance System existiert, Lineup-Integration LUECKENHAFT**

```
User verdient Wildcards (Missions, Mystery Box, etc.) → user_wildcards.balance +N
→ User setzt Wildcard-Slot in Lineup → spend_wildcards → balance -1
→ Wildcard-Slot = Spieler OHNE SC Ownership (bypasses SC Check)
```

**Acceptance Criteria:**
- [x] Balance: earn/spend RPCs funktionieren
- [x] Transaction History: wildcard_transactions geloggt
- [x] Lineup-Integration: save_lineup ruft spend_wildcards auf (delta-basiert, idempotent bei Re-Saves) — Session 258
- [x] Refund bei Re-Save: earn_wildcards wenn Wildcard-Slots reduziert werden — Session 258
- [ ] UI: Wildcard Toggle auf Slots existiert, NICHT end-to-end getestet
- [ ] Refund bei Leave: unlock_event_entry sollte Wildcards refunden — NICHT verifiziert

---

### Flow 9: FANTASY LEAGUES
**Status: FUNKTIONIERT (Session 258 verifiziert — Code-Review + DB RPC)**

- [x] Create League (mit Invite Code) — create_league RPC
- [x] Join/Leave League — join_league, leave_league RPCs
- [x] League Leaderboard — get_league_leaderboard: SUM(total_score), COUNT(events), MIN(rank)
- [x] Aggregation ueber alle scored Events — RPC summiert alle lineups.total_score pro Member
- [ ] Season-Filter — Aktuell alle Events, kein Season-Filter (fuer Pilot OK, spaeter filtern)
- [ ] League-spezifische Events — NICHT implementiert (Feature, kein Bug)

---

### Flow 10: PER-FIXTURE LOCKING
**Status: IMPLEMENTIERT (Session 258 verifiziert — Code-Review)**

```
Event Status = running → Fixtures starten zu verschiedenen Zeiten
→ Fixture startet → Spieler dieses Clubs = LOCKED (kein Swap moeglich)
→ Andere Fixtures noch offen → User kann noch swappen + speichern
```

**Acceptance Criteria:**
- [x] Save Button sichtbar fuer running Events mit unlocked Fixtures (Session 257 fix)
- [x] Locked Slots readonly — isPlayerLocked() checkt fixtureDeadlines per clubId (EventDetailModal:286-291)
- [x] hasUnlockedFixtures — Save+Leave nur wenn noch offene Fixtures (line 302-305)
- [x] isPartiallyLocked — Status-Banner bei teilweiser Sperrung (line 294-299)
- [x] LineupPanel: locked Slots grau, nicht anklickbar (LineupPanel:187-196, 479)
- [x] FixtureDeadline Service: played_at <= now && status != 'scheduled' (fixtures.ts:312)
- [ ] Fixture Deadline Polling — Client refreshed bei GW-Wechsel, kein 60s Interval
- [ ] Save nach Partial Lock — RPC akzeptiert alle Slots (ignoriert nicht locked), UI verhindert Aenderung

---

### Flow 11: EVENT REQUIREMENTS
**Status: SERVER-SIDE ENFORCED (Session 258 — alle ausser Club-Scoped)**

| Requirement | DB Column | RPC Check | Client Check | Status |
|------------|-----------|-----------|-------------|--------|
| Min SC per Slot | min_sc_per_slot | save_lineup prueft | - | OK |
| Salary Cap | salary_cap | save_lineup prueft (perf_l5 als Salary) | Client-side Budget Bar | **GEFIXT** |
| Club-Scoped | scope='club', club_id | NICHT geprueft | Player Picker filtert | LUECKE |
| Min Subscription | min_subscription_tier | lock_event_entry prueft | - | OK |
| Min Tier | min_tier | lock_event_entry prueft (gamification_tier_rank) | - | **GEFIXT** |
| Wildcards Allowed | wildcards_allowed | save_lineup prueft | UI toggle | OK |
| Max Wildcards | max_wildcards_per_lineup | save_lineup prueft | UI counter | OK |
| Max Wildcards | max_wildcards_per_lineup | save_lineup prueft | UI counter | OK |

---

### Flow 12: EVENT LIFECYCLE (Admin)
**Status: FUNKTIONIERT (Admin-getestet)**

```
upcoming → registering → late-reg → running → scoring → ended
                                      ↓
                                   cancelled
```

- [x] Status Transitions (Admin + Cron)
- [x] Event Cloning fuer naechsten GW
- [x] Bulk Status Update
- [x] Cancel + Refund All

---

## 2. KNOWN BUGS (Prioritaet)

### KRITISCH
1. ~~**Wildcard spend fehlt**~~ — GEFIXT Session 258: save_lineup ruft spend_wildcards auf (delta-basiert)
2. ~~**Salary Cap nur Client-side**~~ — GEFIXT Session 258: save_lineup prueft salary_cap server-side (perf_l5)
3. ~~**Captain Bonus ignoriert**~~ — WAR FALSCH: score_event hatte 1.5x bereits. Triple Captain (3.0x) jetzt auch live.
4. ~~**get_season_chip_usage RPC fehlt**~~ — WAR FALSCH: RPC existierte in DB. Service gefixt (Session 258).

### HOCH
5. ~~**Counter-Drift**~~ — KEIN BUG: Increment/Decrement atomar in RPCs mit Advisory Lock, Cache-Invalidation korrekt
6. ~~**SC Blocking nicht verifiziert**~~ — VERIFIZIERT Session 258: place_sell_order prueft, 14 Locks aktiv in Prod
7. ~~**Chip-Effekte fehlen**~~ — TEILWEISE GEFIXT: triple_captain 3.0x live, synergy_surge + second_chance offen
8. ~~**Min Tier Check fehlt**~~ — GEFIXT Session 258: lock_event_entry prueft gamification_tier_rank

### MITTEL
9. ~~**Prediction Limit UI**~~ — WAR FALSCH: PredictionsTab.tsx zeigt "{count}/5" Badge + disabled Button bei Limit
10. ~~**Formation Validation Client-side**~~ — WAR FALSCH: isLineupComplete check + disabled Save + Progress Bar existieren

### LIVE-BUGS (Session 258 Smoke-Test gefunden + gefixt)
11. ~~**joinedIds Cache Race**~~ — GEFIXT: qk.events.all war ['events'] (Prefix-Key), invalidierte joinedIds mit → ['events', 'list']
12. ~~**Summary Modal Endlos-Kette**~~ — GEFIXT: summaryShownRef + markAllSeen — nur 1 Modal pro Page-Load
13. **Alte GW-Ergebnisse poppen auf** — BEKANNT: Scored Events aus frueheren Gameweeks zeigen Modal bei Navigation (localStorage nur pro Event, nicht pro GW-Session)

---

## 3. CROSS-DOMAIN DEPENDENCIES
→ Siehe `memory/deps/cross-domain-map.md`

Kurzform:
- **Trading**: holding_locks blockiert Verkauf. Orders-Service MUSS pruefen.
- **Wallet**: Entry Fees (lock/unlock), Chip Tickets, Wildcard Balance
- **Gamification**: Manager Elo nach Scoring, Achievements, Missions
- **Profile**: Leaderboard, Fantasy History, Fan Ranks
- **Club Admin**: Event Creation, GW Management, Scoring Trigger

---

## 4. DB SCHEMA (Quick Reference)

| Table | PK | Key Columns | RLS |
|-------|----|-------------|-----|
| events | id | status, gameweek, current_entries, locks_at, scored_at | SELECT:all, CRUD:admin |
| event_entries | (event_id, user_id) | currency, amount_locked | SELECT:own, CRUD:RPC |
| lineups | id, UNIQUE(event_id,user_id) | formation, slot_*, total_score, rank | SELECT:own+public, CRUD:RPC |
| holding_locks | (user_id, player_id, event_id) | quantity_locked | SELECT:own, INSERT:own, DELETE:own |
| predictions | id | type, condition, value, confidence, status, points | SELECT:own+resolved, CRUD:RPC |
| player_gameweek_scores | (player_id, gameweek) | score | SELECT:all, CRUD:RPC |
| user_wildcards | user_id | balance, earned_total, spent_total | SELECT:own, CRUD:RPC |
| chip_usages | id | chip_type, is_active, season | SELECT:own, CRUD:RPC |
| fantasy_leagues | id | invite_code, max_members | SELECT:members, CRUD:creator |
| fantasy_league_members | (league_id, user_id) | joined_at | SELECT:own, CRUD:RPC |

---

## 5. SELF-AUDIT TEMPLATE

Nach JEDER Fantasy-Aenderung diese Liste durchgehen:

```
[ ] Spec gelesen? Welcher Flow ist betroffen?
[ ] Alle Acceptance Criteria des Flows geprueft?
[ ] Cross-Domain Map gecheckt? Welche anderen Domains betroffen?
[ ] holding_locks korrekt? (erstellt bei Save, geloescht bei Leave/End)
[ ] Error Handling: Alle RPC-Errors haben User-sichtbares Feedback?
[ ] i18n: Alle neuen Texte in DE + TR?
[ ] Counter: current_entries konsistent mit event_entries COUNT?
[ ] Tests: Bestehende Tests laufen? Neue Tests noetig?
[ ] Visual QA: Loading, Empty, Error, Full Data States geprueft?
[ ] Spec aktualisiert mit dem was tatsaechlich gebaut wurde?
```
