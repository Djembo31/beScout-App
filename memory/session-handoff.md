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

# 🎯 RESUME-ANKER NÄCHSTE SESSION (Start: POLLS P4 ODER UI-Live-Verifikationen)

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen. HEAD = Slice 336 oder neuer. `worklog/active.md` = idle. **Polls P1 (333) + P2 (334) + P3 (336) DONE; Event-Absage geld-sicher (335) DONE — alle live (DB) bewiesen.**

## ✅ Diese Session (2026-06-18) — 334 + 335 + 336 (alle DONE)
- **334 Polls P2** (L): `community_polls.player_id` + Discovery-Anker-Chip-Leiste + Suche Spieler/Verein über alle Typen. Reviewer PASS. **Live-Playwright bestätigt** (Chips, Filter 9→1, §254 kein Catch-22, Suche).
- **335 Event-Absage geld-sicher** (L, Money): `cancel_event`-RPC (atomar, Club-Admin-auth, FOR UPDATE, Teilnehmer-Refund + Prize-Kaution zurück + status='cancelled') + events_status_check +'cancelled' + trg_events_prize_settle cancelled-Zweig. **Latenter Bug mitgefixt:** ticket_transactions_source_check +'event_entry_refund'. Reviewer CONCERNS→geheilt (fail-closed). Money-Smoke: Treasury +prize / Ticket +Einsatz / negativ ok.
- **336 Polls P3** (L, Money-near): cast_community_poll_vote +Abo-2×-Gewicht (Tally-only, Geld byte-identisch) + community_poll_votes.weight + Follower-Notify (poll_new) bei Poll-Erstellung. Reviewer PASS. Money-Smoke: Abo weight=2 aber wallet −cost (nicht 2×).

## ⚡ NÄCHSTE KANDIDATEN (Anil wählt)
1. **Polls P4** — Teilnehmer-Auszahlung (OFFENE Entscheidung `polls.md` §7: a Lotterie/Topf · b „Recht behalten"/prediction · c Mini-Teilnahme-Reward; Fan-Rang könnte gewichten). Braucht CEO-Entscheidung VOR Bau.
2. **Polls P3c — Fan-Rang** (deferred aus 336): Fan-Rang als Gewicht/Auszahl-Anteil — `fanRanking.ts` existiert, „fast wirkungslos", müsste erst sinnvoll verankert werden. + Abo Early-Access/exklusive Mitglieder-Umfragen.
3. **UI-Live-Verifikationen** (mit passendem Konto, QA-„Jarvis" gated): 335 Absage-ConfirmDialog (Club-Admin-Konto), 336 Abo-2×-sichtbar (Gold-Abo-Konto), 334 CreatePollModal-Picker (≥50 Follower).

## 🔧 KLEINE BACKLOG-FUNDE (Post-Beta, eigener Mini-Slice)
- **`getPlayerNames` ohne `.limit()`** (`players.ts:42`, 334-NIT) + **Follower-Notify-Query ohne `.limit()`** (`communityPolls.ts`, 336-NIT, = createEvent-Parität) — beide PostgREST-1000-Cap bei Mega-Clubs/-Listen. Zusammen härten (`.range()`-Loop, common-errors.md §1).

**Muster:** Kein Money-Path → kein D87-Zwang, Money-nah/Schema → **/impact ZUERST**. UI/Service → Mobile 393px + DE/TR. Reviewer-Pflicht. **TR-Genauigkeit ist KEIN Commit-Blocker mehr** (Anil 2026-06-18; nur Compliance/`business.md` hart). **Teaching-Mode DURCHGEHEND** (`feedback_teaching_mode`): jede Antwort startet mit Klartext-Erklärung vor Technik.

## 💰 Money-SSOTs — NIE neu erarbeiten
- **D83** → `docs/knowledge/domain/treasury.md` (WIE Treasury) · **D86** → `docs/knowledge/domain/polls.md` (WIE Polls). `memory/decisions.md` = WARUM. INDEX.md routet via `consult_when`.
- Grundgrößen: 1 $SCOUT = 1 Cent · 1 SC = MV/100.000 € · Fee-Split Polls 30 % Platform / 70 % Creator (Vote heute via `cast_community_poll_vote`).

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
