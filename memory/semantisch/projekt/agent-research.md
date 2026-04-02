# Deep Research: AI Agent Systems Best Practices (April 2026)

> Research fuer Agent Workflow v2. Fokus auf praktische Patterns fuer Claude Code.
> Recherche-Datum: 2026-04-02

---

## ZUSAMMENFASSUNG

6 Forschungsbereiche, 24 konkrete Patterns identifiziert.
Davon **8 Must-Haves** die sofort umsetzbar sind, **10 Nice-to-Haves** mit mittlerem Aufwand,
und **6 Langfrist-Patterns** die tiefere Architektur-Aenderungen benoetigen.

**Wichtigste Erkenntnis:** BeScout hat bereits ein ueberdurchschnittlich fortgeschrittenes
Setup (Hooks, Skills, Memory-Files, Quality Gates). Die groessten Luecken liegen bei:
1. Automatische Fehler-zu-Regel-Pipeline (manuell → automatisch)
2. Agent Teams (native Claude Feature, noch nicht aktiviert)
3. Metriken/Observability (kein Tracking von Agent-Erfolgsraten)
4. Stop-Hook als Agent-Hook (aktuell nur Command-basiert)

---

## 1. SELBSTLERNENDE AGENTS

### Pattern 1.1: Learnings.md pro Skill
| Feld | Wert |
|------|------|
| **Was es loest** | Skills vergessen Session-Wissen. Jede Session faengt bei Null an. |
| **Wie implementieren** | Jeder Skill bekommt eine `Learnings.md` neben seiner `SKILL.md`. Skill-Prompt enthaelt: "Lies Learnings.md VOR Task-Start. Schreibe neue Erkenntnisse NACH Task-Ende." Format: `**[Datum] — [Task-Typ]** / Observation / Action / Confidence`. |
| **Fuer BeScout** | `/deliver`, `/cto-review`, `/impact` bekommen jeweils eigene Learnings.md. CLAUDE.md bekommt Meta-Regel: "Skills MUESSEN ihre Learnings.md lesen und schreiben." |
| **Prioritaet** | **MUST-HAVE** |
| **Aufwand** | Gering (1-2h Setup, dann automatisch) |
| **Quelle** | MindStudio Learnings Loop, claude-reflect |

### Pattern 1.2: claude-reflect (Hook-basierte Fehlererfassung)
| Feld | Wert |
|------|------|
| **Was es loest** | Korrekturen ("nein, nimm X statt Y") gehen verloren wenn man sie nicht manuell dokumentiert. |
| **Wie implementieren** | Hook auf `UserPromptSubmit` erkennt Korrektur-Patterns (Regex: "nein", "eigentlich", "nicht so", "stattdessen"). Queued als JSON in `~/.claude/learnings-queue.json`. Manueller Review via `/reflect` Skill. Approved → sync zu CLAUDE.md/common-errors.md. |
| **Fuer BeScout** | Adaptierung: Statt externes Plugin eigene Hook-Implementierung. Queue in `.claude/learnings-queue.json`. Reflection-Skill `/reflect` als neuer Skill. Sync-Target: `common-errors.md` (nicht CLAUDE.md direkt). |
| **Prioritaet** | NICE-TO-HAVE (inject-learnings.sh existiert bereits als Basis) |
| **Aufwand** | Mittel (4-6h fuer Hook + Skill + Queue-Logic) |
| **Quelle** | github.com/BayramAnnakov/claude-reflect |

