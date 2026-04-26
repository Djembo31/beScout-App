<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-04-26 15:46)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 1 Files
```
 M memory/session-handoff.md
```

## Session Commits: 10
- af7df312 chore(210): active idle nach Slice 210 Commit
- 36add578 feat(210): UX 17 airdrop isError-Handling (Pattern-Wiederholung Slice 196)
- fa172d3c docs(audit): 12 audit-stale-row-marker korrigiert (D48 catcher-pattern, 4. iter)
- 7b6c7b17 chore(208): active idle nach Slice 208 Commit
- 0889075d feat(208): FM 6.2 Trend-Sparkline-Mini-Chart auf /transactions
- 0ff92f86 docs(handoff): Session-End 2026-04-26 Late — 3 Slices + Audit-Cleanup + Worktree-Heal-Lessons
- de38bfa1 chore(207): active idle nach Slice 207 Commit
- 7cb58b22 feat(207): Most-Owned Discovery Batch (K-02)
- 4497e690 docs(audit): 7 audit-stale-row-marker korrigiert (D48 catcher-pattern)
- 318c6617 chore(205): active idle nach Slice 205 Commit

<!-- auto:handoff-end -->

---

# Resume-Anker (2026-04-26 Continuation 2 — 3 Slices + Audit-Stale-Cleanup + Strategie-Pause)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — `status: idle`, HEAD `af7df312`
2. `worklog/punch-list-2026-04-25.md` — Detail-Tabelle ist SoT, Aggregat hat Drift-Note (siehe Slice 209)
3. Diese Datei (Resume-Anker, Top-Block)
4. `worklog/log.md` Top 3 (210, 209, 208)
5. `git log --oneline -10` — `af7df312` ist HEAD

## Session-End 2026-04-26 (3) — 3 weitere Slices + Strategie-Pause

**Anil hat /clear + "weiter im Handoff" gestartet, dann nach 3 Slices Strategie-Pause: ehrliche Bewertung Ist-Zustand, Lücken, Game-Changer. Stand wird erst gesichert.**

### Pipeline-Status (alle 5 Commits gepusht)

| Commit | Slice | Findings | Pattern |
|---|---|---|---|
| `0889075d` feat | **208** FM 6.2 Trend-Sparkline auf /transactions | +1 (FM 6.2) | TrendSparkline + buildDailyBuckets Helper, 10 Edge-Tests vi.useFakeTimers; PriceChart-DNA |
| `7b6c7b17` chore | active idle | — | — |
| `fa172d3c` docs | **209 Audit-Stale-Cleanup** | 12 Marker-Korrekturen | D48 Pattern 4. Iteration; F-02/F-08/K-01 + UX 11/14/15/16/19 als done verified, UX 6/22 wont-fix, UX 7/8 watch |
| `36add578` feat | **210** UX 17 airdrop isError-Handling | +1 (UX 17) | 2 separate Error-Branches Pattern-Wiederholung Slice 196 inventory/rankings; Self-Review D35 |
| `af7df312` chore | active idle | — | — |

### Slice 208 Highlights (FM 6.2 Trend-Sparkline)

- Pure-frontend additive — `TrendSparkline`-Sub-Component in `TransactionsPageContent.tsx` rendert per-Tag Net-Aggregation aus existing `filteredCredits` (kein Backend, kein neuer RPC)
- Lineare Polyline statt Catmull-Rom (Spec-Drift dokumentiert: bei 60px H + 90-Bucket-Density visuell nicht differenzierbar)
- 10 Edge-Case-Tests via `vi.useFakeTimers()` für deterministisches Day-Boundary-Math (FIXED_NOW = `2026-04-26T14:00:00Z`)
- Reviewer CONCERNS→PASS post-Heal: A11y-Issue gefangen — SVG hatte sowohl `role="img"` als auch `aria-hidden="true"` (Widerspruch). Pattern aus `PriceChart.tsx:218-219` exakt gespiegelt
- Range-Reaktivität: 7d/30d/90d/all mit 90-Bucket-Cap. Color-Coded green/red je `lastNet >= firstNet`. Dashed Zero-Baseline bei mixed-sign data
- TR-Wording business.md-konform: "Trend ({days} gün)" + "Günlük net" — kein kazanmak/yatırım/kar Drift
- Files: 1 Component-Edit, 1 neuer Test (10 Tests), 2 i18n-Keys DE+TR. tsc clean.

### Slice 209 Highlights (Audit-Stale-Cleanup, **wichtige Wahrheit**)

**Anil's "wichtige Wahrheit"-Phrase bezieht sich auf das, was diese Cleanup aufgedeckt hat:** Pre-Slice-209 Punch-List hatte massive akkumulierte Audit-Stale-Drift. 8 Items waren als "open" markiert, obwohl sie längst gefixt waren (F-02 Slice 197c, F-08 Slice 197, K-01 Slice 197e, UX 11 Slice 198, UX 14 Slice 198, UX 15 Slice 196, UX 16 Slice 196, UX 19 Slice 196). 2 weitere waren vom Audit selbst als "akzeptabel" markiert aber als "open" gezählt (UX 6 sticky-bottom Bar, UX 22 Touch-Targets). 2 Items waren watch-Status (UX 7/8 preventClose-TODO) ohne klare Aggregat-Klassifikation.

Aggregat-Tabelle hatte mathematisch inkonsistente Spalten-Summen (z.B. UX 27/21/0/6/0 = 27 ✓ aber Detail-Tabelle hatte mehr als 6 "open"-Marker, davon 5 already-fixed seit 198). Drift war systematisch.

**Lehre:** Detail-Tabelle ist Single-Source-of-Truth, Aggregat-Tabelle hat Drift-Note. D48 Pattern jetzt 4. Iteration empirisch validiert (Slice 200a UX-2, 200b R-03, 203 UX-12, 206 7 fantasy-marker, 209 12 mixed-marker — 22% audit-stale-rate über mehrere Slices).

### Slice 210 Highlights (UX 17 airdrop isError)

- 2 separate Error-Branches statt 1 Page-Level — `useAirdropLeaderboard` und `useAirdropStats` können unabhängig failen
- Stats-Bar-Block 3-way: Error / Loaded / ComingSoon
- Leaderboard-Card inner 4-way: Loading / Error / Empty / List
- Conditional-Suppress für myEntry+Tier-CTA bei Leaderboard-Error (data-derived)
- Self-Review per D35 trivial-pattern-Wiederholung. Pattern aus 3 inventory + 7 rankings Components codifiziert.
- Files: 1 Component-Edit (+22 Zeilen). tsc clean. Punch-List UX 17 → done.

### Punch-Liste-Status (post-Slice-210, mit ehrlicher Drift-Bekenntnis)

**Detail-Tabelle ist Source-of-Truth.** Aggregat ist Best-Estimate.

