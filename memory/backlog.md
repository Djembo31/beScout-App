---
name: BeScout Backlog (Dependency-Sortiert)
description: Konsolidierte Liste aller offenen Arbeiten außerhalb aktiver Slices, topologisch sortiert nach Abhängigkeiten. Ersetzt die 3-Optionen-Auswahl aus next-session-briefing-2026-04-23.md.
type: project
---

**Stand:** 2026-04-22 nach Session-End + Push Slice 134/135/136 live.
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
| B3 | **TM-Squad-Page Scraper Spec** — 140 Clubs × 1 Request statt ~500 Search-Requests | P2 | 2-3h (Spec+Build) | `next-session-briefing-2026-04-23.md` Option C |
| B4 | **sync-fixtures Cron-Lag Root-Cause** — 4 GW-30 Süper-Lig-Fixtures haben `status='scheduled'` trotz `played_at` 30-60h in Vergangenheit. Vercel Hobby-Cron-Limit (max 2) oder API-Football-Lag? | P1 | 1-2h | Slice 137 scope-out |
| B5 | **ClubProvider Reconcile Read-After-Write-Race** — `getUserFollowedClubs` direkt nach `upsert` liefert neuen Row manchmal nicht (Supabase pgBouncer transaction-pooling?). Folge: Optimistic-Add wird durch stale Reconcile überschrieben, UI reverted sichtbar. Workaround: Reconcile 100-300ms delay ODER `clubData`-Merge statt blind-replace. | P1 | 2h | Slice 138 Live-Test entdeckt |

**Abhängigkeiten intern:**
- B3 (Scraper) liefert HTML-Fixtures mit → ermöglicht L2-E1 (Parser-Regression-Tests) zusammen zu shippen
- B0 (CSV-Workflow) + B3 (TM-Scraper) sind Alternativen zum gleichen Ziel (Gold-Standard) — eines reicht, beides besser

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

1. **Jetzt (Anil parallel):** A0 Supabase-Key-Revoke + A1/A2 Tester-Outreach starten
2. **Jetzt (Claude):** B2 Clubs-Discovery Bug+UX — isolierter 1h-Slice, klarer User-Value
3. **Danach:** Entweder B0 (Anil-manual CSV) ODER B3 (TM-Scraper-Spec) je nach Anil-Präferenz
4. **Post-B3:** C1 (Parser-Regression-Tests) im gleichen Slice mit-shippen
5. **Wenn A0-A2 grün:** Phase 3b Beta-Tester-Calls → Beta-Exit-Bewertung → Go-Live oder Extend
