# Equipment im Lineup — Fantasy-Scoring Integration

**Datum:** 2026-04-06
**Status:** SPEC PHASE — Fragen an Anil beantwortet
**Autor:** Claude (Spec), Anil (Requirements)

---

## Anil's Entscheidungen

- **1 Equipment pro Spieler** im Lineup
- **Einmalig verbraucht** — nach dem Spieltag weg aus Inventar
- **User kann mehrere vom gleichen Equipment besitzen** — Inventar-Stack
- **UI: Tap auf Spieler → Equipment auswählen** — direkt im Lineup Builder
- **Sichtbar wem was zugeordnet ist** — Equipment-Badge am Spieler-Slot auf dem Pitch

---

## 1.1 Current State — Feature Inventory

### User-sichtbare Features (Fantasy Lineup)

| # | Feature | Beschreibung | Status |
|---|---------|-------------|--------|
| F1 | Lineup Builder | Spieler auf Pitch platzieren, Formation wählen | Live |
| F2 | Captain Selection | Tap/Doppelklick auf Spieler → Captain (×1.5) | Live |
| F3 | Wildcard Slots | Slot markieren für Post-Lock Änderung | Live |
| F4 | Legacy Chips | ChipSelector unter Lineup (Triple Captain, Synergy Surge etc.) | Live (deprecated) |
| F5 | Synergy Bonus | +5% pro Club-Duo, max 15% (30% mit Synergy Surge) | Live |
| F6 | Streak Bonus | +5%/+15% basierend auf Login-Streak | Live |
| F7 | Score Breakdown | Per-Slot Scores, Tier-Bonus, Synergy, Streak | Live |
| F8 | Progressive Scores | Live-Polling während Event läuft (60s Interval) | Live |
| F9 | Equipment Inventar | User hat Equipment aus Mystery Box (user_equipment) | Live (backend only, kein UI) |

### File Inventory

| # | File | Lines | Rolle | Aktion |
|---|------|-------|-------|--------|
| 1 | `src/components/fantasy/event-tabs/LineupPanel.tsx` | 887 | Pitch + Slots + Picker | **ENHANCE** (Equipment Badge + Picker) |
| 2 | `src/components/fantasy/EventDetailModal.tsx` | 547 | Event Modal Container | **ENHANCE** (Equipment State durchreichen) |
| 3 | `src/components/gamification/ChipSelector.tsx` | 276 | Legacy Chip UI | **DEPRECATED** (nicht löschen, aber ausblenden) |
| 4 | `src/features/fantasy/services/lineups.mutations.ts` | 54 | save_lineup RPC Call | **ENHANCE** (Equipment-Map durchreichen) |
| 5 | `src/features/fantasy/hooks/useEventActions.ts` | ~207 | Submit Lineup Orchestrierung | **ENHANCE** (Equipment-Map) |
| 6 | `src/lib/services/equipment.ts` | 52 | Equipment Service (read only) | **ENHANCE** (equip/unequip RPCs) |
| 7 | `src/lib/queries/equipment.ts` | 38 | Equipment Hooks | **ENHANCE** (invalidation) |
| 8 | `src/types/index.ts` | ~30 | DbLineup, Equipment Types | **ENHANCE** |
| 9 | `supabase/migrations/` | — | score_event + save_lineup RPCs | **NEW MIGRATION** |
| 10 | `messages/de.json` + `messages/tr.json` | — | i18n | **ENHANCE** |

### Data Flow (aktuell → Lineup Save)

```
EventDetailModal
  → LineupPanel (Pitch + Slots + Captain + Wildcards)
  → handleSaveLineup()
    → useEventActions().submitLineup(event, players, formation, captainSlot, wildcardSlots)
      → submitLineupService({ eventId, slots, captainSlot, wildcardSlots })
        → supabase.rpc('save_lineup', { p_event_id, p_formation, p_captain_slot, p_wildcard_slots, p_slot_* })
      → invalidateQueries + activityLog + missionTracking
```

### Data Flow (NEU → mit Equipment)

```
EventDetailModal
  → LineupPanel (Pitch + Slots + Captain + Wildcards + EQUIPMENT)
  → handleSaveLineup()
    → useEventActions().submitLineup(event, players, formation, captainSlot, wildcardSlots, EQUIPMENT_MAP)
      → submitLineupService({ ..., equipmentMap: { 'att': equipmentId, 'def1': equipmentId } })
        → supabase.rpc('save_lineup', { ..., p_equipment_map: JSONB })
          → RPC: validate position match, UPDATE user_equipment SET equipped_player_id, equipped_event_id
      → invalidateQueries(qk.equipment.inventory)
```

