---
name: Ferrari 10x Upgrade Plan
description: 3-Phasen-Plan fuer File-koordiniertes Agent-Team. Phase 1 Fundament (Verify-Hook, SSOT-Merge, Staleness-Audit, AutoDream-Fix, Commit-Check). Phase 2 Koordination (working-memory.md + agent-queue.md + Briefing v2). Phase 3 Autonom-Loop (Queue-Watcher + Quality-Gate + Circuit-Breaker). Quality First, CEO-Gates bleiben hart.
type: project
status: phase-1-ready
created: 2026-04-16
owner: CTO (Claude) + CEO (Anil)
---

# Ferrari 10x Upgrade — Quality-First Agent-Team

**Mission:** Vom Linear-mit-Parallelität-Workflow zu File-koordiniertem Profi-Team. Ich bleibe Dirigent, Agents stimmen sich ueber Files ab statt ueber mich als Bottleneck. Kein Paperclip-Stil Orchestration-DSL — Files als SSOT.

**Vision:** 9/10 Workflow-Qualitaet. Team bringt volle Power, Evidence vor Claims, Null Kruemel, BeScout zum Marktfuehrer.

**Status:** Phase 1 READY TO START (naechste Session, ~3h fokussiert).

---

## Phase 1 — Fundament: Evidence vor Claims (1 Session, ~3h)

**Ohne Phase 1 ist Phase 2 Sand auf Beton.**

### Bausteine

| # | Baustein | Was konkret | Warum |
|---|----------|-------------|-------|
| 1.1 | Agent-Verify-Hook | PostToolUse-Hook script — liest Agent-Output, extrahiert "Written: X files" Claims, `ls + wc -l`, WARN in conversation wenn empty/missing | Agents luegen systematisch (heute 1x passiert = zu oft) |
| 1.2 | SSOT-Merge | `project_operation_beta_ready.md` (user-memory) wird Pointer → `memory/operation-beta-ready.md` (repo canonical). AutoDream updated nur repo-Version | Zwei SSOTs driften. Heute geschehen |
| 1.3 | Staleness-Audit | `npm run audit:staleness` — parst "Phase X pending" + `status:` Strings, cross-checkt git log + file-existence, flagt Drift. Nightly + pre-session-start | Kein Mensch checkt ob Memory noch stimmt |
| 1.4 | AutoDream raus aus Worktree | Agent-Config anpassen: isolation: worktree → main. Memory-Files sind kein Code, keine Isolation noetig | Edit-Permission-Deadlock (heute 10min verloren) |
| 1.5 | Commit-Knowledge-Check | Pre-commit hook: wenn commit-msg "fix" + common-errors.md nicht mitgeaendert → WARN | Karpathy-Pattern wird verletzt, Lessons sterben im Chat |

### Verify Phase 1 DONE

- [ ] `npm run audit:staleness` → 0 DRIFT (Test: claim "Phase X pending" wenn commit durch ist → wird gefangen)
- [ ] Agent-Verify-Hook catched 1 absichtliches Leer-File im Test
- [ ] AutoDream laeuft 1x komplett durch ohne Main-Claude-Intervention
- [ ] Pre-Commit-Hook WARN bei Fix-Commit ohne common-errors.md update

### Output-Files

- `.claude/hooks/agent-output-verify.sh`
- `scripts/audit/staleness.sh` + `npm run audit:staleness` in package.json
- Update `.claude/settings.json` hook config
- Update `.claude/agents/autodream.md` (isolation field)
- Commits: 1-2 fokussierte Commits, alle tests gruen

---

## Phase 2 — Koordinations-Layer: Agents reden via Files (1 Session, ~3h)

**Das ist wo der Hebel sitzt. Nur starten wenn Phase 1 nach 1 Woche sauber laeuft.**

### 2.1 Working-Memory Pinboard (`memory/working-memory.md`)

Append-only, format-stabil, alle Agents lesen/schreiben:

```markdown
## ACTIVE AGENTS
- backend-A: trading.ts escrow-leak-fix (worktree: wt-backend-a, started: 00:10)
- reviewer: waiting for backend-A completion
- test-writer: tests for trading.ts (worktree: wt-tw-trading, started: 00:10)

## RECENT HANDOFFS (last 10)
- 00:15 backend-A → reviewer: "Fix in wt-backend-a, commit 7a3f2. Please review escrow invariant."
- 00:20 reviewer → healer: "REWORK: line 45 missing null-guard MF-ESC-04"

## CURRENT BLOCKERS (need Anil)
- Item 1.1 Phantom-SC-Cleanup — money-migration approval
- 2 commits unpushed (be3098f, a0b8a5e)
```

