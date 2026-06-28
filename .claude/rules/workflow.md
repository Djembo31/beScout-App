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

**Per-Slice vs. Per-Release:** SHIP-Loop ist Per-Slice (`worklog/active.md`). Beta-Launch-READY wäre Per-Release (`worklog/beta-phase.md` + `ship-phase-gate.sh`) — **derzeit pausiert** (Beta abgebrochen D111); „launch-ready" nur bei `last_signoff == PASS`.

**DISTILL** ist kein Slice-Stage, sondern ein **Session-End-Protokoll** — siehe Section am Ende.

---

## §0 — Elite-Prinzipien (Anti-Akkretion) — Slice 432

> **Wurzel-Lehre (Voll-Audit 2026-06-28, Run `wf_82fc04e4-733`, 61 Agents, live-verifiziert):** Über 431 Slices war **„immer anhängen, nie konsolidieren"** die EINE Master-Ursache fast aller Krankheiten — auf Code-, Daten- UND Prozess-Ebene (~50 der 115 Decisions waren PROCESS-Zusätze, fast jeder ADDIERTE → die Optimierungs-Versuche waren selbst Akkretion). Diese 4 Prinzipien sind die Gegenkraft. Sie stehen **ÜBER** der Loop-Mechanik: widerspricht ein Schritt unten ihnen, gewinnen sie. Lebendes Krankheits-/Schuld-Register: `worklog/notes/disease-register.md`.

1. **Die Schnitt-Regel (härteste Regel).** Ein Slice ist NICHT fertig, bis der alte Weg weg ist ODER die Duplikation als bewusste Entscheidung protokolliert ist (D-Eintrag, wie D112 orders/offers). Ein **ungetrackter zweiter Weg = unfertiger Slice.** Gilt für RPC, Service, Component, Tabelle, Spalte, Hook, Tracker, Doc. → DoD-Pflicht (3a), Detektor `audit:dup` (Slice 434, Register-Ratchet; v1 Teilabdeckung: src/lib-Twins format/calc + geheilt-Code/DB-Regression, breiter in v2).
2. **Fertig = gegen die Realität bewiesen, nicht Zeremonie erfüllt.** Proof = live DB / live RPC / live Render / Runtime. „tsc grün" oder „Spec hat 13 Sektionen" ist KEIN „fertig" (am 2026-06-28 fielen 3 statische „gesund"-Behauptungen — i18n-Parität, Wording, Empty-States — erst beim Realitäts-Check). Money/Security-Rigor (Reviewer, Live-`functiondef`, Zero-Sum) bleibt 1:1 — fing real 419b/428.
3. **Ein Job pro Artefakt (SSOT).** Jede Tabelle/RPC/Service/Datei/Tracker hat genau **eine** Aufgabe + **eine** kanonische Quelle. Neuer Bedarf → kanonische Quelle erweitern, NICHT eine zweite daneben bauen.
4. **Subtrahieren ist ein erstklassiger Zug.** Slice-Type **Konsolidierung** ist gleichwertig zu Feature. Das Schuld-Register ist das Signal (Duplikate sichtbar statt verstreut). DISTILL-Frage am Session-Ende: *„Habe ich diese Session einen zweiten Weg erzeugt?"*

**Selbst-Test bei JEDEM Slice (auch an diesem Workflow):** Addiere ich oder konsolidiere ich? Wenn addieren — ist der alte Weg geschlossen ODER protokolliert? Wenn nein: nicht fertig. — Arbeits-Ebene: `memory/feedback_operating_agreement.md`.

---

## Stufen im Detail

### 1. SPEC — Was soll gebaut werden?

**Artefakt:** `worklog/specs/NNN-title.md` (kopiert von `worklog/specs/_TEMPLATE.md`).

**Grundprinzip (Slice 211 D50):** Mit der SPEC steht und fällt alles. Der Agent ist intelligent, aber er ist nicht hellsichtig — die Spec liefert ihm nicht alles vorgekaut, sondern den **Kompass**: was muss er VOR Code lesen, welche Patterns gelten hier, welche Self-Verification-Commands sind relevant, was muss er klären bevor er coded. Eine Spec ohne Code-Reading-Liste ist eine Wunschliste — der Agent wird improvisieren und blindspots verursachen.

