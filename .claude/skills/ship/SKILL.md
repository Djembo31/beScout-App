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
3. **Generiere Spec-Entwurf** in `worklog/specs/NNN-title.md` mit Pflicht-Sektionen (Ziel, Files, ACs, Edge Cases, Proof-Plan, Scope-Out).
4. **Klassifiziere Slice-Groesse** (XS/S/M/L) und **CEO-Scope** (gemaess `memory/ceo-approval-matrix.md`).
5. **Setze `active.md`** per Template (siehe unten) auf `status: active, stage: SPEC`.
6. **Frage Anil** (wenn CEO-Scope ODER Slice-Groesse ≥ M).

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
