# E0-W3 — Hygiene: Binärmüll-Stop (.gitignore) + Root-Vault-Archivierung

**Größe:** M
**Slice-Type:** Doc + Hygiene
**Parent:** worklog/specs/E0-operating-system-knowledge-base.md (Epic E0, Welle 3)
**CEO-Scope:** Nein (Hygiene, kein Money/Security/Scope). Gruppe-C-Scope-Frage an Anil.

## 1. Problem-Statement (Evidence)
Zwei Müll-Quellen wachsen unkontrolliert:
1. **Binär-Beweise** (`worklog/proofs/*.png`, e2e/qa-Screenshots) landen in Commits → `.git` 887 MB (E0-Spec Welle 4). Proof-Konvention soll Text sein (SQL/Test/grep) + optional 1 lokaler Screenshot (nicht committed).
2. **Root-Vault-Drift:** ~32 stale `memory/*.md` (beta-/phase3-/audit_/impact_/operation-beta etc.) liegen im Wurzel-Vault herum, obwohl W2 die Wissens-Heimat nach `docs/knowledge/` verlegt hat. Handoff (2026-06-17) + E0-Spec Welle 3.

## 2. Lösungs-Design
- **Teil 1:** `.gitignore`-Block für Proof/Screenshot-Binaries. Bestehende lokale PNGs bleiben lokal (kein `git rm` — Historie-Bereinigung ist W4, riskant, separat).
- **Teil 2:** Stale Root-Vault-Files → `memory/_archive/2026-06-17-w3/`. **Vor JEDEM Move: Broke-Ref-Grep über die LEBENDE Schicht** (src, .claude, scripts, docs/knowledge, MASTERPLAN/TODO, memory/MEMORY.md, worklog/active.md) — Reviewer-Lehre E0-W2c (`errors-infra.md`): nur verwaiste Files bewegen, MEMORY.md-Links mit-trimmen.

### Scan-Ergebnis (durchgeführt VOR Spec)
- **Gruppe A (verwaist, ~17):** nur Crash-Backup-Diffs + Code-Kommentare als Refs → archivieren.
- **Gruppe B (aktiv, 2):** `beta-rollback-runbook`, `beta-sentry-alerts-runbook` von `docs/knowledge/INDEX.md` geroutet → NICHT anfassen.
- **Gruppe C (live verdrahtet, ~13):** cortex-Mechanik (`session-digest`/`working-memory`/`current-sprint` in Hooks/Commands) + beta-ops (MEMORY.md/Skills/Agent) → Anil-Entscheidung über Scope.

## 3. Betroffene Files
| File | Änderung |
|---|---|
| `.gitignore` | + Proof/Screenshot-Binär-Block |
| `memory/_archive/2026-06-17-w3/` | NEU, Ziel der Gruppe-A-Moves |
| ~17 `memory/*.md` (Gruppe A) | `git mv` → _archive |
| `worklog/active.md` | Slice-Status |

## 4. Code-Reading-Liste (durchgeführt)
1. `.gitignore` (tail) — bestehende Audit-Churn-Patterns als Vorlage. ✅
2. `worklog/specs/E0-operating-system-knowledge-base.md` §Welle 3 — Scope-Quelle. ✅
3. `.claude/rules/errors-infra.md` — Broke-Ref-Grep-Regel (W2c-Lehre). ✅ (pending re-read pre-archive)
4. `docs/knowledge/INDEX.md` — welche memory-Files aktiv geroutet (Gruppe B). ✅
5. `.claude/hooks/{morning-briefing,pattern-check,inject-context-on-compact}.sh` — funktionale Reads (Gruppe C). ✅

## 5. Pattern-References
- Reviewer-Lehre E0-W2c → `errors-infra.md` (Broke-Ref-Grep MUSS Live-Doku-Schicht abdecken).
- W2c-Muster: `git mv` statt delete (archive-not-delete), Zeitstempel-Ordner.

## 6. Acceptance Criteria
- AC-1: `.gitignore` ignoriert `worklog/proofs/*.png` + e2e-Screenshot-Pfade. VERIFY: `git check-ignore worklog/proofs/test.png` → Treffer.
- AC-2: Alle Gruppe-A-Files in `memory/_archive/2026-06-17-w3/`, keine im Root-Vault. VERIFY: `ls memory/ | grep -E "<gruppe-A>"` → leer.
- AC-3: Kein lebender Broken-Ref nach Archivierung. VERIFY: Broke-Ref-Grep der archivierten Namen über Live-Schicht → leer (Crash-Backups/Kommentare ok).
- AC-4: Gruppe B (`beta-rollback`/`beta-sentry-alerts-runbook`) unangetastet im Root. VERIFY: `ls memory/beta-rollback-runbook.md` → existiert.

## 7. Edge Cases
| Case | Handling |
|---|---|
| Bestehende committed PNGs | bleiben in Historie (W4-Scope), `.gitignore` wirkt nur für NEUE |
| Code-Kommentar referenziert archiviertes File | akzeptiert (historische Notiz, kein funktionaler Read) |
| Crash-Backup-Diff referenziert File | ignoriert (Backup ist selbst Müll) |
| MEMORY.md verlinkt Gruppe-A-File | trimmen (Scan: kein Gruppe-A-File in repo MEMORY.md) |

## 8. Self-Verification Commands
```bash
git check-ignore worklog/proofs/x.png e2e/screenshot.png
ls memory/*.md | wc -l   # vorher 58
# Post-archive Broke-Ref-Grep über Live-Schicht (src .claude scripts docs/knowledge MASTERPLAN.md TODO.md memory/MEMORY.md)
```

## 9. Open-Questions
- **CEO-Zone:** Gruppe C — cortex-Mechanik retiren (3 Hooks + 3 Commands rewiren) + beta-ops archivieren JETZT, oder als bewussten Folge-Schritt? (Beta ist LIVE → beta-ops evtl. noch nützlich.)
- **Autonom-Zone:** Teil 1 + Gruppe A.

## 10. Proof-Plan
`worklog/proofs/E0-W3-proof.txt` — `git check-ignore`-Output + `ls memory/` vorher/nachher + Broke-Ref-Grep leer.

## 11. Scope-Out
- KEIN `git rm` bestehender Binaries / Historie-Rewrite (= W4, separat, mit Backup).
- Gruppe B nicht anfassen.
- Gruppe C nur nach Anil-Entscheidung.

## 12. Stage-Chain
SPEC → IMPACT skipped (kein Service/RPC/Schema) → BUILD → REVIEW → PROVE → LOG

## 13. Pre-Mortem (optional, M)
- Archiviere ein noch-aktives File → Broke-Ref-Grep VOR jedem Move fängt das (AC-3).
- `.gitignore` zu breit → nur explizite Pfade, kein Wildcard auf `worklog/`.
