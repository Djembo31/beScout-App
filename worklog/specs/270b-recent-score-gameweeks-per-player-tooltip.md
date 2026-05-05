# Slice 270b — Skeleton: Per-Player Tooltip-GW-Labels in FormBars

**Slice-Type:** Service + Component-Tooltip
**Größe:** S (1-2 Files)
**Status:** SKELETON (nicht implementiert — Follow-up zu Slice 270, vom Reviewer F-02 ausgelöst)
**Datum:** 2026-05-05
**Trigger:** Slice 270 Reviewer F-02 — Tooltip-GW-Drift weil `getRecentScoreGameweeks` UNCHANGED globalen MAX nutzt während Bars Per-Player-Window haben.

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