### Pattern 1.3: Reflection.md nach jedem Task (Post-Task Introspection)
| Feld | Wert |
|------|------|
| **Was es loest** | Agents schliessen Tasks ab ohne zu reflektieren was gut/schlecht lief. Fehler wiederholen sich. |
| **Wie implementieren** | Stop-Hook oder Skill-Epilog schreibt nach jedem Task: (1) Was lief gut? (2) Was ueberraschte mich? (3) Ein Pattern fuer AGENTS.md. (4) Ein Verbesserungsvorschlag fuer den Prompt. Session-retro.sh existiert bereits, aber nur git-basiert — muss um AI-Reflexion erweitert werden. |
| **Fuer BeScout** | `session-retro.sh` von Command-Hook zu Agent-Hook upgraden. Agent analysiert Diff + Commits + Fehler und schreibt strukturiertes Retro. |
| **Prioritaet** | NICE-TO-HAVE |
| **Aufwand** | Mittel (Agent-Hook ist teurer als Command-Hook, Timeout-Tuning noetig) |
| **Quelle** | Addy Osmani Code Agent Orchestra, claude-meta |

### Pattern 1.4: Meta-Rules (Regeln ueber Regeln)
| Feld | Wert |
|------|------|
| **Was es loest** | CLAUDE.md waechst unkontrolliert. Neue Eintraege widersprechen alten. Qualitaet sinkt. |
| **Wie implementieren** | CLAUDE.md bekommt einen "Meta" Block: "Wenn du neue Regeln hinzufuegst: (1) Pruefe auf Duplikate, (2) Konsolidiere aehnliche Eintraege, (3) Loesche veraltete, (4) Halte Format konsistent." |
| **Fuer BeScout** | Bereits teilweise vorhanden (Compaction-Regeln). Erweitern um explizite Meta-Rules fuer common-errors.md Updates. |
| **Prioritaet** | NICE-TO-HAVE |
| **Aufwand** | Gering (30min CLAUDE.md Edit) |
| **Quelle** | github.com/aviadr1/claude-meta |

---

## 2. KOLLEKTIVES ARBEITEN

### Pattern 2.1: Native Agent Teams (Claude Code Feature)
| Feld | Wert |
|------|------|
| **Was es loest** | Paperclip-Agents haben keinen nativen Kontext-Austausch. Koordination ist manuell. |
| **Wie implementieren** | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json. Team Lead (Jarvis) spawnt Teammates mit spezifischen Rollen. Shared Task List mit Dependencies. Peer-to-Peer Messaging. File Locking. |
| **Fuer BeScout** | Ersetzt Paperclip fuer direkte Sessions. Paperclip bleibt fuer Background/Scheduled Tasks. Agent Teams fuer Tier 3-4 Tasks mit 3-5 Teammates (Frontend, Backend, QA, Reviewer). Plan-Approval Modus fuer riskante Tasks. |
| **Prioritaet** | **MUST-HAVE** |
| **Aufwand** | Mittel (Setup 2h, Workflow-Anpassung 4-6h) |
| **Quelle** | code.claude.com/docs/en/agent-teams |

### Pattern 2.2: Subagent Definitions fuer Rollen
| Feld | Wert |
|------|------|
| **Was es loest** | Jeder Agent muss von Grund auf gebrieft werden. Kein Rollen-Reuse. |
| **Wie implementieren** | `.claude/agents/` Definitionen mit festen Rollen: `frontend-engineer.md`, `backend-engineer.md`, `security-reviewer.md`, `qa-tester.md`. Jeder mit spezifischem System-Prompt, Tool-Set und Model. Werden sowohl als Subagents als auch als Agent-Team Teammates verwendet. |
| **Fuer BeScout** | Konvertierung der bestehenden Paperclip Agent-Definitionen in native `.claude/agents/` Files. Jeder Agent laedt relevante Rules automatisch. |
| **Prioritaet** | **MUST-HAVE** |
| **Aufwand** | Mittel (3-4h fuer 5-6 Agent-Definitionen) |
| **Quelle** | code.claude.com/docs/en/sub-agents, Agent Teams Docs |

