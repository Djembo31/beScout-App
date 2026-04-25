# Slice 198 — Polish-Sweep (P2/P3 Mass-Close)

**Datum:** 2026-04-25
**Groesse:** L (Multi-Track, ~50 Items, 2-3 Tage parallel-dispatched)
**CEO-Approval:** CTO-scope (kein Money-Path, kein Schema-Change)
**Trigger:** Phase B Polish-Sweep finalisieren — Punch-Liste 32/98 → ~80/98

## Ziel

Maximale Anzahl P2/P3-Findings in einem Multi-Track parallel-dispatch schliessen. Schwerpunkt: Polish + UX-Konsistenz, kein Money-Path, keine DB-Schema-Aenderungen, keine neuen Cron-Jobs.

## Tracks (parallel-dispatched in 4 Worktrees)

### Track A — Brand-Drift-Rest (~5 Items, 1-2h)

**Findings (aus brand.md):**
- #1 P3 Quick-Action-Pills inline-tokens (purple-500/10, amber-400) → Component-Library-Drift, ggf. extract
- #2 P3 Gold-Pulse-Gradient als CSS-Var
- #11 P3 PitchView Z221+224 bg-black/40+30 (Pitch-Hintergrund — bewusst lassen oder als pitch-bg-Token)
- #15 P3 airdrop diamond `#B9F2FF` inline-Hex → `tier-diamond` Token (analog 196 Track A gold)
- #16 P3 airdrop Rocket Icon `text-purple-400` → `text-gold` (Header-Convention)
- #17 P3 profile/[handle] raw button → Button-Component
- #18 P2 club/[slug] raw button + rounded-md → Button-Component

### Track B — UX-States-Rest (~13 Items, ~3h)

**Findings (aus ux.md):**
- #1 P3 Home ErrorState onRetry inkonsistent (alle parallele Queries)
- #2 P2 Buy-Error-Banner auto-dismiss nach 8s
- #3 P3 Market playersLoading blockt parallele Sections
- #6 P2 KaderTab BulkSell Bar persistence
- #7 P2 EventSummaryModal preventClose-TODO Re-Audit (wenn async)
- #8 P2 CreateEventModal preventClose-TODO Re-Audit
- #10 P3 PostReplies Loader2 → Skeleton
- #11 P2 DailyChallengeCard Retry-Hint
- #12 P3 Missions Auth-Loading Skeleton
- #14 P2 founding loadData smooth Re-Render (optimistic)
- #19 P2 Settings Notif-Prefs/Push silent console.error → Toast
- #20 P2 MembershipSection Subscribe ConfirmDialog (Money-Risk)
- #22 P3 compare Empty-Slot Touch-Targets

**Empfehlung:** Top-5-Hebel zuerst (#19 Toast + #11 Retry + #14 optimistic + #6 Bar-Persistence + #22 Touch-Targets). Rest in 198b nachziehen.

### Track C — FM-Mechanics-Rest (~11 Items, ~3-4h)

**Findings (aus fm-mechanics.md):**
- 1.3 P2 In-Lineup-Filter Kader-Toolbar
- 1.4 P2 Quick-In-Lineup-Action in KaderRow
- 2.3 P2 Lineup-Score-Projection
- 2.4 P2 Event-Difficulty-Indikator im Selector
- 3.1 P2 HistorieTab Avg-Rank/Best-Rank-Card
- 4.4 P2 Sortier nach Trade-Volume-7d
- 4.5 P2 Multi-Select Bulk-Buy /market
- 4.6 P3 Cross-Sub-Tab IPOs-ending-soon Banner
- 5.1 P1 FormBars Match-by-Match Hover-Tooltip
- 5.2 P2 Differential-Sentiment ScoutConsensus
- 5.3 P3 Volume-Histogramm unter PriceChart
- 5.4 P3 Set-Price-Alert in Trading-Tab

**Empfehlung:** Top-5-Hebel: 5.1 (FormBars Tooltip — scheunentor-Find), 4.4 (Sort by Volume), 4.5 (Bulk-Buy symmetrisch zu Bulk-Sell), 1.4 (Quick-In-Lineup), 3.1 (Avg-Rank Stat-Card).

### Track D — Fantasy + Missions/Inventory P2/P3 (~12 Items, ~3-4h)

**Findings (aus fantasy.md + fm 7-8):**
- F-12 P2 Sticky-Countdown statt Header
- F-13 P2 Form-Trend Sparkline + Δ
- C-01 P1 Streak-Anzeige Predictions
- C-02 P1 Difficulty-Slider visible
- C-03 P1 Aggregate-Hint "% tippte gleich"
- C-04 P2 Predictions-Limit-Begruendung im UI
- C-05 P2 Top-Predictor Leaderboard
- R-04 P2 Tier-Promotion-CTA
- R-05 P3 "Why I lost"-Breakdown
- K-02 P2 Most-Owned Players pro Club
- K-03 P2 Squad-Tab Fantasy-Pick-Rate
- M-01 P2 Mission-Hints kontextabhaengig

**Empfehlung:** Top-5-Hebel: C-01 (Streak), C-02 (Difficulty visible), C-03 (Aggregate-Hint), R-04 (Tier-Promotion-CTA), F-13 (Form-Trend Sparkline).

## Acceptance Criteria

1. tsc clean nach Merge aller Tracks
2. vitest smoke pass auf allen modifizierten Bereichen
3. Mobile 393px verifiziert (visual-mental, nicht Live)
4. DE+TR i18n symmetrisch fuer alle neuen Strings
5. Keine Money-Path-Aenderung
6. Keine neuen Cron-Jobs (Vercel-Hobby-Limit)
7. Reviewer-Agent verdict PASS oder CONCERNS-with-inline-Healing
8. Punch-Liste closes mind. 30 Findings (50 wenn alle Tracks 100% komplett)

## Edge Cases

- Mehrere Tracks fassen evtl. shared Files an (Konflikt-Risk):
  - **MarketFilters.tsx:** Track C (Sort by Volume) — anderer Section als 197a Form-L5/197d MV-Trend
  - **KaderToolbar.tsx:** Track C (In-Lineup-Filter) — analog Pattern aus 197a
  - **Founding/page.tsx:** Track B (#14 optimistic) — disjoint zu 196 (Skeleton + Progress-Bar bereits da)
- Track-Briefings MUESSEN explizite Forbidden-File-Liste enthalten.

## Proof Plan

| AC | Proof |
|---|---|
| 1 | tsc --noEmit clean |
| 2 | vitest smoke output (relevante Test-Files) |
| 3 | Visual-mental-Check pro Track (im Output) |
| 4 | i18n-Coverage-Check `grep` auf neue Keys |
| 5 | Money-Path-Audit (kein neuer .from('wallets'/'transactions') write) |
| 6 | grep `vercel.json` "schedule" — keine neue Zeile |
| 7 | worklog/reviews/198-review.md persistiert |
| 8 | Punch-Liste-Update mit closed-Liste |

## Scope Out

- Vice-Captain (CEO wont-fix)
- Auto-Sub Audit-Trail (Slice 195f Backlog)
- BPS-Bonus (Slice 199+ wegen DB-Schema)
- 197b m1 (CountdownLabel React.memo'd — Beta-PostHog-Data-getrieben)
- Slice-198-Wave-2 (rest items wenn 30/50 closed in Wave 1)

## Stage-Chain

```
SPEC (this file) → IMPACT inline → BUILD (4 Tracks parallel-dispatch) →
REVIEW (reviewer-agent combined) → REWORK (healer falls noetig) → PROVE → LOG
```
