# Active Slice

```
status: idle
slice: 441
title: K3 docs/plans — 142 Specs+Müll gelöscht (147→5), 5 Anker → K2 — DONE
size: XS
type: Doc
stage: LOG (DONE)
spec: inline (Ops-Lane, Doc, money-neutral, nicht user-facing)
impact: inline (142 Doc-Deletions, 5 referenzierte behalten, 0 Code)
proof: worklog/proofs/441-k3-docs-plans.txt
review: self-review PASS (Ops-Lane; 0 dangling Grep-verifiziert, 5 Anker → K2)
```

## Spec (inline, Ops-Lane — Slice 352)

**Problem (Evidence: MASTERPLAN K3 + Recon):** `docs/plans/` = 147 Dateien (2.9 MB). 142 unreferenzierte März/April-Feature-Specs (done-features) + 2 one-off Writer-Scripts + 3 ungetrackte `bes*.json`-Perf-Tasks. CEO-Entscheid (AskUserQuestion 2026-06-29): **Löschen (git=Archiv)**.

**Plan:**
1. `bes26/27/28.json` (Player-Detail-Perf-Tasks) in MASTERPLAN **W6** falten (1 Zeile), dann löschen.
2. Löschen: 142 historische Specs + `_stdin_writer.js` + `_writer.js` + 3 `bes*.json`.
3. **BEHALTEN → K2** (lebende Anker): `2026-06-24-scout-card-value-model-spec` (D100/treasury) · `2026-04-10-bescout-liga-spec` (bescout-liga.md) · `2026-04-08-transactions-history-spec` · `2026-04-02-jarvis-cortex-design/plan`.

**Schnitt-Regel (§0):** nur die 5 referenzierten behalten = 0 dangling. Re-Grep nach Löschung Pflicht.

**Acceptance:** AC-1 142+2+3 weg (~147→5) · AC-2 5 Anker intakt · AC-3 0 dangling (Re-Grep) · AC-4 bes-Tasks in W6 erhalten.

**Proof:** `worklog/proofs/441-k3-docs-plans.txt`. **Review:** self-review (Ops). **Scope-Out:** K2 (5 Anker-Migration + Ref-Umbiegung), K6/K7.
**Stage-Chain:** SPEC → IMPACT(inline) → BUILD → REVIEW(self) → PROVE → LOG.

## Zuletzt

- **Slice 440** (2026-06-29) — K4 root-Entrümpelung, 16 Müll-Files −4612 Z. (XS, self-review PASS).
- **Slice 439** (2026-06-28) — K1 Meta-Cleanup, 11 tote Tracker/notes −853 Z. (XS).
- **Slice 438** (2026-06-28) — Auditor-Agents 4→2 (S).

Nächstes: K2 (Wissens-Heimat-Migration: 18 Anker [13 notes + 5 plans] + Skill-Trees, L) oder K6/K7.
