# BeScout Workflow — der SHIP-Loop

**Eine Aufgabe. Sechs Stufen pro Slice. Plus DISTILL am Session-Ende.**

## Der Loop

```
TASK  →  SPEC  →  IMPACT  →  BUILD  →  REVIEW  →  PROVE  →  LOG  →  next
                                                                    │
                                                     (Session-End)  ▼
                                                                 DISTILL → memory/decisions.md
```

Jeder Slice durchlaeuft alle 6 Stufen. Was nicht zutrifft wird explizit als `skipped (Grund)` markiert — nicht weggelassen.

**REVIEW** ist Pflicht nach BUILD bei feat/fix/refactor-Slices. Cold-Context-Reviewer-Agent fängt Blindspots die Primary-Claude nicht sieht (Self-Assessment-Gap 2026-04-22). Hook `ship-cto-review-gate` blockt Commits ohne `worklog/reviews/<slice>-review.md`.

**Beta-READY-Phase (Slice 214 D50 Wave 2):** SHIP-Loop ist Per-Slice. Beta-Launch-READY ist Per-Release. Beide haben separate Phase-Tracker:
- Per-Slice: `worklog/active.md` (status/stage/spec/proof/review).
- Per-Release: `worklog/beta-phase.md` (phase A/B/C/D/READY + last_signoff + findings_open).
- "Beta-fertig" / "launch-ready" sind nur erlaubt wenn `worklog/beta-phase.md.last_signoff == PASS`. Hook `ship-phase-gate.sh` warnt sonst.
- Master-Orchestrator: `/auto-beta-ready` Skill.

**DISTILL** ist kein Slice-Stage, sondern ein **Session-End-Protokoll** — siehe Section am Ende.

## Stufen im Detail

### 1. SPEC — Was soll gebaut werden?

**Artefakt:** `worklog/specs/NNN-title.md` (kopiert von `worklog/specs/_TEMPLATE.md`).

**Grundprinzip (Slice 211 D50):** Mit der SPEC steht und fällt alles. Der Agent ist intelligent, aber er ist nicht hellsichtig — die Spec liefert ihm nicht alles vorgekaut, sondern den **Kompass**: was muss er VOR Code lesen, welche Patterns gelten hier, welche Self-Verification-Commands sind relevant, was muss er klären bevor er coded. Eine Spec ohne Code-Reading-Liste ist eine Wunschliste — der Agent wird improvisieren und blindspots verursachen.

**Pflicht-Header (Slice 234 D54):** Spec-Header MUSS `**Slice-Type:** UI | Service | Tool | Hook | GHA | Migration | i18n | Doc` enthalten. Type bestimmt Type-spezifische Definition-of-Done (Section 3a unten). Hook `ship-spec-quality-gate.sh` Layer 3 prüft das WARN-only.

**Pflicht-Sektionen (alle Slice-Größen):**

1. **Problem-Statement** mit Evidence (Screenshot/Audit-Item-Nr/Anil-Quote/Sentry-ID)
2. **Lösungs-Design** (was ändert sich + warum, kurz Architektur)
3. **Betroffene Files** (geschätzt, mit Begründung)
4. **Code-Reading-Liste (Pflicht VOR Implementation)** — File + Zweck + zu prüfende Frage
5. **Pattern-References** — relevante existing Patterns/Decisions/Common-Errors mit IDs
6. **Acceptance Criteria** (executable, nicht prosa)
7. **Edge Cases Table** (systematisch enumerieren, nicht raten)
8. **Self-Verification Commands** (was kann Agent/ich post-Implementation laufen lassen)
9. **Open-Questions** (Pflicht-Klärung vs. Autonom-Zone für Agent)
10. **Proof-Plan** (welches Artefakt beweist?)
11. **Scope-Out** (was ist explizit NICHT drin)
12. **Stage-Chain (geplant)** mit Skip-Begründungen
13. **Pre-Mortem** (5+ Szenarien, bei L-Slice Pflicht)

**Slice-Größen-spezifische Mindest-Anforderungen:**

### Resume-/Handoff-Preflight für L-Slices (D81, 2026-06-15)

