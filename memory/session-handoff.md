<!-- auto:handoff-start -->
# Session Handoff — Auto (2026-06-18 02:40)

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.

## Uncommitted Changes: 4 Files
```
 M memory/session-handoff.md
?? worklog/audits/knowledge-2026-06-17.md
?? worklog/audits/knowledge-2026-06-18.md
?? worklog/specs/334-polls-p2-player-anchor-discovery.md
```

## Session Commits: 6
- ae0dec87 docs(session-end): Slice 333 abgeschlossen — Handoff/TODO/MASTERPLAN auf Polls P2 vorbereitet
- c4d24743 docs(proof): Slice 333 — AC-09 Live-Bestätigung nach Deploy (i18n-Fix live verifiziert)
- 871ec47e fix(i18n): Slice 333 — admin.clubPollSection-Keys in korrekten Namespace (Live-QA-Find)
- 5c674e3d feat(polls): Polls P1 — Erstellung + Quellen-Identität + Treasury-REIN-Routing + Follower-Tor (Slice 333)
- ab8b406e docs(session-end): Handoff Polls-P1-Fresh-Start + DISTILL Legacy-Retire-Triage
- 0766987e chore(hygiene): E0-W3b — cortex-Trio retiren, Jarvis-Legacy abgewickelt

<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (Start: POLLS P2 — Spieler-Bezug + Discovery)

**Status: idle.** Vor Start: `git status --short --branch && git log --oneline -8`. Audit-Churn (`worklog/audits/*`) NIE committen (`knowledge-*.md`/`wiring-*.md` untracked = ok). HEAD = Slice 333 (`5c674e3d`/`871ec47e`) oder neuer. `worklog/active.md` = idle. **Polls P1 (Slice 333) ist DONE + live bewiesen** — die Erstellungs-„Tür" steht; REIN-Geld-Routing (Vereins-Poll → Treasury `poll_revenue` / User-Poll → Wallet) keyt auf `community_polls.source`, force-rollback-Money-Smoke + Live-Playwright PASS.

## ⚡ NÄCHSTES STÜCK = POLLS P2 („auffindbar machen") — Spieler-Bezug + Discovery, KEIN Money-Path (leichter als P1)

**Was & Warum:** Umfragen haben heute nur einen **Vereins-Bezug** (`club_id`), keinen **Spieler-Bezug** + keine **Discovery** (nur Typ-Filter + Textsuche). Ohne Filter/Suche nach Spieler/Verein ertrinken Polls + bezahlte Reports im Feed. Ziel (Canon §5): Fan tippt Lieblings-Spieler an → sieht ALLE Umfragen + Reports zu genau dem Spieler/Verein. Erst Discovery macht die P1-Geldmaschine auffindbar.

**PFLICHT-LESE-REIHENFOLGE vor Spec:**
1. **`docs/knowledge/domain/polls.md`** §5 (Discovery), §8 P2, §10 (Gesamtbild: alle Geldkanäle teilen die zwei Anker Spieler+Verein). **NICHT neu erarbeiten.**
2. **`src/components/community/CommunityFeedTab.tsx`** — bestehende `ContentFilter` ('all/posts/rumors/research/bounties/votes/news') + case-insensitive Textsuche. P2 erweitert die Filter-Achse um **Spieler + Verein**.
3. **`.claude/rules/community.md`** (autoload bei Edit) — Feed-Union-Type + Search-Pattern. `research_posts`/`bounties` tragen `player_id` bereits → Vorlage für `community_polls.player_id`.

**Polls-P2-Scope (aus polls.md §8):**
- [ ] `player_id` zu `community_polls` (zusätzlich zu `club_id`) — Migration + `DbCommunityPoll`-Type + optionaler Spieler-Tag im `CreatePollModal` (Slice 333). Research/Bounties = Vorlage.
- [ ] Filter/Suche **nach Verein + Spieler** über Polls UND Paywalls (Research) — Feed-Filter-Achse + Discovery erweitern.

**Muster:** Kein Money-Path → kein D87-Zwang, aber Schema-Change → **/impact ZUERST** (Consumer von `community_polls` + Feed-Union). UI/Service → Mobile 393px + DE/TR. Reviewer-Pflicht. **TR-Genauigkeit ist KEIN Commit-Blocker mehr** (Anil 2026-06-18: User korrigieren später; nur Compliance/`business.md` bleibt hart) — siehe Memory `feedback_tr_i18n_validation`.

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
