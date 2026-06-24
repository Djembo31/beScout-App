<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-24 14:49)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Working Tree: Clean

## Session Commits: 10
- eb820b1f chore(tracker): Slice 367 done + 368 next (E4 Schritt 3)
- 7b650a4f fix(gamification): E4 Diamond-Hands-Cluster — Rename + echte Hold-Logik + Konfetti-Gate (Slice 367, T-3)
- 627e3e96 docs(notes): T-3 Diamond-Hands Root-Cause verifiziert (geseedete dpc_mastery.hold_days, Slice 367 Vorbereitung)
- e3181795 docs(knowledge): treasury.md verified-against trading.md @ 2026-06-24 (beide auf D99 abgeglichen, Slice 366)
- 1b7b7ae8 chore(tracker): E4 Schritt 1+2 done in MASTERPLAN + TODO reconciled (Slice 366)
- eba47650 docs(money): E4 Doc-Glattzug — Money-Modell-Doku auf D99 ausgerichtet (Slice 366, Schritt 2)
- b52e8b09 docs(decision): D99 OFFEN-Punkte ratifiziert (E4 Schritt 1)
- fe1bd24a docs(decision): D99 — $SCOUT-Phasenmodell (SSOT) + Money-Modell-Drift-Inventur + E4 Cleanup-Epic
- f297a361 feat(treasury): Bounty-Fee REIN in Plattform-Topf (Slice 365, E3-2e) — Fees-REIN KOMPLETT 5/5
- bb7d8f34 docs(spec): Slice 365 Bounty-Fee REIN — BUILD-ready Spec + Resume-Anker (E3-2e)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION

**Status: idle. HEAD = Slice 367 (Diamond-Hands-Fix). Letzter Money-Feature-Baseline = Slice 365 (Fees REIN komplett).** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn gitignored. **CI grün, Push normal.** Alles committet & gepusht (HEAD `eb820b1f`).

## 🎯 HIER ANKNÜPFEN — E4 Schritt 3, NÄCHSTER = Slice 368 (ipo_price-Data-Drift, Money/CEO)

**E4 = Money-Modell-Glattzug + Mock→Pro-Härtung (D99). Plan-Anker `worklog/notes/366-e4-money-model-cleanup-epic.md`.** Stand:
- ✅ **Schritt 1 — D99 ratifiziert** (`b52e8b09`): Naming **„Credits"** jetzt (`$SCOUT`=ICO-Coin später, „BSD" deprecatet) · Einheit **1 Credit = 100 cents** (Speicher), ICO-Wert 1 Credit = 0,01 € (Phase 2, nie heute user-facing) · Phasen **sequenziell 1/2/3** · CASP = schnellster sicherer Weg zum ICO (Route CASP vs MiCA Title II = Anwalt) · Pricing **1 Card = MV/1.000 Credits** (= MV/100.000 € ICO-Peg, **kein 100×-Widerspruch**, am Live-Code bewiesen). SSOT = **D99** (`memory/decisions.md`).
- ✅ **Schritt 2 — Doc-Glattzug** (Slice 366, `eba47650`): ~40+ Stellen + Compliance-Skills (beScout-business/plan-legal-review .claude+.agents) + SYSTEM-DESIGN auf D99; CONCEPT-DPC-ECONOMY Selbstwiderspruch geheilt; `grep $SCOUT|BSD messages/` = 0. Proof `366-drift-grep.txt`.
- ✅ **Schritt 3 / Bug T-3 — Slice 367 Diamond-Hands** (`7b650a4f`): Rename **„Treuer Sammler"/„Sadık Koleksiyoncu"** (Key `diamond_hands` code-intern) über 4 Surfaces (messages DE+TR, achievements.ts +icon ⏳, DB `achievement_definitions` Migration 20260624190000) + **Hold-Logik** in `social.ts` aus `holdings.created_at` (qty>0, älteste Position; Zombie-Trigger S025 = Position-Start) STATT geseedetem `dpc_mastery.hold_days` + **Konfetti-Gate** `category!=='trading'`. Reviewer PASS. Knowledge: gamification.md +2 Patterns (Achievement nie aus Mock-Spalte · Konfetti-Dual-Path).

