# Workflow-Ballast-Audit (Phase 1 von B) — 2026-06-28

> Read-only Faktenbefund für den chirurgischen Workflow-Reset (Anil-Scope B, 2026-06-28).
> Klassifikation: **KEEP** (fängt nachweislich echte Bugs / Kern) · **FIX** (Funktion behalten, Bruch/Redundanz/Perf heilen) · **CUT** (kaputt / Dublette / Theater / tote Phase).
> **Nichts wird ohne Anil-Sign-off gelöscht.** Money/Security-Rigor steht NICHT zur Disposition (prep §6).

## Gemessene Meta-Akkretion
| Werkzeug | April-Memory | Heute gemessen | Δ |
|---|---|---|---|
| Hooks | 28 | **38 wired** (8 Events) | +36 % |
| Skills (Projekt) | 22 | **26** | +18 % |
| Agents | 9 | **15** | +67 % |

Niemand hat je etwas entfernt. `Stop` feuert **9** Hooks, `PostToolUse` **7**, `PreToolUse-Bash` **6**.

---

## A. HOOKS (38) — Verdict

### CUT (kaputt / Dublette / Theater) — 8
| Hook | Grund |
|---|---|
| `ship-build-goal-suggest` (#7) | Seit Monaten **kaputt** (liest `.last-stage.txt` Feld 2, das #5 nie schreibt) → lieferte nie Wert. |
| `ship-stage-timer` (#5) | Schreibt `stages.jsonl` nur für das kaputte #7; kein anderer Consumer. |
| `quality-gate-v2` (#32) | No-op Session-Counter, Name lügt („quality-gate" macht keinen Quality-Check). |
| `ship-kanban-sync` (#37) | **Doppelt verdrahtet** (Stop + SessionStart); ist nur Reminder, kein echter Notion-Write. 1 Verdrahtung reicht. |
| `test-reminder` (#3) | Dublette zu `ship-post-service` (#4) + Race-Bug (`tail -1 session-files.txt` statt eigenes file_path). #4 behalten. |
| `ship-task-enforcement` (#18) | Dublette zu `ship-parallel-dispatch-gate` (#17): beide BUILD+≥3-Files-Reminder. Einen behalten. |
| `ship-deferred-reeval-reminder` (#30) | Dublette zu `ship-phase-tracker-reminder` (#29) — beide lesen beta-phase.md am Stop. Beta abgebrochen (D111) → beide niedrig; einen behalten/mergen. |
| `pattern-check` (#31) | Buggy Offset (`HEAD~$FIX_COMMITS` zählt 4h-fix-Anzahl als Commit-Offset → falscher Diff). Funktion (Knowledge-Flywheel-Reminder) in `session-retro` falten. |

### FIX (behalten, aber heilen) — 6
| Hook | Fix |
|---|---|
| `crash-recovery` (#35) | **Akkretions-Bug:** appendet ohne Marker → handoff.md wächst unbegrenzt. Auf Marker-Merge umstellen (wie #26). **Priorität.** |
| `pre-commit-guard` (#9) | Läuft **unconditional bei JEDEM Bash** (kein Stdin-JSON-Parse) statt nur bei `git commit`. Auf commit-Detection + exit 2 angleichen. |
| `session-handoff-auto` (#26) | Läuft volle `npx tsc --noEmit` bei **jedem Stop** = teuer + Theater (tsc lief schon im BUILD). tsc raus oder cachen. |
| `run_tests_on_change` (#19) | Volle `npm test`-Suite blockierend **vor jedem Code-Edit** + braucht `jq`. Auf betroffene Tests verengen oder ganz raus (PostToolUse-vitest-Reminder deckt's ab). |
| `auto-lint` (#1) | `eslint --fix` pro Edit = langsam + schluckt jeden Fehler (`\|\| true`). Nach pre-commit verschieben oder debouncen. |
| Effort-Gate-Asymmetrie | #14/#20/#22/#13 sind NICHT effort-gated, ihre Schwester-Hooks am selben Event schon → uneinheitliches Verhalten je Effort. Vereinheitlichen. |

### KEEP (fängt echte Bugs / Kern) — Rest (~17 aktive + Side-Effect-Infra)
`safety-guard` (#8, blockt rm -rf/DROP/force-push) · `ship-proof-gate` (#10) · `ship-cto-review-gate` (#11, Reviewer fing 419b/428) · `ship-tool-wiring-gate` (#12, fängt Build-without-Wire) · `ship-spec-gate` (#14) · `ship-spec-quality-gate` (#15) · `ship-meta-plan-block` (#16, **schon Anti-Akkretion**) · `ship-status-gate` (#20, injizierte diese Session die Evidenz) · `ship-context7-gate` (#21) · `ship-phase-gate` (#22) · `capture-correction` (#23) + `inject-learnings` (#38) + `queue-watch-stop` (#34, Learnings-Flywheel) · `session-handoff-auto` (#26, FIX s.o.) · `ship-session-start` (#36) · `inject-context-on-compact` (#25) + `pre-compact-backup` (#24) · `track-file-changes` (#6) · `file-size-warning` (#2) · `ship-no-audit-slice` (#27) · `session-retro` (#33) · `ship-verify-completeness-gate` (#13).

---

## B. SKILLS (26) — Verdict

### CUT / ARCHIVE (tote Phase — Beta ABGEBROCHEN D111) — 5
`audit-beta-readiness` · `auto-beta-ready` · `sign-off` · `persona-walk` · `sweep-page`
→ an die Beta gebunden; Infra bleibt im Repo nutzbar, aber raus aus der aktiven Skill-Routing-Fläche (archivieren, nicht löschen).

### KONSOLIDIEREN (Self-Improvement-Cluster, Überlappung) — 6 → 2
`metrics` · `improve` · `optimize` · `reflect` · `promote-rule` · `post-mortem`
→ überlappen (Session-Analyse / Metrik-Aggregat / Learnings-Promotion / Rule-Promotion / RCA). **Frage an Anil: jemals manuell ausgeführt?** Wenn selten → auf `retro` (Analyse) + `promote` (Wissen→Regel) eindampfen.

### KEEP — 15
`ship` · `spec` · `impact` · `parallel-dispatch` · `ship-agents` · `silent-fail-audit` · `competing-hypotheses` · `typography` · `gtm-writer` · `plan-ceo-review` · `plan-qa-review` · `plan-legal-review` · `beScout-frontend` · `beScout-backend` · `beScout-business`.

---

## C. AGENTS (15) — Verdict

### KEEP — Kern-Engine (6)
`backend` · `frontend` · `healer` · `test-writer` · `reviewer` · `impact-analyst`

### KEEP — Domänen-Wert für Mock→Pro (4)
`business` · `gtm-writer` · `fm-mechanics-expert` · `fantasy-scoring-expert`

### KONSOLIDIEREN (Auditor-Persona-Überlappung) — 4 → 1-2
`brand-coherence-auditor` · `ux-coherence-auditor` · `tester-persona-walker` · `qa-visual`
→ alle read-only „Audit aus einer Persona". Mergen zu 1 generischem Auditor (Persona via Prompt-Param) + ggf. `qa-visual` separat (Playwright-spezifisch).

### REVIEW — 1
`autodream` (Wiki-Compiler) → wird das Wiki noch gepflegt? Sonst dormant.

---

## Netto-Effekt bei voller Umsetzung
- Hooks **38 → ~24** (8 CUT, 6 FIX).
- Skills **26 → ~17** (5 archiviert, 6→2 konsolidiert).
- Agents **15 → ~11** (4→1-2 konsolidiert).
- Plus: 1 aktiv-schädlicher Hook (#35) geheilt, 1 Risiko-Hook (#9) geheilt, 3 Perf-Bremsen (#26/#19/#1) entschärft.

## Offene Anil-Entscheidungen (für Sign-off)
1. CUT-Liste Hooks (8) freigeben? Einzel-Veto?
2. FIX-Liste Hooks (6) — Reihenfolge/alle?
3. Beta-Skills (5) archivieren — ok?
4. Self-Improvement-Skills: jemals genutzt? → konsolidieren ja/nein.
5. Auditor-Agents (4→1-2) mergen — ok?
