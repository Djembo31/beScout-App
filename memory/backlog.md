---
name: BeScout Backlog (Dependency-Sortiert)
description: Konsolidierte Liste aller offenen Arbeiten außerhalb aktiver Slices, topologisch sortiert nach Abhängigkeiten. Ersetzt die 3-Optionen-Auswahl aus next-session-briefing-2026-04-23.md.
type: project
---

**Stand:** 2026-04-22 (2. Session) — Post Slice 140b/141/141b/142/143/144/144b/145 + TM-Mapping 134/134, Follow-Fix live, Reviewer-Gate live.
**Regel:** Items in Layer N können erst nach Abschluss von Layer N-1 starten. Innerhalb Layer N ist Reihenfolge frei (parallele Bearbeitung möglich).

---

## Layer 0 — Anil-Blocker (kein Code-Dep, keine Reihenfolge)

| # | Item | Quelle | ETA |
|---|------|--------|-----|
| A0 | Alten `sb_secret_vT7ae...` in Supabase Dashboard revoken (neuer seit 2026-04-21 live-proven) | Session-Handoff | 5 min |
| A1 | 3 Beta-Tester organisieren (1 TR-sprachig, 1 Non-Football, 1 Power-User) | `memory/beta-testplan.md` | 1-2 Tage extern |
| A2 | 1 Deutsch-Türke für TR-Locale-Review (Strings ready) | `qa-screenshots/synthetic/profile-c-tr-locale/tr-strings.txt` | 30 min extern |

**Blockt:** Layer 3 (Beta-Launch-Gate).
**Parallel machbar zu:** alles in Layer 1 + 2.

---

## Layer 1 — Independent (kein Dep, frei parallelisierbar)

| # | Item | Prio | Aufwand | Quelle |
|---|------|------|---------|--------|
| B0 | **Gold-Standard 95% CSV-Workflow** — 134 unknown-Spieler via CSV-Import-UI füllen | P0 | 3-4h Anil-manual | `next-session-briefing-2026-04-23.md` Option A |
| B1 | **Sync-Players-Daily Re-Contamination Monitoring** — Post-sync Hook in `src/app/api/cron/sync-players-daily/route.ts` (detektiert neue Cross-Club-Kontamination INV-39) | P2 | 1-2h | Kanban |
| B2 | **Clubs-Discovery Bug + UX:** GW-Inkonsistenz + Gegner-Wappen vor Kürzel | P1 | 1h | **NEU 2026-04-22 (Anil)** |
| ~~B3~~ | ~~TM-Squad-Page Scraper Spec~~ | ✅ DONE | Slice 144 + 144b (134/134 Full-Run, 2841 matched, 22 shirt-drift) |
| ~~B4~~ | ~~sync-fixtures Cron-Lag Root-Cause~~ | ✅ DONE | Slice 140 (gameweek-sync Phase-B-Guard DB-Truth) |
| ~~B5~~ | ~~ClubProvider Reconcile Read-After-Write-Race~~ | ✅ DONE | Slice 139 + 142 (skip-reconcile on BOTH paths) |
| B6 | **Squad-Transfer-Apply** (225 pending Transfers live machen) | P1 | 10 min (Anil-gatekept `--allow-transfers` run) | Slice 144b Full-Run |
| B7 | **Follower-Count Cache-Propagation** (silent-fail + setQueryData) | ✅ DONE | Slice 143 |
| B8 | **144c XS:** last_squad_check auch für transfer-detected players | P2 | 20 min | Slice 144b Review-Follow-up |
| B9 | **144e XS:** WER-Cluster null-club-id audit (19 players) | P2 | 30 min | Slice 144b Review-Follow-up |
| B10 | **146 XS:** merge-wildmatch anchoring in ship-*-gate.sh | P2 | 20 min | Slice 145 Review-Follow-up (common-errors.md Section 9) |
| B11 | **147 XS:** /ship new Skill-Template review:-Key initialisieren | P2 | 10 min | Slice 145 Review-Follow-up |

**Abhängigkeiten intern:**
- ~~B3 (Scraper) liefert HTML-Fixtures → L2-C1 Parser-Regression-Tests~~ — done, fixtures in `src/lib/scrapers/transfermarkt-squad.test.ts`.
- B0 (CSV-Workflow) weiterhin nötig für MV-stale-Spieler (TM-Squad-Page liefert MV, aber stale-guard aktiviert sich oft und überschreibt nicht). Hybrid: Squad-Scraper für shirt+position, CSV für MV-Refresh.
- B6 (Transfer-Apply) hat 225 pending → 1× `--allow-transfers` Run applied alle. Hat keinen Dependency, aber: nach Anwendung werden `club_id`s aktualisiert, evtl. Orderbook-Referenzen prüfen falls Trading aktiv auf bewegten Spielern.

