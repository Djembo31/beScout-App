# Active Slice

```
status: active
slice: E0-W3
title: Hygiene — Binärmüll-Stop (.gitignore) + Root-Vault-Archivierung
stage: LOG
size: M
type: Doc + Hygiene
spec: worklog/specs/E0-W3-hygiene-gitignore-vault.md
impact: skipped (kein Service/RPC/Schema — reine Doku-/Config-Hygiene)
review: worklog/reviews/E0-W3-review.md (PASS, 1 pre-existing NIT)
proof: worklog/proofs/E0-W3-proof.txt
decision_gruppeC: Anil → KONSERVATIV. Nur Teil1 + Gruppe A. Gruppe C (cortex-Trio + beta-ops) = eigener Folge-Slice.
parent: worklog/specs/E0-operating-system-knowledge-base.md (Epic E0, Welle 3)
scan_E0W3: Broke-Ref-Grep über Live-Schicht ergab 3 Gruppen — A=verwaist (~17, nur Crash-Backups+Kommentare) → archivieren · B=aktiv (beta-rollback/sentry-runbook, von INDEX.md geroutet) → behalten · C=live verdrahtet (session-digest/working-memory/current-sprint in Hooks/Commands + beta-ops via MEMORY.md/Skills) → Anil-Scope-Frage.
next: Teil1 .gitignore + Gruppe-A-Archiv autonom; Gruppe C nach Anil-Entscheidung. Dann W4 Historie. Danach Polls (E1).
```

## Wissens-Heimat — Endstand E0 Welle 2 (W2a+W2gov+W2b+W2c)
- **Kanon:** `docs/knowledge/{domain,decisions,lessons,research}/` (18 Files) · **Routing-SSOT:** `docs/knowledge/INDEX.md` (consult_when, auto-injiziert) · **Gate:** `audit:knowledge` (pre-commit HARD / nightly SOFT, D88).
- **3-Schichten:** domain=WIE (Kanon) · decisions.md=WARUM+Link · .claude/rules=schlanke Regel+Zeiger.
- `memory/cortex-index.md` abgelöst (→ _archive). `memory/semantisch|deps|features` weitgehend geleert (Kanon migriert, Rest archiviert). `memory/learnings/` bleibt aktiv.

## Money-SSOTs (NIE neu erarbeiten)
- Treasury/CSF (D83): `docs/knowledge/domain/treasury.md` (RAUS-Kanäle 329-332 DONE). Polls (D86, REIN, nächstes Money-Stück): `docs/knowledge/domain/polls.md` — community_polls hat KEINE Erstellung.
