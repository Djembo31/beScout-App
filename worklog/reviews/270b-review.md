# Slice 270b Self-Review — Tooltip-GW-Drift Fix

**Slice:** 270b
**Reviewer:** Primary-Claude (Self-Review per workflow.md S-Ausnahme — Reviewer-F-02-Follow-up zu 270, kein neuer Behavior-Risk)
**Datum:** 2026-05-05 Abend
**Verdict:** PASS

## Ausgangspunkt

Slice 270 Reviewer F-02 markierte: `getRecentScoreGameweeks` nutzt globalen MAX-Window für Tooltip-Labels, während Bars per-player-Window haben → User sieht "GW 33" auf einem Bar der eigentlich GW 28 ist.

## Implementierungsentscheidung — Variant B: Combined Service + select-Pattern

**Optionen evaluiert:**

| Option | Aufwand | Round-Trips | API-Break |
|--------|---------|-------------|-----------|
| A. Service per-player + Konsumenten-Refactor | M | 1 RPC | Ja, 4 Konsumenten anpassen |
| B. Combined Service + select-Pattern (gewählt) | S | 1 RPC | Nein |
| C. Zweiter Service, eigener Cache | S | 2 RPC bei parallel-Mount | Nein |

Variant B gewählt weil:
- 1 RPC + 1 Cache-Entry (kein Doppel-Round-Trip mit 2× JSON-Parse von 15k Elementen)
- API-Backward-Compat für 4 legacy `useRecentScores` Konsumenten (MarketContent, ClubAccordion, TransferListSection, useManagerData)
- Saubere Abstraktion: Konsumenten kennen die Combined-Map nicht, sehen nur ihre Sichten

## Acceptance Criteria

- ✅ AC-01: KaderTab.tsx Tooltip zeigt für Player X die echten Player-X-GWs (nicht globalen MAX) — verifiziert via `gameweeksMap?.get(item.player.id)` Pro-Player-Lookup
- ✅ AC-02: Backward-Compat — KaderPlayerRow `gameweeks?` Prop bleibt optional, FormBars fällt zurück auf bar-index falls undefined (KaderPlayerRow:219 `gameweeks?.[i] ?? null`)
- ✅ AC-03: Andere FormBars-Konsumenten unverändert (BestandPlayerRow, TransferListSection, PlayerIPOCard nutzen weiter `useRecentScores` mit unveränderter Signatur)

## Pre-Mortem-Check

| # | Risiko | Mitigation | Verifiziert? |
|---|--------|-----------|---------------|
| 1 | Map-vs-Array Konsumenten-Refactor übersehen | KaderPlayerRow Prop-Type `(number | null)[]` (war `number[]`) | ✅ tsc clean |
| 2 | Tooltip-Mapping rendert null-bar-Slots als GW=null | KaderPlayerRow:219 ist null-safe `?? null` | ✅ Type-Annotation erweitert |
| 3 | Performance: doppelte RPC | Variant B: 1 RPC, 2 selectors auf gleichem QueryKey | ✅ select-Pattern |

## Selbst-Audit (Slice 207-Pattern)

| Worktree-Escape | n/a (Main-Repo) |
|---|---|
| Pattern-References im Spec? | ✅ Slice 102 (Pilot-Default), Slice 270 (per-player) erwähnt |
| Code-Reading-Liste durchgegangen? | ✅ alle 5 Files gelesen (fixtures.ts, managerData.ts, KaderTab.tsx, KaderPlayerRow.tsx, FormBars + Konsumenten-Verify) |
| Self-Verification-Commands gelaufen? | ✅ tsc clean + vitest 3196/3197 PASS |
| Open-Questions geklärt? | ✅ keine offenen — Variant B-Entscheidung autonom (kein Money/Wording-Path) |
| TR-Locale-Wirkung? | ✅ keine — pure Render-Logik, keine i18n-Strings betroffen |
| Money-Path-Wirkung? | ✅ keine — Tooltip ist Read-Only-Display |

## Findings

**0 Findings.** Self-Review confidence high weil:
- Test-Coverage erweitert (4 fixtures.test.ts Tests grün mit neuer Combined-Map-Shape inkl. Multi-League-Verify)
- API-Backward-Compat in keys.ts dokumentiert
- 0 grep-Treffer für orphan `useRecentScoreGameweeks` / `getRecentScoreGameweeks` / `recentScoreGameweeks` in src/

## Empfehlung

PASS — Slice 270b commit-ready. Live-Verify auf bescout.net (KaderTab Tooltip Hover) post-Deploy als Polish-Sweep für Slice 271 Track A/B-Decision.
