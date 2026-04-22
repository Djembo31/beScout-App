# Next Session Briefing — 2026-04-23

## TL;DR (3 Sätze)

Session 2026-04-22 hat 4 Code-Slices geliefert (137 Clubs-GW-Filter + Opponent-Logo, 138 Follow-Race-Mutex, 139 Skip-Reconcile-on-Follow, 140 gameweek-sync DB-Truth-Guard), den vollständigen Root-Cause-Baum für den /clubs-GW-Bug aufgedeckt und in 5 Dependency-Layern konsolidiert (`memory/backlog.md`). B2 + B4 + B5 sind erledigt, 3 neue Decisions (D10-D12) gefiled. Saubere idle-State, 7 Commits heute, alle auf main + Vercel-Deploy.

**Erste Aktion morgen:** `git log --oneline -8` lesen, dann entweder Anil triggert `sync-fixtures-future` für Cleanup der 4 stale Süper-Lig-Fixtures ODER wir starten direkt Option B0/B3 (s.u.).

---

## Drei Optionen für Start

### Option A: Gold-Standard 95% CSV-Workflow (empfohlen)
- Anil-manueller Task, 3-4h, 134 unknown-Spieler via CSV-Import-UI füllen
- Voraussetzung: `sync-fixtures-future` einmalig triggern für Cleanup der 4 Süper-Lig-Stale-Fixtures (2 min)
- Kein Claude-Slice nötig während Anil arbeitet — parallel könnte Claude Option B/C machen

### Option B: TM-Squad-Page Scraper Spec (P2, 2-3h)
- Neue Scrape-Strategie: 140 Clubs × 1 Request statt ~500 Search-Requests (10x effizienter)
- URL-Pattern: `https://www.transfermarkt.de/<slug>/startseite/verein/<tm-club-id>`
- Braucht `club_external_ids` mit `source='transfermarkt'` (DB-Audit vorher)
- Garantierte Club-Zuordnung + Trikot direkt im Response
- Liefert auch HTML-Fixtures für C1 Parser-Regression-Tests → 2 Slices zusammen

### Option C: Multi-Account-Testing Hook (P1, Scope-Klärung nötig)
- Kanban sagt "Pre-Commit-Hook: min 2 Accounts durchklicken"
- **Scope-Frage an Anil:** Pre-Commit-Hook (dev-pain, 30s pro Commit) vs GitHub-Action-Post-Deploy-Check (nützlicher)?
- Nach Klärung: 1-2h Implementation

---

## Session-Bilanz 2026-04-22 (persistiert)

### Code-Slices (4)

| Commit | Slice | Scope | Impact |
|---|---|---|---|
| `0eaf4b34` | 137 | fix(clubs) Stale-GW-Filter + Opponent-Logo | UI resilient gegen Sync-Lag + 14px Logo vor Kürzel |
| `d6f2d40d` | 138 | fix(clubs) Follow Race-Mutex + stable callback | Follow-Button flaky behoben, Mutex pro clubId |
| `8dea725b` | 139 | fix(clubs) Skip Reconcile on Follow-Success | pgBouncer read-after-write workaround |
| `d57533a1` | 140 | fix(cron) gameweek-sync Phase-B-Guard DB-Truth | Verhindert künftige stale-Fixture-Leaks |

### Proof-Commits (2)

| Commit | Proof |
|---|---|
| `a26802b7` | Slice 137 live-verify: 18/18 Süper-Lig-Clubs GW 31 + 18/18 Logos |
| `9e67ebe8` | Slice 138 live-verify (rapid-fire 3 clicks, Mutex greift) + B5 discovery |

### Docs-Commits (1)

| Commit | Docs |
|---|---|
| `5ee176ec` | memory/backlog.md — 5-Layer dependency-sortiert |

### Decisions (3 neu)

- **D10 PROCESS:** Backlog in 5 Layern dependency-sortiert (`memory/backlog.md`)
- **D11 ARCHITECTURE:** Supabase Reconcile-Trust-Model — Follow skipt, Unfollow behält
- **D12 ARCHITECTURE:** Cron-Completion-Guards basieren auf DB-Truth, nicht API-Response-Count

### Patterns (2 neu in common-errors.md)

- **pgBouncer Read-After-Write Transient** (Slice 139) — Skip-Reconcile-Pattern auf success-path
- **Cron-Guard API-Response-Count vs DB-Count** (Slice 140) — DB-Truth-AND für Completion-Guards

---

## Root-Cause-Baum /clubs-GW-Bug (komplett aufgeklärt)

```
Symptom: 8 von 18 Süper-Lig-Clubs zeigen GW 30 statt 31
  ↓
Proximate Cause (Slice 137): UI filtert stale-scheduled nicht → Service 6h-Filter
  ↓
Upstream Cause (Slice 140): gameweek-sync vertraut API-Response-Count
  → 4 Fixtures (GAZ-KAY, KAS-ALA, SAM-BES, TRA-IST) nie auf 'finished' geupdatet
  ↓
Additional UX bug (Slice 138): Follow-Button mehrfach-Reaktion → Mutex pro clubId
  ↓
Additional reconcile bug (Slice 139): Supabase pgBouncer read-after-write-transient
  → follow-success skipt reconcile (unfollow behält wg. primary-promotion)
```

---

## Anil-Action-Items (offen)

| # | Task | Aufwand |
|---|------|---------|
| A0 | Alten `sb_secret_vT7ae…` in Supabase Dashboard revoken | 5 min |
| A1 | 3 Beta-Tester organisieren (1 TR, 1 Non-Football) | extern |
| A2 | Deutsch-Türke für TR-Locale-Review | extern |
| **NEU** | `sync-fixtures-future` Admin-Route triggern (cleanup der 4 stale Süper-Lig-Fixtures) | 2 min |

## Risiko-Watch

- **Slice 140 stuck-case:** Wenn API-Football die fehlenden Fixtures NIE zurückgibt, Phase B bleibt hängen → cron_sync_log hat `phase_b_blocked_db_mismatch` Entry → admin muss sync-fixtures-future manuell triggern. Monitoring-Pfad ist jetzt explizit.
- **Slice 138/139 Regression:** Provider-Refactor berührt 5 Consumer (manager-kader, manager-intel etc.). Wenn Provider-Smoke-Tests in anderen Routes scheitern, Rollback via Vercel.
- **sync-fixtures-future ist manual-only** wegen Vercel-Hobby-2-Cron-Limit. Langfristig: Upgrade auf Vercel Pro ODER minimal-cron-job für sync-fixtures-future hinzufügen.

## Confidence der Übergabe

- ✅ 7 Commits auf main (4 fixes + 2 proofs + 1 docs)
- ✅ active.md idle
- ✅ common-errors.md updated (2 neue Patterns)
- ✅ decisions.md updated (D10, D11, D12)
- ✅ backlog.md updated (B4+B5 done, Empfehlung für 2026-04-23 aktualisiert)
- ✅ worklog/log.md updated (Slices 137-140 eingetragen)
- ✅ Vercel Deploy für Slice 139 READY, CI läuft noch für 140
