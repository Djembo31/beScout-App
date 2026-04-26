# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
review: —
```

## Zuletzt

- **Slice 217** (2026-04-26) — Sign-Off-Trial-Run trotz P1=3 (S-Verifikations-Slice). Anil-Direktive "3" = teste ob Auto-Beta-Ready-Foundation lügt. **Resultat: HARD-NO-GO bestätigt** — System produziert ehrliches NO-GO. Decision-Matrix: 2 ✅ + 4 ❓ + 2 ❌ (tester-list FEHLT, onboarding-doc FEHLT). Phase-Tracker auf D, last_signoff=FAIL. Hook ship-phase-gate jetzt warnt mit "Phase: D, Sign-Off: FAIL". 5/5 ACs grün. Self-Review D35. Commit a9122ea1.
- **Slice 215** (2026-04-26) — Phase-C Re-Run mit Bash-First-Write + Manual-Completion (S-Slice). 2 Background-Agents (Persona-K + FM-Mechanics) re-dispatched mit Pattern v2 Skeleton-First. **Files persistent** ✓, **iteratives Append failed** ✗ — beide Agents schrieben nur Skeleton. Manual-Completion durch CTO appendierte 5 neue Findings: K-RR-1 P1 (Floor-Preis-Tooltip), K-RR-2 P2 (BuyConfirmModal Sentiment), FM-RR-1 P2 (Sparkline Hover), FM-RR-2/FM-RR-3 P3 (Watchlist-Page + Trending-Pills). Pipeline re-runned → 4 Stubs (3 P1 + 1 P2P3-Bundle). Phase-Tracker: P1=2→3 (K-RR-1 NEU). Workflow-Learning: Pattern v3 nötig für 216+. Commit 1231bcbe.
- **Slice 214** (2026-04-26) — Auto-Beta-Ready Self-Healing-Loop (L-Meta-Process). Anil-Direktive "ich höre fertig aber dem ist nicht so". Foundation für autonomen Phase-A→B→C→D-Loop: `worklog/beta-phase.md` (Phase-Tracker SoT) + `ship-phase-gate.sh` (UserPromptSubmit-WARN bei Beta-Claim ohne Sign-Off) + `scripts/findings-to-slices.ts` (Pipeline mit Auto-AC-Skeleton) + `auto-beta-ready` Master-Skill. CLAUDE.md+workflow.md hard-Definition. **Live-Test:** 7 Background-Agents Phase-C-Re-Run dispatched, 5 Findings aggregiert, 3 Slice-Stubs auto-generiert (FM-NEU-1 Slice-204-Regression, UX-NEU-1 FeedbackModal preventClose, P2-Bundle TR+Fantasy). Reviewer CONCERNS→PASS post-Heal (3 HIGH + 2 MED inline-gefixt). 12/12 ACs grün. Phase=C, Sign-Off=never — Slice 214 nicht "fertig" laut neuem Standard, Slice 215+ heilt Phase-C-Findings. Commit 7af9a793.
- **Slice 213** (2026-04-26) — QuickActionPills Component-Extract (Brand 1 P3, S-Slice). Inline-Map-Block aus `src/app/(app)/page.tsx` extrahiert in self-contained Component `src/components/home/QuickActionPills.tsx` mit narrow TypeScript-Type für labelKey. 5 Lucide-Icons aus page.tsx-Imports bereinigt. Visual-Behavior 1:1 verifiziert. Reviewer PASS, keine REWORK. **Foundation Slice 211/212 live-verifiziert: ship-spec-quality-gate.sh silent bei konformer Spec während BUILD.** Spec ist Gold-Standard-Beispiel für 13-Sektionen-Format. Brand-Coherence 16/18 (~89%). Commit 795ea210.
- **Slice 212** (2026-04-26) — Spec-Quality-Gate-Hook + /ship new Template-Reference (Wave 2 von Slice 211 D50, S-Slice). NEU `ship-spec-quality-gate.sh` WARN-Hook prüft Pre-BUILD Spec-Pflicht-Sektionen je Slice-Größe (XS=6, S/M=13, L=13+Pre-Mortem). Tolerant gegen Markdown-Stil-Drift, skipped meta-Files / idle / emergency / inline-Spec. WARN-only kein BLOCK (false-positive-safe wie Slice 211 Verdict-Hook). settings.json Hook-Registration. /ship Skill referenziert _TEMPLATE.md explizit. workflow.md Hook-Verweis. Reviewer PASS (1 LOW Backlog: tr-d-Pfade-mit-Spaces; 3 NITs; Lücke benannt: Hook prüft Sektion-EXISTENZ nicht Item-Counts → Slice 213). 10/10 ACs grün + 3-Hook-Chain-Smoke-Test post-Reviewer (alle silent + exit 0, kein Stack-Interference). Commit 399f4ffb.
- **Slice 211** (2026-04-26) — Spec-Foundation-Uplift (L-Meta-Process). 4 neue /spec Pflicht-Sektionen 1.10-1.13 (Code-Reading-Liste, Pattern-References, Self-Verification Commands, Open-Questions). workflow.md SPEC-Stage komplett überarbeitet mit Slice-Größen-Tabelle (XS/S/M/L Mindest-Items). _TEMPLATE.md als Master-Spec-File. /parallel-dispatch um 3 Briefing-Blöcke erweitert (WORKTREE-PFLICHT absolute-paths-trap, PRE-REVIEW-MEMO, Service-Schnittstelle vorab). Hook ship-cto-review-gate Verdict-Schema-Enforcement WARN-only. 3 Pattern-Drafts aus Slice 207 promoted (Worktree-Isolation-Escape in common-errors.md §0, Migration-Heal v1→v2 in errors-db.md, Pre-Review-Memo Pattern #39). D50 in decisions.md (PROCESS, mit empirischer Evidence aus 6 zitierten Slices + Beziehung zu D45-D49). Reviewer PASS post-Heal (1 MEDIUM Spec-Tabelle-Drift inline-gefixt). 10/10 ACs grün. Commit e446c60a.
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

**Phase-C Stubs nach Slice 215 Re-Run (alle in worklog/specs/214-derived-*.md):**
- **Slice 216** Heal 3 P1 (Wave-Slice): FM-NEU-1 (PickRateBadge cards-only) + UX-NEU-1 (FeedbackModal preventClose) + K-RR-1 (Floor-Preis-Tooltip). Wenn alle 3 closed → P1=0 → Sign-Off-Gate öffnet.
- **Slice 217** Phase-D Sign-Off-Trial (`/auto-beta-ready signoff`) — wird bei P1=0 PASS, sonst FAIL mit klarer Liste.
- **Slice 218** P2-Bundle (5 Findings): TR event_winner + FPL 60min-Rule + FM-RR-1 Sparkline-Hover + K-RR-2 Sentiment-Erklärung + FM-RR-2 Watchlist-Standalone-Frage. Stub `214-derived-p2p3-bundle.md`.
- **Slice 219+ Backlog:** P3-Polish, Briefing-Pattern v3 für Background-Agent-Iterativ-Append.

**Wave 3+ — Workflow-Tooling-Backlog:**
- Hook-Item-Count-Validation (Slice 212 Reviewer-Lücke)
- Hard-BLOCK upgrade falls `spec: inline (...)` Bypass missbraucht
- `scripts/audit-stale-check.ts` (D48 automatisiert)
- `scripts/type-truth-audit.ts` (D43/D49 automatisiert)
- Pipeline P2/P3 per-domain-bundle (Slice 214 Reviewer-Backlog)
- Stop-Hook → Phase-Tracker-Update bei feat/fix-Commits

**Real-actionable-frontend-only (CTO-scope):**
- *Pool praktisch leer.* Brand 1 closed (Slice 213). Verbleibende Items sind Money-Path (CEO) oder Backend-M-Slices oder Post-Beta-deferred.

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