### Pattern 2.3: Review-Chain (Build → Review → Feedback Loop)
| Feld | Wert |
|------|------|
| **Was es loest** | Agent A baut, keiner reviewed. Bugs kommen erst bei manuellem Review raus. |
| **Wie implementieren** | Agent Teams Pattern: Implementer-Teammate baut. Reviewer-Teammate (read-only, Opus 4.6) reviewt nach Task-Completion. `TaskCompleted` Hook triggert automatisch Review. Bei Rejection: Task zurueck an Implementer mit Feedback. |
| **Fuer BeScout** | `/cto-review` Skill als Reviewer-Agent-Definition nutzen. Agent Team: 1 Lead + 1-2 Implementer + 1 Reviewer. Reviewer hat nur Read/Grep/Glob Tools. |
| **Prioritaet** | **MUST-HAVE** |
| **Aufwand** | Mittel (4-6h inkl. Hook + Agent Definition) |
| **Quelle** | Addy Osmani, Agent Teams Best Practices |

### Pattern 2.4: Competing Hypotheses Pattern
| Feld | Wert |
|------|------|
| **Was es loest** | Bei Debugging fokussiert ein Agent auf eine Hypothese und verfolgt sie blind. |
| **Wie implementieren** | Fuer Debugging-Tasks: 3-5 Teammates spawnen, jeder mit anderer Hypothese. Explizite Anweisung: "Versuche die Hypothesen der anderen zu widerlegen." Lead synthetisiert Ergebnisse. |
| **Fuer BeScout** | Nutzbar fuer schwierige Bugs (3x gescheitert → statt Eskalation erst Competing Hypotheses). Ersetzt teilweise den Circuit Breaker. |
| **Prioritaet** | NICE-TO-HAVE |
| **Aufwand** | Gering (Prompt-Pattern, kein Code noetig) |
| **Quelle** | Agent Teams Docs — Use Case Examples |

---

## 3. PROAKTIVE AGENTS

### Pattern 3.1: Proactive Scan (Pattern-Erkennung im Code)
| Feld | Wert |
|------|------|
| **Was es loest** | Probleme werden erst gefunden wenn sie auftreten, nicht vorher. |
| **Wie implementieren** | Scheduled Agent (Cron oder manuell) scannt Code gegen bekannte Anti-Patterns aus common-errors.md. Generiert Issue-Vorschlaege. Nutzt grep/glob systematisch. |
| **Fuer BeScout** | CLS Proactive Scan existiert bereits (v1.3). Erweiterung: Scan gegen ALLE common-errors.md Patterns, nicht nur Constitution. Output: priorisierte Issue-Liste. |
| **Prioritaet** | NICE-TO-HAVE (existiert bereits teilweise) |
| **Aufwand** | Gering (Scan-Prompts erweitern) |
| **Quelle** | Beam AI Self-Learning Agents, eigene CLS |

### Pattern 3.2: "Wenn ich X sehe, schlage ich Y vor" — Trigger-Rules
| Feld | Wert |
|------|------|
| **Was es loest** | Agent arbeitet Task ab ohne Kontext-bewusste Verbesserungen vorzuschlagen. |
| **Wie implementieren** | CLAUDE.md Block: "Proaktive Regeln: Wenn du in einer Datei >400 Zeilen arbeitest → schlage Refactoring vor. Wenn du >3 useState in einem Component siehst → schlage useReducer vor. Wenn ein Service keine Error-Handling hat → melde es." Diese Regeln feuern waehrend normaler Arbeit, nicht als separater Scan. |
| **Fuer BeScout** | Passt perfekt zum bestehenden CLAUDE.md Modell. 10-15 Trigger-Rules basierend auf haeufigsten errors.md Eintraegen. |
| **Prioritaet** | **MUST-HAVE** |
| **Aufwand** | Gering (1h CLAUDE.md + common-errors.md Erweiterung) |
| **Quelle** | Predictive AI Agent Patterns, eigene Erfahrung |