| Status | Count | Items |
|---|---|---|
| done | ~89 | Alle Slices 195-210 + audit-stale-corrected |
| wont-fix | 5 | Brand 13, F-01 Vice-Captain CEO-Decision, UX 6, UX 22 + 1 weiter |
| watch | 2 | UX 7 + UX 8 preventClose-TODO bei künftigem async-Refactor |
| **open (real-actionable)** | **2** | Brand 1 P3 (Polish-Refactor low-prio) + Backend-M-Slices FM 10.2/10.3 (social-graph) |
| **CEO-Approval-pending** | **2** | F-09 BPS-Bonus + UX 20 MembershipSection Confirm |
| post-beta-deferred | 4 | F-14, C-06, R-05, M-02 |

**Verbleibend wirklich-fixable ohne Anil-Aktion: 1 Brand-1-P3-Polish-Refactor + 2 Backend-M-Slices.** Frontend-only-Pool ist quasi leer.

### Anil-Action-Items (gesammelt diese Session)

**Vor Beta-Verify:**
- TR-Wording-Review Slice 208: `"Trend ({days} gün)"` + `"Günlük net"`
- Inkognito-Verify auf bescout.net post-deploy:
  - `/transactions` Mobile 360px → Sparkline mit Range-Filter durchschalten (7d/30d/90d/all)
  - `/airdrop` Page-Level — bei RPC-Failure müsste ErrorState mit Retry erscheinen statt ewig-Loader
  - **NEU diese Session: Slice 208 Sparkline + Slice 210 airdrop-Error-States**
- Plus prior unverifiziert: Slice 192/193 Holdings, 201a Per-Trade-Player-Link, 201b Concentration-Bar, 201d Predictions Consensus, 204 Squad-Pick-Rate, 205 ScoutConsensus Reliability, 207 Most-Owned Discovery

**Money-Path-CEO-Decisions:**
- F-09 BPS-Bonus (Top-3 +3/+2/+1) — Scoring-Algorithm-Change
- UX 20 MembershipSection Subscribe ohne Confirm-Step — Money-Risk

**Mensch-only:**
- 3 Beta-Tester organisieren (Familie/Freunde, min 1 TR)
- Vercel-Plan-Decision (aktuell Pro live, 13 Crons)
- TR-Locale-Reviewer organisieren

### Was diese Session gelernt hat (Pattern-Codify-Backlog)

3 Drafts aus Slice 207 noch nicht promoted (zur nächsten Session):
1. **Worktree-Isolation-Escape (PROCESS, CRITICAL)** — Worktree-Agents müssen ABSOLUT relative Paths nutzen. Bei absolut-Paths schreiben Files in Main-Repo. Action: `/parallel-dispatch` Skill ergänzen.
2. **Pre-Review-Memo Pattern (PROCESS)** — Agent schreibt vor Reviewer-Dispatch ein Self-Audit. Reduziert Reviewer-Arbeit ~60%. Action: workflow.md REVIEW-Stage Best-Practice.
3. **Migration-Heal v1→v2 Same-Session (PROCESS)** — apply_migration drüber-schreiben mit gleichem Filename (timestamp +5min). DB-Smoke gegen v2 als SoT. Action: errors-db.md Pattern.

Plus aus Slice 209 neu identifiziert:
4. **Punch-List Aggregat-Math-Drift-Detector** — pre-Slice-Sanity-Check Script: greppt Detail-Markers gegen git-log + grep current-code. Wenn audit-row "open" + grep findet implementation → flag stale-candidate. Würde D48-Pattern 4. Iteration ersetzen durch automatisierte Detection.

### Bei /clear oder Token-Limit Resume-Pfad

1. `worklog/active.md` (idle, **af7df312** ist HEAD)
2. `worklog/punch-list-2026-04-25.md` Detail-Tabelle = SoT
3. Diese Datei Top-Block
4. `worklog/log.md` Top 3 (210, 209, 208)
5. `git log --oneline -10` — `af7df312` HEAD
6. `git worktree list` (sollte nur main sein)
7. **Strategie-Antwort:** Ich habe Anil eine ehrliche Bewertung von Ist-Zustand, Lücken, Quick-Wins, Game-Changer gegeben (siehe Chat-Last-Message). **Keine Slices weiter geplant** bis Anil entscheidet was als Quick-Win oder Game-Changer angegangen wird.

---

# Vorherige Sessions (archiviert)

# Resume-Anker (2026-04-26 Late-Continuation Session — 3 Slices + Audit-Cleanup)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — aktueller Slice-State (idle, **85/98 closed ~87%**)
2. `worklog/punch-list-2026-04-25.md` — Master-Liste 98 Findings
3. Diese Datei (Resume-Anker, Top-Block ist heute)
4. `worklog/log.md` Top 4 Eintraege (207, 205, 204, 203)
5. `git log --oneline -10` — `de38bfa1` chore active idle nach 207 ist HEAD
6. `git worktree list` (sollte nur main sein, kein agent-Worktree mehr)

## Session-End 2026-04-26 Late — 3 echte Slices + 1 Audit-Cleanup (CTO-only nach /clear)

**Anil hat /clear gemacht und mit "weiter im handoff mit voller disziplin" gestartet. CTO hat 3 echte Slices durchgezogen + 1 Worktree-Heal + 1 Audit-Cleanup. Punch-Liste 82/98 → 85/98 (~87%).**

### Pipeline-Status (alle 4 Commits gepusht)

| Commit | Slice | Punch-List-Items | Pattern |
|---|---|---|---|
| `62b55816` feat | **204 K-03** Squad-Tab Pick-Rate | +1 (K-03) | D46-Reuse `useEventPlayerPickRates` (Slice 195e) |
| `65bbf3a7` feat | **205 FM 5.2** ScoutConsensus Reliability | +1 (FM 5.2) | D46 reuse research-data, Tier-Color Pattern Slice 201b |
| `4497e690` docs | **206 Audit-Cleanup** | +0 (7 Marker-Korrekturen) | D48-Pattern (F-12/F-13/C-01/C-02/C-04/C-05/R-04 stale-marked) |
| `7cb58b22` feat | **207 K-02** Most-Owned Discovery Batch | +1 (K-02) | Anonymized-Aggregate-Series #4 Pattern #38 |

### Slice 207 Highlights (Worktree-Heal-Story)

