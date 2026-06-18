<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-18 04:02)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 2 Files
```
?? worklog/audits/knowledge-2026-06-17.md
?? worklog/audits/knowledge-2026-06-18.md
```

## Session Commits: 9
- 24835a40 fix(events): Event-Absage geld-sicher — cancel_event-RPC + CHECK +'cancelled' + Prize-Refund-Zweig (Slice 335)
- 3a7d0ceb docs(session-end): Slice 334 Polls P2 abgeschlossen — Handoff-Anker auf P3/events-cancel
- be13be1a docs(proof): Slice 334 — Live-Bestätigung nach Deploy (Anker-Filter + Suche + i18n live verifiziert)
- 1dc4dddb docs(log): Slice 334 — Polls P2 geloggt (player_id-Anker + Discovery)
- 10d0e5c0 feat(polls): Polls P2 — player_id-Anker für community_polls + Discovery (Filter/Suche Verein+Spieler) (Slice 334)
- ae0dec87 docs(session-end): Slice 333 abgeschlossen — Handoff/TODO/MASTERPLAN auf Polls P2 vorbereitet
- c4d24743 docs(proof): Slice 333 — AC-09 Live-Bestätigung nach Deploy (i18n-Fix live verifiziert)
- 871ec47e fix(i18n): Slice 333 — admin.clubPollSection-Keys in korrekten Namespace (Live-QA-Find)
- 5c674e3d feat(polls): Polls P1 — Erstellung + Quellen-Identität + Treasury-REIN-Routing + Follower-Tor (Slice 333)

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (Start: POLLS P3 ODER events.status-Fix)

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen. HEAD = Slice 334 oder neuer. `worklog/active.md` = idle. **Polls P1 (333) + P2 (334) sind DONE + live bewiesen.**

## ✅ Diese Session (2026-06-18) — Slice 334 Polls P2 (DONE + live)
- **Slice 334** (L, KEIN Money-Path): `community_polls.player_id` (uuid NULL, FK players ON DELETE SET NULL) + `create_community_poll` 9-arg (+p_player_id, alte 8-arg gedroppt, AR-44, `invalid_player`-Guard). Service reicht player_id durch + getCommunityPolls löst player_name/position auf. **UI:** CreatePollModal optionaler Spieler-Picker (`usePlayerNames` intern) · CommunityFeedTab Suche matcht Spieler+Verein über alle Typen + **Anker-Chip-Leiste** (`availableAnchors` aus pre-anchor Set → §254-Catch-22 vermieden) · CommunityPollCard Spieler-Tag. i18n de+tr.
- **Verify:** Reviewer PASS (3 NITPICK) · DB live (Spalte/FK confdeltype='n'/genau 1×9-arg-Signatur/anon=false) · invalid_player Live-Call + happy-insert Rollback-Smoke (has_player=true) · vitest 138+8 · **Live-Playwright** (Chips SAK+2 Spieler · Filter 9→1 · §254 kein Catch-22 · Clear→9 · Suche „Sakarya" 9→2 · 0 MISSING_MESSAGE auf /community).
- **Gating-Hinweis:** CreatePollModal-Picker (AC-08) live nicht öffenbar — QA-Konto „Jarvis" 0 Follower → User-Poll-Knopf durch Follower-Tor 50 (P1) gesperrt; Picker code-/test-bewiesen + Reuse des live-CreateResearchModal-Pickers.

## ⚡ NÄCHSTE KANDIDATEN (Anil wählt)
1. **Polls P3 — soziale Schicht** (`polls.md` §6/§8): Follower=Reichweite (Umfrage an Follower ausspielen/benachrichtigen) · **Abo-Perks bei Paid-Polls** (2×-Gewicht / Early Access — heute nur bei Gratis-Votes) · Fan-Rang (evtl. Gewicht/Auszahl-Anteil). Money-nah → `/impact` zuerst.
2. **events.status CHECK 'cancelled'-Fix** (P1-Backlog): UI-„Absagen" broken (CHECK kennt kein 'cancelled') — Cancel + CHECK + Event-Prize-Refund-Zweig bündeln. Money/Treasury.
3. **Polls P4** — Teilnehmer-Auszahlung (offene Entscheidung `polls.md` §7 a/b/c).

## 🔧 KLEINE BACKLOG-FUNDE (aus 334)
- **`getPlayerNames` ohne `.limit()`/`.range()`** (`src/lib/services/players.ts:42`) — PostgREST-1000-Cap-Kandidat; Poll-Picker ist jetzt 2. Konsument. Bei >1000 Spielern unvollständige Picker-Liste. Eigener Mini-Slice (`.range()`-Loop, common-errors.md §1). Review-NIT#3.

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
