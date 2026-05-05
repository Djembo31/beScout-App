# Active Slice

```
status: idle
slice: 270d-v2
stage: LOG
spec: worklog/specs/270-perf-bars-multi-league-window.md (270c + 270d v1/v2 inline-Hotfix dazu)
impact: worklog/impact/270-perf-bars-multi-league-window.md
proof: worklog/proofs/270-db-smoke.txt + 270-tsc-vitest.txt + 270c-live-zaniolo-card-back-FIXED.png + 270d-v2-live-market-FIXED-COLORED-BARS.png
review: worklog/reviews/270-review.md (PASS) · 270c/270d self-review per workflow.md XS-Ausnahme
```

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
