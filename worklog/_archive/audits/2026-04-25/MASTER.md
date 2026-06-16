# Beta-Readiness Master-Audit — 2026-04-25

**Phase A komplett.** 4 Linsen × 18-21 Pages auditiert. 98 Findings dokumentiert. Anil bereitet 50 Tester vor.

## Executive Summary

| Linse | Health | P0 | P1 | P2 | P3 | Total |
|-------|--------|----|----|----|----|----|
| Brand-Coherence | **8.6/10** | 0 | 3 | 9 | 6 | 18 |
| UX-States | **7.4/10** | 0 | 11 | 13 | 3 | 27 |
| FM-Mechanics | **7.6/10** | 0 | 11 | 11 | 4 | 26 |
| Fantasy-Scoring | **5.4/10** | **6** | 9 | 8 | 4 | 27 |
| **TOTAL** | — | **6** | 34 | 41 | 17 | **98** |

**Verdict:** **CONDITIONAL GO** — alle P0 sind in Fantasy-Domain. Trading/Market/Profile/Community sind tester-ready. Spieltag-Mechanik braucht 3-5 Tage Slice 195.

## Beta-Blocker (P0) — alle in Fantasy

| # | Finding | Source | Estimate |
|---|---------|--------|----------|
| F-01 | **Vice-Captain fehlt komplett** — keine `vice_captain_slot` column auf `lineups`. Punkte-Verlust 100-300 Pkt/Saison | fantasy.md | 1-2 Tage |
| F-02 | **Kein Bench / Auto-Sub** — Lineup ist Starting-XI only. No-Show-Spieler = 0 Pkt ohne Replacement | fantasy.md | 2 Tage |
| F-03 | **Captain-Multiplier 1.5× statt FPL-Standard 2.0×** — Mental-Model-Bruch | `supabase/migrations/20260330_streak_benefits_rpcs.sql:111` | 30 Min |
| F-04 | **Constraint „Max 3 pro Verein" fehlt** — FPL-Hard-Rule | fantasy.md | 2 Std |
| F-05 | **Triple-Captain Chip nicht im UI** — DB-Enum existiert | `src/types/index.ts:2175` | 1 Tag |
| F-06 | **Differentials/Pick-Rate fehlt** — FPL-Top-Decision-Helper #1 | RPC `get_event_captain_distribution` | 4 Std |

## Top-Highlights — was BeScout BESSER macht als Wettbewerb

Aus FM-Mechanics + Fantasy-Audits:

- **4-Lens-Kader** (Performance/Markt/Handel/Vertrag) — schlägt FM24-Squad-View
- **PriceChart mit Crosshair + Spline + 1W/1M/3M/All** — Sorare-/Tradingview-Niveau
- **Bulk-Sell Sticky-Bottom-Bar Mobile** — sauberer als Sorare-Modal
- **Best-Deals-Heuristik-Filter** (L5/Price > 0.1) — unique
- **Threshold-Alert-Popover Watchlist** + **In-Lineup-Indicator** — QoL-Wins
- **Per-Fixture-Lock** (besser als FPL GW-Lock) — Bundesliga-Manager-Style
- **DPC-Ownership-Bonus** + **Synergy-Bonus** — originelle BeScout-Mechaniken
- **12-Tier Promotion-System** (Bronze→Legendär) — tiefer als FPL
- **Trader/Manager/Analyst-Radar** — unique Multi-Persona-Identification
- **PreventClose mit Mutation-State** durchgängig — Comunio hat das nicht (echte Money-Bugs)

## P1 Top-Patterns (zuerst fixen, propagiert auf viele Stellen)

### Cross-Cutting (1 Fix → viele Pages)

1. **Tailwind-yellow Token-Drift** (Brand) — `kaderHelpers.tsx:69` ist zentraler Punkt. Fix propagiert in Manager/Market/Fantasy. **<10 Min**
2. **MV-Trend systemisch fehlt** (FM-Mechanics) — DB-Spalte + Pills-Component. Comunio-Standard seit 2003. **1-2 Tage**
3. **Form-L5-Filter Asymmetrie** (FM-Mechanics) — vorhanden in /market, fehlt in /manager + Watchlist. Universal-Component. **4 Std**
4. **i18n-Key-Leak Settings** (UX) — `setError(err.message)` Klassiker aus errors-frontend.md. `mapErrorToKey(normalizeError(err))`. **1 Std**
5. **Loader2 statt Skeleton** (UX) — 6 Pages: Manager/Transactions/Inventory/Founding/Missions/Aufstellen. Verstößt ui-components.md. **2 Std**
6. **Compliance-Drift „Sieger/Siege"** (Fantasy) — 6 user-facing Strings in `de.json` verletzen business.md Glossar. **1 Std**