### Data Flow (Scoring → mit Equipment Multiplikator)

```
score_event(p_event_id)
  → FOR each slot:
      base_score = player_gameweek_scores.score
      → Captain Bonus (×1.5 / ×3.0)
      → EQUIPMENT BONUS (×1.05 / ×1.10 / ×1.15 / ×1.25)  ← NEU
      → accumulate to total
  → Synergy Bonus
  → Streak Bonus
  → UPDATE lineups SET slot_scores, total_score, equipment_details
  → CONSUME EQUIPMENT: UPDATE user_equipment SET consumed_at = now() WHERE equipped_event_id = p_event_id
```

### Shared State

| Store/Query | Key | Impact |
|-------------|-----|--------|
| React Query | `qk.equipment.inventory(uid)` | Invalidieren nach Lineup Save + nach Scoring |
| React Query | `qk.events.entry(eventId, uid)` | Lineup reload nach Save |
| React Query | `qk.fantasy.lineupScores(uid, eventIds)` | Score Display nach Scoring |

---

## 1.2 Goals + Non-Goals + Anti-Requirements

### Goals

1. **Equipment an Spieler anlegen** — User tippt auf Spieler im Lineup → wählt Equipment aus Inventar → Equipment-Badge sichtbar am Slot
2. **Position-Matching** — Feuerschuss nur an ATT, Eiserne Mauer nur an DEF, Kapitän an alle
3. **Scoring-Multiplikator** — Equipment-Rang bestimmt Multiplikator auf Spieltag-Score (R1=×1.05 bis R4=×1.25)
4. **Einmaliger Verbrauch** — Equipment wird nach Event-Scoring aus Inventar entfernt
5. **Sichtbarkeit** — User sieht auf dem Pitch welcher Spieler welches Equipment hat

### Non-Goals

- Equipment-Shop (Kauf mit Tickets/CR)
- Equipment-Upgrade (R1→R2 kombinieren)
- Equipment-Trading zwischen Usern
- Alte Chips löschen (nur ausblenden in dieser Session)
- Equipment in Score Breakdown Detail-Ansicht (kommt später)

### Anti-Requirements

- KEINE Änderung an Captain-Mechanik (×1.5 bleibt)
- KEINE Änderung an Synergy/Streak-Bonus-Berechnung
- KEIN neues npm Package
- Equipment-Multiplikator hat KEIN Cap (anders als Captain mit Cap 150/300) — der Score wird einfach multipliziert
- KEINE Equipment-Zuweisung nach Event-Lock (gleiche Lock-Logik wie Lineup)

---

## 1.3 Feature Migration Map

| # | Feature | Current | Target | Action |
|---|---------|---------|--------|--------|
| F1 | Lineup Builder | Pitch + Slots | + Equipment Badge am Slot | **ENHANCE** |
| F2 | Captain Selection | Tap/Doppelklick | Unchanged | **NONE** |
| F3 | Wildcard Slots | WC Badge | Unchanged | **NONE** |
| F4 | Legacy Chips | ChipSelector sichtbar | **Ausgeblendet** (condition: false oder feature flag) | **HIDE** |
| F5 | Synergy Bonus | +5% pro Club-Duo | Unchanged | **NONE** |
| F6 | Streak Bonus | +5%/+15% | Unchanged | **NONE** |
| F7 | Score Breakdown | Per-Slot Scores | + Equipment-Multiplikator Badge (×1.05 etc.) | **ENHANCE** |
| F8 | Progressive Scores | Live-Polling | Unchanged | **NONE** |
| F9 | Equipment Inventar | Backend only | + Equipment-Picker UI im Lineup Builder | **ENHANCE** |
| F10 | Equipment Equip/Unequip | *NEU* | Tap Slot → Equipment Picker → Assign | **CREATE** |
| F11 | Equipment Consumption | *NEU* | score_event consumed Equipment nach Scoring | **CREATE** |

---

## 1.4 Blast Radius Map

### Change 1: save_lineup RPC erweitern

Neuer Parameter: `p_equipment_map JSONB` — `{"att": "equipment-uuid", "def1": "equipment-uuid"}`

**Direct consumers:**
- `src/features/fantasy/services/lineups.mutations.ts:18` — RPC Call
- `src/features/fantasy/hooks/useEventActions.ts:169` — submitLineup params

