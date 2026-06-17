# E0-W3b — cortex-Trio retiren (Jarvis-Legacy abwickeln)

**Größe:** M
**Slice-Type:** Hook + Tool (Infra)
**Parent:** worklog/specs/E0-operating-system-knowledge-base.md (Epic E0, Welle 3 — Gruppe-C-Folge aus E0-W3)
**CEO-Scope:** Nein (Tooling-Hygiene). Scope-Entscheidung (Commands + morning-briefing ganz retiren) von Anil bestätigt 2026-06-17.

## 1. Problem-Statement (Evidence)
E0-W3 grenzte „Gruppe C" als live-verdrahtete Reste der alten Jarvis/cortex-Mechanik ab und vertagte sie. 3 tote Memory-Files hängen noch in aktiven Hooks/Commands:
- `working-memory.md` (145 KB) — von `inject-context-on-compact.sh` nur **geschrieben** (toter Snapshot, nichts liest's; Injection liest schon `active.md`+handoff+INDEX).
- `session-digest.md` — `pattern-check.sh` (Stale-Nag) + `morning-briefing.sh` (liest+injiziert).
- `current-sprint.md` — Commands `/done`, `/status`, `/switch` (Jarvis-Aliase; `/ship done|status` ist Ersatz, `/switch` liest archiviertes `memory/features/` = bereits kaputt).

`morning-briefing.sh` (SessionStart-Hook) ist Jarvis-Legacy, redundant zur SHIP-Briefing (`ship-session-start.sh`), referenziert tote Artefakte (`senses/`, `wiki-index`, `session-counter`, AutoDream) und läuft `tsc` mit 10s-Timeout (oft still abgewürgt).

## 2. Lösungs-Design (Anil-Entscheidung: beides ganz retiren)
- **inject-context-on-compact.sh:** Write-Block (`working-memory.md`) raus, Injection behalten.
- **pattern-check.sh:** session-digest-Stale-Block raus, fix()-Commit-Check behalten.
- **morning-briefing.sh:** ganz retiren — aus `settings.json` SessionStart raus + `git rm` Script.
- **Commands `/done`,`/status`,`/switch`:** `git rm` (SHIP-Loop ersetzt; in git-Historie erhalten).
- **3 Memory-Files** → `memory/_archive/2026-06-17-w3b/`.
- **Kosmetische Ref-Fixes** (stale Kommentare/Instruktionen): `SHARED-PREFIX.md` (Instruktion „Lies senses/morning-briefing.md" raus), `session-handoff-auto.sh` + `ship-parallel-dispatch-gate.sh` (stale Kommentare).

## 3. Betroffene Files
| File | Änderung |
|---|---|
| `.claude/hooks/inject-context-on-compact.sh` | Write-Block entfernen |
| `.claude/hooks/pattern-check.sh` | session-digest-Block entfernen |
| `.claude/hooks/morning-briefing.sh` | `git rm` |
| `.claude/settings.json` | morning-briefing-Eintrag aus SessionStart |
| `.claude/commands/{done,status,switch}.md` | `git rm` |
| `.claude/agents/SHARED-PREFIX.md` | stale morning-briefing-Instruktion raus |
| `.claude/hooks/session-handoff-auto.sh` | Kommentar-Fix |
| `.claude/hooks/ship-parallel-dispatch-gate.sh` | stale Kommentar-Fix |
| `memory/_archive/2026-06-17-w3b/` | NEU, 3 Files |

## 4. Code-Reading-Liste (durchgeführt)
1. `morning-briefing.sh` (155 Z.) — voll gelesen, schreibt senses/, liest session-digest Z.134-139. ✅
2. `inject-context-on-compact.sh` — Write-Block Z.12-47, Injection Z.49-68 liest schon active.md/handoff/INDEX. ✅
3. `pattern-check.sh` — session-digest-Block Z.22-30, fix()-Check Z.8-20 behalten. ✅
4. `.claude/commands/{done,status,switch}.md` — referenzieren current-sprint.md + memory/features (gone). ✅
5. `ship-parallel-dispatch-gate.sh` — Gate resettet SELBST per 8h-Age (Z.30-36), morning-briefing-Kommentar Z.28 ist stale → keine Abhängigkeit. ✅
6. `settings.json` SessionStart — 4 Hooks, morning-briefing Z.217-221. ✅

## 5. Pattern-References
- E0-W3 Gruppe-C-Abgrenzung (Broke-Ref-Grep Live-Schicht, W2c-Lehre `errors-infra.md`).
- D54 Tool-Wiring: Hook aus settings.json entfernen + Script `git rm` zugleich → kein Orphan (wiring-check). Sonst KNOWN_ORPHANS-Eintrag nötig.
- archive-not-delete für Memory-Files; `git rm` für Scripts/Commands (Historie = Archiv).

## 6. Acceptance Criteria
- AC-1: `working-memory.md`/`session-digest.md`/`current-sprint.md` nicht mehr im Root, in `_archive/2026-06-17-w3b/`. VERIFY: `ls memory/*.md | grep -E "working-memory|session-digest|current-sprint"` → leer.
- AC-2: inject-context-on-compact.sh schreibt working-memory NICHT mehr, injiziert weiterhin active.md+handoff+INDEX. VERIFY: `grep -c working-memory .claude/hooks/inject-context-on-compact.sh` → 0; Injection-Block (COMPACTION SHIELD) intakt.
- AC-3: pattern-check.sh hat fix()-Check behalten, session-digest-Block weg. VERIFY: `grep -c session-digest pattern-check.sh` → 0; `grep -c "fix(" pattern-check.sh` > 0.
- AC-4: morning-briefing weder in settings.json noch als Script. VERIFY: `grep -c morning-briefing .claude/settings.json` → 0; `ls .claude/hooks/morning-briefing.sh` → not found.
- AC-5: Commands weg. VERIFY: `ls .claude/commands/{done,status,switch}.md` → not found.
- AC-6: `pnpm audit:wiring:check` grün (kein neuer Orphan). VERIFY: exit 0.
- AC-7: Kein lebender Broken-Ref auf die 3 Files/morning-briefing in Hooks/Commands/Skills/Agents/INDEX. VERIFY: Broke-Ref-Grep leer (Kommentare/docs-plans/backups ok).

## 7. Edge Cases
| Case | Handling |
|---|---|
| morning-briefing resettet parallel-dispatch-gate? | Nein — Gate self-reset per 8h (verifiziert), Kommentar nur stale → fixen |
| SHARED-PREFIX weist Agents auf senses/morning-briefing.md | Instruktion entfernen (File wird nicht mehr erzeugt) |
| memory/senses/morning-briefing.md (Output) | gitignored, dead — kein Handling nötig |
| wiring-check Orphan nach Hook-Entfernung | settings-Entry + Script ZUSAMMEN raus → kein Orphan |
| session-counter/AutoDream/wiki-Refs in morning-briefing | mit Script-Removal automatisch weg |

## 8. Self-Verification Commands
```bash
grep -c "working-memory\|session-digest" .claude/hooks/inject-context-on-compact.sh .claude/hooks/pattern-check.sh
grep -c "morning-briefing" .claude/settings.json
ls .claude/hooks/morning-briefing.sh .claude/commands/done.md 2>&1
pnpm audit:wiring:check
# Broke-Ref-Grep der 3 Namen + morning-briefing über Live-Schicht (Hooks/Commands/Skills/Agents/INDEX/MEMORY)
```

## 9. Open-Questions
- Beide Scope-Fragen von Anil bestätigt (Commands retiren + morning-briefing ganz retiren). Keine offen.

## 10. Proof-Plan
`worklog/proofs/E0-W3b-proof.txt` — AC-Greps + wiring-check-Output + Broke-Ref-Grep leer.

## 11. Scope-Out
- inject-learnings.sh + ship-session-start.sh bleiben (kein cortex-Bezug).
- Weitere Jarvis-Reste (`memory/wiki-*.md`, `.claude/session-counter`, autodream-Agent) NICHT in diesem Slice — eigener Cleanup falls nötig.
- W4 Historie-Rewrite separat.

## 12. Stage-Chain
SPEC → IMPACT skipped (Tooling-Hygiene, Consumer in Spec §3 erfasst) → BUILD → REVIEW (Pflicht, berührt Live-Hooks) → PROVE → LOG

## 13. Pre-Mortem
- Hook entfernt, Script bleibt → wiring-check-Orphan blockt Commits. Mitigation: beides zusammen + AC-6.
- Injection-Block versehentlich mit Write-Block gelöscht → Compaction verliert Kontext. Mitigation: AC-2 prüft COMPACTION-SHIELD-Block intakt.
- Command-Removal bricht Anil-Muscle-Memory → /ship done|status ist dokumentierter Ersatz (LOG-Notiz).
