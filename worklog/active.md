# Active Slice

```
status: active
slice: 211
stage: PROVE
spec: worklog/specs/211-spec-foundation-uplift.md
impact: skipped (workflow-files + skill-files + rule-files only — no DB/RPC/Service)
proof: worklog/proofs/211-ac-audit.txt
review: worklog/reviews/211-review.md
```

## Zuletzt

- **Slice 210** (2026-04-26) — UX 17 Airdrop isError-Handling (XS-Slice, frontend-only, Pattern-Wiederholung). `useAirdropLeaderboard` + `useAirdropStats` mit `isError`+`refetch` destructured, 2 separate Error-Branches (Stats-Bar 3-way, Leaderboard-Card inner 4-way). myEntry+Tier-CTA suppressed bei Leaderboard-Error. Self-Review (D35 trivial-pattern Slice 196 inventory/rankings). tsc clean. Punch-Liste UX 17 → done.
- **Slice 209** (2026-04-26) — Audit-Stale-Cleanup (docs-only, D48 catcher-pattern, 4. Iteration). 12 row-marker korrigiert: 8 → done (F-02/F-08/K-01 + UX 11/14/15/16/19 verified als already-fixed seit Slice 196/197/198), 2 → wont-fix (UX 6/22 — Audit selbst "akzeptabel"), 2 → watch (UX 7/8 preventClose-TODO). Aggregat-Tabelle re-stabilisiert mit Drift-Note. Real-actionable-without-CEO: nur **UX 17 (airdrop isError)** + **Brand 1 (P3 low-prio)**. Punch-List effektiv: 89 done + 5 wf + 2 watch + 2 real-open + 4 post-beta-deferred = 98.
- **Slice 208** (2026-04-26) — FM 6.2 Trend-Sparkline-Mini-Chart auf /transactions (S-Slice frontend-only). Neue `TrendSparkline`-Sub-Component mit per-Tag-Aggregation aus existing `filteredCredits`, range-reaktiv (7d/30d/90d/all mit 90-Bucket-Cap), color-coded green/red, dashed Zero-Baseline bei mixed-sign. 10 Edge-Case-Tests via vi.useFakeTimers. Reviewer CONCERNS→PASS post-Heal (A11y SVG aria-fix, PriceChart-Pattern). Spec-Drift dokumentiert (Linear statt Catmull-Rom — bei 60px H + 90-Density nicht differenzierbar). Punch-Liste 85 → 86/98 (~88%). Commit 0889075d.
- **Slice 207** (2026-04-26) — Most-Owned Discovery Batch (K-02). M-Slice via Worktree-Agent (escaped — CTO konsolidiert) + 2 Migrations (v1→v2 Heal). Anonymized-Aggregate-RPC #4 der Pattern-#38-Series. Discovery `/clubs` zeigt pro ClubCard "🔥 X% besitzen Y. Müller" (FPL-Trust-Signal). Reviewer PASS (2 NITs nicht-blockierend). 11/11 vitest PASS. Punch-Liste 84 → 85/98 (~87%).
- **Slice 205** (2026-04-26) — ScoutConsensus Reliability-Indicator (FM 5.2). XS-Slice. Tier-Badge low/medium/high im Header basierend auf qualifiziertem Report-Count (1-9/10-49/50+). D46-Reuse research-data, kein neuer Service. Self-Review (D35 Pattern-Wiederholung Slice 201b ConcentrationBar Tier-Color-Coding). FM-Mechanics 26/26 (100% closed). Punch-Liste 83 → 84/98 (~86%).
- **Slice 204** (2026-04-26) — Squad-Tab Fantasy-Pick-Rate (K-03). S-Slice. PickRateBadge auf /club/[slug] Spieler-Tab Cards-View, D46-Reuse `useEventPlayerPickRates` (Slice 195e RPC). Reviewer CONCERNS→PASS post-Heal (Badge-Position `top-2 right-2` ueberlappte L5-Score → `bottom-2 right-2` Footer-Bereich). Punch-Liste 82 → 83/98 (~85%).
- **Slice 201d** (2026-04-26) — Prediction-Consensus-Hint (C-03). M-Slice CTO unter voller Autonomie. RPC `get_prediction_consensus` LIVE + PredictionConsensusHint mit Top-3 Distribution-Bars + Color-Coding amber/purple. 3. RPC der Anonymized-Aggregate-Series. Self-Review (D35). Punch-Liste 81 → 82/98 (~84%).
- **Slice 201c** (2026-04-26) — Fantasy-Context-Hints (M-01). S-Slice. State-derived Hints via pure-deriver. Self-Review.
- **Slice 201b** (2026-04-26) — Holders-Distribution-Mini-Bar (FM 4.3). M-Slice. Reviewer PASS.
- **Slice 201a** (2026-04-26) — Per-Trade-Player-Link in Transactions (FM 6.1). S-Slice.
- **Slice 200b** (2026-04-26) — Wave 4 Polish-Sweep. 3 closed + 1 already-fixed-marker. Reviewer PASS.
- **Slice 200a** (2026-04-26) — Wave 3 Polish-Sweep. 4 closed + 1 already-fixed-marker. Reviewer REWORK→PASS post-Heal.
- **Slice 199** (2026-04-25) — Backend-Aggregat-RPC-Wave. 4 closed. Reviewer PASS.

