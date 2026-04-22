# Slice 146 — Proof-Gate + Review-Gate Merge-Pattern Anchor + Heredoc-Backdoor Fix (XS)

**Datum:** 2026-04-22
**Groesse:** XS (2 Files, gleiches Pattern)
**CEO-Scope:** nein (CTO-internes Hook-Tooling)

## Ziel

Beide Commit-Gates symmetrisch haerten: `*"merge"*`-wildcard auf `git merge` command-token anchorn, heredoc-Backdoor aus `ship-proof-gate.sh` entfernen (review-gate hat das schon in 145 getan).

## Betroffene Files

- `.claude/hooks/ship-proof-gate.sh` — merge-anchor + heredoc-exempt entfernen + grep-basierte MSG-Extraktion wie review-gate
- `.claude/hooks/ship-cto-review-gate.sh` — merge-anchor-Fix (Finding #1 aus 145-Review)

## Acceptance Criteria

1. Commit-Message mit `"fix(api): prevent merge conflict"` wird NICHT mehr geskipped (merge-pattern anchor auf `git merge `).
2. Commit via heredoc (`git commit -m "$(cat <<EOF ... EOF)"`) wird NICHT mehr geskipped (heredoc-exempt entfernt).
3. Echtes `git merge <branch>` Command bleibt exempt.
4. `git commit --amend` bleibt exempt.
5. Bestehende Proof-Verification (file existence, emergency-slice warn, feat/fix/refactor-Trigger) unveraendert.

## Edge Cases

- Heredoc ohne feat/fix/refactor-Prefix → faellt bei Z.42-45 raus (non-feat → exit 0). Bleibt so.
- MSG-Parse leer nach heredoc-Entfernung → Z.39 `[ -z "$MSG" ] && exit 0` fangt ab. Bleibt so.
- `git merge --no-edit` → kein `--merge` Flag, matched `*"git merge "*` via Commando-Token. OK.
- `git commit -m "feat(ci): merge matrix setup"` → nicht mehr geskipped (gewollt).

## Proof-Plan

`worklog/proofs/146-hook-test.txt`: 4 manuelle Hook-Runs mit unterschiedlichen JSON-Stdin-Inputs:
- (a) `git merge main` → exit 0 (merge-command exempt, korrekt)
- (b) `git commit -m "fix(api): prevent merge conflict"` → ohne Proof: exit 2 (NICHT mehr faelschlich exempt)
- (c) `git commit -m "$(cat <<EOF ... EOF)"` feat-Heredoc → ohne Proof: exit 2 (NICHT mehr exempt)
- (d) `git commit --amend` → exit 0 (amend exempt, korrekt)

## Scope-Expansion (waehrend BUILD + nach Review entdeckt)

**3. Broken `\b` word-anchor in grep-Pattern** (waehrend BUILD):
`grep -oE "\b(feat|fix|refactor)[(:]..."` matched bei JSON-escaped Heredoc nicht. Char vor `feat` ist `n` aus `\n`-Escape → word-char blockt `\b`. Folge: review-gate (Slice 145) war fuer ALLE heredoc-Commits effektiv exit 0. Fix: `\b` weg, `[(:]`-Suffix reicht.

**4. Command-Token-Anchor fuer merge + --amend** (aus 146-Review Finding #1+2):
Reviewer fand: `*"git merge "*` matched Commit-Messages mit `git merge ` als Text. `*" --merge "*` matched `--merge` als Wort im Message. Same-bug-class. Fix: `case ... in "git merge"|"git merge "*)` (start-of-command) + `UNQUOTED=$(sed strip)` fuer `--amend`-check.

**5. Outer `*"git commit"*` Substring-Match** (self-discovered waehrend Rework):
Test-Scripts die Fixture-Strings wie `'git commit -m "fix(x)"'` als Argument uebergeben wurden false-triggert. Fix: `case ... in "git commit"|"git commit "*)`.

**6. REVIEW-Stage in spec-gate Whitelist** (aus 146-Review Finding #6):
Slice 145 fuehrte REVIEW-Stage ein, aber spec-gate Z.71 Whitelist war `BUILD|PROVE|LOG`. Healer-Edits waehrend REVIEW wuerden blockiert. Fix: `BUILD|REVIEW|PROVE|LOG`.

**7. Emergency-Warn-Symmetrie** (aus 146-Review Finding #3):
review-gate emergency-slice silent, proof-gate warnt. Symmetrie wiederhergestellt.

**Kein triviales Pattern-Copy mehr** — 3 Files geaendert, 7 Issue-Typen gefixt. Review Pflicht, war dispatched.

## Scope-Out

- `-F <file>` / `--file` Commit-Bypass (Finding #2 aus 145 Review) — selten im Claude-Workflow, eigener Slice.
- Spec-Gate Konsistenz-Check — nicht teil der 146-Aufgabe, eigener Slice wenn ueberhaupt.
