# Slice 282a — Ops-Recovery nach 5-Wochen-Pause

**Größe:** M
**Slice-Type:** GHA | Tool | Doc (kein Service/RPC/DB)
**Datum:** 2026-06-11
**CEO-Scope:** Nein (kein Money/Security/Business-Wording; beta-phase.md-Korrektur dokumentiert Anils eigene D71-Entscheidung)

## 1. Problem-Statement

**Evidence (alle 2026-06-11 verifiziert):**
- Synthetic-User-Daily failt **33/36 Tagen** seit 2026-05-07 (`gh run list --workflow=synthetic-users.yml`). Failure immer identisch: `locator.click: Timeout 30000ms` auf `a[href*="/player/"]` in `e2e/synthetic-users.spec.ts:156` (Profile B, /market). Warm-Up ist NICHT die Ursache — Run 27336160129 zeigt `[warm-up] ✅ 200` bei Attempt 1.
- **45 offene GitHub-Issues**, davon ~26 tägliche `🔍 Nightly Audit`-Duplicates (#41–#102) — `nightly-audit.yml` verletzt das Master-Tracker-Pattern (errors-infra.md „Master-Tracker-Pre-Check Code-Pattern Slice SO-4").
- Silent-Fail-Audit rot: **79 HIGH > Baseline 76** (`.audit-baseline.json` stale seit Slice 238, 2026-04-26 — Slices 261–281 Code nie ein-gebaselined). Identifiziert neu u.a.: `src/app/api/cron/live-score-sync/route.ts` `.in('id', leagueIds)` [HIGH] (Slice 267).
- **1 stale locked Worktree** `agent-a0ce80579fb4a81de` (Slice-273-Backfill, 11/11 done laut Handoff).
- **16 modifizierte + ~40 untracked Files** uncommitted (SHIP-Hooks, settings.json, workflow.md `/goal`+`claude agents`-Sektionen, `.agents/skills/`-Migration, AGENTS.md, .codex/) — Tooling-Upgrade-Drift.
- `worklog/beta-phase.md` steht auf `phase: D / PASS-PENDING-IPHONE-VISUAL-VERIFY` — **stale**, Beta ist LIVE mit Taki/Nail Mo seit ≤2026-05-06 (D71).

## 2. Lösungs-Design

4 unabhängige Tracks, sequentiell in 1 Session:

**Track A — Synthetic-Player-Link-Fix.** Click auf `first()`-Locator einer live-re-rendernden Markt-Liste ist instabil (Element visible aber nie „stable", 14× retry). Fix: href extrahieren + `page.goto(href)` statt `click()` — Zweck des Synthetic-Tests ist Player-Detail-Render-Coverage, nicht Click-Mechanik (die deckt die Smoke-Suite ab). Verifikation via `workflow_dispatch`-Live-Run.

**Track B — Silent-Fail-Triage + Baseline.** Neue HIGHs seit Slice 238 reviewen (mind. `live-score-sync/route.ts:246`). Triviale Fixes (fehlender error-check) inline; legitime Patterns (z.B. `.in()` mit ≤7 Liga-IDs) akzeptieren. Danach `.audit-baseline.json` explizit auf neue Zahlen committen (offizielles Post-Fix-Protokoll aus common-errors.md §1).

**Track C — Nightly-Audit Master-Tracker + Batch-Close.** `nightly-audit.yml` Issue-Creation auf Master-Tracker-Pattern patchen (Code-Snippet aus errors-infra.md SO-4, analog synthetic-users.yml:89-146 das es bereits korrekt macht). Alle ~26 offenen `nightly-audit`-Issues batch-closen mit Verweis auf Slice 282a; 1 Master-Tracker bleibt/entsteht.

**Track D — Hygiene.** (1) Stale Worktree entfernen. (2) Tooling-Diff reviewen + als `chore(tooling)` committen. (3) `beta-phase.md` auf LIVE-Realität korrigieren (D71-Dokumentation, Historie-Zeile ergänzen).

## 3. Betroffene Files

| File | Track | Änderung |
|------|-------|----------|
| `e2e/synthetic-users.spec.ts` | A | Player-Link click → href+goto |
| `.audit-baseline.json` | B | Zahlen-Update nach Triage |
| ggf. `src/app/api/cron/live-score-sync/route.ts` | B | error-check falls fehlend |
| `.github/workflows/nightly-audit.yml` | C | Master-Tracker-Pattern |
| `worklog/beta-phase.md` | D | phase → LIVE-Korrektur |
| `.claude/hooks/*`, `.claude/settings.json`, `.claude/rules/workflow.md`, `.agents/skills/`, `AGENTS.md` | D | Review + chore-Commit (kein inhaltlicher Neu-Code) |

## 4. Code-Reading-Liste (VOR Implementation)

| File | Zweck / Frage |
|------|---------------|
| `e2e/synthetic-users.spec.ts:149-172` | ✅ gelesen — click-Stelle, Guard-Struktur, was nach Navigation passiert |
| `.github/workflows/synthetic-users.yml` | ✅ gelesen — Warm-Up OK, Master-Tracker bereits korrekt implementiert (Referenz für Track C) |
| `.github/workflows/nightly-audit.yml` | Wo wird `issues.create` ohne `listForRepo`-Pre-Check aufgerufen? Welche Labels? |
| `scripts/silent-fail-audit.ts` | Wie wird HIGH klassifiziert? Gibt es Skip-Mechanik für akzeptierte Findings? |
| `src/app/api/cron/live-score-sync/route.ts:240-250` | Hat `.in('id', leagueIds)` error-check? Wie groß kann leagueIds werden (7 Ligen)? |
| `git diff .claude/settings.json .claude/rules/workflow.md .claude/skills/ship/SKILL.md` | Was genau hat das Tooling-Upgrade geändert? Nichts Destruktives? |
| `worklog/beta-phase.md` | ✅ gelesen — YAML-Struktur, Historie-Tabelle |

## 5. Pattern-References

- errors-infra.md „Master-Tracker-Pre-Check Code-Pattern (Slice SO-4)" — Track C Vorlage
- errors-infra.md „Issue-Closing != Bug-Resolved (Slice 234)" — Batch-Close braucht Master-Tracker, sonst Klasse verschleift
- common-errors.md §1 „/silent-fail-audit" — Baseline-Update-Protokoll
- errors-infra.md „Cold-Start-Warm-Up vor Smoke-Suite (SO-4)" — Warm-Up als Ursache AUSGESCHLOSSEN (Log-Beweis)
- common-errors.md §0 „Worktree-Isolation" — Worktree vor Remove auf uncommitted Changes prüfen
- D71 (decisions.md) — Beta-LIVE-Status ist dokumentierte Anil-Entscheidung

## 6. Acceptance Criteria

- AC-01 [HAPPY]: `gh workflow run synthetic-users.yml` → Run SUCCESS. VERIFY: `gh run list --workflow=synthetic-users.yml --limit=1` = success. FAIL-IF: Player-Link-Step failt erneut.
- AC-02 [HAPPY]: `npm run audit:silent-fail:check` → exit 0. VERIFY: lokal + Output „within baseline". FAIL-IF: HIGH > Baseline.
- AC-03 [HAPPY]: `nightly-audit.yml` ruft `issues.create` nur noch nach `listForRepo`-Pre-Check. VERIFY: `grep -B5 "issues.create" .github/workflows/nightly-audit.yml` zeigt listForRepo davor. FAIL-IF: blinder create-Pfad bleibt.
- AC-04 [HAPPY]: Offene Issues ≤ 5 (Master-Tracker + echte). VERIFY: `gh issue list --state open --json number -q '. | length'`. FAIL-IF: > 10.
- AC-05 [HAPPY]: `git worktree list` zeigt nur Main-Repo. FAIL-IF: agent-Worktree noch da.
- AC-06 [HAPPY]: `git status --short` leer nach Commits (Tooling + Slice-Artefakte committed). FAIL-IF: tracked-modified Files übrig.
- AC-07 [HAPPY]: `worklog/beta-phase.md` reflektiert LIVE-Status mit D71-Referenz + Historie-Zeile. FAIL-IF: weiter `PASS-PENDING` ohne Stale-Vermerk.
- AC-08 [GUARD]: `npx tsc --noEmit` clean (war heute clean — bleibt clean).

## 7. Edge Cases

| # | Case | Handling |
|---|------|----------|
| 1 | Worktree hat uncommitted Changes | `git -C <wt> status -s` VOR remove; wenn dirty → Diff sichern, nicht blind löschen |
| 2 | Tooling-Diff enthält destruktive Hook-Änderung | Diff vollständig lesen; bei Verdacht → Anil fragen statt committen |
| 3 | Neuer HIGH ist echter Bug (z.B. unchecked .in auf große ID-Liste) | Fix inline (Chunk-Pattern), NICHT weg-baselinen |
| 4 | href des Player-Links ist relativ/absolut | `page.goto(href)` mit Playwright-baseURL-Resolution; beide Formen OK |
| 5 | /market zeigt 0 Player-Cards (Empty-State) | bestehender isVisible-Guard bleibt — Test skippt Detail-Teil ohne Fail |
| 6 | workflow_dispatch-Run trifft echten Cold-Start | Warm-Up-Step existiert; bei Fail Log prüfen ob neue Failure-Klasse |
| 7 | Batch-Close closed ein Issue mit echtem un-triagiertem Finding | Vor Close: Issue-Titel scannen — nur `silent-fail`/`cron-health`-Duplicates closen, Sonderfälle (z.B. #64 cron-health) inhaltlich prüfen |
| 8 | nightly-audit-Edit bricht YAML | `node -e yaml parse` oder actionlint vor Push |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
npm run audit:silent-fail:check
gh workflow run synthetic-users.yml && sleep 300 && gh run list --workflow=synthetic-users.yml --limit=1
gh issue list --state open --json number -q '. | length'
git worktree list
git status --short
node -e "const yaml=require('js-yaml');yaml.load(require('fs').readFileSync('.github/workflows/nightly-audit.yml','utf8'));console.log('YAML OK')"
```

## 9. Open-Questions

- **Autonom-Zone:** Fix-Mechanik Track A (href-goto vs. stabilisierter Click), Baseline-Zahlen, Issue-Close-Kommentartext, Tooling-Commit-Message.
- **Pflicht-Klärung:** keine — Scope von Anil approved („282 a").
- **CEO-Zone:** keine. beta-phase.md-Korrektur = Dokumentation von D71 (bereits Anil-entschieden).

## 10. Proof-Plan

`worklog/proofs/282a-ops-recovery.md` mit: (1) Synthetic-Run SUCCESS-Output, (2) audit:silent-fail:check exit-0-Output, (3) Issue-Count vorher/nachher, (4) worktree-list-Output, (5) git-status-clean-Output.

## 11. Scope-Out

- Slice 282 (`useHomeData`-Konsolidierung, Cold-Start Phase 3) — nächster Slice
- Lighthouse-Phase-3-Schwellen (braucht Baseline-Auswertung) — separater Slice
- Notion-Integration-Drift (Track E aus Handoff) — Anil-Action, nicht Code
- Echte Fixes für akzeptierte MEDIUM-Findings — Backlog

## 12. Stage-Chain (geplant)

SPEC → IMPACT: skipped (kein Service/RPC/DB/Query-Layer — nur e2e-Test, GHA-YAML, Baseline-JSON, Docs; einzige mögliche src-Änderung ist additiver error-check in Cron-Route) → BUILD → REVIEW: Self-Review geplant (Ops-Fixes mit 1:1-Pattern-Vorlagen aus errors-infra.md; falls Track B src/-Code ändert → Cold-Context-Reviewer) → PROVE → LOG

## 13. Pre-Mortem (kompakt, M-Slice)

1. Synthetic failt nach Fix weiter → andere Ursache (z.B. Login-Flow) → Log lesen, nicht blind re-tryen, max 2 Versuche dann STOP.
2. Baseline-Update kaschiert echten Bug → jede neue HIGH-Lokation VOR Update lesen.
3. Tooling-Commit zerstört Hook-Verhalten → Diff-Read pflicht, Hooks sind Workflow-kritisch (capture-correction 19-Tage-Ausfall-Präzedenz).
4. Batch-Close löscht Signal → Master-Tracker MUSS vor Close existieren (Issue-Closing != Bug-Resolved).
5. Locked Worktree-Remove scheitert → `git worktree remove --force` erst NACH dirty-Check.