## Backlog (priorisiert)

**Real-actionable-frontend-only (CTO-scope, nächste empfohlene Slices):**
- **UX 17** Airdrop kein isError-Handling — `airdrop/page.tsx:26-27` ergänzen (Pattern aus inventory/rankings). XS-S Slice.
- **Brand 1 P3** Quick-Action-Pills Component-Extraction (Home `page.tsx:172`) — Polish-Refactor low-prio.

**Backend-M-Slice (kein CEO needed, brauchen Time-Budget):**
- **FM 10.2 + 10.3** Airdrop Personal-Score-History + Friends-Filter — Backend-Aggregate + Filter-UI.

**Money-Path CEO-Approval pflicht:**
- **F-09** BPS-Bonus-System — Scoring-RPC-Erweiterung.
- **UX 20** MembershipSection Subscribe ohne Confirm-Step — Money-Risk.

**Watch-status (kein-action-jetzt, re-audit on async-Refactor):**
- **UX 7** EventSummaryModal preventClose TODO
- **UX 8** CreateEventModal preventClose TODO

**Post-Beta-deferred:**
- F-14 Formation-Presets per User-Liste · C-06 Polls Closed-Time-Display · R-05 „Why I lost"-Breakdown · M-02 Streak-basierte Mission · Holdings-RPC-Migration (PostgREST → SECURITY DEFINER) · L5-Data-Drift Audit (11% ohne perf_l5)

**Anil-Action:** TR-Locale-Reviewer organisieren · 3 Beta-Tester organisieren · Vercel-Plan-Decision · Slice 200 Aggregations-Strategie-Approval (3 Optionen).

## Anil-Action-Items

- **3 Beta-Tester anrufen** (Familie/Freunde, min 1 TR)
- **Vercel-Plan-Entscheidung** (Hobby vs Pro)
- **TR-Locale-Reviewer organisieren**
- **Slice 200 Aggregations-Strategie-Approval** (3 Optionen: Trigger / MV / Cron)
- **Inkognito-Verify** auf bescout.net Manager → keine Ghost-Rows mehr
- **TR-Wording-Review Slice 200a:** "Tümü / Aktif / Tamamlandı / Bu görünümde görev yok / Etki Gücü"
- **TR-Wording-Review Slice 202:** "Tier Karşılaştırması / Üst tier'da ne ekstra alıyorum? Tüm avantajların tam dökümü. / Özellik / Fiyat / Kredi / Geçiş Bonusu / İşlem İndirimi / Limit / Ekstralar / Dahil / Dahil değil"
- **TR-Wording-Review Slice 208:** "Trend ({days} gün)" / "Günlük net"
