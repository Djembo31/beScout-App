<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-17 01:48)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 1 Files
```
 M memory/session-handoff.md
```

## Session Commits: 9
- 4b005e20 feat(treasury): Slice 329 — Club-Treasury-Fundament (append-only Ledger + Saldo + Abo-Bug-Fix)
- 3cd6fa4a docs(session-end): DISTILL D84 (Setup-Elite-Upgrade) + Resume-Handoff
- 15ddcbfc docs(setup): Achse 5 — Modell-Routing-Regel verankert (§8)
- 3797e3cd docs(setup): Achse 3 — Autoload-Budget, ~2,6k Z. errors-*.md on-demand
- 60ee1c84 docs(setup): Achse 1 — Verschlankungs-Audit, Befund: Kern bereits schlank
- ced8b2c7 docs(setup): Achse 2 — EIN Workflow + Karpathy-CLAUDE.md, Zahlen-Drift raus
- f1a228d0 chore(worklog): Achse 4 — beta-Phase Audit-Subdirs >30d archiviert
- 4cda65de docs(plan): Karpathy-Minimalismus als Leitstern im Setup-Upgrade verankert
- 21ff6b7f chore(memory): 27 verwaiste journey-Audits archiviert (Hygiene Achse 4)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-06-17 Abend — Treasury-Fundament DONE)

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Working tree: nur self-renewing Audit-Churn (`worklog/audits/*-2026-06-XX.md` → NICHT committen). `worklog/active.md` = idle.

## ⚡ NÄCHSTER SLICE = 330 — CSF-Engine ans Treasury (Money/CEO, eigene sorgfältige Spec)

D83 Bau-Sequenz Schritt 2. Erste **RAUS/debit-Buchung** gegen das neue Treasury (Slice 329 ist die REIN-Seite).
- **Scope:** `liquidate_player` zahlt CSF aus dem Club-Treasury (debit via `book_club_treasury(...,'debit','csf',...)`) statt on-the-fly. + **Cap-Semantik final** (pro-Card cents vs. Transfer-EUR-Referenz — D83 Re-Visit-Trigger, in Spec klären) + **`csf_multiplier` RAUS** (rein proportional, D83). Was-wäre-wenn-Rechner (`calculate_success_fee`) optional.
- **Fundament steht:** `book_club_treasury()` unterstützt `debit` (Schema + Helper SUM-based, robust gegen N-Debits-1-TX → Airdrops/CSF-Massenauszahlung). Ledger-Typen `csf`/`fan_reward`/etc. im CHECK vorgehalten.
- **Pflicht:** `/ship new` → SPEC mit Live-RPC-Body-Verify (`liquidate_player` pg_get_functiondef = Baseline, Slice-156) → IMPACT → BUILD selbst (Money) → REVIEW (Cold-Context, Grants 1:1!) → PROVE (BEGIN/ROLLBACK-Smokes) → LOG.
- Danach D83-Sequenz: #3 RAUS-Kanäle (Events/Polls/Bounties aus Treasury) → #4 Fan-Reward-Engine. Optional **329b-UI** (`AdminTreasuryTab` Ledger-Anzeige; Club-Fee NICHT als „burn").

## ✅ Diese Session (2026-06-17) — 2 große Blöcke

1. **Setup-Elite-Upgrade (D84)** — 5 Achsen: CLAUDE.md Karpathy-Prinzipien-first (164→103 Z.), EIN Workflow (workflow-reference gemerged), SHIP-Loop 5→6-Stufen-Fix, Register=SSOT-Pointer (Drift-Klasse tot), Autoload ~4,5k→~1,2k Z. (errors-*.md paths-scoped), Modell-Routing §8.
2. **Slice 329 Treasury-Fundament (DONE, prod-live)** — `club_treasury_ledger` append-only + `book_club_treasury` (SUM-based) + trades-Trigger (Income ohne RPC-Edit) + Abo-Bug-Fix + `get_club_balance` Ledger-Read. Commit `4b005e20`. Reviewer fing 1 BLOCKER (cron-Grant-Revert) → gefixt.
3. **Reviewer-„Verdict-first" (D85)** — `.claude/agents/reviewer.md` + `/ship review`: sichtbare Antwort startet mit Verdict + Findings (gegen Truncation, 2× in 329). Supabase-Branch-Dry-Run = verworfen (Anil).

## 🧠 WICHTIG fürs nächste Mal
- **Money-Migration-Muster (aus 329, bewährt):** Live-RPC-Bodies verifizieren VOR Spec (IMPACT senkt Blast-Radius drastisch) · D39-Trigger statt N RPC-Edits wo möglich · Grants 1:1 zur Live-Wahrheit halten (cron-only-RPCs NICHT an authenticated granten!) · Backfill verifizieren VOR Read-Switch · BEGIN/ROLLBACK für alle Prod-Smokes · `SUM(bigint)::bigint`-Cast.
- **Bank-Ledger:** `balance_after` = SUM(ledger) unter Row-Lock, NIE „letzte Zeile" via created_at/id (`errors-db.md`).
- Money-Konzept-SSOT: **D83** + `worklog/concepts/csf-club-treasury-model.md`. NIE neu erarbeiten.

## ⚠️ STOLPERFALLEN
1. **API-Football-Key gesperrt** — blockiert players.club (S7 Paar A) + 154 Geister + Live-Scores. Anil muss Key freischalten. (CSF/Treasury brauchen ihn NICHT.)
2. **Audit-Churn** (`worklog/audits/*-2026-06-XX.md`) — self-renewing Cron-Output, NIE committen.
3. **Playwright-QA:** jarvis-qa@bescout.net / `JarvisQA2026!` / BASE_URL `https://www.bescout.net`. Bei Liga/Club-Verify SW-Cache leeren.
4. **Offene Mini-Hygiene (unkritisch):** log.md 316–325 unter 315 (Sortier-Drift); D81 fehlt in decisions.md (springt D80→D82).
