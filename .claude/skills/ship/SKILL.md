---
name: ship
description: Der einzige Master-Workflow fuer BeScout. Fuehrt durch 6-Stufen-Loop (SPEC → IMPACT → BUILD → REVIEW → PROVE → LOG) mit architektonischen Gates. Nutze bei JEDER Code-Aenderung ausser Trivial-Typos. Ersetzt /spec + /deliver als Orchestrator und zwingt Qualitaet statt Audit-Theater.
---

# /ship — BeScout Master Workflow

**Regel 1:** Diese Skill ist der Default-Workflow. Wenn ein Task mehr als 1 File oder mehr als 5 Zeilen Code aendert, laufe den SHIP-Loop.

**Regel 2:** Stages duerfen nicht uebersprungen werden. "Skipped (Grund)" ist erlaubt, weglassen nicht.

**Regel 3:** Jeder Slice endet mit einem Proof-Artefakt in `worklog/proofs/`. Keine Ausnahme.

## Kommandos

### `/ship new "Titel"` — Neuen Slice starten

Was ich dann tue:
1. **Lese `worklog/active.md`**. Wenn `status: idle` → weiter. Sonst: Warnung und frage ob ich den aktuellen pausieren oder schliessen soll.
2. **Zaehle die naechste Slice-ID** aus `worklog/specs/` (z.B. `001`, `002`).
3. **Spec-Boilerplate aus Master-Template** — kopiere `worklog/specs/_TEMPLATE.md` als Start-Point fuer `worklog/specs/NNN-title.md`. Das Template hat alle 13 Pflicht-Sektionen vorkonfiguriert (Slice 211 D50 Standard). Ich entferne nicht-benoetigte Sektionen je Slice-Groesse — XS-Mindest-Pflicht 1, 3, 4, 6, 8, 10 (workflow.md SPEC-Stage). Hook `ship-spec-quality-gate.sh` (Slice 212) WARN-only wenn Pflicht-Sektionen fehlen — Self-Disziplin, kein BLOCK.
4. **Klassifiziere Slice-Groesse** (XS/S/M/L) und **CEO-Scope** (gemaess `memory/ceo-approval-matrix.md`). Slice-Groesse-Header `**Größe:** XS|S|M|L` ist Pflicht damit Hook richtig prueft.
5. **Setze `active.md`** per Template (siehe unten) auf `status: active, stage: SPEC`.
6. **Frage Anil** (wenn CEO-Scope ODER Slice-Groesse ≥ M).

**Pflicht-Sektionen aus _TEMPLATE.md (Slice 211 D50):**
1. Problem-Statement (mit Evidence: Audit-Item / Anil-Quote / Sentry-ID)
2. Lösungs-Design
3. Betroffene Files (Tabelle)
4. **Code-Reading-Liste** — Files Pflicht VOR Code (Mindest XS=3, S/M=6, L=10)
5. **Pattern-References** — relevante existing Patterns/Decisions/Errors mit IDs
6. Acceptance Criteria (executable, mit VERIFY/EXPECTED/FAIL-IF)
7. Edge Cases Table
8. **Self-Verification Commands** — Audit-Cmds Agent kann selbst laufen lassen
9. **Open-Questions** — Pflicht-Klaerung vs Autonom-Zone vs CEO-Zone
10. Proof-Plan
11. Scope-Out
12. Stage-Chain (geplant)
13. Pre-Mortem (Pflicht bei L, optional sonst)

Plus optional Compliance-Check + TR-Wording-Vorab + Open Risiko (bei Money-Path / i18n).

**active.md-Template (SSOT-Form):**
```
# Active Slice

` ` `
status: active
slice: <NNN>
stage: SPEC
spec: worklog/specs/<NNN>-<title>.md
impact: pending
proof: pending
review: pending
` ` `

## Zuletzt

- **Slice <N-1>** (<date>) — <title> (<size>, <verdict>).
- ...

Nächstes: <what's queued or "—">.
```

