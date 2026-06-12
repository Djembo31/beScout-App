# Slice 284c — Wave 3: Markt/Rankings-Fixes (FM-01..05, 07)

**Größe:** M · **Slice-Type:** Service + UI · **Datum:** 2026-06-13 · **CEO-Scope:** Nein
**Spec-Basis:** Punch-List `worklog/audits/2026-06-12/stab-284-punchlist.md` (fm-mechanics-Audit) — Fix-Skizzen des Domain-Experten 1:1 umgesetzt; Locations dort verifiziert. Token-bewusste Schlank-Spec per Anil-Direktive.

| Fix | Was |
|-----|-----|
| FM-01 P1 | KaderTab auf kanonische `computePlayerFloor`-Chain — Wert/P&L-Parity /market↔/manager |
| FM-02 P1 | PlayerRankings: volume `.gt(0)` / change `.neq(0)` + Empty-State `noMarketMovement` (DE/TR) |
| FM-03 P1 | Liga/Country-Filter server-seitig via `getAllClubsCached()`-club_ids + queryKey; limit 20 direkt |
| FM-04 P2 | Bulk-Sell: sold/skipped-Zähler + Abschluss-Toast `market.bulkSellResult` (DE/TR) |
| FM-05 P2 | getRecentlyEndedIpos `.limit(200)` (1000-cap-Klasse) |
| FM-07 P2 | LastEventResults: rank=0 → Em-Dash (Render-Guard; Service-Shape unangetastet = kein Type-Ripple) |
| FM-06 P2 | **DEFER** (dokumentiert): Leaderboards liga-scopen = eigener Slice; Header-Hack abgelehnt (globale SSOT-Konsistenz Slice 251) |

ACs: tsc 0 · betroffene Suiten grün · Visual-Spotcheck /rankings + /manager-Kader post-Deploy. Edge: leere filterClubIds-Liste (unbekannte Liga) → `.in('club_id', [])` = leeres Result + Empty-State ✓.
Scope-Out: FM-08..11 (Backlog), FM-06-Scoping. Stage-Chain: SPEC→IMPACT (skipped: keine RPC/Migration; Query-Layer-Änderung nur komponentenlokal ['rankings'-Key]) →BUILD→REVIEW (Self)→PROVE→LOG.