**Impact:** Beide müssen neuen Parameter durchreichen. RPC muss Equipment validieren (Position-Match, Ownership, nicht schon equipped).

### Change 2: score_event RPC erweitern

Equipment-Multiplikator nach Captain-Bonus. Consumption nach Scoring.

**Direct consumers:** Nur intern (RPC wird von Admin/Cron aufgerufen, nicht vom Client).

**Impact:** Keine Client-Änderung nötig. Nur RPC-Logic.

### Change 3: LineupPanel — Equipment Badge + Picker

**Direct consumers:**
- `src/components/fantasy/EventDetailModal.tsx:468` — renders LineupPanel

**Impact:** LineupPanel bekommt neue Props (equipmentMap, onEquipmentChange, userEquipment). EventDetailModal muss State managen.

### Change 4: user_equipment Tabelle

Neues Column: `consumed_at TIMESTAMPTZ` (nullable — NULL = aktiv, SET = verbraucht)

**Direct consumers:**
- `src/lib/services/equipment.ts:42` — getUserEquipment SELECT
- `src/lib/queries/equipment.ts:33` — useUserEquipment hook

**Impact:** Filter `WHERE consumed_at IS NULL` in Queries.

### Change 5: DbLineup Type erweitern

Neues Feld: `equipment_map: Record<string, string> | null`

**Direct consumers:**
- Alle Lineup-Display-Komponenten die DbLineup lesen

---

## 1.5 Pre-Mortem

| # | Failure Scenario | Mitigation |
|---|-----------------|------------|
| 1 | **Position-Mismatch:** User legt Feuerschuss (ATT) an DEF-Spieler | RPC validiert Position-Match. UI filtert Inventar nach passender Position. |
| 2 | **Doppelte Nutzung:** Gleiches Equipment an 2 Spieler in verschiedenen Events | RPC prüft: `equipped_event_id IS NULL AND consumed_at IS NULL`. Atomic UPDATE mit WHERE-Clause. |
| 3 | **Equipment nach Lock zuweisen:** User ändert Equipment nachdem Fixture gestartet | Equipment-Zuweisung folgt gleicher Lock-Logik wie Lineup-Änderung. Locked Slots = keine Equipment-Änderung. |
| 4 | **Consumption vor Scoring:** Equipment wird verbraucht aber Event wird nie gescored | Consumption NUR in score_event RPC. Kein separater Cron. |
| 5 | **Score-Explosion:** R4 (×1.25) + Captain (×1.5) + Synergy (×1.15) = 2.15x Stack | Multiplikatoren werden sequentiell angewendet (nicht multipliziert). Equipment kommt nach Captain. Maximaler Stack ist gewollt — Belohnung für gutes Equipment. |
| 6 | **Leeres Inventar:** User hat kein Equipment → UI zeigt nichts | Equipment-Badge nur sichtbar wenn Equipment zugewiesen. Picker zeigt "Kein Equipment verfügbar" wenn Inventar leer. |
| 7 | **Legacy Chip Konflikt:** Alter ChipSelector + neues Equipment gleichzeitig | ChipSelector wird ausgeblendet (nicht gelöscht). Equipment ersetzt Chips funktional. |

---

## 1.6 Invarianten + Constraints

### Invarianten

1. **Captain Bonus:** ×1.5 (oder ×3.0 mit Triple Captain) — unverändert
2. **Synergy Bonus:** +5% pro Club-Duo, max 15% (30% mit Synergy Surge) — unverändert
3. **Streak Bonus:** +5%/+15% — unverändert
4. **Lineup Lock-Logik:** Locked Slots können nicht geändert werden — gilt auch für Equipment
5. **Tier-Bonus:** +100/+300/+500 CR — unverändert
6. **Lineup Save:** Gleicher Flow (Join → Save) — Equipment als Zusatzparameter

### Constraints

- Max 10 Files pro Wave
- Equipment-Multiplikator wird NACH Captain-Bonus angewendet
- Position-Matching wird im RPC validiert (nicht nur UI)
- Equipment-Consumption ist atomar im score_event RPC
- Kein Equipment an leere Slots
- Equipment-Picker filtert nach Spieler-Position
- `consumed_at IS NULL` Filter in allen Equipment-Queries

---

## 1.7 Akzeptanzkriterien