Vor jedem L-Slice oder nach einer Claude/Hermes/Handoff-Session gilt: **nicht direkt BUILD starten**. Erst Repo-Realität gegen Handoff/Worklog abgleichen:

```bash
git status --short --branch
git log --oneline -8
```

Pflichtchecks vor SPEC/BUILD:
- Aktueller HEAD vs. letzter echter Feature/RPC-Slice nennen. Handoff-only Commits sind Continuity, keine technische Baseline.
- `worklog/active.md` muss den letzten Slice eindeutig als DONE oder in-progress zeigen; Wording wie "in Arbeit" bei DONE-Slices korrigieren.
- `worklog/log.md` ist hilfreich, aber nicht alleinige Current-State-Quelle: wenn Chronologie driftet, `git log` + `active.md` + `memory/session-handoff.md` priorisieren.
- Untracked Audit-Churn (`worklog/audits/{audit-stale,type-truth,wiring}-*.md`) nicht versehentlich committen.
- Bei String→UUID/Source-of-Truth-Migrationen: unknown/nullable Mapping-Pfade fail-closed machen oder als bewusstes Edge im Spec aufnehmen; kein neuer soft-null Drift.
- Bei L-Slice mit DROP: Pre-Drop-grep muss `src/`, `scripts/`, `messages/`, `.claude/rules/`, `worklog/` abdecken; erst DROP, wenn Runtime-Reader/Writer komplett umgestellt sind.

**Aktueller Anker:** Vor Slice 326 zuerst `worklog/notes/326-preflight-hermes-review.md` lesen.

| Größe | Kriterium | Mindest-Pflicht-Sektionen | Code-Reading | Edge-Cases | ACs |
|-------|-----------|---------------------------|--------------|------------|-----|
| XS | 1 File, Pattern-bekannt | 1, 3, 4, 6, 8, 10 (6 von 13) | ≥ 3 Items (Pattern-Source + 1 Reference + 1 Rule) | ≥ 3 | ≥ 3 |
| S | 2-3 Files, klar | 1-13 (alle), Pre-Mortem optional | ≥ 6 Items | ≥ 6 | ≥ 6 |
| M | 3-5 Files, eine Domain | 1-13 (alle) | ≥ 6 Items | ≥ 8 | ≥ 8 |
| L | Cross-Domain oder Schema-Migration | 1-13 + Wave-Plan + Pre-Mortem ≥ 5 | ≥ 10 Items inkl. DB-Schema-Verify per `pg_get_functiondef` | ≥ 10 | alle 11 Categorien |

**Gate:** CEO-Approval (wenn CEO-Scope laut `memory/ceo-approval-matrix.md`) ODER Claude setzt `S-Slice: true` für triviale Fälle.

**Spec-Quality-Selbstcheck vor Anil-Approval (Slice 211):**
- [ ] Code-Reading-Liste hat ≥ Mindest-Items für Slice-Größe?
- [ ] Pattern-References sind ECHT relevant (kein copy-paste-aller-38-Patterns)?
- [ ] ACs sind executable mit konkretem VERIFY-Command, nicht prosa?
- [ ] Edge-Cases enumerieren systematisch (null/0/empty/timeout/concurrent/stale)?
- [ ] Self-Verification-Commands laufen wirklich (kein Typo, korrekte Pfade)?
- [ ] Open-Questions trennen Pflicht-Klärung von Autonom-Zone?
- [ ] Money-Path/Wording? Compliance-Check + TR-Wording-Vorab in Spec?

**Architektonisches Enforcement (Slice 212 Wave 2):**
- Hook `ship-spec-quality-gate.sh` (PreToolUse Edit/Write) WARNT wenn Spec Pflicht-Sektionen je Slice-Größe fehlen — kein BLOCK, nur Hinweis.
- Hook ist aktiv waehrend Stage in {BUILD, REVIEW, PROVE}. Skipped bei Stage SPEC (Spec wird gerade geschrieben), LOG, idle, emergency-Slice, sowie meta-File-Edits (worklog/, memory/, .claude/).
- Slice-Größen-Header `**Größe:** XS|S|M|L` in der Spec ist pflicht damit Hook richtig pruefen kann. Default S wenn nicht detektiert.

