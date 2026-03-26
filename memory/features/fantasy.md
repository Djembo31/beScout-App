# Fantasy Feature Spec
> Last Verified: 2026-03-26 (Session 257)
> Status: 7/12 Flows implementiert, 5 offen/ungetestet
> Owner: Jarvis (CTO)
> Rule: KEIN Fantasy-Code ohne diesen Spec gelesen zu haben.

---

## 1. FLOWS (End-to-End)

### Flow 1: JOIN (Entry + Payment)
**Status: FUNKTIONIERT (Session 257 verifiziert)**

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
**Status: RPC EXISTIERT, Client NICHT verifiziert**

```
User klickt "Abmelden" → Confirm → unlock_event_entry RPC
→ Fee refunded → event_entries DELETE → lineups DELETE → holding_locks DELETE
→ current_entries -1 → joinedIds Cache update → Modal schliesst
```

**Acceptance Criteria:**
- [ ] Refund korrekt (gleicher Betrag wie Entry Fee)
- [ ] Lineup + Locks geloescht (atomar in RPC)
- [ ] Counter -1 auf Event Card
- [ ] "Nimmt teil" Badge verschwindet sofort
- [ ] Wildcard Balance refunded (wenn Wildcards verwendet)
- [ ] NICHT moeglich nach locks_at (event_locked Error)
- [ ] NICHT moeglich waehrend running Status

---

### Flow 4: SC BLOCKING (Trading ←→ Fantasy)
**Status: UNKLAR — MUSS VERIFIZIERT WERDEN**

```
Spieler in Lineup → holding_locks Row existiert → Sell Order BLOCKIERT
Event endet → Trigger loescht holding_locks → Spieler wieder verkaufbar
```

**Acceptance Criteria:**
- [ ] Spieler mit holding_lock kann NICHT verkauft werden (Order Service prueft)
- [ ] Spieler in 2 Events: 2 holding_locks, braucht quantity >= 2 zum Verkaufen
- [ ] Event Status → ended/scoring: Trigger `trg_fn_event_status_unlock_holdings` loescht Locks
- [ ] Leave Event: unlock_event_entry loescht Locks atomar
- [ ] UI: Market zeigt "In Lineup gesperrt" Badge auf gelockten Spielern
- [ ] UI: Portfolio zeigt Lock-Count pro Spieler

**Involvierte Files:**
- `holding_locks` Table + RLS (SELECT, INSERT, DELETE fuer User)
- `rpc_save_lineup` → INSERT holding_locks
- `rpc_unlock_event_entry` → DELETE holding_locks
- `trg_fn_event_status_unlock_holdings` → Trigger auf events.status change
- `orders` Service → MUSS holding_locks pruefen vor Sell-Order
- Market UI → MUSS Lock-Status anzeigen

---

### Flow 5: SCORING
**Status: FUNKTIONIERT (Admin-getestet, Session ~240)**

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
- [x] Captain Bonus: NICHT implementiert (captain_slot gespeichert aber ignoriert)
- [x] Synergy Bonus: berechnet aber NICHT im Score eingerechnet
- [ ] Chip Bonuses: NICHT implementiert (Chips haben keinen Effekt auf Score)
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
- [ ] Daily Limit pro GW — RPC prueft, UI zeigt Limit NICHT
- [ ] Difficulty Badge in UI — NICHT angezeigt
- [ ] Void Notifications — NICHT gesendet

---

### Flow 7: CHIPS
**Status: 60% — Service + RPC existiert, UI UNVOLLSTAENDIG**

```
User aktiviert Chip → activate_chip RPC → Tickets abgezogen → chip_usages Row
→ Chip-Effekt auf Lineup/Score (NICHT IMPLEMENTIERT)
→ Deaktivierung: Refund → chip_usages deactivated
```

**Acceptance Criteria:**
- [x] Activate: Tickets abgezogen, chip_usages Row erstellt
- [x] Deactivate: Tickets refunded, is_active=false
- [ ] Season Limit Enforcement — RPC existiert, `get_season_chip_usage` RPC FEHLT in DB
- [ ] Chip-Effekte auf Score — NICHT implementiert
- [ ] ChipSelector UI — existiert, aber Chip-Typen hardcoded, keine Live-Daten
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
- [ ] Lineup-Integration: save_lineup akzeptiert wildcard_slots[], aber spend_wildcards wird NICHT aufgerufen
- [ ] UI: Wildcard Toggle auf Slots existiert, NICHT end-to-end getestet
- [ ] Refund bei Leave: unlock_event_entry sollte Wildcards refunden — NICHT verifiziert

---

### Flow 9: FANTASY LEAGUES
**Status: 80% — CRUD funktioniert, Leaderboard-Aggregation offen**

- [x] Create League (mit Invite Code)
- [x] Join/Leave League
- [x] League Leaderboard (aggregiert)
- [ ] Season-uebergreifende Aggregation — NICHT getestet
- [ ] League-spezifische Events — NICHT implementiert

---

### Flow 10: PER-FIXTURE LOCKING
**Status: UI EXISTIERT, NICHT end-to-end getestet**

```
Event Status = running → Fixtures starten zu verschiedenen Zeiten
→ Fixture startet → Spieler dieses Clubs = LOCKED (kein Swap moeglich)
→ Andere Fixtures noch offen → User kann noch swappen + speichern
```

**Acceptance Criteria:**
- [x] Save Button sichtbar fuer running Events mit unlocked Fixtures (Session 257 fix)
- [ ] Locked Slots wirklich readonly (isPlayerLocked callback) — NICHT getestet
- [ ] Fixture Deadline Polling (60s interval) — NICHT verifiziert
- [ ] Save nach Partial Lock — NICHT getestet (RPC muesste locked Slots ignorieren)

---

### Flow 11: EVENT REQUIREMENTS
**Status: TEILWEISE — DB Columns existieren, Enforcement LUECKENHAFT**

| Requirement | DB Column | RPC Check | Client Check | Status |
|------------|-----------|-----------|-------------|--------|
| Min SC per Slot | min_sc_per_slot | save_lineup prueft | - | OK |
| Salary Cap | salary_cap | NICHT geprueft | Client-side only | LUECKE |
| Club-Scoped | scope='club', club_id | NICHT geprueft | Player Picker filtert | LUECKE |
| Min Subscription | min_subscription_tier | lock_event_entry prueft | - | OK |
| Min Tier | min_tier | NICHT geprueft | NICHT geprueft | FEHLT |
| Wildcards Allowed | wildcards_allowed | save_lineup prueft | UI toggle | OK |
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
1. **Wildcard spend fehlt** — save_lineup speichert wildcard_slots aber zieht KEINE Wildcards ab
2. **Salary Cap nur Client-side** — RPC prueft salary_cap NICHT, User kann via API umgehen
3. **Captain Bonus ignoriert** — captain_slot gespeichert aber Score unveraendert
4. **get_season_chip_usage RPC fehlt** — DB Function nicht erstellt, Service returned []

### HOCH
5. **Counter-Drift** — current_entries zeigt 0 nach Join+AutoSave (staler Cache)
6. **SC Blocking nicht verifiziert** — holding_locks existieren, aber Order-Service-Check UNKLAR
7. **Chip-Effekte fehlen** — Chips werden aktiviert aber Score nicht beeinflusst
8. **Min Tier Check fehlt** — events.min_tier existiert aber KEIN RPC/Client Check

### MITTEL
9. **Prediction Limit UI** — RPC enforced Limit, UI zeigt es nicht
10. **Formation Validation Client-side** — Nur Server-side, schlechte UX bei Fehler

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