### Pattern 3.3: Workflow-Improvement Proposals
| Feld | Wert |
|------|------|
| **Was es loest** | Workflow-Verbesserungen kommen nur von Anil, nicht vom System. |
| **Wie implementieren** | Nach jeder 10. Session: Agent analysiert letzte 10 Retros. Identifiziert Wiederholungen, Zeitfresser, haeufige Fehler. Schreibt Vorschlag in `memory/improvement-proposals.md`. Anil reviewed bei naechster Session. |
| **Fuer BeScout** | SessionStart Hook zaehlt Sessions (Counter in .claude/). Bei Threshold: "Du hast 10 Sessions seit dem letzten Improvement Review. Moechtest du /improve starten?" |
| **Prioritaet** | LANGFRISTIG |
| **Aufwand** | Mittel (neuer Skill + Counter-Logic) |
| **Quelle** | Continuous Improvement Cycles, IBM AI Trends |

---

## 4. ZUVERLAESSIGKEIT & GEWISSENHAFTIGKEIT

### Pattern 4.1: Agent-Hook Stop Gate (statt Command-Hook)
| Feld | Wert |
|------|------|
| **Was es loest** | Aktueller quality-gate.sh ist ein Command-Hook — kann nur statische Checks. Kein Verstaendnis des Kontexts. |
| **Wie implementieren** | Stop-Hook von `type: "command"` auf `type: "agent"` upgraden. Agent-Prompt: "Pruefe: (1) tsc --noEmit hat 0 Errors, (2) alle geaenderten Files haben Tests, (3) keine TODO-Kommentare in neuem Code, (4) i18n Keys existieren." Agent kann Files lesen und Commands ausfuehren. Timeout: 120s. |
| **Fuer BeScout** | Ersetzt quality-gate.sh. Kann `/cto-review` Checkliste als Prompt nutzen. Bei `ok: false` → Claude arbeitet weiter. `stop_hook_active` Check verhindert Endlosschleife. |
| **Prioritaet** | **MUST-HAVE** |
| **Aufwand** | Gering (Hook-Config aendern, Prompt schreiben) |
| **Quelle** | code.claude.com/docs/en/hooks-guide |

### Pattern 4.2: TaskCompleted Quality Gate Hook
| Feld | Wert |
|------|------|
| **Was es loest** | In Agent Teams markieren Teammates Tasks als fertig ohne Verifikation. |
| **Wie implementieren** | `TaskCompleted` Hook mit Agent-Type: "Verifiziere dass der Task tatsaechlich fertig ist. Pruefe: tsc clean, geaenderte Files kompilieren, Tests fuer betroffene Module passen." Exit 2 = Task bleibt offen, Feedback geht an Teammate. |
| **Fuer BeScout** | Kombiniert mit Agent Teams (Pattern 2.1). Jeder Task durchlaeuft automatische Verifikation bevor er als done gilt. |
| **Prioritaet** | **MUST-HAVE** (wenn Agent Teams aktiviert) |
| **Aufwand** | Gering (Hook-Definition, Agent-Prompt) |
| **Quelle** | Agent Teams Docs, Quality Gate Pattern |

### Pattern 4.3: Plan-Approval Workflow
| Feld | Wert |
|------|------|
| **Was es loest** | Agents implementieren sofort ohne Plan-Review. Falsche Richtung wird erst spaet erkannt. |
| **Wie implementieren** | Bei Agent Teams: `requirePlanApproval: true` fuer riskante Teammates. Teammate schreibt Plan → Lead reviewed → Approve/Reject mit Feedback → Erst nach Approval beginnt Implementation. |
| **Fuer BeScout** | Fuer Tier 3-4 Tasks: Backend-Agent und Frontend-Agent MUESSEN Plan vorlegen. QA-Agent und Reviewer arbeiten ohne Plan-Approval (read-only). |
| **Prioritaet** | NICE-TO-HAVE |
| **Aufwand** | Gering (Prompt-Anweisung an Team Lead) |
| **Quelle** | Agent Teams Docs |