**Anti-Pattern (Slice 211 codifiziert):**
- "Spec hat nur Ziel + Files + ACs" → Agent läuft blind in bekannte Fallen.
- "Pattern-References = alle 38 aus patterns.md" → Noise, Agent ignoriert.
- "Self-Verification = `tsc clean`" → reicht nicht, braucht Slice-spezifisch grep/sql/screenshot.
- "Open-Questions weglassen" → Agent autonomisiert über Money-Path-Decisions.

### 1b. PRE-REVIEW-MEMO Pattern (Slice 211 D50, optional aber empfohlen)

**Artefakt:** `worklog/reviews/NNN-pre-review.md` (vom Agent oder mir geschrieben VOR Reviewer-Dispatch).

**Inhalt (~10-15 Zeilen):**
- Self-Audit gegen die in Spec definierten ACs (welche grün, welche teils, welche nicht)
- Self-Audit Edge-Cases (welche getestet, welche nicht)
- Self-Verification-Commands gelaufen + Output-Snippet
- Open-Blocks (was ich nicht klären konnte, wo Reviewer schauen muss)
- Bekannte Risiken (z.B. "Ich habe Catmull-Rom durch Linear ersetzt — Spec-Drift, dokumentiert in active.md")

**Wirkung:** Reduziert Reviewer-Arbeit ~60% laut Slice 207-Erfahrung — Reviewer kann sich auf Blindspots konzentrieren statt komplettes Audit zu wiederholen.

**Wann Pflicht?** Bei L-Slices mit parallel-Dispatch ≥ 3 Worktrees. Bei XS/S optional.

### 2. IMPACT — Was wird mitbetroffen?

**Artefakt:** `worklog/impact/NNN-title.md` ODER in active.md als `impact: skipped (Grund)`.

**Pflicht wenn Slice beruehrt:**
- `supabase/migrations/` (Schema-Change, RPC, RLS)
- `src/lib/services/*` (Service-Layer)
- `src/lib/queries/*` (Query-Keys)
- `src/types/*` (Typen die in 3+ Files genutzt werden)
- Cross-Domain (zwei fachlich unabhaengige Bereiche)

**Inhalt:**
- Consumer-Liste (grep-verifiziert, nicht geraten)
- Side-Effects (RLS, Caching, Invalidation, Realtime)
- Migration-Plan (falls Schema)
- Rueckwaerts-Kompatibilitaet (falls Contract-Change)

**Tool:** `/impact` Skill ODER Impact-Analyst-Agent.

### 3. BUILD — Code schreiben

**Regeln:**
- Ein File nach dem anderen
- Nach jedem File: `npx tsc --noEmit` + betroffene Tests
- Bestehende Patterns nutzen (grep statt neu erfinden)
- Pre-Edit-Checks laut `CLAUDE.md` durchgehen (RPC NULL, CHECK constraints, RLS, Return-Shape, Mobile 393px, Hooks vor Returns, etc.)

**Agents:**
- \>3 Files oder Worktree-isoliert → backend/frontend-Agent
- DB-Migration → backend-Agent (Worktree)
- Tests aus Spec → test-writer-Agent

**Gate:** tsc clean + Tests gruen.

### 3a. Definition-of-Done je Slice-Type (Slice 233 D53)

Slice ist **nicht fertig** mit "Code geschrieben + Tests grün". Je nach Type ist das letzte 20% (Verkabelung) Pflicht-Teil des Slices, nicht Future-Slice.

