# Review Slice 283 — Market Portfolio-Tab von /api/players entkoppeln

**Typ:** Cold-Context-Reviewer-Agent (a52c54c5a5184d320), L-Slice-Pflicht
**Verdict:** REWORK → **alle PFLICHT-Findings geheilt** → merge-ready
**Datum:** 2026-06-12 · time-spent Reviewer: ~25 min

## Findings + Heal-Status

| # | Sev | Issue | Heal |
|---|-----|-------|------|
| F-01 | **MAJOR** | Dashboard-RPC-Error → `data===undefined` als Loading-Proxy → endloser Skeleton auf /market-Default-Tab + /manager, ohne ErrorState/Retry (AC-06-Verstoß, 282-Klasse auf der Error-Achse) | ✅ isLoading/isError destrukturiert; `portfolioPlayersError = dashboardError \|\| byIdsError`; +Regression-Test |
| F-02 | MINOR | searchPlayersByName: `,()` brechen PostgREST-or-Syntax → 400 → silent leere Picker-Liste | ✅ Escape erweitert `[%_,().]` |
| F-03 | MINOR | HistoryEventCard: unused `useUser` nach Refactor | ✅ entfernt (inkl. Import) |
| F-04 | MINOR | Wave-2-Memo-Konsolidierung nicht umgesetzt, undokumentiert | ✅ dokumentiert als bewusst-partial (s.u.) |
| F-05 | NIT | 4 orphan i18n-Keys nach Wave 3 (sortChange24h/L15/AgeAsc/AgeDesc) | ✅ in de+tr entfernt, JSON-parse verifiziert |
| F-06 | NIT | Search ohne Debounce + silent-empty bei Error | Backlog (limit 8 + 60s staleTime + 2-Zeichen-Gate = günstig; Hint-UX später) |
| F-07 | NIT | /manager erbt globalen Market-Tab — nach Marktplatz-Besuch ist full-list dort wieder enabled | Backlog-Kandidat `portfolioOnly`-Option (kein Regress vs. pre-283) |
| F-08 | NIT | HistoryEventCard byIds-Loading nicht im Gate → „—"-Flash | ✅ 282-F-03-Formel angewandt |

**F-04-Dokumentation (Wave 2 partial):** Die Konsolidierung von Enrichment-Pass (enriched.ts) + priceHist-Merge (useMarketData) zu EINEM Memo wurde bewusst NICHT umgesetzt: durch das Tab-Gating laufen beide Pässe nur noch nach explizitem Marktplatz-Tab-Open (statt auf jedem /market-Mount), und priceHist ist bereits tab-gated — der verbleibende Doppel-Pass kostet einmalig ~2×O(4500) beim Tab-Wechsel. Eine Konsolidierung würde die enriched.ts-API für ihren einzigen Caller verbiegen. Re-Visit falls GHA-TBT auf marktplatz-aktiv weiterhin auffällt (283b).

**Heal-Verify:** tsc 0 Fehler · market+manager-Suiten 191/191 grün (inkl. neuem F-01-Regression-Test).

## Reviewer-Positiv (Original)

- 282-Lehren aktiv angewandt (per-Tab-Error-Gates mit data.length-Guard, byIds-Upstream-Loading-Formel wörtlich, enge Retry-Prefixes mit 282-F-09-Zitat)
- Pipeline-Konsistenz: Subset durch identische dbToPlayers+Enrichment-Kette (Slice-102-Contract), Union-Maps elegant
- Gefährlichster versteckter Konsument (HistoryEventCard mit verkauften Spielern) gefunden statt übersehen
- Wave 3 vollständig konsistent (Type ↔ UI ↔ cases), searchPlayers mit open-Gating

## Knowledge-Capture (→ LOG)

1. **„Derived-Loading aus `data === undefined`" ist TanStack-v5-Anti-Pattern** — nach Error bleibt data undefined → Loading hängt permanent. IMMER isLoading/isError destrukturieren. (282-F-03-Erweiterung um die Error-Achse.)
2. **PostgREST `.or()`-User-Input braucht Escaping über `%_` hinaus** — `,` und `()` sind or-Parser-Syntax → 400.
