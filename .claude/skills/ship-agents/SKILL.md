---
name: ship-agents
description: Multi-Slice-Orchestrierung via `claude agents` (v2.1.139+). Dispatcht mehrere autonome Claude Code-Sessions parallel (cross-Session, NICHT cross-SubAgent). Nutze für 2-3 unabhängige Slices die simultan laufen sollen — z.B. Bug-Fix + Polish + i18n parallel.
---

# /ship-agents — Multi-Session Slice-Orchestrierung

**Wichtig:** Das ist NICHT `/parallel-dispatch`!

| | `/parallel-dispatch` | `/ship-agents` (DIES) |
|---|---|---|
| Scope | Sub-Agents in EINER Session | EIGENE Claude Code-Sessions parallel |
| Tool | `Agent` (Task) | `claude agents` CLI (v2.1.139) |
| Worktree | Optional | Pflicht (Isolation) |
| Effort | Erbt von Parent | Per-Session frei |
| Dashboard | Nein | `claude agents` Screen |

Nutze `/parallel-dispatch` wenn EIN Slice mehrere Domains hat (backend+frontend+test in einem Slice).
Nutze `/ship-agents` wenn MEHRERE eigenständige Slices parallel laufen sollen.

## Wann nutzen

| Setup | Empfehlung |
|---|---|
| 1 Slice, 1 Stage | Kein Multi-Session |
| 1 Slice, mehrere Domains | `/parallel-dispatch` (Sub-Agents in this session) |
| 2-3 unabhängige Slices, alle BUILD-ready | `/ship-agents` (dieser Skill) |
| Mehr als 4 parallele Slices | Stop. Anil muss priorisieren. |

## Dispatch-Pattern

### Schritt 1: Worktrees vorbereiten

Pro paralleler Slice: eigenes Worktree. Beispiel für 3 Slices:

```bash
git worktree add ../bescout-282 -b slice-282-i18n
git worktree add ../bescout-283 -b slice-283-bug-fix
git worktree add ../bescout-284 -b slice-284-polish
```

Jedes Worktree braucht eigene `worklog/active.md` mit eigenem Slice-State.

### Schritt 2: Claude Agents dispatchen

In jedem Worktree separat:

```bash
claude agents \
  --add-dir ../bescout-282 \
  --effort xhigh \
  --mcp-config ./.mcp.json \
  --plugin-dir ./.claude \
  "/goal slice 282 BUILD complete: alle ACs aus worklog/specs/282-*.md UND tsc grün UND vitest grün UND proof-file existiert"
```

Für alle 3 parallel: 3 Terminal-Tabs ODER 1 Background-Dispatch:

```bash
claude agents \
  --add-dir ../bescout-282 --effort xhigh \
  "/goal slice 282 BUILD complete: ..." &

claude agents \
  --add-dir ../bescout-283 --effort xhigh \
  "/goal slice 283 BUILD complete: ..." &

claude agents \
  --add-dir ../bescout-284 --effort xhigh \
  "/goal slice 284 BUILD complete: ..." &
```

### Schritt 3: Dashboard öffnen

```bash
claude agents
```

Zeigt alle laufenden Sessions:
- Welche `RUNNING`, welche `BLOCKED ON YOU`, welche `DONE`
- Pfeil nach rechts → attach to row → volle Conversation
- Pfeil nach links → zurück zur Liste

Background-Sessions laufen weiter ohne Terminal-Attach.

### Schritt 4: Merge-Reihenfolge

Wenn alle 3 fertig (DONE im Dashboard):

1. Reviewer-Agent pro Worktree (oder Cold-Context-Review)
2. Merge in `main` in Reihenfolge der Tiefe: kleinste/sicherste zuerst, riskanteste zuletzt
3. `worklog/active.md` im main-Worktree konsolidieren: 3 Slices in `worklog/log.md` eintragen

## Anti-Patterns

❌ **Cross-Slice-Abhängigkeit ignorieren:** Wenn Slice 283 auf Slice 282 wartet (z.B. neuer Service), läuft 283 ins Leere. Vorher prüfen.
❌ **Geteilte Files:** Wenn 2 Slices dasselbe File anfassen, gibt's Merge-Konflikt. Vorher Files-Maps abgleichen.
❌ **Mehr als 4 parallel:** Anil verliert Überblick. Hard limit.
❌ **`/ship-agents` für 1 Slice:** Use `/goal` direkt in der laufenden Session, ohne neues Worktree.

## Effort-Tuning per Slice

Jedes Worktree kann eigenen Effort haben:

```bash
# Schwerer Slice (Architektur-Migration)
claude agents --add-dir ../bescout-282 --effort xhigh "/goal ..."

# Leichter Slice (i18n-String-Korrekturen)
claude agents --add-dir ../bescout-283 --effort medium "/goal ..."
```

Medium-Sessions trigger weniger Heavy-Hooks (siehe `lib/effort-guard.sh`).

## Integration mit SHIP-Loop

`/ship-agents` ersetzt NICHT die 6 Stages — jedes parallele Worktree durchläuft sie weiterhin:

```
Worktree A: SPEC → IMPACT → BUILD → REVIEW → PROVE → LOG
Worktree B: SPEC → IMPACT → BUILD → REVIEW → PROVE → LOG    (parallel)
Worktree C: SPEC → IMPACT → BUILD → REVIEW → PROVE → LOG    (parallel)
                                          ↓
                          Main-Worktree: 3× Merge + 3× log.md-Eintrag
```

Hooks wie `ship-spec-gate`, `ship-cto-review-gate`, `ship-proof-gate` wirken pro Worktree unabhängig.

## Verifikation der Sessions

```bash
claude agents --json
```

Listet alle Sessions als JSON (für Scripting, z.B. Auto-Merge-Pipeline).

## Notfall-Stop

Wenn eine Session driftet:
- Dashboard öffnen → Row anwählen → `q` zum Pausieren
- Worktree manuell prüfen (`git status`, `git diff`)
- Wenn Drift bestätigt: Session killen, Worktree-Reset, Slice neu starten

NIE `git worktree remove --force` ohne vorher zu prüfen — gleiche Discipline wie Main-Repo.
