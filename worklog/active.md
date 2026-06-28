# Active Slice

```
status: idle
slice: 439
title: K1 Meta-Cleanup — tote Tracker-Dubletten + worklog/notes Konsolidierung — DONE
size: XS
type: Doc
stage: LOG (DONE)
spec: inline (Ops-Lane, Doc, money-neutral, nicht user-facing)
impact: inline (11 Doc-Deletions, 0 Code/Consumer berührt)
proof: worklog/proofs/439-k1-cleanup.txt
review: self-review PASS (Ops-Lane; Referenz-Integrität Grep-verifiziert, 0 dangling)
```

## Spec (inline, Ops-Lane — Slice 352)

**Problem (Evidence: MASTERPLAN K1 + Recon 2026-06-28):** TEIL-A-Doc-Akkretion. Tote Tracker-Dubletten + 24 Plan-/Slice-Artefakte in `worklog/notes/` blähen Repo + Lade-/Token-Last. Verstößt gegen Stand-SSOT-Regel (Slice 430): Pläne nur in `MASTERPLAN.md`, Status nur im Handoff, Historie in `log.md`, Warum in `decisions.md`.

**Plan:**
1. 3 sichere tote Tracker-Dubletten löschen — root `session-handoff.md` (3 Mon alt, Dublette zu `memory/`), `docs/TODO.md` (Dublette zu root `TODO.md`), `docs/WORKFLOW.md` (Feb-9, Dublette zu `.claude/rules/workflow.md`). Je nach Peek + Inbound-Referenz-Grep.
2. `worklog/notes/` 24 Dateien: Inbound-Referenz-Grep → tote Slice-Artefakte (durabler Wert in git/log.md/decisions.md archiviert, 0 lebende Referenzen) löschen.
3. **BEHALTEN (NICHT anfassen):** `disease-register.md` (aktive `audit:dup`-Dependency → wandert in K2) + jede Datei mit lebenden Inbound-Referenzen (→ K2 Wissens-Migration oder Referenz-Cleanup).

**Schnitt-Regel (§0):** kein dangling reference nach Löschung. Inbound-Grep ist Pflicht VOR jedem Delete.

**Acceptance:**
- AC-1: 3 tote Tracker-Dubletten weg. VERIFY: `ls` → not found.
- AC-2: `worklog/notes/` nur noch lebende Evidenz. VERIFY: `ls worklog/notes/` zeigt behaltene Liste.
- AC-3: 0 dangling refs. VERIFY: grep der gelöschten Basenames über src/memory/docs/.claude/MASTERPLAN/TODO → 0.
- AC-4: `audit:dup` weiter grün (disease-register intakt). VERIFY: `pnpm audit:dup:check`.

**Self-Verification:** `git rm --stat` · grep dangling · `pnpm audit:dup:check`.
**Proof-Plan:** `worklog/proofs/439-k1-cleanup.txt` (Referenz-Grep + git-stat + audit-Output).
**Scope-Out:** K2 (Wissens-Heimat-Migration), K3 (docs/plans), K4-K7. disease-register-Migration = K2.
**Stage-Chain:** SPEC → IMPACT(inline) → BUILD → REVIEW(self) → PROVE → LOG.

## Zuletzt

- **Slice 438** (2026-06-28) — Auditor-Agents 4→2 (S, self-review PASS).
- **Slice 437** (2026-06-28) — workflow.md Slim 539→420 (S).
- **Slice 436** (2026-06-28) — Hook FIX-Pass-2 32→28 (S).

Nächstes: K1 → dann TEIL A weiter (K2 Wissens-Heimat / K3 docs-plans) oder Workflow-Test-Retro.