| Slice-Type | "Done" heisst |
|-----------|---------------|
| **UI-Component** | ✅ in 1+ Page-Render-Tree importiert · ✅ visual auf bescout.net post-Deploy · ✅ Mobile 393px verifiziert |
| **Service / RPC** | ✅ in 1+ Hook/Query verwendet · ✅ vitest + tsc green · ✅ Idempotent wenn Money-Path |
| **Tool / Script** (`scripts/audit-*.ts`, `scripts/*.sh`) | ✅ in `package.json` als pnpm-Script · ✅ aufgerufen in mind. 1 Trigger (GHA-workflow ODER Vercel-Cron ODER `.claude/hooks/` ODER post-commit-hook) · ✅ Failure-Handling definiert (Auto-Issue / WARN / BLOCK) |
| **Hook** (`.claude/hooks/*.sh`) | ✅ in `.claude/settings.json` registriert · ✅ Trigger (Pre/Post-Tool, Stop, SessionStart) korrekt · ✅ silent bei Standard-Fall, klare Message bei Edge-Case |
| **GHA-Workflow** (`.github/workflows/*.yml`) | ✅ YAML-Lint-clean · ✅ permissions explizit · ✅ Live-Run nach push verifiziert · ✅ Failure-Path (Auto-Issue) erprobt |
| **DB-Migration** | ✅ via `mcp__supabase__apply_migration` applied · ✅ `pg_get_functiondef`-Verify · ✅ RLS-Policies komplett (SELECT+INSERT+UPDATE+DELETE) |
| **i18n-Strings** | ✅ DE + TR · ✅ business.md-konform · ✅ Anil-Pflicht-Review markiert |

**Anti-Pattern (Build-without-Wire — Slice 233 D53):**
> "Tool gebaut + Smokes PASS + Slice closed → Future-Slice 233+ verkabelt." Wenn ein Slice ein Tool baut und nicht verkabelt, ist Slice **nicht fertig** — egal wie grün die Smokes.

**Beispiel (Recovery in Slice 233):** Slice 223 (audit:stale), 228 (audit:orphan), 229 (audit:type-truth) bauten 3 Tools, 0 verkabelt. Slice 233 holt Verkabelung in 1 GHA-Workflow nach. Kosten: 3 Tage Sichtbarkeits-Latenz.

**Detection (Pre-Commit-Pflicht ab Slice 235+):** `scripts/wiring-check.ts` fängt orphan-Scripts wie der `orphan-component-detector.ts` orphan-Components fängt.

### 3b. REVIEW — Cold-Context-Agent prueft

**Artefakt:** `worklog/reviews/NNN-review.md`

**Pflicht** bei feat/fix/refactor-Slices ab S-Groesse. Ausnahme XS wenn triviale Pattern-Wiederholung und active.md `review: skipped (Grund)`.

**Dispatch-Template:**
```
Agent({
  subagent_type: "reviewer",
  description: "Review Slice NNN",
  prompt: "Lies worklog/specs/NNN-*.md und git diff fuer Slice NNN.
           Pruefe gegen .claude/rules/common-errors.md, memory/patterns.md,
           business.md. Read-only.

           Schreibe nach worklog/reviews/NNN-review.md:
           - verdict: PASS | REWORK | FAIL
           - findings: [{severity, location, issue, fix}]
           - time-spent: <minutes>"
})
```

**Gate:** Review-File exists + verdict != FAIL. REWORK → Healer-Agent fixt vor Commit.

**Hook:** `ship-cto-review-gate` blockt `feat(/fix(/refactor(`-Commits ohne Review-File.

**Wichtig (Session 2026-04-24-Lehre):** Reviewer-Agent ist READ-ONLY (Tools: Read/Grep/Glob). Der Agent liefert den Review-Markdown als Text-Output zurueck. **Primary-Claude MUSS die Review-Datei `worklog/reviews/NNN-review.md` via Write-Tool persistieren** — kopiert den Markdown aus der Agent-Response. Der `ship-cto-review-gate`-Hook pruft File-Existence, nicht Content. Primary-Claude kann auch eigene Self-Reviews schreiben bei XS-Slices mit Pattern-Wiederholung (active.md `review: self-review (Grund)`).

### 4. PROVE — Beweise dass es funktioniert

**Artefakt:** `worklog/proofs/NNN-title.*`

**Pflicht je Change-Typ:**

| Change-Typ | Proof |
|------------|-------|
| Service / RPC | `npx vitest run <test-file>` Output als `.txt` |
| UI-Change | Playwright-Screenshot gegen `bescout.net` (via `jarvis-qa@bescout.net`) als `.png` |
| DB-Schema | `SELECT` Query mit echtem Ergebnis als `.txt` |
| Security | Grant/RLS-Listing via `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'` als `.txt` |
| Bug-Fix | Vorher/Nachher-Vergleich (Screenshot oder Log) als `.png`/`.txt` |
| Refactor ohne Behavior-Change | Tests gruen + `git diff --stat` Output |