**Pflicht-Header (Slice 234 D54):** Spec-Header MUSS `**Slice-Type:** UI | Service | Tool | Hook | GHA | Migration | i18n | Doc` enthalten. Type bestimmt Type-spezifische Definition-of-Done (Section 3a unten). Hook `ship-spec-quality-gate.sh` Layer 3 prüft das WARN-only.

**Pflicht-Sektionen (alle Slice-Größen):**

1. **Problem-Statement** mit Evidence (Screenshot/Audit-Item-Nr/Anil-Quote/Sentry-ID)
2. **Lösungs-Design** (was ändert sich + warum, kurz Architektur)
3. **Betroffene Files** (geschätzt, mit Begründung)
4. **Code-Reading-Liste (Pflicht VOR Implementation)** — File + Zweck + zu prüfende Frage. **D87: Berührt/beschreibt die Slice eine bestehende RPC → Item #1 ist IMMER der Live-`pg_get_functiondef` (nicht die Migrations-Datei), BEVOR das Problem-Statement geschrieben wird.** Sonst Spec + CEO-Präsentation auf veralteter Prämisse (Treasury-Serie: 2× falsche Prämisse aus alten Files).
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

| Größe | Kriterium | Mindest-Pflicht-Sektionen | Code-Reading | Edge-Cases | ACs |
|-------|-----------|---------------------------|--------------|------------|-----|
| XS | 1 File, Pattern-bekannt | 1, 3, 4, 6, 8, 10 (6 von 13) | ≥ 3 Items (Pattern-Source + 1 Reference + 1 Rule) | ≥ 3 | ≥ 3 |
| S | 2-3 Files, klar | 1-13 (alle), Pre-Mortem optional | ≥ 6 Items | ≥ 6 | ≥ 6 |
| M | 3-5 Files, eine Domain | 1-13 (alle) | ≥ 6 Items | ≥ 8 | ≥ 8 |
| L | Cross-Domain oder Schema-Migration | 1-13 + Wave-Plan + Pre-Mortem ≥ 5 | ≥ 10 Items inkl. DB-Schema-Verify per `pg_get_functiondef` | ≥ 10 | alle 11 Categorien |

**Ops/Tooling-Spur (Slice 352 — Zeremonie-Entschlackung):** Slices vom Typ **Hook | GHA | Tool | Doc**, die **kein Money/Security/User-facing-Verhalten** berühren (z.B. Hook-Tweak, Audit-Script, Workflow-Doku), laufen als **XS mit schlanker Zeremonie**: inline-Spec in `active.md` (Problem + Plan, kein eigenes spec-File nötig), **PROVE = Smoke-Output** (Hook-Run / Script-Output), **REVIEW = self-review** (`active.md: review: self-review (Ops, kein Money/Security)`), LOG normal. Sobald Money/Security/Trading berührt → zurück zur vollen Spur (XS/S/M/L + Reviewer-Agent). `**Größe:** XS` bleibt im Header (Hook-Kompatibilität).

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

### 1b. PRE-REVIEW-MEMO (Slice 211 D50, optional)

Bei L-Slices mit ≥3 parallel-Worktrees: vor Reviewer-Dispatch ein `worklog/reviews/NNN-pre-review.md` (~10 Z.) — Self-Audit gegen ACs + Edge-Cases + gelaufene Verify-Commands + offene Blocks + bekannte Risiken/Spec-Drift. Reduziert Reviewer-Arbeit ~60% (Slice 207: Reviewer fokussiert Blindspots statt Voll-Audit). Bei XS/S optional.

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
| **Wissens-Doku** (`docs/knowledge/**`) | ✅ Front-matter komplett (6 Felder) · ✅ INDEX-Zeile mit `consult_when` · ✅ `verified-against` wenn Code beschrieben · ✅ `pnpm audit:knowledge:check` grün (E0-W2gov/D88) |

