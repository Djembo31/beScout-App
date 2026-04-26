---
name: parallel-dispatch
description: Playbook für Parallel-Agent-Orchestration mit Worktrees. Nutze bei Multi-Domain-Tasks (>3 Files cross-domain). Zeigt konkret Dispatch-Pattern für backend+frontend+test-writer+reviewer parallel. Ersetzt Solo-Claude-Sequenziell bei grossen Features.
---

# /parallel-dispatch — Agent-Team Orchestrierung

**Regel:** Solo für <3 Files. Team-of-Agents für alles darüber cross-domain.

## Wann parallel vs. seriell

| Task | Muster |
|------|--------|
| 1 Hook-Fix / 1 File-Edit | Solo |
| 2-3 Files 1 Domain | Solo ODER 1 Agent |
| 3+ Files 1 Domain | **1 Agent (backend ODER frontend) in Worktree** |
| Cross-Domain (DB + UI + Tests) | **PARALLEL**: 3 Agents in separate Worktrees |
| Neue Feature-Spec | `/spec` zuerst, dann Parallel-Dispatch |
| Bug-Investigation | Explore-Agent (read-only) zuerst, dann targeted |

## Standard-Dispatch-Block (Cross-Domain)

EIN assistant turn, MEHRERE Agent tool calls parallel:

```
Agent(backend, worktree)    : "Spec NNN. Baue RPC + Service. Verify: vitest run <file>."
Agent(frontend, worktree)   : "Spec NNN. Baue Component + Page + i18n. Verify: tsc + 393px screenshot."
Agent(test-writer, worktree): "Spec NNN. Schreibe Tests AUS SPEC (ohne Code zu lesen). Muss rot sein."

[warten auf alle 3]

Agent(reviewer, read-only): "Review alle 3 Worktrees gegen common-errors.md + business.md + patterns.md. Output PASS/REWORK."
```

## Agent-Briefing Template (PFLICHT — Slice 211 erweitert)

```
KONTEXT: [Was Anil will + Business-Kontext + Slice-Nr]
SPEC: worklog/specs/NNN-*.md (LIES ZUERST — der Agent ist intelligent, aber nicht hellsichtig)
ZIEL: [Konkretes Ergebnis, nicht Schritte]
CONSTRAINTS:
  - Mobile 393px PFLICHT
  - i18n DE + TR
  - Pattern X nutzen (NICHT neu erfinden — siehe Spec Sektion 1.11 Pattern-References)
DU ENTSCHEIDEST: [Component-Struktur, Naming, interne Helper] (siehe Spec Sektion 1.13 Autonom-Zone)
VERIFY: [tsc clean + vitest run <file> + Screenshot] (siehe Spec Sektion 1.12 Self-Verification)
PRE-WORK: Lies deine SKILL.md + LEARNINGS.md. Check common-errors.md für bekannte Fallen.

WORKTREE-PFLICHT (Slice 207-Lehre, codifiziert Slice 211):
  - ALLE Files-Edits MIT RELATIVEN PFADEN (`src/lib/...` NICHT `C:/bescout-app/src/lib/...`)
  - Absolut-Paths schreiben Files in das Main-Repo statt deinen Worktree
    (silent-fail: kein git-Konflikt, dein Worktree bleibt leer, claimed completion irreführend)
  - Vor "fertig"-Claim: `cd <worktree-path> && git status -s` selbst laufen lassen
    Erwartet: deine Edits zeigen sich. Wenn empty → du hast in Main-Repo geschrieben → STOP, Anil informieren.

PRE-REVIEW-MEMO (empfohlen bei M/L-Slices, Slice 211):
  Schreibe nach Implementation in `worklog/reviews/NNN-pre-review.md`:
  - AC-Self-Audit (welche grün, welche teils, welche nicht — keine Beschönigung)
  - Edge-Case-Coverage (welche getestet, welche nicht)
  - Self-Verification-Output (welche Audit-Commands gelaufen + 1-Zeilen-Output)
  - Open-Blocks (was du nicht klären konntest, wo Reviewer schauen muss)
  - Bekannte Risiken / Spec-Drifts (z.B. "Linear-Path statt Catmull-Rom — visuell nicht differenzierbar")
  Reduziert Reviewer-Arbeit ~60% laut Slice 207.
```

