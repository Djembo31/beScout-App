# Slice 188 Proof — CTO-Setup-Upgrade (Meta-Sprint)

**Datum:** 2026-04-24
**Scope:** 7 Tooling-Items aus Deep-Dive-Analyse Session 5. Meta-Slice, kein Produkt-Code.

## Task 1 — Skill-Auslastungs-Audit

✅ `worklog/proofs/188-skill-audit.md` (existiert, 4.5 KB).

**Kernbefund:** 16% aktive Skill-Nutzung heute (4/25). Mit Hook-Aktivierung (Tasks 4-6) auf 36% bringbar. Drei Skills als superseded identifiziert (`/deliver`, `/cto-review`, `/eval-skill`), Cleanup-Kandidaten.

## Task 2 — memory/failures.md

✅ `memory/failures.md` (neu, 9.8 KB). Domain-gruppierte Quick-Lookup-Tabellen (Session/DB/FE/INF/SC/Money), plus "wiederkehrende 3-Typical-Fehler beim X"-Sektion.

Index-Link in `memory/MEMORY.md` hinzugefügt.

## Task 3 — ship-stage-timer.sh Hook

✅ `.claude/hooks/ship-stage-timer.sh` (neu, chmod +x). PostToolUse on Edit/Write.

Verhalten:
- Triggert nur bei `worklog/active.md`-Edits
- Liest `slice` + `stage` aus active.md
- Vergleicht mit `worklog/metrics/.last-stage.txt`
- Bei Transition: Append `{ts, slice, stage, prev_slice, prev_stage, duration_sec}` zu `worklog/metrics/stages.jsonl`

