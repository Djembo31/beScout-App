# Slice 195 — Fantasy-Mechanics Overhaul (Beta-Blocker)

**Datum:** 2026-04-25
**Groesse:** L (cross-domain, Schema-Migration)
**CEO-Approval:** Anil 2026-04-25 (chat) — alle 4 Mechanik-Decisions confirmed
**Trigger:** Phase-A Audit fantasy-scoring-expert hat 6 P0 Findings identifiziert

## Ziel

Fantasy-Spieltag-Mechanik tester-ready machen. **BeScout-eigene Multiplier** (nicht FPL-1:1 kopieren), aber strukturelle Pflicht-Features (Bench, Auto-Sub, Constraint) bauen.

## CEO-Decisions (Anil 2026-04-25)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Captain-Multiplier | **1.1× (+10%)** statt FPL-2.0× — Skill-Reward, kein Gambling-Variance |
| 2 | Boost-Chip Effekt | **Captain → 1.25×** wenn Boost aktiv |
| 3 | Boost-Chip Reichweite | **nur auf Captain** anwendbar |
| 4 | Chip-Name | `triple_captain` → **`captain_boost`** (DB-Enum + UI) |
| 5 | Vice-Captain | **NICHT bauen** — bei 1.1× zu kleiner Punkte-Verlust um Vice-Captain zu rechtfertigen |
| 6 | Bench + Auto-Sub | **JA bauen** — No-Show eines Starting-Spielers ist gravierend (FPL-Standard 4 Bench-Spieler) |
| 7 | Max-pro-Verein-Constraint | **NICHT global**, sondern als **Event-Parameter** `max_per_club` (Admin setzt bei Event-Erstellung, NULL = unlimited) |
| 8 | Differentials | **bauen** — Top-Decision-Helper, RPC `get_event_captain_distribution` |

## Betroffene Files

### Backend (Migrations + RPCs)
- `supabase/migrations/20260425_slice_195_*.sql` (8 Schritte):
  1. ALTER `lineups` ADD `bench_slot1..4` UUID NULL (player_id refs)
  2. ALTER `lineups` ADD `bench_order INT[]` (Sub-Reihenfolge)
  3. ALTER `events` ADD `max_per_club INT NULL` (NULL = unlimited)
  4. ALTER `chip_type` ENUM rename `'triple_captain'` → `'captain_boost'` (mit Migration auf existing rows)
  5. UPDATE captain-multiplier RPC: 1.5× → 1.1×
  6. UPDATE chip-apply RPC: 3.0× → 1.25× UND Validation `chip nur auf captain_slot`
  7. UPDATE submit_lineup RPC: validiere bench + max_per_club constraint
  8. UPDATE score_gameweek RPC: auto-sub-logik bei No-Show (Position-Match aus Bench)
  9. NEU `get_event_captain_distribution(p_event_id UUID)` SECURITY DEFINER RPC (anonymized aggregate)

### Frontend
- `src/features/fantasy/components/lineup/LineupBuilder.tsx` — Bench-Slots-UI hinzufuegen
- `src/features/fantasy/components/lineup/PitchView.tsx` — Bench-Reihe rendern
- `src/features/fantasy/components/lineup/PlayerPicker.tsx` — Captain-Slot-Selection-UI
- `src/features/fantasy/components/event-detail/EventDetail.tsx` — Differentials-Badge auf Player-Card
- `src/components/admin/AdminEventCreateForm.tsx` — `max_per_club` Input (number, optional)
- `src/types/index.ts` — `ChipType: 'captain_boost'` (rename)
- `messages/de.json` + `messages/tr.json` — chip-Labels umbenennen

### Tests
- `src/lib/services/__tests__/lineup-validation.test.ts` — bench + max_per_club validation
- `src/lib/services/__tests__/chip-apply.test.ts` — captain_boost only on captain
- `src/lib/services/__tests__/auto-sub.test.ts` — position-match sub-logic

## Acceptance Criteria

1. **Captain-Multiplier:** ein Captain-Slot mit 10 Pkt rohen Punkten → 11 Pkt im Score (1.1× verifiziert via score_gameweek-Test)
2. **Boost-Chip Multiplier:** captain_boost aktiv + Captain 10 Pkt → 12.5 Pkt (1.25×)
3. **Boost-Chip Validation:** Apply auf Non-Captain-Slot → RPC error `chip_only_on_captain`
4. **Boost-Chip Rename:** existing rows mit `triple_captain` migriert auf `captain_boost`, UI zeigt neuen Namen DE+TR
5. **Bench + Auto-Sub:** No-Show eines Starting-Spielers → Position-konformer Bench-Sub eingerechnet (DEF→DEF, GK-Bench nur GK)
6. **Sub-Order:** wenn 2 No-Shows derselben Position, wird `bench_order[]` Reihenfolge respektiert
7. **Event max_per_club:** Admin erstellt Event mit `max_per_club=3` → Lineup-Submit mit 4 ManCity-Spielern → RPC error `max_per_club_exceeded`
8. **Event max_per_club NULL:** Admin laesst Field leer → keine Constraint, alle 11 koennen vom selben Verein sein
9. **Differentials-RPC:** `SELECT get_event_captain_distribution('event-uuid')` returnt JSON `[{handle, count, pct}]` ohne user_id-Leak
10. **Differentials-UI:** Player-Card im Lineup-Builder zeigt z.B. `41% C` neben dem Spieler
11. **i18n:** chip-Label DE „Captain-Boost", TR „Kaptan Boost" — kein raw key-leak
12. **Compliance:** kein neuer „Sieger/Siege" String in DE-Texte (siehe Hot-Fix Track B)

