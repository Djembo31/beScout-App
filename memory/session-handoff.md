<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-18 10:25)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 3 Files
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-17.md
?? worklog/audits/knowledge-2026-06-18.md
```

## Session Commits: 3
- cea07dc6 fix(test): Pre-Push-Regressionen aus Slice 335/336 heilen
- 249d1fe9 docs(session-end): 334+335+336 abgeschlossen — Handoff-Anker auf P4/Fan-Rang/UI-Live-Verifikationen
- 60147794 feat(polls): Polls P3 — Follower-Reichweite + Abo-2x-Gewicht bei Paid-Polls (Slice 336)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (Start: SLICE 338 — Predictions-Feature-Removal)

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen. HEAD = Slice 337 oder neuer. `worklog/active.md` = idle. **Polls P1 (333) + P2 (334) + P3 (336) + Fee-20/80 (337) DONE; Event-Absage geld-sicher (335) DONE — alle live + gepusht.**

## 🎯 NÄCHSTER SLICE = 338 Predictions-Feature KOMPLETT entfernen (Anil 2026-06-18)
**Entscheidung:** Das gesamte Fantasy-Tippspiel-/Predictions-Feature aus der App werfen. **Daten-Befund (erhoben): `predictions`-Tabelle = 1 Testzeile (1 User, 2026-05-01, seither nichts) → DROP sicher, kein echter User-Content.** Polls bleiben unangetastet.
**Footprint (read-only erhoben, Dead-Feature-Removal 4-Achsen, errors-frontend.md Slice 305):**
- **DB:** Tabelle `predictions` (1 Zeile) + 3 RPCs (`create_prediction`, `get_prediction_consensus`, `resolve_gameweek_predictions`) + Leaderboard-/Consensus-Objekte (Migrationen 199 top_predictors, 201d consensus). DROP-Diligence + 0-incoming-FK-Check vor DROP.
- **~10 dedizierte Code-Files löschen:** PredictionsTab, PredictionCard, PredictionConsensusHint, CreatePredictionModal, ergebnisse/PredictionResults, profile/PredictionStatsCard, services predictions.queries/mutations + lib/services/predictions.ts + lib/queries/predictions.ts (+ keys.ts prediction-keys).
- **~22 geteilte Files ENTKOPPELN (nicht löschen):** NotificationDropdown + notifications.ts (`prediction_resolved`-Typ + TYPE_TO_CATEGORY) + notifications_type_check CHECK · leaderboards.ts (`top_predictors`) · scoring.admin.ts + gameweek-sync cron (`resolve_gameweek_predictions`-Aufruf) · profile AnalystTab · OnboardingChecklist · Glossary · community PostCard · fantasy MitmachenTab/SpieltagTab/ErgebnisseTab/EventCommunityTab/index.ts · types/index.ts · notificationDeepLink.ts.
- **i18n:** ~50 prediction/vorhersage/tipp-Keys (de+tr) — pro Key grep ob exklusiv (shared behalten).
- **Tooling:** orphan-detector/wiring-check Allowlists + NotificationType-Union.
- **Muster:** /impact ZUERST (Cross-Domain) · Cold-Reviewer Pflicht · `BEGIN;…COMMIT;` für DB-Drops · `grep -rn "[Pp]rediction" src/ messages/ scripts/ .claude/` Pflicht-Sweep nach Removal = 0.

## ⚡ DANACH / SECONDARY
- **Polls P3c — Fan-Rang** (deferred aus 336): Fan-Rang als Gewicht/Auszahl-Anteil — `fanRanking.ts` existiert, „fast wirkungslos". + Abo Early-Access/exklusive Mitglieder-Umfragen.
- **UI-Live-Verifikationen** (passendes Konto, QA-„Jarvis" gated): 335 Absage-ConfirmDialog (Club-Admin), 336 Abo-2×-sichtbar (Gold-Abo), 334 CreatePollModal-Picker (≥50 Follower).
- **Polls P4 (Teilnehmer-Auszahlung) = VERWORFEN** (Anil 2026-06-18): Lotterie (a)/Prediction (b) = Glücksspiel-Risiko, Mini-Reward (c) nicht verfolgt → Polls bleiben wie sie sind; stattdessen Fee auf 20/80 (337). Nicht wieder aufmachen ohne neue Anil-Ansage.

## 🔧 KLEINE BACKLOG-FUNDE (Post-Beta, eigener Mini-Slice)
- **`getPlayerNames` ohne `.limit()`** (`players.ts:42`, 334-NIT) + **Follower-Notify-Query ohne `.limit()`** (`communityPolls.ts`, 336-NIT) — beide PostgREST-1000-Cap bei Mega-Clubs/-Listen. Zusammen härten (`.range()`-Loop).
- **`polls.md` §9 Current-State breiter stale** (sagt „KEINE Erstellung" — stimmt seit 333 nicht; weitere 334/336-Drift) → Doku-Refresh-Slice (E0-W2gov-Kopplung).

**Muster:** Money-nah/Schema → **/impact ZUERST**. UI/Service → Mobile 393px + DE/TR. Reviewer-Pflicht. Pre-Push fährt VOLLE vitest-Suite (~6 min) → bei UI/i18n vorher Compliance- + betroffene Component-Tests laufen (337-Lehre). **TR-Genauigkeit kein Commit-Blocker** (nur Compliance hart). **Teaching-Mode DURCHGEHEND** (`feedback_teaching_mode`).

## 💰 Money-SSOTs — NIE neu erarbeiten
- **D83** → `docs/knowledge/domain/treasury.md` (WIE Treasury) · **D86** → `docs/knowledge/domain/polls.md` (WIE Polls). `memory/decisions.md` = WARUM. INDEX.md routet via `consult_when`.
- Grundgrößen: 1 $SCOUT = 1 Cent · 1 SC = MV/100.000 € · **Fee-Split Polls 20 % Platform / 80 % Creator (Slice 337, war 30/70)**.

## ✅ Diese Session (2026-06-18) — Slice 333 Polls P1 (DONE + live)
- **Slice 333** (`5c674e3d` feat + `871ec47e` i18n-fix): Polls-Erstellung gebaut (L, Money/CEO). Migration (`community_polls.source` + ledger-CHECK `poll_revenue` + `create_community_poll` + `cast_community_poll_vote` Geld-Branch + `get_club_balance`) · Service · UI (`CreatePollModal`/`CreatePollButton`, 2 Einstiege) · i18n DE+TR. Anil-Entscheidungen: volles P1 · Follower-Tor 50 · cost-Cap 1000 $SCOUT · Routing keyt auf `source` (nicht club_id).
- **Verify:** force-rollback-Money-Smoke live PASS (club→Treasury+700/0 poll_earn, user→Wallet+700/0 Treasury, 8 Guards) · Reviewer PASS (NIT#1 Defense-in-Depth-Guard inline gefixt) · vitest 5/5 + 93/93 Regression · **Live-Playwright** (Modal + Follower-Tor + i18n-Fix re-bestätigt nach Deploy).
- **Live-QA-Find + Fix:** i18n-Keys `admin.clubPollSection*` standen im falschen Namespace-Objekt → roher Key im UI. Verschoben (de+tr), live bestätigt. Lehre → `errors-frontend.md` (grep-Audit verpasst falschen Namespace; node-Check + Live-Console-MISSING_MESSAGE-Scan Pflicht).
- **Prozess-Änderungen (→ Memory):** Teaching-Mode gilt DURCHGEHEND beim Bauen, nicht nur an Forks (`feedback_teaching_mode`). TR-Genauigkeit ist kein Commit-Blocker mehr, nur Compliance hart (`feedback_tr_i18n_validation`).
- **DISTILL:** kein neues `D<n>` — Slice 333 ist Ausführung von D86 (Kanon `polls.md`); Money-Architektur/Wording bereits dort + im Spec erfasst. Code-Lehre → `errors-frontend.md`. Prozess-Feedbacks → User-Memory.

## ⚠️ STOLPERFALLEN / BACKLOG
1. **API-Football-Key gesperrt** — blockiert players.club + Live-Scores (Polls braucht ihn NICHT).
2. **events.status CHECK kennt kein 'cancelled'** → UI-„Absagen" broken → eigener Slice (Cancel + CHECK + Event-Prize-Refund-Zweig).
3. **bounty reward_cents-Max-Drift** (CHECK 100k vs RPC-Text 1M $SCOUT) + **`auto_close_expired_bounties` ohne getrackte Migration** (AR-43) → Backlog.
4. **TR-i18n (Genauigkeit kein Blocker mehr, 2026-06-18):** offene unidiomatik-Kandidaten (successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin, Polls-`pollErr*`/`createPoll*`) — User-korrigieren später; nur Compliance prüfen, kein Anil-Review-Stopp.
5. **E0-Reste (LOW, optional):** W3-Teil-2 Root-Vault-Notizen (`wiki-*.md`, `_HOME.md` + ~20 weitere stale root-`memory/*.md`) noch nicht archiviert · W4 Historie-Rewrite (`git filter-repo`, mit Backup, separat) · `patterns.md`/`errors.md`-Dup (W2b-#5) · `audit-knowledge.ts` Orphan-Pfad-Härtung. Kein Blocker für Polls.
6. **Audit-Churn** (`worklog/audits/*`) — NIE committen. **session-handoff.md** = committen OK.
