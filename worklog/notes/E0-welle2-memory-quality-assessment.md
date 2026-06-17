# E0 Welle 2 — memory/-Unterordner Qualitäts-Assessment

> **Datum:** 2026-06-17
> **Zweck:** Qualität der bisher un-inventarisierten `memory/`-UNTERORDNER bewerten (ROOT-Files + decisions.md + rules + wiki + concepts sind bereits in `worklog/notes/E0-welle2-wissens-inventur.md` triagiert — hier NICHT dupliziert). Ziel: fundierte Entscheidung „memory/ wiederbeleben (A) vs. docs/knowledge/ frisch (B)".
> **Methode:** Datei-Zählung + mtime-Spanne (`find -printf`) je Teilbaum · 2-3 repräsentative Files je Teilbaum ganz gelesen, Rest Kopf · Drift-Abgleich gegen MEMORY.md/git/CLAUDE.md · cortex-index-Pfad-Existenz per grep+test.
> **Urteils-Vokabular:** FRESH-KEEP · GOLD-STALE · EPHEMER · DRIFTED/JUNK.

---

## Bewertungs-Tabelle

| Teilbaum | #Files | Datums-Spanne | Urteil | Begründung (1-2 Zeilen) | Beispiel-File |
|---|---|---|---|---|---|
| `semantisch/pattern/` | 4 | 2026-04-15 (alle) | **GOLD-STALE** | Echte, saubere Code-Pattern-Docs (RLS-Write-Proxy, Tier-Config, Slot-Composition, DB-i18n). Durable, aber überlappen mit `.claude/rules/errors-*` + `patterns.md` — wertvoll, ungepflegt seit April. | `pattern/rls-cross-user-writes.md` |
| `semantisch/produkt/` (3 + mogul) | 4 | 2026-04-12 → 2026-06-13 | **GOLD-STALE** | product-map/feature-dependencies/vision = Kern-Produkt-Doku, durable. vision.md selbst-flaggt „historisch, nicht operativ". `mogul-mutationsplan.md` existiert (VERTRAULICH, 18-Mon-Fahrplan) → GOLD-STALE, Inhalt nicht zitiert. | `produkt/bescout-product-map.md` |
| `semantisch/personen/` | 1 (+gitkeep) | 2026-04-02 | **GOLD-STALE** | `anil.md` = Founder-Arbeitsweise; durable, aber dupliziert mit MEMORY.md „Anil"-Block + feedback_*. Cortex liest es bei jedem Start. | `personen/anil.md` |
| `semantisch/sprint/` | 1 (+gitkeep) | 2026-04-14 | **EPHEMER** | `current.md` = „Operation Beta Ready" Sprint-Snapshot vom 2026-04-14 (29/29 Polish, 50 Mann Pipeline). Gilt nicht mehr (Beta ist LIVE seit 2026-05-06, Treasury-Bau läuft). Cortex liest es als „immer aktiv" → aktiv irreführend. | `sprint/current.md` |
| `semantisch/projekt/` | 13 (+2 gitkeep) | 2026-04-02 → 2026-04-15 | **EPHEMER** (Mehrheit) + paar GOLD-STALE | Großteil = `operation-beta-ready-phase*`, `multi-league-phase-1`, `home-polish-sweep`, `fantasy-qa-stabilisation` = abgeschlossene Build-Phasen-Snapshots. Durable-Kerne: `missions-architecture.md` (DB-Schema), `equipment-realtime.md`, `architecture-3hub.md`, `bescout-liga.md` → GOLD-STALE. | `projekt/operation-beta-ready-phase2-3.md` |
| `semantisch/systeme/` | 0 (gitkeep only) | 2026-04-02 | **DRIFTED/JUNK** | Leer seit Anlage. Nie befüllt. | `systeme/.gitkeep` |
| `episodisch/entscheidungen/` | 0 (gitkeep only) | 2026-04-02 | **DRIFTED/JUNK** | Leer. ADR-Slot nie genutzt — Entscheidungen leben in `memory/decisions.md`. | `.gitkeep` |
| `episodisch/fehler/` | 0 (gitkeep only) | 2026-04-02 | **DRIFTED/JUNK** | Leer. Fehler leben in `.claude/rules/errors-*`. | `.gitkeep` |
| `episodisch/journals/` (+archive) | 45 | 2026-04-02 → 2026-06-15 | **EPHEMER** | Per-Slice Build-Tagebücher (Verständnis/Fortschritt/Erkenntnisse). Naturgemäß Wegwerf nach Slice-Done. Einzelne Code-Erkenntnisse sind längst in errors-*/patterns.md geflossen. 8 schon in `archive/`. | `journals/slice-326-league-id-filter-journal.md` |
| `episodisch/metriken/` | 1 (sessions.jsonl, 1200 Z.) | 2026-06-17 | **EPHEMER** | Append-only Session-Metrik-Log (`/metrics`-Tool-Input). Aktiv geschrieben, aber Telemetrie — kein durables Wissen zum Migrieren. | `metriken/sessions.jsonl` |
| `episodisch/sessions/` (+archive) | 10 | 2026-04-02 → 2026-06-17 | **EPHEMER** | Auto-generierte Session-Retros (Stop-Hook). Aktiv (5× von heute), aber Snapshots. 5 schon archiviert. | `sessions/retro-20260617-182014.md` |
| `deps/` | 1 | 2026-03-26 | **GOLD-STALE** | `cross-domain-map.md` = Domain-Interaktions-Matrix (Fantasy→Trading→Wallet→Gamification, Fee-Splits). Durable + wertvoll, aber „Last Updated 2026-03-26" → Treasury/CSF/Polls fehlen komplett. | `deps/cross-domain-map.md` |
| `features/` | 8 | 2026-03-14 → 2026-03-26 | **GOLD-STALE** (1) + **EPHEMER** (Rest) | `fantasy.md` = echtes Feature-Spec (12 Flows, „kein Fantasy-Code ohne diesen Spec") → GOLD-STALE, älteste durable Doku. Rest (`card-overhaul`, `dead-code-cleanup`, `push-notification-strategy`…) = abgeschlossene/verworfene Feature-Pläne → EPHEMER. | `features/fantasy.md` |
| `learnings/` (+drafts) | 9 | 2026-04-02 → 2026-04-15 | **DRIFTED/JUNK** (approved) + **EPHEMER** (drafts) | 5 „approved"-Files (backend/business/frontend/cto-review/deliver) sind LEERE Templates („wird durch Erfahrung gefüllt") → JUNK. 3 drafts haben echten Inhalt (CDN-HEAD-Quirk etc.), sind aber laut cortex schon in errors-* geflossen → EPHEMER-Reste. | `learnings/beScout-backend.md` (leer) |
| `post-mortems/` | 0 (gitkeep only) | 2026-04-02 | **DRIFTED/JUNK** | Leer. `/post-mortem`-Skill schreibt nie hierher. | `.gitkeep` |
| `improvement-proposals/` | 0 (gitkeep only) | 2026-04-02 | **DRIFTED/JUNK** | Leer. | `.gitkeep` |
| `rules-pending/` | 1 | 2026-04-02 | **DRIFTED/JUNK** | `common-errors-pending.md` Inhalt = wörtlich „(leer)". Slot nie genutzt. | `rules-pending/common-errors-pending.md` |
| `senses/` | 1 (+gitkeep) | 2026-06-17 | **EPHEMER** | `morning-briefing.md` = auto-generierter git-log-Snapshot (heute 18:16). Aktiv, aber reiner System-Status-Snapshot. | `senses/morning-briefing.md` |
| `_archive/` | 37 | 2026-04 | **EPHEMER (korrekt archiviert)** | Bestätigt: echtes Archiv — `2026-04-meta-plans/` (Ferrari-10x, walkthrough) + `journeys-2026-04/` (Beta-Audit-Journeys). Gehört dort hin, nicht migrieren, nicht löschen-nötig. | `_archive/journeys-2026-04/journey-2-backend-audit.md` |