**Universelle DoD — die Schnitt-Regel (§0, Slice 432):** ZUSÄTZLICH zur Type-Done oben gilt für JEDEN Slice-Type: **kein ungetrackter zweiter Weg.** Ersetzt/erweitert der Slice einen bestehenden Pfad (RPC, Service, Component, Tabelle, Spalte, Hook), ist der alte Pfad im selben Slice gelöscht ODER die bewusste Zwei als D-Eintrag protokolliert. Noch offene Duplikation → Zeile in `worklog/notes/disease-register.md` (sonst gilt sie als unfertig, nicht als „später"). Detektor: `audit:dup` (Slice 434, Register-Ratchet gg. den `dup-registry`-Block in disease-register.md; pre-commit WARN-first).

**Wissens-Kopplung (E0-W2gov/D88):** Ändert ein Service-/RPC-/Migration-Slice eine Domain, zu der ein `docs/knowledge/domain/`-File existiert, ist „Done" erst mit mit-aktualisiertem File (`updated`/`verified-against`) — sonst driftet das Wissen.

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
- **Wissens-Kopplung (E0-W2gov):** Hat der Slice eine Domain geändert, zu der ein `docs/knowledge/domain/`-File existiert? → im SELBEN Slice mit-updaten (`updated` + ggf. `verified-against`). Sonst driftet das Wissen (getrennte Code-/Doku-Änderung = Drift-Ursache). **Hook-enforced seit Slice 351 (D45):** `audit:knowledge:check` (pre-commit, HARD) blockt (a) Content-Change an `docs/knowledge/**.md` ohne `updated:`=heute und (b) INDEX-Decisions-Range != max-D in `decisions.md`. Heißt: neue `D<n>` → INDEX-Range mitziehen; Knowledge-Content ändern → `updated:` heute setzen, sonst blockt der Commit. `verified-against`-Drift bleibt SOFT (nightly).
- **Tracker-Kopplung (Slice 354):** Berührte der Slice einen Epic-/Domain-Scope, der in einem **Sub-Tracker** geführt wird (`worklog/s7-phase3-remaining.md`, `worklog/notes/348-pro-stand-roadmap.md`) ODER ändert den großen Stand → im SELBEN Slice mit-reconcilen (Block abhaken / Stand-Satz). Plus `MASTERPLAN.md` (Stand-Satz) + `TODO.md` (Erledigt/Prio). **Reminder-enforced:** der `.husky/pre-commit` `[TRACKER-RECONCILE]`-Hinweis feuert, sobald ein neuer `## NNN` in `log.md` gestaged ist (non-blocking, weil „welcher Tracker" semantisch ist) — Surface am richtigen Moment statt Memory. Ursache der Stale-Klasse: Sub-Tracker werden von KEINEM anderen Ritual angefasst → driften (348/349-Drift, Slice 354).
- **Stand-SSOT-Regel (Slice 430):** Der **laufende Fortschritt lebt an EINEM Ort: `memory/session-handoff.md`** (Top-Anker). Andere Tracker **referenzieren ihn oder halten 1-Zeilen-/Tabellen-Status — NIE die volle laufende Prosa.** Konkret: `MASTERPLAN.md` = stabiler Plan + Wellen-Status-Tabelle (kein Tages-Status) · `TODO.md` = actionable P0/P1/P2-Bullets (History → log.md) · Auto-`MEMORY.md` = Kurz-Stand + Pointer. Sonst wächst die D111-„von-allem-fünf"-Krankheit auf Meta-Ebene nach (Stand 4-5× dupliziert = Drift + Token). **Guard-enforced (WARN):** `audit:tracker-drift` (`.husky/pre-commit`, non-blocking) flaggt Mega-Zeilen > 1500 Zeichen in den 4 Trackern → lange Append-Zeile in Bullets brechen, Stand in den Handoff.
- `worklog/active.md` zurueck auf `status: idle`

## Gates (architektonisch via Hooks)

Aktive Hooks + Trigger leben in `.claude/settings.json` (SSOT — **keine Kopie hier**, sonst driftet die Liste, §7). Wiring-Check: `pnpm audit:wiring:check`. Kern-Gates die echte Bugs fangen: `ship-spec-gate` (kein Edit auf kritischem Pfad ohne Slice, Exit 2) · `ship-proof-gate` + `ship-cto-review-gate` (kein `feat/fix/refactor`-Commit ohne Proof + Review) · `ship-tool-wiring-gate` (Build-without-Wire) · `ship-meta-plan-block` (Meta-Plan-Stapel) · `safety-guard` (rm -rf / DROP / force-push).

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

## Autonomer BUILD via `/goal`

BUILD kann autonom laufen statt jeden Step zu prompten — Voraussetzung: **verifizierbare, binäre End-Bedingung** (alle ACs erfüllt UND `tsc --noEmit` grün UND `vitest run` grün UND Proof existiert UND `active.md` stage=PROVE). Die SHIP-Hooks (spec-/proof-/review-/wiring-/verify-Gate) wirken während des Runs weiter; `continueOnBlock: true` feedet Rejects zurück → Claude korrigiert statt zu stoppen.

**Wann NICHT:** ACs vage/qualitativ · Cross-Domain (→ `/parallel-dispatch`) · Anil-Entscheidung mid-BUILD nötig · Emergency.

---

## Multi-Slice parallel via `claude agents`

Für 2-3 **unabhängige** Slices parallel, je eigenes Worktree + eigene Claude-Session (`claude agents --add-dir ../wt -b branch "/goal ..."`; Dashboard `claude agents` zeigt RUNNING/BLOCKED/DONE). Max **4** parallel. Bei Dependencies (Slice B braucht A's Service) → sequentiell. Abgrenzung: `/parallel-dispatch` = Sub-Agents in EINER Session; `claude agents` = eigene Sessions, Worktree Pflicht. **Vollständiges Playbook: Skill `ship-agents`.**

---

## DISTILL — Session-End-Protokoll (seit 2026-04-21, siehe `memory/decisions.md` D5)

**Zweck:** Chat-Ausarbeitungen nicht verloren gehen lassen. Strategic Decisions, Architektur-Alternativen und Process-Erfindungen werden am Session-Ende in `memory/decisions.md` extrahiert.

### Wann triggern?

- **Pflicht:** Am Ende jeder Session VOR Stop-Hook.
- **Schnitt-Check (Pflicht, §0/Slice 432):** „Habe ich diese Session einen zweiten Weg erzeugt (neue RPC/Service/Component/Spalte neben einer alten)?" → wenn ja: alten Weg schließen ODER als D-Eintrag/`disease-register.md`-Zeile protokollieren, BEVOR die Session endet.
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
| Durable Domain-/Prozess-Wissen (wie funktioniert X, Markt, Lehre) | `docs/knowledge/{domain,decisions,lessons,research}/` + **Pflicht: Zeile in `docs/knowledge/INDEX.md` mit `consult_when`** | `docs(knowledge): ...` |

**Wissens-Index-Pflicht (E0 W2):** Jedes neue durable Wissen MUSS einen `INDEX.md`-Eintrag mit `consult_when`-Auslöser bekommen — sonst gilt es als verloren (kein Routing = niemand findet es). Beim Update: `updated`-Datum + ggf. `status: superseded` + Nachfolger verlinken. Reine Code-Patterns bleiben in `.claude/rules/` (path-scoped Autoload), brauchen KEINEN INDEX-Eintrag.

### Entry-Format + Anti-Patterns

Pro Entry (Template am Ende von `memory/decisions.md`): `D<n>` (aufsteigend, nie wiederverwendet) · Category (PRODUCT/ARCHITECTURE/PROCESS) · Datum+Status · Entscheidung/Begründung/Auswirkungen/**Alternativen erwogen** · optional Re-Visit-Trigger. Einfügen chronologisch nach ID (nicht anhängen). Commit `docs(decision): D<n> — <title>`. **Anti-Patterns:** alles in 1 Entry stopfen (jede Decision eigenes `D<n>`) · Alternativen weglassen (das „warum nicht anders" ist der halbe Wert) · „schreibe ich später" (Chat-History nach 24h weg → jetzt).

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

### Verification
Beweis je Change-Typ = die **PROVE-Stage-Tabelle oben** (nicht doppeln). Kern-Regel: Playwright IMMER gegen Prod, NIE localhost:
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
3. Neues Pattern → common-errors.md · Merge → tsc+vitest · UI → Playwright gegen bescout.net nach Deploy.

**3 Agent-Gesetze:** Cache-Prefix-Sharing (`SHARED-PREFIX.md`) · nie leere Tool-Arrays · Human-Curated-Context (Agents draften, Menschen promoten). Vollständiges Playbook: `/parallel-dispatch` + `/ship-agents`.

---

# Session-Lifecycle

```
SessionStart → ship-session-start Briefing (Branch, Slice, Stage, tsc, uncommitted)
  ↓  Pending Agent-Worktrees? → MERGE ZUERST
  ↓  memory/session-handoff.md lesen (Resume-Preflight, D81)
Waehrend → PostToolUse-Hooks (vitest-reminder, file-size, gates)
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
