---
name: Agent-Briefing-Template
description: Standard-Template für Agent-Dispatches. Erzwingt Token-Budget + Worktree-CWD + Self-Verify. Ferrari 10/10 Upgrade H5+H7.
type: reference
---

# Agent-Briefing-Template

Nutze diesen Template als Include in jedem Agent-Dispatch (frontend/backend/healer/test-writer). Garantiert konsistente Qualität.

---

## Template

```
KONTEXT:
[Was + Warum + Business-Hintergrund — kurz aber vollständig]

TOKEN-BUDGET:
- Max ~80 tool-uses. Priorisiere Tasks strikt.
- Bei Tool-Limit-Erreichen: STOP + committe was fertig ist.

WORKTREE-AWARENESS (kritisch für isolation):
- Wenn isolation="worktree": ALLE Bash-Commands MUST mit `cd $WORKTREE_PATH && ...`
- Absolute File-Paths in Read/Write/Edit: nutze $WORKTREE_PATH/src/..., NICHT /c/bescout-app/src/...
- Git commit NUR im Worktree: `cd $WORKTREE_PATH && git add ... && git commit ...`
- Verify nach Commit: `git -C $WORKTREE_PATH log --oneline -1`

SCOPE:
[Exakte Aufgaben als Liste, nicht als Prosa]
1. ...
2. ...

CONSTRAINTS:
- Mobile-First 393px
- DE+TR i18n Parität (neue Keys in BEIDEN Files)
- common-errors.md Patterns einhalten
- `memory/` NICHT im Commit (außer explizit erlaubt)

VERIFY (PRE-COMMIT):
1. `npx tsc --noEmit` — CLEAN
2. `npx vitest run <betroffene Tests>` — green
3. Grep-Check für Pattern-Regressions:
   - <Agent-spezifische greps>

SELF-VERIFY (NACH ARBEIT, VOR COMMIT):
- [ ] Alle neuen i18n-Keys in de.json + tr.json vorhanden?
- [ ] Alle geänderte Service-throws nutzen mapErrorToKey (nicht raw)?
- [ ] Alle neue CREATE OR REPLACE FUNCTION haben REVOKE-Block?
- [ ] Consumer-Impact: Types/Services-Changes → alle Callsites auditiert?
- [ ] Modal mit Mutation → preventClose gesetzt?
- [ ] TR-Strings die ich schreibe → in memory/tr-review-queue.md appended?

COMMIT-MESSAGE-PATTERN:
`<type>(<scope>): <description> — <issue-or-AR>`
Beispiele:
- `fix(beta): J7-AR-55 Streak-Description neutralized`
- `feat(beta): Rate-Limit Config-Tier (J8-AR-55)`

BERICHT (Agent → CTO):
- Pro SCOPE-Item: DONE | DEFERRED (+ Grund) | BLOCKED
- Files geändert (Liste)
- tsc + Tests Status
- Commit-Hash (oder "main" wenn isolation broken)
- TR-Strings-Count (für Review-Queue)
- LEARNINGS-Draft-Path (falls geschrieben)
```

---

## Konkretisierungen pro Agent-Typ

### frontend-Agent (isolation: worktree)
- ⚠️ KRITISCH: isolation ist bekannt-broken. Briefing MUSS Worktree-Awareness enthalten.
- Pre-Commit npm run audit:compliance läuft automatisch via settings.json hook.

### backend-Agent (isolation: worktree)
- Migrations via `mcp__supabase__apply_migration` direkt (kein Worktree-File nötig für apply — aber File für Git-History)
- REVOKE-Block PFLICHT in jedem CREATE OR REPLACE FUNCTION.

### healer-Agent (main-repo, kein Worktree)
- Arbeitet auf bestehenden Fehlern, nicht Features.
- Muss VOR Fix: Root-Cause-Verify via Grep + Consumer-Check.

### test-writer-Agent (isolation: worktree, NIE Implementation sehen)
- Schreibt Tests ONLY basierend auf Spec.
- Tests MÜSSEN fehlschlagen initial — sonst nicht echt test-driven.

### reviewer-Agent (read-only)
- Liest: common-errors.md + business.md + journey-X-aggregate.md
- VERDICT: PASS | REWORK | FAIL — kein CONCERNS (Entscheidung klar).
- Max 500 Worte output.

---

## Ferrari-Quality-Check

Jeder Agent muss vor "PASS-Meldung" durchlaufen:

1. **tsc CLEAN** (not "should pass" — beweisen)
2. **Affected Tests GREEN** (Output dokumentieren)
3. **Compliance-Grep CLEAN** (`bash scripts/audit/compliance.sh`)
4. **i18n-Parität** (`node scripts/audit/i18n-coverage.js`)
5. **Self-Verify-Checklist** (oben) — jeder Punkt explizit

Wer das skippt: REWORK garantiert.