**Worktree-Agent-Failure-Pattern** — 3 separate Probleme aufgefangen:
1. Agent claimed completion, aber escaped Worktree-Isolation → schrieb Files in Main-Repo statt Worktree (absolut-Paths statt relative). CTO konsolidiert.
2. Migration semantisch falsch v1 (CTO club-max-relative) → v2 (Agent's total_managers_of_club, FPL-semantic "X% der Manager besitzen Y") via apply_migration drueber-applied. v2 LIVE.
3. Service-Duplicate (CTO + Agent beide getMostOwnedPlayersPerClubBatch) → CTO loescht eigene Variante, Agent's bleibt (gruendlicher inkl. defensive filter).

**Reviewer PASS** post-Heal: 12/12 Punch-List checks, 2 NITs nicht-blockierend, 11/11 vitest, db-smoke real Pcts (Tiren 76.92%, Akgün/Tozlu 29.41%, Aksu 28%).

### CRITICAL Knowledge-Capture-Drafts (Reviewer-empfohlen)

3 NEUE Pattern-Drafts in `memory/learnings/drafts/` schreiben (TBD, vor Promote zu rules):

1. **Worktree-Isolation-Escape (PROCESS, CRITICAL):** Worktree-Agents muessen ABSOLUT relative Paths nutzen. Bei absolut-Paths schreiben Files in Main-Repo ohne Merge-Konflikt. Bei parallel-dispatch (D46) doppelt gefaehrlich. Action: `/parallel-dispatch` Skill ergaenzen.

2. **Pre-Review-Memo Pattern (PROCESS):** Agent schreibt vor Reviewer-Dispatch ein `worklog/reviews/<slice>-pre-review.md` mit Self-Audit gegen Punch-List + Audit-Commands + Open-Blocks. Reduziert Reviewer-Arbeit ~60%. Action: workflow.md REVIEW-Stage Best-Practice nach 2. Reproduktion.

3. **Migration-Heal v1→v2 Same-Session (PROCESS):** Wenn CTO-Migration semantisch falsch, v2-Migration mit gleichem Filename (timestamp +5min) via `apply_migration` drueber-schreiben (CREATE OR REPLACE idempotent). DB-Smoke gegen v2 als Single-Source-of-Truth. Action: errors-db.md Pattern.

### Anonymized-Aggregate-RPC-Series (jetzt 8 LIVE-RPCs)

Pattern #38 in patterns.md verstaerkt:

| RPC | Slice | Caller |
|---|---|---|
| Foundation (RLS-bypass) | 014 | — |
| event_captain_distribution + event_player_pick_rates | 195e | Differentials |
| top_predictors_leaderboard | 199 | PredictionsTab |
| most_owned_players_per_club | 199 | TransferList + MostOwnedSection |
| event_difficulty_score | 199 | EventSelector |
| holders_concentration | 201b | TransferList |
| prediction_consensus | 201d | CreatePredictionModal |
| **most_owned_players_per_club_batch** | **207** | **clubs/page Discovery** |

### Punch-Liste-Status (post-Slice-207 + Audit-Cleanup)

| Domain | Total | done | wont-fix | open | deferred |
|---|---|---|---|---|---|
| Brand-Coherence | 18 | 15 | 2 | 1 | 0 |
| UX-States | 27 | 21 | 0 | 6 | 0 |
| FM-Mechanics | 26 | 26 | 0 | 0 | 0 |
| Fantasy-Scoring | 27 | 23 | 1 | 3 | 1 |
| **TOTAL** | **98** | **85** | **3** | **10** | **1** |

**FM-Mechanics-Domain ist jetzt 26/26 = 100% closed.**

### Verbleibende offene Items (10)

| Item | Aufwand | Block |
|---|---|---|
| FM 6.2 Trend-Sparkline-Mini-Chart | M-Backend (price_history-Aggregat) | none |
| FM 10.2 Airdrop Personal-Score-History | M-Backend | none |
| FM 10.3 Airdrop Friends-Filter | M-Backend social-graph | none |
| F-09 BPS-Bonus-System | **Money-Path** Scoring-Algorithm | **CEO** |
| UX 20 MembershipSection Confirm | **Money-Path** Subscribe | **CEO** |
| UX 6/7/8/11/14/19/22 (5 P1/P2 Reste) | XS bis M | none |
| Brand 1, 13 (P3 Reste) | XS niedrig-Prio | none |

### Naechste Session — Empfehlungen

**EMPFOHLEN: FM 6.2 Trend-Sparkline-Mini-Chart als Self-Build (NICHT Worktree-Agent).**

Begruendung:
- Single-Domain (Backend price_history-Aggregat + 1 Frontend Mini-Chart Component)
- Bewährter Pattern Slice 204/205 (Self-Build + Reviewer Cold-Context)
- Slice 207 Worktree-Agent-Erfahrung zeigt: ohne mcp-Tools im Worktree = nur Halbprodukt + Heal-Overhead
- Reviewer-Agent als Cold-Context-Check pflicht (D48 Audit-Stale-Catcher zahlte sich in 204 aus)

**ALTERNATIVE Slice-Optionen (falls Anil priorisieren will):**
- UX-Reste batch (UX 11/14/19) als Mini-Polish-Slice ~30min
- F-09 oder UX 20 nach CEO-Approval (Money-Path)

**NICHT empfohlen ohne Skill-Update:** Worktree-Agent fuer M-Backend bis `/parallel-dispatch` Skill ergaenzt ist mit "ABSOLUT relative Paths"-Briefing.

### TR-Wording-Review (Anil-Pflicht vor Beta — neue diese Session)

- **Slice 204 (K-03):** "%{pct}" / "Yöneticilerin %{pct}'i bu oyuncuyu seçti"
- **Slice 205 (FM 5.2):** "Az veri / Orta veri / Sağlam veri" + "Güvenilirlik: {tier} ({count} rapor)"
- **Slice 207 (K-02):** "{name} oyuncusunda %{pct} koleksiyoncu" / "Yöneticilerin %{pct} kadarı {name} oyuncusunu topluyor"

Alle business.md-compliant ("koleksiyoncu" / "topluyor", kein "yatırımcı"/"kazanmak").

### Anil-Action-Items (Mensch-only)

- 3 Beta-Tester organisieren (1 TR, 1 FM-Power, 1 Casual)
- Vercel-Plan-Decision (aktuell Pro live, 13 Crons)
- TR-Locale-Reviewer organisieren
- **F-09 BPS-Bonus + UX 20 MembershipSection Confirm** — beide Money-Path CEO-Approval
- **Inkognito-Verify** auf bescout.net:
  - Manager-Holdings (Slice 192/193)
  - Transactions Player-Link (Slice 201a)
  - TransferList Concentration-Bar (Slice 201b)
  - Predictions Consensus-Hint (Slice 201d)
  - **NEU Squad-Tab Pick-Rate (Slice 204) auf /club/<slug>**
  - **NEU ScoutConsensus Reliability-Tier auf Player-Detail Trading-Tab (Slice 205)**
  - **NEU Most-Owned Hint auf /clubs Discovery (Slice 207)**

### Session-End Cleanup

- worktree list: nur main (agent-a9d79b314a5c5a7e7 ref-pruned, dir bleibt physisch wegen file-locks aber kein worktree-eintrag)
- HEAD: `de38bfa1` chore(207) active idle
- Punch-Liste-Aggregat-Drift war pre-Session schon vorhanden (audit-stale-rows in Fantasy 21/27 vs row-markers ~14 done) — durch Slice 206 docs(audit) korrigiert.

### Was nicht passiert ist (intentional)

- KEINE neue Slices nach 207 (CTO-Empfehlung "STOP fuer saubere Arbeit" — Anil approved mit "1")
- KEINE pattern.md-Updates (3 Drafts oben sind TBD fuer naechste Session)
- KEINE workflow.md / parallel-dispatch.md Updates (nach 2. Reproduktion erst)
- KEIN distill-Commit fuer diese Session — nicht noetig, alles in worklog/log.md + handoff dokumentiert

### Bei /clear oder Token-Limit Resume-Pfad

1. `worklog/active.md` (idle, naechste Aktion = FM 6.2 Self-Build)
2. `worklog/punch-list-2026-04-25.md` (**85/98** closed, Pipeline)
3. Diese Datei Top-Block (Resume-Anker)
4. `worklog/log.md` Top 4 Eintraege (207, 205, 204, 203)
5. `git log --oneline -10` — `de38bfa1` HEAD
6. `git worktree list` (sollte nur main sein)

---

# Vorherige Sessions (archiviert)

# Resume-Anker (2026-04-26 autonomous run #4 — Rekord-Output 9 Slices + 2 DISTILL)

**Wenn `/clear` oder Token-Limit:** Lese in dieser Reihenfolge:
1. `worklog/active.md` — aktueller Slice-State (idle, 82/98 closed)
2. `worklog/punch-list-2026-04-25.md` — Master-Liste 98 Findings, **82 closed (~84%)**
3. Diese Datei (Resume-Anker)
4. `worklog/log.md` Top 9 Eintraege (201d, 201c, 201b, 201a, 200, 203, 202, 200b, 200a)
5. `git log --oneline -15` — `7bc42fb9` chore active idle nach 201d ist HEAD
6. `git worktree list` (sollte nur main sein)

## Session-End 2026-04-26 — autonomous run #4 komplett (Rekord)

**9 Slices durchgezogen + 2 DISTILLs (D48 Update + D49 NEU) + Pattern #37 + Pattern #38 + 3 errors-frontend.md Patterns. Punch-Liste 70/98 → 82/98 closed (~84%, +12 in 1 Session).**

### Pipeline-Status Slices 200-203 (alle gepusht)

| Slice | Commit | Items closed |
|---|---|---|
| **202 Wave 5 Polish** | ab5d411c | +3 (Brand-12 PitchView, Brand-2 .gold-pulse-bg Utility, FM-9.3 TierComparisonMatrix) |
| **203 XS-Mini-Polish + DISTILL Slice 202** | aca2f2c4 | +1 + 1 already-fixed-marker (Brand-10 PlayerPicker, UX-12 Audit-Stale) |
| **200 Trades-Volume-7d Backend + Sort-UI** | 1e1568ff | +1 (FM-4.4) — Migration LIVE, 4556 Players init, **Bonus-Fix Slice 197d Latent-Bug** PLAYER_SELECT_COLS |
| **201a Per-Trade-Player-Link** | ccdf48d5 | +1 (FM-6.1) — Service+Hook+UI |
| **201b Holders-Distribution-Mini-Bar** | 11da508d | +1 (FM-4.3) — RPC + ConcentrationBar lazy |
| **201c Fantasy-Context-Hints** | b333dd7f | +1 (M-01) — State-derived, kein DB-Query |
| **201d Prediction-Consensus-Hint** | 7254a0bc | +1 (C-03) — 3. RPC der Anonymized-Aggregate-Series |

### Knowledge-Compilation (DISTILLs Heute)

- **D48 Update (Slice 202):** Reviewer-Agent funktioniert auch bei zero-duplicates (Verifikations-Schritt = Versicherung). Empirie 3/5 Polish-Slices haben already-fixed-marker.
- **D49 NEU (Slice 200 Bonus-Discovery):** SELECT-COLS-Konstanten Sync-Pflicht mit DbType-Definitionen. Slice 197d MV-Trend war 1 Tag Latent-Production-Bug — `PLAYER_SELECT_COLS` fehlte `mv_trend_7d`.
- **Pattern #37 NEU (Slice 202):** Per-Tier Comparison Matrix mit ExtraKey-Union + Whitelist (TierComparisonMatrix-Blueprint, wiederverwendbar fuer Sales-Pakete, Equipment-Ranks, Membership-Tiers).
- **Pattern #38 NEU (Slice 014→199→201b→201d):** Anonymized RLS-Bypass Aggregate-RPC Series — etabliert mit 8 LIVE-RPCs, vollstaendiger Template + Privacy-Garantien + Frontend-Lazy-Load-Pflicht. Kandidaten fuer naechste Aggregate-RPCs aufgelistet.
- **errors-frontend.md neu:** Pattern "PLAYER_SELECT_COLS Sync mit DbPlayer-Type" (Slice 200, aus 197d Latent-Bug).
- **decisions.md D48 + D49** dokumentiert.

### Anonymized-Aggregate-RPC-Series (3 NEUE LIVE in 1 Session)

1. `get_player_holders_concentration(player_id)` (Slice 201b) — Sorare Liquid/Iliquid-Indicator
2. `get_prediction_consensus(fixture, condition, player?)` (Slice 201d) — FPL-style "X% tippte gleich"
3. (Plus existing 5 RPCs aus 014/195e/199 — siehe patterns.md #38 Tabelle)

### Bonus-Discovery (D49 codifiziert)

`PLAYER_SELECT_COLS` in `src/lib/services/players.ts` hatte `mv_trend_7d` NICHT vor Slice 200 — Slice 197d's Frontend-MV-Trend-Filter las das Feld nie aus DB → 1 Tag Latent-Production-Bug. Slice 200 fixt by-coincidence weil `trades_volume_7d` zur SELECT-Liste hinzugefuegt wurde und `mv_trend_7d` mit. Pattern in `errors-frontend.md` codifiziert + D49 in decisions.md.

### Punch-Liste-Status

| Domain | Total | done | wont-fix | open | deferred |
|---|---|---|---|---|---|
| Brand-Coherence | 18 | 15 | 2 | 1 | 0 |
| UX-States | 27 | 21 | 0 | 6 | 0 |
| FM-Mechanics | 26 | 25 | 0 | 1 | 0 |
| Fantasy-Scoring | 27 | 21 | 1 | 5 | 1 |
| **TOTAL** | **98** | **82** | **3** | **13** | **1** |

### Verbleibende offene Items (alle Backend M-Slice oder Money-Path CEO)

| Item | Aufwand | Block |
|---|---|---|
| FM 5.2 Differential-Sentiment ScoutConsensus | M-Backend (research_post-Aggregat) | none |
| FM 6.2 Trend-Sparkline-Mini-Chart | M-Backend (price_history-Aggregat) | none |
| FM 10.2 Airdrop Personal-Score-History | M-Backend | none |
| FM 10.3 Airdrop Friends-Filter | M-Backend social-graph | none |
| K-03 Squad-Tab Fantasy-Pick-Rate | M-Backend (analog Slice 199 most-owned) | none |
| F-09 BPS-Bonus-System | **Money-Path** | **CEO-Approval** |
| UX 20 MembershipSection Confirm | **Money-Path** | **CEO-Approval** |
| Brand 1, 13 + Fantasy P3-Reste | XS niedrig-priorität | none |

### Naechste Session — Empfehlungen

- **K-03 Squad Fantasy-Pick-Rate** als naechster Slice empfohlen — analog Slice 199 most-owned, kann existing-RPC-Reuse pruefen (D46-Vermeidung). M-Slice ~1.5h.
- **F-09 + UX 20** brauchen Anil-CEO-Approval (Money-Path: Scoring-Algorithm-Change + Subscribe-Confirm).

### TR-Wording-Review (Anil-Pflicht vor Beta)

Diese Session hat folgende TR-Strings hinzugefuegt — bitte vor Beta-Launch checken:

- **Slice 200:** "Hacim 7g" (Volumen 7d sort)
- **Slice 201a:** "Oyuncu profilini gör: {name}"
- **Slice 201b:** "İlk 10 sahip oranı / İlk 10 sahip %{pct}'ini tutuyor / {count} sahip / Dağılım yükleniyor / ICU-plural sahip"
- **Slice 201c:** "Lineup'unu kur / GW {gw} için lineup'unu kur / Captain bonusu kap (1.1× puan) / Aksiyon / Aksiyonu yap: {title}"
- **Slice 201d:** "Topluluk konsensüsü ({count} tahmin) / Çoğunlukla aynı tahmin ediyorsun (%{pct}) / Differential tahmin — sadece %{pct} aynı seçti / Az veri: şimdiye kadar sadece {count} tahmin"
- **Slice 202:** "Tier Karşılaştırması / Üst tier'da ne ekstra alıyorum? / Özellik / Fiyat / Kredi / Geçiş Bonusu / İşlem İndirimi / Limit / Ekstralar / Dahil / Dahil değil"

### Anil-Action-Items (Mensch-only)

- 3 Beta-Tester organisieren (1 TR, 1 FM-Power, 1 Casual)
- Vercel-Plan-Decision (aktuell Pro live, 13 Crons)
- TR-Locale-Reviewer organisieren
- **F-09 BPS-Bonus + UX 20 MembershipSection Approval** — beide Money-Path
- **Inkognito-Verify** auf bescout.net Manager (Slice 192/193 Holdings) + Transactions Player-Link (Slice 201a) + TransferList Concentration-Bar (Slice 201b expanded) + Predictions Consensus-Hint (Slice 201d)

### Vercel-Cron-Status

13 Crons in vercel.json, alle daily. Kein neuer Cron diese Session ausser Slice 200 `15 4 * * *` (Trade-Volume-7d). Pro-Plan aktiv (Hobby-Limit 2/Tag waere ueberschritten).

### Was lief im Hintergrund

- Bot-Loop letzter Sichtkontakt 2026-04-26 ~12:00, vermutlich seither auto-stopped (4h-Timer)

### Bei /clear oder Token-Limit Resume

1. `worklog/active.md` (idle, naechste Aktion = K-03 Squad Pick-Rate ODER FM 5.2/6.2/10.2/10.3 nach Anil-Wahl)
2. `worklog/punch-list-2026-04-25.md` (**82/98** closed, Pipeline + Skip-Reasons)
3. `worklog/log.md` Top 9 Eintraege
4. `git log --oneline -15`
5. `git worktree list` (sollte nur main sein)
6. `memory/decisions.md` D48-D49 + `memory/patterns.md` #37-#38 NEU heute

## Session-End 2026-04-26 — autonomous run #3 komplett

**+2 Polish-Slices (200a + 200b) durchgezogen + DISTILL. 7 Items closed + 2 already-fixed-marker via Reviewer-Agent. Punch-Liste 63/98 → 70/98 closed (~71%). Ready für /clear.**

### Pipeline-Status (alle gepusht)

| Slice | Commit | Findings closed |
|---|---|---|
| 195a-d (prior) | (4 prior) | 5 P0 (Captain/Boost/max_per_club/Bench+Auto-Sub) |
| 196 Cross-Cutting P1 | 42857532 | +16 (Brand 7 + UX 8 + FM 1) |
| 195e + 195c-UI | b40178f5 | +5 (F-07/F-11/fm 2.1/2.2 + F-06 UI) |
| 197 Wave 1 (a/b/e) | 74b5272c | +3 P1 (fm 1.1, F-08, K-01) |
| 197c Formationen | 947d469b | +1 P0 (F-02) |
| 197d MV-Trend | c20d1d16 | +2 P1 (fm 1.2, fm 4.1) |
| **198 Polish-Sweep Wave 1** | cbc2df92+heal | **+16** (Brand+UX+FM+Fantasy 4-Track) |
| **198b Polish-Sweep Wave 2** | 0edf1c3e | **+11** (UX+FM+Fantasy 3-Track) |
| **199 Backend-Aggregat-RPCs** | 132e1bcd | **+4** (C-05+K-02+fm 2.4+fm 1.3) |
| **200a Wave 3 Polish-Sweep** | d7c846b5 | **+4 + 1 marker** (FM 7.1+7.2+8.1+9.2 / UX-2 already-fixed) |
| **200b Wave 4 Polish-Sweep** | ecf34c5f | **+3 + 1 marker** (FM 10.1+8.3+F-10 / R-03 already-fixed) |
| **TOTAL Session 2026-04-25/26** | — | **70/98 closed (~71%)** |

### Knowledge-Compilation (DISTILL Slice 198/199/200a/200b)

- **D45 PROCESS:** Worktree-Awareness-Briefing als Pflicht-Block (50%→0% Trap-Rate über 5 Tracks empirisch validiert)
- **D46 PROCESS:** Service-Schnittstelle vorab spezifizieren bei parallelem BE+FE-Dispatch (Slice 199 Reviewer-Find)
- **D47 PROCESS:** Skip-Pattern-Bündelung — gebündelte Wave-Slice (Slice 199 als Erfolgs-Beispiel)
- **D48 PROCESS (NEU 2026-04-26):** Reviewer-Agent als Audit-Stale-Catcher — already-fixed-marker-Pattern. 22% Audit-Stale-Rate empirisch (2 von 9 Polish-Items in 200a+200b)

### Pattern-Codify

- `errors-frontend.md` "Service-Duplicate bei parallelem BE+FE-Dispatch" (Slice 199)
- `errors-frontend.md` "Missing i18n-Key bei neuer CTA-Component" (Slice 198)
- `errors-frontend.md` "Polish-Audit Pre-Existing-Code-Drift" (Slice 200a, **NEU**)
- `patterns.md #34` "Worktree-Awareness-Trap" (Slice 198 codifiziert)
- `patterns.md #35` "Threshold-Konstante mit Migration-Source-Reference" (Slice 200b, **NEU**)
- `patterns.md #36` "Polish-Audit Pre-Existing-Code-Grep" (Slice 200a+200b, codifiziert D48, **NEU**)

### Audit-Status

- **silent-fail-audit 2026-04-26:** 194 findings (94 HIGH, 102 MEDIUM)
- HIGH 93→92 (gesunken — kein CI-Block)
- Baseline updated `.audit-baseline.json`
- Bot-Loop persistent im Hintergrund (re-start 17:45 UTC, 4h auto-stop)

### Naechste Session — Slice 200 + Slice 201 (beide CEO-relevant)

**Slice 200** = fm 4.4 `players.trades_volume_7d` Column-Migration + Aggregations-Strategie:
- Schema-Change auf existing `players` table → CEO-Scope (ceo-approval-matrix)
- Aggregations-Strategie-Decision pending: Trigger vs Materialized-View vs neuer Cron (Vercel-Hobby-Limit)
- Plus Frontend Sort-Pill in MarketFilters

**Slice 201** = Backend-Wave fuer 4 Findings (gebuendelt nach D47 Pattern):
- FM-6.1 Per-Trade-Player-Link (trades-join, transactions reference_id mapping)
- FM-4.3 Holders-Distribution-Mini-Bar (Aggregat-Service oder existing player-fields)
- M-01 Mission-Hints kontextabhaengig (DB-catalog-changes neue mission-definitions)
- R-03 GW-Filter "Letzte GW/Saison" auf GlobalLeaderboard (per-GW-aggregation-RPC)

**Wave 5 Polish-Restposten** ~26 P2/P3 (Brand 6 + UX 8 + FM 5 + Fantasy 7) — but viele needs Backend, fast erschoepft. Frontend-only-Pool fast leer.

### Bei /clear oder Token-Limit Resume

1. `worklog/active.md` (idle, Slice 200 + 201 als Backlog dokumentiert)
2. `worklog/punch-list-2026-04-25.md` (**70/98** closed, Pipeline + Skip-Reasons)
3. `worklog/log.md` Top 7 Eintraege
4. `git log --oneline -15` — `db2d5c6d` (chore active idle nach 200b) ist HEAD
5. `git worktree list` (sollte nur main sein)

### TR-Wording-Review (Anil-Pflicht vor Beta)

Diese Session hat folgende TR-Strings hinzugefuegt — bitte vor Beta-Launch checken:
- Slice 200a: `Tümü / Aktif / Tamamlandı / Bu görünümde görev yok / Etki Gücü`
- Slice 200b: `{tier} için {points} puan eksik / {tier} için ilerleme / Dönem / Tümü / Son 30 gün / Son 30 günde kutu açılmadı / Bütçe / Salary, son 5 maçtaki forma (perfL5) dayanır`

### Anil-Action-Items (Mensch-only)

- 3 Beta-Tester organisieren (1 TR, 1 FM-Power, 1 Casual)
- Vercel-Plan-Decision (Hobby vs Pro) — aktuell Hobby reicht
- TR-Locale-Reviewer organisieren
- **Slice 200 Aggregations-Strategie-Approval** (3 Optionen)
- Inkognito-Verify auf bescout.net Manager → keine Ghost-Rows (Slice 192/193 + neue 199 Top-Predictor/Most-Owned/Difficulty-UI testen)

### Vercel-Cron-Status

12 Crons in vercel.json, alle daily. Kein neuer Cron diese Session (Hobby-kompatibel).

### Phase-A-Findings-Status

- **6 P0 alle gelöst:** 4 fixed (F-02/F-03/F-04/F-05/F-06) + 1 wont-fix CEO-Decision (F-01 Vice-Captain)
- **34 P1** total — 12 fixed (~35%)
- **41 P2** — 0 fixed
- **17 P3** — 0 fixed

### Was läuft im Hintergrund

- **Bot-Loop** persistent (re-start 17:45 UTC). 4h auto-stop. Bash Background-Process via run_in_background:true.

### Naechste Session — Slice 198 Polish-Sweep dispatchen

**Slice 198 ist der grosse Polish-Sweep** der ~50 P2/P3 Findings schliesst:

- **Brand P2 (8 Stellen):** PlayerIPOCard yellow rest, FormTab/StatsTab restliche, JoinConfirmDialog/PlayerPicker rest
- **UX P2 (13 Stellen):** isError-Branches restliche Sections, preventClose-TODOs Re-Audit, Loader2-Migration Rest
- **FM-Mechanics P2 (11 Stellen):** Trade-Volume-7d Sort, Trending Hot/Rising/Faller Pills, Holders-Distribution-Bar, Bulk-Buy /market, FormBars Hover-Tooltip
- **Fantasy P2 (8 Stellen):** Sticky-Countdown, Form-Trend Sparkline, Predictions-Streak, Difficulty-Visibility, Aggregate-Hints, Top-Predictors, Tier-Promotion-CTA, Most-Owned

Strategie: Slice 198 als Multi-Track parallel-dispatch (5-6 Tracks à ~10 Items, ~2-3 Tage).

### Bei /clear oder Token-Limit

1. Lese `worklog/active.md` (idle, naechste Aktion = 198)
2. Lese `worklog/punch-list-2026-04-25.md` (32/98 closed, Pipeline)
3. Lese `worklog/log.md` Top 7 Eintraege (alle Slices heute)
4. `git status --short` + `git log --oneline -10`
5. Check `git worktree list` (sollte nur main sein, alle cleaned)

### Knowledge-Flywheel-Status (heute durchgezogen)

- ✅ `errors-frontend.md` — Pattern "Hardcoded German addToast/Error-Strings" (Slice 196)
- ✅ `errors-db.md` — PL/pgSQL Loop-Var Shadowing + Stale State (Slice 195d)
- ✅ `database.md` — RLS-Pattern Cron-Only Table (Slice 197d)
- ✅ `patterns.md #33` — Generic Filter-Helper mit Value-Extractor (Slice 197a + 197d)
- Drafts-Folder leer (alle promoted)

### Vercel-Cron-Status

Aktuell 12 Crons in vercel.json, ALLE daily-Patterns. Hobby-Plan-kompatibel.
- Slice 197d neuer Eintrag `45 3 * * *` daily — kein Risk.

### CEO-Approval-Anker

- Alle 7 heute committed Slices: kein Money-Path, alle CTO-scope oder pre-approved
- Slice 198 wird auch CTO-scope sein (Polish-Sweep ohne Schema-Migration)
- Slice 195f Backlog (Auto-Sub Audit Trail) — siehe 195d-Review M2
- Slice 197 Backlogs:
  - 197b m1: CountdownLabel React.memo'd (nach Beta-PostHog-Daten)
  - 197d M2/M3: MarketFilters env-mock + iconColor-toter-Branch (Slice 198)

### Was zu wissen ist beim Resume

- Bot-Loop nicht stoppen
- Knowledge-Flywheel: alle promoted, keine Drafts pending
- Worktree-Agent-Stalls: 197c Backend stalled bei 600s. Pattern: Kleine RPC-Patches → CTO direkt
- Phase C Persona-Walk nach Slice 198 oder Phase B abgeschlossen (Anil-Decision)
- 50-Findings-Schwelle: bei Slice 198 Wave erreichbar (~50 closed = ~80/98)

### Anil-Action-Items (Mensch-only)

- 3 Beta-Tester organisieren (1 TR, 1 FM-Power, 1 Casual)
- Vercel-Plan-Decision (Hobby vs Pro) — aktuell Hobby reicht
- TR-Locale-Reviewer organisieren
- Beta-Test-Briefing fuer 197d MV-Trend: "Trends werden ab 2026-05-02 sichtbar (7d-old-data nötig)"

---

# Rich Handoff — 2026-04-24/25 Session 5 (Rekord-Output 16 Slices)

## TL;DR fuer naechste Session

**Status morgen frueh:**
- 6 unpushed commits (Slice 191-193) — push pending in dieser Session
- 2 Remote-Agents aktiv (Walkthrough-Crawler + Slice-193-Verify)
- Active: idle
- Beta-Launch wartet weiter auf Anil-Action (3 Tester + Vercel-Plan)

**Erste Aktionen morgen:**
1. **GitHub Pull-Requests checken** — 1-2 PRs von Remote-Agents
2. **Crawler-Design-PR reviewen** + 5 Open-Questions beantworten
3. **Inkognito-Verify** auf bescout.net Manager → keine Ghost-Rows mehr
4. Bei Erfolg: Crawler Stufe 2+3 als Slice 194 builden

## Was diese Session brachte (16 Slices = Rekord)

### Slices

| Commit | Slice | Scope | Kategorie |
|--------|-------|-------|-----------|
| `9eb3f35e` | **191** | H+G+C+I Hygiene-Kombi + Audit Bilder/Scouting/Form | Hygiene + Diagnose |
| `50d777ff` | **192** | Holdings NULL-Player Defensive Guard + Type-Truth-Fix | Bug-Fix (REWORK→PASS) |
| `b2bf040b` | **193** | AuthProvider-Perf + Auth-Race-Gate | Root-Cause-Fix |
| (live) | **194** | Walkthrough-Crawler Design (Stufe 1) | Remote-Agent (running) |

Plus 12 weitere Slices (188-190) aus Session 4 die in dieser Session-Sequenz logisch dazugehoeren.

### DISTILLs (Decisions D40-D44 in `memory/decisions.md`)

- **D40 PROCESS:** Live-Verify mit Chrome-DevTools-MCP statt Hypothesen-Debugging
- **D41 ARCHITECTURE:** Defense-in-Depth-Pattern fuer Silent-Fails (4-Layer-Standard)
- **D42 PROCESS:** Reviewer-Agent Critical-Findings sind Pre-Merge-Pflicht
- **D43 ARCHITECTURE:** Type-Truth-Audit-Pflicht bei RPC-konsumierenden Services
- **D44 PROCESS:** Remote-Agent fuer autonomes Over-Night-Design (Trial)

### Knowledge-Pattern (in `memory/patterns.md` + `errors-db.md`)

- **patterns.md #30:** Defense-in-Depth fuer Silent-Fails (4-Layer + Auth-Gate Layer 0)
- **patterns.md #31:** Cache-Priming-Audit (alle qk.X.* Pfade auditieren bei Service-Filter)
- **patterns.md #32:** React-Query enabled-Gate auf profileLoading (Auth-Race-Mitigation)
- **errors-db.md:** PostgREST nested-select Auth-Race + Symptom-Decoder-Tabelle (7-Felder-Default-Match)

## Kern-Erkenntnisse fuer naechste Session

### 1. Holdings-Bug live behoben (Slice 192/193)

Anils Screenshot vom Manager-Aufstellen-Tab (`#0 MID 0 CR 1/1 SC 0S 0T 0A` Geister-Rows) war ein **Auth-Race im Cookie-Resume**. PostgREST nested-select `player:players(...)` returnte silent NULL waehrend JWT noch nicht hydrated war.

**4 Layer Defense gebaut:**
- L1 Type-Truth: `MarketUserDashboard.holdings: DbHolding[]` (war fehlerhaft `HoldingWithPlayer[]`)
- L2 Service-Filter: `getHoldings` filtert null-player + logSilentCatch + all-ghost throw
- L3 Mapper-Throw: `dbHoldingToUserDpcHolding` wirft `ghost_holding_row` i18n-key
- L4 Tests: 8/8 (4 Mapper + 4 Service)
- **L0 (Slice 193):** `useHoldings` `enabled: !!userId && !profileLoading` Auth-Gate

### 2. Reviewer-Agent fand CRITICAL-Bug pre-merge (D42)

Slice 192 erste Iteration hatte nur Layer 3 (Mapper-Throw) — Reviewer-Agent (Cold-Context Opus) fand `primeMarketDashboardCaches` schreibt DbHolding-Daten in `qk.holdings.byUser` Cache, was nach Mapper-Throw Hard-Crash auf `/market → /fantasy` produziert haette. REWORK → 4-Layer-Komplettierung. **D42 codifiziert:** CRITICAL-Findings sind Pre-Merge-Pflicht.

### 3. Type-Truth-Lie seit Slice 122 latent (D43)

`get_market_user_dashboard` RPC liefert `DbHolding[]` (kein nested player-JOIN). TS-Cast `as HoldingWithPlayer[]` log seit 2026-04-21. Funktionierte nur weil kein Consumer den nested `player`-Feld las. Mit Slice-192 Mapper-Throw waere Lie als Hard-Crash sichtbar geworden. **D43 codifiziert:** TS-Cast vs `pg_get_functiondef` audit pflicht.

### 4. Live-Verify-Power via Chrome-DevTools-MCP (D40)

Bei Slice 192 sparte Live-Network-Trace 30 Min Code-Hypothesen-Cycle. `x-envoy-upstream-service-time: 154 ms` zeigte sofort: RPC ist nicht das Problem, Auth-Race ist. **D40 codifiziert:** Bei Bug-Reports zuerst Chrome-DevTools-MCP-Live-Inspection, dann Code-Reading.

### 5. Remote-Agent Modalitaet etabliert (D44, Trial)

2 Remote-Agents heute geschedule:
- `trig_01AJ8PouTotX83RjBJZuAXmM` — Slice 193 Sentry-Verify (feuert 2026-04-25 22:10 UTC = morgen 00:10 Berlin)
- `trig_01YPzqQgFtgjqij1x5uitJpf` — Walkthrough-Crawler Design (lief 2026-04-24 22:35 UTC = heute 00:35 Berlin)

**Lernung:** Update-Race war 23 min zu spaet (Anil-Vision-Erweiterung kam nach run_once_fired). Stufe 2+3 (Form-Validation + State-Mutation) muessen morgen als Slice 194 lokal nachgezogen werden — der Crawler-PR hat nur Stufe 1.

## Nahtloser Start fuer naechste Session

### Erster Lesezug

1. Dieses Handoff-File (bist du gerade)
2. `memory/decisions.md` D40-D44
3. `worklog/log.md` Top 6 Eintraege (Slice 191-193)
4. GitHub Pull-Requests Tab — neue PRs von Remote-Agents

### Konkreter Plan morgen frueh

```
1. Inkognito-Test auf bescout.net (test1@gmx.de):       ~3 min
   - Manager-Tab -> Aufstellen -> Spieler haben Namen?
   - Wenn ja: Slice 192/193 Live-Verified
2. PR #1 (Slice-193-Verify) lesen:                       ~5 min
   - Fall A (clean): Merge oder Auto-merge OK
   - Fall B (events): GitHub-Issue lesen, Repro-Hypothese checken
3. PR #2 (Walkthrough-Crawler-Design) lesen:            ~15 min
   - Design-Doc D1
   - 5 Open-Questions beantworten (im PR-Comment)
4. CEO-Approval fuer Stufe 2+3:                         ~3 min
   - "go" zu Stufe 2 (Form-Validation)?
   - "go" zu Stufe 3 (State-Mutation, braucht Bot-Accounts)?
5. Wenn beide OK: Slice 194 starten                     ~2-3h coding (lokaler Claude)
```

Total morgen: ~25 min Review + 2-3h Slice 194 wenn voll abgesegnet.

### NICHT starten ohne Ruecksprache

- Kein Radix-Revert (Custom-Modal deleted)
- Kein neuer Migration ohne `mcp__supabase__apply_migration`
- Kein `git push --force` auf main
- Kein Bot-Account-Pool ohne Sandbox-Spec D5 + CEO-Approval
- Keine Stufe-3-Crawler-Aktionen (Money-Mutation) ohne `is_demo=true` Flag-Check

## Open Follow-ups

| Prio | Scope | Owner | Session |
|------|-------|-------|---------|
| **P0** | 6 unpushed commits pushen (Slice 191-193) | Claude (Session-End) | jetzt |
| **P1** | 3 Beta-Tester anrufen + Zoom-Calls | Anil (Mensch-Task) | ASAP |
| **P2** | Walkthrough-Crawler PR review + Stufe 2+3 build | Anil-Approval + Claude | morgen |
| **P3** | Vercel-Plan-Entscheidung: Hobby vs Pro | Anil (CEO) | nach Beta-Tester |
| **P4** | Auto-RPC-Type-Truth-Audit-Skript (D43 Backlog) | Claude | post-Beta |
| **P5** | Holdings-RPC-Migration (PostgREST → SECURITY DEFINER) | Claude | post-Beta |
| **P6** | AuthProvider-Performance-Slice (`/optimize`) | Claude | falls Cold-Start-Latenz weiter triggert |
| **P7** | HomeDashboard filterValidHoldings Helper | Claude | optional |
| **P8** | 181g JoinConfirmDialog Custom-DOM-Refactor | Claude | nice-to-have |
| **P9** | Research-Bot-Seed (Scout-Consensus-UX) | Anil-Entscheidung | post-Beta |
| **P10** | L5-Data-Drift Audit (11% ohne perf_l5) | Claude | post-Beta |
| **P11** | TR-Locale-Reviewer organisieren | Anil | vor Beta-Launch |
| **P12** | gtm-writer Output (Landing/Reddit/Cold-Email) | Claude + Anil | wenn marketing-fokus |

## CI / Pipeline-Status

- `main` = `f20bf7ec` lokal, **noch nicht gepusht** (push beim Session-End)
- Tests: Slice 192 8/8 Tests gruen, tsc clean
- Vercel Auto-Deploy: funktional nach Hobby-Workaround
- Pre-Commit-Hooks: alle aktiv (commitlint + lint-staged + tsc + ship-cto-review-gate + ship-proof-gate)

## Worktree-Status

- main = einziger Worktree
- Keine offenen Agent-Worktrees lokal
- 2 Remote-Agents auf claude.ai/code/routines aktiv

## CEO-Scope-Reminder (morgen frueh)

- **Vercel-Plan-Entscheidung:** Hobby-Tier aktiv. Pro-Upgrade noetig wenn hourly Crons gewollt sind.
- **Beta-Launch:** Wartet auf 3 echte Tester (Anil-organisiert). Kein Code-Blocker.
- **Walkthrough-Crawler Stufe 3 (State-Mutation):** Braucht Sandbox-Spec + Money-Caps + Bot-Account-Pool. CEO-Approval pflicht weil Money-Path-Test.
- **GTM-Push:** gtm-writer Skill ungenutzt. Anil entscheidet wann marketing-fokus startet.

## Remote-Agent-Routine-Links

- Slice 193 Sentry-Verify: https://claude.ai/code/routines/trig_01AJ8PouTotX83RjBJZuAXmM
- Walkthrough-Crawler Design: https://claude.ai/code/routines/trig_01YPzqQgFtgjqij1x5uitJpf

## Time-Budget-Annahme naechste Session

- Inkognito-Verify + PR-Reviews: ~25 min
- Slice 194 (Walkthrough-Crawler Stufe 2+3, falls Approval): 2-3h
- Optional Slice 195+ post-approval Backlog: variabel

**Total morgen wenn voll abgesegnet:** ~3h coding + 25 min review.

## ⚠ CRASH RECOVERY (20260425-181543)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260425-181543.diff)
```
 M .claude/settings.local.json
 M memory/session-handoff.md
 M worklog/active.md
?? .claude/state/
?? worklog/audits/silent-fail-2026-04-25.md
```

- Worktree **agent-a13ebc79df332bc0e**:  1 file changed, 15 insertions(+), 1 deletion(-)

→ 1 worktrees had pending work at crash time

### Recovery: Apply diff with `git apply .claude/backups/crash-20260425-181543.diff`

## ⚠ CRASH RECOVERY (20260425-182530)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260425-182530.diff)
```
 M .claude/settings.local.json
 M memory/session-handoff.md
 M worklog/active.md
?? .claude/state/
?? worklog/audits/silent-fail-2026-04-25.md
```

- Worktree **agent-a13ebc79df332bc0e**:  1 file changed, 15 insertions(+), 1 deletion(-)

→ 1 worktrees had pending work at crash time

### Recovery: Apply diff with `git apply .claude/backups/crash-20260425-182530.diff`