**Regel fuer ALLE Agents:** Bei START working-memory.md LESEN. Bei END 1 Zeile an RECENT HANDOFFS anhaengen.

### 2.2 Agent-Queue (`memory/agent-queue.md`)

```markdown
## PENDING
- [ ] test-writer: tests fuer trading.ts:placeBuyOrder (from: backend-A)
- [ ] qa-visual: /market mobile 393px screenshot (from: frontend)

## IN PROGRESS
- [x] reviewer: commit 7a3f2 (started: 00:20)

## COMPLETED (last 10)
- [x] backend-A: DROP alias RPCs (commit be3098f, 00:10)
```

**Agent-Briefing Handoff-Regel:** Bei Completion → APPEND an PENDING was als naechstes laufen soll. Main-Claude liest Queue, dispatched. Handoff-Decision externalized.

### 2.3 Briefing-Template v2 (update aller 9 Agent-Files)

```
## HANDOFF INSTRUCTION (MANDATORY LAST STEP)
Wenn deine Task complete:
1. Write 1-line status to memory/working-memory.md RECENT HANDOFFS
2. Wenn next agent needed: APPEND to memory/agent-queue.md PENDING
3. Format: "- [ ] <agent-type>: <task-description> (from: self)"

Skip dieser Regel = FAIL, auch wenn Code korrekt.
```

### 2.4 Parallel-Default-Regel

Checkliste vor Dispatch:
- Haengt B von A ab? Nein → **parallel**
- Touch same files? Nein → **parallel**
- Separate Worktrees moeglich? Ja → **parallel**

**Parallel ist Default, sequentiell ist Ausnahme mit Grund.**

### 2.5 Background-Default fuer Audits

AutoDream, Staleness-Audit, Compliance-Audit, Impact-Analysis → immer `run_in_background: true`.

### Verify Phase 2 DONE

- [ ] 1 Session mit 3 parallel Agents + File-Handoff laeuft ohne Chat-Eingriff zwischendurch
- [ ] working-memory.md konsistent nach 5 Agent-Runs
- [ ] Agent-Queue wird von Agents selbst gefuellt
- [ ] Parallel-Count pro Session messbar hoeher (Baseline heute: 1-2, Ziel: 3-5)

### Output-Files

- `memory/working-memory.md` (neu, mit Header-Template)
- `memory/agent-queue.md` (neu, mit Header-Template)
- Update aller `.claude/agents/*.md` (9 Files) mit Briefing-Template v2
- Update `CLAUDE.md` "Parallel-Default" Regel
- Commits: 2-3 Commits

---

## Phase 3 — Quasi-Autonome Loops (2 Sessions, ~6h)

**NUR wenn Phase 2 nach 2 Wochen stabil laeuft. Nicht vorher.**

### 3.1 Queue-Watcher Skill (`/queue-run`)

Liest agent-queue.md PENDING, dispatched automatisch, moved zu IN PROGRESS → COMPLETED. Loop bis Queue leer oder Blocker.

### 3.2 Blocker-Protokoll

Agent stoesst auf Unklarheit → schreibt in CURRENT BLOCKERS eine praezise Frage → Queue-Watcher pausiert → eskaliert an Anil mit **einer** Zeile. Anil antwortet → Loop resumed.

### 3.3 Quality-Gate zwischen jedem Completion

Automatisch nach jedem Agent-Completion:
- `npx tsc --noEmit`
- `npm run audit`
- Bei UI-Change: `qa-visual` Agent
- FAIL → Healer automatisch dispatched
- Log: `memory/quality-gate-log.md`

### 3.4 Circuit-Breaker (NON-NEGOTIABLE)

- Max 20 Agent-Dispatches / Session
- Max 80 tool-uses / Agent
- Destruktive Actions (DROP, force-push, reset --hard) **immer** manual
- Money-Migration **immer** CEO-gate
- Blocker-Question eskaliert spaetestens nach 2 Iterationen

### Verify Phase 3 DONE

- [ ] Queue-Watcher laeuft 1 Mini-Journey (3 Steps) komplett autonom durch
- [ ] Blocker-Protokoll funktioniert: Agent stellt Frage, Loop pausiert, ich antworte, Loop resumed
- [ ] Circuit-Breaker schneidet bei kuenstlich-langer Queue ab

