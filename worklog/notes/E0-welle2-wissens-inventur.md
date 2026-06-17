# E0 Welle 2 — Wissens-Inventur (Triage)

> **Datum:** `<Datum>`
> **Zweck:** Vor-Sortierung allen verstreuten durable Wissens als Triage-Tabelle. Pro Brocken ein **Vorschlag-Bucket** + Dup-/Überlapp-Flag. **Finale Platzierung + Formulierung entscheiden Anil + CTO gemeinsam** — dies ist nur die Trefferliste.
> **Plan-Quelle:** `worklog/specs/E0-operating-system-knowledge-base.md` (Ziel: `docs/knowledge/{domain,decisions,lessons,research}/` + `INDEX.md` mit `consult_when`).
> **Bucket-Vokabular:** `domain` (wie funktioniert X) · `decisions` (warum) · `lessons` (Bug-Klasse/Anti-Pattern, Produkt-/Prozess-Lehre) · `research` (extern) · `bleibt-rule` (Code-Pattern, path-scoped Autoload, NICHT migrieren) · `stale-raus` (veralteter Tages-Status) · `unklar` (zur gemeinsamen Klärung).

---

## Zähl-Summary (Vorschlag-Bucket)

| Bucket | Anzahl |
|---|---|
| domain | 14 |
| decisions | 31 |
| lessons | 22 |
| research | 13 |
| bleibt-rule | 17 |
| stale-raus | 28 |
| unklar | 13 |
| **Summe Brocken** | **138** |