### Section-Components ohne isError-Branch (UX)

- Rankings 7/7 Sections, Inventory 3/4, Airdrop — bei RPC-Failure ewig Loading
- Fix-Pattern: Error-Card mit Retry-Button systemisch nachrüsten

## Per-Page-Health-Scores

| Page | Brand | UX | Domain | Avg |
|------|-------|----|----|-----|
| /missions | 10 | — | — | 10 |
| /transactions | 10 | — | — | 10 |
| /inventory | 10 | — | — | 10 |
| /rankings | 10 | — | — | 10 |
| /profile | 10 | — | — | 10 |
| /player/[id] | 10 | — | 9 | 9.5 |
| / Home | 9 | — | — | 9 |
| /market | 9 | — | — | 9 |
| /community | 9 | — | — | 9 |
| /clubs | 9 | — | — | 9 |
| /club/[slug] | 9 | — | — | 9 |
| /compare | 9 | — | — | 9 |
| /founding | 9 | — | — | 9 |
| /profile/[handle] | 9 | — | — | 9 |
| /airdrop | 8 | — | 6.5 | 7.25 |
| /profile/settings | 8 | — | — | 8 |
| /manager | 7 | — | — | 7 |
| /fantasy | 7 | — | **5** | 6 |

**Niedrigste:** /fantasy (5/10 FPL-Score), /manager (7/10), /airdrop (7.25/10)
**Höchste:** alle Wrapper-Pages (10/10), /player/[id] (9.5/10)

## Empfehlung — Fließband-Plan

Mit dieser Wahrheit auf dem Tisch ändert sich die Phase-B-Reihenfolge:

### Slice 195 — Fantasy P0-Fixes (3-5 Tage, Beta-Blocker)
1. Vice-Captain Spalte + UI (F-01)
2. Bench + Auto-Sub (F-02)
3. Captain-Multiplier 2.0× (F-03)
4. Constraint max-3-pro-Verein (F-04)
5. Triple-Captain UI (F-05)
6. Differentials-RPC + Badge (F-06)

### Slice 196 — Cross-Cutting P1 (1 Tag)
7. yellow → status-doubtful Token (Brand-Top-1)
8. i18n-Key-Leak Settings (UX-Klassiker)
9. „Sieger/Siege" → „Top-Platzierung" Compliance
10. Loader2 → Skeleton auf 6 Pages
11. Section-Components isError-Branch

### Slice 197 — FM-Power-User-Boosts (2-3 Tage)
12. MV-Trend systemisch (Comunio-Standard)
13. Form-L5-Filter universal
14. Captain-Pick-Rate (auch FM-relevant für Lineup-Decision)

### Slice 198 — Polish-Sweep Page-by-Page (2 Tage)
15. Modal-Backdrops bg-black/N → bg-bg-main/N (5 Stellen)
16. airdrop Inline-Hex → text-gold (2 Stellen)
17. Section-Components ohne isError nachrüsten

**Total bis Tester-Ready: ~8-11 Werktage** (= ~03./04. Mai 2026)

## Bots-Status

- 50 Accounts existieren, 44 mit neuem 10x-Budget refreshed
- Total Pool: 4.07M $SCOUT
- agent.ts community-mute aktiv, tsc clean
- Trade-Run noch nicht gestartet — wartet auf Anil-Decision

**Wichtig:** Bots traden in /market + /manager — diese Pages sind 8.5+ Health. Sie traden NICHT in /fantasy. **Bot-Run ist orthogonal zu Fantasy-P0-Fixes.**

## CEO-Decision Punkte

1. **Slice 195 jetzt starten?** (Fantasy P0 Pflicht vor Tester-Launch)
2. **Bots `--smart 10` Pilot oder warten?** (Bots brauchen Fantasy nicht — können parallel laufen)
3. **Tester-Launch-Date?** Bei sofort-Slice-195-Start realistisch ~03./04. Mai 2026
4. **Compliance:** „Sieger/Siege" in de.json — fix sofort als Hot-Fix oder mit Slice 196 zusammen?

## Files

- `worklog/audits/2026-04-25/brand.md` (154 Zeilen)
- `worklog/audits/2026-04-25/ux.md` (471 Zeilen)
- `worklog/audits/2026-04-25/fm-mechanics.md` (498 Zeilen)
- `worklog/audits/2026-04-25/fantasy.md` (285 Zeilen)
- `worklog/audits/2026-04-25/MASTER.md` (dieser File)

Total: **1408 Zeilen Audit-Wahrheit** — Phase A vollständig.
