# Active Slice

```
status: active
slice: 267
stage: PROVE — RESUME-POINT für nächste Session (supabase-MCP-pflicht für Migration apply)
spec: worklog/specs/267-realtime-live-score.md (v3)
impact: worklog/impact/267-realtime-live-score.md (v2)
review: worklog/reviews/267-review.md (CONCERNS — Code BUILD-konform, 11/18 ACs ✅, 6 ⏳ pending Migration/Runtime/Proof, 1 ⚠️ AC-16) + worklog/reviews/267-pre-review.md (D62 PRE-Review)
tests: 64/64 vitest grün (FixtureCard 13 + useLiveFixtures + service-mock)
proof: worklog/proofs/267-build-complete.txt (BUILD-Stage tsc + vitest 64/64 + 53/53 regression-clean)
proof-pending: D54-Open-Items für PROVE-Stage:
  1. Pre-Migration-Verify (F-NEW-01): SELECT COUNT(*) FROM fixtures WHERE league_id IS NULL → worklog/proofs/267-pre-migration-verify.txt
  2. Migration apply (F-NEW-02): mcp__supabase__apply_migration → worklog/proofs/267-db-schema.txt
  3. Cron-curl-Proof: post-Deploy curl → worklog/proofs/267-cron-execution.txt
  4. Realtime-WS-Frame-Screenshot: Chrome DevTools → 267-realtime-ws-frame.png
  5. UI-Playwright 393px: bescout.net/fantasy mit Live-Fixture → 267-spieltag-live-mobile.png
  6. Modal-Screenshot: 267-modal-live.png
```

## Slice 267 — Realtime-Live-Score im Spieltag

**Combo:** `Q1=Vercel-Cron · Q2=C-Adaptive · Q3=A-API-Confirm · Q4=G1-strict` + `P-Spieltag · F2-Liga-Scope · X1-Polling-60s-Fallback`

**Wave-Plan (3 Worktrees parallel):**
- Wave 1 Backend: Migration + Cron + Service + Type
- Wave 2 Frontend: useLiveFixtures + SpieltagBrowser/Card/Modal + i18n
- Wave 3 Tests + Pre-Review-Memo + Reviewer

**Capacity verifiziert (context7 2026-05-02):** Vercel Pro ✅ Supabase Pro ✅ API-Football Pro ✅ — alle <20% Auslastung Beta.

## Phase 2 Action-Layer Manager-Hub KOMPLETT (Slices 261-265 live, 6 in Folge)

6 Slices in Folge mit D62 Reviewer-VOR-BUILD-Pattern. Slice 265 = Phase 2 Action-Layer Abschluss.

| Slice | Commit | Was |
|-------|--------|-----|
| 261 | `3aae52c9` | GameweekStatusBar (Phase 1) |
| 262 | `ee31a628` | Hero-Mode-Detection + ManagerBlock (Phase 1) |
| 263 | `53874a0e` | Doppel-Identität-Pills (Phase 1 Abschluss) |
| 264 | `b359f4ab` | ActionRequiredStack (Phase 2 Required) |
| 264b | `44057ab1` | Wildcard-Pill (Phase 2 Optional-Hint) |
| 265 | (this) | StreakRiskCard (Phase 2 Streak-Risk) |

## D63 Roadmap Stand 2026-05-02

| Phase | Slices | Status |
|---|---|---|
| 1 Identity-Foundation | 261, 262, 263 | ✅ live |
| 2 Action-Layer | 264, 264b, 265 | ✅ KOMPLETT |
| 3 Live-Pulse | 266 (Spotlight-Multi-Slot), 267 (Realtime-Live-Score), 268 (Price-Cache) | ⏳ pending — 268 schon live, nur 266+267 noch |
| 4 Discovery | 269 (Markt-Puls 3-Tab) | ⏳ pending |
| 5 Visual-Polish | 270-273 (Stadium-Assets + 3D-Mystery-Box) | ⏳ pending |
