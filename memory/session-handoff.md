# Session Handoff
## Letzte Session: 2026-04-08 Abend → 2026-04-09 Nacht (7 Commits, Equipment v2 + Realtime Feed + DB-Migration-Doku)

## TL;DR

Sauberer Doppel-Sprint: (1) Equipment-Inventar-Screen von plain-grid auf Collection-Style gehoben, (2) Following Feed auf Realtime umgestellt. Beide Features live auf bescout.net und mit Playwright + Supabase-service-role als echte INSERT-Events verifiziert. Plus: stale v1 Mystery-Box-Drop-Raten als final bestätigt, Migration-Registry-Drift diagnostiziert und als Rule dokumentiert (nicht repariert — bewusste Entscheidung).

## NEXT SESSION KICKOFF — offen nur noch Produkt-Entscheidungen

**Erstmal lesen:**
1. Diesen Handoff (du bist hier)
2. `.claude/rules/database.md` — die neue Migration-Workflow-Regel (wichtig für jede DB-Arbeit)
3. `C:\Users\Anil\.claude\projects\C--bescout-app\memory\MEMORY.md` — alle Projects DONE-Flags korrekt

**Es gibt KEINE offenen Code-Punkte.** Nächste Session wird entweder:
- **B) Beta-Tester formalisieren** (Produkt-Entscheidung: Anzahl/Zeitrahmen/Onboarding-Call)
- **Revenue Streams** aus `memory/project_missing_revenue_streams.md` priorisieren (Sponsor Flat Fee / Event Boost / Chip Economy)
- **Equipment Lineup Live QA** sobald ein offenes Fantasy Event läuft (externe Abhängigkeit, nicht unter Kontrolle)
- **Freies Thema** wenn Anil was neues einbringt

## Was in dieser Session passiert ist

### 1. Equipment Ökonomie v1 bestätigt (Commit 76003b1)
Ist-Stand der Mystery Box Calibration v1 (Migration `20260407120000`) analysiert und Anil 3 Detail-Fragen gestellt (EV / R4-Scarcity / Full-Set-Cadence). Antwort war A/A/A = Status Quo = final. Keine neue Migration nötig. `project_chip_equipment_system.md` + Handoff + MEMORY.md auf "bestätigt" geflippt.

### 2. Equipment Inventar Screen v2 (Commits d71975a + 6ee9629)
**Stopp, der Screen existierte schon** unter `/inventory?tab=equipment` — Handoff-Notiz "User sieht Equipment nur im Lineup-Picker" war stale. Anil wollte trotzdem alle 5 nice-to-haves drin:

- **Stats-Header:** Items · Typen X/5 · Höchster Rang · Aktiv (gold-accented wenn Rang oder equipped > 0)
- **Pokédex-Matrix** ("Alle" Mode): 20 Slots = 5 Typen × 4 Ränge. Owned Cards farbig + Equipped-Badge, missing Slots dashed-border + Lock-Icon + grayed Icon.
- **Verbraucht-View:** includeConsumed Service-Param + separater Query-Key (`qk.equipment.inventoryAll`), grayscale cards mit "N× verwendet" Badge.
- **Filter/Sort:** Position-Chips (Alle/GK/DEF/MID/ATT/Universal), Sort-Dropdown (Rang ↓/↑/Neueste), Sort nur in Aktiv+Verbraucht-Mode sichtbar (Matrix hat fixen Reihenfolge).
- **Manager Shortcut:** Neue `EquipmentShortcut.tsx` Komponente in Aufstellen + Kader Tabs (inkl. beider Early-Return Empty States — da fehlte er initial, deshalb der fix-Commit `6ee9629`).

Live verifiziert auf bescout.net mobile + desktop als jarvis-qa (7 Items, Max R4, 1 equipped).

### 3. Following Feed Realtime (Commits 7ddac0b + 41c0218)
Migration `20260408220000_activity_log_realtime.sql` → REPLICA IDENTITY FULL + publication. `useFollowingFeed` Hook bekam:
- **Channel-Subscription** auf `activity_log` INSERT ohne Client-Filter (Key-Insight: Supabase Realtime respektiert RLS; cross-user SELECT-Policy aus `e61be4a` filtert serverseitig auf `following + FEED_ACTIONS`)
- **Throttle-2s-Window** (first event starts timer, subsequent events buffern ohne reset → verhindert stetiges Debounce-Verschieben)
- **`pendingCount` + `applyPending()`** als Hook-Return

`FollowingFeedRail` rendert Gold-Pill `↑ {count} neue Aktivitäten` (ICU plural DE/TR), Click → `invalidateQueries` + `keepPreviousData` (bereits global default in `queryClient.ts:11` → flicker-free).

**Live bewiesen** mit `e2e/qa-realtime-feed.ts`: Playwright loggt als jarvis-qa ein, service-role inserted 5 fake `post_create` Rows auf einen gefolgten User (emre_snipe), Pill zeigt "5 neue Aktivitäten", Click refetcht, Feed rendert die neuen Einträge, Cleanup entfernt die Fakes.