---

## cortex-index-Health

- **38 explizite `memory/`-Pfade** referenziert → **36 existieren, 2 stale:**
  - `memory/ferrari-10x-upgrade-plan.md` (STALE — Datei weg; selbst ein April-Meta-Plan, Original liegt in `_archive/2026-04-meta-plans/`).
  - `memory/reference_migration_workflow.md` (referenziert über `~/.claude/projects/...`-Pfad; im Repo-`memory/` nicht vorhanden).
- **3 Wikilinks** (`reference_claude_setup_2026_04_21`, `reference_notion_integration`, `tags`) → alle 3 auflösbar.
- **Aber: Datei-Existenz ≠ Wahrheits-Wert.** Die Mehrheit der referenzierten Pfade zeigt auf **EPHEMER beta-ready/multi-league-phase Snapshots** (2026-04). Cortex-index ist als Routing-Tabelle technisch zu ~95% intakt, **inhaltlich aber zu großen Teilen auf abgeschlossene April-Operationen gerichtet** — es routet zu „wie war Operation Beta Ready" statt zu „wie funktioniert Treasury/Polls (Juni-Realität)". Es kennt KEINEN der Juni-Anker (D80 S7-Plan, D83 Treasury, D86 Polls, Slices 329-332). Funktional intakt, **inhaltlich gedriftet**.

