---
name: BeScout Backlog (Dependency-Sortiert)
description: Konsolidierte Liste aller offenen Arbeiten außerhalb aktiver Slices, topologisch sortiert nach Abhängigkeiten.
type: project
---

**Stand:** 2026-04-22 (3. Session) — Post Slices 144d/f/g/h/148, A0-Ghost-Elim, 9 Commits gepusht. 277 stale → 188 stale (davon 153 ohne TM-Mapping). B2 live (played_at-ordering). B6/B8/B9/B10/B11 alle done.
**Regel:** Items in Layer N können erst nach Abschluss von Layer N-1 starten. Innerhalb Layer N ist Reihenfolge frei (parallele Bearbeitung möglich).

---

## Layer 0 — Anil-Blocker (kein Code-Dep, keine Reihenfolge)

| # | Item | Quelle | ETA |
|---|------|--------|-----|
| A1 | 3 Beta-Tester organisieren (1 TR-sprachig, 1 Non-Football, 1 Power-User) | `memory/beta-testplan.md` | 1-2 Tage extern |
| A2 | 1 Deutsch-Türke für TR-Locale-Review (Strings ready) | `qa-screenshots/synthetic/profile-c-tr-locale/tr-strings.txt` | 30 min extern |
| A3 | Notion-Kanban-Scope — Slice 144/144d/f/g/h/148 nach "Erledigt" draggen (MCP-Integration hat keinen Page-Scope, Anil manuell) | SessionStart-Hook | 2 min |
| A4 | Gençlerbirliği Logo: korrekte api_football_id oder alternative Logo-URL liefern | Slice 148 Follow-up | 5 min (Recherche) |

> **Note:** A0 (Supabase `sb_secret_vT7ae…` revoke) wurde am 2026-04-22 abgeschlossen und ist nicht mehr offen.

**Blockt:** Layer 3 (Beta-Launch-Gate) hängt an A1+A2.
**Parallel machbar zu:** alles in Layer 1 + 2.

---

## Layer 1 — Independent (kein Dep, frei parallelisierbar)

| # | Item | Prio | Aufwand | Quelle |
|---|------|------|---------|--------|
| B0 | **Gold-Standard 95% CSV-Workflow** — 544 unknown-Spieler via CSV-Import-UI füllen (inkl. 153 TM-unmapped-stale aus 144h-Scope-Out) | P0 | 3-4h Anil-manual | `next-session-briefing-2026-04-23.md` Option A |
| B1 | **Sync-Players-Daily Re-Contamination Monitoring** — Post-sync Hook in `src/app/api/cron/sync-players-daily/route.ts` (detektiert neue Cross-Club-Kontamination INV-39) | P2 | 1-2h | Kanban |
| ~~B2~~ | ~~Clubs-Discovery Bug + UX: GW-Inkonsistenz~~ | ✅ DONE | Slice 148 (played_at-ordering, commit `30b5c66e`). Gençlerbirliği Logo = A4 offen. |
| ~~B3~~ | ~~TM-Squad-Page Scraper Spec~~ | ✅ DONE | Slice 144 + 144b (134/134 Full-Run, 2841 matched, 22 shirt-drift) |
| ~~B4~~ | ~~sync-fixtures Cron-Lag Root-Cause~~ | ✅ DONE | Slice 140 (gameweek-sync Phase-B-Guard DB-Truth) |
| ~~B5~~ | ~~ClubProvider Reconcile Read-After-Write-Race~~ | ✅ DONE | Slice 139 + 142 (skip-reconcile on BOTH paths) |
| ~~B6~~ | ~~Squad-Transfer-Apply (225 pending)~~ | ✅ DONE | Slice 144d (217 transfers, 8 bereits via 144e resolved, commit `b8b23594`) |
| ~~B7~~ | ~~Follower-Count Cache-Propagation~~ | ✅ DONE | Slice 143 |
| ~~B8~~ | ~~last_squad_check for transfer-detected~~ | ✅ DONE | Slice 144c |
| ~~B9~~ | ~~WER-Cluster null-club-id audit~~ | ✅ DONE | Slice 144e (8 players reunited) |
| ~~B10~~ | ~~merge-wildmatch anchoring in ship-*-gate.sh~~ | ✅ DONE | Slice 146 |
| ~~B11~~ | ~~/ship new Skill-Template review:-Key~~ | ✅ DONE | Slice 147 |