## Edge Cases

1. **Captain spielt nicht + kein Bench-Sub auf Position GK:** Captain-Slot bleibt 0 Pkt — kein Auto-Promote auf andere Spieler
2. **Boost-Chip aktiv aber Captain spielt nicht:** Chip-Slot weiterhin verbraucht (Standard-FPL-Verhalten), kein Refund
3. **Bench-Spieler spielen alle nicht:** kein Sub moeglich, Lineup hat unsubstituted Slot mit 0 Pkt
4. **Max_per_club = 0:** ungueltig, sollte CHECK constraint blocken
5. **Migration-Rollback:** `triple_captain` rows muessen reversibel sein (down-migration mappt zurueck)
6. **RLS:** `get_event_captain_distribution` darf keine user_id zurueckgeben (anonymized handle-only)
7. **Concurrent Lineup-Submits:** zwei User submitten gleichzeitig mit Bench-Slots — keine Race-Condition (Lineup ist per-User-unique)
8. **Constraint Frozen-State:** wenn Event live ist, kann max_per_club NICHT mehr geaendert werden (Trigger-Guard)

## Proof Plan

| AC | Proof-Type |
|----|-----------|
| 1, 2, 5, 6 | `npx vitest run src/lib/services/__tests__/auto-sub.test.ts` (gruen) |
| 3, 4 | DB Query: `SELECT chip_type FROM event_chips WHERE chip_type='captain_boost'` (>0 rows nach migration) |
| 7, 8 | Manual SQL via supabase-mcp: erstelle Test-Event, submit Lineup mit 4 ManCity → expect error |
| 9 | DB Query: `SELECT get_event_captain_distribution('test-event-id')` returnt JSON ohne user_id |
| 10 | Playwright-Screenshot `/fantasy/spieltag` mit `41% C`-Badge sichtbar |
| 11 | Playwright DE+TR: chip-Label rendert korrekt |
| 12 | `grep -E 'Sieger\|Siege' messages/de.json` returnt nichts (post-Hot-Fix) |

## Scope Out (NICHT in diesem Slice)

- ❌ MV-Trend systemisch (Slice 197)
- ❌ Form-L5-Filter universal (Slice 197)
- ❌ Triple-Captain als 3.0× (Mechanik-Decision: BeScout konservativ)
- ❌ Vice-Captain-Bauen (Decision: nicht noetig bei 1.1×)
- ❌ Wildcard / Free-Hit / Bench-Boost neue Chips (Phase 2)
- ❌ Live-Scoring 60s → 30s (Slice 197/198)
- ❌ Re-Score bei abgesagten Spielen (Slice 198+)
- ❌ **Auto-Sub Audit Trail** (Slice 195f Backlog) — `subs_applied JSONB` an `score_event`-Return + UI-Sub-Indicator-Badge auf Slot-Card. 195d-Review (CONCERNS, Finding M2) hat festgestellt: Aktuelles UI zeigt finalen Slot-Score, aber User/Tester kann nicht erkennen ob Original-Spieler oder Auto-Sub-Bench-Spieler. Quick-Add ~30 LOC RPC + 10 LOC UI; Spec spezifiziert nicht required, daher Backlog. Bei Beta-Test-Calls aktiv erklaeren: "Wenn ein Stammspieler nicht spielt, springt automatisch ein Bench-Spieler ein."
- ❌ **NULL-pgs.score Score-Inflation Audit** (195d-Review M1) — wenn `player_gameweek_scores` keine Row hat aber Spieler `minutes_played > 0` (Race oder noch-nicht-importiert), defaultet `score_event` auf 40. Spec-Klarheit + Test-Case fehlen. Beta-Test mit echten GW-Daten zeigen ob relevant. Falls Inflation: NULL→0 statt NULL→40.

## Sub-Slice Reihenfolge (Build-Order)

```
195a (30 Min)  Captain-Multiplier 1.5× → 1.1× (kleinste Migration)
195b (4 Std)   Boost-Chip Rename + Multiplier 3.0× → 1.25× + Captain-only-Constraint
195c (3 Std)   Event max_per_club Parameter (Schema + RPC + Admin-UI)
195d (2 Tage)  Bench + Auto-Sub (Schema + RPCs + LineupBuilder UI)
195e (4 Std)   Differentials-RPC + Player-Card-Badge
```

## Stage-Chain

```
SPEC (this file) → IMPACT (next: cross-cutting analysis) → BUILD (backend+frontend parallel) →
REVIEW (cold-context-reviewer-agent) → PROVE (vitest + sql + playwright) → LOG
```

## CTO-Notes

- Captain-Multiplier-Aenderung ist Money-adjacent (Punkte → Prizes via `score_gameweek`). Reviewer-Pflicht.
- DB-Enum-Rename ist breaking change fuer existing chip-rows. Migration MUSS UPDATE-Statement haben.
- max_per_club als Event-Parameter ist clean architectural choice — flexibler als globaler Constraint, erlaubt Multi-Liga + Single-Liga-Events parallel.
- Auto-Sub-Logic Position-Match ist FPL-Standard (DEF→DEF, GK→GK), keine Innovation noetig.