NIEMALS:
- "Editiere Zeile 45" (Micromanagement)
- "Baue mal was" (kein Ziel)
- "Wird schon passen" (keine VERIFY-Kriterien)

IMMER:
- Ziel + Constraints + Verify
- Trust aber VERIFY (nach Agent: `git diff --stat` + ls changes)

## Service-Schnittstelle vorab spezifizieren (Slice 211 D46)

**PFLICHT bei BE+FE-Cross-Domain-Slices** — sonst entstehen Service-Duplicates (Slice 199 Reviewer-Find).

In der Spec Sektion 1.10 "Code-Reading-Liste" (oder eigene Sub-Sektion 1.3a) MUSS stehen:

```
Service-Kontrakt:
  Datei: src/lib/services/<canonical>.ts
  Export: export async function getXxx(params: P): Promise<R>
    P = { ... exakte Type-Shape ... }
    R = { ... exakte Type-Shape ... }
  Caller (FE-Hook): src/lib/queries/<related>.ts mit useQuery(qk.X.Y, () => getXxx(...))
```

Damit ist klar:
- **BE-Agent** baut den Service unter dem CANONICAL-Pfad. Schreibt KEINE konkurrierende Version.
- **FE-Agent** importiert von dem CANONICAL-Pfad. Erfindet KEINE eigene Service-Variante.
- **Test-Writer** mockt den CANONICAL-Pfad. Schreibt Tests gegen die exakte Type-Shape.

**Wenn vergessen:** Beide Agents bauen unabhängig "irgendeinen" Service → 1 wird orphan-production-code (kein Importer) → Slice 199-Klasse-Bug.

**Reviewer-Pflicht** bei Cross-Domain: post-merge `grep -rn "import.*from.*'<be-service-path>'" src/` — wenn 0 Results: orphan, einer der Services muss gelöscht werden.

## Worktree-Naming-Konvention

- `wt-<slice>-backend`
- `wt-<slice>-frontend`
- `wt-<slice>-tests`
- `wt-<slice>-review` (nur wenn big)

## Merge-Strategie nach Parallel-Run

1. Reviewer prüft alle Worktrees einzeln → PASS/REWORK
2. Bei REWORK → Healer-Agent fixt im jeweiligen Worktree
3. Bei PASS:
   - **Backend zuerst** mergen (Service-Contract ist Dependency)
   - Frontend rebase auf main → merge
   - Tests mergen (nur wenn Code-Changes komplett)
4. `tsc --noEmit` auf main nach Merge
5. Worktrees löschen (`git worktree remove`)

## Agent-Model-Override

- `backend` + `reviewer` = **Opus** (tief + Pattern-sicher)
- `frontend` + `healer` + `test-writer` = **Sonnet** (schnell + günstig)
- `impact-analyst` = **Opus** (cross-cutting ist anspruchsvoll)
- `business` + `qa-visual` = **Sonnet**

Override via `model: opus` in `.claude/agents/<name>/SKILL.md` frontmatter.

## Anti-Patterns

- **5 Agents für 1 File** → Overhead > Win, bleib solo
- **Agent ohne Spec-Referenz** → unklare Outputs, Merge-Hölle
- **Kein Reviewer am Ende** → Fehler durch-gerutscht, nachts entdeckt
- **Worktree-Merge ohne tsc** → Commit mit Build-Error
- **Parallel bei Money-Path** → Pattern ist richtig, aber Money braucht Solo-Claude mit Hypothese

## Beispiel-Session (ideal)

```
1. /spec "Neues Fantasy-Leaderboard mit Filtern"
   → Claude erstellt worklog/specs/NNN-fantasy-leaderboard.md
   
2. /plan-ceo-review + /plan-qa-review + /plan-legal-review
   → 3 Perspektiven, Spec refined

3. /impact
   → 18 Consumers + 2 Side-Effects identified, test-plan generated

4. Parallel-Dispatch:
   - backend (worktree) : RPC rpc_get_fantasy_leaderboard + Service + Tests
   - frontend (worktree): LeaderboardPage + FilterBar + EmptyState + i18n
   - test-writer (worktree): Integration-Tests aus Spec (sieht Code nicht)

5. Reviewer (read-only)
   → PASS

6. Merge (backend first, frontend rebase, tests last)

7. Proof: Playwright gegen bescout.net + SQL result sample

8. /ship log
```

Gesamt-Zeit: ~2h. Solo-seriell hätte 5h gedauert.
