# Active Slice

```
status: idle
slice: E0-W2b
title: ✅ DONE — Wissens-Basis migriert (18 Gold-Files → docs/knowledge/, 3-Schichten-Kanon)
stage: LOG complete
size: L
type: Doc + Decision
spec: worklog/specs/E0-W2b-knowledge-migration.md
review: worklog/reviews/E0-W2b-review.md (PASS, 3 NIT; #1 gefixt, #2/#3 → W2c/optional)
proof: worklog/proofs/E0-W2b-proof.txt
parent: worklog/specs/E0-operating-system-knowledge-base.md (Epic E0, Welle 2)
done_E0W2b: 18 Content-Files in docs/knowledge/{domain12,decisions1,lessons4,research1}, 6-Feld-Frontmatter, INDEX Routing-SSOT (alle Pfade umgebogen), 18 Alt-Originale → Redirect-Stubs, Live-Pointer (trading.md + decisions.md D83/D84/D86) auf Kanon, cortex-index SUPERSEDED-Banner. Money-Kanon (treasury/polls) selbst gemacht (§3), Reviewer-bestätigt 1:1. Decisions-Merge D28→D39 + D62/65/67. audit:knowledge 0 HARD/0 SOFT.
next: E0-W2c (≈90 ephemere memory-Files → _archive, Stubs entfernen, cortex-index physisch ablösen) → W3 Hygiene (Screenshots gitignoren) → W4 Historie. LOW: Orphan-Pfad-Casing-Härtung (scripts/audit-knowledge.ts).
```

## Kanon-Modell (Anil 2026-06-17, gilt fort)
docs/knowledge/domain = WIE (Kanon-Inhalt, alle Zahlen) · memory/decisions.md = WARUM (+Link) · .claude/rules = schlanke Code-Regel + Zeiger. Jede neue/migrierte docs/knowledge-Datei: 6 Frontmatter-Felder + INDEX-Zeile mit consult_when, sonst Pre-Commit-Block (audit:knowledge:check).

## Money-SSOTs (NIE neu erarbeiten)
- **Treasury/CSF (D83):** `docs/knowledge/domain/treasury.md` (Kanon, RAUS-Kanäle 329-332 DONE). Nächstes Money-Stück = **Polls (REIN, D86):** `docs/knowledge/domain/polls.md` — `community_polls` hat KEINE Erstellung (Hülle ohne Tür), Roadmap P1-P4.
- Money-Slice-Muster (329-332): Live-functiondef VOR Spec (D87) · trigger-zentrisch · Guard `ledger_net − offene withdrawals` unter `clubs FOR UPDATE` · force-rollback-Smokes.
