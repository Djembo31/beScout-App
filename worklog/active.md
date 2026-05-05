# Active Slice

```
status: idle
slice: 270b
stage: LOG
spec: worklog/specs/270b-recent-score-gameweeks-per-player-tooltip.md
impact: in-spec (Service-Refactor mit 5 Files, Konsumenten unverändert via select-Pattern)
proof: worklog/proofs/270b-tsc-vitest.txt
review: self-review per workflow.md S-Ausnahme (1 RPC-Cap-Bug aus 270 saniert, kein neuer Behavior-Risk)
```

## Slice 270b LIVE 2026-05-05 — Tooltip-GW-Drift gefixt + Audit-Befund 271 verifiziert

| Stage | Output |
|-------|--------|
| 270b SPEC + BUILD + REVIEW + PROVE + LOG | S — Combined Service + select-Pattern (5 Files, 1 RPC, 2 Konsumenten-Sichten) |
| Befund 1 H1+H2+H3 Verify | ❌H1 ❌H2 ✅H3 (History-Gap 04-26 bis 04-29 → past.mv_eur=NULL → trend=NULL) |
| Befund 2 H4 Verify | ✅ DB-Default `perf_l5 NUMERIC NOT NULL DEFAULT 50.00` (intentional Salary-Cap-Proxy, Frontend-Bug für matches=0 Junioren) |

**Slice 270b Wirkung:**
- KaderTab Tooltip zeigt nun pro Spieler echte Player-eigene GWs (nicht globalen MAX).
- 1 RPC-Call shared zwischen `useRecentScores` (4 Konsumenten) und `useRecentPlayerGameweeks` (1 Konsument).
- API-Backward-Compat: `useRecentScores` Sigantur unverändert für legacy-Konsumenten.
- Orphan API gelöscht: `getRecentScoreGameweeks`, `useRecentScoreGameweeks`, `qk.fixtures.recentScoreGameweeks`.

**Slice 271 Audit-Verify (worklog/audits/2026-05-05/slice-271-discovery-mv-trend-perf-l5.md):**

Track A (mv_trend_7d) — H3 ROOT-CAUSE: History-Gap-Days (2026-04-26/27/28/29) fehlen → `past.mv_eur IS NULL` → `new_trend = NULL` für alle 4556 Spieler heute. **Self-Healing-Prognose:** ab 2026-05-07 sind 7d-old=2026-04-30 Daten verfügbar, dann echte Trends.

Track B (perf_l5=50) — H4 ROOT-CAUSE: DB-Default 50.00 ist intentional als Lineup-Salary-Cap-Proxy (6 RPCs nutzen `COALESCE(p.perf_l5, 50)`). Bug ist NUR im Frontend-Display (PlayerIPOCard zeigt 50 für 0-played Junioren).

**CTO-Empfehlung an Anil:** Track A Option A1 (PASSIV-Self-Healing) + Track B Option B1 (Frontend-`—`-Display für matches=0). Slice 271 als reine Frontend-Polish.

## Slice 270 + 270c + 270d v2 LIVE 2026-05-05 — Performance-Bars-Bug komplett gefixt (DOM-verifiziert)

| Stage | Output |
|-------|--------|
| 270 SPEC + IMPACT + BUILD + REVIEW + PROVE + LOG | M-Slice — Migration RPC `rpc_get_recent_player_scores` + `getRecentPlayerScores` Refactor + 4 Tests |
| 270c BUILD + PROVE + LOG | XS — `getPlayerMatchTimeline` Cross-Club-robust (Slice-081d Pattern) |
| 270d v1 BUILD + LOG (SUPERSEDED) | XS — `.range(0, 99999)` an `.rpc()` — wirkungslos, PostgREST ignorierte Override |
| 270d v2 BUILD + PROVE + LOG | XS — RPC auf JSONB-Return umgestellt (PostgREST-RPC-Cap-Workaround) |

**Live-Verify-Bilanz (Chrome-DevTools DOM-Audit):**
- Marktplatz "Mein Kader" → 11/12 Player mit `colored=5, dashed=0`, 1/12 expected dashed (BOZKURT 0 Spiele)
- ScoutCard-Back Zaniolo → 5/5 played mit echten Scores [70/65/67/66/70]
- 0 Console-Errors auf allen verifizierten Pages

**Knowledge-Promotion (alle 3 Patterns in errors-db.md):**
- Per-Tenant-Window vs. Global-MAX (Slice 270)
- Cross-Club-Contamination via API-Football (Slice 270c, ergänzt Slice 081d)
- PostgREST RPC-Pfad ignoriert `.range()` und `?limit` (Slice 270d v2)

**Pending Follow-ups (kein Beta-Blocker):**
- ⏳ Slice 270b — Tooltip-GW-Drift Reviewer-F-02 (Skeleton liegt vor)
- ⏳ Slice 271 — `mv_trend_7d` 4556× NULL + `perf_l5=50` Default 615 Spieler (Audit `worklog/audits/2026-05-05/slice-271-discovery-mv-trend-perf-l5.md`, Anil-Decision-Pflicht für Track A/B/C)
- ⏳ JSONB-Return Performance-Audit (15.350-Element-Array @ Cold-Start, 200-400ms JSON.parse Mobile) — Server-Side Filter-Param oder Pagination als Slice 271+
- ⏳ Test-Mock-Realismus-Refactor (Mock muss Backend-Cap-Verhalten spiegeln) — Slice 272+

## Self-Audit Session-Bilanz (Anil-Frage „Unsauberkeiten?")

5 Slice-Commits, 0 Reverts, aber mit Verbesserungspotential:

1. **Reviewer-Heuristik-Loch** — Slice 270 Reviewer hat PASS gegeben, RPC-Cap übersehen. Pattern erweitert in errors-db.md.
2. **270d v1 ohne Live-Verify gepusht** — `.range()` an `.rpc()` blind probiert statt Network-Header zu prüfen.
3. **Reviewer-Pflicht für 270d v2 ausgesetzt** — XS-self-review per workflow.md, aber post-fail wäre cold-context Reviewer angemessen gewesen.
4. **Test-Mocks zu naiv** — simulieren keinen 1000-row-Cap; grüne Tests trotz live-broken Service.
5. **JSONB-Return ohne Performance-Audit** — 15k-Element-Array at Cold-Start ist nicht-Ferrari-Quality. Funktioniert, aber kandidat für Refactor.
6. **4 separate Vercel-Deploys statt einer Wave** — Indiz für mangelnde Test-vor-Push-Disziplin.

## D63 Phase 4 Discovery KOMPLETT 2026-05-04

| Phase | Slices | Status |
|-------|--------|--------|
| 1 Identity-Foundation | 261/262/263 | ✅ live |
| 2 Action-Layer | 264/264b/265 | ✅ live |
| 3 Live-Pulse | 266/267/268b | ✅ live |
| 4 Discovery | 269 | ✅ live |
| 5 Visual-Polish | 270-273 (Stadium + 3D-Mystery-Box) | ⏳ pending |

10 von 13 D63-Slices live + Hotfix-Slice-Familie 270/270c/270d v2 (außerhalb Roadmap, vom Anil-Live-Bug 2026-05-05 getrieben).
