# Slice 307 — last-5-Scores Unification auf Kanon-RPC (S7 #4/#6 cross-domain)

**Slice-Type:** Service + UI (Refactor, NON-Money)
**Größe:** M
**CEO-Scope:** Nein (rein technische Source-of-Truth-Konsolidierung, kein UX-/Money-Change; CTO-Scope „WIE")

---

## 1. Problem-Statement

S7-Registry **Player-Befund #4 = Fantasy-Befund #6 (cross-domain, P1):** „letzte 5 GW-Scores" hat **2 nicht-äquivalente Implementierungen**:

| Impl | Quelle | Verhalten | Konsument |
|------|--------|-----------|-----------|
| `getBatchFormScores` (`scoring.queries.ts:385`) | direkt `player_gameweek_scores` | **global** `limit(playerIds.length*5)` (kein per-Player-Window → Slice-270-Bug-Klasse, manche Spieler 0 Rows) · hardcoded `status:'played'` (KEINE DNP-Awareness) | NUR Fantasy-Picker (3 Consumer via `useBatchFormScores`) |
| `getRecentPlayerScoresAndGameweeks` → `rpc_get_recent_player_scores` (`fixtures.ts:461`) | JSONB-RPC | **per-Player absolute Liga-Window** (Slice 270/274-korrigiert), DNP=`null`→dashed | alles andere (KaderTab, MarketContent, ClubAccordion, TransferListSection via `useRecentScores`) |

→ Zwei Spieler-FormBars können je nach Komponente unterschiedlich aussehen. Der Picker zeigt zudem nie DNP (alles solide statt dashed). Registry-Ziel: „Auf RPC-Pfad vereinheitlichen (`getBatchFormScores` ist der schwächere)."

## 2. Lösungs-Design

Die 3 Fantasy-Picker-Consumer von `useBatchFormScores` migrieren auf den kanonischen `useRecentScores()` (= shared RPC, bereits überall sonst genutzt). Den schwächeren Pfad löschen.

- `useRecentScores()` → `Map<id, (number|null)[]>` (scores; via `selectScoresMap`).
- Standard-Mapper (bereits 4× im Code: KaderPlayerRow/PlayerIPOCard/TransferListSection/BestandPlayerRow): `score: s ?? 0`, `status: s != null ? 'played' : 'not_in_squad'`.
- Picker-FormBars (`FantasyPlayerRow:111`) rendert ohne `showTooltip` → `gameweek` nicht nötig → minimaler Mapper.

**Behavioral-Gewinn (gewollt):** DNP-Gameweeks erscheinen jetzt korrekt als dashed bars (statt fälschlich solide) — Slice-274-Verhalten.

**Cost:** `useRecentScores` ist always-on (kein `enabled`-Gate); lädt auf der Lineup-Page 1 shared JSONB-RPC (cached 5min) statt holdings-only. Akzeptabel — identische Kanon-Quelle wie /market, 1 Round-Trip.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/features/fantasy/components/lineup/PlayerPicker.tsx` | `useBatchFormScores`→`useRecentScores`+Mapper; `playerIds`-useMemo entfernen falls nur hier genutzt |
| `src/components/fantasy/event-tabs/useLineupPanelState.ts` | dito |
| `src/features/fantasy/components/lineup/LineupBuilder.tsx` | dito |
| `src/features/fantasy/services/scoring.queries.ts` | `getBatchFormScores` löschen (385-416) |
| `src/features/fantasy/queries/fantasyPicker.ts` | `useBatchFormScores` + Import löschen |
| `src/lib/queries/keys.ts` | `qk.scoring.batchForm` löschen (258) |

## 4. Code-Reading-Liste (✅ erledigt)

| File | Erkenntnis |
|------|-----------|
| `scoring.queries.ts:385-416` | getBatchFormScores: global-limit-Bug + hardcoded 'played' |
| `managerData.ts:23-47` | `useRecentScores`=`selectScoresMap`→`Map<id,(number\|null)[]>`; shared cache |
| `fixtures.ts:459-461` | `RecentScoreSlot={score:number\|null,gameweek:number\|null}` |
| `KaderPlayerRow.tsx:217-221` | Kanon-Mapper `{score:s??0, status:s!=null?'played':'not_in_squad', gameweek}` |
| `FantasyPlayerRow.tsx:37,111` | `formEntries:{score,status}[]`; `<FormBars>` ohne showTooltip → gameweek nicht nötig |
| 3 Consumer (PlayerPicker:87, useLineupPanelState:113, LineupBuilder:173) | identisch `formScoresMap?.get(id) ?? []` → braucht Mapper nach Migration |
| Test-Grep | **0** Tests referenzieren getBatchFormScores/useBatchFormScores/batchForm → keine Test-Löschung |

## 5. Pattern-References

- S7-Registry §1.5/§1.6 (Player) + §2.5 (Fantasy) — „last-5 2 Impls".
- errors-db.md „Per-Tenant-Window vs. Global-MAX (Slice 270)" + „Absolute-Liga-Window (Slice 274)" — warum die RPC kanonisch ist.
- errors-frontend.md „qk-Key-Definition ohne Konsument (Slice 267)" — qk.scoring.batchForm nach Löschung orphan → mit entfernen.

## 6. Acceptance Criteria

- **AC-1** [REFACTOR] `grep getBatchFormScores src/` → 0. `grep useBatchFormScores src/` → 0. `grep "scoring.batchForm" src/` → 0.
- **AC-2** [BEHAVIOR] 3 Picker-Consumer beziehen FormBars-Daten aus `useRecentScores()`. VERIFY: grep zeigt useRecentScores in allen 3.
- **AC-3** [SHAPE] formEntries-Mapper liefert `{score:number, status:'played'|'not_in_squad'}` (matcht `FantasyPlayerRow.formEntries`). DNP (`s==null`) → `not_in_squad`.
- **AC-4** [REGRESSION] `tsc --noEmit` grün + Fantasy/Manager/Market-Domain-Tests grün.

## 7. Edge Cases

| Case | Verhalten |
|------|-----------|
| Spieler nicht in Map (kein Score) | `.get(id) ?? []` → leere FormBars (5 dashed, FormBars padded) |
| DNP-GW (`score=null`) | `status:'not_in_squad'` → dashed bar (vorher fälschlich solide) |
| `playerIds`-useMemo verwaist | entfernen (sonst lint unused) |
| useRecentScores lädt vor Picker-Open | always-on, shared cache — akzeptiert |

## 8. Self-Verification Commands

```bash
grep -rn "getBatchFormScores\|useBatchFormScores\|scoring\.batchForm\|batchForm" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__
grep -rn "useRecentScores" src/features/fantasy/components/lineup/PlayerPicker.tsx src/components/fantasy/event-tabs/useLineupPanelState.ts src/features/fantasy/components/lineup/LineupBuilder.tsx
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/features/fantasy src/features/manager src/features/market src/lib/queries/__tests__
```

## 9. Open-Questions

- **[Autonom]** Mapper inline (matcht 4 existierende Copies) statt shared Helper — kein DRY-Refactor der 4 Bestands-Copies in diesem Slice (separate Hygiene). Begründung: minimaler Blast-Radius, kein Risiko für 4 funktionierende Consumer.
- **[Autonom]** gameweek im Picker-Mapper weglassen (FormBars ohne showTooltip).
- **Nicht in Scope (Anil-Decision separat):** Player-#3 L5-Pill-vs-FormBars (P0 Demo) ist eine UX-Entscheidung (Pill aus Bars ableiten vs. beide behalten), NICHT Teil dieser technischen Unifikation.

## 10. Proof-Plan

`worklog/proofs/307-last5-unification.txt`: grep-Audit (0 dead refs, useRecentScores in 3 Consumer) · tsc 0 · vitest grün.

## 11. Scope-Out

- KEINE Migration der 4 existierenden inline-Mapper-Copies auf shared Helper (separate DRY-Hygiene).
- KEINE Änderung am RPC `rpc_get_recent_player_scores` (ist bereits kanonisch).
- KEINE Player-#3 L5-Pill-Reconcile (Anil-UX-Decision, separat).

## 12. Stage-Chain (geplant)

SPEC → IMPACT skipped (kein Schema/RPC-Change; Consumer-Migration auf bereits-existierenden Hook; Delete von 0-Test-Code) → BUILD → REVIEW (Pflicht, M-Slice) → PROVE → LOG.

## 13. Pre-Mortem

1. **useRecentScores-Shape-Mismatch** → mitigiert: Shape verifiziert `(number|null)[]`, Mapper exakt wie 4 Bestands-Copies.
2. **playerIds verwaist → lint-Fail** → mitigiert: pro Consumer prüfen ob playerIds noch anderweitig genutzt, sonst entfernen.
3. **FantasyPlayerRow-Type-Bruch** → mitigiert: Mapper-Output `{score,status}` == Prop-Type.
4. **Picker zeigt plötzlich dashed bars** → das ist gewollt (DNP-korrekt), kein Bug.
