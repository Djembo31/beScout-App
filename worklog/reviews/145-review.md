# Slice 145 Review — 2026-04-22

**Verdict:** PASS (mit 2 NITPICK doc-drift Fixes vor Commit empfohlen)

**Scope reviewed:**
- `.claude/hooks/ship-cto-review-gate.sh` (rewrite, 111 Zeilen, strict-block)
- `.claude/rules/workflow.md` (REVIEW-Stage 3b hinzugefügt, Header "6 Stufen")
- `worklog/reviews/` (Dir erstellt)
- `.claude/settings.json` Z.50-52 (Hook bereits registered in PreToolUse.Bash-Chain)

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | MEDIUM | ship-cto-review-gate.sh Z.26 | `*"merge"*) exit 0` matched zu promiskuös: Commit-Messages mit "merge" drin (z.B. `fix(api): prevent merge conflict`) überspringen den Hook. Bekannter Bug aus proof-gate Z.26 — Konsistenz, aber Bug ist Bug. | Backlog 146 XS: Matcher auf `*" merge "*\|*"git merge "*` einschränken. Fix symmetrisch in proof-gate. |
| 2 | LOW | ship-cto-review-gate.sh | `-F <file>` / `--file` commit bypassed (kein `-m` → MSG_PREFIX leer → exit 0). | Known-bypass, fast nie in CLI-Claude-Workflow. Dokumentieren. |
| 3 | LOW | ship-cto-review-gate.sh Z.61 | `tr -d ' '` strippt nur Space, nicht Tab/CR. Bei Windows-CRLF edge-case fragil. | NITPICK XS: `tr -d '[:space:]'` statt `tr -d ' '`. |
| 4 | NITPICK (FIXED) | workflow.md Gates-Tabelle | `ship-cto-review-gate` fehlt in Gates-Tabelle. | **Gefixt vor Commit**. |
| 5 | NITPICK (FIXED) | workflow.md LOG-Template Z.131-138 | Stage-Chain-Template zeigt `SPEC → IMPACT → BUILD → PROVE → LOG`, nach 6-Stufen-Update sollte `→ REVIEW → PROVE → LOG`. | **Gefixt vor Commit**. |
| 6 | NITPICK | Active.md-Template | Neuer `review:` Key sollte auch in `/ship new`-Template initialisiert werden. | Backlog 147 XS: /ship Skill-Template updaten. |
| 7 | NITPICK | Bypass-File | `touch <file>` erzeugt Empty-File als "Review" — optisch wertlos. | Optional: mindestens `verdict: SKIPPED` minimal-content. Pragmatisch wie derzeit OK. |

## Positive

- **Rewrite-over-Mutation:** Alter Hook checkte `status=active` das nie gesetzt wurde → tot. Rewrite statt Flag-Fix war richtig.
- **Heredoc-Closure:** Bewusste Abkehr von proof-gate's heredoc-exempt. Rationale dokumentiert.
- **Klare User-Messages:** 3 Escape-Pfade (Agent-Dispatch / Skill / Emergency-Touch) mit copy-paste-ready Template.
- **Prefix-Detection multipath:** grep + sed-Fallback robust gegen verschiedene Commit-Formate.
- **Hook-Chain-Konsistenz:** Reviewer läuft NACH Proof-Gate — semantisch richtig (Proof objektiv älter als Review im Workflow).

## Konsistenz-Checks

- Exempt-Matrix symmetrisch mit proof-gate wo sinnvoll (amend, merge, non-feat/fix, emergency-slice).
- Divergiert wo bewusst (heredoc nicht mehr exempt — Rationale in Header-Comment).
- Dogfood-Test: Hook blockt bis dieses File physisch in `worklog/reviews/` liegt.

## Bypasses geprüft

- `--no-verify` bypassed Git-native hooks, NICHT Claude's PreToolUse-Hooks. Safe ✓
- `cherry-pick` / `rebase --continue`: Commit-String hat nicht "git commit" → exit 0 via outer case. Safe (konsistent mit proof-gate).
- `GIT_EDITOR` ohne `-m`: kein `-m`-Argument → MSG_PREFIX leer → exit 0. Known-bypass (gleich für proof-gate + spec-gate).

## Follow-ups (Backlog)

- **146 XS:** `*"merge"*` wildmatch einschränken + symmetrisch in proof-gate fixen. Pattern-Kandidat für common-errors.md Section 7: "Shell-case auf COMMAND-String muss anchoren, nicht wild matchen".
- **147 XS:** `/ship new` Skill-Template um `review:` Key erweitern.

**Time-spent:** ~30 min