---

## Gesamt-Empfehlung: **Option B — docs/knowledge/ frisch + memory-Baum stilllegen/migrieren**

Mit der Präzisierung: **Hybrid-Stilllegung** (nicht „löschen") — durable Kerne migrieren, Rest in `memory/_archive/` schieben, leere Slots löschen.

**Die 3 stärksten Argumente:**

1. **Das Skelett ist zu ~⅔ leer oder ephemer — Wiederbeleben heißt fast neu bauen.** Von 17 bewerteten Teilbäumen sind **6 leer/JUNK** (`systeme`, `entscheidungen`, `fehler`, `post-mortems`, `improvement-proposals`, `rules-pending` + die 5 leeren `learnings`-Templates) und **6 reine EPHEMER-Halden** (`sprint`, `journals`, `metriken`, `sessions`, Großteil `projekt/`, `senses`). Nur **5 Teilbäume tragen durablen Wert** — und der ist konzentriert in ~10 Files. Die semantisch/episodisch-Zweiteilung wurde nie gelebt (episodisch/entscheidungen+fehler nie befüllt, semantisch/systeme leer). Ein Schema, das seit 2½ Monaten zu ⅔ leer steht, ist totes Gerüst, kein gesunder Baum.

2. **Inhaltlicher Drift ist systematisch, nicht punktuell.** Jeder durable Kern trägt ein „Last Updated 2026-03/04". `cross-domain-map.md` kennt kein Treasury/CSF/Polls. `sprint/current.md` behauptet Pre-Beta-Zustand (heute: LIVE + Treasury-Bau). Kein einziges Unterordner-File kennt die Juni-Anker (D80/D83/D86, Slices 329-332). Wiederbeleben = jedes Gold-File einzeln gegen Juni-Realität neu schreiben + Drift-Mechanik (`updated`/`consult_when`) nachrüsten, die es nie hatte. Der frische `docs/knowledge/`-Baum mit Front-matter-Pflicht (`updated`/`status`/`consult_when`) liefert genau die Anti-Drift-Disziplin, die memory/ strukturell fehlt.

3. **Das Wertvolle ist schon woanders kanonisch.** Die Patterns leben in `.claude/rules/errors-*` (path-scoped Autoload, lebendig gepflegt). Die Decisions in `memory/decisions.md` (D1-D87, aktuell). Die Money-Modelle in `worklog/concepts/*` (D83/D86, Juni). Die memory/-Unterordner sind großteils **redundante April-Kopien** dessen. Ein frischer kuratierter `docs/knowledge/INDEX.md` mit `consult_when` ist die ehrlichere „eine-Wahrheit-ein-Ort"-Lösung als das Wiederbeleben eines Vault, der ohnehin meist auf die heute-lebenden Quellen zeigen müsste.

**Hybrid-Detail (welcher Teil wohin):**
- Migrieren nach `docs/knowledge/domain/`: die durablen Produkt-/Architektur-Kerne (siehe „verloren"-Liste) — neu phrasiert + Front-matter.
- Bleiben wo sie sind (NICHT in docs/knowledge): `.claude/rules/*` (Autoload-Stärke behalten), `memory/decisions.md`, `worklog/concepts/*`, `memory/session-handoff.md` (eigenes „Haus" lt. E0-Plan).
- `cortex-index.md` → wird durch `docs/knowledge/INDEX.md` ersetzt (E0-Plan §6, Klärpunkt 6 der Inventur). cortex zeigt 36/38 auf großteils ephemere Pfade — kein Erhaltungswert als Routing-SSOT.
- `memory/episodisch/*`, `semantisch/sprint`, `senses`, `metriken`, sämtliche `*-phase*`/`*-audit`/beta-Snapshots → nach `_archive/` (nicht löschen, Hermes-Lesson archive-not-delete).
- Leere `.gitkeep`-Slots + leere learnings-Templates + leeres `rules-pending` → ersatzlos löschen (totes Gerüst).

---

## „Was wäre verloren bei Option B (frisch)" — Gold-Files, die migriert werden MÜSSEN

Diese durablen Inhalte dürfen NICHT mit dem Baum stillgelegt werden, ohne nach `docs/knowledge/` gehoben (und gegen Juni-Realität aktualisiert) zu werden:

| Gold-File | Was verloren ginge | Ziel-Bucket (Vorschlag) |
|---|---|---|
| `semantisch/produkt/bescout-product-map.md` | WAS ist beScout / 3 Säulen / Zielgruppen — Kern-Produkt-Doku | `domain/` (oder zusammen mit wiki/bescout-overview konsolidieren) |
| `semantisch/produkt/bescout-vision.md` | WARUM/WOHIN, Differenzierung vs. Socios/FPL (selbst als „historisch" geflaggt → kuratieren) | `domain/` oder `decisions/` |
| `semantisch/produkt/bescout-feature-dependencies.md` | WIE hängt alles zusammen (Feature-Abhängigkeiten) | `domain/` |
| `semantisch/produkt/mogul-mutationsplan.md` (VERTRAULICH) | 18-Monats-Strategie-Fahrplan — Existenz sichern, Vertraulichkeit beachten | `decisions/` (mit `status`-Flag, evtl. außerhalb Repo) |
| `deps/cross-domain-map.md` | Domain-Interaktions-Matrix + Fee-Splits — einzige zentrale Cross-Domain-Sicht (Treasury/Polls ergänzen!) | `domain/` |
| `features/fantasy.md` | 12-Flow Fantasy-Feature-Spec („kein Fantasy-Code ohne diesen Spec") — überlappt mit `.claude/rules/fantasy.md`, Grenze ziehen | `domain/` |
| `semantisch/projekt/missions-architecture.md` | Missions DB-Schema + Club-vs-Global + Race-Safety + TR-i18n | `domain/` |
| `semantisch/projekt/equipment-realtime.md` | Equipment/Inventory/Mystery-Box + Realtime-Mechanik | `domain/` |
| `semantisch/projekt/architecture-3hub.md` | 3-Hub-Architektur (Inventory/Profile/Missions/Home) | `domain/` |
| `semantisch/projekt/bescout-liga.md` | Liga/Rankings-Hub-Konzept (DEFERRED, aber durable) — Dup mit `project_bescout_liga.md`, konsolidieren | `domain/` oder `decisions/` |
| `semantisch/pattern/{rls-cross-user-writes,tier-based-config,slot-composition,db-i18n-schema-extension}.md` | 4 saubere Code-Pattern-Docs — Überlapp mit `.claude/rules/errors-*` prüfen; falls Mehrwert → `lessons/`, sonst in rules mergen | `lessons/` (oder in `.claude/rules/` mergen) |
| `semantisch/personen/anil.md` | Founder-Arbeitsweise (dupliziert MEMORY.md, aber Quelle) | bleibt MEMORY.md-Block / `domain/` |

Alles übrige in den Unterordnern (≈90 Files: Journals, Sessions, Metriken, beta-/phase-/audit-Snapshots, leere Slots) trägt **keinen** durablen Migrations-Wert → archivieren bzw. leere Slots löschen.