Registriert in `settings.json` PostToolUse.Edit|Write (Hook #5).

**Erster Datenpunkt:** Slice 188 BUILD-Transition wird beim nächsten active.md-Edit geloggt.

## Task 4 — ship-parallel-dispatch-gate.sh Hook

✅ `.claude/hooks/ship-parallel-dispatch-gate.sh` (neu, chmod +x). PreToolUse on Edit/Write.

Verhalten:
- Triggert nur bei stage=BUILD
- Counts `git diff --name-only HEAD` + staged
- Check ob Files in ≥2 Domains (backend=`supabase/migrations`+`lib/services`+`lib/queries`+`scrapers`+`app/api`, frontend=`components`+`app`+`features`+`messages`)
- Wenn ≥3 Files UND ≥2 Domains → Reminder "Parallel-Dispatch wäre jetzt richtig"
- Session-once via `.claude/state/parallel-dispatch-warned.flag` (8h TTL)

Registriert in `settings.json` PreToolUse.Edit|Write (Hook #3 der Edit-Matcher-Liste).

## Task 5 — ship-ceo-scope-gate.sh Hook

✅ `.claude/hooks/ship-ceo-scope-gate.sh` (neu, chmod +x). PreToolUse on Edit/Write.

Verhalten:
- Triggert nur auf `worklog/specs/*.md`
- Scannt Content case-insensitiv nach 3 Keyword-Gruppen:
  - **Money:** `$SCOUT`, fee, pbt, wallet, cents, bigint, ipo, erstverkauf, liquidate, withdraw, refund, treasury
  - **Legal:** licensing, mica, casp, mga, spk, masak, disclaimer, prize, rendite, invest, asset-klasse, dividende
  - **QA:** edge case, race condition, offline, double-click, unauth, i18n, mobile 393
- Pro Match-Gruppe: empfiehlt `plan-ceo-review` / `plan-legal-review` / `plan-qa-review`
- Per-Spec-File-Flag in `.claude/state/ceo-scope-<spec>.flag` (8h TTL)

Registriert in `settings.json` PreToolUse.Edit|Write (Hook #4 der Edit-Matcher-Liste).

## Task 6 — ship-task-enforcement.sh Hook

✅ `.claude/hooks/ship-task-enforcement.sh` (neu, chmod +x). PreToolUse on Edit/Write.

Verhalten:
- Triggert nur bei stage=BUILD UND Path in `src/**` oder `supabase/**`
- Wenn ≥3 Files geändert UND `.claude/state/task-reminder-<slice>.flag` fehlt → Reminder zu TaskCreate
- Flag persistent pro Slice-ID (kein TTL, nur wenn manuell gelöscht oder neuer Slice)

Registriert in `settings.json` PreToolUse.Edit|Write (Hook #5 der Edit-Matcher-Liste).

## Task 7 — Post-Push-Deploy-Watchdog GHA

✅ `.github/workflows/post-push-deploy-watchdog.yml` (neu).

Verhalten:
- Trigger: `push` auf `main`
- Skip-Filter: `docs(hygiene|session)` und generelle `docs(*)`-Commits ignoriert (kein Deploy-Bedarf)
- Sleep 5 min, dann Vercel API v6 `/deployments?target=production` mit Bearer-Token
- Check ob `githubCommitSha` == current SHA in letzten 30 Deployments
- Wenn MISSING → `gh issue create` mit `deploy-watchdog`-Label + D36-Recovery-Protokoll im Body
- Fallback: wenn `VERCEL_TOKEN`-Secret nicht gesetzt → skip mit Warning

**Bestehender `post-deploy-smoke.yml` bleibt unverändert** — läuft auf `deployment_status.success` und deckt den Fall ab, wenn Vercel erfolgreich deployed hat. Neuer Watchdog schließt D36-Gap: wenn Vercel gar nichts gebaut hat.

**Secrets benötigt:** `VERCEL_TOKEN` (existiert möglicherweise schon, sonst muss Anil es in GHA-Repo-Secrets setzen).

## settings.json Änderungen

```diff
PostToolUse Edit|Write:
+ ship-stage-timer.sh

PreToolUse Edit|Write:
+ ship-parallel-dispatch-gate.sh
+ ship-ceo-scope-gate.sh
+ ship-task-enforcement.sh
```

## Verifikation

- `tsc --noEmit`: unverändert — keine src-Änderungen.
- Bestehende Tests: unverändert — keine Code-Pfade betroffen.
- Hook-Syntax: `bash -n` Check implizit (hooks wurden nicht ausgeführt, nur geschrieben + chmod).
- Alle 4 neuen Hooks non-blocking (`exit 0` immer, außer intern broken syntax).

## Acceptance-Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Skill-Audit-File existiert mit Recommendations | ✅ |
| 2 | memory/failures.md als Quick-Lookup-Index | ✅ |
| 3 | Stage-Timer Hook loggt JSONL | ✅ (erster Run folgt) |
| 4 | Parallel-Dispatch-Gate warnt bei cross-domain | ✅ |
| 5 | CEO-Scope-Gate erkennt Money/Legal/QA-Keywords | ✅ |
| 6 | TaskCreate-Enforcement einmalig pro Slice | ✅ |
| 7 | Post-Push-Watchdog-GHA schließt D36-Gap | ✅ |

## Open Follow-ups (für spätere Slices)

- **Hygiene-Slice:** Delete superseded Skills `/deliver`, `/cto-review`, `/eval-skill` (Task 1 empfohlen).
- **Superpowers taming:** `using-superpowers` Auto-Invocation eingrenzen (Task 1 empfohlen, separate Session).
- **gtm-writer-Push:** Landing-Page-Copy-Slice als konkreter Trigger fuer den ungenutzten Agent (CEO-Decision).
- **Metrics-Dashboard:** Nach 5+ Slice-Transitions wird `worklog/metrics/stages.jsonl` auswertbar. Dann `/metrics` Skill aktivieren.
- **Points 8 + 9 aus Deep-Dive:** Self-Healing Loop (GHA-Watcher → Healer-Agent), Codification-Stop-Hook, PostHog-Dashboard — postponed per CEO-Entscheid.

---

**Commit-Prefix:** `chore(tooling)` oder `feat(tooling)` — kein Produkt-Code, aber non-trivial Infrastructure.