**Verboten als Proof:**
- *"sollte passen"*
- *"tsc clean"* allein
- *"Pattern ist wie anderswo"*

**tsc clean ist Voraussetzung, kein Proof.**

### 5. LOG — Abschluss

**Artefakt:** Eintrag in `worklog/log.md`, Format:

```
## NNN | YYYY-MM-DD | Titel
- Stage-Chain: SPEC → IMPACT → BUILD → REVIEW → PROVE → LOG
- Files: <git diff --stat summary>
- Review: worklog/reviews/NNN-review.md
- Proof: worklog/proofs/NNN-xxx.png
- Commit: <hash>
- Notes: (optional, 1-2 Saetze)
```

**Pflicht:**
- Git-Commit mit aussagekraeftiger Message
- Wenn Bug gefixt: neue Regel in `.claude/rules/common-errors.md`
- `worklog/active.md` zurueck auf `status: idle`

## Gates (architektonisch via Hooks)

| Hook | Trigger | Wirkung |
|------|---------|---------|
| `ship-session-start.sh` | SessionStart | 5-Zeilen-Briefing: Branch, Slice, Stage, tsc, uncommitted |
| `ship-spec-gate.sh` | PreToolUse Edit auf kritischen Pfaden | Blockt ohne aktiven Slice (Exit 2) |
| `ship-post-service.sh` | PostToolUse Edit auf `src/lib/services/` | Triggert vitest, Output im Kontext |
| `ship-proof-gate.sh` | PreToolUse Bash `git commit` | Blockt `fix(`/`feat(`-Commits ohne Proof |
| `ship-status-gate.sh` | UserPromptSubmit mit "fertig\|status\|stand" | Injiziert git log + active.md |
| `ship-no-audit-slice.sh` | Stop | Markiert Audit-only Slices (kein git diff) als `invalid` |
| `ship-meta-plan-block.sh` | PreToolUse Write auf `memory/project_*.md` | Blockt neue Meta-Plaene |
| `ship-cto-review-gate.sh` | PreToolUse Bash `git commit` | Blockt `feat(/fix(/refactor(`-Commits ohne `worklog/reviews/<slice>-review.md` |

## Rollenverteilung

Siehe `memory/ceo-approval-matrix.md` fuer vollstaendige Liste.

Kern:
- **Anil (CEO)**: WAS gebaut wird, Geld-Flows, Security, Business-UX, TR-i18n vor Commit, neue Meta-Prozesse
- **Claude (CTO)**: WIE gebaut wird, Patterns, Agents, Tests, Refactors ohne Scope-Change, interne Tools

## Anti-Patterns (was wir NICHT mehr machen)

1. **Audit als Slice** — "Slice 3: geprueft, ist ok, gelb". Audit ist Vorarbeit, kein Fortschritt.
2. **Meta-Plan-Stapel** — mehrere parallele Projekt-Plaene. Nur EIN aktiver.
3. **Morning-Briefing-Marathon** — 10 Minuten Lesen vor Code. SessionStart ist 30 Sekunden.
4. **Stale-Status uebernehmen** — Zahlen ohne Verifizierung. Jede Status-Behauptung braucht eine Query/git-Ausgabe.
5. **Proof-Skip** — "tsc clean, sollte passen". Ohne Screenshot/Query/Test kein DONE.
6. **Scope-Creep** — "und gleich noch das fixen". Neues Problem → neuer Slice.
7. **Claude macht Business-Entscheidung** — Fee-Split gesetzt, Scope erweitert, Feature ersetzt. Immer CEO.

## Notbremse

Wenn Anil sagt: **"Notfall, einfach fixen"**:
- `/ship emergency "<Grund>"` — setzt active.md auf `slice: emergency`, `stage: BUILD`
- Spec-Gate und Proof-Gate warnen aber blocken nicht
- Nach dem Fix: nachtraeglich Spec + Proof nachholen ODER bewusst als `emergency-fix` loggen

