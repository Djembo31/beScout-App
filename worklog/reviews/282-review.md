# Review Slice 282 — Home von /api/players entkoppeln

**Typ:** Cold-Context-Reviewer-Agent (afb3fbb5cb5ef70d2), M-Slice mit Behavior-Change (IPO-Reaktivierung)
**Verdict:** REWORK → **alle Findings geheilt** → PASS-äquivalent
**Datum:** 2026-06-11 · time-spent Reviewer: ~35 min

## Findings + Heal-Status

| # | Sev | Issue | Heal |
|---|-----|-------|------|
| F-01 | MAJOR | IPO-Doppel-Render bei Secondary-Slot — Sidebar-Gate prüfte nur `spotlightType` (=primary). Exakt Slice-278-Klasse, durch Reaktivierung des toten Features erstmals scharf. | ✅ Gate auf BEIDE Slots (`page.tsx:351` primary+secondary !== 'ipo') |
| F-02 | MAJOR | homeError härter als Original — dekorativer movers-Error hätte Full-Page-ErrorState ausgelöst; TanStack v5 background-refetch-Fail flippt status trotz data. | ✅ movers-Error raus aus homeError (graceful degrade via hasGlobalMovers); miniPlayersError nur fatal mit Daten-Guard (`error && data.length===0 && ids.length>0`). +3 Tests |
| F-03 | MINOR | homeLoading-Oszillation: trendingLoading fehlte → Spotlight Content→Skeleton→Content-Flash + byIds-Key-Churn-Doppel-Fetch | ✅ trendingLoading in homeLoading aufgenommen |
| F-04 | MINOR | Undokumentierter Spec-Drift: topMover-Sparkline gedroppt | ✅ Als bewusster Drop dokumentiert (history7d wird NIRGENDS befüllt — Sparkline war seit jeher dead code); stale Test-Mocks (MiniSparkline + history7d-Fixture) entfernt |
| F-05 | MINOR | IPO-Dedupe ohne Status-Priorität (early_access-Tranche könnte handelbare open-Tranche verdecken) | ✅ Priority-Sort open > early_access vor Dedupe (analog FIX-13 getIpoForPlayer) |
| F-06 | MINOR | route limit unvalidiert (NaN→500er) + moversCache unbounded | ✅ Clamp [1,50], NaN→5 |
| F-07 | MINOR | Keine Service-Tests für getPlayersByIds/getGlobalMovers | ✅ `players-byIds-movers.test.ts` (7 Tests: Chunk-Boundary 101→2 Queries, error-throw, !res.ok-throw, non-array-Fallback) |
| F-08 | NIT | trendingPlayers unused in page.tsx Destructure | ✅ entfernt |
| F-09 | NIT | Retry-Root-Prefix ['players'] hätte 4,2-MB qk.players.all refetcht | ✅ enge Prefixes byIds + globalMovers |
| F-10 | NIT | slotRows-Alias redundant | ✅ direkt benannt |
| F-11 | NIT | active.md Stage-Drift | ✅ aktualisiert |

**Heal-Verify:** tsc clean · 154/154 Tests grün (13 Files: useHomeData 35, home-Components, social, queries, neuer Service-Test).

## Reviewer-Positiv (Original)

- Pattern-Treue über 5 Lehren (.in()-Chunking §1, Slice-265-Defensive, Slice-267-qk-Konsument, Slice-200-SELECT_COLS, Slice-102-Shape-Mapping)
- movers-2-Query-Merge mathematisch korrekt (abs-Top-N ⊆ desc-Top-N ∪ asc-Top-N)
- Cache-Key-Design solide, alle 3 byIds-Caller memoized, kein Re-Render-Storm
- Tests testen Logik statt Mocks (IPO-Dedupe, progress-Rundung, defensive Error-Pfade)
- Reaktivierte IPO-Flächen AR-7-compliant („Erstverkauf"/„Kulüp Satışı" in allen 3 Keys)

## Knowledge-Capture-Kandidaten (für LOG)

1. errors-frontend.md Slice-278-Pattern erweitern: **Feature-Reaktivierung = Multi-Slot-Suppression-Audit-Trigger** — latente Gate-Gaps werden durch Reaktivierung toter Datenquellen scharf.
2. **Error-Gate-Semantik bei Query-Ersatz:** `error && data.length===0`-Guards des Originals NIE auf nacktes `isError` reduzieren (TanStack-v5-Background-Refetch-Fail).
3. **Abgeleitete byIds-Queries:** Upstream-Loading in kombinierten Loading-State aufnehmen (Skeleton-Oszillation + Key-Churn).
4. testing.md: **vi.spyOn + mockRestore auf bereits-gemockter vi.fn löscht deren Implementation** — Call-Counts via Mock-Property lesen.