### Pattern 4.4: PreToolUse Safety Guards (erweitert)
| Feld | Wert |
|------|------|
| **Was es loest** | safety-guard.sh blockiert gefaehrliche Commands, aber kennt den Kontext nicht. |
| **Wie implementieren** | Zusaetzlich zu bestehendem safety-guard.sh: (1) `if` Field fuer granulare Filterung: `"if": "Bash(git push*)"` statt alle Bash-Commands pruefen. (2) Protected Files Hook: Block edits auf `.env`, `package-lock.json`, `.claude/settings.json`. (3) Prompt-Hook fuer SQL-Commands: "Ist dieser SQL-Befehl destruktiv?" |
| **Fuer BeScout** | Bestehende safety-guard.sh bleibt. Zusaetzlich: File-Protection Hook und SQL-Guard Prompt-Hook. |
| **Prioritaet** | NICE-TO-HAVE |
| **Aufwand** | Gering (2-3 zusaetzliche Hook-Definitionen) |
| **Quelle** | Claude Code Hooks Guide |

### Pattern 4.5: Escrow-Commit Pattern
| Feld | Wert |
|------|------|
| **Was es loest** | Code wird committed bevor alle Checks durchlaufen sind. |
| **Wie implementieren** | Workflow: Agent arbeitet auf Feature-Branch. Stop-Hook verifiziert. Nur nach Verification: `git add + commit`. Niemals auto-commit waehrend Implementation. `/deliver` Skill erzwingt dies bereits (Gate 4). |
| **Fuer BeScout** | Bereits implementiert via `/deliver`. Erweiterung: Agent Teams Teammates commiten NIE selbst — nur Lead nach Review. |
| **Prioritaet** | NICE-TO-HAVE |
| **Aufwand** | Gering (Regel in Agent-Definitionen) |
| **Quelle** | Escrow Pattern, eigene Erfahrung |

---

## 5. CLAUDE CODE SPEZIFISCH

### Pattern 5.1: Claude Agent SDK fuer Custom Pipelines
| Feld | Wert |
|------|------|
| **Was es loest** | Paperclip API ist extern und fragil. Keine native Integration. |
| **Wie implementieren** | `npm install @anthropic-ai/claude-agent-sdk`. Pipeline als TypeScript: `query()` mit spezifischen Tools, Hooks, und Subagent-Definitionen. Streaming Messages fuer Progress-Tracking. Sessions resumierbar. |
| **Fuer BeScout** | Fuer CI/CD Integration: PR-Review Agent, Deployment-Verification Agent, Scheduled Code-Quality Scans. Nicht fuer direkte Sessions (dort Claude Code CLI). |
| **Prioritaet** | LANGFRISTIG |
| **Aufwand** | Hoch (neue Infrastruktur, API Key Management) |
| **Quelle** | platform.claude.com/docs/en/agent-sdk/overview |

### Pattern 5.2: MCP Server Stack
| Feld | Wert |
|------|------|
| **Was es loest** | Agents muessen manuell zwischen Tools wechseln. Kein direkter Zugang zu externen Systemen. |
| **Empfohlener Stack** | (1) **GitHub MCP** — Issue/PR Management direkt aus Agent heraus. (2) **Playwright MCP** — Visual Testing, bereits konfiguriert. (3) **Context7 MCP** — Library Docs, bereits konfiguriert. (4) **Sentry MCP** — Error Tracking (wenn Sentry genutzt wird). (5) **Supabase MCP** — DB Operations, bereits konfiguriert. |
| **Fuer BeScout** | GitHub + Playwright + Context7 + Supabase bereits vorhanden. Sweet Spot laut Research: 3-4 MCP Server. Kein weiterer Bedarf. |
| **Prioritaet** | ERLEDIGT (Stack ist optimal) |
| **Aufwand** | — |
| **Quelle** | Firecrawl Best MCP Servers, Builder.io Guide |

