# Slice 230 — Stop-Hook Phase-Tracker-Reminder

**Status:** SPEC · **Größe:** XS · **Scope:** CTO · **Datum:** 2026-04-27

---

## 1. Problem Statement

Slice 214 Reviewer-Backlog-Item: "Stop-Hook → Phase-Tracker-Update bei feat/fix-Commits". Beim Heal-Wave dieser Session (224/225/226/227) habe ich `worklog/beta-phase.md` `findings_open` Counter manuell via `sed`-Edit aktualisiert — fehleranfällig, leicht vergessen.

**Wer betroffen:** Future-Slices die Findings closen — manuelle Counter-Updates sind eine wiederkehrende Quelle für Drift.

## 2. Lösungs-Design

**Pragmatic Reminder, nicht Auto-Update.** Auto-Update wäre fehleranfällig (welcher Finding genau geheilt? Tool kann nicht aus Commit-Msg auto-decrementieren).

Reminder-Hook auf Stop-Event:
- Read `worklog/active.md` — wenn `status: idle` (just transitioned) + letzte Commits haben `feat(NNN)` ODER `fix(NNN)` Prefix
- Prüfe ob in den letzten 3 Commits `worklog/beta-phase.md` modifiziert wurde
- Wenn NEIN: emit Reminder "Hast du beta-phase.md findings_open aktualisiert?"
- Wenn JA: still

**Skip-Conditions:**
- Audit-Slices ohne Code-Diff (ship-no-audit-slice.sh handles das schon)
- Pure-Tooling-Slices (`scripts/`-only, kein src/-Touch) — diese closen typischerweise keine Findings
- Pure-Docs-Slices (`worklog/`, `memory/`-only)

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `.claude/hooks/ship-phase-tracker-reminder.sh` | NEU | Stop-Hook Reminder-Script |
| `.claude/settings.json` | EDIT | Hook-Registration in `Stop`-Block |

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.claude/hooks/ship-kanban-sync.sh` | Vorbild — Stop-Hook der active.md liest | Pattern für status/slice-Parsing, exit 0 immer, cat-EOF Output |
| `.claude/hooks/ship-no-audit-slice.sh` | Vorbild — Stop-Hook mit git-log-Check | Pattern für Commit-Subject-Filter |
| `.claude/settings.json` Stop-Block | Hook-Registration | wo neuen Hook eintragen |
| `worklog/beta-phase.md` | Phase-Tracker-Format | findings_open YAML-Block — wie wäre auto-Detection möglich? |

## 5. Pattern-References

- `decisions.md` D35 — Self-Review für scripts/hooks-only
- `decisions.md` D52 (NEW im Slice 230?) — Reminder vs Auto-Update Trade-off

Eigentlich nicht D52 — kein neues Decision-Memo nötig, Hook ist Standard-Reminder-Pattern.

## 6. Acceptance Criteria

```
AC-1: [HAPPY] Hook fires nach feat/fix Slice-Commit ohne beta-phase.md update
  VERIFY: simulate Stop-Event mit active.md status=idle + letzten Commit feat(NNN) ohne beta-phase.md diff
  EXPECTED: Reminder ausgegeben mit "beta-phase.md update?"
  FAIL IF: kein Output

AC-2: [SKIP] Hook silent wenn beta-phase.md im letzten Commit included
  VERIFY: simulate Stop-Event mit feat-Commit der beta-phase.md modifiziert
  EXPECTED: silent (kein Output)
  FAIL IF: Reminder fired falsely

AC-3: [SKIP] Hook silent für tooling-Slices (scripts/-only)
  VERIFY: simulate Stop-Event mit feat(228) Slice 228 (scripts/-only)
  EXPECTED: silent ODER Reminder (Decision: erlaubt False-Positive — Mensch kann ignorieren)
  Acceptable: Reminder ist OK, Pattern ist nicht-blocking

AC-4: [REGISTRATION] Hook in settings.json registriert
  VERIFY: grep "ship-phase-tracker-reminder" .claude/settings.json
  EXPECTED: ≥1 hit
  FAIL IF: 0 hits

AC-5: [EXEC] Hook executable + exit 0
  VERIFY: bash .claude/hooks/ship-phase-tracker-reminder.sh; echo $?
  EXPECTED: exit 0 (kein crash)
  FAIL IF: non-zero exit
```

## 7. Edge Cases

| # | Case | Expected | Mitigation |
|---|------|----------|------------|
| 1 | Erste Stop nach git clone (kein worklog/active.md) | exit 0 silent | check `[ -f "$ACTIVE" ]` |
| 2 | active.md status: in-progress (slice noch aktiv, kein chore) | silent | nur bei status=idle reminden |
| 3 | Letzter Commit ist chore/docs (nicht feat/fix) | silent | Subject-Filter |
| 4 | Commit-Subject hat heredoc | tolerieren | grep-only, kein parse |
| 5 | Multi-feat-Commit-Wave (224+225+226+227 alle in einer Session) | Reminder pro Wave OK | Hook fires multiple times, kein State-Tracking |

## 8. Self-Verification Commands

```bash
chmod +x .claude/hooks/ship-phase-tracker-reminder.sh
bash .claude/hooks/ship-phase-tracker-reminder.sh; echo $?
grep "ship-phase-tracker-reminder" .claude/settings.json
```

## 9. Open-Questions

**Pflicht-Klärung:** keine — Reminder-Pattern bekannt aus ship-kanban-sync.sh.

**Autonom-Zone:**
- Genaue Reminder-Wording
- Wieviele letzten Commits geprüft werden (3? 5?)

## 10. Proof-Plan

`worklog/proofs/230-phase-tracker-reminder.txt` — Hook-Run-Output mit Test-Szenarien.

## 11. Scope-Out

- **Auto-Update von findings_open:** zu fehleranfällig, nicht in Slice-Scope
- **Pre-Commit-Hook:** würde Commits BLOCKEN — zu strikt für Reminder-Use-Case
- **Tooling-Slice-Detection:** Heuristik zu schwierig (scripts-only? oder mixed?). Akzeptiere False-Positive.

## 12. Stage-Chain

```
SPEC → IMPACT (skipped — hook-only) → BUILD → REVIEW (self-review D35) → PROVE → LOG
```
