# Active Slice

```
status: idle
slice: 297 ✅ DONE
stage: LOG complete
spec: worklog/specs/297-club-detail-tab-split.md
impact: skipped (UI-Reorder + ClubTab-Type + i18n — kein Service/RPC/Schema/Query-Key)
proof: worklog/proofs/297-club-tab-split.txt
review: worklog/reviews/297-review.md (reviewer-Agent PASS — 1 INFO orphan-imports out-of-scope)
decision: F-4 → Option B (Tab-Split). Label „Mehr"/„Daha" (id `mehr`). Übersicht 17→8; neuer Mehr-Tab (6); FDR+LastResults → Spielplan. FeatureShowcase bleibt Übersicht (Onboarding-Fallback).
note: AC-5 Mobile-393px-Playshot post-Deploy ausstehend (Proof §7).
```

## Zuletzt

- **Slice 297** (2026-06-13) — Club-Detail Narrative Tab-Split (UI, M, PASS): schließt S3 F-4 (P2). Option B (Anil): Übersicht 17→8 Lead-Module; neuer „Mehr"/„Daha"-Tab (Most-Owned, Trades, Fan-Rang, News, Research, Info); FDR-Strip+Letzte-Ergebnisse → Spielplan-Tab. FeatureShowcase bleibt Übersicht (thin-Club-Onboarding-Fallback). Behavior-preserving (useClubData untouched), 17/17 grün, tsc 0. Mobile-393px-Playshot post-Deploy.
- **Slice 296** (2026-06-13) — Fantasy Unauth State Explicit + Test (Tool+Doc, S, PASS): schließt S3 F-3 (P2). Decision: Auth-Enforcement ausschließlich via `<AuthGuard>` (redirect `!user`→/login), `&& user`-Gates sind defensive Null-Safety, KEIN page-local Sign-In-CTA (Single-Source-Auth-UX). Doku-Kommentar in `FantasyContent.tsx` + `describe('unauth contract')` ×4 (Shell rendert, kein Tab-Body, Disclaimer bleibt, kein CTA); Auth-Mock → mutable. 10/10 grün, tsc 0.
- **Slice 295** (2026-06-13) — /clubs Discovery Page Contract Test (Tool, S, PASS): schließt S3 F-2 — `ClubsDiscoveryPage` hatte 0 Page-Test. Neu `ClubsDiscoveryPage.test.tsx` lockt 5 page-local Contracts (loading/error/empty/follow/activate) + 2 Edges (anon no-op, Activate-absent); 7/7 grün, tsc 0. Kein src/**-Runtime-Change.
- **Slice 294** (2026-06-13) — Public Club Metadata Compliance Copy (i18n, XS, PASS): `/club/[slug]` Meta „Trading" raus → i18n-driven `meta.clubDescription` (DE+TR Option A); orphaned RED-Test `page.metadata.test.ts` grün gemacht (i18n-sauber); vitest 4/4, compliance passed.
- **Slice 293** (2026-06-13) — Deterministic Fantasy Lifecycle E2E (Tool, M, PASS): Contract-Level-E2E gegen bescout.net (own-login) ersetzt konditionalen Render-Smoke; 8 ACs grün 7.4s; schließt den 5×-wiederholten demo-green E2E-Caveat aus Hermes' Audits S1–S3. Commit 5294833a.
- **Slice 292** (2026-06-13) — S3 Page Contract Audit `/fantasy` + `/clubs` + `/club/[slug]` (Docs-only): all three demo-yellow; F-1 public Club metadata “Trading” copy; F-2 `/clubs` page-test gap.
- **Slice 291** (2026-06-13) — Unified Trading GeoGate (TDD): `/player/[id]` and `/manager` trading actions now use `useRegionGuard('dpc_trading')`; content remains visible, trading execution blocked when restricted.
- **Slice 290** (2026-06-13) — Home Portfolio-Floor-Parity Fix (TDD): Home nutzt für Holdings jetzt canonical `computePlayerFloor` via byIds Player, fallback `floor_price`; useHomeData 40/40 grün.
- **Slice 289** (2026-06-13) — S2 Page Contract Audit Home + Manager (Docs-only): Home GREEN mit YELLOW-Vorbehalt; Manager YELLOW; F-1 Portfolio-Floor-Divergenz als höchster Demo-Coherence-Fix.
- **Slice 288** (2026-06-13) — S1 Page Contract Audit /market + /player/[id] (Docs-only): /market GREEN mit YELLOW-Vorbehalt; /player/[id] YELLOW; F-1 GeoGate-Asymmetrie als P1-Folgeentscheidung.
- **Slice 287** (2026-06-13) — Product Truth Freeze / S0 Stabilization (Docs-only): current product truth file, README replacement, historical vision warnings, READY wording clarified.
- **Slice 286** (2026-06-13) — Cold-Load-Race Liga-Filter (M, root-cause via useSyncExternalStore, live 0→9 buttons).
- **Slice 285** (2026-06-13) — FM-06 Liga-Header über PlayerRankings (XS).
- **Slice 284d** (2026-06-13) — Fantasy-UI (M, 2 P1 DB-bewiesen).

**Backlog-Notiz (Slice 286 Reviewer):** `clubs.ts` hat dasselbe non-reaktive Cache-Pattern
wie leagues.ts (pre-Fix). Falls je ein render-time `useMemo(() => getClub(...))` entsteht →
gleiche Cold-Load-Race, gleiches useSyncExternalStore-Fix-Pattern anwendbar.

**🚨 Slice 284 Wave 2 (284b) weiter blockiert:** API-Football-Key seit 06.05. suspendiert.
154 Geister-Triage + Süper-Lig-Drift brauchen API-Verify. Anil-Action: dashboard.api-football.com.

**TR-Review offen (Anil):** `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").

## Stabilization Mode — Product Truth Freeze ✅

Canonical current-product-truth pointer:
- `memory/current-product-truth.md`

Steering audit:
- `worklog/audits/2026-06-12/stabilization-master-audit.md`

Nächstes empfohlen:
- **Slice 293 ✅ DONE:** Deterministic Fantasy Lifecycle E2E — schließt den E2E-Caveat für /fantasy.
- **Slice 294 ✅ DONE:** S3 F-1 — Public Club Metadata „Trading" raus + i18n; orphaned RED-Test geheilt.
- **Slice 295 ✅ DONE:** S3 F-2 — `/clubs` Page-Test für loading/error/empty/follow/activate (+2 Edges).
- **Slice 296 ✅ DONE:** S3 F-3 — Fantasy Unauth-State explizit + getestet (rely-on-AuthGuard Decision).
- **Slice 297 ✅ DONE:** S3 F-4 — Club-Detail Tab-Split (Option B): neuer „Mehr"-Tab, Übersicht 17→8.
- Optional Demo-Step-8: /club + /clubs Lifecycle-E2E via Slice-293-Blueprint (`testing.md` „Contract-Level E2E gegen Live-Prod").
- Nächster Audit-Schritt: S4 Source-of-Truth Boundaries.
- Kein breiter Feature-Ausbau vor Demo-Path-Stabilisierung.

## Slice 284 — Core-Domain-Stabilisierung · Waves 1+3+4 ✅ / Wave 2 blockiert

**🚨 BLOCKER für Wave 2 (Anil):** Production-API-Football-Key seit 06.05. suspendiert
(dashboard.api-football.com → Abo/Zahlung). Wave 2 (154 Geister-Triage + Süper-Lig-
Drift-Cleanup) braucht API-Verify gegen echte Spielergebnisse vor dem Löschen.

| Wave | Inhalt | Status |
|------|--------|--------|
| 1 (284a) | Live-Lifecycle P0-Kette | ✅ LIVE |
| 3 (284c) | Markt/Rankings FM-01..05,07 | ✅ LIVE |
| 4 (284d) | Fantasy-UI FANT-05/08/09/13 | ✅ LIVE |
| 2 (284b) | Daten-Heal: 154 Geister + Süper-Lig-Drift + max_gameweeks + parseGameweek-Cap + FANT-10 | ⏸ Key-abhängig |

Punch-List: worklog/audits/2026-06-12/stab-284-punchlist.md
Backlog (Slice 284+): FM-08..11 · FANT-11/12/16 (CEO Vice-Captain) · FM-06 Leaderboard-Scoping · LW-01.