### Pattern 5.3: PostCompact Context Injection
| Feld | Wert |
|------|------|
| **Was es loest** | Nach Compaction geht kritischer Session-Kontext verloren. |
| **Wie implementieren** | `SessionStart` Hook mit `matcher: "compact"`: Injiziert aktuelle Sprint-Info, letzte Fehler, und aktive Task-Beschreibung. Dynamisch generiert aus memory/ Files. |
| **Fuer BeScout** | `inject-learnings.sh` existiert auf SessionStart, aber NICHT auf compact. Neuer Hook: `SessionStart` mit `matcher: "compact"` der current-sprint.md + aktiven Task re-injiziert. |
| **Prioritaet** | **MUST-HAVE** |
| **Aufwand** | Gering (Hook-Config + kleines Script) |
| **Quelle** | Claude Code Hooks Guide — Re-inject context after compaction |

### Pattern 5.4: Skills die sich selbst verbessern (Eval-Loop)
| Feld | Wert |
|------|------|
| **Was es loest** | Skill-Prompts sind statisch. Verbesserungen passieren nur manuell. |
| **Wie implementieren** | Skill bekommt Eval-Suite (Input/Expected-Output Paare). `/skill-creator` Skill variiert den Prompt, misst Ergebnis gegen Evals, behaelt bessere Version. Automatisches A/B Testing von Skill-Varianten. |
| **Fuer BeScout** | Fuer `/deliver` und `/cto-review`: Definiere 5-10 Test-Cases (bekannte Bugs die haetten gefunden werden muessen). Laufe Evals periodisch. Verbessere Prompts basierend auf Misses. |
| **Prioritaet** | LANGFRISTIG |
| **Aufwand** | Hoch (Eval-Infrastruktur, Test-Case Kuratierung) |
| **Quelle** | Skill-Creator Skill, MindStudio Auto-Research Pattern |

---

## 6. FEEDBACK LOOPS

### Pattern 6.1: Automatische Fehler-zu-Regel-Pipeline
| Feld | Wert |
|------|------|
| **Was es loest** | Fehler werden in errors.md dokumentiert aber nie zu Regeln in common-errors.md promoviert. Manueller Prozess. |
| **Wie implementieren** | Trigger: Gleicher Fehler-Typ tritt 2x auf (Grep in errors.md). Action: Automatisch Regel-Vorschlag generieren. Output: Pending-Eintrag in `common-errors-pending.md`. Anil approved per `/promote-rule` Skill → sync zu common-errors.md. |
| **Fuer BeScout** | Schliesst die groesste Luecke im bestehenden Feedback-Loop. inject-learnings.sh liest errors.md, aber Regeln werden nie automatisch erzeugt. |
| **Prioritaet** | **MUST-HAVE** |
| **Aufwand** | Mittel (neuer Skill + Hook-Integration) |
| **Quelle** | claude-reflect, Trajectory-Informed Memory Generation |

### Pattern 6.2: Session-Metriken Dashboard
| Feld | Wert |
|------|------|
| **Was es loest** | Keine Ahnung welche Agent-Aufgaben scheitern, wie oft Rework noetig ist, welche Skills effektiv sind. |
| **Wie implementieren** | SessionEnd Hook schreibt strukturierte Metriken: `{session_id, duration, commits, files_changed, tsc_errors_before, tsc_errors_after, tests_before, tests_after, rework_count, skill_used}`. Append zu `memory/metrics.jsonl`. Periodischer Report-Skill aggregiert. |
| **Key Metriken** | (1) Task Completion Rate, (2) Rework-Rate (gleiche Datei 2x geaendert), (3) tsc-Error Delta, (4) First-Time-Right Rate (keine Korrekturen noetig), (5) Durchschnittliche Session-Dauer pro Task-Tier |
| **Fuer BeScout** | session-retro.sh erweitern um JSONL-Metriken. Neuer Skill `/metrics` fuer Auswertung. |
| **Prioritaet** | NICE-TO-HAVE |
| **Aufwand** | Mittel (3-4h fuer Hook + JSONL + Report-Skill) |
| **Quelle** | MindStudio AI Agent Metrics, DataRobot Agent Performance |