Nicht missbrauchen. Wenn der Anti-Pattern-Count in einer Woche > 2 ist: Retrospektive.

---

## Autonomer BUILD via `/goal` (seit Claude Code v2.1.139)

BUILD-Stage kann **autonom** laufen statt jeden Step zu prompten. Voraussetzung: verifizierbare End-Bedingung.

### Pattern

Hook `ship-build-goal-suggest.sh` emittiert beim BUILD-Stage-Übergang einen Vorschlag:

```text
/goal slice NNN BUILD complete:
  alle ACs aus worklog/specs/NNN-*.md erfüllt
  UND pnpm exec tsc --noEmit grün
  UND CI=true pnpm exec vitest run grün
  UND worklog/proofs/NNN-*.md existiert
  UND active.md stage=PROVE
```

Claude läuft Red→Green→Refactor→Proof autonom. Fast-Model checkt nach jedem Turn ob Bedingung hält. Goal löst sich auf wenn ja.

### Wann NICHT

- ACs vage oder qualitativ statt binary
- Cross-Domain → `/parallel-dispatch` besser
- Anil-Entscheidung mid-BUILD nötig
- Emergency-Fix

### Sicherheits-Net

Die SHIP-Hooks (`spec-gate`, `cto-review-gate`, `proof-gate`, `tool-wiring-gate`, `verify-completeness-gate`) wirken **während** des autonomen Runs weiter und verhindern Drift. `continueOnBlock: true` auf PostToolUse-Hooks (seit 2026-05-28) feedet Hook-Reject zurück, sodass Claude direkt korrigiert statt zu stoppen.

---

## Multi-Slice parallel via `claude agents` (seit v2.1.139)

Für 2-3 **unabhängige** Slices parallel. Jeder Slice in eigenem Worktree mit eigener Claude Code Session.

### Dispatch

```bash
# Worktree pro Slice
git worktree add ../bescout-282 -b slice-282-i18n
git worktree add ../bescout-283 -b slice-283-bug-fix

# Pro Worktree: claude agents mit /goal
claude agents --add-dir ../bescout-282 --effort xhigh \
  "/goal slice 282 BUILD complete: ..."
```

### Dashboard

```bash
claude agents
```

Zeigt alle Sessions: RUNNING / BLOCKED ON YOU / DONE. Attach mit Pfeil-Rechts, Liste mit Pfeil-Links.

### Hard Limit