---

## Guardrails (gelten in ALLEN Phasen, non-negotiable)

1. **Evidence-First:** Kein "done" ohne verify-command-output. "Sollte passen" ist verboten.
2. **Money-Gate:** jede `apply_migration` auf wallet/ledger/holdings/transactions → CEO-OK vor Apply
3. **Destructive-Gate:** DROP, force-push, reset --hard, rm -rf → CEO-OK
4. **Worktree-Hygiene:** nach Merge → Worktree deleten; orphan worktrees in morning-briefing
5. **Knowledge-Compile-Zwang:** Bug-Fix-Commit ohne common-errors.md-Update → pre-commit WARN
6. **Token-Disziplin:** Jedes Agent-Briefing hat explizites Budget + Verify-Checklist
7. **One-SSOT:** jede Info hat einen Ort. Pointer-Files erlaubt, Copy-Files verboten
8. **Audit-Pflicht vor Beta-Launch:** `npm run audit` + db-invariants alle gruen

---

## CEO-Gates (unveraenderlich)

**Diese Actions IMMER CEO-Approval vor Ausfuehrung:**
- wallet/ledger/holdings/transactions Migrations
- DROP FUNCTION auf Money-RPCs
- Force-push / reset --hard
- Push zu origin (Option: Session-End-Batch-OK)
- Architektur-Lock-Ins (neues Framework, neues MCP-Tool)
- Externe System-Touchpoints (Vercel-Settings, Supabase-Config, Cron-Setups)
- User-Facing Compliance-Wording-Aenderungen

## Approval-Free-Scope (autonom, ohne Nachfrage)

- Read-only DB queries + Audits
- Code-Refactors auf non-Money-Pfaden
- Test-Fixes, i18n-Ergaenzungen, Compliance-Korrekturen
- Memory-File-Updates
- Non-destruktive Migrations auf content-Tabellen (fixtures, events-seed, players)

---

## Was bewusst NICHT gebaut wird (Scope-Disziplin)

- Keine Orchestration-DSL (Paperclip-Falle)
- Kein Monitoring-Dashboard (Terminal + session-handoff reicht)
- Kein Agent-Profiling-Tooling
- Kein Multi-Account-Parallelism
- Keine Custom-Hook-Framework-Erfindung

**Limit:** 2 Koordinations-Files (working-memory + queue), 3 Scripts (verify-hook + staleness-audit + queue-watcher), 1 Skill (/queue-run), 1 Briefing-Template-Update. Maintainable fuer einen Solo-CTO.

---

## Selbsteinschaetzung

Aktuell: ~7/10 Workflow-Qualitaet.

Verlust-Hotspots heute:
- Verification-Gap 2× (Agent-Output + SSOT-Check) = -1
- Ueberlange Briefings (Impact-Analyst: 300 Zeilen Input, 18 tool-uses) = -1
- Non-Parallel wo Parallel ging = -1

Phase 1+2 Ziel: stabil 9/10. Professionelles Dev-Team-Niveau statt Solo-Programmer-mit-Skill-Regal. 10/10 nie — das ist unehrlich.

---

## Timeline

| Phase | Aufwand | Output | Go/No-Go Kriterium |
|-------|---------|--------|---------------------|
| 1 Fundament | 1 Session ~3h | Verify-Hook + SSOT-Merge + Staleness + AutoDream-Fix + Commit-Check | Nach 1 Woche: Verification-Overhead -30% messbar |
| 2 Koordination | 1 Session ~3h | working-memory.md + agent-queue.md + Briefing v2 + Parallel-Default | Nach 2 Wochen: 0 Regression + weniger Roundtrips |
| 3 Autonom-Loop | 2 Sessions ~6h | Queue-Watcher + Quality-Gate-Auto + Circuit-Breaker | NUR wenn Phase 2 stabil |

---

## Naechste Session Start

1. Morning-Briefing lesen
2. Dieses File lesen
3. Phase 1 Baustein 1.1 starten (Agent-Verify-Hook)
4. Nacheinander 1.2 → 1.3 → 1.4 → 1.5 durchziehen
5. Am Ende: Phase 1 Verify-Checklist abhaken, Commit, Session-End

**Kein anderer Fokus in dieser Session.** Phase 1 komplett, sauber, verifiziert.