### Pattern 6.3: Post-Mortem Automatisierung
| Feld | Wert |
|------|------|
| **Was es loest** | Nach einem Bug-Fix wird nicht systematisch analysiert wie der Bug entstanden ist. |
| **Wie implementieren** | Neuer Skill `/post-mortem [commit-range]`. Agent analysiert: (1) Root Cause (warum entstand der Bug?), (2) Detection (warum wurde er nicht frueher gefunden?), (3) Prevention (welche Regel haette ihn verhindert?), (4) Action Items (konkrete CLAUDE.md/common-errors.md Aenderungen). Output in `memory/post-mortems/`. |
| **Fuer BeScout** | Manuell getriggert nach jedem P1/P2 Bug. Automatisch bei revert-Commits. |
| **Prioritaet** | NICE-TO-HAVE |
| **Aufwand** | Mittel (neuer Skill, 2-3h) |
| **Quelle** | PagerDuty AI Post-Mortems, Trajectory Intelligence |

### Pattern 6.4: User-Feedback Capturing
| Feld | Wert |
|------|------|
| **Was es loest** | Anil korrigiert Agents, aber Korrekturen fliessen nicht zurueck ins System. |
| **Wie implementieren** | UserPromptSubmit Hook erkennt Korrektur-Patterns. Korrektur → Queue. Queue wird bei `/reflect` oder Session-Ende reviewed. Approved → Ziel-Datei (CLAUDE.md, common-errors.md, oder Skill-Learnings.md). |
| **Fuer BeScout** | Leichtgewichtige Version von claude-reflect. Nur Regex-Detection (kein AI bei Capture). AI nur bei Review (/reflect). |
| **Prioritaet** | NICE-TO-HAVE |
| **Aufwand** | Mittel (Hook + Queue + Skill) |
| **Quelle** | claude-reflect, claude-meta |

---

## PRIORISIERTE IMPLEMENTIERUNGS-REIHENFOLGE

### Wave 1: Quick Wins (1-2 Sessions)
1. **Pattern 3.2** — Trigger-Rules in CLAUDE.md (30 min)
2. **Pattern 1.4** — Meta-Rules fuer Regel-Qualitaet (30 min)
3. **Pattern 5.3** — PostCompact Context Injection Hook (1h)
4. **Pattern 4.1** — Quality-Gate von Command zu Agent-Hook upgraden (1-2h)

### Wave 2: Agent Teams Setup (2-3 Sessions)
5. **Pattern 2.1** — Native Agent Teams aktivieren + konfigurieren (2h)
6. **Pattern 2.2** — Subagent Definitionen fuer BeScout-Rollen (3-4h)
7. **Pattern 2.3** — Review-Chain mit TaskCompleted Hook (4-6h)
8. **Pattern 4.2** — TaskCompleted Quality Gate Hook (1-2h)

### Wave 3: Feedback-Automatisierung (2-3 Sessions)
9. **Pattern 1.1** — Learnings.md fuer /deliver, /cto-review, /impact (2h)
10. **Pattern 6.1** — Fehler-zu-Regel Pipeline (3-4h)
11. **Pattern 6.2** — Session-Metriken in JSONL (3-4h)

### Wave 4: Verfeinerung (laufend)
12. **Pattern 6.3** — Post-Mortem Skill (2-3h)
13. **Pattern 1.2** — Korrektur-Erfassung via Hook (4-6h)
14. **Pattern 3.3** — Workflow-Improvement Proposals (2-3h)

### Langfristig (spaeter bewerten)
15. **Pattern 5.1** — Agent SDK Custom Pipelines
16. **Pattern 5.4** — Skill Eval-Loop
17. **Pattern 2.4** — Competing Hypotheses (bei Bedarf)

