# Slice 198b — Polish-Sweep Wave 2 (Risikoarme P2/P3)

**Datum:** 2026-04-25
**Groesse:** L (3-Track parallel-dispatch, ~15 Items)
**CEO-Approval:** CTO-scope (kein Money-Path, kein DB-Schema, kein Cron)
**Trigger:** Wave 1 (198) closed 16/20 — Wave 2 nimmt risikoarme Backlog-Items.

## Ziel

15 risikoarme P2/P3-Findings schliessen via 3-Track parallel-dispatch. Schwerpunkt: Patterns aus Wave 1 (i18n-Toast, Skeleton, ErrorState-Retry) auf restliche Pages anwenden.

## Tracks

### Track A — UX-Rest Top-5 (~3h)

Items aus `worklog/audits/2026-04-25/ux.md`:
- #1 P3 Home ErrorState onRetry inkonsistent (parallele Queries — analog Track-B-Wave1 Pattern)
- #3 P3 Market `playersLoading` blockt parallele Sections
- #7 P2 EventSummaryModal preventClose-TODO Re-Audit (mutation-pending check)
- #8 P2 CreateEventModal preventClose-TODO Re-Audit
- #10 P3 PostReplies Loader2 → Skeleton
- #12 P3 Missions Auth-Loading Skeleton (Auth-Race-Mitigation)

**Empfehlung:** 5 Top-Items aus 6 Liste. Ein Skip akzeptabel falls preventClose-Bugs in 7/8 nicht trivial.

### Track B — FM-UI Top-5 (~3h)

Items aus `worklog/audits/2026-04-25/fm-mechanics.md` (read-only / View-Layer, KEIN Money):
- 1.3 P2 In-Lineup-Filter Kader-Toolbar (Pattern aus Track-C-Wave1 Quick-In-Lineup)
- 2.3 P2 Lineup-Score-Projection (compute-only, perfL5-basiert)
- 2.4 P2 Event-Difficulty-Indikator im Selector (visual-only)
- 4.6 P3 Cross-Sub-Tab IPOs-ending-soon Banner (Banner-Component)
- 5.3 P3 Volume-Histogramm unter PriceChart (chart, read-only)
- 5.4 P3 Set-Price-Alert in Trading-Tab (frontend-Storage erstmal, kein Backend)

**Empfehlung:** 5 Top-Items. SKIP 5.4 wenn Backend-Persistence in Scope rutscht.

### Track C — Fantasy + Brand Top-5 (~3h)

Items aus `worklog/audits/2026-04-25/fantasy.md` + brand.md:
- F-12 P2 Sticky-Countdown statt Header (CSS-only, sticky-layout)
- C-04 P2 Predictions-Limit 5/GW Begruendung im UI (Hint-Text + i18n DE+TR)
- C-05 P2 Top-Predictor Leaderboard (read-only Aggregat aus existing Daten)
- K-02 P2 Most-Owned Players pro Club (read-only Aggregat)
- K-03 P2 Squad-Tab Fantasy-Pick-Rate (Component-Reuse aus 195e RPC)
- Brand #11 P3 PitchView Z221+224 bg-black/40+30 → bg-bg-main/N Token

**Empfehlung:** 5 Top-Items. F-12 + C-04 + C-05 + K-02 + Brand#11 — K-03 falls die existing RPC ausreicht.

## Acceptance Criteria

1. tsc clean nach Merge aller Tracks
2. vitest smoke pass auf modifizierten Bereichen
3. Mobile 393px verifiziert (mental)
4. DE+TR i18n symmetrisch fuer alle neuen Strings (Audit-Pattern aus errors-frontend.md gegen `manager.quickLineupAction`-Repeat-Bug)
5. KEIN Money-Path (alle Items read-only oder UX-Polish)
6. KEIN DB-Schema, KEIN neuer Cron
7. Reviewer-Agent verdict PASS oder CONCERNS-with-inline-Healing
8. ≥12 Findings closed (Ziel 15, Toleranz 12 wenn 1 Track 4/5 statt 5/5)

## Edge Cases

- preventClose-TODO Re-Audit (Track A 7/8) — wenn Modal nicht-async oder mutation nicht im scope: skip mit Begruendung
- Fantasy-Aggregate (Track C C-05, K-02) — wenn neuer RPC noetig: skip mit Backlog-Hinweis (Slice 199)
- Brand #11 PitchView — wenn `bg-bg-main` Token nicht passt (Pitch-spezifisches Styling): skip oder neuer Token

## Forbidden Files (Track-Locks)

- `src/components/missions/DailyChallengeCard.tsx` — Wave 1 Track B angefasst, Wave 2 nicht doppelt
- `src/app/(app)/founding/page.tsx` — Wave 1 Track B
- `src/components/manager/KaderToolbar.tsx` + `src/features/manager/components/kader/KaderTab.tsx` — Wave 1 Track B+C, Re-Edit benoetigt Conflict-Awareness
- `src/components/player/FormBars.tsx` — Wave 1 Track C, gross genug nicht doppelt anzufassen

## Proof Plan

| AC | Proof |
|---|---|
| 1 | tsc --noEmit clean |
| 2 | vitest smoke output |
| 3 | mental-check pro Track |
| 4 | i18n-Audit-Skript (errors-frontend.md Pattern) |
| 5 | Money-Path-Audit (`grep -rE "\\.from\\('(wallets\|transactions\|holdings)'" src/components/<new>`) |
| 6 | grep `vercel.json schedule` keine neue Zeile |
| 7 | worklog/reviews/198b-review.md persistiert |
| 8 | Punch-Liste-Update mit closed-Liste |

## Scope Out

- Wave 1 Skip-Backlog (Bulk-Buy, Sort-Volume, Aggregate-Hint, Quick-Action-Pills) — eigene Slices noetig
- F-09 BPS-Bonus, F-10 Salary-perfL5, R-03 Fantasy-only-Leaderboard, M-01 Mission-Hints — architektonisch / Backend-blocker
- Slice-198b-Wave-3 (rest items wenn 12+ closed in Wave 2)

## Stage-Chain

```
SPEC (this) → IMPACT inline → BUILD (3 Tracks parallel-dispatch in Worktrees mit Worktree-Awareness-Briefing) →
REVIEW (reviewer-agent combined) → REWORK (healer falls noetig) → PROVE → LOG
```

## Worktree-Awareness-Briefing (Mandatory in Agent-Prompts)

Per `memory/patterns.md` #34: jeder Track-Briefing MUSS enthalten:

> **WICHTIG:** Du arbeitest in einem Worktree. Dein CWD ist
> `C:\bescout-app\.claude\worktrees\agent-XXX`. Edits MUESSEN
> Pfade unter diesem Verzeichnis verwenden. NIEMALS
> `C:\bescout-app\src\...` als absoluter Pfad — das ist
> main-Repo, nicht dein Worktree. Bei Read/Edit/Write
> nutze relative Pfade ODER worktree-prefixed absolute Pfade.
