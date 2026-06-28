# Active Slice

```
status: idle
slice: 440
title: K4 root-Entrümpelung (16 Müll-Dateien, −4612 Z.) + gitignore-Prävention — DONE
size: XS
type: Doc
stage: LOG (DONE)
spec: inline (Ops-Lane, Doc, money-neutral, nicht user-facing)
impact: inline (16 root-Deletions + .gitignore-Prävention, 0 Code/Consumer)
proof: worklog/proofs/440-k4-root-cleanup.txt
review: self-review PASS (Ops-Lane; 0 dangling Grep-verifiziert, legit-Files geschützt)
```

## Spec (inline, Ops-Lane — Slice 352)

**Problem (Evidence: MASTERPLAN K4 + Recon 2026-06-28):** root-Verschmutzung. 13 getrackte Müll-Dateien (3× 0-Byte Heredoc-Artefakte `Current`/`Date:`/`Scope:`, one-off `clean_orphan.py`, 7× qa-Snapshot/State, 2× qa-Log). 0 lebende Inbound-Refs.

**Plan:**
1. 13 root-Müll-Dateien `git rm` (Liste unten).
2. `.gitignore`: root-anchored `qa-*-snapshot.md` + `qa-*.log` + `after-join-state.md` → Prävention (self-renewing QA-Output).
3. **NICHT anfassen:** `bencium-claude-code-design-skill/` (Plugin-Dir, potenziell aktiv → K2) · `AGENTS.md` (Config).

**Schnitt-Regel (§0):** Inbound-Grep gelaufen → 0 lebende Refs (nur MASTERPLAN-K4-Lösch-Anweisung).

**Acceptance:** AC-1 13 Müll-Files weg · AC-2 `.gitignore`-Pattern greift (re-add wird ignoriert) · AC-3 0 dangling · AC-4 `bencium/`+`AGENTS.md` unberührt.

**Proof:** `worklog/proofs/440-k4-root-cleanup.txt`. **Review:** self-review (Ops). **Scope-Out:** K2 (bencium-Plugin + .agents-Tree + wiki/), K3 (docs/plans 147).
**Stage-Chain:** SPEC → IMPACT(inline) → BUILD → REVIEW(self) → PROVE → LOG.

## Zuletzt

- **Slice 439** (2026-06-28) — K1 Meta-Cleanup, 11 tote Tracker/notes −853 Z. (XS, self-review PASS).
- **Slice 438** (2026-06-28) — Auditor-Agents 4→2 (S).
- **Slice 437** (2026-06-28) — workflow.md Slim 539→420 (S).

Nächstes: K2 (Wissens-Heimat-Migration, L) oder K3 (docs/plans 147).