---

## BESTEHENDER IST-ZUSTAND (BeScout)

### Was bereits gut funktioniert:
- **6 Hooks** konfiguriert (auto-lint, safety-guard, quality-gate, session-retro, inject-learnings, crash-recovery)
- **5 Custom Skills** (/deliver, /cto-review, /impact, /status, /switch)
- **Memory System** (MEMORY.md, current-sprint.md, session-handoff.md, errors.md, 40+ Feedback-Files)
- **MCP Stack** (Supabase, Playwright, Context7, Figma, Memory)
- **CLS v1.3** mit 36 Constitution Rules
- **Paperclip Agent Team** mit 6 Agents

### Was fehlt / verbesserbar:
- **Keine Learnings.md pro Skill** — Wissen bleibt in Memory aber nicht Skill-spezifisch
- **quality-gate.sh ist Command-basiert** — kann keine Files lesen oder Tests ausfuehren
- **Keine Agent Teams** (natives Claude Feature) — nur Paperclip (extern)
- **Kein PostCompact Hook** — Kontext geht bei Compaction verloren
- **Keine Metriken** — kein Tracking von Erfolgsraten, Rework, etc.
- **session-retro.sh nur git-basiert** — keine AI-Analyse was gut/schlecht lief
- **Keine automatische Fehler-zu-Regel Promotion** — manueller Prozess
- **Keine Korrektur-Erfassung** — Anils Korrekturen gehen verloren

---

## QUELLEN

### Self-Learning & Reflection
- [claude-reflect](https://github.com/BayramAnnakov/claude-reflect) — Self-Learning System for Claude Code
- [claude-meta](https://github.com/aviadr1/claude-meta) — Self-Improving AI via CLAUDE.md Meta-Rules
- [Self-Learning Skill with Learnings.md](https://www.mindstudio.ai/blog/self-learning-claude-code-skill-learnings-md) — MindStudio Guide
- [Trajectory-Informed Memory Generation](https://arxiv.org/html/2603.10600) — Academic Research
- [claude-reflect-system](https://github.com/haddock-development/claude-reflect-system) — Continual Learning System

### Multi-Agent Coordination
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) — Official Docs
- [The Code Agent Orchestra](https://addyosmani.com/blog/code-agent-orchestra/) — Addy Osmani
- [Claude Code Hidden Swarm](https://paddo.dev/blog/claude-code-hidden-swarm/) — TeammateTool Discovery
- [Swarm Orchestration Skill](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea) — Complete Guide
- [30 Tips for Agent Teams](https://getpushtoprod.substack.com/p/30-tips-for-claude-code-agent-teams) — Practical Tips
- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) — Curated Resource List

### Claude Code Features
- [Hooks Guide](https://code.claude.com/docs/en/hooks-guide) — Official Docs (25 Hook Events)
- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview) — Official Docs
- [Best MCP Servers for Developers](https://www.firecrawl.dev/blog/best-mcp-servers-for-developers) — Firecrawl Guide
- [Claude Code Hooks: 20+ Examples](https://aiorg.dev/blog/claude-code-hooks) — Practical Guide

### Metrics & Observability
- [Measuring AI Agent Success](https://www.mindstudio.ai/blog/ai-agent-success-metrics) — MindStudio
- [AI Agent Performance](https://aimultiple.com/ai-agent-performance) — Industry Benchmarks
- [AI Agent Observability Tools](https://www.braintrust.dev/articles/best-ai-agent-observability-tools-2026) — Braintrust

### Proactive Agents
- [Self-Learning AI Agents](https://beam.ai/agentic-insights/self-learning-ai-agents-transforming-automation-with-continuous-improvement) — Beam AI
- [AI Trends 2026](https://www.ibm.com/think/news/ai-tech-trends-predictions-2026) — IBM