**Neuer Pattern:** `memory/patterns.md` #21 Realtime + React Query als wiederverwendbares Template für zukünftige Live-Features.

### 4. Migration-Registry-Drift diagnostiziert (Commit 66dda23)
Root Cause analysiert: 3 Bugs gleichzeitig — MCP-Timestamp-Mismatch (7), Ghost-Rows in `schema_migrations` (7), Legacy 8-stellige Datum-Prefixe (~17). Surgical Repair (Option A) bewertet und bewusst geparkt, weil jeder neue `mcp__supabase__apply_migration` Bug 1 wieder einführt → Sisyphos. Stattdessen: Workflow-Regel in `.claude/rules/database.md` festgehalten ("NIE `supabase db push`, IMMER `mcp__supabase__apply_migration`"), plus komplette Diagnose im User-Memory `reference_migration_workflow.md`.

### 5. Tech-Debt-Verifikation
Stale `working-memory.md` (2026-04-07) Punkte geprüft:
- `ipo.test.ts` (war "failing") → **36 tests passed** ✅
- `EventDetailModal.test.tsx` (war "failing") → **14 tests passed** ✅
- Equipment Inventar Screen (war "optional offen") → geliefert ✅

## Code Status (final)

- `tsc --noEmit`: CLEAN
- `next lint` auf allen changed files: clean
- `next build`: clean (nur pre-existing Warnings in `global-error.tsx`)
- Playwright Live QA auf bescout.net: alle 3 Features verifiziert
- `activity_log` Realtime: `relreplident=f`, `in_publication=1`
- Keine Background-Processes, Dev Server nie gestartet (lief schon auf :3000 von Anil)

## Commits dieser Session (7)

| Hash | Message |
|------|---------|
| `d71975a` | feat(inventory): equipment pokedex + stats + consumed history + manager shortcuts |
| `76003b1` | docs(memory): mystery box drop rates v1 confirmed final |
| `6ee9629` | fix(manager): show EquipmentShortcut in Aufstellen empty states |
| `7ddac0b` | feat(social): live scout activity feed via supabase realtime |
| `41c0218` | test(e2e): QA script for realtime following feed |
| `32c4248` | docs(memory): realtime + react query pattern + close session handoff |
| `66dda23` | docs(database): document migration workflow + registry drift |

Alle auf `origin/main` gepusht, alle via Vercel deployed auf bescout.net.

## Neue Memory-Einträge

- `memory/patterns.md` → **Pattern #21** (Realtime + React Query Live Feed Template, mit throttle-window und invalidate+keepPreviousData Recipe)
- `.claude/rules/database.md` → **Migration Workflow Section** (NIE `db push`, immer MCP, Registry-Drift dokumentiert)
- `~/.claude/projects/C--bescout-app/memory/pattern_supabase_realtime_rls.md` → Reference: Supabase Realtime respektiert RLS
- `~/.claude/projects/C--bescout-app/memory/reference_migration_workflow.md` → Komplette Diagnose des Drifts für zukünftige Sessions

## Umgebung / Lokaler State

- `.next-old/` und `.next-old2/` im Repo-Root (gitignored) — liegen seit 2026-04-08 rum, können beim nächsten Aufräumen gelöscht werden
- Anil's Dev Server lief durchgehend auf :3000, musste nie restartet werden
- `activity_log` hat jetzt REPLICA IDENTITY FULL + ist in `supabase_realtime` publication
- `schema_migrations` Registry ist drifted, aber der drift ist **bewusst dokumentiert** und nicht repariert (siehe `reference_migration_workflow.md`)

## QA Account (unverändert)

- Email: `jarvis-qa@bescout.net` / Handle: `jarvisqa` / UUID: `535bbcaf-f33c-4c66-8861-b15cbff2e136`
- Password: `JarvisQA2026!`
- ~7.700 CR, 63 Tickets, 6 Tage Streak, 8 Holdings, 1 Manager-Lineup
- 7 Equipment Items (Kapitän R4 equipped)
- 3 Follows: `kemal2`, `test12`, `emre_snipe`
- **favorite_club_id = null** (perfekter null-club Test User)

## Projekt-Status Snapshot (alle Hauptthemen DONE)

| Thema | Status |
|-------|--------|
| Manager Team-Center Migration | ✅ Waves 0-5 DONE (2026-04-07/08) |
| B1 Scout Missions E2E | ✅ DONE |
| B2 Following Feed E2E | ✅ DONE (2026-04-08 Vormittag) |
| B2 Following Feed **Realtime** | ✅ DONE (2026-04-09 Nacht) |
| B3 Transactions History E2E | ✅ DONE (2026-04-08 Abend) |
| Onboarding Multi-Club | ✅ DONE (2026-04-08 Abend) |
| Equipment System | ✅ DEPLOYED LIVE, Drop-Raten bestätigt, Inventar Screen v2 live |
| Kill-Switch Founding Passes 900K | ✅ IMPLEMENTIERT |
| Migration Registry Drift | ✅ Dokumentiert (bewusst nicht repariert) |

Keine Krümel. Nächste Session startet von einem sauberen Stand.