Aufschlüsselung pro Quelle:
- Quelle 1 (`worklog/concepts/*`, 4 Dateien): 4 domain + research-Anteile (siehe Tabelle).
- Quelle 2 (`memory/decisions.md`, 87 D-Entries D1–D87): 31 decisions + 22 lessons + 34 sonstige (Detail unten; viele PROCESS-D's sind lessons-Kandidaten).
- Quelle 3 (`.claude/rules/*`, 17 Dateien): 17 bleibt-rule (+ 4 lessons-Überlapp-Flags).
- Quelle 4 (`memory/*.md`, 59 Dateien): gemischt, Großteil stale-raus + ein paar reference→domain/decisions.
- Quelle 5 (`wiki/*.md`, 21 Dateien): 13 research + 5 domain + decisions-Anteil.

---

## Quelle 1 — `worklog/concepts/*.md` (4 Dateien, Geld-/Domain-Modelle)

| Brocken (Datei + Kurztitel) | Essenz (1 Zeile) | Vorschlag-Bucket | Dup/Überlapp-Flag | Notiz |
|---|---|---|---|---|
| `csf-club-treasury-model.md` | Scout Card→IPO→CSF→Club-Treasury→Fan-Rewards Geldmodell, §1–10 (Zielbild + IST-Stand + Fan-Reward-Engine) | **domain** | = D83 (decisions) + MEMORY.md „D83 Money-Modell" + `.claude/rules/trading.md` (autoload) | Kanonisches Treasury-Domain-Dokument. D83 ist die Entscheidung, dieses File ist das WIE → domain/treasury. Konsolidieren mit trading.md-Geld-Regeln klären. |
| `polls-engagement-monetization-model.md` | Polls = REIN-Geldkanal, 3 Spuren, Identitätsgrenze, Discovery, soziale Schicht, §1–10 | **domain** | = D86 (decisions) + `memory/project_polls_engagement_model.md` (in MEMORY.md referenziert) | domain/polls. Prüfen ob project_polls_* dasselbe ist (Dup). |
| `reward-ranking-ecosystem.md` | Reward-/Ranking-Geflecht: Welt1 (Plattform belohnt Können), Welt2 (Verein belohnt Treue), Gamification-Schicht; Diagnose + Zielbild-Skizze | **domain** | Überlapp mit `wiki/gamification.md` + `project_bescout_liga.md` + D59/D63 | §5 = „NICHT beschlossen", §6 = offene Produkt-Entscheidungen → teils domain, teils unklar (offene Entscheidungen). |
| `setup-elite-upgrade.md` | Claude-Code-Modernisierung: Research-Distillat Elite-Prinzipien, 5 Achsen, Karpathy-Leitstern, Ausführung 2026-06-17 | **research** | = D84 (decisions) + `reference_claude_setup_2026_04_21.md` | §1 Research-Distillat → research; Ausführungs-Teil ist erledigt (D84) → ggf. stale nach Konsolidierung. |

---

## Quelle 2 — `memory/decisions.md` (D1–D87, je 1 Zeile)

Format: `D<n> CATEGORY: titel`. PRODUCT/ARCHITECTURE → meist `decisions`; viele PROCESS-Entries sind eher **Prozess-Lehren** → `lessons`-Kandidat. **Empfehlung gemeinsam:** decisions.md könnte nach Thema in `decisions/` zerlegt werden ODER als Index-Tabelle bleiben (Plan §4 lässt das offen).

| Brocken (D-Nr + Kurztitel) | Essenz | Vorschlag-Bucket | Dup/Überlapp | Notiz |
|---|---|---|---|---|
| D1 PRODUCT: 7 Ligen launch-ready | Sakaryaspor war nur Hook, alle 7 Ligen gleicher Standard | decisions | = MEMORY.md Key-Facts + feedback_scope_all_leagues | aktiv |
| D2 ARCH: Beta-Metrics via SQL statt PostHog | Metrics-Strategie | decisions | — | |
| D3 PROCESS: Rollback-Drill Pflicht vor Beta | Prozess-Regel | lessons | beta-rollback-runbook.md | |
| D4 PROCESS: Memory-System git=Truth, Obsidian=Lese, Notion=Coord | Memory-Architektur | decisions | reference_notion_integration.md | meta-relevant für E0 |
| D5 PROCESS: DISTILL Session-End-Protokoll | Chat-Ausarbeitungen persistieren | decisions | = workflow.md DISTILL-Sektion | Kern-Prozess; E0 erweitert ihn |
| D6 PRODUCT: Beta-Usability-Test-Format | 30min Zoom × 3 Tester | stale-raus | beta-testplan.md | Beta-Ops abgeschlossen |
| D7 PROCESS: Stale-Reference-Self-Heal | Evidence-Check Pattern | lessons | feedback_verify_before_claiming | |
| D8 PROCESS: Bug-Triage DB-Truth-First | UI-Daten-Anomalie-Debugging | lessons | errors-db.md | |
| D9 PROCESS: Hypothesis-Validation-Before-Slice | Backlog-Items sind Hypothesen | lessons | D10 backlog | |
| D10 PROCESS: Backlog 5 Layer dependency-sortiert | backlog.md-Struktur | stale-raus | backlog.md (stale) | Struktur-Doku eines stale Files |
| D11 ARCH: Supabase Reconcile-Trust-Model | Follow skipt, Unfollow behält | decisions | community.md/errors-db | |
| D12 ARCH: Cron-Completion-Guards DB-Truth | nicht API-Response-Count | lessons | = common-errors.md Cron-Guard + errors-infra | Bug-Klasse → lessons |
| D13 PROCESS: Reviewer-Agent Pflicht-Stage | 6-Stufen-SHIP-Loop | decisions | = workflow.md REVIEW | Kern-Prozess |
| D14 ARCH: TM-Squad-Page-Strategie Player-Sync | Scraper-Ansatz | decisions | errors-scraper | |
| D15 PROCESS: Shell-case command-token-anchorn | Hook-Bug-Klasse | lessons | errors-infra | reine Code-Lehre |
| D16 ARCH: Scraper-null-Policy | always write null statt old-keep | decisions | errors-scraper | |
| D17 ARCH: useSafeMutation Standard-Primitive | Mutation-Pattern | decisions | = patterns.md + ui-components | |
| D18 ARCH: Money-RPC Idempotency-Window | Pflicht-Pattern | decisions | = trading.md + patterns.md | money-kritisch |
| D19 PROCESS: Cron-Route-Registry | route.ts in vercel.json | lessons | errors-infra D19 | |
| D20 ARCH: Query-Cache = SSOT für Server-Daten | Provider nur UI-State | decisions | patterns.md Ferrari | |
| D21 ARCH: Ferrari-Blueprint-Pattern | pgBouncer-safe onSuccess/onSettled | decisions | = patterns.md #28 Ferrari | Kern-Pattern |
| D22 PROCESS: Sub-Slice-Gating Provider-Elim | Foundation→Read→Mutation→Delete | lessons | — | |
| D23 PROCESS: Ferrari-API-Swap getrennte Slices | Slicing-Lehre | lessons | — | |
| D24 PROCESS: Ferrari-Blueprint-Retro | Pattern-Codification complete | stale-raus | D21 | Retro abgeschlossen |
| D25 PROCESS: Knowledge-Flywheel Slice-Chain | Pattern | decisions | = workflow.md Flywheel | meta für E0 |
| D26 PROCESS: Reviewer Scope-Gap-Catcher | Reviewer-Wert bestätigt | lessons | D13/D42/D48 | |
| D27 ARCH: Idempotency-Infra generisch | statt per-RPC inline | decisions | D18/D30 | |
| D28 ARCH: DB-Invariants Trigger+GUC | Bulk-Migration-Opt-In | decisions | D39 (dup-Thema!) | siehe Klärung |
| D29 PROCESS: Autonomous-Marathon CEO-Grant | Arbeitsmodus | stale-raus | feedback_autonomous | einmalig |
| D30 ARCH: useSafeIdempotentMutation Money-Standard | Primitive | decisions | D17/D18/D27 | |
| D31 PROCESS: Auto-gen Files Merge-Marker | nie komplett überschreiben | lessons | — | |
| D32 PROCESS: Bundle-Budget-Gate CI | Size-Regression | decisions | performance.md | |
| D33 PROCESS: common-errors.md Split 40KB-Regel | Doku-Hygiene | lessons | = common-errors.md Navigator | meta für E0 |
| D34 ARCH: Radix UI Headless-Foundation | Dialog/AlertDialog | decisions | ui-components.md | |
| D35 PROCESS: Mechanical-Slices Self-Review | nach 2+ Iterations | lessons | workflow.md REVIEW | |
| D36 PROCESS: Vercel-Deploy-Health-Check | Silent-Build-Fail-Detection | lessons | errors-infra | |
| D37 PROCESS: Re-Audit-Grep vor Deletion | Cleanup-Gap-Catch | lessons | D56/D37 | |
| D38 ARCH: Data-Cleanup via MCP statt Migration | non-schema-changes | decisions | reference_migration_workflow | |
| D39 ARCH: Trigger+GUC Standard Data-Integrity | Invariants | decisions | **D28 (Dup-Thema)** | konsolidieren mit D28 |
| D40 PROCESS: Live-Verify Chrome-DevTools-MCP | statt Hypothesen-Debug | lessons | — | |
| D41 ARCH: Defense-in-Depth Silent-Fails 4-Layer | Standard | decisions | = pattern_observability_stack + common-errors §1 | |
| D42 PROCESS: Reviewer Critical-Findings Pre-Merge | Pflicht | lessons | D13/D26 | |
| D43 ARCH: Type-Truth-Audit Pflicht RPC-Services | Pattern | decisions | errors-db | |
| D44 PROCESS: Remote-Agent Over-Night-Design | neue Modalität | stale-raus | — | einmalig |
| D45 PROCESS: Worktree-Awareness-Briefing Pflicht | Dispatch-Block | lessons | = common-errors §0 Worktree-Escape + parallel-dispatch | |
| D46 PROCESS: Service-Schnittstelle vorab BE+FE | parallel-Dispatch | lessons | parallel-dispatch | |
| D47 PROCESS: Skip-Pattern-Bündelung | Wave-Slice | lessons | — | |
| D48 PROCESS: Reviewer Audit-Stale-Catcher | Already-Fixed-Marker | lessons | D13/D26/D42 | |
| D49 ARCH: SELECT-COLS-Konstanten Sync-Pflicht | mit DbType | decisions | errors-db | |
| D50 PROCESS: Spec-Standard-Pflicht Agent-Context | Spec-Qualität | decisions | = workflow.md SPEC-Sektion | Kern-Prozess |
| D51 PROCESS: Targeted Re-Audit nach Money-UI | Pflicht | lessons | = business.md Slice 224 | |
| D52 PROCESS: Wave-3-Tooling Detection pro Bug-Klasse | Tooling | lessons | D54 | |
| D53 PROCESS: Build-without-Wire verboten, DoD je Type | Definition-of-Done | decisions | = workflow.md §3a | Kern-Prozess |
| D54 PROCESS: Wiring-Drift-Recovery + Detection | Build-without-Wire-Enforce | lessons | D52/D53 | |
| D55 PROCESS: Discipline-Architektur 4-Layer | Pre-Commit/Push/CI/Nightly | decisions | settings.json | |
| D56 PROCESS: Pre-Impl-Replacement-Verification | Cleanup-Slices | lessons | D37 | |
| D57 PROCESS: False-Alarm-Investigation vor Reconcile | Money-Path | lessons | D8 | |
| D58 PROCESS: Wave-Bridge-Cleanup Pflicht | Multi-Wave | lessons | — | |
| D59 PRODUCT: BeScout-Character kein FPL-Klon | Produkt-Identität | decisions | = wiki/bescout-overview + reward-ranking-ecosystem | wichtig domain/decisions |
| D60 PROCESS: Wave-Verify Re-Switch-Flow Pflicht | State-Switch | lessons | — | |
| D61 ARCH: Service-Worker Cache nur-Static | Strategie | decisions | — | |
| D62 PROCESS: Reviewer-VOR-BUILD bei Reverted-Slices | Stage-Reorder | decisions | D65/D67 | |
| D63 PRODUCT: Home-Ultimate-Redesign 5-Phasen | Roadmap kontextueller Hero | unklar | current-product-truth? | Status unklar — gebaut? |
| D64 PROCESS: Multi-Choice-Decisions Spec-Speedup | Spec-Technik | lessons | — | |
| D65 PROCESS: D62 Reviewer-VOR-BUILD Default M+ | Promotion | decisions | D62/D67 | konsolidieren |
| D66 ARCH: Shared-Helper-Extraction-Pattern | F-06 promoted | decisions | patterns.md | |
| D67 PROCESS: D62 ROI nach 7 Slices bestätigt | Empirik 0 Reverts | stale-raus | D62/D65 | reine Bestätigung |
| D68 PROCESS: Beta 3b Tester-Blocker resolved | Phase-D unblocked | stale-raus | beta-* | abgeschlossen |
| D69 PROCESS: Backlog-Sub-Track nächster Slice | nicht „nach Beta" | lessons | — | |
| D70 PROCESS: Cold-Start-Latency Strategic-Track | Slice 279+ | unklar | — | erledigt? offen? |
| D71 PROCESS: Beta-Launch LIVE seit ≤2026-05-06 | Status-Korrektur | stale-raus | project_beta_live | Status-Snapshot |
| D72 ARCH: optimizePackageImports-Lehre | ESM-Libs tree-shaken | lessons | performance.md/D32 | |
| D73 PROCESS: PROVE conditional-render = Cold-Load+DOM | nicht warmer Screenshot | lessons | workflow.md PROVE | |
| D74 ARCH: Auth-Enforcement Single-Source AuthGuard | Pages keine eigene CTA | decisions | errors-frontend | |
| D75 PROCESS: Stabilization-Audit liefert Doc+Ratchet | kein Audit-Theater | decisions | workflow.md Anti-Pattern | |
| D76 ARCH: S7 Source-of-Truth-Harmonisierung | Mock-Erblast → eine Quelle | decisions | = MEMORY.md S7-Plan | aktiv (D80-Route) |
| D77 PROCESS: Registry-Findings gegen Live-Code verifizieren | vor „offen"-Behandlung | lessons | feedback_verify_before_claiming | |
| D78 ARCH: active_gameweek = leagues-Single-Truth | liga-weit + Drift-Skript | decisions | fantasy.md | |
| D79 PROCESS: S7 Phase1 9/9 → P0/P1-Funde zuerst | Priorisierung | stale-raus | D80 | Snapshot, von D80 abgelöst |
| D80 PRODUCT: Sommer 2026 Tiefen-Umbau Tech-First | Wachstum nach hinten | decisions | = MEMORY.md AKTUELLER PLAN | aktiv, strategisch |
| D82 ARCH: DROP-Sicherheits-Sequenz | irreversible Column-Drops Live | lessons | = workflow.md D81-Preflight | money/data-kritisch |
| D83 PRODUCT/ARCH: Money/Reward-Modell konsolidiert | Scout Card→IPO→CSF→Treasury→Fan-Reward | decisions | = `csf-club-treasury-model.md` (domain) + trading.md | Anker-Entscheidung; domain-File ist das WIE |
| D84 PROCESS: Setup-Elite-Upgrade | CLAUDE.md Karpathy, Register=SSOT, Routing | decisions | = `setup-elite-upgrade.md` + CLAUDE.md | meta für E0 |
| D85 PROCESS: SHIP-Workflow-Test Slice 329 | Reviewer „Verdict-first" | lessons | workflow.md | |
| D86 PRODUCT: Polls = Vereins-Geldmaschine REIN | 3 Spuren + Discovery + soziale Schicht | decisions | = `polls-engagement-monetization-model.md` (domain) | Anker-Entscheidung |
| D87 PROCESS: Live-Reality-Check functiondef VOR SPEC | nicht erst vor BUILD | lessons | = workflow.md SPEC #4 | frisch, money/RPC-kritisch |

*(Hinweis: D-Nummern springen — D26 nach D29, D53 nach D54, D59 nach D58, D81 fehlt im decisions.md-Heading-Scan / steht als Preflight in workflow.md. Bei Migration prüfen.)*

---

## Quelle 3 — `.claude/rules/*.md` (17 Dateien)

**Plan-Entscheidung: diese BLEIBEN path-scoped rules, NICHT migrieren.** Geflaggt wird nur der Lessons-Überlapp (wo eine Lehre eigentlich Produkt-/Prozess-Wissen ist → `lessons`-Kandidat) vs. reines Code-Pattern (bleibt rule).

| Brocken (Datei) | Essenz | Vorschlag-Bucket | Dup/Überlapp-Flag | Notiz |
|---|---|---|---|---|
| `workflow.md` | SHIP-Loop + Arbeitsweise + DISTILL + Agent-Dispatch (always-load) | bleibt-rule | enthält D5/D13/D25/D50/D53/D73/D87 (decisions-Quellen) | Prozess-Kanon — bleibt Autoload, aber INDEX sollte darauf zeigen |
| `common-errors.md` | Navigator + Cross-Cutting Silent-Fails (always-load) | bleibt-rule | §1 Silent-Fails = pattern_observability_stack; §0 Worktree = D45 | Cross-cutting Bug-Klassen → **lessons-Kandidat** für §0/§1 (Produkt-übergreifend) |
| `business.md` | Compliance-Wording, Glossar, Fee-Splits, Geofencing (always-load) | bleibt-rule | = wiki/compliance + wiki/business-model | Compliance-Kanon; INDEX-Zeiger sinnvoll |
| `performance.md` | Query-Limits, Rendering, Bundle (always-load) | bleibt-rule | D32/D72 | reines Code-Pattern |
| `errors-db.md` | Supabase/RPC/Cache Bug-Patterns (path-scoped) | bleibt-rule | D8/D12/D43/D49 | reines Code-Pattern → bleibt rule |
| `errors-frontend.md` | React/CSS/Modal/i18n Bug-Patterns | bleibt-rule | D74 | reines Code-Pattern |
| `errors-infra.md` | Build/Deploy/Hooks/Cron Bug-Patterns | bleibt-rule | D15/D19/D36 | **Lessons-Flag:** Cron-Guard-Klasse + Deploy-Health = Prozess-Lehre |
| `errors-scraper.md` | Transfermarkt/API-Football Parsing-Patterns | bleibt-rule | D14/D16 | reines Code-Pattern |
| `database.md` | Columns, CHECK-Werte (path-scoped) | bleibt-rule | — | Referenz, bleibt rule |
| `trading.md` | Money-Regeln, BIGINT cents, Fee-Split | bleibt-rule | = D83 + csf-treasury-model + business.md | **Überlapp-Flag:** Geld-Regel-Dup mit Treasury-domain klären |
| `fantasy.md` | Spieltag/Lineup/Scoring-Regeln | bleibt-rule | D78 + wiki/fantasy-tournaments | reines Domain-Pattern, bleibt rule |
| `community.md` | Social/Follow-Regeln | bleibt-rule | D11 | bleibt rule |
| `gamification.md` | ELO/Tiers/Achievements-Regeln | bleibt-rule | = wiki/gamification + reward-ranking-ecosystem | **Lessons/domain-Flag:** Konzept vs. Code-Regel |
| `club-admin.md` | Admin-Panel-Regeln | bleibt-rule | — | bleibt rule |
| `profile.md` | Profile-Component-Regeln | bleibt-rule | — | bleibt rule |
| `ui-components.md` | Modal/Token/Component-Patterns | bleibt-rule | D17/D34 | bleibt rule |
| `testing.md` | vitest + Playwright-Patterns | bleibt-rule | — | bleibt rule |

---

## Quelle 4 — `memory/*.md` (59 Dateien im Root)

Unterscheidung: **durable reference** (→ ggf. domain/decisions/research) vs. **veralteter Tages-/Beta-Status** (→ stale-raus). Viele `beta-*`, `phase3-*`, `audit_*`, `project_*` sind abgeschlossene Operation-Beta-Ready-Artefakte (Status `complete`/Datum 2026-04).

| Brocken (Datei) | Essenz | Vorschlag-Bucket | Dup/Überlapp | Notiz |
|---|---|---|---|---|
| `MEMORY.md` | Vault-Index (Always-Present) | bleibt (Index) | — | bleibt Memory-Einstieg; INDEX.md ergänzt, ersetzt nicht |
| `decisions.md` | Decisions-Log (Quelle 2) | siehe Quelle 2 | — | Zerlegen-Frage in §4 |
| `patterns.md` | Top-20 Code-Patterns | unklar | = common-errors + ui-components + D-Serie | Dup-Sammlung; lessons oder bleibt-rule? Klärung |
| `failures.md` | Failure-Mode Quick-Lookup | lessons | konsolidiert aus decisions.md | Lehre-Index → lessons |
| `pattern_observability_stack.md` | 3-Tier Silent-Fail-Stack | lessons | = D41 + common-errors §1 | Bug-Klasse → lessons |
| `ceo-approval-matrix.md` | CEO vs CTO Entscheidungs-Grenze | decisions | = workflow.md Rollen | Prozess-Kanon |
| `cortex-index.md` | Routing-Tabelle memory/ | unklar | überlappt mit künftiger INDEX.md | E0 könnte das ersetzen — Klärung |
| `tags.md` | Tag-Glossar Obsidian | bleibt (meta) | — | Vault-Hygiene |
| `_HOME.md` | Obsidian-Landing-Page | bleibt (meta) | — | |
| `agent-briefing-template.md` | Agent-Dispatch-Template | decisions | = workflow.md Briefing-Template | Prozess |
| `ar-counter.md` | AR-Number-Vergabe Audit | stale-raus | — | Audit-Infra, alt |
| `current-product-truth.md` | „Current Product Truth" | unklar | — | Datum prüfen — durable Produkt-Wahrheit oder stale? |
| `feature-map.md` | Frontend-Inventar SSOT | stale-raus | service-map | `complete` 2026-04, vermutlich gedriftet |
| `service-map.md` | Backend-Inventar SSOT | stale-raus | feature-map | 2026-04, gedriftet |
| `user-journeys.md` | 12 Beta-User-Journeys | stale-raus | — | Operation-Beta-Ready-Artefakt |
| `backlog.md` | Dependency-sortierter Backlog | stale-raus | D10 | Stand 2026-04-22 |
| `current-sprint.md` | Sprint 2026-04-26 | stale-raus | — | Tages-Status |
| `working-memory.md` | Pre-compaction 2026-06-13 | stale-raus | — | Snapshot |
| `session-digest.md` | Session-Digest | stale-raus | session-handoff | |
| `session-handoff.md` | Resume/Tages-Status (auto) | bleibt (handoff) | — | Plan: bleibt eigenes „Haus" (lean) |
| `bug-tracker.md` | Phase-2 Bug-Findings | stale-raus | — | 2026-04, complete |
| `errors.md` | Error-Reference | unklar | common-errors/failures | Dup-Verdacht — Inhalt prüfen |
| `research-agent-systems-best-practices.md` | Deep-Research AI-Agent-Systeme (2026-04) | research | überlappt setup-elite-upgrade §1 | research/agent-systems |
| `reference_claude_setup_2026_04_21.md` | Ferrari-Setup-Überblick Slice 085 | stale-raus | = D84/setup-elite-upgrade (neuer) | von 2026-06-17 Setup abgelöst |
| `reference_sentry_memory_mcp_2026_04_21.md` | Sentry+Memory-MCP Aktivierung | reference→research | cto-tools-setup | Setup-Doku, ggf. research/tooling |
| `reference_notion_integration.md` | Notion Source-of-Truth-Split | decisions | = D4 | Prozess-Referenz |
| `cto-tools-setup.md` | Sentry/Vercel/GH/Supabase-Nutzung | research | reference_sentry_* | tooling-research |
| `reference_migration_workflow.md`* | NIE db push, nur apply_migration | lessons | = D38 + errors-db | *(in MEMORY.md gelistet)* Bug-Klasse |
| `pattern_supabase_realtime_rls.md`* | Realtime respektiert RLS | lessons | community.md | *(in MEMORY.md)* |
| `project_bescout_liga.md` | Liga+Rankings-Hub (spec-phase, blocked) | unklar | = reward-ranking-ecosystem + D59 | DEFERRED — durable Konzept oder stale spec? |
| `project_missing_revenue_streams.md` | Unbuilt Revenue-Opportunities (Session 252) | unklar | reward-ranking + polls | durable Backlog oder stale? |
| `project_polls_engagement_model.md`* | Polls-Modell (in MEMORY.md, D86) | domain | = `polls-engagement-monetization-model.md` (Dup!) | *(in MEMORY.md referenziert)* zwei Polls-Docs konsolidieren |
| `operation-beta-ready.md` | Beta-Quality-Sweep SSOT | stale-raus | alle beta-*/phase3-* | abgeschlossen |
| `beta-cost-budget.md` | Beta-Kosten-Check | stale-raus | — | |
| `beta-exit-criteria.md` | Go/Extend/Abort-Kriterien | stale-raus | — | abgeschlossen |
| `beta-onboarding.md` | Tester-Onboarding DE+TR | stale-raus | — | |
| `beta-rollback-runbook.md` | Vercel-Rollback-Runbook | research | D3 | **Behalten als runbook?** ggf. research/ops |
| `beta-sentry-alerts-runbook.md` | Sentry-Alert-Rules-Runbook | research | — | runbook — ggf. behalten |
| `beta-test-results.md` | Phase-3b Ergebnisse | stale-raus | — | |
| `beta-tester-list.md` / `.template.md` | Tester-Liste | stale-raus | — | |
| `beta-tester-recruitment-templates.md` | Recruitment DE+TR | stale-raus | — | |
| `beta-testing-runbook.md` | Phase-3b-Runbook | stale-raus | — | |
| `beta-testplan.md` | Phase-3b-Testplan | stale-raus | D6 | |
| `beta-tr-locale-findings.md` | TR-Locale-Findings 2026-04-21 | stale-raus | — | |
| `tr-review-queue.md` | TR-String-Review-Queue | bleibt (queue) | feedback_tr_i18n | aktiver Workflow-Puffer |
| `user-feedback-queue.md` | User-Feedback-Queue | bleibt (queue) | — | aktiver Puffer |
| `phase3-compliance-audit.md` | Phase-3 Compliance-Audit | stale-raus | business.md/wiki/compliance | |
| `phase3-db-audit.md` | Phase-3 DB-Audit (214 RPCs) | stale-raus | — | 2026-04 |
| `phase3-i18n-audit.md` | i18n-Coverage-Audit | stale-raus | — | |
| `phase3-performance-audit.md` | Performance-Audit | stale-raus | performance.md | |
| `audit-high-risk-rpcs-2026-04-15.md` | Money-RPC-Security-Audit | stale-raus | — | complete |
| `audit_multi_league_backend_20260415.md` | Multi-League BE-Audit | stale-raus | — | complete |
| `audit_multi_league_frontend_20260415.md` | Multi-League FE-Audit | stale-raus | — | complete |
| `impact_multi_league_backend_20260415.md` | Multi-League Impact | stale-raus | — | complete |
| `phase-1.3-impact-map.md` | RPC DPC→SC Sanitize Impact | stale-raus | — | awaiting-approval 2026-04, erledigt |
| `data-integrity-deep-dive-2026-04-18.md` | Player/Club-Daten-Integrität | stale-raus | — | 2026-04 snapshot |
| `polish-sweep.md` | Polish-Sweep Final-Touch | stale-raus | project_polish_sweep | done |
| `pre-launch-checklist.md` | Pilot-Start-Checklist | stale-raus | — | |
| `wiki-index.md` | Wiki-Index (auto-gen) | bleibt (meta) | wiki/index.md (Dup!) | auto-generiert |
| `wiki-lint-report.md` | Wiki-Lint-Checklist | bleibt (meta) | — | Hygiene-Tool |
| `wiki-log.md` | Wiki-Log append-only | bleibt (meta) | wiki/log.md (Dup!) | |

*Mit \* markierte Files stehen in MEMORY.md, im Root-Glob aber unter anderem Namen/Pfad — bei Migration Existenz prüfen.*

---

## Quelle 5 — `wiki/*.md` (21 Dateien, Produkt-Wiki)

Wiki ist bereits frontmatter-getaggt (`type: research|decision|competitor|comparison|feedback`). Mapping: `competitor`/`comparison`/`research` → `research`; Produkt-Mechanik → `domain`; `decision` → `decisions`.

| Brocken (Datei) | Essenz | Vorschlag-Bucket | Dup/Überlapp | Notiz |
|---|---|---|---|---|
| `bescout-overview.md` | Produktübersicht, Value-Prop, Positionierung | domain | = D59 + reward-ranking | Kern-Produkt-Doku |
| `business-model.md` | Revenue/Fees/Licensing/Treasury/Pricing-Asset | decisions | = business.md + D83 + decision_pricing_asset | Überlapp Fee-Splits |
| `compliance.md` | MiCA/CASP/MGA/Wording/Geofencing | decisions | = business.md (Dup!) | Compliance — wo Kanon? rule oder wiki? |
| `scout-cards.md` | Scout Cards: Trading/IPO/Floor/Liquidation | domain | = D83 + trading.md + csf-treasury | Produkt-Mechanik |
| `equipment-system.md` | Equipment/Mystery-Box/Scoring-Boost | domain | gamification.md | Feature-Mechanik |
| `fantasy-tournaments.md` | Fantasy Lineups/Scoring/Events/Chips | domain | fantasy.md + D78 | Feature-Mechanik |
| `gamification.md` | ELO/Tiers/Achievements/Missions/Streaks | domain | = gamification.md (rule) + reward-ranking + D59 | Konzept vs. Code-Regel |
| `product-roadmap.md` | Roadmap & Gaps, ungebaut, Prioritäten | unklar | backlog + project_missing_revenue | aktuell (updated 2026-04-21) oder stale? |
| `scout-launch-strategie.md` | $SCOUT-Token-Launch (Malta/MiCA/Founding) | decisions | decision_pilot_token_strategy | „vertraulich"-Tag; Phase-3-Strategie |
| `comunio.md` | Competitor: Fantasy DACH Marktwert | research | — | competitor |
| `kickbase.md` | Competitor: Fantasy Bundesliga DFL | research | — | competitor |
| `sorare.md` | Competitor: Fantasy NFT Trading | research | — | competitor |
| `socios-chiliz.md` | Competitor: Fan-Token Blockchain | research | — | competitor |
| `fancraze.md` | Competitor: NFT Cricket Collectibles | research | — | competitor |
| `hattrick.md` | Competitor: Manager-Sim Langzeit | research | — | competitor |
| `onefootball.md` | Competitor: Content/Media/Streaming | research | — | competitor |
| `vergleich-competitors.md` | Competitor-Vergleichsmatrix | research | — | comparison |
| `early-feedback-freundeskreis.md` | Early-Adopter-Feedback/Demand-Signal | research | — | feedback-validation |
| `index.md` | Wiki-Index | bleibt (meta) | wiki-index.md (Dup) | |
| `log.md` | Wiki-Log | bleibt (meta) | wiki-log.md (Dup) | |
| `SCHEMA.md` | Wiki-Schema-Definition | bleibt (meta) | — | Frontmatter-Konvention |

---

## ⚠️ Zur gemeinsamen Klärung (die wertvollen Diskussionspunkte)

1. **Treasury-Geld-Modell: 3 Orte für dieselbe Wahrheit.** `csf-club-treasury-model.md` (domain-Konzept) + D83 (decisions) + `.claude/rules/trading.md` (autoload Code-Regel) + `wiki/scout-cards.md`/`business-model.md`. → Wer ist Kanon? Vorschlag: domain/treasury = WIE, D83 bleibt decisions = WARUM, trading.md bleibt schlanke Code-Regel mit Zeiger. Aber: Doppel-Pflege-Risiko bei Geld-Zahlen.

2. **Polls: zwei fast identische Konzept-Docs.** `worklog/concepts/polls-engagement-monetization-model.md` UND `memory/project_polls_engagement_model.md` (beide in MEMORY.md/D86 referenziert). → Konsolidieren zu EINEM domain/polls; welches ist die Wahrheit?

3. **D28 vs. D39 — Dup-Entscheidung.** Beide „DB-Invariants via Trigger+GUC". Bei decisions-Migration zusammenführen (D39 supersedet D28?).

4. **D62/D65/D67 — Reviewer-VOR-BUILD Triple.** Drei D's zum selben Prozess (Einführung → Promotion → ROI-Bestätigung). → 1 decisions-Eintrag mit Evolution, D67 (reine Empirik) ggf. stale.

5. **`patterns.md` vs. `common-errors.md` vs. D-Serie — Pattern-Dreifachung.** patterns.md ist eine Kopie-Sammlung aus common-errors + ui-components + Decisions. Plan §6 will klare Grenze rule↔lessons. → patterns.md auflösen (Inhalte sind schon in rules) oder als lessons-Index behalten?

6. **`cortex-index.md` vs. neue `INDEX.md`.** cortex-index ist bereits eine „WO liegt Wissen"-Routing-Tabelle, gelesen bei jedem Session-Start. Die neue `docs/knowledge/INDEX.md` (mit consult_when) überlappt funktional. → INDEX.md ersetzt cortex-index? Oder cortex zeigt nur noch auf memory/, INDEX auf docs/knowledge/?

7. **Compliance-Kanon: `business.md` (rule) vs. `wiki/compliance.md` (decision).** Wording-Glossar & Fee-Splits stehen in beiden. → business.md ist always-load Autoload (bleibt), wiki/compliance research-Hintergrund? Grenze ziehen.

8. **`gamification.md` rule vs. `wiki/gamification.md` vs. `reward-ranking-ecosystem.md`.** Drei Schichten desselben Themas (Code-Regel / Produkt-Wiki / Konzept-Landkarte). → domain/gamification konsolidieren, rule schlank halten.

9. **„project_"-Files: durable Konzept oder stale spec?** `project_bescout_liga.md` (DEFERRED, spec-phase), `project_missing_revenue_streams.md` (Session 252), `wiki/product-roadmap.md`. → Welche sind noch aktive Roadmap-Wahrheit (→ domain/roadmap), welche stale?

10. **`current-product-truth.md` — durable oder gedriftet?** Name suggeriert Kanon, aber Erstell-/Update-Datum prüfen. Wenn aktuell → domain/produkt-truth; wenn 2026-04 → stale.

11. **Beta-Runbooks behalten?** `beta-rollback-runbook.md` + `beta-sentry-alerts-runbook.md` sind Ops-Runbooks (wiederverwendbar bei jedem Deploy), nicht reiner Beta-Status. → research/ops behalten statt stale-raus? Rest der `beta-*` (28 Files) klar stale.

12. **`reference_claude_setup_2026_04_21.md` vs. `setup-elite-upgrade.md`/D84.** Älteres Setup-Doku (Slice 085) von neuerem (2026-06-17) abgelöst. → Altes stale-raus, Research-Distillat aus setup-elite §1 → research/claude-code-capabilities.

13. **errors-* Lessons-Überlapp (Plan §6 Kernfrage).** `common-errors.md §0 Worktree-Escape` + `§1 Silent-Fails` + `errors-infra Cron-Guard/Deploy-Health` sind cross-cutting **Prozess-/Bug-Klassen-Lehren**, keine domain-spezifischen Code-Patterns. → Diese 3-4 nach `lessons/` heben (mit Zeiger aus der rule)? Reine Code-Patterns (errors-db/-frontend/-scraper Detail) bleiben rule.

---
*Inventur-Ende. Migration/Löschung erfolgt NICHT in diesem Schritt — nur Triage-Vorschlag.*