Max 4 parallele Slices. Mehr = Anil verliert Überblick. Bei dependencies (Slice B braucht Slice A's Service) **nicht** parallel — sequentiell.

### Unterschied zu `/parallel-dispatch`

| | `/parallel-dispatch` | `claude agents` |
|---|---|---|
| Scope | Sub-Agents in EINER Session | EIGENE Sessions parallel |
| Tool | `Agent` (Task) | `claude agents` CLI |
| Worktree | Optional | Pflicht |

Vollständiges Playbook: Skill `ship-agents`.

---

## DISTILL — Session-End-Protokoll (seit 2026-04-21, siehe `memory/decisions.md` D5)

**Zweck:** Chat-Ausarbeitungen nicht verloren gehen lassen. Strategic Decisions, Architektur-Alternativen und Process-Erfindungen werden am Session-Ende in `memory/decisions.md` extrahiert.

### Wann triggern?

- **Pflicht:** Am Ende jeder Session VOR Stop-Hook.
- **Optional:** Nach jedem Slice (wenn Scope es rechtfertigt).
- **Trigger-Phrasen in Chat, die einen Entry erzwingen:**
  - „ist nicht mehr...", „ab jetzt...", „neu...", „Scope-Change..."
  - „wir entscheiden uns für...", „lieber A als B weil..."
  - „muss jede Session so gemacht werden", „neuer Prozess..."
  - „unabhängig davon..." → oft Strategic-Redirect

### Was extrahieren?

| Art | Wohin | Commit-Prefix |
|-----|-------|---------------|
| Strategic (Scope, Markt, Zielgruppe) | `memory/decisions.md` Category PRODUCT | `docs(decision): D<n> — ...` |
| Architektur mit Alternativen-Abwägung | `memory/decisions.md` Category ARCHITECTURE | `docs(decision): D<n> — ...` |
| Process-Erfindung (Workflow, Regel, Checkliste) | `memory/decisions.md` Category PROCESS | `docs(decision): D<n> — ...` |
| Code-Pattern (Bug-Klasse, Fix-Template) | `.claude/rules/common-errors.md` | `docs(learning): ...` |
| Business-Wording (Compliance) | `.claude/rules/business.md` | `docs(compliance): ...` |

### Pflicht-Sektionen im decisions.md-Entry

Siehe Template in `memory/decisions.md` am Ende. Mindestens:
- ID (D<n>, aufsteigend, nie wiederverwendet)
- Category (PRODUCT | ARCHITECTURE | PROCESS)
- Datum + Status (Aktiv/Trial/Verworfen/Superseded)
- Entscheidung, Begründung, Auswirkungen, **Alternativen erwogen**, optional Re-Visit-Trigger

### Beispiel-Ausführung

Am Ende einer Session:
1. Chat rückwärts scannen: Welche Ausarbeitungen gab es?
2. Für jede: passt in PRODUCT / ARCHITECTURE / PROCESS?
3. Nächste freie `D<n>`-ID nehmen
4. Entry in `memory/decisions.md` einfügen (nicht anhängen — chronologisch aufsteigend nach ID)
5. Commit: `docs(decision): D<n> — <title>` (Plural bei mehreren: `docs(decisions): D<a>-D<b> — ...`)

### Anti-Patterns

1. **„Ist doch in der Chat-History"** — nein, die ist nach 24h weg.
2. **„Schreibe ich später rein"** — später heißt nie. Am Session-End jetzt.
3. **Alles in 1 Entry stopfen** — jede Decision eigenes D<n>, sonst untrennbar.
4. **Alternativen weglassen** — die „warum nicht anders"-Info ist der halbe Wert.

---

# Arbeitsweise (How I Work)

Spec-Driven. Code lesen, nicht annehmen. Fertig heisst fertig — keine Restarbeit.
*(konsolidiert aus ehemals `workflow-reference.md`, 2026-06-17 Setup-Upgrade)*

### Vor Code schreiben
- Betroffene Files + deren Consumers identifizieren (grep).
- Bestehende Patterns im Codebase finden (grep/read) — nutzen > neu schreiben.
- DB/RPC/Service-Aenderung → `/impact` zuerst.
- Library-Frage → `context7` MCP (Training-Cutoff driftet).
- „required → optional" = Data-Contract-Change → ERST alle Consumer greppen.

### Verification (Beweis je Change-Typ — siehe PROVE-Stage)
| Aenderung | Beweis |
|-----------|--------|
| Jede | `tsc --noEmit` clean (Voraussetzung, kein Proof) |
| Logik/Service | Betroffene Tests gruen |
| UI | Playwright gegen bescout.net (nach Deploy) — NICHT localhost |
| DB/RPC | SELECT mit echten Daten |
| i18n | DE + TR verifiziert |

Playwright laeuft gegen Prod, nicht localhost:
```bash
PLAYWRIGHT_BASE_URL=https://bescout.net npx playwright test      # Full Suite
QA_BASE_URL=https://bescout.net npx tsx e2e/qa-polish.ts --path=/ --slug=home
```

### Prinzipien (operativ — ergaenzen die 4 Karpathy-Leitsterne in CLAUDE.md)
1. Code lesen, nicht annehmen. Jede Hypothese verifizieren.
2. Einfachste Loesung zuerst. 1 Feature bewegen < 8 Komponenten bauen.
3. Exakt was gefragt. Kein Bonus-Refactoring, kein Scope-Creep.
4. 2x gescheitert → STOP. Andere Hypothese (`/competing-hypotheses`).
5. Messen vor optimieren. Keine Perf-Aenderung ohne Baseline.
6. Fertig = verifiziert. „tsc clean" / „sollte passen" ist KEIN Beweis.

### Knowledge-Flywheel
```
Arbeit → Wissen → LEARNINGS.md + common-errors.md
  ↑                                          ↓
  └── Naechster Agent laedt LEARNINGS.md ←───┘
```
Bug gefixt → Pattern SOFORT in `.claude/rules/common-errors.md` (errors-*.md bei Domain-Spezifik), kein Draft. Komplexe Analyse → `memory/semantisch/projekt/`.

---

# Agent-Dispatch (Orchestrator-Protokoll)

**Meine Rolle:** CTO & Orchestrator. Ich denke, plane, delegiere. Agents sind ein Elite-Team — jeder denkt selbst und liefert produktionsreif. Verfuegbare Agent-Typen liefert das **Agent-Tool** (SSOT), nicht eine Liste hier — sonst driftet sie.

### Briefing-Template (jeder Dispatch)
```
KONTEXT: [Was Anil will + warum + Business-Hintergrund]
ZIEL:    [Konkretes Ergebnis, nicht Schritte]
CONSTRAINTS: [Mobile 393px, i18n DE+TR, Patterns]
DU ENTSCHEIDEST: [Autonom-Zone des Agents]
VERIFY:  [Wie der Agent seinen Output selbst prueft]
WICHTIG: Lies deine LEARNINGS.md VOR dem Arbeiten.
```
NIEMALS „editiere Zeile 45 in File X" (Micromanagement). IMMER Ziel + Autonom-Zone + Verify.

### Dispatch-Entscheidung
| Situation | Aktion |
|-----------|--------|
| Quick Fix <3 Files | Selbst |
| Feature 3+ Files, eine Domain | 1 Agent (backend ODER frontend) |
| Feature 3+ Files, cross-domain | Parallel: backend + frontend (+ test-writer) in Worktrees |
| DB/RPC-Aenderung | `/impact` ZUERST, dann Agent |
| Nach Implementation | Reviewer-Agent (PFLICHT — auch bei „identischem Pattern") |
| Reviewer findet Issues | Healer-Agent |
| Geld/Trading/Security | SELBST (zu kritisch fuer Delegation) |

### After-Action (nach JEDEM Agent-Ergebnis)
1. Output verifizieren: `git diff --stat` im Worktree — kein Vertrauen auf Behauptungen.
2. Review-Agent (PFLICHT) → `worklog/reviews/NNN-review.md` persistieren.
3. Neues Pattern → LEARNINGS.md / common-errors.md.
4. Merge → tsc + vitest auf merged Code.
5. UI → Playwright gegen bescout.net nach Deploy.

Vollstaendiges Playbook: `/parallel-dispatch` Skill. Multi-Session-Parallelitaet: `/ship-agents`.

### 3 Gesetze (Agent-Architektur)
1. Cache-Prefix-Sharing: `SHARED-PREFIX.md` = gemeinsamer Prefix aller Agents.
2. Nie leere Tool-Arrays: jeder Agent hat explizite Tools.
3. Human-Curated Context Only: Agents schreiben Drafts, Menschen promoten.

---

# Session-Lifecycle

```
SessionStart → ship-session-start Briefing (Branch, Slice, Stage, tsc, uncommitted)
  ↓  Pending Agent-Worktrees? → MERGE ZUERST
  ↓  memory/session-handoff.md lesen (Resume-Preflight, D81)
Waehrend → PostToolUse-Hooks (lint, test-reminder, gates)
Stop → session-handoff-auto (Worktrees + Changes + Commits)
StopFailure → crash-recovery (Diff-Backup + Handoff-Append)
```

**Session-Start-Checkliste:** (1) Briefing lesen → (2) handoff lesen → (3) Pending Worktrees mergen → (4) dann erst neue Arbeit.

### Tooling-Register = SSOTs, keine Kopien (2026-06-17 Anti-Drift)
Hardcoded Listen von Hooks/Skills/Agents/MCPs driften (Grund fuer die alten 28/22/9-Falschstaende). Quelle der Wahrheit:
- **Hooks** → `.claude/settings.json`. Wiring-Check: `pnpm audit:wiring:check`.
- **Skills** → Skill-Tool (Laufzeit-Liste) / `.claude/skills/`.
- **Agents** → Agent-Tool (Laufzeit-Liste) / `.claude/agents/`.
- **MCPs (Projekt)** → `.mcp.json`. Weitere MCPs sind user-/session-level verbunden.