**← NÄCHSTER: Slice 368 = P-4 `ipo_price`-Data-Drift (Money, CEO-Scope, §3 selbst bauen).**
- **Problem:** Nicht-Top-Spieler haben falsche `ipo_price` (eingefroren bei Launch, nicht bei MV-Änderung nachgezogen). Douglas Willian MV 500K steht bei **10 statt ~500 Credits**; Top-Spieler (Mbappé) korrekt. Kanon: `ipo_price_cents = MV_EUR/10` (= MV/1.000 Credits).
- **⚠️ WARTET AUF ANIL-GO:** ändert **echte Live-Preise**, gegen die Tester handeln → nicht ungefragt migrieren. **Vorgehen (mit Anil abgestimmt):** ZUERST `/impact` + Live-Daten-Analyse zeigen (wie viele Spieler betroffen, welche haben offene Orders/Holdings, Blast-Radius), DANN Migrations-Plan vorlegen, ERST auf Anil-Go auf Prod schreiben. Money-Muster: Live-`pg_get_functiondef`/SELECT VOR Spec (D87).
- **Alternative (Anil-Wahl):** zuerst die leichteren Bugs — **369** T-2 `/api/push → 500` beim Kauf · **370** E2E-Sweep ② IPO → ③ Poll → ④ Research → ⑤ Bounty (je Seed + echter UI-Trigger; Browser war jarvis-qa; Seed-Muster `place_sell_order` etc. in `worklog/notes/365-e2e-findings.md`). **T-1** Cold-Start leerer Markt = **Produkt-Entscheid** (Dauer-IPO/Seed-Orderbuch, eigener Slice).

**367-Follow-ups (non-blocking, aus Reviewer):** F#1 „ohne zu verkaufen"-Semantik — Teilverkauf resettet `created_at` NICHT (nur Full-Sell auf qty=0) → mit Anil klären ob Description entschärfen. F#2 Regression-Tests für Hold-Logik (Buy→kein Unlock / 31d→Unlock). F#3 DPC-Mastery-Leaderboard (`mastery.ts`) zeigt weiter geseedetes `hold_days`-Mock → eigener Mock→Pro-Slice.

**Geseedete Live-Artefakte (E2E ①, permanent):** demo-admin 4 Cards Douglas Willian, jarvis 1 Card, 1 Trade-Tx, Pot 35 Cents (source 'trading').

## ✅ E3 „Fees REIN" KOMPLETT (5/5 + P2P) — Trading 358 · IPO 360 · Polls 363 · Research 364 · Bounty 365
> Alle Plattform-Fee-Ströme fließen real in den BeScout-Topf (voller Auffang 100 %, D98, je Zero-Sum live bewiesen). Topf live bei 35 Cents.

## ➡️ DANACH (zurückgestellt): E3 Slice 3 — Monats-Liga e2e (erster RAUS-Kanal)
- `close_monthly_liga` zahlt Rewards per `debit` aus dem Topf (statt Minting) + Deckungs-Check + Idempotenz. Lebt heute, mintet 34.000/Mt, 0 Snapshots. UI: Live-Standing + Cron + `overall`-Median-Fix. Preflight `357-preflight-monthly-leaderboard.md`. Plan `358-platform-treasury-epic.md`. Money-Muster: Live-`pg_get_functiondef` VOR Spec (D87).

## ✅ SESSION 2026-06-24 — Slice 357 E3-1 Topf-Fundament (Money, CEO-Scope)
- **Slice 357** — Plattform-Treasury Topf-Fundament. Mirror Club-Treasury 329 minus tenant-id, Single-Pot. Tabellen + 3 RPCs + Append-only-Trigger (329 wiederverwendet) + RLS 0-Policies + Service +2 Fn + AdminTreasuryTab-Card + i18n DE+TR. **Topf live bei 0, kein Backfill.**
- **Money-Smoke grün:** Buchungskette 1000/1500/1200 (kein Race), append/delete/bad-source/no-auth alle geblockt, RLS/Grants verifiziert. Reviewer **PASS** (2 NIT accepted). 9 Service-Tests grün. Proofs `worklog/proofs/357-*`.
- **DISTILL D97** (ARCHITECTURE): Topf-Saldo = SUM-on-read (Variante A, kohärent mit Club-Treasury) statt gecachter Saldo (B); Revisit B bei Millionen Ledger-Zeilen (Lock-Row existiert → lokaler Umstieg). CEO-approved.
- **Offen:** UI-Card Playwright-Verify gegen bescout.net **nach Deploy** (Vercel baut von main) — noch nicht abgenommen.

## ✅ SESSION 2026-06-23 (Abend) — Slice 356 Exklusive Treue-Umfragen + Money-Heal
- **Slice 356** — Exklusive Treue-Umfragen (`community_polls.min_fan_rank_tier`-Tor): create-Param (nur source='club'), Vote-Guard VOR Wallet (fail-closed), Service `viewer_locked` pro Poll/Betrachter (multi-club), Card-Schloss-Teaser + Create-Selector, i18n DE+TR. Silent-Fail-Fix: `castCommunityPollVote` wirft jetzt bei !success (vorher false-success-Toast). → **Polls-Roadmap KOMPLETT** ((c) Abo-Early-Access von Anil gestrichen).
- **🔴 Live-Money-Heal (Reviewer-Fund, Anil-approved):** Poll-Fee lief seit Slice 343 fälschlich **70/30** statt CEO-approved **80/20** (343 rekonstruierte Body aus `slice_336`-Datei statt Live → 337-Patch still revertiert). Zurück auf 80/20, live-verifiziert (creator_share=800 bei cost=1000). Pattern → errors-db.md (PATCH-AUDIT muss **Konstanten** prüfen, nicht nur Präsenz).
- **Reviewer:** REWORK→geheilt (`worklog/reviews/356-review.md`). **Proof:** `356-rpc.txt` + `356-money-smoke.txt` (Reject→Wallet unverändert; Pass→80/20) + 27 vitest.
- **Prozess:** TR-i18n-Abnahme-Regel (`feedback_tr_i18n_validation`) auf Anil-Wunsch entfernt — TR-Strings nicht mehr vor Commit zeigen.
- DISTILL geprüft: Learnings in errors-db.md (Konstanten-Audit) + polls.md (Feature). Kein neuer `D<n>` nötig (Bug-Fix-/Feature-Klasse, kein Strategiewechsel).