### AC1: Equipment an Spieler anlegen
```
GIVEN: User hat Equipment im Inventar (z.B. Feuerschuss R2)
WHEN: User tippt auf ATT-Spieler im Lineup
THEN: Equipment-Picker öffnet sich
  AND: Nur passende Equipment-Typen sichtbar (ATT: Feuerschuss + Kapitän)
  AND: User wählt Feuerschuss R2
  AND: Equipment-Badge erscheint am Spieler-Slot (Flamme-Icon + "R2")
  AND: Equipment verschwindet aus verfügbarem Inventar (aber noch nicht consumed)
```

### AC2: Equipment entfernen
```
GIVEN: Spieler hat Equipment zugewiesen
WHEN: User tippt auf Spieler und wählt "Equipment entfernen"
THEN: Equipment-Badge verschwindet
  AND: Equipment kehrt ins verfügbare Inventar zurück
```

### AC3: Position-Matching
```
GIVEN: User hat Feuerschuss (ATT) und Eiserne Mauer (DEF)
WHEN: User tippt auf DEF-Spieler
THEN: Picker zeigt NUR Eiserne Mauer + Kapitän
  AND NOT: Feuerschuss sichtbar
```

### AC4: Scoring mit Equipment
```
GIVEN: Spieler hat Score 80, Equipment R2 (×1.10)
WHEN: score_event läuft
THEN: Slot-Score = 80 × 1.10 = 88
  AND: Captain-Bonus wurde VOR Equipment angewendet
  AND: Equipment wird nach Scoring consumed (consumed_at gesetzt)
  AND: Equipment verschwindet aus User-Inventar
```

### AC5: Scoring ohne Equipment
```
GIVEN: Spieler hat KEIN Equipment
WHEN: score_event läuft
THEN: Score-Berechnung identisch zu jetzt (kein Multiplikator)
```

### AC6: Equipment-Badge auf Pitch
```
GIVEN: Spieler hat Equipment zugewiesen
THEN: Auf dem Pitch-Slot ist ein kleines Equipment-Icon sichtbar
  AND: Icon zeigt Equipment-Typ (Flamme/Schild/Auge/Krone/Banane)
  AND: Rang-Badge sichtbar (R1/R2/R3/R4)
  AND: Score Breakdown zeigt "×1.10" neben dem Slot-Score
```

### AC7: Lock-Respekt
```
GIVEN: Fixture hat gestartet, Slot ist locked
WHEN: User tippt auf locked Spieler
THEN: Equipment-Picker öffnet sich NICHT
  AND: Bestehende Equipment-Zuweisung bleibt bestehen
```

### AC8: Equipment Consumption
```
GIVEN: Event wird gescored
THEN: Alle equipped Equipment für dieses Event bekommen consumed_at = now()
  AND: Equipment taucht nicht mehr im Inventar auf
  AND: Equipment-Zähler im Inventar sinkt
```

---

## SPEC GATE Checklist

- [x] Current State komplett (9 Features nummeriert)
- [x] Migration Map für JEDES Feature (11 Features, 4 ENHANCE, 2 CREATE, 1 HIDE)
- [x] Blast Radius für 5 Changes gegreppt
- [x] Pre-Mortem mit 7 Szenarien
- [x] Invarianten + Constraints definiert
- [x] 8 Akzeptanzkriterien
- [ ] **Anil hat die Spec reviewed und abgenommen**

---

## PHASE 2: PLAN (nach Spec-Abnahme)

### Vorläufige Wave-Struktur

| Wave | Zweck | Scope |
|------|-------|-------|
| **Wave 1: DB** | Migration: lineups.equipment_map, user_equipment.consumed_at, save_lineup erweitern, score_event Equipment-Multiplikator + Consumption | Migration |
| **Wave 2: Types + Service** | Types erweitern, Equipment Service (equip/unequip), Query-Filter (consumed_at IS NULL) | 4 Files |
| **Wave 3: Equipment Picker UI** | EquipmentPicker Component (Bottom Sheet), Equipment-Badge Component | 2-3 neue Files |
| **Wave 4: LineupPanel Integration** | Equipment-State in EventDetailModal, Badge auf Pitch-Slots, Picker-Trigger | 3 Files |
| **Wave 5: Wire + i18n** | submitLineup erweitern, useEventActions, ChipSelector ausblenden, i18n | 5 Files |
| **Wave 6: Polish + QA** | Visual QA, Edge Cases, Tests | 3 Files |

Plan wird nach Spec-Abnahme detailliert.
