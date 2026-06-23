<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-23 17:39)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 4 Files
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```

## Session Commits: 9
- 270055b2 docs(knowledge): Wissens-Kopplung Slice 348/349 — Frontmatter + W2-B + INDEX (E0-W2gov)
- 7fe4e148 chore(gitignore): DesignSync-Tooling-Artefakte ignorieren (.design-sync/, tsconfig.dssync.json)
- d5e52fdb docs(session-end): LOG 348/349/350 + DISTILL (D94 Pre-Push-Strategie + 3 errors-infra-Patterns) + Handoff
- 8bc155d2 fix(ci): Slice 350 follow-up — ClubContent-Test-Mock + Nightly-Workflow-SyntaxError
- c03a43f7 fix(ci): Slice 350 — CI-grün (Silent-Fail-Baseline re-anchored) + Push-Fix (Pre-Push entschlackt)
- 3a8b966a feat(gamification): Slice 349 — Club-Fan-Treue-Board mounten (W2-B)
- 5c963681 refactor(db): Slice 348 Wave 2 — calculate_fan_rank-Rewrite + DROP COLUMN csf_multiplier
- ef8ecc1f refactor(db): Slice 348 Wave 1 — csf_multiplier aus TS + Docs entfernen (D83/D93)
- bf505e41 docs(plan): Phase-A Plan-/Knowledge-Hygiene (Pro-Stand-Roadmap)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen. HEAD = `8bc155d2` (Slice 350). `worklog/active.md` = idle. **CI ist GRÜN, Push funktioniert normal.** Fan-Reward-Engine FRE-1/2/3/5 + csf_multiplier-Removal + Fan-Board alle DONE.

## ✅ SESSION 2026-06-23 — 3 Slices + Infra-Heilung
- **Slice 348** — `csf_multiplier` komplett raus (Code+RPC+Spalte gedroppt), 0 Money-Effekt live verifiziert (liquidate_player ist proportional_v3 seit 330). 2-Wellen-Deploy (D82).
- **Slice 349** — Club-Fan-Treue-Board gemountet (W2-B, tote Brücke aktiviert). Code/Tests/Review/RLS/Daten grün. **⚠ OFFEN = ERSTE NEXT-SESSION-ACTION:** Live-Playwright-Screenshot `/club/sakaryaspor` Tab „Mehr" (desktop+393px, Console-Scan MISSING_MESSAGE). Sakaryaspor hat 37 Fans = sichtbares Board. Deploy ist live.
- **Slice 350** — **CI-grün + Push-Fix** (Anil-Notfall: tägliche Fail-Mails + Push gebrochen). Root-Causes: (1) `.audit-baseline.json` stale (79 vs 81, alles bestehende Cron-`.in()`) → re-anchored 174/81/93. (2) Pre-Push-Hook lief volle 6-min-vitest = Push-Transport-Killer → entschlackt auf schnellen `audit:silent-fail:check` (~5s), **volle Tests = CI-Autorität** (D94). Plus `git http.version HTTP/1.1`. Plus nightly-audit.yml SyntaxError (verschachtelte Backticks) gefixt. **CI grün end-to-end bestätigt.**

## ⚙️ NEUE WORKFLOW-REALITÄT (D94 — wichtig!)
- **Push geht wieder normal** (kein `--no-verify` nötig). Falls ein Push doch mal „failed to push some refs" zeigt ohne `remote:`-Meldung: das ist der Transport-Bruch — `git push --no-verify` als Notfall, dann Pre-Push-Hook-Laufzeit prüfen.
- **Pre-Push prüft nur noch `audit:silent-fail:check`** (~5s). Volle Tests laufen in CI (test-job). Ein echter Testfehler erscheint jetzt in CI (~2,5 min + Mail = echtes Signal), nicht mehr lokal vor Push. Bei money-/komplexen Slices ggf. `CI=true pnpm exec vitest run` bewusst lokal fahren vor Push.
- **Bei neuem Silent-Fail-HIGH/MEDIUM:** `.audit-baseline.json` bewusst nachziehen (Report-Diff: neuer echter Bug fixen vs. bestehend re-baseline), sonst CI rot bei JEDEM Push. Pattern in `errors-infra.md` (Slice 350).

## ✅ ZULETZT FERTIG: FRE-5 / Slice 347 (Club-konfigurierbare Fan-Rang-Schwellen, Money-nah)
- Neue Tabelle `club_fan_rank_thresholds` (1 Zeile/Club, monotoner CHECK, 4-Op-RLS Writes-nur-via-RPC). Fehlende Zeile = Plattform-Default 10/25/40/55/70.
- `calculate_fan_rank`-Rewrite gegen **Live-Baseline (D87)** — nur Tier-CASE liest Config; alle Patches erhalten (Follow +5, ELO, csf). Helper `get_club_fan_rank_thresholds` (Default-Single-Source). Write-RPC `set_club_fan_rank_thresholds` (Club-Admin ODER `top_role='Admin'`-Gate, Validierung, **Sofort-Recalc aller Club-Fans** = Money-Tally-Frische).
- Frontend: AdminFansTab Config-UI (5 Inputs, Live-Validierung), FanRankLadder dynamische Schwellen, `getFanRankByScore` entfernt. Service get/set + DEFAULT. i18n DE+TR (9 Keys, namespace-geprüft).
- **Schutz-Grenze:** Gewicht-Mapping Tier→Faktor bleibt GLOBAL (Club verschiebt nur, wer qualifiziert).
- Reviewer PASS (Finding #1 Platform-Admin-Gate gefixt). Proof: Backend AC1-AC8 live + UI-Playwright AC9/AC10 (0 Console-Errors). `worklog/proofs/347-thresholds-smoke.txt`, `e2e/qa-347-fanrank-thresholds.ts`.
- **NÄCHSTES Money-Stück = Anil-Wahl:** Polls-Reste (b exklusive Treue-Umfragen · c Abo-Early-Access) ODER neuer Treasury/REIN-Block. NICHT Airdrop (Coin-Phase). Backlog: csf_multiplier-Removal (D93) · recalculateFanRank swallow→throw.

## ✅ ZULETZT FERTIG: FAN-REWARD-ENGINE FRE-1/2/3 (2026-06-18) — Plan = **D93**
„E1" im MASTERPLAN = ganzes Money-Epic; die Fan-Reward-Engine ist ein Teil davon, Schritte = **FRE-1…FRE-5**.
- **FRE-1 / Slice 344** (`4afd47e6`+`6e53a770`): Fan-Rang-**Leiter sichtbar** + Perk-Katalog (`fanRankPerks.ts`, Mirror Poll-Gewicht 343). Reine UI. Liegt auf Club-Page Tab **„Mehr"** (RevealSection). Live-Proof bescout.net.
- **FRE-2 / Slice 345** (`027b4cdf`): **Follow zählt** (+5 in `calculate_fan_rank`, monoton, cap 100) + Trigger `club_followers_recalc_fan_rank` (best-effort, sofort-Recalc). Money-nah (Fan-Rang→Poll-Gewicht); Abo-Floor (D92) live intakt. Force-rollback-Smoke grün.
- **FRE-3 / Slice 346** (`d3c4f561`): **Exklusive Vereins-Beiträge** ab Fan-Stufe + gesperrte Vorschau (🔒). **RLS-SELECT-Policy auf `posts` ersetzt** (war `USING(true)`) → Fan-Rang-Lese-Gate; `get_club_news_teasers` (SECURITY DEFINER) maskiert content. Neu: `fan_rank_tier_rank(text)` (Mirror FAN_RANK_TIERS), `posts.min_fan_rank_tier`. Kein Content-Leak (Row-Hide + Maskierung), Live-RLS-Smoke grün, Community-Feed + Club-Page post-Deploy regress-frei. Feature **ruhend** bis erste exklusive News (0 club_news live).

## 🎯 NÄCHSTER ARBEITSBLOCK
- **ERST:** Slice 349 Live-Playwright-Verify (s.o.) — der einzige offene Beweis. Danach 349 als voll-DONE markieren.
- **DANN Pro-Stand-Roadmap** (`worklog/notes/348-pro-stand-roadmap.md`): `csf_multiplier` raus ist erledigt (348). Nächste Wahl: (A) Polls-Reste (exklusive Treue-Umfragen `min_fan_rank` / Abo-Early-Access) ODER (C) S7-Leaderboard-Konsolidierung (scout_scores/user_stats/airdrop_scores).
- **FRE-4 Airdrop bleibt deferred** (echte-Coin-/CASP-Phase, D93). Nicht resurrecten.
- Quellen: Treasury-WIE `docs/knowledge/domain/treasury.md`; Polls-WIE `docs/knowledge/domain/polls.md`; Score/Fan-Rank-WIE `docs/knowledge/domain/reward-ranking.md`. Pre-Push/CI-Realität: **D94** + `errors-infra.md` (Slice 350).

## 🧮 FAN-RANG-MECHANIK (kurz, für nächste Polls-/csf_multiplier-Slices) — Quelle: live `calculate_fan_rank`
- total_score 0–100 = event×0,30 + dpc×0,25 + abo×0,20 + community×0,15 + streak×0,10, +ELO-Boost (Login-Streak), **+5 Follow (FRE-2)**, cap 100.
- Tier-Schwellen sind seit **FRE-5 / Slice 347 club-konfigurierbar** (`club_fan_rank_thresholds`), Default: Stammgast 10 · Ultra 25 · Legende 40 · Ehrenmitglied 55 · Vereinsikone 70. Tier-Lineal DB-seitig = `fan_rank_tier_rank(text)` (0..5).
- **Recalc-Latenz:** Event-Scoring/Cron + (Un)Follow-Trigger + Schwellen-Save-Recalc (FRE-5). Weiterhin KEIN Trigger auf Abo/Holdings. Bei neuem money-/zugangs-relevantem Gate → recalc-on-read oder Recalc-on-save prüfen (D92-Familie).

## 🔧 BACKLOG (aus FRE-Reviews, je eigener kleiner Slice)
- **csf_multiplier raus** aus `calculate_fan_rank` (D83/D93) — kein Money-Effekt (gedeckelt/wirkungslos).
- Teaser-RPC `get_club_news_teasers` oberes LIMIT-Cap (`LEAST(...,50)`) — 346-NIT#3.
- `posts`-INSERT-Policy `club_admins`-Härtung (Nicht-Admin kann club_news mit fremder club_id einfügen) — pre-existing, 346-Scope-Out.
- cross-user Batch-Notify ohne locale → DE für alle (342-NIT#1, seit 336).
- TR-i18n-Unidiomatik (kein Commit-Blocker; nur Compliance hart).

**Muster:** Money-nah/Schema → **/impact + Live-functiondef ZUERST (D87)**. UI/Service → Mobile 393px + DE/TR namespace-aware (333-Falle: Live-Render-Console auf MISSING_MESSAGE prüfen). Reviewer-Pflicht. Pre-Push fährt VOLLE vitest-Suite (~6 min). **TR-Genauigkeit kein Commit-Blocker** (nur Compliance hart). **Teaching-Mode DURCHGEHEND + EINFACH — jede Antwort an Anil startet mit 1-3 Sätzen Klartext VOR Tools, keine Abkürzungs-/Tabellen-Wände, bei Zögern STOPP+erklären** (`feedback_teaching_mode`, 4× gemahnt). **Abhängige FE-Arbeit NICHT in Worktree-Agent dispatchen bevor Backend committed ist** (FRE-3-Lehre: Agent blockte, weil uncommitted Service nicht im Worktree).

## 💰 Money-SSOTs — NIE neu erarbeiten
- **D83** → `docs/knowledge/domain/treasury.md` (WIE Treasury) · **D86** → `docs/knowledge/domain/polls.md` (WIE Polls). `memory/decisions.md` = WARUM. INDEX.md routet via `consult_when`.
- Grundgrößen: 1 $SCOUT = 1 Cent · 1 SC = MV/100.000 € · Fee-Split Polls 20/80.
- **`calculate_fan_rank`-Body lebt NUR live** — `20260330_streak_benefits_rpcs.sql` ist stale, NIE als Baseline (errors-db.md PATCH-AUDIT, FRE-2-Lehre).

## ⚠️ STOLPERFALLEN
1. **API-Football-Key gesperrt** — blockiert players.club + Live-Scores (Engine braucht ihn NICHT).
2. **Audit-Churn** (`worklog/audits/*`) — NIE committen. **session-handoff.md** = committen OK.
3. **RLS posts SELECT** ist seit 346 ein Fan-Rang-Gate (war `USING(true)`) — bei künftigen posts-Read-Änderungen beachten: öffentliche Beiträge = `min_fan_rank_tier IS NULL`-Zweig.

> Crash-Recovery-Blöcke 2026-06-23 (3×) entfernt — Recovery erfolgreich in Folge-Session, Phase-A-Hygiene committet.

## ⚠ CRASH RECOVERY (20260623-161717)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-161717.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-161717.diff`

## ⚠ CRASH RECOVERY (20260623-161808)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-161808.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-161808.diff`

## ⚠ CRASH RECOVERY (20260623-161858)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-161858.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-161858.diff`

## ⚠ CRASH RECOVERY (20260623-163226)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-163226.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-163226.diff`

## ⚠ CRASH RECOVERY (20260623-163548)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-163548.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-163548.diff`

## ⚠ CRASH RECOVERY (20260623-164821)
Session crashed. State at crash time:

### Uncommitted Changes (saved as .claude/backups/crash-20260623-164821.diff)
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-23.md
?? worklog/audits/silent-fail-2026-06-23.json
?? worklog/audits/silent-fail-2026-06-23.md
```


### Recovery: Apply diff with `git apply .claude/backups/crash-20260623-164821.diff`