## ✅ SESSION 2026-06-23 (Fortsetzung) — Workflow-Effizienz + 349-Heilung
- **Slice 352** — Workflow-Effizienz #1+#2+#3: `ship-status-gate.sh` log.md-Injection 5→1; Ops/Tooling-Slice-Spur in `workflow.md`; **`errors-frontend.md` → Navigator (78 Z., always-loaded) + `errors-frontend-detail.md` (on-demand, non-matching glob)**. Anil-Alignment: path-scopen verworfen (.tsx-Kollaps = Safety-Regression).
- **Slice 353** — `errors-db.md` (787→73) + `errors-infra.md` (538→66) gleiche Navigator-Mechanik (2 Parallel-Agents). **DISTILL D95** (Navigator+Detail-Architektur). 3 Domains: ~90% weniger always-loaded Context/Edit, 0 Pattern-Verlust.
- **Slice 354** — **349 Live-Verify fand Prod-Bug + gefixt:** Club-Fan-Board „Treueste Fans" war im **Error-State** — `getClubFanLeaderboard` Embed `profiles!inner` ohne FK `fan_rankings→profiles` (FK ging nur auf auth.users). Fix = additiver FK→profiles (Migration `20260623210000`, kanonisch=scout_scores), 0 src/-Änderung, Re-Verify 38 Fans live PASS. **349 jetzt voll-DONE.** Plus **Stale-Tracker-Prävention** (s.u.).

## 🛡️ STALE-TRACKER-KLASSE ABGESTELLT (Slice 354 — Anil-Auftrag)
- **Ursache:** Epic-Sub-Tracker (`s7-phase3-remaining.md`, `348-pro-stand-roadmap.md`) werden von KEINEM Close-Out-Ritual angefasst → driften (348/349 waren nicht abgehakt).
- **Fix (3-teilig):** (1) `.husky/pre-commit` `[TRACKER-RECONCILE]`-Reminder feuert bei „neuer ## NNN in log.md gestaged" (non-blocking, weil semantisch); (2) `workflow.md` LOG-Step „Tracker-Kopplung"; (3) `s7-phase3-remaining.md` Stand-Quellen-Header + `reconciled-through-slice: 354`.
- **Heißt für nächste Session:** beim Slice-LOG erinnert der Hook an MASTERPLAN/TODO/s7-Tracker — reconcilen, nicht ignorieren (außer reine Doku/Meta-Slices).

## 🎯 NÄCHSTER TRACK (Anil-Wahl, frei fortsetzbar)
- **(A) Polls-Reste:** exklusive Treue-Umfragen (`min_fan_rank`) · Abo-Early-Access (kleine Money-Slices).
- **(C) S7-Aufräumen** (Block-SSOT `worklog/s7-phase3-remaining.md`): Monthly-Liga-Board (tot) · `scout_scores`↔`user_stats`-Konsolidierung · Dormant-Hygiene (Research/Voting/Creator-Fund/Wildcard) · Bridges (46). ⛔ `players.club` blockiert (API-Football-Key — Anil-Action).

## 📦 ÄLTERE SESSION 2026-06-23 (Vormittag) — 348/350/351
- **Slice 348** — `csf_multiplier` komplett raus (Code+RPC+Spalte), 0 Money-Effekt (liquidate_player proportional_v3 seit 330).
- **Slice 350** — CI-grün + Push-Fix (D94: Pre-Push=schneller Gate, volle Tests=CI). **Slice 351** — Knowledge-Coupling-Gate (D45).

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
- ✅ **Erledigt diese Session:** 349 Live-Verify (+ Prod-FK-Bug gefixt, 354) UND alle 3 Workflow-Effizienz-Tracks (352/353). → aktueller offener Stand steht oben unter „🎯 NÄCHSTER TRACK" (Polls-Reste ODER S7-Aufräumen).
- **Slice 351 Gate aktiv:** Knowledge-Content ändern → `updated:`=heute Pflicht; neue `D<n>` → INDEX-Range mitziehen (sonst pre-commit blockt).
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