---

## Layer 2 — Depends on L1

| # | Item | Depends on | Aufwand | Quelle |
|---|------|-----------|---------|--------|
| C0 | **Gold-Badge im Admin-UI** (Data-Quality-Dashboard — Gold-Status pro Liga visuell) | B0 oder B3 ≥ 95% | M (4-6h) | Kanban |
| C1 | **Parser-Regression-Tests** (HTML-Fixtures in `tests/fixtures/transfermarkt/`) | B3 liefert Fixtures | M (3-4h) | Kanban |
| C2 | **Multi-Account-Testing Hook/Gate (F1)** — Scope-Klärung zuerst | Anil-Entscheidung Pre-Commit vs CI | 1-2h nach Klärung | `next-session-briefing-2026-04-23.md` Option B + Kanban |

---

## Layer 3 — Post-Beta-Launch (blockiert durch A0+A1+A2 + Beta-Exit-Kriterien grün)

| # | Item | Aufwand | Quelle |
|---|------|---------|--------|
| D0 | **BeScout Liga + Rankings Hub** — Saison-basiertes Ranking-System | L (Spec+Migration+Hub-Page+5-7 Widgets) | `memory/project_bescout_liga.md` |
| D1 | → 6 offene Design-Fragen (Saison-Modell, Reset-Logik, Rewards, URL, Inhalte, CardMastery-Vision) | 1 Spec-Session vorab | `memory/project_bescout_liga.md` |

---

## Layer 4 — Revenue-Scaling (depends on Layer 3 + erstem Club-Deal)

Quelle: `memory/project_missing_revenue_streams.md`

| # | Item | Prio (Revenue) | Aufwand | Notizen |
|---|------|---------------|---------|---------|
| E0 | **Sponsor Flat Fee (B2B)** — 500-5000 EUR/Event, Logo+Branding auf Event-Cards | **HIGH** | M | Pure Margin, off-platform Abrechnung |
| E1 | Event Boost / Featured Placement | MEDIUM | M | Club zahlt extra für Homepage-Push |
| E2 | Chip/Power-Up Economy (Triple Captain etc.) | MEDIUM | M-L | Code hat bereits `chip_use`/`chip_refund` |
| E3 | B2B Event-as-a-Service Overage (Paket-Limits) | MEDIUM | S | braucht Sales-Pakete live |
| E4 | Event Analytics & Data Licensing | LONG | L | Clubs/Agents/Media |
| E5 | Event Replay/Post-Game Insights | LONG | M | Soft Paywall 1-2 Tickets |
| E6 | Guaranteed Prize Pool Subsidies | GROWTH | Cost-Center | DraftKings-Launch-Playbook |

---

## Runbook-Files zum Post-Beta-Launch (schon fertig, warten nur auf Execution)

- `memory/beta-exit-criteria.md` — 36 Kriterien, Go/Extend/Abort-Logik
- `memory/beta-rollback-runbook.md` — Vercel-Rollback-Prozeduren
- `memory/beta-sentry-alerts-runbook.md` — 3-4 Alert-Rules Click-Path
- `memory/beta-testing-runbook.md` + `beta-testplan.md` + `beta-test-results.md` — Tester-Calls

---

## Empfohlene Reihenfolge für die nächste Arbeitsphase

1. **Jetzt (Anil parallel):** A0 Supabase-Key-Revoke + A1/A2 Tester-Outreach starten + sync-fixtures-future Admin-Route triggern für Cleanup der 4 stale Süper-Lig-Fixtures
2. **Jetzt (Claude):** B0 (Gold-Standard 95% CSV) ODER B3 (TM-Scraper-Spec) je nach Anil-Präferenz
3. **Post-B3:** C1 (Parser-Regression-Tests) im gleichen Slice mit-shippen
4. **Wenn A0-A2 grün:** Phase 3b Beta-Tester-Calls → Beta-Exit-Bewertung → Go-Live oder Extend

## Session 2026-04-22 Abschluss

**Durchgeführt:**
- B2 → Slice 137: /clubs GW-Filter + Opponent-Logo (commits `0eaf4b34` + `a26802b7`)
- Anil-Report: Follow flaky → Slice 138: Race-Mutex (commits `d6f2d40d` + `9e67ebe8`)
- B5 → Slice 139: skip reconcile on follow-success (commit `8dea725b`)
- B4 → Slice 140: gameweek-sync Phase-B-Guard DB-Truth (commit `d57533a1`)
- memory/backlog.md neu (5-Layer dependency-sortiert, commit `5ee176ec`)
- 3 neue Decisions: D10 (Backlog-Layer), D11 (Reconcile-Trust-Model), D12 (Cron-DB-Truth-Guard)
- 2 neue Patterns in common-errors.md (pgBouncer read-after-write + Cron-API-vs-DB-Guard)