Beim Fortschreiten im Loop werden Keys gesetzt:
- `impact: skipped (Grund)` wenn nicht anwendbar, sonst Pfad.
- `review: skipped (Grund)` nur bei XS + trivialer Pattern-Wiederholung, sonst Pfad.
- `proof:` MUSS am Ende auf echte Datei zeigen (Proof-Gate prueft).

### `/ship impact` — Impact-Analyse starten

Bei DB/RPC/Service/Cross-Domain:
1. **Grep alle Consumer** der betroffenen Module.
2. **Side-Effects pruefen**: RLS, Caching, Invalidation, Realtime, Query-Keys.
3. **Migration-Plan** falls Schema-Change.
4. **Generiere** `worklog/impact/NNN-title.md`.
5. **Setze `active.md`** auf `stage: IMPACT` → dann `stage: BUILD` wenn klar.

Wenn nicht noetig: `active.md` auf `impact: skipped (Grund)`, direkt `stage: BUILD`.

### `/ship build` — Code-Phase

1. **Pre-Edit-Checks** aus `CLAUDE.md` durchgehen (RPC NULL, CHECK constraints, RLS, Return-Shape, Mobile 393px, Hooks vor Returns, etc.).
2. **Ein File nach dem anderen.** Nach jedem File:
   - `npx tsc --noEmit`
   - `npx vitest run <related-test>` (falls Service/RPC geaendert)
3. **Delegation (>3 Files oder Worktree-isoliert)**:
   - backend-Agent fuer DB/RPC/Service
   - frontend-Agent fuer UI
   - test-writer fuer Tests aus Spec
4. **Nach BUILD** → `/ship review`.

### `/ship goal` — Autonomer BUILD via `/goal` (v2.1.139+)

Wenn BUILD-Stage eine **verifizierbare End-Bedingung** hat, kann ich Claude autonom laufen lassen statt jeden Step zu prompten.

**Wann nutzen:**
- BUILD-Stage just gestartet (`active.md stage: BUILD`)
- Spec hat klare ACs (`AC-NN: [HAPPY] ...`)
- Tests + tsc als Verifikation reichen aus
- Kein offener Architektur-Diskurs mehr

**Wann NICHT nutzen:**
- Spec unklar oder ACs vage
- Slice braucht Anil-Entscheidung mid-BUILD
- Cross-Domain mit Sub-Agent-Dispatch geplant (use `/parallel-dispatch` stattdessen)
- Emergency-Fix (use `/ship emergency`)

**Goal-String-Template (aus aktuellem active.md):**

```text
/goal slice NNN BUILD complete:
  alle ACs aus worklog/specs/NNN-*.md erfüllt
  UND pnpm exec tsc --noEmit grün
  UND CI=true pnpm exec vitest run grün
  UND worklog/proofs/NNN-*.md existiert
  UND active.md stage=PROVE
```

Den konkreten String emittiert das Hook `ship-build-goal-suggest.sh` automatisch bei BUILD-Stage-Übergang (siehe ship-build-goal-suggest in `.claude/hooks/`).

**Was passiert während `/goal`:**
- Claude läuft Red→Green→Refactor→Proof autonom
- Hooks (`ship-spec-gate`, `ship-cto-review-gate`, `ship-proof-gate`, `ship-tool-wiring-gate`, `ship-verify-completeness-gate`) wirken weiter — sie verhindern Drift
- Nach jedem Turn checkt fast-model die End-Bedingung
- Goal löst sich auf wenn alle 5 Conditions hold

**Risiko-Mitigation:**
- ACs müssen verifizierbar sein (binary yes/no), nicht qualitativ
- tsc-fail → ich fixe, Versuch nochmal
- Bei wiederholtem gleichen Error: STOP, melden, nicht endlos retry
- Bei Token-Verbrauch > 80% (capacity): Auto-Handoff laut `feedback_token_management_autonomous`

**Nach `/goal` Ende:**
- `/ship review` startet (Cold-Context-Reviewer)
- Wenn PASS → `/ship prove` → `/ship log`

### `/ship parallel` — Multi-Slice via `claude agents` (v2.1.139+)

Für 2-3 **unabhängige** Slices parallel über separate Worktrees + Claude Sessions.

Siehe Skill `ship-agents` für vollständiges Playbook. Kurzform:

```bash
git worktree add ../bescout-282 -b slice-282-i18n
claude agents --add-dir ../bescout-282 --effort xhigh \
  "/goal slice 282 BUILD complete: ..."
```

Dann `claude agents` Dashboard öffnen → alle Sessions sehen.

**Nicht zu verwechseln mit `/parallel-dispatch`** (Sub-Agents in EINER Session) — siehe `ship-agents`-Skill für die Unterschiede.

### `/ship review` — Cold-Context-Agent prueft (Stage 3b)

Pflicht bei feat/fix/refactor-Slices ab S-Groesse. XS-Ausnahme nur bei trivialer
Pattern-Wiederholung, dann `review: skipped (Grund)` in `active.md`.

1. **reviewer-Agent dispatchen** — Prompt:
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
              - positive-section fuer das was gut ist
              - time-spent"
   })
   ```
2. **Review-File pruefen** — Gate `ship-cto-review-gate` blockt Commits ohne.
3. **Findings adressieren**:
   - REWORK → zurueck zu `/ship build` mit Healer-Agent
   - CONCERNS → MEDIUM+ inline fixen, LOW/NITPICK als Backlog dokumentieren
   - PASS → weiter zu `/ship prove`
4. **Setze `active.md`** auf `review: worklog/reviews/NNN-review.md, stage: PROVE`.

### `/ship prove` — Proof erzeugen

Je nach Change-Typ:
- **Service/RPC** → `npx vitest run <test>` Output nach `worklog/proofs/NNN-test.txt`
- **UI** → Playwright MCP gegen `bescout.net` (`jarvis-qa@bescout.net` / Password in `e2e/mystery-box-qa.spec.ts:5`), Screenshot nach `worklog/proofs/NNN-screenshot.png`
- **DB** → `mcp__supabase__execute_sql` Output nach `worklog/proofs/NNN-query.txt`
- **Security** → `pg_policies` / `pg_proc` Listing nach `.txt`

**Update `active.md`** mit `proof: <pfad>`.

### `/ship done` — Slice abschliessen

1. **Verify Proof existiert** (`active.md` proof-Pfad muss eine echte Datei sein).
2. **git commit** mit aussagekraeftiger Message.
3. **Log-Eintrag** in `worklog/log.md` (neueste oben).
4. Wenn Bug gefixt: neue Regel in `.claude/rules/common-errors.md`.
5. **Reset `active.md`** auf `status: idle`.

### `/ship status` — Wo stehen wir?

Zeige:
- `git log --oneline -5`
- Aktueller Slice (aus `active.md`)
- Letzte 3 Log-Eintraege (aus `log.md`)
- Uncommitted (`git status --short`)
- Offene Worktrees (`git worktree list`)

### `/ship emergency "<Grund>"` — Notbremse

Setzt `active.md` auf `slice: emergency-<timestamp>`, `stage: BUILD`. Spec-Gate und Proof-Gate warnen aber blocken nicht. Nach Fix: nachtraeglich Spec + Proof nachholen, oder als `emergency-fix` in `log.md` markieren.

**Nicht missbrauchen.** Mehr als 2 Emergencies pro Woche → Retrospektive.

## Die Grundregel

**Ich entscheide autonom (CTO):**
- Technische Umsetzung, Patterns, File-Struktur
- Welche Tests, welche Agents, welche Refactors
- i18n DE (TR vor Commit zu Anil)

**Anil entscheidet (CEO):**
- Scope (WAS), Prioritisierung, Business-UX
- Geld, Security, Breaking Changes
- Neue Meta-Prozesse

Border-Case → frage mit 2-3 Optionen + Empfehlung.

## Verweise

- `worklog/active.md` — Single Source of Truth fuer aktuelle Arbeit
- `worklog/log.md` — Historie aller Slices
- `worklog/README.md` — Directory-Reference
- `.claude/rules/workflow.md` — SHIP-Loop Spezifikation
- `memory/ceo-approval-matrix.md` — Rollenaufteilung
- `.claude/rules/common-errors.md` — Pattern-Datenbank
- `CLAUDE.md` — Pre-Edit-Checks, Stack, Top-Regeln
