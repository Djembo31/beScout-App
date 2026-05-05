# Slice 270b — Per-Player Tooltip-GW-Labels in FormBars

**Slice-Type:** Service + Component-Tooltip
**Größe:** S (5 Files)
**Status:** ✅ IMPLEMENTED 2026-05-05 Abend
**Datum:** 2026-05-05
**Trigger:** Slice 270 Reviewer F-02 — Tooltip-GW-Drift weil `getRecentScoreGameweeks` UNCHANGED globalen MAX nutzt während Bars Per-Player-Window haben.

## Implementation-Notes (2026-05-05 Abend)

**Variant gewählt:** Combined Service + select-Pattern (sauberster Pfad).
- Service `getRecentPlayerScoresAndGameweeks()` returnt `Map<string, RecentScoreSlot[]>` mit `{score, gameweek}` pro Slot.
- 1 RPC-Call, 1 QueryKey, 2 Konsumenten-Sichten via TanStack-Query `select`-Pattern.
- `useRecentScores` selectiert `scoresMap` (4 legacy-Konsumenten unverändert API).
- `useRecentPlayerGameweeks` selectiert `gameweeksMap` (NEU — KaderTab).
- Old `getRecentScoreGameweeks` + `useRecentScoreGameweeks` + `qk.fixtures.recentScoreGameweeks` GELÖSCHT.

**Files geändert:**
- `src/features/fantasy/services/fixtures.ts` (Service refactor + Type `RecentScoreSlot`)
- `src/lib/queries/managerData.ts` (Hooks mit select-Pattern)
- `src/lib/queries/keys.ts` (orphan-Key entfernt)
- `src/features/manager/components/kader/KaderTab.tsx` (Hook-Migration)
- `src/features/manager/components/kader/KaderPlayerRow.tsx` (gameweeks-Prop Type-Erweiterung)
- `src/features/fantasy/services/__tests__/fixtures.test.ts` (4 Tests umbenannt + erweitert)

**Verify:**
- `npx tsc --noEmit` clean
- `vitest run` 3196/3197 PASS (1 pre-existing skip, 0 failures)
- 4 fixtures.test.ts Tests grün mit kombinierter `{score, gameweek}` Map-Shape

---

## Problem (kurz)

Slice 270 hat `getRecentPlayerScores` auf Per-Player-Window umgestellt (RPC `rpc_get_recent_player_scores`).
`getRecentScoreGameweeks` wurde **bewusst nicht** mitgezogen — Tooltip in `KaderTab.tsx:153` nutzt weiterhin globalen MAX(gw) `[33,34,35,36,37]`.

**User-Wirkung:**
- FormBars zeigen Player-Eigene Scores `[60,65,70,68,72]` aus eigenen GWs `[28,29,30,31,32]`.
- Tooltip-Hover zeigt "GW 33" auf einem Bar der eigentlich GW 28 ist → User-Verwirrung.

## Lösungs-Optionen

| Option | Aufwand | Trade-off |
|---|---|---|
| **A. Service per-player + Component-Adaption** | M | Korrekt aber großer Konsumenten-Refactor (gameweeks Map<playerId,number[]> statt number[]) |
| **B. Tooltip im KaderPlayerRow disable wenn Mismatch** | XS | Visual-Regress: User sieht keine GW-Info mehr beim Hover |
| **C. RPC erweitern: `rpc_get_recent_player_scores` returnt zusätzlich gameweek pro Bar** | S | Bereits enthalten! `gameweek` ist im RPC-Return-Type — wir müssen nur das Mapping in `getRecentPlayerScores` erweitern und einen zweiten Service-Helper bauen `getRecentPlayerGameweeks(): Map<playerId, number[]>` |

**Empfehlung: Option C.** RPC liefert bereits die GWs, kostengünstig. Konsument-Adaption (KaderTab → useRecentScoreGameweeks → useRecentPlayerGameweeksMap) ist sauberer Refactor.

## Code-Reading-Liste (vor Implementation)

- `src/features/fantasy/services/fixtures.ts:419-431` (`getRecentScoreGameweeks` — globaler MAX-Variante)
- `src/lib/queries/managerData.ts:32-38` (`useRecentScoreGameweeks` — Hook)
- `src/features/manager/components/kader/KaderTab.tsx:148-160` (Konsument)
- `src/features/manager/components/kader/KaderPlayerRow.tsx:213-220` (gameweeks-Prop-Mapping)
- `src/components/player/FormBars.tsx:36-138` (Tooltip-Rendering, Slice 198 fm 5.1)

## Acceptance Criteria

- AC-01: KaderTab.tsx Tooltip zeigt für Player X die echten Player-X-GWs (nicht globalen MAX).
- AC-02: Backward-Compat — wenn KaderPlayerRow keinen gameweeks-Prop bekommt, fällt FormBars zurück auf bar-index (existierendes Verhalten).
- AC-03: Andere FormBars-Konsumenten ohne Tooltip (BestandPlayerRow, TransferListSection, PlayerIPOCard) bleiben unverändert.

## Out of Scope

- Server-Push-Update bei Live-Match.
- Tooltip-Styling-Refactor.
- TR-Locale-Tooltip-Text-Audit.

## Pre-Mortem

1. **Map-vs-Array Konsumenten-Refactor übersehen** → KaderPlayerRow expects `number[]`, neu: `number[]` aus Map.get(pid). Mitigation: TypeScript propagiert Mismatch.
2. **Tooltip-Mapping rendert null-bar-Slots als GW=null** → FormBars FORCE-tooltip braucht null-Guard. Mitigation: `gameweek: gameweeks?.[i] ?? null` im KaderPlayerRow ist bereits null-safe.
3. **Performance: extra Service-Call** → Wenn Service `getRecentPlayerGameweeksMap` separate Round-Trip hat, doppelte RPC. Mitigation: Beide Services teilen den gleichen RPC-Call (cached via TanStack-Query staleTime), nur unterschiedliches Mapping.

---

**Implementation deferred** — Slice 270 PASS-Wirkung (Bars sichtbar) ist Hauptfix. Tooltip-Drift ist Nuance, blockt nicht Beta-Launch. Schedule: nach Slice 271 Audit (mv_trend_7d) + Live-Verify Slice 270.