**Neu heute (Follow-ups aus 144-Cluster):**

| # | Item | Prio | Aufwand | Quelle |
|---|------|------|---------|--------|
| B12 | **107 Orphans null-club-id Investigation** — Players mit `club_id IS NULL` ohne TM-mapping, matches=0, last_appearance_gw=0. DELETE- vs Retired-Strategy | P2 | M (1-2h) | Slice 144e Scope-Out |
| B13 | **4 TM-mapped Orphans Direct-Profile-Lookup** — Agu, Friedl, Grüll, Malatini (null-club-id + TM-mapping), nicht in 144b Squad-Scan gefunden | P3 | XS (30 min) | Slice 144e Finding |
| B14 | **LL Parse-Fail Investigation** — 3 La Liga Players parse-failed in Slice 144h (alle 3 TM-mapped, 0 verified). Potenziell spezielle URL-Struktur oder CF-Block | P3 | S (1h) | Slice 144h Stats |
| B15 | **153 TM-unmapped stale Players Discovery-Slice** — TM-Search + Name-Match + Shirt-Check (analog 141b für Clubs) | P2 | M (3-4h) | Slice 144h Scope-Out |

---

## Layer 2 — Depends on L1

| # | Item | Depends on | Aufwand | Quelle |
|---|------|-----------|---------|--------|
| C0 | **Gold-Badge im Admin-UI** (Data-Quality-Dashboard — Gold-Status pro Liga visuell) | B0 oder B15 ≥ 95% | M (4-6h) | Kanban |
| C1 | **Parser-Regression-Tests** (HTML-Fixtures in `tests/fixtures/transfermarkt/`) | B3 liefert Fixtures | M (3-4h) | Kanban |
| C2 | **Multi-Account-Testing Hook/Gate (F1)** — Scope-Klärung zuerst | Anil-Entscheidung Pre-Commit vs CI | 1-2h nach Klärung | Kanban |

---

## Layer 3 — Post-Beta-Launch (blockiert durch A1+A2 + Beta-Exit-Kriterien grün)

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

1. **Jetzt (Anil parallel):** A1/A2 Tester-Outreach starten + A4 Gençlerbirliği-Logo-URL liefern + A3 Kanban-Manual-Drag
2. **Jetzt (Claude):** B0 (Gold-Standard CSV) ODER B15 (Discovery-Slice für 153 unmapped) je nach Anil-Präferenz
3. **Post-B0/B15:** C0 (Gold-Badge Admin-UI) wenn ≥95%-Ziel erreicht
4. **Wenn A1+A2 grün:** Phase 3b Beta-Tester-Calls → Beta-Exit-Bewertung

## Session 2026-04-22 Abschluss (3 Sessions total)

**Session 1 (früh, 7 Commits):** Slices 137/138/139/140 + memory/backlog.md neu (5-Layer)
**Session 2 (nachmittag, 8 Commits):** Slices 141/141b/142/143/144/144b/145 + Reviewer-Hook live
**Session 3 (spät-nachmittag, 10 Commits):** Slices 146/147/144c/144e + D15 + common-errors optimize
**Session 4 (abend, 9 Commits):** A0-Ghost-Elim + Slices 144d/f/g/h/148 + D16 + Scraper-null-Policy

**Gesamt heute:** 34 Slices/Commits, 4 Decisions (D13-D16), 3+ neue Patterns in common-errors.md. Data-Hygiene massiv verbessert:
- null_club_id: 119 → 111 (144e, 8 resolved)
- club_id UPDATEs: 217 transfers applied (144d)
- stale_total: 324 → 188 (-42%) durch 144f+144g+144h
- TFF1 Gold-Standard erreicht (nur 3 non-mapped remain)
- /clubs Discovery GW-Konsistenz fix (148)
